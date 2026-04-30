import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

function getConnectionConfig() {
  // Aspire injects individual env vars for PostgreSQL connections
  const uri = process.env["GARDENDB_URI"];
  if (uri) {
    return { connectionString: uri };
  }

  // Fallback to individual connection properties (Aspire style)
  const host = process.env["GARDENDB_HOST"];
  const port = process.env["GARDENDB_PORT"];
  const database = process.env["GARDENDB_DATABASENAME"];
  const user = process.env["GARDENDB_USERNAME"];
  const password = process.env["GARDENDB_PASSWORD"];

  if (host && database) {
    return {
      host,
      port: port ? parseInt(port, 10) : 5432,
      database,
      user,
      password,
    };
  }

  throw new Error(
    "No PostgreSQL connection configured. Set GARDENDB_URI or run the app via Aspire."
  );
}

let _pool: pg.Pool | null = null;

function getPool(): pg.Pool {
  if (!_pool) {
    _pool = new Pool(getConnectionConfig());
  }
  return _pool;
}

// Use a lazy proxy so the pool is only created when a query is actually executed,
// not at module import time (which happens during Next.js build).
function createLazyDb() {
  let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;
  return new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
    get(_target, prop) {
      if (!_db) {
        _db = drizzle(getPool(), { schema });
      }
      return (_db as unknown as Record<string | symbol, unknown>)[prop];
    },
  });
}

export const db = createLazyDb();

export { schema };
