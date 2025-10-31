import fs from 'fs';
import path from 'path';
import { Client } from 'pg';

const CONFIG_KEY = '产品详情';
const TARGET_SLUG = 'arch-tent';

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

function getZhCN(input: unknown): string {
  if (typeof input === 'string') return input;
  if (input && typeof input === 'object' && 'zh-CN' in (input as any)) {
    return String((input as any)['zh-CN'] ?? '');
  }
  return '';
}

async function main() {
  const DATABASE_URL = readDatabaseUrl();
  if (!DATABASE_URL) throw new Error('Missing DATABASE_URL');
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    const res = await client.query('SELECT key, value FROM site_configs WHERE key = $1', [CONFIG_KEY]);
    if (!res.rows.length) throw new Error(`Config '${CONFIG_KEY}' not found`);
    const value = res.rows[0].value || {};
    const detail = value[TARGET_SLUG];
    if (!detail) throw new Error(`Slug '${TARGET_SLUG}' not found`);

    console.log('Title:', detail.title);
    console.log('Breadcrumb:', detail.breadcrumb);
    console.log('Hero.title:', detail.hero?.title);
    console.log('Hero.badge:', detail.hero?.badge);
    console.log('Hero.scenarios:', detail.hero?.scenarios);
    console.log('Hero.description:', detail.hero?.description);

    const hasProduct2 =
      getZhCN(detail.title) === '产品2' ||
      getZhCN(detail.hero?.title) === '产品2' ||
      String(detail.breadcrumb).includes('产品2') ||
      String(detail.hero?.description).includes('产品2') ||
      String(detail.hero?.scenarios).includes('产品2');
    console.log('Contains "产品2" anywhere:', hasProduct2);
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});