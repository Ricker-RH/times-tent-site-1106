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
    const res = await client.query('SELECT key, value FROM site_configs WHERE key = $1', ['产品中心']);
    if (!res.rows.length) {
      console.log('产品中心 config not found.');
      return;
    }
    const row = res.rows[0];
    const value = row.value ?? {};
    const products: any[] = Array.isArray(value?.products) ? value.products : [];
    let changed = false;

    const targetSlug = 'arch-tent';
    const zhCN = '酒店文旅 · 展览活动';
    const en = 'Hospitality · Exhibition Events';
    const zhTW = '酒店文旅 · 展覽活動';

    const updatedProducts = products.map((p) => {
      if (!p || p.slug !== targetSlug) return p;
      const tagline = p.tagline ?? {};
      const nextTagline = typeof tagline === 'string' ? { 'zh-CN': zhCN, en, 'zh-TW': zhTW } : { ...tagline };
      if (typeof nextTagline['zh-CN'] !== 'string' || !nextTagline['zh-CN']) nextTagline['zh-CN'] = zhCN;
      nextTagline['en'] = en;
      nextTagline['zh-TW'] = zhTW;
      if (JSON.stringify(nextTagline) !== JSON.stringify(tagline)) {
        changed = true;
        return { ...p, tagline: nextTagline };
      }
      return p;
    });

    if (!changed) {
      console.log('No changes needed for 产品中心 arch-tent tagline.');
      return;
    }

    const nextValue = { ...value, products: updatedProducts };
    await client.query('UPDATE site_configs SET value = $2 WHERE key = $1', ['产品中心', nextValue]);
    console.log('Updated 产品中心 arch-tent tagline for all languages.');
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});