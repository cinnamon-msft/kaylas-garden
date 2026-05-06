import type {
  CommandResultFormat,
  ExecuteCommandContext,
  ExecuteCommandResult,
  WithCommandOptions,
} from '../../.modules/aspire.js';

const markdownFormat = 'Markdown' as CommandResultFormat;

interface GitHubAuthCommand {
  name: string;
  displayName: string;
  handler: (context: ExecuteCommandContext) => Promise<ExecuteCommandResult>;
  options: WithCommandOptions;
}

export function createGitHubAuthCommand(
  webBaseUrl: string,
  devAuthToken: string
): GitHubAuthCommand {
  return {
    name: 'github-auth',
    displayName: 'GitHub auth',
    handler: async () => {
      const logoutUrl = new URL('/api/dev-auth/logout', webBaseUrl);
      logoutUrl.searchParams.set('token', devAuthToken);
      logoutUrl.searchParams.set('callbackUrl', '/login');

      return {
        success: true,
        message: 'GitHub auth URL created.',
        data: {
          value: [
            '### GitHub auth mode',
            '',
            'Open this URL to clear the development session cookie and return to the normal GitHub sign-in page:',
            '',
            `[Switch to GitHub auth](${logoutUrl.toString()})`,
            '',
            `Direct URL: \`${logoutUrl.toString()}\``,
            '',
            'To hide the dev-auth endpoint entirely, restart Aspire with `DEV_AUTH_ENABLED=false`.',
          ].join('\n'),
          format: markdownFormat,
          displayImmediately: true,
        },
      };
    },
    options: {
      commandOptions: {
        description: 'Clears the dev session and opens the normal GitHub sign-in flow.',
        iconName: 'Key',
      },
    },
  };
}
