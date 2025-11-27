import "server-only";

import { notFound } from "next/navigation";

import { VISIBILITY_CONFIG_KEY, VISIBILITY_PAGES, type VisibilityPageKey } from "@/constants/visibility";
import {
  createDefaultVisibilityConfig,
  getHiddenSections as getHiddenSectionsFromConfig,
  listHiddenPageKeys,
  mergeWithDefaultVisibility,
  normalizeVisibilityConfig,
  resolvePageKeyFromPath,
  type VisibilityConfig,
} from "@/lib/visibilityConfig";
import { getSiteConfig } from "./siteConfigs";
import { SUPPORTED_LOCALES, type LocaleKey } from "@/i18n/locales";

export async function getVisibilityConfig(): Promise<VisibilityConfig> {
  const raw = await getSiteConfig<unknown>(VISIBILITY_CONFIG_KEY);
  if (!raw) {
    return createDefaultVisibilityConfig();
  }
  const normalized = normalizeVisibilityConfig(raw);
  return mergeWithDefaultVisibility(normalized);
}

export async function ensurePageVisible(pageKey: VisibilityPageKey): Promise<VisibilityConfig> {
  const config = await getVisibilityConfig();
  const page = config.pages?.[pageKey];
  if (page?.hidden === true) {
    notFound();
  }
  return config;
}

export function isPageHidden(config: VisibilityConfig, pageKey: VisibilityPageKey): boolean {
  return Boolean(config.pages?.[pageKey]?.hidden);
}

export function getHiddenSections(config: VisibilityConfig, pageKey: VisibilityPageKey): Record<string, boolean> {
  return getHiddenSectionsFromConfig(config, pageKey);
}

export function getHiddenPageKeys(config: VisibilityConfig): VisibilityPageKey[] {
  return listHiddenPageKeys(config);
}

export function resolveVisibilityPageKeyFromPath(pathname: string): VisibilityPageKey | null {
  return resolvePageKeyFromPath(pathname);
}

export { VISIBILITY_PAGES };

export function getVisibleLocales(config: VisibilityConfig): readonly LocaleKey[] {
  const hidden = config.locales ?? {};
  return SUPPORTED_LOCALES.filter((code) => hidden[code] !== true);
}
