import "server-only";

import type { PoolClient, QueryResult, QueryResultRow } from "pg";
import { Pool } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var __timesTentDbPool: Pool | undefined;
}

function getConnectionString(): string {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set");
  }
  return connectionString;
}

export function getPool(): Pool {
  if (!globalThis.__timesTentDbPool) {
    const connectionString = getConnectionString();
    const pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      keepAlive: true,
      connectionTimeoutMillis: 5_000,
      idleTimeoutMillis: 30_000,
      max: 6,
    });
    pool.on("error", (error) => {
      if (isResettableDatabaseError(error) && globalThis.__timesTentDbPool === pool) {
        globalThis.__timesTentDbPool = undefined;
      }
    });
    globalThis.__timesTentDbPool = pool;
  }

  return globalThis.__timesTentDbPool;
}

async function prepareClient(client: PoolClient): Promise<PoolClient> {
  // Ensure queries resolve tables in the public schema
  try {
    await client.query("SET search_path TO public");
  } catch {
    // ignore failures setting search_path; queries may still work
  }
  return client;
}

async function acquireClient(pool: Pool) {
  try {
    const client = await pool.connect();
    return prepareClient(client);
  } catch (error) {
    if (isResettableDatabaseError(error)) {
      await resetPool();
      const retryPool = getPool();
      const client = await retryPool.connect();
      return prepareClient(client);
    }
    throw error;
  }
}

export function isResettableDatabaseError(error: unknown): error is { code?: string; message?: string } {
  if (!error || typeof error !== "object") {
    return false;
  }
  const record = error as Record<string, unknown>;
  const code = typeof record.code === "string" ? record.code : undefined;
  const message = typeof record.message === "string" ? record.message : undefined;
  const resettableCodes = new Set(["08003", "08006", "57P01", "ECONNRESET", "ECONNREFUSED", "ETIMEDOUT"]);
  return (
    (typeof code === "string" && resettableCodes.has(code)) ||
    (typeof message === "string" &&
      (message.includes("ECONNRESET") ||
        message.includes("Connection terminated unexpectedly") ||
        message.includes("Connection terminated") ||
        message.includes("not queryable") ||
        message.includes("timeout expired")))
  );
}

async function resetPool() {
  const existing = globalThis.__timesTentDbPool;
  if (existing) {
    try {
      await existing.end();
    } catch {
      // ignore errors when closing stale pool
    }
    globalThis.__timesTentDbPool = undefined;
  }
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<QueryResult<T>> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const pool = getPool();
    const client = await acquireClient(pool);
    let released = false;
    try {
      return await client.query<T>(text, params);
    } catch (error) {
      if (attempt === 0 && isResettableDatabaseError(error)) {
        released = true;
        client.release(error instanceof Error ? error : new Error("Database connection reset"));
        await resetPool();
        continue;
      }
      throw error;
    } finally {
      if (!released) {
        client.release();
      }
    }
  }

  throw new Error("Database query failed after retry");
}

export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const pool = getPool();
  const client = await acquireClient(pool);
  try {
    await client.query("BEGIN");
    try {
      const result = await fn(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  } finally {
    client.release();
  }
}
