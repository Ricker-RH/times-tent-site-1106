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
    globalThis.__timesTentDbPool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      keepAlive: true,
      connectionTimeoutMillis: 5_000,
      idleTimeoutMillis: 0,
      allowExitOnIdle: true,
    });
  }

  return globalThis.__timesTentDbPool;
}

async function acquireClient(pool: Pool) {
  try {
    const client = await pool.connect();
    // Ensure queries resolve tables in the public schema
    try {
      await client.query("SET search_path TO public");
    } catch {
      // ignore failures setting search_path; queries may still work
    }
    return client;
  } catch (error) {
    if (isResettableError(error)) {
      await resetPool();
      const retryPool = getPool();
      return retryPool.connect();
    }
    throw error;
  }
}

function isResettableError(error: unknown): error is { code?: string; message?: string } {
  if (!error || typeof error !== "object") {
    return false;
  }
  const record = error as Record<string, unknown>;
  const code = typeof record.code === "string" ? record.code : undefined;
  const message = typeof record.message === "string" ? record.message : undefined;
  return code === "ECONNRESET" || code === "ECONNREFUSED" || (typeof message === "string" && message.includes("ECONNRESET"));
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
  const pool = getPool();
  const client = await acquireClient(pool);
  try {
    return await client.query<T>(text, params);
  } finally {
    client.release();
  }
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
