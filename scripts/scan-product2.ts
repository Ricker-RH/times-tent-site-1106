import fs from 'fs';
import path from 'path';
import { Client } from 'pg';

function readDatabaseUrl(): string {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const raw = fs.readFileSync(envPath, 'utf8');
    const m = raw.match(/^DATABASE_URL=(.+)$/m);
    if (m) {
      let url = m[1].trim();
      if ((url.startsWith('"') && url.endsWith('"')) || (url.startsWith('\'') && url.endsWith('\''))) {
        url = url.slice(1, -1);
      }
      return url;
    }
  }
  return process.env.DATABASE_URL || '';
}

async function main() {
  const DATABASE_URL = readDatabaseUrl();
  if (!DATABASE_URL) throw new Error('Missing DATABASE_URL');
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    const res = await client.query('SELECT key, value FROM site_configs');
    const keys = res.rows.map((r) => r.key);
    console.log('Total configs:', keys.length);
    let count = 0;
    for (const row of res.rows) {
      const key: string = row.key;
      const value = row.value ?? {};
      const json = JSON.stringify(value);
      if (json.includes('产品2')) {
        console.log(`[HIT] key=${key}`);
        count++;
        // Optional: show short paths within JSON
        try {
          // naive traversal to find fields containing the string
          const paths: string[] = [];
          const walk = (obj: any, path: string) => {
            if (obj === null || obj === undefined) return;
            if (typeof obj === 'string') {
              if (obj.includes('产品2')) paths.push(path);
              return;
            }
            if (Array.isArray(obj)) {
              obj.forEach((it, idx) => walk(it, `${path}[${idx}]`));
              return;
            }
            if (typeof obj === 'object') {
              Object.keys(obj).forEach((k) => walk(obj[k], path ? `${path}.${k}` : k));
            }
          };
          walk(value, key);
          if (paths.length) {
            console.log('  Paths:');
            paths.slice(0, 20).forEach((p) => console.log('   -', p));
          }
        } catch {}
      }
    }
    if (count === 0) {
      console.log('No occurrences of 产品2 found across site_configs.');
    }
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});