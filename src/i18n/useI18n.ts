"use client";

import { useCallback } from "react";
import { LocaleKey } from "@/data";
import { translateUi, UiKey } from "./dictionary";
import { useLocale } from "@/providers/LocaleProvider";

export function useI18n() {
  const { locale, setLocale, availableLocales } = useLocale();
  const t = useCallback((key: UiKey, fallback?: string) => translateUi(locale as LocaleKey, key, fallback), [locale]);
  return {
    locale,
    setLocale,
    availableLocales,
    t,
  };
}
