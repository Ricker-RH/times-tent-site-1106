import "server-only";

import type { PoolClient } from "pg";

import { query } from "./db";

export interface CreateContactSubmissionInput {
  name: string;
  company?: string | null;
  email: string;
  phone?: string | null;
  scenario?: string | null;
  timeline?: string | null;
  brief?: string | null;
  message?: string | null;
  locale?: string | null;
  formType?: string | null;
  payload?: Record<string, unknown> | null;
  sourcePath?: string | null;
  userAgent?: string | null;
  ipAddress?: string | null;
}

export interface ContactSubmissionRecord {
  id: number;
  name: string;
  company: string | null;
  email: string;
  phone: string | null;
  scenario: string | null;
  timeline: string | null;
  brief: string | null;
  message: string | null;
  locale: string | null;
  formType: string | null;
  payload: Record<string, unknown> | null;
  sourcePath: string | null;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string;
}

let hasEnsuredTable = false;
type ColumnInfo = {
  dataType: string;
  udtName: string;
  isNullable: boolean;
  hasDefault: boolean;
};

let cachedColumns: Map<string, ColumnInfo> | null = null;

const CREATE_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS contact_submissions (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    company TEXT,
    email TEXT NOT NULL,
    phone TEXT,
    scenario TEXT,
    timeline TEXT,
    brief TEXT,
    payload JSONB,
    source_path TEXT,
    user_agent TEXT,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`;

const CREATE_INDEX_CREATED_AT_SQL = `
  CREATE INDEX IF NOT EXISTS contact_submissions_created_at_idx
    ON contact_submissions (created_at DESC)
`;

const CREATE_INDEX_SUBMITTED_AT_SQL = `
  CREATE INDEX IF NOT EXISTS contact_submissions_submitted_at_idx
    ON contact_submissions (submitted_at DESC)
`;

async function ensureTable(client?: PoolClient): Promise<void> {
  if (hasEnsuredTable) {
    return;
  }

  const run = async (executor: PoolClient | typeof query) => {
    try {
      if (typeof executor === "function") {
        await executor(CREATE_TABLE_SQL);
      } else {
        await executor.query(CREATE_TABLE_SQL);
      }
      hasEnsuredTable = true;
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("permission denied")) {
        return false;
      }
      if (message.includes("already exists")) {
        hasEnsuredTable = true;
        return true;
      }
      throw error;
    }
  };

  const executed = client ? await run(client) : await run(query);

  if (!executed) {
    // Fallback: ensure table存在或具有只读权限
    const { rows } = await query<{ exists: boolean }>(
      `SELECT EXISTS (
         SELECT 1 FROM information_schema.tables
         WHERE table_schema = current_schema()
           AND table_name = 'contact_submissions'
       ) AS exists`,
    );
    hasEnsuredTable = Boolean(rows[0]?.exists);
    if (!hasEnsuredTable) {
      throw new Error("缺少 contact_submissions 表，且无权限自动创建。请先在数据库中建表。");
    }
  }

  const columns = await loadColumns();

  const createIndex = async (sql: string) => {
    try {
      await query(sql);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("permission denied") || message.includes("does not exist")) {
        // 无权限或缺少列时忽略索引创建
        return;
      }
      throw error;
    }
  };

  if (columns.has("created_at")) {
    await createIndex(CREATE_INDEX_CREATED_AT_SQL);
  } else if (columns.has("submitted_at")) {
    await createIndex(CREATE_INDEX_SUBMITTED_AT_SQL);
  }
}

async function getAvailableColumns(): Promise<Map<string, ColumnInfo>> {
  if (cachedColumns) {
    return cachedColumns;
  }

  await ensureTable();
  return loadColumns();
}

async function loadColumns(): Promise<Map<string, ColumnInfo>> {
  const { rows } = await query<{
    column_name: string;
    data_type: string;
    udt_name: string;
    is_nullable: string;
    column_default: string | null;
  }>(
    `SELECT column_name, data_type, udt_name, is_nullable, column_default
     FROM information_schema.columns
     WHERE table_schema = current_schema()
       AND table_name = 'contact_submissions'`,
  );

  cachedColumns = new Map(
    rows.map((row) => [
      row.column_name,
      {
        dataType: row.data_type,
        udtName: row.udt_name,
        isNullable: row.is_nullable === "YES",
        hasDefault: row.column_default !== null,
      } satisfies ColumnInfo,
    ]),
  );
  return cachedColumns;
}

export async function createContactSubmission(input: CreateContactSubmissionInput): Promise<void> {
  await ensureTable();
  const columns = await getAvailableColumns();

  const mappings: Array<{
    column: string;
    value: unknown;
    cast?: string;
    required?: boolean;
    fallback?: () => unknown;
  }> = [
    { column: "name", value: input.name, required: true },
    { column: "form_type", value: input.formType ?? "contact", required: true },
    { column: "locale", value: input.locale ?? null },
    { column: "company", value: input.company ?? null },
    { column: "email", value: input.email, required: true },
    { column: "phone", value: input.phone ?? null },
    { column: "scenario", value: input.scenario ?? null },
    { column: "timeline", value: input.timeline ?? null },
    { column: "brief", value: input.brief ?? null },
    { column: "message", value: input.message ?? input.brief ?? null },
    { column: "payload", value: input.payload ? JSON.stringify(input.payload) : null, cast: "::jsonb" },
    { column: "source_path", value: input.sourcePath ?? null },
    { column: "user_agent", value: input.userAgent ?? null },
    { column: "ip_address", value: input.ipAddress ?? null },
  ];

  const selectedColumns: string[] = [];
  const placeholders: string[] = [];
  const values: unknown[] = [];

  mappings.forEach((mapping) => {
    const info = columns.get(mapping.column);
    if (!info) {
      if (mapping.required) {
        throw new Error(`contact_submissions 表缺少必须字段 ${mapping.column}`);
      }
      return;
    }
    let value = mapping.value;
    if ((value === null || value === undefined) && mapping.fallback) {
      value = mapping.fallback();
    }
    if ((value === null || value === undefined) && !info.isNullable && !info.hasDefault) {
      throw new Error(`字段 ${mapping.column} 不允许为空，请检查表单数据`);
    }
    selectedColumns.push(mapping.column);
    let placeholderCast = mapping.cast ?? "";
    if (mapping.column === "payload") {
      const isJsonColumn = info.dataType.includes("json") || info.udtName.includes("json");
      placeholderCast = isJsonColumn ? "::jsonb" : "";
    }
    values.push(value ?? null);
    const placeholder = `$${values.length}${placeholderCast}`;
    placeholders.push(placeholder);
  });

  if (selectedColumns.length === 0) {
    throw new Error("无法写入 contact_submissions：无可用字段");
  }

  await query(
    `INSERT INTO contact_submissions (${selectedColumns.join(", ")})
     VALUES (${placeholders.join(", ")})`,
    values,
  );
}

export async function listContactSubmissions(limit = 100): Promise<ContactSubmissionRecord[]> {
  await ensureTable();
  const columns = await getAvailableColumns();

  const selectFragments: string[] = [
    "id",
    "name",
    "email",
    columns.has("company") ? "company" : "NULL::text AS company",
    columns.has("phone") ? "phone" : "NULL::text AS phone",
    columns.has("scenario") ? "scenario" : "NULL::text AS scenario",
    columns.has("timeline") ? "timeline" : "NULL::text AS timeline",
    columns.has("brief") ? "brief" : "NULL::text AS brief",
    columns.has("message") ? "message" : "NULL::text AS message",
    columns.has("locale") ? "locale" : "NULL::text AS locale",
    columns.has("form_type") ? "form_type" : "NULL::text AS form_type",
    columns.has("payload")
      ? columns.get("payload")?.dataType.includes("json") || columns.get("payload")?.udtName.includes("json")
        ? "payload"
        : "payload::text"
      : "NULL::jsonb AS payload",
    columns.has("source_path") ? "source_path" : "NULL::text AS source_path",
    columns.has("user_agent") ? "user_agent" : "NULL::text AS user_agent",
    columns.has("ip_address") ? "ip_address" : "NULL::text AS ip_address",
  ];

  let timestampSelect: string | null = null;
  if (columns.has("created_at")) {
    timestampSelect = "created_at AS created_at";
  } else if (columns.has("submitted_at")) {
    timestampSelect = "submitted_at AS created_at";
  }

  if (!columns.has("id") || !columns.has("name") || !columns.has("email") || !timestampSelect) {
    throw new Error("contact_submissions 表缺少必要列（id、name、email、created_at/submitted_at）");
  }

  selectFragments.push(timestampSelect);

  const { rows } = await query<{
    id: number;
    name: string;
    company: string | null;
    email: string;
    phone: string | null;
    scenario: string | null;
    timeline: string | null;
    brief: string | null;
    message: string | null;
    locale: string | null;
    form_type: string | null;
    payload: Record<string, unknown> | null;
    source_path: string | null;
    user_agent: string | null;
    ip_address: string | null;
    created_at: Date;
  }>(
    `SELECT ${selectFragments.join(", ")}
     FROM contact_submissions
     ORDER BY created_at DESC, id DESC
     LIMIT $1`,
    [limit],
  );

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    company: row.company,
    email: row.email,
    phone: row.phone,
    scenario: row.scenario,
    timeline: row.timeline,
    brief: row.brief,
    message: row.message,
    locale: row.locale,
    formType: row.form_type,
    payload: row.payload,
    sourcePath: row.source_path,
    userAgent: row.user_agent,
    ipAddress: row.ip_address,
    createdAt: row.created_at.toISOString(),
  }));
}

export async function getContactSubmission(id: number): Promise<ContactSubmissionRecord | null> {
  await ensureTable();

  const { rows } = await query<{
    id: number;
    name: string;
    company: string | null;
    email: string;
    phone: string | null;
    scenario: string | null;
    timeline: string | null;
    brief: string | null;
    message: string | null;
    locale: string | null;
    form_type: string | null;
    payload: Record<string, unknown> | null;
    source_path: string | null;
    user_agent: string | null;
    ip_address: string | null;
    created_at: Date;
  }>(
    `SELECT id, name, company, email, phone, scenario, timeline, brief, message, locale, form_type, payload, source_path, user_agent, ip_address, created_at
     FROM contact_submissions
     WHERE id = $1
     LIMIT 1`,
    [id],
  );

  if (!rows.length) {
    return null;
  }

  const row = rows[0];
  return {
    id: row.id,
    name: row.name,
    company: row.company,
    email: row.email,
    phone: row.phone,
    scenario: row.scenario,
    timeline: row.timeline,
    brief: row.brief,
    message: row.message,
    locale: row.locale,
    formType: row.form_type,
    payload: row.payload,
    sourcePath: row.source_path,
    userAgent: row.user_agent,
    ipAddress: row.ip_address,
    createdAt: row.created_at.toISOString(),
  } satisfies ContactSubmissionRecord;
}
