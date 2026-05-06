import type {
  CommandResultFormat,
  ExecuteCommandContext,
  ExecuteCommandResult,
  WithCommandOptions,
} from '../../.modules/aspire.js';

const markdownFormat = 'Markdown' as CommandResultFormat;

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

      return {
        success: true,
        message: 'Development login URL created.',
        data: {
          value: [
            '### Development login',
            '',
            'Open this local-only URL to sign in as the development user:',
            '',
            `[Sign in as Dev Seeder](${loginUrl.toString()})`,
            '',
            `Direct URL: \`${loginUrl.toString()}\``,
          ].join('\n'),
          format: markdownFormat,
          displayImmediately: true,
        },
      };
    },
    options: {
      commandOptions: {
        description: 'Creates a local development login URL for the web app.',
        iconName: 'SignIn',
        isHighlighted: true,
      },
    },
  };
}
