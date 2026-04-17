import {
  BlobServiceClient,
  ContainerClient,
  StorageSharedKeyCredential,
} from "@azure/storage-blob";
import { DefaultAzureCredential } from "@azure/identity";

const CONTAINER_NAME = "plantdata";

let _containerClient: ContainerClient | null = null;
let _containerEnsured = false;

function getContainerClient(): ContainerClient {
  if (_containerClient) return _containerClient;

  const connectionString = process.env["ConnectionStrings__plantdata"];
  if (!connectionString) {
    throw new Error(
      "ConnectionStrings__plantdata is not set. Run the app via Aspire to configure Azure Blob Storage."
    );
  }

  let client: ContainerClient;

  // Connection strings start with protocol or contain AccountName=
  if (
    connectionString.startsWith("DefaultEndpointsProtocol") ||
    connectionString.includes("AccountName=")
  ) {
    // Emulator / shared key connection string
    const blobService = BlobServiceClient.fromConnectionString(connectionString);
    client = blobService.getContainerClient(CONTAINER_NAME);
  } else {
    // Production: URI-based — use DefaultAzureCredential
    const blobService = new BlobServiceClient(
      connectionString,
      new DefaultAzureCredential()
    );
    client = blobService.getContainerClient(CONTAINER_NAME);
  }

  _containerClient = client;
  return client;
}

async function ensureContainer(): Promise<ContainerClient> {
  const client = getContainerClient();
  if (!_containerEnsured) {
    await client.createIfNotExists();
    _containerEnsured = true;
  }
  return client;
}

/**
 * Download a JSON blob, returning the parsed value or a fallback if the blob doesn't exist.
 * Throws on network/auth/parse errors (does NOT silently swallow them).
 */
export async function downloadJson<T>(
  blobPath: string,
  fallback: T
): Promise<{ data: T; etag: string | undefined }> {
  const container = await ensureContainer();
  const blobClient = container.getBlockBlobClient(blobPath);

  try {
    const response = await blobClient.download(0);
    const body = await streamToString(response.readableStreamBody!);
    return { data: JSON.parse(body) as T, etag: response.etag };
  } catch (err: unknown) {
    if (isNotFoundError(err)) {
      return { data: fallback, etag: undefined };
    }
    throw err;
  }
}

/**
 * Upload a JSON blob with optional ETag-based optimistic concurrency.
 * If etag is provided and the blob has been modified, throws a 412 error.
 */
export async function uploadJson<T>(
  blobPath: string,
  data: T,
  etag?: string
): Promise<string | undefined> {
  const container = await ensureContainer();
  const blobClient = container.getBlockBlobClient(blobPath);

  const content = JSON.stringify(data, null, 2);
  const response = await blobClient.upload(content, content.length, {
    blobHTTPHeaders: { blobContentType: "application/json" },
    conditions: etag ? { ifMatch: etag } : undefined,
  });

  return response.etag;
}

/**
 * Upload a binary blob (e.g., an image).
 */
export async function uploadBlob(
  blobPath: string,
  data: Buffer,
  contentType: string
): Promise<void> {
  const container = await ensureContainer();
  const blobClient = container.getBlockBlobClient(blobPath);

  await blobClient.upload(data, data.length, {
    blobHTTPHeaders: { blobContentType: contentType },
  });
}

/**
 * Download a binary blob, returning the buffer and content type.
 * Returns null if the blob doesn't exist.
 */
export async function downloadBlob(
  blobPath: string
): Promise<{ data: Buffer; contentType: string } | null> {
  const container = await ensureContainer();
  const blobClient = container.getBlockBlobClient(blobPath);

  try {
    const response = await blobClient.download(0);
    const chunks: Buffer[] = [];
    for await (const chunk of response.readableStreamBody!) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return {
      data: Buffer.concat(chunks),
      contentType:
        response.contentType ?? "application/octet-stream",
    };
  } catch (err: unknown) {
    if (isNotFoundError(err)) return null;
    throw err;
  }
}

function isNotFoundError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "statusCode" in err &&
    (err as { statusCode: number }).statusCode === 404
  );
}

async function streamToString(
  stream: NodeJS.ReadableStream
): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf-8");
}
