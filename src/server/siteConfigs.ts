import "server-only";

import type { AdminRole } from "./auth";
import { query, withTransaction } from "./db";
import type { FooterConfig } from "@/types/footer";
import type { NavigationConfig, NavigationLink } from "@/types/navigation";
import type { VideosConfig } from "@/types/videos";
import { navigation_config, products_cards, cases_config, inventory_config } from "@/data/configs";
import { VISIBILITY_CONFIG_KEY } from "@/constants/visibility";
import { createDefaultVisibilityConfig } from "@/lib/visibilityConfig";
import type { ProductCenterConfig, InventoryConfig } from "./pageConfigs";
import type { JsonValue } from "./siteConfigHistory";
import { diffJsonValues, recordSiteConfigHistory } from "./siteConfigHistory";
import { t } from "@/data";

import { promises as fs } from "fs";
import path from "path";

// 本地存储回退：当未配置 DATABASE_URL 时，读写项目根目录下的 .local/site-configs.json
function hasDb(): boolean {
  return typeof process.env.DATABASE_URL === "string" && process.env.DATABASE_URL.trim().length > 0;
}
const LOCAL_STORE_DIR = path.join(process.cwd(), ".local");
const LOCAL_STORE_FILE = path.join(LOCAL_STORE_DIR, "site-configs.json");

async function ensureLocalStore(): Promise<void> {
  try {
    await fs.mkdir(LOCAL_STORE_DIR, { recursive: true });
  } catch {}
  try {
    await fs.access(LOCAL_STORE_FILE);
  } catch {
    await fs.writeFile(LOCAL_STORE_FILE, "{}", "utf8");
  }
}

async function readLocalConfigs(): Promise<Record<string, unknown>> {
  try {
    await ensureLocalStore();
    const raw = await fs.readFile(LOCAL_STORE_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

async function writeLocalConfigs(configs: Record<string, unknown>): Promise<void> {
  await ensureLocalStore();
  const content = JSON.stringify(configs, null, 2);
  await fs.writeFile(LOCAL_STORE_FILE, content, "utf8");
}

type SiteConfigRow<T> = {
  value: T;
};

export async function getSiteConfig<T = unknown>(key: string): Promise<T | null> {
  // 本地文件回退
  if (!hasDb()) {
    const store = await readLocalConfigs();
    const value = store[key];
    return typeof value === "undefined" ? null : (value as T);
  }
  try {
    const { rows } = await query<SiteConfigRow<T>>(
      `SELECT value FROM site_configs WHERE key = $1 LIMIT 1`,
      [key],
    );

    if (!rows.length) {
      return null;
    }

    return rows[0].value;
  } catch {
    return null;
  }
}

const VIDEOS_CONFIG_KEY = "视频库";
const NAVIGATION_CONFIG_KEY = "导航栏";
const FOOTER_CONFIG_KEY = "尾页";

type CasesConfigStored = typeof cases_config;

export async function getVideosConfig(): Promise<VideosConfig | null> {
  const config = await getSiteConfig<VideosConfig>(VIDEOS_CONFIG_KEY);
  return config;
}

export async function getNavigationConfig(): Promise<NavigationConfig | null> {
  const [storedConfig, productCenterRaw, casesRaw, inventoryRaw] = await Promise.all([
    getSiteConfig<NavigationConfig>(NAVIGATION_CONFIG_KEY),
    getSiteConfig<ProductCenterConfig>("产品中心"),
    getSiteConfig<CasesConfigStored>("案例展示"),
    getSiteConfig<InventoryConfig>("现货库存"),
  ]);

  const baseConfig: NavigationConfig = storedConfig
    ? JSON.parse(JSON.stringify(storedConfig))
    : JSON.parse(JSON.stringify(navigation_config)) as NavigationConfig;

  if (!baseConfig.groups?.length) {
    return baseConfig;
  }

  const mainGroup = baseConfig.groups.find((group) => group.key === "main") ?? baseConfig.groups[0];
  if (!mainGroup || !Array.isArray(mainGroup.links)) {
    return baseConfig;
  }

  const productsSource = Array.isArray(productCenterRaw?.products) && productCenterRaw?.products.length
    ? productCenterRaw.products
    : products_cards.map((card) => ({
        slug: card.href.split("/").pop() ?? "",
        name: card.title,
      }));

  const productsChildren: NavigationLink[] = productsSource
    .map((product, index) => {
      const slug = typeof product?.slug === "string" && product.slug ? product.slug : `product-${index + 1}`;
      const nameVal = product?.name as unknown;
      const labelZhCN = typeof nameVal === "string" && nameVal ? (nameVal as string) : (t(nameVal as Record<string, string | undefined>, "zh-CN") || slug);
      const labelZhTW = typeof nameVal === "string" && nameVal ? (nameVal as string) : (t(nameVal as Record<string, string | undefined>, "zh-TW") || slug);
      const labelEn = typeof nameVal === "string" && nameVal ? (nameVal as string) : (t(nameVal as Record<string, string | undefined>, "en") || slug);
      return {
        slug: `products-${slug}`,
        href: `/products/${slug}`,
        label: {
          "zh-CN": labelZhCN,
          "zh-TW": labelZhTW,
          en: labelEn,
        },
      } satisfies NavigationLink;
    });

  const nextLinks = [...mainGroup.links];

  const productLinkIndex = mainGroup.links.findIndex((link) => link.slug === "products" || link.href === "/products");
  if (productLinkIndex !== -1) {
    const existingLink = { ...nextLinks[productLinkIndex] };
    existingLink.children = productsChildren;
    nextLinks[productLinkIndex] = existingLink;
  }

  const casesSource = Array.isArray(casesRaw?.categories) && casesRaw?.categories.length
    ? casesRaw.categories
    : cases_config.categories;

  const caseChildren: NavigationLink[] = casesSource
    .map((category, index) => {
      const slug = typeof category?.slug === "string" && category.slug ? category.slug : `cases-${index + 1}`;
      const nameVal = category?.name as unknown;
      const labelZhCN = typeof nameVal === "string" && nameVal ? (nameVal as string) : (t(nameVal as Record<string, string | undefined>, "zh-CN") || slug);
      const labelZhTW = typeof nameVal === "string" && nameVal ? (nameVal as string) : (t(nameVal as Record<string, string | undefined>, "zh-TW") || slug);
      const labelEn = typeof nameVal === "string" && nameVal ? (nameVal as string) : (t(nameVal as Record<string, string | undefined>, "en") || slug);
      return {
        slug: `cases-${slug}`,
        href: `/cases/${slug}`,
        label: {
          "zh-CN": labelZhCN,
          "zh-TW": labelZhTW,
          en: labelEn,
        },
      } satisfies NavigationLink;
    });

  const caseLinkIndex = mainGroup.links.findIndex((link) => link.slug === "cases" || link.href === "/cases");
  if (caseLinkIndex !== -1) {
    const existingLink = { ...nextLinks[caseLinkIndex] };
    existingLink.href = caseChildren.length ? caseChildren[0].href : "/cases";
    existingLink.children = caseChildren;
    nextLinks[caseLinkIndex] = existingLink;
  }

  const inventorySectionsSource = Array.isArray(inventoryRaw?.showcaseSections) && inventoryRaw!.showcaseSections!.length
    ? inventoryRaw!.showcaseSections!
    : inventory_config.showcaseSections ?? [];

  const inventoryChildren: NavigationLink[] = inventorySectionsSource.map((section, index) => {
    const id = typeof section?.id === "string" && section.id.trim() ? section.id.trim() : `section-${index + 1}`;
    const titleVal = section?.title as unknown;
    const labelZhCN = typeof titleVal === "string" && titleVal
      ? titleVal
      : (t(titleVal as Record<string, string | undefined>, "zh-CN") || id);
    const labelZhTW = typeof titleVal === "string" && titleVal
      ? titleVal
      : (t(titleVal as Record<string, string | undefined>, "zh-TW") || id);
    const labelEn = typeof titleVal === "string" && titleVal
      ? titleVal
      : (t(titleVal as Record<string, string | undefined>, "en") || id);
    return {
      slug: `inventory-${id}`,
      href: `/inventory#${id}`,
      label: {
        "zh-CN": labelZhCN,
        "zh-TW": labelZhTW,
        en: labelEn,
      },
    } satisfies NavigationLink;
  });

  const inventoryLinkIndex = mainGroup.links.findIndex(
    (link) => link.slug === "inventory" || (typeof link.href === "string" && link.href.startsWith("/inventory")),
  );
  if (inventoryLinkIndex !== -1) {
    const inventoryLink = { ...nextLinks[inventoryLinkIndex] };
    // 主导航始终跳转到页面顶部，不携带锚点
    inventoryLink.href = "/inventory";
    if (inventoryChildren.length) {
      inventoryLink.children = inventoryChildren;
    }
    nextLinks[inventoryLinkIndex] = inventoryLink;
  }

  mainGroup.links = nextLinks;

  return baseConfig;
}

export async function getFooterConfig(): Promise<FooterConfig | null> {
  return getSiteConfig<FooterConfig>(FOOTER_CONFIG_KEY);
}

type RawSiteConfigRow = {
  key: string;
  value: unknown;
};

function parseRowValue(raw: unknown): unknown {
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch (error) {
      console.error("Failed to parse site config JSON", error);
      return null;
    }
  }
  if (raw && typeof raw === "object") {
    return raw;
  }
  return null;
}

export interface SiteConfigSummary {
  key: string;
  title?: string;
  updatedAt?: string;
  adminPath?: string;
}

export async function listSiteConfigSummaries(): Promise<SiteConfigSummary[]> {
  // 本地文件回退
  if (!hasDb()) {
    const store = await readLocalConfigs();
    const keys = Object.keys(store);
    const summaries: SiteConfigSummary[] = keys.map((key) => {
      const parsed = parseRowValue(store[key]) as Record<string, unknown> | null;
      const meta = parsed && typeof (parsed as Record<string, unknown> & { _meta?: unknown })._meta === "object"
        ? ((parsed as Record<string, unknown> & { _meta?: Record<string, unknown> })._meta ?? null)
        : null;
      const hero = parsed && typeof (parsed as Record<string, unknown> & { hero?: unknown }).hero === "object"
        ? ((parsed as Record<string, unknown> & { hero?: Record<string, unknown> }).hero ?? null)
        : null;

      const heroTitle = hero && typeof (hero as Record<string, unknown>).title !== "undefined"
        ? (hero as Record<string, unknown>).title
        : undefined;

      let resolvedTitle: string | undefined;
      if (typeof heroTitle === "string") {
        resolvedTitle = heroTitle;
      } else if (heroTitle && typeof heroTitle === "object") {
        const zh = (heroTitle as Record<string, unknown>)["zh-CN"];
        const en = (heroTitle as Record<string, unknown>)["en"];
        resolvedTitle = typeof zh === "string" ? zh : typeof en === "string" ? en : undefined;
      }

      const updatedAt = meta && typeof meta.updatedAt === "string" ? meta.updatedAt : undefined;
      const adminPath = meta && typeof meta.adminPath === "string" ? meta.adminPath : undefined;

      return {
        key,
        title: resolvedTitle,
        updatedAt,
        adminPath,
      } satisfies SiteConfigSummary;
    });

    if (!summaries.some((summary) => summary.key === VISIBILITY_CONFIG_KEY)) {
      const fallback = createDefaultVisibilityConfig();
      const meta = fallback._meta ?? {};
      summaries.push({
        key: VISIBILITY_CONFIG_KEY,
        title: "页面可见性",
        updatedAt: typeof meta.updatedAt === "string" ? meta.updatedAt : undefined,
        adminPath: typeof meta.adminPath === "string" ? meta.adminPath : undefined,
      });
    }

    return summaries;
  }
  const { rows } = await query<RawSiteConfigRow>(
    `SELECT key, value FROM site_configs ORDER BY key ASC`,
  );

  const summaries = rows.map((row) => {
    const parsed = parseRowValue(row.value) as Record<string, unknown> | null;
    const meta = parsed && typeof (parsed as Record<string, unknown> & { _meta?: unknown })._meta === "object"
      ? ((parsed as Record<string, unknown> & { _meta?: Record<string, unknown> })._meta ?? null)
      : null;
    const hero = parsed && typeof (parsed as Record<string, unknown> & { hero?: unknown }).hero === "object"
      ? ((parsed as Record<string, unknown> & { hero?: Record<string, unknown> }).hero ?? null)
      : null;

    const heroTitle = hero && typeof (hero as Record<string, unknown>).title !== "undefined"
      ? (hero as Record<string, unknown>).title
      : undefined;

    let resolvedTitle: string | undefined;
    if (typeof heroTitle === "string") {
      resolvedTitle = heroTitle;
    } else if (heroTitle && typeof heroTitle === "object") {
      const zh = (heroTitle as Record<string, unknown>)["zh-CN"];
      const en = (heroTitle as Record<string, unknown>)["en"];
      resolvedTitle = typeof zh === "string" ? zh : typeof en === "string" ? en : undefined;
    }

    const updatedAt = meta && typeof meta.updatedAt === "string" ? meta.updatedAt : undefined;
    const adminPath = meta && typeof meta.adminPath === "string" ? meta.adminPath : undefined;

    return {
      key: row.key,
      title: resolvedTitle,
      updatedAt,
      adminPath,
    } satisfies SiteConfigSummary;
  });

  if (!summaries.some((summary) => summary.key === VISIBILITY_CONFIG_KEY)) {
    const fallback = createDefaultVisibilityConfig();
    const meta = fallback._meta ?? {};
    summaries.push({
      key: VISIBILITY_CONFIG_KEY,
      title: "页面可见性",
      updatedAt: typeof meta.updatedAt === "string" ? meta.updatedAt : undefined,
      adminPath: typeof meta.adminPath === "string" ? meta.adminPath : undefined,
    });
  }

  return summaries;
}

export async function getSiteConfigRaw(key: string): Promise<unknown | null> {
  // 本地文件回退
  if (!hasDb()) {
    const store = await readLocalConfigs();
    if (!(key in store)) {
      return null;
    }
    return parseRowValue(store[key]);
  }
  try {
    const { rows } = await query<RawSiteConfigRow>(
      `SELECT key, value FROM site_configs WHERE key = $1 LIMIT 1`,
      [key],
    );

    if (!rows.length) {
      return null;
    }

    return parseRowValue(rows[0].value);
  } catch {
    return null;
  }
}

export interface SaveSiteConfigActor {
  id?: string | null;
  username?: string | null;
  email?: string | null;
  role?: AdminRole | string | null;
}

export interface SaveSiteConfigOptions {
  actor?: SaveSiteConfigActor;
  sourcePath?: string;
  note?: string;
  action?: string;
  skipHistory?: boolean;
}

function normaliseJsonValue(value: unknown): JsonValue {
  return JSON.parse(JSON.stringify(value)) as JsonValue;
}

export async function saveSiteConfig(key: string, value: unknown, options?: SaveSiteConfigOptions): Promise<void> {
  const trimmedKey = key.trim();
  const nextValue = normaliseJsonValue(value ?? {});

  // 本地文件回退
  if (!hasDb()) {
    const store = await readLocalConfigs();
    const previousValue = (store[trimmedKey] ?? null) as JsonValue | null;
    store[trimmedKey] = nextValue;
    await writeLocalConfigs(store);
    // 无数据库时不记录历史；直接返回成功
    return;
  }

  // 数据库路径：失败则回退到本地文件
  try {
    await withTransaction(async (client) => {
      const previousResult = await client.query<{ value: JsonValue }>(
        `SELECT value FROM site_configs WHERE key = $1 LIMIT 1`,
        [trimmedKey],
      );
      const previousValue = previousResult.rows.length ? (previousResult.rows[0].value as JsonValue) : null;

      await client.query(
        `INSERT INTO site_configs (key, value)
         VALUES ($1, $2::jsonb)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [trimmedKey, JSON.stringify(nextValue)],
      );

      if (options?.skipHistory) {
        return;
      }

      const diff = diffJsonValues(previousValue, nextValue);

      if (diff.length === 0 && previousValue !== null) {
        return;
      }

      await recordSiteConfigHistory({
        client,
        key: trimmedKey,
        previousValue,
        nextValue,
        diff,
        action: options?.action ?? "update",
        actorId: options?.actor?.id ?? null,
        actorUsername: options?.actor?.username ?? null,
        actorEmail: options?.actor?.email ?? null,
        actorRole: options?.actor?.role ?? null,
        sourcePath: options?.sourcePath ?? null,
        note: options?.note ?? null,
      });
    });
  } catch {
    // 数据库保存失败（权限/连接/表缺失等），回退到本地文件以保证开发环境可用
    const store = await readLocalConfigs();
    store[trimmedKey] = nextValue;
    await writeLocalConfigs(store);
  }
}
