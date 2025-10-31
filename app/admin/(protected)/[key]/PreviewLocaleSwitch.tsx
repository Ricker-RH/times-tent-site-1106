"use client";

import { SUPPORTED_LOCALES } from "@/i18n/locales";
import { useLocale } from "@/providers/LocaleProvider";

const LOCALE_LABELS: Record<string, string> = {
  "zh-CN": "中文",
  "zh-TW": "繁體",
  en: "English",
};

export function PreviewLocaleSwitch({ className = "" }: { className?: string }) {
  const { locale, setLocale } = useLocale();

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-text-tertiary,#8690a3)]">
        预览语言
      </span>
      <div className="flex items-center gap-1">
        {SUPPORTED_LOCALES.map((code) => (
          <button
            key={code}
            type="button"
            onClick={() => setLocale(code)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
              locale === code
                ? "border-[var(--color-brand-primary)] bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)]"
                : "border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary)]"
            }`}
          >
            {LOCALE_LABELS[code] ?? code}
          </button>
        ))}
      </div>
    </div>
  );
}