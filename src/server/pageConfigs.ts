import "server-only";

import {
  about_config,
  cases_config,
  contact_config,
  inventory_config,
  news_config,
  product_details,
} from "@/data/configs";
import {
  FALLBACK_HOME_CONFIG,
  FALLBACK_PRIVACY_POLICY_CONFIG,
  FALLBACK_PRODUCT_CENTER_CONFIG,
  FALLBACK_RIGHT_RAIL_CONFIG,
  FALLBACK_TERMS_CONFIG,
} from "@/constants/siteFallbacks";
import { t } from "@/data";
import type { LocalizedField } from "@/i18n/locales";
import type { ProductDetailConfigMap } from "@/types/productDetails";
import { normalizeProductDetailMap } from "@/types/productDetails";

import { getSiteConfig } from "./siteConfigs";
import { getRequestLocale } from "@/server/locale";

export type CasesConfig = (typeof cases_config) & {
  breadcrumbI18n?: Array<{ href?: string; label?: string | LocalizedField }>;
};
export type InventoryConfig = typeof inventory_config;
export type NewsConfig = typeof news_config;
export type AboutConfig = typeof about_config;
export type ContactConfig = typeof contact_config;
type ProductDetailMap = ProductDetailConfigMap;

export type CaseCategory = CasesConfig["categories"][number];
export type CaseStudy = CaseCategory["studies"][number] & {
  backgroundHeading?: string | LocalizedField;
  bodyBlocks?: Array<{ title?: string | LocalizedField; subtitle?: string | LocalizedField }>;
  deliverablesHeading?: string | LocalizedField;
  highlightsI18n?: Array<string | LocalizedField>;
  deliverablesI18n?: Array<string | LocalizedField>;
  metricsI18n?: Array<{ label: string | LocalizedField; value: string | LocalizedField }>;
  technicalSection?: {
    title?: string;
    subtitle?: string;
    columns?: string[] | readonly string[];
    rows?: string[][] | ReadonlyArray<ReadonlyArray<string>>;
  };
  heroOverlayEnabled?: boolean;
};

export interface ProductCenterProduct {
  slug: string;
  name: string | LocalizedField;
  nameEn?: string;
  image?: string;
  summary?: string | LocalizedField;
  summaryEn?: string;
  tagline?: string | LocalizedField;
  taglineEn?: string;
  specs?: Array<{ label: string; value: string }>;
  specsEn?: Array<{ label: string; value: string }>;
  gallery?: string[];
}

export interface ProductCenterConfig {
  hero?: {
    image?: string;
    title?: string | LocalizedField;
    titleEn?: string;
    eyebrow?: string | LocalizedField;
    eyebrowEn?: string;
    description?: string | LocalizedField;
    descriptionEn?: string;
    overlayEnabled?: boolean;
  };

  products: ProductCenterProduct[];
  breadcrumb?: Array<{ href?: string; label: string }>;
  sidebarTitle?: string | LocalizedField;
  productCardCtaLabel?: string | LocalizedField;
  _meta?: Record<string, unknown>;
}

export interface HomeConfig {
  hero?: {
    badge?: string | LocalizedField | null;
    badgeEn?: string; // legacy
    title?: string | LocalizedField;
    titleEn?: string; // legacy
    description?: string | LocalizedField;
    descriptionEn?: string; // legacy
    overlayEnabled?: boolean;
    ctaPrimary?: string | LocalizedField;
    ctaPrimaryEn?: string; // legacy
    ctaPrimaryHref?: string;
    ctaSecondary?: string | LocalizedField;
    ctaSecondaryEn?: string; // legacy
    ctaSecondaryHref?: string;
    slides?: Array<{
      caseRef?: { slug?: string; category?: string };
      href?: string;
      imageOverride?: { src?: string };
      eyebrowOverride?: string | LocalizedField;
      highlightsOverride?: string[];
      highlightsOverrideI18n?: Array<string | LocalizedField>;
    }>;
  };
  companyOverview?: {
    hero?: {
      title?: string | LocalizedField;
      titleEn?: string; // legacy
      secondary?: string | LocalizedField;
      secondaryEn?: string; // legacy
      description?: string | LocalizedField;
      descriptionEn?: string; // legacy
      image?: string;
    };
    stats?: Array<{ label?: string | LocalizedField; labelEn?: string; value?: string }>;
    serviceHighlights?: Array<{
      title?: string | LocalizedField;
      titleEn?: string; // legacy
      description?: string | LocalizedField;
      descriptionEn?: string; // legacy
      subtitle?: string | LocalizedField;
      subtitleEn?: string; // legacy
    }>;
    capabilities?: Array<{
      title?: string | LocalizedField;
      titleEn?: string; // legacy
      description?: string | LocalizedField;
      descriptionEn?: string; // legacy
      subtitle?: string | LocalizedField;
      subtitleEn?: string; // legacy
      image?: string;
      imageEn?: string; // legacy
    }>;
    gallery?: Array<{ image?: string; label?: string | LocalizedField; labelEn?: string }>;
    title?: string | LocalizedField;
    titleEn?: string; // legacy
    capabilityHeading?: string | LocalizedField;
    capabilityHeadingEn?: string; // legacy
  };
  productShowcase?: {
    heading?: string | LocalizedField;
    headingEn?: string; // legacy
    description?: string | LocalizedField;
    descriptionEn?: string; // legacy
    cardCtaLabel?: string | LocalizedField;
    cardCtaLabelEn?: string; // legacy
    selectedProductSlugs?: string[];
    cards?: Array<{
      productSlug?: string;
      nameOverride?: string | LocalizedField;
      nameEnOverride?: string; // legacy
      imageOverride?: string;
      summaryOverride?: string | LocalizedField;
      summaryEnOverride?: string; // legacy
    }>;
  };
  applicationAreas?: {
    heading?: string | LocalizedField;
    headingEn?: string; // legacy
    description?: string | LocalizedField;
    descriptionEn?: string; // legacy
    actionLabel?: string | LocalizedField;
    actionLabelEn?: string; // legacy
    overlayEnabled?: boolean;
    selectedCategorySlugs?: string[];
    items?: Array<{
      areaKey?: string;
      nameOverride?: string | LocalizedField;
      nameEnOverride?: string;
      descriptionOverride?: string | LocalizedField;
      descriptionEnOverride?: string;
      imageOverride?: string;
      highlightOverride?: string | LocalizedField;
      highlightEnOverride?: string;
    }>;
  };
  inventoryHighlight?: {
    heading?: string | LocalizedField;
    headingEn?: string;
    description?: string | LocalizedField;
    descriptionEn?: string;
    heroImage?: string;
    ctas?: Array<{ href: string; label: string | LocalizedField; labelEn?: string }>;
  };
  contactCta?: {
    eyebrow?: string | LocalizedField;
    eyebrowEn?: string; // legacy
    title?: string | LocalizedField;
    titleEn?: string; // legacy
    description?: string | LocalizedField;
    descriptionEn?: string; // legacy
    primary?: { href?: string; label?: string | LocalizedField; labelEn?: string };
    secondary?: { href?: string; label?: string | LocalizedField; labelEn?: string };
  };
  _meta?: Record<string, unknown>;
}

const HOME_CONFIG_KEY = "首页";
const CASES_CONFIG_KEY = "案例展示";
const INVENTORY_CONFIG_KEY = "现货库存";
const NEWS_CONFIG_KEY = "新闻中心";
const ABOUT_CONFIG_KEY = "关于时代";
const CONTACT_CONFIG_KEY = "联系方式";
const PRODUCT_CENTER_CONFIG_KEY = "产品中心";
const PRODUCT_DETAIL_CONFIG_KEY = "产品详情";
const PRIVACY_CONFIG_KEY = "隐私政策";
const TERMS_CONFIG_KEY = "服务条款";
const RIGHT_RAIL_CONFIG_KEY = "右侧小按钮";

export interface PolicySectionItem {
  title?: string;
  body: string;
}

export interface PolicySection {
  id?: string;
  heading?: string;
  paragraphs?: string[];
  items?: PolicySectionItem[];
  paragraphsAfter?: string[];
}

export interface PrivacyPolicyConfig {
  title?: string | LocalizedField;
  intro?: {
    lastUpdated?: string;
    body?: string;
  };
  sections?: PolicySection[];
  contact?: {
    heading?: string;
    paragraph?: string;
    company?: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  _meta?: Record<string, unknown>;
}

export interface TermsSection {
  id?: string;
  heading?: string;
  paragraphs?: string[];
  items?: string[];
}

export interface TermsConfig {
  title?: string | LocalizedField;
  intro?: {
    lastUpdated?: string;
    body?: string;
  };
  sections?: TermsSection[];
  contact?: {
    heading?: string;
    paragraph?: string;
    company?: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  _meta?: Record<string, unknown>;
}

export interface RightRailButtonConfig {
  id?: string;
  icon?: string;
  href?: string;
  target?: string;
  label?: Record<string, string>;
  description?: Record<string, string>;
}

export interface RightRailConfig {
  buttons?: RightRailButtonConfig[];
  _meta?: Record<string, unknown>;
}


export async function getHomeConfig(): Promise<HomeConfig> {
  const config = await getSiteConfig<HomeConfig>(HOME_CONFIG_KEY);
  if (!config) {
    return FALLBACK_HOME_CONFIG;
  }
  const fallbackProductShowcase = FALLBACK_HOME_CONFIG.productShowcase ?? {};
  const mergedProductShowcase = {
    ...fallbackProductShowcase,
    ...config.productShowcase,
  };
  const productShowcase: HomeConfig["productShowcase"] = {
    ...mergedProductShowcase,
    selectedProductSlugs: mergedProductShowcase.selectedProductSlugs?.length
      ? [...mergedProductShowcase.selectedProductSlugs]
      : [...(fallbackProductShowcase.selectedProductSlugs ?? [])],
    cards: mergedProductShowcase.cards?.length
      ? mergedProductShowcase.cards.map((card) => ({ ...card }))
      : (fallbackProductShowcase.cards ?? []).map((card) => ({ ...card })),
  };
  const fallbackHero = FALLBACK_HOME_CONFIG.hero ?? {};
  const hero: HomeConfig["hero"] = {
    ...fallbackHero,
    ...config.hero,
    slides: config.hero?.slides?.length ? config.hero.slides : fallbackHero.slides ?? [],
  };

  return {
    ...FALLBACK_HOME_CONFIG,
    ...config,
    hero,
    productShowcase,
    applicationAreas: {
      ...FALLBACK_HOME_CONFIG.applicationAreas,
      ...config.applicationAreas,
    },
    inventoryHighlight: {
      ...FALLBACK_HOME_CONFIG.inventoryHighlight,
      ...config.inventoryHighlight,
    },
    companyOverview: {
      ...FALLBACK_HOME_CONFIG.companyOverview,
      ...config.companyOverview,
      hero: {
        ...FALLBACK_HOME_CONFIG.companyOverview?.hero,
        ...config.companyOverview?.hero,
      },
      serviceHighlights: config.companyOverview?.serviceHighlights?.length
        ? config.companyOverview.serviceHighlights
        : FALLBACK_HOME_CONFIG.companyOverview?.serviceHighlights,
      capabilities: config.companyOverview?.capabilities?.length
        ? config.companyOverview.capabilities
        : FALLBACK_HOME_CONFIG.companyOverview?.capabilities,
    },
  };
}

export async function getCasesConfig(): Promise<CasesConfig> {
  const config = await getSiteConfig<CasesConfig>(CASES_CONFIG_KEY);
  return config ?? (cases_config as CasesConfig);
}

export async function getInventoryConfig(): Promise<InventoryConfig> {
  const config = await getSiteConfig<InventoryConfig>(INVENTORY_CONFIG_KEY);
  return config ?? inventory_config;
}

export async function getNewsConfig(): Promise<NewsConfig> {
  const config = await getSiteConfig<NewsConfig>(NEWS_CONFIG_KEY);
  return config ?? news_config;
}

export async function getAboutConfig(): Promise<AboutConfig> {
  const config = await getSiteConfig<AboutConfig>(ABOUT_CONFIG_KEY);
  return config ?? about_config;
}

export async function getContactConfig(): Promise<ContactConfig> {
  const config = await getSiteConfig<ContactConfig>(CONTACT_CONFIG_KEY);
  if (!config) {
    return contact_config;
  }
  const fallback = contact_config;

  const hero: ContactConfig["hero"] = {
    ...fallback.hero,
    ...config.hero,
    metrics: (Array.isArray(config.hero?.metrics) ? config.hero!.metrics : fallback.hero?.metrics) ?? [],
  };

  const contactSection: ContactConfig["contactSection"] = {
    ...fallback.contactSection,
    ...config.contactSection,
    sectionHeading: {
      ...fallback.contactSection?.sectionHeading,
      ...config.contactSection?.sectionHeading,
    },
    cards: config.contactSection?.cards?.length
      ? config.contactSection.cards
      : fallback.contactSection?.cards ?? [],
    spotlight: {
      ...fallback.contactSection?.spotlight,
      ...config.contactSection?.spotlight,
    },
  };

  const connectSection: ContactConfig["connectSection"] = {
    ...fallback.connectSection,
    ...config.connectSection,
    sectionHeading: {
      ...fallback.connectSection?.sectionHeading,
      ...config.connectSection?.sectionHeading,
    },
    highlights: config.connectSection?.highlights?.length
      ? config.connectSection.highlights
      : fallback.connectSection?.highlights ?? [],
    serviceNetworkCopy: {
      ...fallback.connectSection?.serviceNetworkCopy,
      ...config.connectSection?.serviceNetworkCopy,
    },
    serviceHubs: config.connectSection?.serviceHubs?.length
      ? config.connectSection.serviceHubs
      : fallback.connectSection?.serviceHubs ?? [],
    formPanel: {
      ...fallback.connectSection?.formPanel,
      ...config.connectSection?.formPanel,
    },
  };

  const guaranteeSection: ContactConfig["guaranteeSection"] = {
    ...fallback.guaranteeSection,
    ...config.guaranteeSection,
    sectionHeading: {
      ...fallback.guaranteeSection?.sectionHeading,
      ...config.guaranteeSection?.sectionHeading,
    },
    guarantees: config.guaranteeSection?.guarantees?.length
      ? config.guaranteeSection.guarantees
      : fallback.guaranteeSection?.guarantees ?? [],
  };

  return {
    ...fallback,
    ...config,
    hero,
    contactSection,
    connectSection,
    guaranteeSection,
  };
}

export async function getPrivacyPolicyConfig(): Promise<PrivacyPolicyConfig> {
  const config = await getSiteConfig<PrivacyPolicyConfig>(PRIVACY_CONFIG_KEY);
  if (!config) {
    return FALLBACK_PRIVACY_POLICY_CONFIG;
  }
  return {
    ...FALLBACK_PRIVACY_POLICY_CONFIG,
    ...config,
    intro: {
      ...FALLBACK_PRIVACY_POLICY_CONFIG.intro,
      ...config.intro,
    },
    sections: normalizePolicySections(config.sections ?? FALLBACK_PRIVACY_POLICY_CONFIG.sections ?? []),
    contact: {
      ...FALLBACK_PRIVACY_POLICY_CONFIG.contact,
      ...config.contact,
    },
  } satisfies PrivacyPolicyConfig;
}

export async function getTermsConfig(): Promise<TermsConfig> {
  const config = await getSiteConfig<TermsConfig>(TERMS_CONFIG_KEY);
  if (!config) {
    return FALLBACK_TERMS_CONFIG;
  }
  return {
    ...FALLBACK_TERMS_CONFIG,
    ...config,
    intro: {
      ...FALLBACK_TERMS_CONFIG.intro,
      ...config.intro,
    },
    sections: normalizeTermsSections(config.sections ?? FALLBACK_TERMS_CONFIG.sections ?? []),
    contact: {
      ...FALLBACK_TERMS_CONFIG.contact,
      ...config.contact,
    },
  } satisfies TermsConfig;
}

export async function getRightRailConfig(): Promise<RightRailConfig> {
  const config = await getSiteConfig<RightRailConfig>(RIGHT_RAIL_CONFIG_KEY);
  if (!config) {
    return FALLBACK_RIGHT_RAIL_CONFIG;
  }
  return {
    ...FALLBACK_RIGHT_RAIL_CONFIG,
    ...config,
    buttons: normalizeRightRailButtons(config.buttons ?? FALLBACK_RIGHT_RAIL_CONFIG.buttons ?? []),
  } satisfies RightRailConfig;
}

export async function getProductCenterConfig(): Promise<ProductCenterConfig> {
  const config = await getSiteConfig<ProductCenterConfig>(PRODUCT_CENTER_CONFIG_KEY);
  if (!config) {
    return FALLBACK_PRODUCT_CENTER_CONFIG;
  }
  const fallbackProducts = FALLBACK_PRODUCT_CENTER_CONFIG.products;
  const fallbackMap = new Map<string, ProductCenterProduct>(
    fallbackProducts.map((item) => [item.slug, item]),
  );
  const sourceProducts = config.products?.length ? config.products : fallbackProducts;
  const mergedProducts = sourceProducts.map((item) => {
    const slug = item.slug ?? "";
    const fallback = fallbackMap.get(slug) ?? null;
    if (!fallback) {
      return item;
    }
    return {
      ...fallback,
      ...item,
    };
  });
  return {
    ...FALLBACK_PRODUCT_CENTER_CONFIG,
    ...config,
    hero: {
      ...FALLBACK_PRODUCT_CENTER_CONFIG.hero,
      ...config.hero,
    },

    products: mergedProducts,
  };
}

export async function getProductDetails(): Promise<ProductDetailMap> {
  const [config, productCenter] = await Promise.all([
    getSiteConfig<ProductDetailConfigMap>(PRODUCT_DETAIL_CONFIG_KEY),
    getProductCenterConfig(),
  ]);

  const locale = getRequestLocale();

  const seeds = productCenter.products.reduce<Record<string, { title?: string; summary?: string; tagline?: string }>>((acc, product) => {
    if (!product.slug) return acc;
    const resolve = (value: unknown, fallback = "") => {
      if (!value) return fallback;
      if (typeof value === "string") return value;
      if (typeof value === "object") {
        const result = t(value as Record<string, string | undefined>, locale);
        return result || fallback;
      }
      return fallback;
    };
    const title = resolve(product.name, product.slug);
    const tagline = resolve(product.tagline, "");
    acc[product.slug] = {
      title,
      summary: resolve(product.summary, tagline),
      tagline,
    };
    return acc;
  }, {});

  return normalizeProductDetailMap(config ?? {}, seeds);
}

function normalizePolicySections(sections: PolicySection[]): PolicySection[] {
  return sections.map((section, index) => ({
    id: section.id ?? `section-${index}`,
    heading: section.heading,
    paragraphs: Array.isArray(section.paragraphs) ? section.paragraphs.filter(Boolean) : [],
    items: Array.isArray(section.items)
      ? section.items.map((item) =>
          typeof item === "string"
            ? ({ body: item } as PolicySectionItem)
            : ({
                title: item?.title,
                body: item?.body ?? "",
              } as PolicySectionItem),
        )
      : [],
    paragraphsAfter: Array.isArray(section.paragraphsAfter) ? section.paragraphsAfter.filter(Boolean) : [],
  }));
}

function normalizeTermsSections(sections: TermsSection[]): TermsSection[] {
  return sections.map((section, index) => ({
    id: section.id ?? `section-${index}`,
    heading: section.heading,
    paragraphs: Array.isArray(section.paragraphs) ? section.paragraphs.filter(Boolean) : [],
    items: Array.isArray(section.items) ? section.items.filter(Boolean) : [],
  }));
}

function normalizeRightRailButtons(buttons: RightRailButtonConfig[]): RightRailButtonConfig[] {
  return buttons.map((button, index) => ({
    id: button.id ?? `button-${index}`,
    icon: ensureString(button.icon) || FALLBACK_RIGHT_RAIL_CONFIG.buttons?.[index]?.icon || "phone",
    href: ensureString(button.href) || FALLBACK_RIGHT_RAIL_CONFIG.buttons?.[index]?.href || "#",
    target: ensureString(button.target) || FALLBACK_RIGHT_RAIL_CONFIG.buttons?.[index]?.target,
    label: ensureLocalizedRecord(button.label),
    description: ensureLocalizedRecord(button.description),
  }));
}

function ensureString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function ensureLocalizedRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  const record = value as Record<string, unknown>;
  const result: Record<string, string> = {};
  for (const [key, val] of Object.entries(record)) {
    if (typeof val === "string" && val.trim().length) {
      result[key] = val;
    }
  }
  return result;
}
