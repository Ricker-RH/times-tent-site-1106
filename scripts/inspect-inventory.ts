import fs from "fs";
import path from "path";
import { Client } from "pg";

const INVENTORY_CONFIG_KEY = "现货库存";
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

function parseConfigValue(raw: unknown): any | null {
  if (!raw) return null;
  if (typeof raw === "object") return raw as any;
  if (typeof raw === "string") {
    try { return JSON.parse(raw); } catch { return null; }
  }
  return null;
}

function sampleText(text: string | undefined): string {
  const t = (text || "").trim();
  if (!t) return "(空)";
  return t.length > 36 ? `${t.slice(0, 36)}…` : t;
}

function localeStatus(rec: LocalizedRecord | undefined): string {
  if (!rec || !isObject(rec)) return "缺对象";
  const values = REQUIRED_LOCALES.map((lc) => {
    const v = rec[lc];
    const s = typeof v === "string" ? (v as string).trim() : "";
    return s ? 1 : 0;
  });
  const sum = values.reduce<number>((a, b) => a + b, 0);
  if (sum === 0) return "全部为空";
  if (sum === REQUIRED_LOCALES.length) return "三语完整";
  return `部分为空 (${sum}/${REQUIRED_LOCALES.length})`;
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
    const res = await client.query<{ key: string; value: unknown }>(
      "SELECT key, value FROM site_configs WHERE key = $1 LIMIT 1",
      [INVENTORY_CONFIG_KEY]
    );
    if (!res.rows.length) {
      console.error(`未在数据库中找到 key='${INVENTORY_CONFIG_KEY}' 的配置。`);
      process.exit(2);
    }

    const config = parseConfigValue(res.rows[0].value);
    if (!isObject(config)) {
      console.error("site_configs.value 不是 JSON 对象，无法检查。");
      process.exit(3);
    }

    console.log("[现货库存·基本信息]");
    const meta = isObject((config as any)._meta) ? (config as any)._meta : {};
    console.log("  schema:", (meta as any).schema || "(未知)");

    // Hero 部分
    const hero = (config as any).hero;
    console.log("\n[Hero 字段状态]");
    if (isObject(hero)) {
      const eyebrowRec = hero?.eyebrow as LocalizedRecord | undefined;
      const titleRec = hero?.title as LocalizedRecord | undefined;
      const descRec = hero?.description as LocalizedRecord | undefined;
      console.log("  eyebrow:", localeStatus(eyebrowRec));
      console.log("    zh-CN:", sampleText((eyebrowRec?.["zh-CN"] as string) || ""));
      console.log("    zh-TW:", sampleText((eyebrowRec?.["zh-TW"] as string) || ""));
      console.log("    en   :", sampleText((eyebrowRec?.["en"] as string) || ""));
      console.log("  title  :", localeStatus(titleRec));
      console.log("  desc   :", localeStatus(descRec));

      const badges = Array.isArray(hero?.badges) ? (hero.badges as any[]) : [];
      console.log(`  badges 数量: ${badges.length}`);
      badges.forEach((b, i) => {
        const rec = isObject(b) ? b : undefined;
        console.log(`    [${i}]`, localeStatus(rec));
      });
    } else {
      console.log("  (缺少 hero 对象)");
    }

    // 展示板块
    const sections = Array.isArray((config as any).showcaseSections) ? (config as any).showcaseSections : [];
    console.log("\n[展示板块·showcaseSections]");
    console.log(`  板块数量: ${sections.length}`);
    sections.forEach((s: any, idx: number) => {
      const id = (s?.id || `section-${idx}`) as string;
      console.log(`  - ${id}`);
      console.log("    title  :", localeStatus(s?.title));
      console.log("    summary:", localeStatus(s?.summary));
      console.log("    contact:", localeStatus(s?.contact));
      const mp = s?.mainPoster || {};
      console.log("    mainPoster.title:", localeStatus(mp?.title));
      const gallery = Array.isArray(s?.gallery) ? s.gallery : [];
      console.log(`    gallery 数量: ${gallery.length}`);
      gallery.forEach((g: any, gi: number) => {
        console.log(`      [${gi}] title:`, localeStatus(g?.title));
      });
    });

    // items.tags（如果存在）
    const items = Array.isArray((config as any).items) ? (config as any).items : [];
    console.log("\n[库存条目·items]");
    console.log(`  items 数量: ${items.length}`);
    items.slice(0, 8).forEach((item: any, idx: number) => {
      const nameRec = item?.name as LocalizedRecord | undefined;
      const tags = Array.isArray(item?.tags) ? item.tags : [];
      console.log(`  - item[${idx}] name:`, sampleText((nameRec?.["zh-CN"] as string) || item?.id || ""));
      console.log(`    tags 数量: ${tags.length}`);
      tags.forEach((t: any, ti: number) => {
        console.log(`      [${ti}]`, localeStatus(t));
      });
    });

    // 专项风险提示：检查是否存在“置空后数组项被删”的迹象
    console.log("\n[风险扫描]");
    const badgeCount = Array.isArray(hero?.badges) ? hero.badges.length : 0;
    const sectionCount = Array.isArray(sections) ? sections.length : 0;
    const itemsCount = Array.isArray(items) ? items.length : 0;
    console.log("  hero.badges 当前数量:", badgeCount);
    console.log("  showcaseSections 当前数量:", sectionCount);
    console.log("  items 当前数量:", itemsCount);
    console.log("  说明: 若在后台将某语言文案置为空字符串，理论上键应保留；数组项也不应被删除。若数量异常缩减，说明存在删除逻辑或序列化过滤问题。");

  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("执行失败:", err);
  process.exit(10);
});
