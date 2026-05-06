import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type {
  CommandResultFormat,
  ExecuteCommandContext,
  ExecuteCommandResult,
  WithCommandOptions,
} from '../../.modules/aspire.js';

const execFileAsync = promisify(execFile);
const markdownFormat = 'Markdown' as CommandResultFormat;
const tunnelLookupAttempts = 20;
const tunnelLookupDelayMs = 1_000;
const localDevProfile = 'local';
const remoteDevProfile = 'remote';

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
  hostConnections?: number;
}

interface DevTunnelShowResult {
  tunnel?: {
    ports?: Array<{
      portNumber?: number;
      portUri?: string;
    }>;
  };
}

function parseJsonOutput<T>(stdout: string, failureMessage: string): T {
  const jsonStart = stdout.indexOf('{');

  if (jsonStart === -1) {
    throw new Error(failureMessage);
  }

  return JSON.parse(stdout.slice(jsonStart)) as T;
}

async function getActiveTunnelId(label: string): Promise<string | undefined> {
  const { stdout } = await execFileAsync('devtunnel', ['list', '--labels', label, '--json'], {
    maxBuffer: 1024 * 1024,
    windowsHide: true,
  });
  const listResult = parseJsonOutput<DevTunnelListResult>(stdout, 'Unable to parse devtunnel list output.');
  const tunnels = listResult.tunnels ?? [];

  return tunnels.find((tunnel) => (tunnel.hostConnections ?? 0) > 0)?.tunnelId;
}

async function waitForActiveTunnelId(label: string): Promise<string | undefined> {
  for (let attempt = 0; attempt < tunnelLookupAttempts; attempt += 1) {
    const tunnelId = await getActiveTunnelId(label);

    if (tunnelId) {
      return tunnelId;
    }

    await new Promise((resolve) => setTimeout(resolve, tunnelLookupDelayMs));
  }

  return undefined;
}

async function getTunnelPortUrl(tunnelId: string, port: number): Promise<string | undefined> {
  const { stdout } = await execFileAsync('devtunnel', ['show', tunnelId, '--json'], {
    maxBuffer: 1024 * 1024,
    windowsHide: true,
  });
  const showResult = parseJsonOutput<DevTunnelShowResult>(stdout, 'Unable to parse devtunnel show output.');
  const portUri = showResult.tunnel?.ports?.find((tunnelPort) => tunnelPort.portNumber === port)?.portUri;

  return portUri ? new URL(portUri).origin : undefined;
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
        const tunnelId = await waitForActiveTunnelId(label);

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
            errorMessage: `The dev tunnel ${tunnelId} does not expose port ${port}. Restart devtunnel-web and try again.`,
          };
        }

        const localLoginUrl = new URL(buildDevLoginPath(devAuthToken, localDevProfile), localWebBaseUrl).toString();
        const tunnelLoginUrl = new URL(buildDevLoginPath(devAuthToken, remoteDevProfile), tunnelBaseUrl).toString();

        return {
          success: true,
          message: 'Dev tunnel URLs created.',
          data: {
            value: [
              '### Dev tunnel URLs',
              '',
              `- App URL: ${tunnelBaseUrl}`,
              `- Remote dev login URL (remote-feeder): ${tunnelLoginUrl}`,
              `- Local dev login URL (dev-feeder): ${localLoginUrl}`,
              '',
              `[Open the app](${tunnelBaseUrl})`,
              '',
              `[Sign in as Remote Feeder through the tunnel](${tunnelLoginUrl})`,
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
