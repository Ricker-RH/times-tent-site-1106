import "server-only";

import type { SiteConfigSummary } from "./siteConfigs";
import { getSiteConfig, saveSiteConfig } from "./siteConfigs";
import type { SaveSiteConfigOptions } from "./siteConfigs";

const ADMIN_CHANNEL_SETTINGS_KEY = "__admin_channels__";

export interface AdminChannelSettingsMeta {
  updatedAt?: string;
  updatedBy?: string;
}

export interface AdminChannelSettings {
  order: string[];
  hiddenKeys: string[];
  _meta?: AdminChannelSettingsMeta;
}

export interface AdminChannelSummary extends SiteConfigSummary {
  hidden: boolean;
}

export function getAdminChannelSettingsKey(): string {
  return ADMIN_CHANNEL_SETTINGS_KEY;
}

function normaliseStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") continue;
    if (seen.has(item)) continue;
    seen.add(item);
    result.push(item);
  }
  return result;
}

function normaliseMeta(value: unknown): AdminChannelSettingsMeta | undefined {
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  const updatedAt = typeof record.updatedAt === "string" ? record.updatedAt : undefined;
  const updatedBy = typeof record.updatedBy === "string" ? record.updatedBy : undefined;
  if (!updatedAt && !updatedBy) return undefined;
  return { updatedAt, updatedBy };
}

export async function getAdminChannelSettings(): Promise<AdminChannelSettings | null> {
  const raw = await getSiteConfig<unknown>(ADMIN_CHANNEL_SETTINGS_KEY);
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const record = raw as Record<string, unknown>;
  const order = normaliseStringList(record.order);
  const hiddenKeys = normaliseStringList(record.hiddenKeys);
  const meta = normaliseMeta(record._meta);
  return {
    order,
    hiddenKeys,
    _meta: meta,
  } satisfies AdminChannelSettings;
}

export function buildDefaultAdminChannelSettings(keys: string[]): AdminChannelSettings {
  const uniqueKeys = Array.from(new Set(keys.filter((key): key is string => typeof key === "string" && key.trim().length > 0)));
  uniqueKeys.sort((a, b) => a.localeCompare(b, "zh-CN"));
  return {
    order: uniqueKeys,
    hiddenKeys: [],
  } satisfies AdminChannelSettings;
}

export function resolveAdminChannels(
  summaries: SiteConfigSummary[],
  settings: AdminChannelSettings | null,
  options?: { includeHidden?: boolean },
): AdminChannelSummary[] {
  const includeHidden = options?.includeHidden === true;
  const order = settings?.order ?? [];
  const hiddenSet = new Set(settings?.hiddenKeys ?? []);
  const summaryMap = new Map<string, SiteConfigSummary>();
  summaries.forEach((summary) => {
    summaryMap.set(summary.key, summary);
  });

  const seen = new Set<string>();
  const result: AdminChannelSummary[] = [];

  const append = (key: string) => {
    if (seen.has(key)) return;
    const summary = summaryMap.get(key);
    if (!summary) return;
    const hidden = hiddenSet.has(key);
    seen.add(key);
    if (hidden && !includeHidden) {
      return;
    }
    result.push({ ...summary, hidden });
  };

  for (const key of order) {
    if (typeof key !== "string") continue;
    append(key);
  }

  const leftovers = summaries
    .filter((summary) => !seen.has(summary.key))
    .sort((a, b) => a.key.localeCompare(b.key, "zh-CN"));

  for (const summary of leftovers) {
    const hidden = hiddenSet.has(summary.key);
    if (hidden && !includeHidden) {
      seen.add(summary.key);
      continue;
    }
    seen.add(summary.key);
    result.push({ ...summary, hidden });
  }

  if (!includeHidden) {
    return result.filter((item) => !item.hidden);
  }

  return result;
}

export async function saveAdminChannelSettings(
  value: AdminChannelSettings,
  options?: SaveSiteConfigOptions,
): Promise<void> {
  const nextValue: AdminChannelSettings = {
    order: normaliseStringList(value.order),
    hiddenKeys: normaliseStringList(value.hiddenKeys),
    _meta: value._meta,
  };
  await saveSiteConfig(ADMIN_CHANNEL_SETTINGS_KEY, nextValue, options);
}

export function toEditorPayload(channels: AdminChannelSummary[]): Array<{ key: string; hidden: boolean }> {
  return channels.map((channel) => ({ key: channel.key, hidden: channel.hidden }));
}

export function mergeSettingsWithKeys(
  keys: string[],
  settings: AdminChannelSettings | null,
): AdminChannelSettings {
  if (!settings) {
    return buildDefaultAdminChannelSettings(keys);
  }
  const normalizedOrder = normaliseStringList(settings.order);
  const normalizedHidden = normaliseStringList(settings.hiddenKeys);
  const seen = new Set(normalizedOrder);
  const additionalKeys = keys.filter((key) => typeof key === "string" && !seen.has(key));
  return {
    order: [...normalizedOrder, ...additionalKeys],
    hiddenKeys: normalizedHidden.filter((key) => normalizedOrder.includes(key) || additionalKeys.includes(key)),
    _meta: settings._meta,
  } satisfies AdminChannelSettings;
}

export function getHiddenKeySet(settings: AdminChannelSettings | null): Set<string> {
  return new Set(settings?.hiddenKeys ?? []);
}

export function createNavigationItems(
  summaries: SiteConfigSummary[],
  settings: AdminChannelSettings | null,
): Array<{ label: string; href: string }> {
  const channels = resolveAdminChannels(summaries, settings, { includeHidden: false });

  // Swap the positions of "关于时代" and "新闻中心" in admin navigation
  const aboutKey = "关于时代";
  const newsKey = "新闻中心";
  const aboutIndex = channels.findIndex((c) => c.key === aboutKey);
  const newsIndex = channels.findIndex((c) => c.key === newsKey);

  const ordered = [...channels];
  if (aboutIndex !== -1 && newsIndex !== -1 && aboutIndex !== newsIndex) {
    const temp = ordered[aboutIndex];
    ordered[aboutIndex] = ordered[newsIndex];
    ordered[newsIndex] = temp;
  }

  return ordered.map((channel) => ({
    label: channel.key,
    href: `/admin/${encodeURIComponent(channel.key)}`,
  }));
}
