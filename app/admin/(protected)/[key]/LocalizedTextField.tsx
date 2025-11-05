"use client";

import { useCallback, useMemo, useState } from "react";
import type { LocaleKey } from "@/i18n/locales";

import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  ensureLocalizedNoFallback,
  ensureLocalizedRecord,
  setLocaleText,
} from "./editorUtils";
import { useLocalizedAutoTranslate } from "@/hooks/useLocalizedAutoTranslate";

export type LocalizedValue = Record<string, string>;

const LOCALE_LABELS: Partial<Record<LocaleKey, string>> = {
  "zh-CN": "中文",
  "zh-TW": "繁體",
  en: "English",
};

export interface LocalizedTextFieldProps {
  label: string;
  value: LocalizedValue;
  onChange: (next: LocalizedValue) => void;
  helper?: string;
  multiline?: boolean;
  rows?: number;
  placeholder?: string;
  sourceLocale?: LocaleKey;
  targetLocales?: LocaleKey[];
  translationContext?: string;
  translationTone?: "formal" | "neutral" | "marketing";
  onTranslated?: (next: LocalizedValue) => void | Promise<void>;
  autoTranslateDisabled?: boolean;
  disabled?: boolean;
}

export function LocalizedTextField({
  label,
  value,
  onChange,
  helper,
  multiline = false,
  rows = 3,
  placeholder,
  sourceLocale = DEFAULT_LOCALE,
  targetLocales,
  translationContext,
  translationTone = "marketing",
  onTranslated,
  autoTranslateDisabled,
  disabled,
}: LocalizedTextFieldProps) {
  const [activeLocale, setActiveLocale] = useState<LocaleKey>(sourceLocale);
  const normalized = ensureLocalizedRecord(value);
  const currentValue = normalized[activeLocale] ?? "";
  const normalizedValue = ensureLocalizedNoFallback(value);

  const localeOptions = useMemo(
    () =>
      SUPPORTED_LOCALES.map((code) => ({
        code,
        label: LOCALE_LABELS[code] ?? code,
      })),
    [],
  );

  const effectiveTargets = useMemo(() => {
    const baseTargets = targetLocales?.length ? targetLocales : SUPPORTED_LOCALES;
    return baseTargets.filter((locale) => locale !== sourceLocale);
  }, [sourceLocale, targetLocales]);

  const applyTranslations = useCallback(
    async (translations: Record<string, string>) => {
      const base = ensureLocalizedNoFallback(value);
      const next = { ...base } as LocalizedValue;
      effectiveTargets.forEach((locale) => {
        const translated = translations[locale];
        if (typeof translated === "string" && translated.trim()) {
          next[locale] = translated.trim();
        }
      });
      onChange(next);
      await onTranslated?.(next);
    },
    [effectiveTargets, onChange, onTranslated, value],
  );

  const translator = useLocalizedAutoTranslate({
    label,
    value: normalizedValue,
    sourceLocale,
    targetLocales: effectiveTargets,
    context: translationContext || label,
    tone: translationTone,
    onApply: applyTranslations,
  });

  const handleChange = useCallback(
    (locale: LocaleKey, nextValue: string) => {
      const updated = setLocaleText(value, nextValue, locale);
      onChange(updated);
    },
    [onChange, value],
  );

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-text-tertiary,#8690a3)]">{label}</span>
        <div className="flex flex-wrap items-center gap-1">
          {localeOptions.map(({ code, label: localeLabel }) => (
            <button
              key={code}
              type="button"
              onClick={() => setActiveLocale(code as LocaleKey)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                activeLocale === code
                  ? "border-[var(--color-brand-primary)] bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)]"
                  : "border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary)]"
              }`}
              disabled={disabled}
            >
              {localeLabel}
            </button>
          ))}
          {autoTranslateDisabled ? null : (
            <button
              type="button"
              onClick={translator.openDialog}
              disabled={translator.isLoading || disabled}
              className="rounded-full border border-[var(--color-brand-primary)] px-3 py-1 text-xs font-semibold text-[var(--color-brand-primary)] transition hover:bg-[var(--color-brand-primary)]/10 disabled:cursor-not-allowed disabled:border-dashed disabled:text-[var(--color-text-tertiary,#8690a3)]"
            >
              {translator.isLoading ? "翻译中…" : "自动适配其他语言"}
            </button>
          )}
        </div>
      </div>
      {multiline ? (
        <textarea
          value={currentValue}
          onChange={(event) => handleChange(activeLocale, event.target.value)}
          rows={rows}
          placeholder={placeholder}
          className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm leading-relaxed text-[var(--color-text-secondary)] focus:border-[var(--color-brand-primary)] focus:outline-none"
          disabled={disabled}
        />
      ) : (
        <input
          value={currentValue}
          onChange={(event) => handleChange(activeLocale, event.target.value)}
          placeholder={placeholder}
          className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-text-secondary)] focus:border-[var(--color-brand-primary)] focus:outline-none"
          disabled={disabled}
        />
      )}
      {helper ? <span className="text-[10px] text-[var(--color-text-tertiary,#8690a3)]">{helper}</span> : null}
      {autoTranslateDisabled ? null : translator.renderDialog()}
    </div>
  );
}
