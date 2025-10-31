export const SUPPORTED_LOCALES = ["zh-CN", "zh-TW", "en"] as const;

export type LocaleKey = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: LocaleKey = "zh-CN";

export type LocalizedField<T extends string = string> = Partial<Record<LocaleKey, T>>;

export function isLocale(value: string): value is LocaleKey {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

export function normalizeLocalizedField(value: unknown): LocalizedField {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? { [DEFAULT_LOCALE]: trimmed } : {};
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const entries = Object.entries(value as Record<string, unknown>);
  const result: LocalizedField = {};
  entries.forEach(([key, raw]) => {
    if (typeof raw !== "string") return;
    if (!isLocale(key)) return;
    const trimmed = raw.trim();
    if (trimmed) {
      result[key as LocaleKey] = trimmed;
    }
  });

  return result;
}

export function ensureCompleteLocalizedField(
  value: unknown,
  fallback: string = "",
): Record<LocaleKey, string> {
  const normalized = normalizeLocalizedField(value);
  const defaultValue = normalized[DEFAULT_LOCALE] ?? fallback;
  const complete = {} as Record<LocaleKey, string>;
  SUPPORTED_LOCALES.forEach((locale) => {
    complete[locale] = normalized[locale] ?? defaultValue ?? "";
  });
  return complete;
}

export function missingLocales(
  value: unknown,
  required: readonly LocaleKey[] = SUPPORTED_LOCALES,
): LocaleKey[] {
  const normalized = normalizeLocalizedField(value);
  return required.filter((locale) => !normalized[locale]?.trim());
}
