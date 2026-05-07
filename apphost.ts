import { randomUUID } from 'node:crypto';
import { createBuilder, ContainerLifetime } from './.modules/aspire.js';
import { createClearDatabaseCommand } from './scripts/commands/clear-database.js';
import { createAspireDescribeConnectionStringProvider } from './scripts/commands/connection-string.js';
import { createDevLoginCommand } from './scripts/commands/dev-login.js';
import { createDevTunnelUrlsCommand } from './scripts/commands/devtunnel-urls.js';
import { createGitHubAuthCommand } from './scripts/commands/github-auth.js';
import { createSeedDatabaseCommand } from './scripts/commands/seed-database.js';

const webBaseUrl = 'http://localhost:3000';
const devTunnelLabel = 'kaylas-garden';
const webPort = 3000;
const devAuthEnabled = process.env.DEV_AUTH_ENABLED ?? 'true';

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
  const devAuthToken = randomUUID();

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
  const gardenDb = await postgres.addDatabase(gardenDbName);
  const getGardenDbUri = createAspireDescribeConnectionStringProvider(gardenDbName);
  const clearDb = createClearDatabaseCommand(gardenDbName, getGardenDbUri);
  const seedDb = createSeedDatabaseCommand(gardenDbName, getGardenDbUri);
  const devLogin = createDevLoginCommand(webBaseUrl, devAuthToken);
  const githubAuth = createGitHubAuthCommand(webBaseUrl, devAuthToken);
  await gardenDb
    .withCommand(clearDb.name, clearDb.displayName, clearDb.handler, clearDb.options)
    .withCommand(seedDb.name, seedDb.displayName, seedDb.handler, seedDb.options);

  // ─── Database migration (runs once before the web app starts) ─────────────
  const dbMigration = builder.addJavaScriptApp('db-migration', '.', { runScriptName: 'db:init' })
    .withReference(gardenDb)
    .waitFor(gardenDb)
    .publishAsNpmScript();

  // ─── Web Application ──────────────────────────────────────────────────────
  const web = await builder
    .addNextJsApp('web', '.')
    .withReference(plantdata)
    .withReference(gardenDb)
    .withEnvironment('GITHUB_ID', githubId)
    .withEnvironment('GITHUB_SECRET', githubSecret)
    .withEnvironment('AUTH_SECRET', authSecret)
    .withEnvironment('NEXTAUTH_URL', webBaseUrl)
    .withEnvironment('DEV_AUTH_ENABLED', devAuthEnabled)
    .withEnvironment('DEV_AUTH_TOKEN', devAuthToken)
    .waitFor(gardenDb)
    .waitForCompletion(dbMigration)
    .withHttpEndpoint({ port: 3000, env: 'PORT' })
    .withBrowserLogs()
    .withCommand(devLogin.name, devLogin.displayName, devLogin.handler, devLogin.options)
    .withCommand(githubAuth.name, githubAuth.displayName, githubAuth.handler, githubAuth.options)
    .withExternalHttpEndpoints();

  const webEndpoint = web.getEndpoint('http');
  const devTunnelUrls = createDevTunnelUrlsCommand(devTunnelLabel, webPort, webBaseUrl, devAuthToken);
  await builder
    .addDevTunnel('devtunnel-web', {
      allowAnonymous: true,
      description: 'Kayla\'s Garden local web tunnel',
      labels: [devTunnelLabel],
    })
    .withTunnelReferenceAnonymous(webEndpoint, true)
    .waitFor(web)
    .withExplicitStart()
    .withCommand(devTunnelUrls.name, devTunnelUrls.displayName, devTunnelUrls.handler, devTunnelUrls.options);

  await builder.build().run();
}

void main().catch((error: unknown) => {
  console.error('Failed to start the Aspire AppHost.', error);
  process.exit(1);
});
