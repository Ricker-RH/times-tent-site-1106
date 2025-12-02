import "server-only";

import { query } from "./db";

type LoginActivityRow = {
  username: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: Date;
};

const ENSURE_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS admin_login_activity (
    id BIGSERIAL PRIMARY KEY,
    username TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;

let ensured = false;

async function ensureTable(): Promise<void> {
  if (ensured) return;
  try {
    await query(ENSURE_TABLE_SQL);
    ensured = true;
  } catch {
    // ignore failures (no DB or permission issues)
  }
}

export async function recordAdminLogin(username: string, ipAddress?: string | null, userAgent?: string | null): Promise<void> {
  await ensureTable();
  try {
    await query(
      `INSERT INTO admin_login_activity (username, ip_address, user_agent) VALUES ($1, $2, $3)`,
      [username, ipAddress ?? null, userAgent ?? null],
    );
  } catch {
    // ignore if DB not available
  }
}

export async function getLastLoginActivity(username: string): Promise<{ time?: string; ip?: string | null } | null> {
  await ensureTable();
  try {
    const { rows } = await query<LoginActivityRow>(
      `SELECT username, ip_address, user_agent, created_at
       FROM admin_login_activity
       WHERE username = $1
       ORDER BY created_at DESC, id DESC
       LIMIT 1`,
      [username],
    );
    if (!rows.length) return null;
    const row = rows[0];
    return { time: row.created_at.toISOString(), ip: row.ip_address };
  } catch {
    return null;
  }
}

