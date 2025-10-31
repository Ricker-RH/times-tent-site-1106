import {
  cases_config,
  contact_config,
  footer_config,
  inventory_config,
  navigation_config,
  news_config,
  videos_config,
  about_config,
  products_cards,
  product_details,
} from "./configs";
import {
  DEFAULT_LOCALE,
  LocaleKey,
  SUPPORTED_LOCALES,
} from "@/i18n/locales";

export type { LocaleKey } from "@/i18n/locales";
export { DEFAULT_LOCALE } from "@/i18n/locales";

export const AVAILABLE_LOCALES: readonly LocaleKey[] = SUPPORTED_LOCALES;

let currentLocale: LocaleKey = DEFAULT_LOCALE;

export function setCurrentLocale(locale: LocaleKey) {
  currentLocale = locale;
}

export function getCurrentLocale(): LocaleKey {
  return currentLocale;
}

export function t(value: Record<string, string | undefined> | string | undefined, locale?: LocaleKey) {
  if (!value) return "";
  if (typeof value === "string") {
    return value;
  }
  const activeLocale = locale ?? currentLocale ?? DEFAULT_LOCALE;
  return value[activeLocale] ?? value[DEFAULT_LOCALE] ?? Object.values(value)[0] ?? "";
}

export const siteData = {
  navigation: navigation_config,
  footer: footer_config,
  cases: cases_config,
  inventory: inventory_config,
  news: news_config,
  videos: videos_config,
  about: about_config,
  contact: contact_config,
  products: products_cards,
  productDetails: product_details,
} as const;

export function getCaseCategories() {
  return siteData.cases.categories;
}

export function getCaseCategoryBySlug(slug: string) {
  return siteData.cases.categories.find((category) => category.slug === slug);
}

export function getCaseStudyBySlug(slug: string) {
  for (const category of siteData.cases.categories) {
    const study = category.studies.find((item) => item.slug === slug);
    if (study) {
      return { category, study } as const;
    }
  }
  return undefined;
}

export function getProductList() {
  return siteData.products;
}

export function getProductBySlug(slug: string) {
  const detail = siteData.productDetails[slug as keyof typeof siteData.productDetails];
  if (detail) {
    const listMeta = siteData.products.find((item) => item.href.endsWith(slug));
    return { detail, listMeta } as const;
  }
  return undefined;
}

export function getNewsList() {
  return siteData.news.articles;
}

export function getNewsArticle(slug: string) {
  return siteData.news.articles.find((item) => item.slug === slug);
}

export function getVideos() {
  return siteData.videos.items;
}

export function getInventoryItems() {
  return siteData.inventory.items;
}

export type CaseCategory = ReturnType<typeof getCaseCategories>[number];
