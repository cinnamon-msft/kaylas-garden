import pg from 'pg';
import type {
  CommandResultFormat,
  ExecuteCommandContext,
  ExecuteCommandResult,
  WithCommandOptions,
} from '../../.modules/aspire.js';

const { Client } = pg;
const markdownFormat = 'Markdown' as CommandResultFormat;
const preservedTables = [
  '__drizzle_migrations',
  'accounts',
  'sessions',
  'user_settings',
  'users',
  'verification_tokens',
];

type ConnectionStringProvider = (context: ExecuteCommandContext) => Promise<string>;

interface DatabaseCommand {
  name: string;
  displayName: string;
  handler: (context: ExecuteCommandContext) => Promise<ExecuteCommandResult>;
  options: WithCommandOptions;
}

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replaceAll('"', '""')}"`;
}

export function createClearDatabaseCommand(
  gardenDbName: string,
  getConnectionString: ConnectionStringProvider
): DatabaseCommand {
  return {
    name: 'clear-database',
    displayName: 'Clear garden data',
    handler: async (context) => {
      let client: pg.Client | undefined;

      try {
        const connectionString = await getConnectionString(context);
        client = new Client({ connectionString });

        await client.connect();

        const tables = await client.query<{ tablename: string }>(`
          SELECT tablename
          FROM pg_tables
          WHERE schemaname = 'public'
            AND NOT (tablename = ANY($1::text[]))
          ORDER BY tablename
        `, [preservedTables]);

        if (tables.rows.length === 0) {
          return {
            success: true,
            message: 'No garden data tables found to clear.',
            data: {
              value: '### Garden data already clear\n\nNo garden data tables were found to clear.',
              format: markdownFormat,
              displayImmediately: true,
            },
          };
        }

        const tableNames = tables.rows.map((row) => row.tablename);
        const tableList = tableNames.map(quoteIdentifier).join(', ');
        await client.query(`TRUNCATE TABLE ${tableList} RESTART IDENTITY CASCADE`);

        return {
          success: true,
          message: `Cleared ${tableNames.length} garden data table(s).`,
          data: {
            value: [
              '### Garden data cleared',
              '',
              `Cleared **${tableNames.length}** garden data table(s) from \`${gardenDbName}\`:`,
              '',
              ...tableNames.map((tableName) => `- \`${tableName}\``),
            ].join('\n'),
            format: markdownFormat,
            displayImmediately: true,
          },
        };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          success: false,
          errorMessage: `Failed to clear database: ${message}`,
          data: {
            value: `### Failed to clear database\n\n\`${message}\``,
            format: markdownFormat,
            displayImmediately: true,
          },
        };
      } finally {
        if (client) {
          await client.end();
        }
      }
    },
    options: {
      commandOptions: {
        description: 'Deletes garden and social rows while preserving users, auth sessions, settings, and schema.',
        confirmationMessage: 'This deletes garden and social data from gardendb while preserving users. Continue?',
        iconName: 'Delete',
      },
    },
  };
}
