/**
 * Fix missing localized fields in cases_config (site_configs key: "案例展示").
 * - Ensures `categories[].name`, `categories[].intro`, and `categories[].studies[].title/summary/background`
 *   are `Record<LocaleKey, string>` with keys: zh-CN, zh-TW, en.
 * - Converts plain strings to 3-locale objects, fills empty/missing locales from a sensible fallback.
 *
 * Usage:
 *   npm run i18n:cases:fix
 */

import fs from 'fs';
import path from 'path';
import { Client } from 'pg';

const REQUIRED_LOCALES = ['zh-CN', 'zh-TW', 'en'] as const;
const CASES_CONFIG_KEY = '案例展示';

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

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

type Localized = Record<(typeof REQUIRED_LOCALES)[number], string> & Record<string, string>;

function ensureLocalized(value: unknown, opts?: { legacyEn?: unknown; fallback?: string }): Localized {
  const legacyEn = opts?.legacyEn;
  const fallback = opts?.fallback ?? '';

  let baseText: string | undefined;
  let obj: Record<string, unknown> = {};

  if (isNonEmptyString(value)) {
    baseText = value.trim();
  } else if (value && typeof value === 'object') {
    obj = value as Record<string, unknown>;
    const zhCN = isNonEmptyString(obj['zh-CN']) ? String(obj['zh-CN']).trim() : undefined;
    const en = isNonEmptyString(obj['en']) ? String(obj['en']).trim() : undefined;
    const zhTW = isNonEmptyString(obj['zh-TW']) ? String(obj['zh-TW']).trim() : undefined;
    baseText = zhCN ?? en ?? zhTW ?? (isNonEmptyString(fallback) ? fallback.trim() : undefined);
  } else {
    baseText = isNonEmptyString(fallback) ? fallback.trim() : '';
  }

  const result: Localized = {
    'zh-CN': baseText ?? '',
    'zh-TW': baseText ?? '',
    'en': baseText ?? '',
  } as Localized;

  // Overlay existing keys if present
  for (const k of REQUIRED_LOCALES) {
    const cur = (obj as Record<string, unknown>)[k];
    if (isNonEmptyString(cur)) result[k] = (cur as string).trim();
  }

  // Merge legacy English if provided
  if (isNonEmptyString(legacyEn)) {
    const legacy = legacyEn.trim();
    if (!isNonEmptyString(result.en)) result.en = legacy;
  }

  // Preserve any extra locale keys already present (same as REQUIRED ones)
  if (obj && typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj)) {
      if (!REQUIRED_LOCALES.includes(k as any)) continue;
      if (isNonEmptyString(v)) result[k] = String(v).trim();
    }
  }

  return result;
}

function deepEqual(a: any, b: any): boolean {
  try { return JSON.stringify(a) === JSON.stringify(b); } catch { return false; }
}

function parseConfigValue(raw: unknown): any | null {
  if (!raw) return null;
  if (typeof raw === 'object') return raw as any;
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return null; }
  }
  return null;
}

async function main() {
  const DATABASE_URL = readDatabaseUrl();
  if (!DATABASE_URL) {
    console.error('缺少数据库连接字符串 DATABASE_URL。请在 .env.local 或环境变量中配置。');
    process.exit(1);
  }

  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  const { rows } = await client.query('SELECT key, value FROM site_configs WHERE key = $1 LIMIT 1', [CASES_CONFIG_KEY]);
  if (!rows.length) {
    console.error(`未在数据库中找到 key='${CASES_CONFIG_KEY}' 的配置。`);
    await client.end();
    process.exit(2);
  }

  const currentRaw = rows[0].value;
  const current = parseConfigValue(currentRaw);
  if (!current || typeof current !== 'object') {
    console.error('site_configs.value 不是 JSON 对象，无法修复。');
    await client.end();
    process.exit(3);
  }

  const config = { ...current } as any;
  let changes = 0;

  // categories and nested studies
  if (Array.isArray(config.categories)) {
    config.categories = config.categories.map((cat: any, idx: number) => {
      const nameFallback = isNonEmptyString(cat?.name) ? String(cat.name) : (isNonEmptyString(cat?.slug) ? String(cat.slug) : `Category ${idx + 1}`);
      const introFallback = isNonEmptyString(cat?.intro) ? String(cat.intro) : '';
      const fixedCat = {
        ...cat,
        name: ensureLocalized(cat?.name, { legacyEn: cat?.nameEn, fallback: nameFallback }),
        intro: ensureLocalized(cat?.intro, { legacyEn: cat?.introEn, fallback: introFallback }),
      };

      let catChanged = !deepEqual(cat, fixedCat);

      if (Array.isArray(cat?.studies)) {
        fixedCat.studies = cat.studies.map((study: any, j: number) => {
          const titleFallback = isNonEmptyString(study?.title) ? String(study.title) : (isNonEmptyString(study?.slug) ? String(study.slug) : `Case ${idx + 1}-${j + 1}`);
          const summaryFallback = isNonEmptyString(study?.summary) ? String(study.summary) : '';
          const backgroundFallback = isNonEmptyString(study?.background) ? String(study.background) : '';
          const fixedStudy = {
            ...study,
            title: ensureLocalized(study?.title, { fallback: titleFallback }),
            summary: ensureLocalized(study?.summary, { fallback: summaryFallback }),
            background: ensureLocalized(study?.background, { fallback: backgroundFallback }),
          };
          if (!deepEqual(study, fixedStudy)) changes++;
          return fixedStudy;
        });
      }

      if (catChanged) changes++;
      return fixedCat;
    });
  }

  // hero fields: ensure title/eyebrow/description are localized objects
  if (config.hero && typeof config.hero === 'object') {
    const hero = config.hero;
    const titleFallback = isNonEmptyString(hero?.title) ? String(hero.title) : '案例展示';
    const eyebrowBase = isNonEmptyString(hero?.eyebrow) ? String(hero.eyebrow) : titleFallback;
    const descFallback = isNonEmptyString(hero?.description) ? String(hero.description) : '';

    const fixedHero = {
      ...hero,
      title: ensureLocalized(hero?.title, { fallback: titleFallback }),
      eyebrow: ensureLocalized(hero?.eyebrow, { fallback: eyebrowBase }),
      description: ensureLocalized(hero?.description, { fallback: descFallback }),
    };

    if (!deepEqual(hero, fixedHero)) {
      config.hero = fixedHero;
      changes++;
    }
  }

  // Optional: bump meta updatedAt
  config._meta = {
    ...(config._meta ?? {}),
    updatedAt: new Date().toISOString(),
    updatedBy: 'scripts/fix-cases-i18n.ts',
  };

  const noChange = deepEqual(current, config);
  if (noChange) {
    console.log('未检测到需要修复的内容；cases_config 已具备所需本地化字段。');
    await client.end();
    return;
  }

  await client.query('UPDATE site_configs SET value = $2 WHERE key = $1', [CASES_CONFIG_KEY, config]);
  console.log(`已更新案例配置，修复字段次数: ${changes}.`);

  await client.end();
}

main().catch((err) => {
  console.error('修复脚本运行错误:', err);
  process.exit(10);
});