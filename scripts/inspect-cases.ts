/**
 * Inspect Cases Config (site_configs key: "案例展示").
 * Prints summary: category count, per-category name/intro tri-locale status,
 * and studies count with per-study title/summary/background samples.
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

function parseConfigValue(raw: unknown): any | null {
  if (!raw) return null;
  if (typeof raw === 'object') return raw as any;
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return null; }
  }
  return null;
}

function sampleText(v: unknown): string {
  const s = typeof v === 'string' ? v : (typeof v === 'number' ? String(v) : '');
  const t = s.trim();
  return t.length > 80 ? t.slice(0, 77) + '...' : t;
}

function triLocaleStatus(obj: any, field: string) {
  const val = obj?.[field];
  const status = REQUIRED_LOCALES.map((loc) => {
    const v = isObject(val) ? val[loc] : undefined;
    const ok = typeof v === 'string' && v.trim().length > 0;
    return `${loc}:${ok ? '✓' : '✗'}`;
  }).join(' ');
  return status;
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

  const config = parseConfigValue(rows[0].value);
  if (!isObject(config)) {
    console.error('site_configs.value 不是 JSON 对象，无法检查。');
    await client.end();
    process.exit(3);
  }

  // hero summary
  const hero = (config as any).hero;
  console.log('Hero 三语状态:');
  if (isObject(hero)) {
    const eyebrowRec = hero?.eyebrow as Record<string, string> | undefined;
    const titleRec = hero?.title as Record<string, string> | undefined;
    const descRec = hero?.description as Record<string, string> | undefined;

    console.log(`  eyebrow 状态: ${triLocaleStatus(hero, 'eyebrow')}`);
    console.log(`    zh-CN: ${sampleText(eyebrowRec?.['zh-CN'] || '')}`);
    console.log(`    zh-TW: ${sampleText(eyebrowRec?.['zh-TW'] || '')}`);
    console.log(`    en   : ${sampleText(eyebrowRec?.['en'] || '')}`);
    console.log(`  title 状态: ${triLocaleStatus(hero, 'title')}`);
    console.log(`    zh-CN: ${sampleText(titleRec?.['zh-CN'] || '')}`);
    console.log(`    zh-TW: ${sampleText(titleRec?.['zh-TW'] || '')}`);
    console.log(`    en   : ${sampleText(titleRec?.['en'] || '')}`);
    console.log(`  description 状态: ${triLocaleStatus(hero, 'description')}`);
    console.log(`    zh-CN: ${sampleText(descRec?.['zh-CN'] || '')}`);
    console.log(`    zh-TW: ${sampleText(descRec?.['zh-TW'] || '')}`);
    console.log(`    en   : ${sampleText(descRec?.['en'] || '')}`);
  } else {
    console.log('  hero 缺失或类型错误（应为对象）');
  }

  const categories = Array.isArray((config as any).categories) ? (config as any).categories : [];
  console.log(`\n分类总数: ${categories.length}`);

  categories.forEach((cat: any, i: number) => {
    const slug = typeof cat?.slug === 'string' ? cat.slug : `cat-${i+1}`;
    console.log(`\n[Category ${i+1}] slug=${slug}`);
    console.log(`  name 状态: ${triLocaleStatus(cat, 'name')}`);
    console.log(`    zh-CN: ${sampleText(cat?.name?.['zh-CN'])}`);
    console.log(`    zh-TW: ${sampleText(cat?.name?.['zh-TW'])}`);
    console.log(`    en   : ${sampleText(cat?.name?.['en'])}`);
    console.log(`  intro 状态: ${triLocaleStatus(cat, 'intro')}`);
    console.log(`    zh-CN: ${sampleText(cat?.intro?.['zh-CN'])}`);
    console.log(`    zh-TW: ${sampleText(cat?.intro?.['zh-TW'])}`);
    console.log(`    en   : ${sampleText(cat?.intro?.['en'])}`);

    const studies = Array.isArray(cat?.studies) ? cat.studies : [];
    console.log(`  studies 数量: ${studies.length}`);
    studies.slice(0, 3).forEach((st: any, j: number) => {
      const slug2 = typeof st?.slug === 'string' ? st.slug : `study-${j+1}`;
      console.log(`    [Study ${j+1}] slug=${slug2}`);
      console.log(`      title 状态: ${triLocaleStatus(st, 'title')}`);
      console.log(`        zh-CN: ${sampleText(st?.title?.['zh-CN'])}`);
      console.log(`        zh-TW: ${sampleText(st?.title?.['zh-TW'])}`);
      console.log(`        en   : ${sampleText(st?.title?.['en'])}`);
      console.log(`      summary 状态: ${triLocaleStatus(st, 'summary')}`);
      console.log(`        zh-CN: ${sampleText(st?.summary?.['zh-CN'])}`);
      console.log(`        zh-TW: ${sampleText(st?.summary?.['zh-TW'])}`);
      console.log(`        en   : ${sampleText(st?.summary?.['en'])}`);
      console.log(`      background 状态: ${triLocaleStatus(st, 'background')}`);
      console.log(`        zh-CN: ${sampleText(st?.background?.['zh-CN'])}`);
      console.log(`        zh-TW: ${sampleText(st?.background?.['zh-TW'])}`);
      console.log(`        en   : ${sampleText(st?.background?.['en'])}`);
    });
  });

  const updatedAt = isObject((config as any)._meta) && typeof (config as any)._meta.updatedAt === 'string'
    ? (config as any)._meta.updatedAt : undefined;
  if (updatedAt) console.log(`\n最近更新时间: ${updatedAt}`);

  await client.end();
}

main().catch((e) => {
  console.error('inspect 错误:', e);
  process.exit(1);
});