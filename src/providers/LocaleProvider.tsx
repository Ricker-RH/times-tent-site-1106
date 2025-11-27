"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AVAILABLE_LOCALES, DEFAULT_LOCALE, LocaleKey, setCurrentLocale } from "@/data";
import { useRouter } from "next/navigation";

interface LocaleContextValue {
  locale: LocaleKey;
  setLocale: (locale: LocaleKey) => void;
  availableLocales: readonly LocaleKey[];
}

const LocaleContext = createContext<LocaleContextValue | undefined>(undefined);

const STORAGE_KEY = "times-tent-locale";

export function LocaleProvider({ children, availableLocales: providedLocales }: { children: React.ReactNode; availableLocales?: readonly LocaleKey[] }) {
  const [locale, setLocaleState] = useState<LocaleKey>(DEFAULT_LOCALE);
  const router = useRouter();
  const availableLocales = useMemo(() => (providedLocales && providedLocales.length ? providedLocales : AVAILABLE_LOCALES), [providedLocales]);

  useEffect(() => {
    const stored =
      typeof window !== "undefined"
        ? (window.localStorage.getItem(STORAGE_KEY) as LocaleKey | null)
        : null;
    if (stored && availableLocales.includes(stored)) {
      setLocaleState(stored);
      setCurrentLocale(stored);
    } else {
      setCurrentLocale(DEFAULT_LOCALE);
    }
  }, [availableLocales]);

  const setLocale = useCallback((next: LocaleKey) => {
    if (next === locale) return;
    setLocaleState(next);
    setCurrentLocale(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, next);
      document.cookie = `${STORAGE_KEY}=${next};path=/;max-age=${60 * 60 * 24 * 365}`;
      const path = window.location?.pathname ?? "";
      // 管理后台预览用纯客户端渲染，无需刷新；站点页面仍刷新以更新服务端组件
      if (!path.startsWith("/admin")) {
        router.refresh();
      }
    }
  }, [locale, router]);

  const value = useMemo(
    () => ({ locale, setLocale, availableLocales }),
    [locale, setLocale, availableLocales],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error("useLocale must be used within a LocaleProvider");
  }
  return context;
}
