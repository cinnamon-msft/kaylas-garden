import type {
  CommandResultFormat,
  ExecuteCommandContext,
  ExecuteCommandResult,
  WithCommandOptions,
} from '../../.modules/aspire.js';

const markdownFormat = 'Markdown' as CommandResultFormat;
const localDevProfile = 'local';

interface DevLoginCommand {
  name: string;
  displayName: string;
  handler: (context: ExecuteCommandContext) => Promise<ExecuteCommandResult>;
  options: WithCommandOptions;
}

export function createDevLoginCommand(
  webBaseUrl: string,
  devAuthToken: string
): DevLoginCommand {
  return {
    name: 'dev-login',
    displayName: 'Dev login',
    handler: async () => {
      const loginUrl = new URL('/api/dev-auth/login', webBaseUrl);
      loginUrl.searchParams.set('token', devAuthToken);
      loginUrl.searchParams.set('profile', localDevProfile);

      return {
        success: true,
        message: 'Development login URL created.',
        data: {
          value: [
            '### Development login',
            '',
            'Open this local-only URL to sign in as `dev-feeder`:',
            '',
            `[Sign in as Dev Feeder](${loginUrl.toString()})`,
            '',
            `Direct URL: \`${loginUrl.toString()}\``,
            '',
            'Use `devtunnel-web` -> `Show tunnel URLs` to sign in a remote browser as `remote-feeder`.',
          ].join('\n'),
          format: markdownFormat,
          displayImmediately: true,
        },
      };
    },
    options: {
      commandOptions: {
        description: 'Creates a local development login URL for the web app.',
        iconName: 'Key',
      },
    },
  };
}
