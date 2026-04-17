import { BlobServiceClient, ContainerClient } from "@azure/storage-blob";
import { DefaultAzureCredential } from "@azure/identity";

const CONTAINER_NAME = "plantdata";

let _containerClient: ContainerClient | null = null;
let _containerEnsured = false;

/** Parse an Aspire-style semicolon-delimited connection string into key-value pairs. */
function parseConnectionProps(conn: string): Record<string, string> {
  return Object.fromEntries(
    conn
      .split(";")
      .filter(Boolean)
      .map((part) => {
        const idx = part.indexOf("=");
        return [part.slice(0, idx), part.slice(idx + 1)];
      })
  );
}

function isEmulatorConnectionString(conn: string): boolean {
  return (
    conn.startsWith("DefaultEndpointsProtocol") ||
    conn.includes("AccountName=devstoreaccount1")
  );
}

function getContainerClient(): ContainerClient {
  if (_containerClient) return _containerClient;

  const conn =
    process.env["ConnectionStrings__plantdata"] ??
    process.env["ConnectionStrings__blobs"];
  if (!conn) {
    throw new Error(
      "ConnectionStrings__plantdata is not set. Run the app via Aspire to configure Azure Blob Storage."
    );
  }

  let blobService: BlobServiceClient;
  let containerName = CONTAINER_NAME;

  if (isEmulatorConnectionString(conn)) {
    blobService = BlobServiceClient.fromConnectionString(conn);
  } else if (conn.includes("Endpoint=")) {
    const props = parseConnectionProps(conn);
    if (!props["Endpoint"]) {
      throw new Error("Endpoint not found in connection string");
    }
    blobService = new BlobServiceClient(
      props["Endpoint"],
      new DefaultAzureCredential()
    );
    containerName = props["ContainerName"] || CONTAINER_NAME;
  } else {
    blobService = new BlobServiceClient(conn, new DefaultAzureCredential());
  }

  _containerClient = blobService.getContainerClient(containerName);
  return _containerClient;
}

async function ensureContainer(): Promise<ContainerClient> {
  const client = getContainerClient();
  if (!_containerEnsured) {
    await client.createIfNotExists();
    _containerEnsured = true;
  }
  return client;
}

async function streamToBuffer(
  stream: NodeJS.ReadableStream
): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

function isNotFoundError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "statusCode" in err &&
    (err as { statusCode: number }).statusCode === 404
  );
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Download a JSON blob, returning the parsed value or a fallback if the blob doesn't exist.
 * Throws on network/auth/parse errors (does NOT silently swallow them).
 */
export async function downloadJson<T>(
  blobPath: string,
  fallback: T
): Promise<{ data: T; etag: string | undefined }> {
  const container = await ensureContainer();
  try {
    const response = await container.getBlockBlobClient(blobPath).download(0);
    const body = (await streamToBuffer(response.readableStreamBody!)).toString(
      "utf-8"
    );
    return { data: JSON.parse(body) as T, etag: response.etag };
  } catch (err: unknown) {
    if (isNotFoundError(err)) return { data: fallback, etag: undefined };
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
  const content = JSON.stringify(data, null, 2);
  const response = await container
    .getBlockBlobClient(blobPath)
    .upload(content, content.length, {
      blobHTTPHeaders: { blobContentType: "application/json" },
      conditions: etag ? { ifMatch: etag } : undefined,
    });
  return response.etag;
}

/** Upload a binary blob (e.g., an image). */
export async function uploadBlob(
  blobPath: string,
  data: Buffer,
  contentType: string
): Promise<void> {
  const container = await ensureContainer();
  await container.getBlockBlobClient(blobPath).upload(data, data.length, {
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
  try {
    const response = await container.getBlockBlobClient(blobPath).download(0);
    return {
      data: await streamToBuffer(response.readableStreamBody!),
      contentType: response.contentType ?? "application/octet-stream",
    };
  } catch (err: unknown) {
    if (isNotFoundError(err)) return null;
    throw err;
  }
}
