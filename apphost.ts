import pg from 'pg';
import { createBuilder, ContainerLifetime } from './.modules/aspire.js';
import type { CommandResultFormat } from './.modules/aspire.js';

const { Client } = pg;
const markdownCommandResultFormat = 'Markdown' as CommandResultFormat;

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replaceAll('"', '""')}"`;
}

async function main(): Promise<void> {
  const builder = await createBuilder();

  await builder.addAzureContainerAppEnvironment('acaenv');

  // ─── Parameters ────────────────────────────────────────────────────────────
  // GitHub OAuth credentials — set via Aspire dashboard prompt or environment variables.
  // Create a GitHub OAuth App at https://github.com/settings/developers
  // Callback URL: http://localhost:3000/api/auth/callback/github
  const githubId = builder.addParameter('github-id', { secret: true });
  const githubSecret = builder.addParameter('github-secret', { secret: true });

  // NextAuth session secret (auto-generated, persisted across restarts)
  const authSecret = builder.addParameterWithGeneratedValue('auth-secret', {
    minLength: 32,
    lower: true,
    upper: true,
    numeric: true,
    special: true,
  }, { secret: true, persist: true });

  // ─── Azure Blob Storage (images) ──────────────────────────────────────────
  const plantdata = builder.addAzureStorage('storage')
    .runAsEmulator({
      configureContainer: async (azurite) => {
        await azurite.withDataVolume();
        await azurite.withLifetime(ContainerLifetime.Persistent);
      },
    })
    .addBlobContainer('plantdata', { blobContainerName: 'plantdata' });

  // ─── PostgreSQL (users, plants, social data) ──────────────────────────────
  const postgres = builder.addPostgres('postgres')
    .withDataVolume()
    .withLifetime(ContainerLifetime.Persistent)
    .withPgAdmin();

  const gardenDbName = 'gardendb';
  const gardenDb = await postgres.addDatabase(gardenDbName)
    .withCommand('clear-database', 'Clear database', async () => {
      let client: pg.Client | undefined;

      try {
        const configuration = await builder.getConfiguration();
        const connectionString = await configuration.getConnectionString(gardenDbName);
        client = new Client({ connectionString });

        await client.connect();

        const tables = await client.query<{ tablename: string }>(`
          SELECT tablename
          FROM pg_tables
          WHERE schemaname = 'public'
            AND tablename <> '__drizzle_migrations'
          ORDER BY tablename
        `);

        if (tables.rows.length === 0) {
          return {
            success: true,
            message: 'No public database tables found to clear.',
            data: {
              value: '### Database already clear\n\nNo public database tables were found to clear.',
              format: markdownCommandResultFormat,
              displayImmediately: true,
            },
          };
        }

        const tableNames = tables.rows.map((row) => row.tablename);
        const tableList = tableNames.map(quoteIdentifier).join(', ');
        await client.query(`TRUNCATE TABLE ${tableList} RESTART IDENTITY CASCADE`);

        return {
          success: true,
          message: `Cleared ${tableNames.length} database table(s).`,
          data: {
            value: [
              '### Database cleared',
              '',
              `Cleared **${tableNames.length}** public table(s) from \`${gardenDbName}\`:`,
              '',
              ...tableNames.map((tableName) => `- \`${tableName}\``),
            ].join('\n'),
            format: markdownCommandResultFormat,
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
            format: markdownCommandResultFormat,
            displayImmediately: true,
          },
        };
      } finally {
        if (client) {
          await client.end();
        }
      }
    }, {
      commandOptions: {
        description: 'Deletes all rows from the public PostgreSQL tables while preserving the schema.',
        confirmationMessage: 'This deletes all rows from every public table in gardendb. Continue?',
        iconName: 'Delete',
      },
    });

  // ─── Database migration (runs once before the web app starts) ─────────────
  const dbMigration = builder.addJavaScriptApp('db-migration', '.', { runScriptName: 'db:init' })
    .withReference(gardenDb)
    .waitFor(gardenDb);

  // ─── Web Application ──────────────────────────────────────────────────────
  await builder
    .addNextJsApp('web', '.')
    .withReference(plantdata)
    .withReference(gardenDb)
    .withEnvironment('GITHUB_ID', githubId)
    .withEnvironment('GITHUB_SECRET', githubSecret)
    .withEnvironment('AUTH_SECRET', authSecret)
    .withEnvironment('NEXTAUTH_URL', 'http://localhost:3000')
    .waitFor(gardenDb)
    .waitForCompletion(dbMigration)
    .withHttpEndpoint({ port: 3000, env: 'PORT' })
    .withBrowserLogs()
    .withExternalHttpEndpoints();

  await builder.build().run();
}

void main().catch((error: unknown) => {
  console.error('Failed to start the Aspire AppHost.', error);
  process.exit(1);
});
