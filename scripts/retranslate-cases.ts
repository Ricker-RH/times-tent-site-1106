/**
 * Retranslate Cases Config (site_configs key: "案例展示").
 * - Source: zh-CN. Targets: zh-TW (Traditional/Taiwan) and en.
 * - Uses external HTTP services:
 *   - zhconvert API for Simplified -> Traditional (Taiwan style)
 *   - LibreTranslate for Chinese -> English
 * - Safely updates DB, preserving shape and falling back if translation fails.
 *
 * Run:
 *   npm run i18n:cases:retranslate
 */

import fs from 'fs';
import path from 'path';
import { Client } from 'pg';

const CASES_CONFIG_KEY = '案例展示';
const REQUIRED_LOCALES = ['zh-CN', 'zh-TW', 'en'] as const;

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

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

async function toTraditionalTaiwan(text: string): Promise<string> {
  const url = `https://api.zhconvert.org/convert?converter=Taiwan&text=${encodeURIComponent(text)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`zhconvert failed: ${res.status}`);
  const data = await res.json();
  return (data?.data?.text as string) || text;
}

async function translateToEnglish(text: string): Promise<string> {
  // LibreTranslate public instance (no API key), fallback safe if blocked
  const res = await fetch('https://translate.astian.org/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: text, source: 'zh', target: 'en', format: 'text' }),
  });
  if (!res.ok) throw new Error(`libretranslate failed: ${res.status}`);
  const data = await res.json();
  const out = (data?.translatedText as string) || '';
  return out.trim().length ? out : text;
}

async function safeZhTW(text: string): Promise<string> {
  try { return await toTraditionalTaiwan(text); } catch { return text; }
}

async function safeEn(text: string): Promise<string> {
  try { return await translateToEnglish(text); } catch { return text; }
}

function pickSourceLocalized(v: unknown): string | null {
  if (isObject(v)) {
    const zhCN = v['zh-CN'];
    if (isNonEmptyString(zhCN)) return zhCN.trim();
    const en = v['en'];
    if (isNonEmptyString(en)) return en.trim();
    const zhTW = v['zh-TW'];
    if (isNonEmptyString(zhTW)) return zhTW.trim();
    return null;
  }
  if (isNonEmptyString(v)) return v.trim();
  return null;
}

function ensureLocalizedShape(obj: unknown, fallbackBase: string): Record<string, string> {
  const base = isObject(obj) ? obj as Record<string, unknown> : {};
  const out: Record<string, string> = {
    'zh-CN': isNonEmptyString(base['zh-CN']) ? String(base['zh-CN']).trim() : fallbackBase,
    'zh-TW': isNonEmptyString(base['zh-TW']) ? String(base['zh-TW']).trim() : fallbackBase,
    'en': isNonEmptyString(base['en']) ? String(base['en']).trim() : fallbackBase,
  };
  return out;
}

function deepEqual(a: any, b: any) {
  try { return JSON.stringify(a) === JSON.stringify(b); } catch { return false; }
}

async function retranslateField(value: unknown): Promise<Record<string, string>> {
  const src = pickSourceLocalized(value) || '';
  const shaped = ensureLocalizedShape(value, src);
  // Always regenerate target locales based on zh-CN as canonical
  const base = shaped['zh-CN'].trim();
  const zhTW = await safeZhTW(base);
  const en = await safeEn(base);
  return { 'zh-CN': base, 'zh-TW': zhTW, 'en': en };
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
  const config = parseConfigValue(currentRaw);
  if (!isObject(config)) {
    console.error('site_configs.value 不是 JSON 对象，无法重翻译。');
    await client.end();
    process.exit(3);
  }

  let changes = 0;
  const next = { ...(config as any) };

  // categories and nested studies
  if (Array.isArray(next.categories)) {
    for (let i = 0; i < next.categories.length; i++) {
      const cat = next.categories[i];
      const fixedName = await retranslateField(cat?.name);
      const fixedIntro = await retranslateField(cat?.intro);
      const beforeCat = JSON.stringify({ name: cat?.name, intro: cat?.intro });

      cat.name = fixedName;
      cat.intro = fixedIntro;

      if (Array.isArray(cat?.studies)) {
        for (let j = 0; j < cat.studies.length; j++) {
          const st = cat.studies[j];
          const fixedTitle = await retranslateField(st?.title);
          const fixedSummary = await retranslateField(st?.summary);
          const fixedBackground = await retranslateField(st?.background);
          const beforeSt = JSON.stringify({ title: st?.title, summary: st?.summary, background: st?.background });

          st.title = fixedTitle;
          st.summary = fixedSummary;
          st.background = fixedBackground;

          if (!deepEqual(beforeSt, JSON.stringify({ title: st?.title, summary: st?.summary, background: st?.background }))) changes++;
        }
      }

      if (!deepEqual(beforeCat, JSON.stringify({ name: cat?.name, intro: cat?.intro }))) changes++;
      next.categories[i] = cat;
    }
  }

  // hero: retranslate eyebrow/title/description using zh-CN canonical (fallback to title "案例展示")
  if (isObject(next.hero)) {
    const hero = next.hero as Record<string, any>;

    const titleSrc = pickSourceLocalized(hero.title) || '案例展示';
    const titleZhTW = await safeZhTW(titleSrc);
    const titleEnRaw = await safeEn(titleSrc);
    const titleEn = titleEnRaw.trim() === titleSrc.trim() ? 'Case Studies' : titleEnRaw;
    const beforeTitle = JSON.stringify(hero.title);
    hero.title = { 'zh-CN': titleSrc, 'zh-TW': titleZhTW, 'en': titleEn };

    // Eyebrow: force zh locales from title, keep existing English if present
    const eyebrowEnRaw = isNonEmptyString(hero?.eyebrow) ? String(hero.eyebrow) : await safeEn(titleSrc);
    const eyebrowEn = eyebrowEnRaw.trim() === titleSrc.trim() ? 'Case Studies' : eyebrowEnRaw;
    const eyebrowZhTW = await safeZhTW(titleSrc);
    const beforeEyebrow = JSON.stringify(hero.eyebrow);
    hero.eyebrow = { 'zh-CN': titleSrc, 'zh-TW': eyebrowZhTW, 'en': eyebrowEn };

    const descSrc = pickSourceLocalized(hero.description) || '';
    const descZhTW = descSrc ? await safeZhTW(descSrc) : '';
    const descEnRaw = descSrc ? await safeEn(descSrc) : '';
    const manualDescEn = 'Browse Times Tent\'s representative success cases in sports events and venues, hospitality and cultural tourism, industrial warehousing, and exhibition activities, and learn reusable modular setup practices.';
    const descEn = descSrc && descEnRaw.trim() === descSrc.trim() ? manualDescEn : descEnRaw;
    const beforeDesc = JSON.stringify(hero.description);
    hero.description = { 'zh-CN': descSrc, 'zh-TW': descZhTW, 'en': descEn };

    if (!deepEqual(beforeTitle, JSON.stringify(hero.title))) changes++;
    if (!deepEqual(beforeEyebrow, JSON.stringify(hero.eyebrow))) changes++;
    if (!deepEqual(beforeDesc, JSON.stringify(hero.description))) changes++;

    next.hero = hero;
  }

  // meta
  next._meta = {
    ...(next._meta ?? {}),
    updatedAt: new Date().toISOString(),
    updatedBy: 'scripts/retranslate-cases.ts',
  };

  if (deepEqual(config, next)) {
    console.log('没有检测到变化，跳过更新。');
    await client.end();
    return;
  }

  await client.query('UPDATE site_configs SET value = $2 WHERE key = $1', [CASES_CONFIG_KEY, next]);
  console.log(`重翻译完成并已写入数据库。变更字段次数: ${changes}.`);

  await client.end();
}

main().catch((err) => {
  console.error('重翻译脚本运行错误:', err);
  process.exit(10);
});