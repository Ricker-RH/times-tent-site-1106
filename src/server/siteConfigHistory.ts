import "server-only";

import type { PoolClient } from "pg";

import { query } from "./db";

export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

export interface SiteConfigDiffEntry {
  op: "add" | "remove" | "replace";
  path: string;
  before?: JsonValue;
  after?: JsonValue;
}

export interface SiteConfigHistoryRecord {
  id: number;
  key: string;
  value: JsonValue;
  previousValue: JsonValue | null;
  diff: SiteConfigDiffEntry[];
  action: string;
  actorId?: string | null;
  actorUsername?: string | null;
  actorEmail?: string | null;
  actorRole?: string | null;
  sourcePath?: string | null;
  note?: string | null;
  createdAt: string;
}

interface RecordHistoryOptions {
  client: PoolClient;
  key: string;
  previousValue: JsonValue | null;
  nextValue: JsonValue;
  diff: SiteConfigDiffEntry[];
  action: string;
  actorId?: string | null;
  actorUsername?: string | null;
  actorEmail?: string | null;
  actorRole?: string | null;
  sourcePath?: string | null;
  note?: string | null;
}

function hasDb(): boolean {
  return typeof process.env.DATABASE_URL === "string" && process.env.DATABASE_URL.trim().length > 0;
}

let hasEnsuredHistoryTable = false;

const HISTORY_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS site_config_history (
    id BIGSERIAL PRIMARY KEY,
    key TEXT NOT NULL,
    value JSONB NOT NULL,
    previous_value JSONB,
    diff JSONB,
    action TEXT NOT NULL DEFAULT 'update',
    actor_id TEXT,
    actor_username TEXT,
    actor_email TEXT,
    actor_role TEXT,
    source_path TEXT,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`;

const HISTORY_INDEX_SQL = `
  CREATE INDEX IF NOT EXISTS site_config_history_key_created_at_idx ON site_config_history (key, created_at DESC)
`;

async function ensureHistoryTable(client: PoolClient): Promise<void> {
  if (hasEnsuredHistoryTable) {
    return;
  }

  try {
    await client.query(HISTORY_TABLE_SQL);
    await client.query(HISTORY_INDEX_SQL);
    hasEnsuredHistoryTable = true;
  } catch {
    // 忽略表创建失败，后续查询会按需容错
  }
}

async function ensureHistoryTableGlobal(): Promise<void> {
  if (hasEnsuredHistoryTable) {
    return;
  }
  if (!hasDb()) {
    return;
  }
  try {
    await query(HISTORY_TABLE_SQL);
    await query(HISTORY_INDEX_SQL);
    hasEnsuredHistoryTable = true;
  } catch {
    // 数据库不可用或连接失败，跳过表创建以便页面在开发环境继续渲染
  }
}

function buildJsonPointer(pathSegments: string[]): string {
  if (!pathSegments.length) return "/";
  return `/${pathSegments
    .map((segment) => segment.replace(/~/g, "~0").replace(/\//g, "~1"))
    .join("/")}`;
}

function collectDiff(
  path: string[],
  prevValue: JsonValue | undefined,
  nextValue: JsonValue | undefined,
  diffs: SiteConfigDiffEntry[],
): void {
  if (prevValue === undefined && nextValue === undefined) {
    return;
  }

  if (prevValue === undefined) {
    diffs.push({ op: "add", path: buildJsonPointer(path), after: nextValue });
    return;
  }

  if (nextValue === undefined) {
    diffs.push({ op: "remove", path: buildJsonPointer(path), before: prevValue });
    return;
  }

  if (typeof prevValue !== typeof nextValue) {
    diffs.push({ op: "replace", path: buildJsonPointer(path), before: prevValue, after: nextValue });
    return;
  }

  if (Array.isArray(prevValue) && Array.isArray(nextValue)) {
    const maxLength = Math.max(prevValue.length, nextValue.length);
    for (let index = 0; index < maxLength; index += 1) {
      collectDiff([...path, String(index)], prevValue[index], nextValue[index], diffs);
    }
    return;
  }

  if (prevValue && typeof prevValue === "object" && nextValue && typeof nextValue === "object") {
    const keys = new Set([...Object.keys(prevValue), ...Object.keys(nextValue)]);
    for (const key of keys) {
      collectDiff([...path, key], (prevValue as Record<string, JsonValue>)[key], (nextValue as Record<string, JsonValue>)[key], diffs);
    }
    return;
  }

  if (prevValue !== nextValue) {
    diffs.push({ op: "replace", path: buildJsonPointer(path), before: prevValue, after: nextValue });
  }
}

export function diffJsonValues(previousValue: JsonValue | null, nextValue: JsonValue): SiteConfigDiffEntry[] {
  const diffs: SiteConfigDiffEntry[] = [];
  collectDiff([], previousValue ?? undefined, nextValue, diffs);
  return diffs;
}

export async function recordSiteConfigHistory(options: RecordHistoryOptions): Promise<void> {
  const {
    client,
    key,
    previousValue,
    nextValue,
    diff,
    action,
    actorId,
    actorUsername,
    actorEmail,
    actorRole,
    sourcePath,
    note,
  } = options;

  await ensureHistoryTable(client);

  await client.query(
    `INSERT INTO site_config_history (
        key,
        value,
        previous_value,
        diff,
        action,
        actor_id,
        actor_username,
        actor_email,
        actor_role,
        source_path,
        note
     ) VALUES ($1, $2::jsonb, $3::jsonb, $4::jsonb, $5, $6, $7, $8, $9, $10, $11)`,
    [
      key,
      JSON.stringify(nextValue),
      previousValue === null ? null : JSON.stringify(previousValue),
      JSON.stringify(diff),
      action,
      actorId ?? null,
      actorUsername ?? null,
      actorEmail ?? null,
      actorRole ?? null,
      sourcePath ?? null,
      note ?? null,
    ],
  );
}

export async function listSiteConfigHistory(key: string, limit = 20): Promise<SiteConfigHistoryRecord[]> {
  await ensureHistoryTableGlobal();
  if (!hasDb()) {
    return [];
  }
  try {
    const { rows } = await query<{
      id: number;
      key: string;
      value: JsonValue;
      previous_value: JsonValue | null;
      diff: SiteConfigDiffEntry[] | null;
      action: string;
      actor_id: string | null;
      actor_username: string | null;
      actor_email: string | null;
      actor_role: string | null;
      source_path: string | null;
      note: string | null;
      created_at: Date;
    }>(
      `SELECT id, key, value, previous_value, diff, action, actor_id, actor_username, actor_email, actor_role, source_path, note, created_at
       FROM site_config_history
       WHERE key = $1
       ORDER BY created_at DESC, id DESC
       LIMIT $2`,
      [key, limit],
    );

    return rows.map(mapRowToRecord);
  } catch {
    return [];
  }
}

export async function getSiteConfigHistoryEntry(id: number): Promise<SiteConfigHistoryRecord | null> {
  await ensureHistoryTableGlobal();
  if (!hasDb()) {
    return null;
  }
  try {
    const { rows } = await query<{
      id: number;
      key: string;
      value: JsonValue;
      previous_value: JsonValue | null;
      diff: SiteConfigDiffEntry[] | null;
      action: string;
      actor_id: string | null;
      actor_username: string | null;
      actor_email: string | null;
      actor_role: string | null;
      source_path: string | null;
      note: string | null;
      created_at: Date;
    }>(
      `SELECT id, key, value, previous_value, diff, action, actor_id, actor_username, actor_email, actor_role, source_path, note, created_at
       FROM site_config_history
       WHERE id = $1
       LIMIT 1`,
      [id],
    );

    if (!rows.length) {
      return null;
    }

    return mapRowToRecord(rows[0]);
  } catch {
    return null;
  }
}

export async function listRecentSiteConfigHistory(limit = 100): Promise<SiteConfigHistoryRecord[]> {
  await ensureHistoryTableGlobal();
  if (!hasDb()) {
    return [];
  }
  try {
    const { rows } = await query<{
      id: number;
      key: string;
      value: JsonValue;
      previous_value: JsonValue | null;
      diff: SiteConfigDiffEntry[] | null;
      action: string;
      actor_id: string | null;
      actor_username: string | null;
      actor_email: string | null;
      actor_role: string | null;
      source_path: string | null;
      note: string | null;
      created_at: Date;
    }>(
      `SELECT id, key, value, previous_value, diff, action, actor_id, actor_username, actor_email, actor_role, source_path, note, created_at
       FROM site_config_history
       ORDER BY created_at DESC, id DESC
       LIMIT $1`,
      [limit],
    );

    return rows.map(mapRowToRecord);
  } catch {
    return [];
  }
}

function mapRowToRecord(row: {
  id: number;
  key: string;
  value: JsonValue;
  previous_value: JsonValue | null;
  diff: SiteConfigDiffEntry[] | null;
  action: string;
  actor_id: string | null;
  actor_username: string | null;
  actor_email: string | null;
  actor_role: string | null;
  source_path: string | null;
  note: string | null;
  created_at: Date;
}): SiteConfigHistoryRecord {
  return {
    id: row.id,
    key: row.key,
    value: row.value,
    previousValue: row.previous_value,
    diff: Array.isArray(row.diff) ? row.diff : [],
    action: row.action,
    actorId: row.actor_id,
    actorUsername: row.actor_username,
    actorEmail: row.actor_email,
    actorRole: row.actor_role,
    sourcePath: row.source_path,
    note: row.note,
    createdAt: row.created_at.toISOString(),
  };
}