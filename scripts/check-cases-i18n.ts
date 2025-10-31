import fs from "fs";
import path from "path";
import { Client } from "pg";

const CASES_CONFIG_KEY = "案例展示";
const REQUIRED_LOCALES = ["zh-CN", "zh-TW", "en"] as const;

type LocalizedRecord = Record<string, unknown>;

function readDatabaseUrl(): string {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const raw = fs.readFileSync(envPath, "utf8");
    const m = raw.match(/^DATABASE_URL=(.+)$/m);
    if (m) {
      let url = m[1].trim();
      if ((url.startsWith("\"") && url.endsWith("\"")) || (url.startsWith("'") && url.endsWith("'"))) {
        url = url.slice(1, -1);
      }
      return url;
    }
  }
  return process.env.DATABASE_URL || "";
}

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function auditLocalized(value: unknown, pathLabel: string, issues: string[]): void {
  if (typeof value === "string") {
    const s = value.trim();
    if (!s.length) {
      issues.push(`${pathLabel}: 为空字符串，需提供 ${REQUIRED_LOCALES.join("/")} 三语内容`);
    } else {
      issues.push(`${pathLabel}: 仅检测到单一语言字符串（需改为 { zh-CN, zh-TW, en } 结构）`);
    }
    return;
  }
  if (!isObject(value)) {
    issues.push(`${pathLabel}: 缺失或类型不正确（应为对象并包含 ${REQUIRED_LOCALES.join("/")} 键）`);
    return;
  }
  const record = value as LocalizedRecord;
  for (const locale of REQUIRED_LOCALES) {
    const raw = record[locale];
    if (typeof raw !== "string") {
      issues.push(`${pathLabel}.${locale}: 缺失该语言键或类型不是字符串`);
      continue;
    }
    const trimmed = raw.trim();
    if (!trimmed.length) {
      issues.push(`${pathLabel}.${locale}: 值为空，需补充翻译`);
    }
  }
}

async function main() {
  const DATABASE_URL = readDatabaseUrl();
  if (!DATABASE_URL) {
    console.error("缺少数据库连接字符串 DATABASE_URL。请在 .env.local 或环境变量中配置。");
    process.exit(1);
  }
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    const res = await client.query<{ value: unknown }>(
      "SELECT value FROM site_configs WHERE key = $1 LIMIT 1",
      [CASES_CONFIG_KEY]
    );
    if (!res.rows.length) {
      console.log(`未在数据库中找到 key='${CASES_CONFIG_KEY}' 的配置。`);
      process.exit(2);
    }
    const rawValue = res.rows[0].value;
    const config = isObject(rawValue) ? rawValue : (() => {
      if (typeof rawValue === "string") {
        try {
          return JSON.parse(rawValue);
        } catch {
          return null;
        }
      }
      return null;
    })();
    if (!isObject(config)) {
      console.error("site_configs.value 不是 JSON 对象，无法检查。");
      process.exit(3);
    }

    const issues: string[] = [];

    // categories
    const categoriesRaw = Array.isArray((config as any).categories) ? (config as any).categories : [];
    if (!categoriesRaw.length) {
      issues.push("categories: 缺失或为空，需至少提供一个分类并补充多语言内容");
    }
    categoriesRaw.forEach((cat: any, i: number) => {
      const prefix = `categories[${i}]`;
      auditLocalized(cat?.name, `${prefix}.name`, issues);
      auditLocalized(cat?.intro, `${prefix}.intro`, issues);
      const studiesRaw = Array.isArray(cat?.studies) ? cat.studies : [];
      if (!studiesRaw.length) {
        issues.push(`${prefix}.studies: 缺失或为空，建议至少提供一个案例`);
      }
      studiesRaw.forEach((st: any, j: number) => {
        const sp = `${prefix}.studies[${j}]`;
        auditLocalized(st?.title, `${sp}.title`, issues);
        auditLocalized(st?.summary, `${sp}.summary`, issues);
        auditLocalized(st?.background, `${sp}.background`, issues);
      });
    });

    // hero
    if (isObject((config as any).hero)) {
      const hero = (config as any).hero;
      auditLocalized(hero?.eyebrow, 'hero.eyebrow', issues);
      auditLocalized(hero?.title, 'hero.title', issues);
      auditLocalized(hero?.description, 'hero.description', issues);
    } else {
      issues.push('hero: 缺失或类型错误，应为对象并包含 eyebrow/title/description 三语字段');
    }

    // meta note
    const meta = isObject((config as any)._meta) ? (config as any)._meta : null;
    const updatedAt = meta && typeof meta.updatedAt === "string" ? meta.updatedAt : undefined;

    if (issues.length) {
      console.log("\u274c 数据库案例配置多语言检查发现以下问题：\n");
      issues.forEach((msg) => console.log(`- ${msg}`));
      console.log("\n提示：上述字段应以 { zh-CN, zh-TW, en } 结构存储，并确保值非空。");
      if (updatedAt) console.log(`\n最近更新时间: ${updatedAt}`);
      process.exitCode = 1;
    } else {
      console.log("\u2705 数据库中的案例配置已覆盖所有支持语言，未发现缺失。");
      if (updatedAt) console.log(`最近更新时间: ${updatedAt}`);
    }
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});