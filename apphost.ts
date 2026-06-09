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
  
  // Check if deploying to Azure (vs local development)
  const isPublishMode = (await builder.executionContext()).isPublishMode;

  // ─── Parameters ────────────────────────────────────────────────────────────
  // GitHub OAuth credentials
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
  // Production: Uses Azure Blob Storage with CDN for image serving
  // Development: Uses Azurite emulator
  const plantdata = builder.addAzureStorage('plantdata-storage')
    .runAsEmulator({
      configureContainer: async (azurite) => {
        await azurite.withDataVolume();
        await azurite.withLifetime(ContainerLifetime.Persistent);
      },
    })
    .addBlobContainer('plantdata', { 
      blobContainerName: 'plantdata',
      // Production note: Configure lifecycle policies in Azure Portal:
      // - Move blobs older than 90 days to Cool tier ($0.01/GB vs $0.021/GB)
      // - Delete blobs older than 1 year (customize as needed)
    });

  // ─── PostgreSQL ────────────────────────────────────────────────────────────
  // Development: Local PostgreSQL with Pgadmin
  // Production: Azure PostgreSQL Flexible Server (B1s Burstable, ~$25-35/month)
  // TODO: For production, swap to builder.addAzurePostgresFlexibleServer('postgres')
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
    .publishAsPackageScript({ scriptName: 'db:init' });

  // ─── Web Application ──────────────────────────────────────────────────────
  // Development: Runs locally on port 3000
  // Production: Deployed to Azure Container Apps
  const web = await builder
    .addNextJsApp('web', '.')
    .withHttpEndpoint({
      name: 'http',
      port: webPort,
      isProxied: false,
    })
    .withReference(plantdata)
    .withReference(gardenDb)
    .withEnvironment('GITHUB_ID', githubId)
    .withEnvironment('GITHUB_SECRET', githubSecret)
    .withEnvironment('AUTH_SECRET', authSecret)
    .withEnvironment('NEXTAUTH_URL', webBaseUrl)
    .withEnvironment('DEV_AUTH_ENABLED', devAuthEnabled)
    .withEnvironment('DEV_AUTH_TOKEN', devAuthToken)
    .withEnvironment('NODE_ENV', 'development')
    // Production: Configure CDN URL after setting up Azure CDN
    // .withEnvironment('CDN_URL', builder.addParameter('cdn-url', { secret: false }))
    .withCommand(devLogin.name, devLogin.displayName, devLogin.handler, devLogin.options)
    .withCommand(githubAuth.name, githubAuth.displayName, githubAuth.handler, githubAuth.options)
    .withBrowserLogs()
    .withExternalHttpEndpoints();

  // Dev-only: Add PgAdmin command and dev tunnel
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
