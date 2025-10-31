import "server-only";

import { cookies } from "next/headers";
import { DEFAULT_LOCALE, isLocale, type LocaleKey } from "@/i18n/locales";

const STORAGE_KEY = "times-tent-locale";

export function getRequestLocale(): LocaleKey {
  try {
    const store = cookies();
    const raw = store.get(STORAGE_KEY)?.value;
    if (raw && isLocale(raw)) {
      return raw as LocaleKey;
    }
  } catch {
    // ignore
  }
  return DEFAULT_LOCALE;
}