export const PRIMARY_LOCALE = "zh-CN";

export function readLocalized(value: unknown, locale = PRIMARY_LOCALE): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record[locale] === "string") return record[locale] as string;
    if (typeof record[PRIMARY_LOCALE] === "string") return record[PRIMARY_LOCALE] as string;
    const first = Object.values(record).find((entry) => typeof entry === "string");
    if (typeof first === "string") return first;
  }
  return "";
}

export function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
