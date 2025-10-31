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
    const res = await client.query('SELECT value FROM site_configs WHERE key = $1', ['产品中心']);
    const value = res.rows[0]?.value ?? {};
    const products = Array.isArray(value?.products) ? value.products : [];
    console.log('Products count:', products.length);
    products.forEach((p: any, idx: number) => {
      const slug = p?.slug ?? `index-${idx}`;
      const name = p?.name;
      const tagline = p?.tagline;
      const nameZh = typeof name === 'string' ? name : name?.['zh-CN'];
      const nameEn = typeof name === 'string' ? name : name?.['en'];
      const nameTw = typeof name === 'string' ? name : name?.['zh-TW'];
      const tagZh = typeof tagline === 'string' ? tagline : tagline?.['zh-CN'];
      const tagEn = typeof tagline === 'string' ? tagline : tagline?.['en'];
      const tagTw = typeof tagline === 'string' ? tagline : tagline?.['zh-TW'];
      const hit = [tagZh, tagEn, tagTw].some((s) => typeof s === 'string' && s.includes('产品2'));
      console.log(`- ${slug}`);
      console.log(`  name zh-CN: ${nameZh ?? ''}`);
      console.log(`  name en   : ${nameEn ?? ''}`);
      console.log(`  name zh-TW: ${nameTw ?? ''}`);
      console.log(`  tagline zh-CN: ${tagZh ?? ''}`);
      console.log(`  tagline en   : ${tagEn ?? ''}`);
      console.log(`  tagline zh-TW: ${tagTw ?? ''}`);
      console.log(`  contains 产品2: ${hit}`);
    });
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});