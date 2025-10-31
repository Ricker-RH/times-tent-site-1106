/**
 * Retranslate extra fields in Cases Config (site_configs key: "案例展示").
 * - Adds parallel i18n fields without changing existing shapes used by UI/admin:
 *   - breadcrumbI18n: [{ label: { zh-CN, zh-TW, en }, href }]
 *   - highlightsI18n: Array<Record<Locale, string>>
 *   - deliverablesI18n: Array<Record<Locale, string>>
 *   - metricsI18n: Array<{ label: Record<Locale, string>; value: Record<Locale, string> }>
 * - Keeps original breadcrumb/highlights/deliverables/metrics unchanged to avoid breaking current UI.
 * - Translates based on zh-CN canonical, using zhconvert (Taiwan) and LibreTranslate (zh->en).
 *
 * Run:
 *   node scripts/retranslate-cases-extras.ts
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

async function safeZhTW(text: string): Promise<string> { try { return await toTraditionalTaiwan(text); } catch { return text; } }
async function safeEn(text: string): Promise<string> { try { return await translateToEnglish(text); } catch { return text; } }

function deepEqual(a: any, b: any): boolean { try { return JSON.stringify(a) === JSON.stringify(b); } catch { return false; } }

function containsChinese(text: string): boolean { return /[\u4e00-\u9fff]/.test(text); }

function parseConfigValue(raw: unknown): any | null {
  if (!raw) return null;
  if (typeof raw === 'object') return raw as any;
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return null; }
  }
  return null;
}

function makeLocalized(base: string, opts?: { translateValue?: boolean }): Record<string, string> {
  const shouldTranslate = opts?.translateValue === true ? containsChinese(base) : true;
  return {
    'zh-CN': base,
    'zh-TW': base,
    'en': base,
  };
}

async function localizeText(base: string, opts?: { translateValue?: boolean; manual?: Record<string, string> }): Promise<Record<string, string>> {
  const manual = opts?.manual || {};
  const zhCN = base;
  const zhTW = manual['zh-TW'] || (containsChinese(base) ? await safeZhTW(base) : base);
  let en = manual['en'] || (containsChinese(base) ? await safeEn(base) : base);
  // Manual overrides for common breadcrumb terms
  if (!manual['en']) {
    if (base === '首页') en = 'Home';
    if (base === '案例展示') en = 'Case Studies';
  }
  return { 'zh-CN': zhCN, 'zh-TW': zhTW, 'en': en };
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
    console.error('site_configs.value 不是 JSON 对象，无法处理。');
    await client.end();
    process.exit(3);
  }

  const next = { ...(config as any) };
  let changes = 0;

  // breadcrumb -> breadcrumbI18n
  if (Array.isArray(next.breadcrumb)) {
    const items = next.breadcrumb as Array<any>;
    const i18nItems: Array<any> = [];
    for (const item of items) {
      const label = isNonEmptyString(item?.label) ? String(item.label).trim() : '';
      const href = isNonEmptyString(item?.href) ? String(item.href).trim() : '';
      if (!label && !href) continue;
      const labelI18n = await localizeText(label);
      i18nItems.push({ label: labelI18n, href });
    }
    const before = JSON.stringify(next.breadcrumbI18n ?? null);
    next.breadcrumbI18n = i18nItems;
    if (!deepEqual(before, JSON.stringify(next.breadcrumbI18n))) changes++;
  }

  // categories[].studies[]: highlightsI18n, deliverablesI18n, metricsI18n
  if (Array.isArray(next.categories)) {
    for (let i = 0; i < next.categories.length; i++) {
      const cat = next.categories[i];
      if (Array.isArray(cat?.studies)) {
        for (let j = 0; j < cat.studies.length; j++) {
          const st = cat.studies[j];

          // highlightsI18n
          if (Array.isArray(st?.highlights)) {
            const i18nHighlights = [] as Array<Record<string, string>>;
            for (const h of st.highlights) {
              const base = isNonEmptyString(h) ? String(h).trim() : '';
              if (!base) continue;
              const localized = await localizeText(base);
              i18nHighlights.push(localized);
            }
            const before = JSON.stringify(st.highlightsI18n ?? null);
            st.highlightsI18n = i18nHighlights;
            if (!deepEqual(before, JSON.stringify(st.highlightsI18n))) changes++;
          }

          // deliverablesI18n
          if (Array.isArray(st?.deliverables)) {
            const i18nDeliverables = [] as Array<Record<string, string>>;
            for (const d of st.deliverables) {
              const base = isNonEmptyString(d) ? String(d).trim() : '';
              if (!base) continue;
              const localized = await localizeText(base);
              i18nDeliverables.push(localized);
            }
            const before = JSON.stringify(st.deliverablesI18n ?? null);
            st.deliverablesI18n = i18nDeliverables;
            if (!deepEqual(before, JSON.stringify(st.deliverablesI18n))) changes++;
          }

          // metricsI18n
          if (Array.isArray(st?.metrics)) {
            const i18nMetrics = [] as Array<{ label: Record<string, string>; value: Record<string, string> }>
            for (const m of st.metrics) {
              const labelBase = isNonEmptyString(m?.label) ? String(m.label).trim() : '';
              const valueBase = isNonEmptyString(m?.value) ? String(m.value).trim() : '';
              if (!labelBase && !valueBase) continue;
              const labelI18n = await localizeText(labelBase);
              let valueI18n: Record<string, string>;
              if (containsChinese(valueBase)) {
                valueI18n = await localizeText(valueBase);
              } else {
                valueI18n = { 'zh-CN': valueBase, 'zh-TW': valueBase, 'en': valueBase };
              }
              i18nMetrics.push({ label: labelI18n, value: valueI18n });
            }
            const before = JSON.stringify(st.metricsI18n ?? null);
            st.metricsI18n = i18nMetrics;
            if (!deepEqual(before, JSON.stringify(st.metricsI18n))) changes++;
          }

          next.categories[i].studies[j] = st;
        }
      }
    }
  }

  // meta bump
  next._meta = {
    ...(next._meta ?? {}),
    updatedAt: new Date().toISOString(),
    updatedBy: 'scripts/retranslate-cases-extras.ts',
  };

  if (deepEqual(config, next)) {
    console.log('没有检测到需要更新的额外字段，跳过。');
    await client.end();
    return;
  }

  await client.query('UPDATE site_configs SET value = $2 WHERE key = $1', [CASES_CONFIG_KEY, next]);
  console.log(`额外字段重翻译完成并已写入数据库。变更计数: ${changes}.`);

  await client.end();
}

main().catch((err) => {
  console.error('脚本运行错误:', err);
  process.exit(10);
});