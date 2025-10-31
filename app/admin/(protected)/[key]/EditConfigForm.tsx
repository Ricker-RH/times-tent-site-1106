"use client";

import { useEffect, useState, useTransition } from "react";
import { useFormState, useFormStatus } from "react-dom";

import type { UpdateSiteConfigActionState } from "../actions";
import { updateSiteConfigAction } from "../actions";
import { useToast } from "@/providers/ToastProvider";

function SubmitButton({ disabled, highlight }: { disabled: boolean; highlight?: boolean }) {
  const { pending } = useFormStatus();
  const shouldPulse = Boolean(highlight && !disabled && !pending);
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className={`inline-flex items-center justify-center rounded-full bg-[var(--color-brand-primary)] px-5 py-2 text-sm font-semibold text-white shadow transition hover:bg-[var(--color-brand-secondary)] disabled:cursor-not-allowed disabled:opacity-60 ${
        shouldPulse ? "animate-[pulse_0.6s_ease-in-out_infinite] ring-4 ring-offset-4 ring-offset-white ring-[var(--color-brand-primary)] shadow-[0_0_36px_rgba(216,34,52,0.45)]" : ""
      }`}
    >
      {pending ? "保存中..." : "保存配置"}
    </button>
  );
}

export function EditConfigForm({
  configKey,
  defaultValue,
}: {
  configKey: string;
  defaultValue: string;
}) {
  const [text, setText] = useState(defaultValue);
  const [isDirty, setIsDirty] = useState(false);
  const [state, formAction] = useFormState<UpdateSiteConfigActionState, FormData>(updateSiteConfigAction, {
    status: "idle",
  });
  const [isFormatting, startFormatting] = useTransition();
  const toast = useToast();

  useEffect(() => {
    setText(defaultValue);
    setIsDirty(false);
  }, [defaultValue]);

  useEffect(() => {
    if (state.status === "success") {
      setIsDirty(false);
      toast.success("保存成功");
    }
  }, [state.status, toast]);

  const handleFormat = () => {
    startFormatting(() => {
      try {
        const parsed = JSON.parse(text);
        setText(JSON.stringify(parsed, null, 2));
        setIsDirty(true);
      } catch (error) {
        // 忽略格式化错误
      }
    });
  };

  const handleReset = () => {
    setText(defaultValue);
    setIsDirty(false);
  };

  const textLength = text.trim().length;

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="key" value={configKey} />
      <div>
        <label htmlFor="payload" className="mb-2 block text-sm font-medium text-[var(--color-brand-secondary)]">
          JSON 配置
        </label>
        <textarea
          id="payload"
          name="payload"
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setIsDirty(true);
          }}
          spellCheck={false}
          className="h-[520px] w-full rounded-2xl border border-[var(--color-border)] bg-black/5 p-4 font-mono text-sm text-[var(--color-brand-secondary)] focus:border-[var(--color-brand-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/30"
        />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--color-text-tertiary,#8690a3)]">
          <span>{`字符数：${textLength}`}</span>
          {isFormatting ? <span>格式化中...</span> : null}
        </div>
      </div>

    </form>
  );
}
