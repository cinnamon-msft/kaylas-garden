import { createBuilder, ContainerLifetime } from './.modules/aspire.js';

async function main(): Promise<void> {
  const builder = await createBuilder();

  await builder.addAzureContainerAppEnvironment('acaenv');

  // ─── Parameters ────────────────────────────────────────────────────────────
  // GitHub OAuth credentials (prompted in the Aspire dashboard if not configured)
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

  const gardenDb = postgres.addDatabase('gardendb');

  // ─── Database migration (runs once before the web app starts) ─────────────
  const dbMigration = builder.addNodeApp('db-migration', '.', 'scripts/init-db.ts')
    .withReference(gardenDb)
    .waitFor(gardenDb);

  // ─── Web Application ──────────────────────────────────────────────────────
  await builder
    .addNextJsApp('web', '.')
    .withReference(plantdata)
    .withReference(gardenDb)
    .withEnvironmentParameter('GITHUB_ID', githubId)
    .withEnvironmentParameter('GITHUB_SECRET', githubSecret)
    .withEnvironmentParameter('AUTH_SECRET', authSecret)
    .withEnvironment('NEXTAUTH_URL', 'http://localhost:3000')
    .waitFor(gardenDb)
    .waitForCompletion(dbMigration)
    .withHttpEndpoint({ port: 3000, env: 'PORT' })
    .withExternalHttpEndpoints();

  await builder.build().run();
}

void main().catch((error: unknown) => {
  console.error('Failed to start the Aspire AppHost.', error);
  process.exit(1);
});
