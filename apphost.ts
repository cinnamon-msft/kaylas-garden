import { createBuilder, ContainerLifetime } from './.modules/aspire.js';

async function main(): Promise<void> {
  const builder = await createBuilder();

  await builder.addAzureContainerAppEnvironment('acaenv');

  const githubToken = builder.addParameter('github-token', { secret: true });

  const blobs = builder.addAzureStorage('storage')
    .runAsEmulator({
      configureContainer: async (azurite) => {
        await azurite.withDataVolume();
        await azurite.withLifetime(ContainerLifetime.Persistent);
      },
    })
    .addBlobContainer('blobs', { blobContainerName: 'plantdata' });

  await builder
    .addNextJsApp('web', '.')
    .withReference(blobs)
    .withEnvironment('GITHUB_TOKEN', githubToken)
    .withHttpEndpoint({ port: 3000, env: 'PORT' })
    .withExternalHttpEndpoints();

  await builder.build().run();
}

void main().catch((error: unknown) => {
  console.error('Failed to start the Aspire AppHost.', error);
  process.exit(1);
});
