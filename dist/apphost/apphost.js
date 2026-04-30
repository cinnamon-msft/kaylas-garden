"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const aspire_js_1 = require("./.modules/aspire.js");
async function main() {
    const builder = await (0, aspire_js_1.createBuilder)();
    await builder.addAzureContainerAppEnvironment('acaenv');
    const plantdata = builder.addAzureStorage('storage')
        .runAsEmulator({
        configureContainer: async (azurite) => {
            await azurite.withDataVolume();
            await azurite.withLifetime(aspire_js_1.ContainerLifetime.Persistent);
        },
    })
        .addBlobContainer('plantdata', { blobContainerName: 'plantdata' });
    // PostgreSQL for user data, social features, and plant records
    const gardenDb = builder.addPostgres("postgres")
        .withDataVolume()
        .addDatabase("gardendb");
    await builder
        .addNextJsApp('web', '.')
        .withReference(plantdata)
        .withReference(gardenDb)
        .withHttpEndpoint({ port: 3000, env: 'PORT' })
        .withExternalHttpEndpoints();
    await builder.build().run();
}
void main().catch((error) => {
    console.error('Failed to start the Aspire AppHost.', error);
    process.exit(1);
});
