import { LocaleKey, SUPPORTED_LOCALES, missingLocales, normalizeLocalizedField } from "./locales";

export interface MissingLocaleRecord {
  path: string;
  missing: LocaleKey[];
  value: Record<string, string>;
}

export function createMissingLocaleRecord(
  value: unknown,
  path: string,
  required: readonly LocaleKey[] = SUPPORTED_LOCALES,
): MissingLocaleRecord | null {
  const missing = missingLocales(value, required);
  if (!missing.length) {
    return null;
  }

  return {
    path,
    missing,
    value: normalizeLocalizedField(value) as Record<string, string>,
  };
}

export function mergeMissingLocaleRecords(records: Array<MissingLocaleRecord | null>): MissingLocaleRecord[] {
  return records.filter((record): record is MissingLocaleRecord => Boolean(record));
}

export function formatMissingLocaleRecord(record: MissingLocaleRecord): string {
  return `${record.path}: 缺少 ${record.missing.join(", ")}`;
}
