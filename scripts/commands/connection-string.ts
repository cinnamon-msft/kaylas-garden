import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

interface AspireResourceDescription {
  resources?: AspireResource[];
}

interface AspireResource {
  name?: string;
  resourceType?: string;
  environment?: Record<string, string | undefined>;
  properties?: Record<string, string | undefined>;
}

interface PostgresConnectionParts {
  host?: string;
  port?: string;
  database?: string;
  username?: string;
  password?: string;
}

function parseAspireDescribeOutput(stdout: string): AspireResourceDescription {
  const jsonStart = stdout.indexOf('{');

  if (jsonStart === -1) {
    throw new Error('Unable to parse Aspire resource description output.');
  }

  return JSON.parse(stdout.slice(jsonStart)) as AspireResourceDescription;
}

function parseConnectionString(connectionString: string): PostgresConnectionParts {
  return connectionString
    .split(';')
    .filter(Boolean)
    .reduce<PostgresConnectionParts>((parts, entry) => {
      const separatorIndex = entry.indexOf('=');

      if (separatorIndex === -1) {
        return parts;
      }

      const key = entry.slice(0, separatorIndex).toLowerCase();
      const value = entry.slice(separatorIndex + 1);

      switch (key) {
        case 'host':
          parts.host = value;
          break;
        case 'port':
          parts.port = value;
          break;
        case 'database':
          parts.database = value;
          break;
        case 'username':
        case 'user id':
        case 'user':
          parts.username = value;
          break;
        case 'password':
          parts.password = value;
          break;
      }

      return parts;
    }, {});
}

function buildPostgresUri(parts: PostgresConnectionParts): string | undefined {
  if (!parts.host || !parts.database) {
    return undefined;
  }

  const credentials = parts.username
    ? `${encodeURIComponent(parts.username)}${parts.password ? `:${encodeURIComponent(parts.password)}` : ''}@`
    : '';
  const port = parts.port ? `:${parts.port}` : '';

  return `postgresql://${credentials}${parts.host}${port}/${encodeURIComponent(parts.database)}`;
}

function getPostgresContainerId(description: AspireResourceDescription, connectionName: string): string | undefined {
  const resources = description.resources ?? [];
  const databaseResource = resources.find((resource) => resource.name === connectionName);
  const parentName = databaseResource?.properties?.['resource.parentName'];
  const parentResource = parentName
    ? resources.find((resource) => resource.name === parentName)
    : undefined;

  return parentResource?.properties?.['container.id']
    ?? resources.find((resource) => resource.name?.startsWith('postgres-'))?.properties?.['container.id'];
}

async function getDockerPostgresUri(description: AspireResourceDescription, connectionName: string): Promise<string | undefined> {
  const containerId = getPostgresContainerId(description, connectionName);

  if (!containerId) {
    return undefined;
  }

  const [{ stdout: dockerEnvironment }, { stdout: dockerPort }] = await Promise.all([
    execFileAsync('docker', ['inspect', '--format', '{{json .Config.Env}}', containerId], {
      maxBuffer: 1024 * 1024,
      windowsHide: true,
    }),
    execFileAsync('docker', ['port', containerId, '5432/tcp'], {
      maxBuffer: 1024 * 1024,
      windowsHide: true,
    }),
  ]);
  const environmentEntries = JSON.parse(dockerEnvironment.trim()) as string[];
  const environment = Object.fromEntries(
    environmentEntries
      .map((entry) => {
        const separatorIndex = entry.indexOf('=');
        return separatorIndex === -1
          ? undefined
          : [entry.slice(0, separatorIndex), entry.slice(separatorIndex + 1)] as const;
      })
      .filter((entry): entry is readonly [string, string] => entry !== undefined)
  );
  const port = dockerPort.trim().split(':').at(-1);

  return buildPostgresUri({
    host: 'localhost',
    port,
    database: connectionName,
    username: environment.POSTGRES_USER,
    password: environment.POSTGRES_PASSWORD,
  });
}

export function createAspireDescribeConnectionStringProvider(connectionName: string): () => Promise<string> {
  return async () => {
    const { stdout } = await execFileAsync('aspire', ['describe', '--format', 'Json', '--include-hidden', '--non-interactive'], {
      maxBuffer: 10 * 1024 * 1024,
      windowsHide: true,
    });
    const description = parseAspireDescribeOutput(stdout);
    const environmentVariablePrefix = connectionName.replaceAll('-', '_').toUpperCase();
    const uriEnvironmentVariable = `${environmentVariablePrefix}_URI`;
    const connectionStringEnvironmentVariable = `ConnectionStrings__${connectionName}`;

    const inspectedResources: string[] = [];

    for (const resource of description.resources ?? []) {
      const environment = resource.environment;

      if (!environment) {
        inspectedResources.push(`${resource.name ?? '<unnamed>'}: no environment`);
        continue;
      }

      const matchingKeys = Object.keys(environment)
        .filter((key) => key.includes(environmentVariablePrefix) || key === connectionStringEnvironmentVariable)
        .sort();
      inspectedResources.push(`${resource.name ?? '<unnamed>'}: ${matchingKeys.join(', ') || 'no matching keys'}`);

      const uri = environment[uriEnvironmentVariable];

      if (uri) {
        return uri;
      }

      const connectionString = environment[connectionStringEnvironmentVariable];

      if (connectionString) {
        const parsedUri = buildPostgresUri(parseConnectionString(connectionString));

        if (parsedUri) {
          return parsedUri;
        }
      }
    }

    const dockerUri = await getDockerPostgresUri(description, connectionName);

    if (dockerUri) {
      return dockerUri;
    }

    throw new Error(
      `Unable to find the '${connectionName}' PostgreSQL connection details in Aspire resources. ` +
      `Inspected resources: ${inspectedResources.join('; ')}.`
    );
  };
}
