"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_crypto_1 = require("node:crypto");
const aspire_js_1 = require("./.modules/aspire.js");
const clear_database_js_1 = require("./scripts/commands/clear-database.js");
const dev_login_js_1 = require("./scripts/commands/dev-login.js");
const github_auth_js_1 = require("./scripts/commands/github-auth.js");
const seed_database_js_1 = require("./scripts/commands/seed-database.js");
const webBaseUrl = 'http://localhost:3000';
const webPort = 3000;
const devAuthEnabled = process.env.DEV_AUTH_ENABLED ?? 'true';
async function main() {
    const builder = await (0, aspire_js_1.createBuilder)();
    // On ARM64 hosts, Aspire defaults containers to linux/amd64 which fails on
    // alpine/azurite images. Pass a platform override so Docker pulls/runs the
    // matching arch image.
    const containerPlatformArgs = process.arch === 'arm64'
        ? ['--platform', 'linux/arm64']
        : [];
    await builder.addAzureContainerAppEnvironment('acaenv');
    // ─── Parameters ────────────────────────────────────────────────────────────
    // GitHub OAuth credentials.
    // In dev (DEV_AUTH_ENABLED=true), a placeholder is fine because the dev-auth
    // flow bypasses GitHub. In prod, set real values via `aspire secret set`.
    const githubIdDefault = process.env.GITHUB_ID ?? 'dev-github-id';
    const githubSecretDefault = process.env.GITHUB_SECRET ?? 'dev-github-secret';
    const githubId = builder.addParameter('github-id', {
        value: githubIdDefault,
        secret: true,
    });
    const githubSecret = builder.addParameter('github-secret', {
        value: githubSecretDefault,
        secret: true,
    });
    // NextAuth session secret (auto-generated, persisted across restarts)
    const authSecret = builder.addParameterWithGeneratedValue('auth-secret', {
        minLength: 32,
        lower: true,
        upper: true,
        numeric: true,
        special: true,
    }, { secret: true, persist: true });
    const devAuthToken = (0, node_crypto_1.randomUUID)();
    const gardenDbUri = 'postgresql://postgres:postgres@localhost:15432/gardendb';
    // ─── Azure Blob Storage (images) ──────────────────────────────────────────
    // Production: Uses Azure Blob Storage with CDN for image serving
    // Development: Uses Azurite emulator
    const plantdata = builder.addAzureStorage('plantdata-storage')
        .runAsEmulator({
        configureContainer: async (azurite) => {
            await azurite.withDataVolume();
            await azurite.withLifetime(aspire_js_1.ContainerLifetime.Persistent);
            if (containerPlatformArgs.length > 0) {
                await azurite.withContainerRuntimeArgs(containerPlatformArgs);
            }
        },
    })
        .addBlobContainer('plantdata', {
        blobContainerName: 'plantdata',
        // Production note: Configure lifecycle policies in Azure Portal:
        // - Move blobs older than 90 days to Cool tier ($0.01/GB vs $0.021/GB)
        // - Delete blobs older than 1 year (customize as needed)
    });
    // ─── PostgreSQL ────────────────────────────────────────────────────────────
    const gardenDbName = 'gardendb';
    const gardenDb = builder.addContainer(gardenDbName, 'postgres:16-alpine')
        .withEnvironment('POSTGRES_DB', gardenDbName)
        .withEnvironment('POSTGRES_USER', 'postgres')
        .withEnvironment('POSTGRES_PASSWORD', 'postgres')
        .withEndpoint({ targetPort: 5432, port: 15432, name: 'postgres' });
    if (containerPlatformArgs.length > 0) {
        await gardenDb.withContainerRuntimeArgs(containerPlatformArgs);
    }
    const getGardenDbUri = async () => gardenDbUri;
    const clearDb = (0, clear_database_js_1.createClearDatabaseCommand)(gardenDbName, getGardenDbUri);
    const seedDb = (0, seed_database_js_1.createSeedDatabaseCommand)(gardenDbName, getGardenDbUri);
    const devLogin = (0, dev_login_js_1.createDevLoginCommand)(webBaseUrl, devAuthToken);
    const githubAuth = (0, github_auth_js_1.createGitHubAuthCommand)(webBaseUrl, devAuthToken);
    await gardenDb
        .withCommand(clearDb.name, clearDb.displayName, clearDb.handler, clearDb.options)
        .withCommand(seedDb.name, seedDb.displayName, seedDb.handler, seedDb.options);
    // ─── Database migration (runs once before the web app starts) ─────────────
    const dbMigration = builder.addJavaScriptApp('db-migration', '.', { runScriptName: 'db:init' })
        .withEnvironment('GARDENDB_URI', gardenDbUri)
        .waitFor(gardenDb)
        .publishAsNpmScript();
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
        .withEnvironment('GARDENDB_URI', gardenDbUri)
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
        .withExternalHttpEndpoints();
    await builder.build().run();
}
void main().catch((error) => {
    console.error('Failed to start the Aspire AppHost.', error);
    process.exit(1);
});
