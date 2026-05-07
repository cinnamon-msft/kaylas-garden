import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type {
  CommandResultFormat,
  ExecuteCommandContext,
  ExecuteCommandResult,
  WithCommandOptions,
} from '../../.modules/aspire.js';
import { devProfiles, localDevProfileKey, remoteDevProfileKey } from '../../src/lib/dev-auth-profiles.js';

const execFileAsync = promisify(execFile);
const markdownFormat = 'Markdown' as CommandResultFormat;
const tunnelLookupAttempts = 20;
const tunnelLookupDelayMs = 1_000;

interface DevTunnelCommand {
  name: string;
  displayName: string;
  handler: (context: ExecuteCommandContext) => Promise<ExecuteCommandResult>;
  options: WithCommandOptions;
}

interface DevTunnelListResult {
  tunnels?: DevTunnelSummary[];
}

interface DevTunnelSummary {
  tunnelId?: string;
  portCount?: number;
}

function parseJsonOutput<T>(stdout: string, failureMessage: string): T {
  const jsonStart = stdout.indexOf('{');

  if (jsonStart === -1) {
    throw new Error(failureMessage);
  }

  return JSON.parse(stdout.slice(jsonStart)) as T;
}

async function getTunnelId(label: string): Promise<string | undefined> {
  const { stdout } = await execFileAsync('devtunnel', ['list', '--labels', label, '--json'], {
    maxBuffer: 1024 * 1024,
    windowsHide: true,
  });
  const listResult = parseJsonOutput<DevTunnelListResult>(stdout, 'Unable to parse devtunnel list output.');
  const tunnels = listResult.tunnels ?? [];

  return tunnels.find((tunnel) => (tunnel.portCount ?? 0) > 0)?.tunnelId ?? tunnels[0]?.tunnelId;
}

async function waitForTunnelId(label: string): Promise<string | undefined> {
  for (let attempt = 0; attempt < tunnelLookupAttempts; attempt += 1) {
    const tunnelId = await getTunnelId(label);

    if (tunnelId) {
      return tunnelId;
    }

    await new Promise((resolve) => setTimeout(resolve, tunnelLookupDelayMs));
  }

  return undefined;
}

function extractTunnelPortUrl(output: string, port: number): string | undefined {
  const subdomainUrl = output.match(new RegExp(`https://[^\\s"']+-${port}\\.[^\\s"']*?devtunnels\\.ms/?`, 'i'))?.[0];
  const directPortUrl = output.match(new RegExp(`https://[^\\s"']*?devtunnels\\.ms:${port}/?`, 'i'))?.[0];
  const portUrl = subdomainUrl ?? directPortUrl;

  return portUrl ? new URL(portUrl).origin : undefined;
}

async function getTunnelPortUrl(tunnelId: string, port: number): Promise<string | undefined> {
  const { stdout, stderr } = await execFileAsync(
    'devtunnel',
    ['port', 'show', tunnelId, '--port-number', port.toString(), '--json', '--verbose'],
    {
      maxBuffer: 4 * 1024 * 1024,
      windowsHide: true,
    }
  );

  return extractTunnelPortUrl(`${stdout}\n${stderr}`, port);
}

function buildDevLoginPath(devAuthToken: string, profile: string): string {
  const loginUrl = new URL('/api/dev-auth/login', 'http://localhost');
  loginUrl.searchParams.set('token', devAuthToken);
  loginUrl.searchParams.set('profile', profile);

  return `${loginUrl.pathname}${loginUrl.search}`;
}

export function createDevTunnelUrlsCommand(
  label: string,
  port: number,
  localWebBaseUrl: string,
  devAuthToken: string
): DevTunnelCommand {
  return {
    name: 'show-urls',
    displayName: 'Show tunnel URLs',
    handler: async () => {
      try {
        const tunnelId = await waitForTunnelId(label);

        if (!tunnelId) {
          return {
            success: false,
            message: 'No dev tunnel was found.',
            errorMessage: 'Start the devtunnel-web resource first, then run this command again.',
          };
        }

        const tunnelBaseUrl = await getTunnelPortUrl(tunnelId, port);

        if (!tunnelBaseUrl) {
          return {
            success: false,
            message: 'No dev tunnel URL was found.',
            errorMessage: `The dev tunnel ${tunnelId} does not expose a public URL for port ${port}. Restart devtunnel-web and try again.`,
          };
        }

        const localProfile = devProfiles[localDevProfileKey];
        const remoteProfile = devProfiles[remoteDevProfileKey];
        const localLoginUrl = new URL(buildDevLoginPath(devAuthToken, localDevProfileKey), localWebBaseUrl).toString();
        const tunnelLoginUrl = new URL(buildDevLoginPath(devAuthToken, remoteDevProfileKey), tunnelBaseUrl).toString();

        return {
          success: true,
          message: 'Dev tunnel URLs created.',
          data: {
            value: [
              '### Dev tunnel URLs',
              '',
              `- App URL: ${tunnelBaseUrl}`,
              `- Remote dev login URL (${remoteProfile.username}): ${tunnelLoginUrl}`,
              `- Local dev login URL (${localProfile.username}): ${localLoginUrl}`,
              '',
              `[Open the app](${tunnelBaseUrl})`,
              '',
              `[Sign in as ${remoteProfile.name} through the tunnel](${tunnelLoginUrl})`,
            ].join('\n'),
            format: markdownFormat,
            displayImmediately: true,
          },
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to read dev tunnel URLs.';

        return {
          success: false,
          message: 'Failed to read dev tunnel URLs.',
          errorMessage: message,
        };
      }
    },
    options: {
      commandOptions: {
        description: 'Shows the public dev tunnel URL and a ready-to-copy dev login URL.',
        iconName: 'Link',
      },
    },
  };
}
