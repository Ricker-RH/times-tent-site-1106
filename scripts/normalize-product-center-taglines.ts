import fs from "fs";
import path from "path";
import { Client } from "pg";
import { products_cards } from "@/data/configs";

function readDatabaseUrl(): string {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const raw = fs.readFileSync(envPath, "utf8");
    const m = raw.match(/^DATABASE_URL=(.+)$/m);
    if (m) {
      let url = m[1].trim();
      if ((url.startsWith('"') && url.endsWith('"')) || (url.startsWith("'") && url.endsWith("'"))) {
        url = url.slice(1, -1);
      }
      return url;
    }
  }
  return process.env.DATABASE_URL || "";
}

type Localized = Record<string, string>;

type ProductSource = {
  slug: string;
  name?: unknown;
  summary?: unknown;
  tagline?: unknown;
  image?: string;
};

function toSlugFromHref(href: string | undefined): string {
  if (!href) return "";
  const parts = href.split("/");
  return parts.pop() || "";
}

function isLocalizedObject(val: any): val is Localized {
  return val && typeof val === "object" && ("zh-CN" in val || "en" in val || "zh-TW" in val);
}

function cleanString(input: unknown): string {
  if (typeof input === "string") return input.trim();
  return "";
}

async function main() {
  const DATABASE_URL = readDatabaseUrl();
  if (!DATABASE_URL) throw new Error("Missing DATABASE_URL");
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  try {
    const res = await client.query("SELECT key, value FROM site_configs WHERE key = $1", ["产品中心"]);
    const row = res.rows[0];
    const value = row?.value ?? {};

    // Build fallback map from products_cards
    const fallbackBySlug = new Map<string, { name?: unknown; summary?: unknown; tagline?: unknown }>(
      products_cards.map((card: any) => [toSlugFromHref(card.href), { name: card.title, summary: card.description, tagline: card.tagline }]),
    );

    const sourceProducts: ProductSource[] = Array.isArray(value?.products) && value.products.length
      ? value.products.map((p: any) => ({ ...p }))
      : Array.from(fallbackBySlug.entries()).map(([slug, data]) => ({ slug, name: data.name, summary: data.summary, tagline: data.tagline }));

    let changes = 0;
    const updatedProducts = sourceProducts.map((p) => {
      const fallback = fallbackBySlug.get(p.slug) || {};
      const current = p.tagline;

      let next: Localized;
      if (!current || typeof current === "string") {
        const base = cleanString(current);
        const f = fallback.tagline as any;
        next = {
          "zh-CN": cleanString(f?.["zh-CN"]) || base,
          "en": p.slug === "arch-tent" ? "Hospitality · Exhibition Events" : (cleanString(f?.["en"]) || base),
          "zh-TW": cleanString(f?.["zh-TW"]) || base,
        };
      } else if (isLocalizedObject(current)) {
        const f = fallback.tagline as any;
        next = { ...current } as Localized;
        const filled: Array<keyof Localized> = ["zh-CN", "en", "zh-TW"];
        filled.forEach((key) => {
          const curVal = cleanString((current as any)[key]);
          if (!curVal) {
            const preferred = key === "en" && p.slug === "arch-tent" ? "Hospitality · Exhibition Events" : cleanString(f?.[key]);
            const fallbackVal = preferred || cleanString((current as any)["zh-CN"]) || cleanString((current as any)["zh-TW"]) || cleanString(current);
            (next as any)[key] = fallbackVal;
          }
        });
      } else {
        // Unknown shape, coerce to object using fallbacks
        const f = fallback.tagline as any;
        next = {
          "zh-CN": cleanString(f?.["zh-CN"]) || cleanString(current),
          "en": p.slug === "arch-tent" ? "Hospitality · Exhibition Events" : (cleanString(f?.["en"]) || cleanString(current)),
          "zh-TW": cleanString(f?.["zh-TW"]) || cleanString(current),
        };
      }

      const before = JSON.stringify(current);
      const after = JSON.stringify(next);
      if (before !== after) {
        changes++;
        return { ...p, tagline: next };
      }
      return p;
    });

    if (!changes) {
      console.log("[Normalize] No changes needed for 产品中心 taglines.");
      return;
    }

    const nextValue = { ...value, products: updatedProducts };
    await client.query("UPDATE site_configs SET value = $2 WHERE key = $1", ["产品中心", nextValue]);
    console.log(`[Normalize] Updated 产品中心 taglines for ${changes} product(s).`);
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});