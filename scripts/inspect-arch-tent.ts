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

    const sections = Array.isArray(detail.sections) ? detail.sections : [];
    const overview = sections.find((s: any) => {
      const zh = getZhCN(s?.heading);
      const en = (s?.heading && typeof s.heading === 'object') ? (s.heading as any)['en'] : undefined;
      return zh === '产品概览' || en === 'Product Overview';
    });

    if (!overview) {
      console.log('Overview section not found. Headings:', sections.map((s: any) => s?.heading));
      return;
    }

    console.log('Overview heading:', overview.heading);

    const pairs = overview.pairs;
    if (!pairs) {
      console.log('No pairs found in overview.');
      return;
    }

    const groups = Array.isArray(pairs) ? pairs : (Array.isArray(pairs?.items) ? [pairs.items] : []);
    console.log('Pairs groups count:', groups.length);

    groups.forEach((group: any, gi: number) => {
      console.log(`Group #${gi + 1}:`);
      if (Array.isArray(group)) {
        group.forEach((item: any, ii: number) => {
          console.log(`  [${ii}] label=`, item?.label, ' value=', item?.value);
        });
      } else if (group && Array.isArray(group.items)) {
        group.items.forEach((item: any, ii: number) => {
          console.log(`  [${ii}] label=`, item?.label, ' value=', item?.value);
        });
      } else {
        console.log('  (non-standard group shape)', group);
      }
    });
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});