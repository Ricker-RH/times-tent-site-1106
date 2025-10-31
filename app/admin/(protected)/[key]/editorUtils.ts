"use client";

import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type LocaleKey } from "@/i18n/locales";
import { getCurrentLocale } from "@/data";

export { DEFAULT_LOCALE, SUPPORTED_LOCALES };

export function ensureLocalizedRecord(value: unknown): Record<string, string> {
  const record = (value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {}) as Record<string, string>;
  return Object.fromEntries(Object.entries(record).map(([k, v]) => [k, typeof v === "string" ? v : ""])) as Record<string, string>;
}

export function getLocaleText(
  value: unknown,
  locale?: string,
  fallback = "",
): string {
  const record = ensureLocalizedRecord(value);
  const activeLocale = locale ?? getCurrentLocale() ?? DEFAULT_LOCALE;
  if (record[activeLocale]?.trim()) return record[activeLocale] as string;
  const first = Object.values(record).find((item) => typeof item === "string" && item.trim().length);
  return typeof first === "string" ? first : fallback;
}

export function setLocaleText(
  value: unknown,
  next: string,
  locale?: string,
): Record<string, string> {
  const record = ensureLocalizedRecord(value);
  const activeLocale = locale ?? getCurrentLocale() ?? DEFAULT_LOCALE;
  return { ...record, [activeLocale]: next };
}

export function ensureString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

export function ensureNumber(value: unknown, fallback = "0"): string {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value === "string" && value.trim().length) {
    return value;
  }
  return fallback;
}

export function ensureArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export function mergeMeta<T>(value: T, meta?: Record<string, unknown>): T & { _meta?: Record<string, unknown> } {
  if (!meta) {
    return value as T & { _meta?: Record<string, unknown> };
  }
  return { ...value, _meta: { ...meta } };
}

// === New helpers to respect empty localized values globally ===
export function ensureLocalizedNoFallback(value: unknown): Record<string, string> {
  const record = ensureLocalizedRecord(value);
  const result: Record<string, string> = {};
  for (const locale of SUPPORTED_LOCALES) {
    const v = record[locale] ?? "";
    result[locale] = typeof v === "string" ? v.trim() : "";
  }
  return result;
}

export function serializeLocalizedAllowEmpty(record: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const locale of SUPPORTED_LOCALES) {
    const v = record[locale] ?? "";
    result[locale] = typeof v === "string" ? v.trim() : "";
  }
  return result;
}