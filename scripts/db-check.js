const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

function getEnvFromDotEnvLocal() {
  try {
    const p = path.join(process.cwd(), '.env.local');
    const s = fs.readFileSync(p, 'utf8');
    const m = s.match(/^DATABASE_URL=['"]([^'"\n]+)['"]/m);
    if (m) return m[1];
  } catch {}
  return process.env.DATABASE_URL || '';
}

async function main() {
  const cs = getEnvFromDotEnvLocal();
  if (!cs) {
    console.error('No DATABASE_URL');
    process.exit(1);
  }
  const client = new Client({ connectionString: cs, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    const r = await client.query("SELECT current_database() as db, current_schema() as schema");
    console.log('Connected:', r.rows[0]);
    const existsRes = await client.query("SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = current_schema() AND table_name = 'site_configs') AS exists");
    console.log('site_configs exists:', existsRes.rows[0].exists);
    if (!existsRes.rows[0].exists) {
      console.log('Hint: missing table site_configs; saving will fail unless fallback is in place.');
    }
  } catch (e) {
    console.error('DB connect/query error:', e.message);
    process.exit(2);
  } finally {
    try { await client.end(); } catch {}
  }
}

main();