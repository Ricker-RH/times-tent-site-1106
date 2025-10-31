"use client";

import { useFormStatus } from "react-dom";
import type { UpdateSiteConfigActionState } from "../actions";
import type { RefObject } from "react";

function SubmitButton({ disabled, highlight }: { disabled?: boolean; highlight?: boolean }) {
  const { pending } = useFormStatus();
  const isDisabled = !!disabled || pending;
  return (
    <button
      type="submit"
      aria-label="保存"
      className={
        "rounded-full px-4 py-2 text-sm transition-colors " +
        (isDisabled
          ? "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400"
          : highlight
          ? "border border-[var(--color-brand-primary)] bg-[var(--color-brand-primary)] text-white hover:bg-[var(--color-brand-primary)]/90"
          : "border border-slate-300 bg-white text-[var(--color-text-primary)] hover:bg-slate-50")
      }
      disabled={isDisabled}
    >
      {pending ? "正在保存…" : "保存"}
    </button>
  );
}

export interface SaveBarProps {
  configKey: string;
  payload: string;
  formAction: any;
  isDirty: boolean;
  disabled?: boolean;
  fixed?: boolean;
  status?: UpdateSiteConfigActionState;
  formRef?: RefObject<HTMLFormElement>;
}

export function SaveBar({
  configKey,
  payload,
  formAction,
  isDirty,
  disabled,
  fixed = true,
  status,
  formRef,
}: SaveBarProps) {
  const containerClass = fixed
    ? "fixed bottom-4 right-4 z-[1100] flex items-center gap-3 rounded-xl border border-neutral-300/60 bg-neutral-50/75 px-4 py-2 text-neutral-700 shadow-xl backdrop-blur-md ring-1 ring-black/5"
    : "flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[var(--color-border)] bg-white/80 px-6 py-5";

  return (
    <form ref={formRef} action={formAction} method="POST" className={containerClass}>
      <div className="space-y-1 text-sm text-[var(--color-text-secondary)]">
        {status?.status === "error" ? (
          <p className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs text-rose-600">{status.message}</p>
        ) : null}
        {status?.status === "success" ? (
          <p className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs text-emerald-600">{status.message}</p>
        ) : null}
        <p className="text-xs text-[var(--color-text-tertiary)]">
          {isDirty ? "有未保存的更改" : fixed ? "已与服务器同步" : "暂无未保存的更改"}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <input type="hidden" name="key" value={configKey} readOnly />
        <input type="hidden" name="payload" value={payload} readOnly />
        <SubmitButton disabled={disabled ?? !isDirty} highlight={isDirty} />
      </div>
    </form>
  );
}
