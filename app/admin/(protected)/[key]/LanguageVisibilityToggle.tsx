"use client";

import { useEffect, useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";

import { SUPPORTED_LOCALES, type LocaleKey } from "@/i18n/locales";
import type { VisibilityConfig } from "@/lib/visibilityConfig";
import { updateSiteConfigAction, type UpdateSiteConfigActionState } from "../actions";
import { VISIBILITY_CONFIG_KEY } from "@/constants/visibility";
import { useToast } from "@/providers/ToastProvider";

const LOCALE_LABELS: Record<string, string> = {
  "zh-CN": "简体中文",
  "zh-TW": "繁體中文",
  en: "English",
};

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="inline-flex items-center justify-center rounded-full bg-[var(--color-brand-primary)] px-4 py-2 text-xs font-semibold text-white shadow transition hover:bg-[var(--color-brand-secondary)] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "保存中..." : "保存语言可见性"}
    </button>
  );
}

export function LanguageVisibilityToggle({ initial }: { initial: VisibilityConfig }) {
  const toast = useToast();
  const [draftHidden, setDraftHidden] = useState<Record<string, boolean>>(() => ({ ...(initial.locales ?? {}) }));
  const [state, formAction] = useFormState<UpdateSiteConfigActionState, FormData>(updateSiteConfigAction, { status: "idle" });

  useEffect(() => {
    if (state.status === "success") {
      toast.success("已保存语言可见性");
    }
  }, [state.status, toast]);

  const payload = useMemo(() => {
    const next: VisibilityConfig = {
      pages: initial.pages,
      locales: SUPPORTED_LOCALES.reduce((acc, code) => {
        acc[code] = draftHidden[code] === true;
        return acc;
      }, {} as Record<string, boolean>),
      _meta: initial._meta,
    };
    return JSON.stringify(next);
  }, [initial.pages, initial._meta, draftHidden]);

  const handleToggle = (code: LocaleKey) => {
    setDraftHidden((prev) => ({ ...prev, [code]: !(prev[code] === true) }));
  };

  return (
    <form action={formAction} className="flex items-center gap-3">
      <input type="hidden" name="key" value={VISIBILITY_CONFIG_KEY} />
      <input type="hidden" name="payload" value={payload} />
      <div className="flex items-center gap-2">
        {SUPPORTED_LOCALES.map((code) => {
          const hidden = draftHidden[code] === true;
          return (
            <button
              key={code}
              type="button"
              onClick={() => handleToggle(code)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                hidden
                  ? "border-rose-300 bg-rose-100 text-rose-600"
                  : "border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary)]"
              }`}
            >
              {hidden ? `隐藏：${LOCALE_LABELS[code]}` : `显示：${LOCALE_LABELS[code]}`}
            </button>
          );
        })}
      </div>
      <SubmitButton disabled={false} />
    </form>
  );
}

