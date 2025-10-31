import "server-only";

import type { PoolClient } from "pg";
import { query } from "./db";
import { promises as fs } from "fs";
import path from "path";

export interface SaveUploadInput {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  data: Buffer;
}

export interface UploadRecord {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

let hasEnsuredTable = false;

// --- Local fallback helpers (when DATABASE_URL is not configured) ---
function hasDb(): boolean {
  return typeof process.env.DATABASE_URL === "string" && process.env.DATABASE_URL.trim().length > 0;
}

const LOCAL_UPLOAD_DIR = path.join(process.cwd(), ".local", "uploads");
const LOCAL_INDEX_FILE = path.join(LOCAL_UPLOAD_DIR, "index.json");

async function ensureLocalStore(): Promise<void> {
  try {
    await fs.mkdir(LOCAL_UPLOAD_DIR, { recursive: true });
  } catch {}
  try {
    await fs.access(LOCAL_INDEX_FILE);
  } catch {
    await fs.writeFile(LOCAL_INDEX_FILE, "{}", "utf8");
  }
}

async function readLocalIndex(): Promise<Record<string, UploadRecord>> {
  try {
    await ensureLocalStore();
    const raw = await fs.readFile(LOCAL_INDEX_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, UploadRecord>) : {};
  } catch {
    return {};
  }
}

async function writeLocalIndex(index: Record<string, UploadRecord>): Promise<void> {
  await ensureLocalStore();
  const content = JSON.stringify(index, null, 2);
  await fs.writeFile(LOCAL_INDEX_FILE, content, "utf8");
}

// --- Database helpers ---
const CREATE_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS uploads (
    id TEXT PRIMARY KEY,
    file_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size INTEGER NOT NULL,
    data BYTEA NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`;

async function ensureUploadsTable(client?: PoolClient): Promise<boolean> {
  // If no DB configured, skip table ensure and report false (so callers can use local fallback)
  if (!hasDb()) {
    return false;
  }

  if (hasEnsuredTable) return true;

  async function run(executor: PoolClient | typeof query): Promise<boolean> {
    try {
      if (typeof (executor as any).query === "function") {
        await (executor as PoolClient).query(CREATE_TABLE_SQL);
      } else {
        await query(CREATE_TABLE_SQL);
      }
      hasEnsuredTable = true;
      return true;
    } catch {
      return false;
    }
  }

  const executed = client ? await run(client) : await run(query);
  if (!executed) {
    try {
      const { rows } = await query<{ exists: boolean }>(
        `SELECT EXISTS (
           SELECT 1 FROM information_schema.tables
           WHERE table_schema = current_schema()
             AND table_name = 'uploads'
         ) AS exists`,
      );
      hasEnsuredTable = Boolean(rows[0]?.exists);
    } catch {
      // If we cannot check existence due to DB errors, indicate table not ensured
      hasEnsuredTable = false;
    }
  }

  return hasEnsuredTable;
}

export async function saveUpload(input: SaveUploadInput, client?: PoolClient): Promise<string> {
  // Local filesystem fallback when no database is available
  if (!hasDb()) {
    await ensureLocalStore();
    const filePath = path.join(LOCAL_UPLOAD_DIR, input.fileName);
    await fs.writeFile(filePath, input.data);
    const index = await readLocalIndex();
    index[input.id] = {
      id: input.id,
      fileName: input.fileName,
      mimeType: input.mimeType,
      size: input.size,
      createdAt: new Date().toISOString(),
    };
    await writeLocalIndex(index);
    return input.id;
  }

  // Database storage
  await ensureUploadsTable(client);

  const sql = `
    INSERT INTO uploads (id, file_name, mime_type, size, data)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (id) DO UPDATE SET
      file_name = EXCLUDED.file_name,
      mime_type = EXCLUDED.mime_type,
      size = EXCLUDED.size,
      data = EXCLUDED.data
  `;

  if (client) {
    await client.query(sql, [input.id, input.fileName, input.mimeType, input.size, input.data]);
  } else {
    await query(sql, [input.id, input.fileName, input.mimeType, input.size, input.data]);
  }

  return input.id;
}

export async function getUpload(id: string): Promise<{ mimeType: string; data: Buffer } | null> {
  // Local filesystem fallback when no database is available
  if (!hasDb()) {
    await ensureLocalStore();
    const index = await readLocalIndex();
    const record = index[id];
    if (!record) return null;
    const filePath = path.join(LOCAL_UPLOAD_DIR, record.fileName);
    try {
      const data = await fs.readFile(filePath);
      return { mimeType: record.mimeType, data };
    } catch {
      return null;
    }
  }

  // Database storage
  await ensureUploadsTable();
  try {
    const { rows } = await query<{ mime_type: string; data: Buffer }>(
      `SELECT mime_type, data FROM uploads WHERE id = $1 LIMIT 1`,
      [id],
    );

    if (!rows.length) return null;
    const row = rows[0];
    // Node-postgres returns Buffer for BYTEA by default
    return { mimeType: row.mime_type, data: row.data };
  } catch {
    return null;
  }
}
