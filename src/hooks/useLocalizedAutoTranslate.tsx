"use client";

import { createPortal } from "react-dom";
import { useCallback, useEffect, useMemo, useState, type ReactPortal } from "react";

interface AutoTranslateOptions {
  label: string;
  value: Record<string, string>;
  sourceLocale: string;
  targetLocales: string[];
  context?: string;
  tone?: "formal" | "neutral" | "marketing";
  onApply: (translations: Record<string, string>) => void;
}

type DialogState = "idle" | "confirm" | "loading" | "success" | "error";

interface AutoTranslateHook {
  openDialog: () => void;
  closeDialog: () => void;
  isLoading: boolean;
  renderDialog: () => ReactPortal | null;
}

const DEFAULT_TONE: AutoTranslateOptions["tone"] = "marketing";

export function useLocalizedAutoTranslate({
  label,
  value,
  sourceLocale,
  targetLocales,
  context,
  tone = DEFAULT_TONE,
  onApply,
}: AutoTranslateOptions): AutoTranslateHook {
  const [state, setState] = useState<DialogState>("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortController?.abort();
    };
  }, [abortController]);

  const sourceText = useMemo(() => value[sourceLocale]?.trim() ?? "", [sourceLocale, value]);

  const closeDialog = useCallback(() => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
    }
    setState("idle");
    setErrorMessage("");
  }, [abortController]);

  const handleSuccess = useCallback(
    async (translations: Record<string, string>) => {
      onApply(translations);
      setState("success");
    },
    [onApply],
  );

  const confirmTranslate = useCallback(async () => {
    if (!sourceText) {
      setErrorMessage("请先填写中文内容，再尝试自动翻译。");
      setState("error");
      return;
    }
    if (!targetLocales.length) {
      setErrorMessage("暂无需要适配的其他语言。");
      setState("error");
      return;
    }
    const controller = new AbortController();
    setAbortController(controller);
    setState("loading");

    try {
      const response = await fetch("/api/translations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sourceLocale,
          targetLocales,
          tone,
          entries: [
            {
              id: label,
              text: sourceText,
              context: context ?? label,
            },
          ],
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error || "自动翻译失败，请手工翻译。");
      }

      const data = (await response.json()) as {
        results?: Array<{ id: string; translations: Record<string, string> }>;
      };

      const translations = data.results?.[0]?.translations ?? {};
      if (!Object.keys(translations).length) {
        throw new Error("翻译结果为空，请手工翻译。");
      }

      await handleSuccess(translations);
      setAbortController(null);
    } catch (error) {
      console.error("Auto translate error", error);
      setErrorMessage(error instanceof Error ? error.message : "自动翻译失败，请手工翻译。");
      setState("error");
      setAbortController(null);
    }
  }, [context, handleSuccess, label, sourceLocale, sourceText, targetLocales, tone]);

  const openDialog = useCallback(() => {
    setState("confirm");
  }, []);

  const renderDialog = useCallback(() => {
    if (state === "idle") {
      return null;
    }

    if (typeof document === "undefined") {
      return null;
    }

    const Modal = (
      <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <div className="w-[360px] max-w-[90vw] rounded-2xl bg-white p-6 text-sm text-[var(--color-text-secondary)] shadow-2xl">
          {state === "confirm" ? (
            <>
              <h3 className="mb-4 text-lg font-semibold text-[var(--color-brand-secondary)]">自动适配其他语言</h3>
              <p className="mb-6 leading-relaxed">
                将「{label}」中的中文内容翻译成其他语言，并自动填充对应字段。是否立即执行？
              </p>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="rounded-full border border-[var(--color-border)] px-4 py-2 text-xs font-semibold text-[var(--color-text-secondary)] transition hover:border-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary)]"
                  onClick={closeDialog}
                >
                  取消
                </button>
                <button
                  type="button"
                  className="rounded-full bg-[var(--color-brand-primary)] px-4 py-2 text-xs font-semibold text-white shadow transition hover:bg-[var(--color-brand-secondary)]"
                  onClick={confirmTranslate}
                >
                  是
                </button>
              </div>
            </>
          ) : null}

          {state === "loading" ? (
            <div className="flex flex-col items-center gap-4">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--color-brand-primary)] border-t-transparent" />
              <p className="text-sm">翻译中，请稍候…</p>
            </div>
          ) : null}

          {state === "success" ? (
            <>
              <h3 className="mb-4 text-lg font-semibold text-emerald-600">翻译完成</h3>
              <p className="mb-6 leading-relaxed">已自动填充其他语言，请确认内容后手动保存。</p>
              <div className="flex justify-end">
                <button
                  type="button"
                  className="rounded-full bg-[var(--color-brand-primary)] px-4 py-2 text-xs font-semibold text-white shadow transition hover:bg-[var(--color-brand-secondary)]"
                  onClick={closeDialog}
                >
                  好的
                </button>
              </div>
            </>
          ) : null}

          {state === "error" ? (
            <>
              <h3 className="mb-4 text-lg font-semibold text-rose-600">翻译失败</h3>
              <p className="mb-6 leading-relaxed">{errorMessage || "自动翻译失败，请手工补充对应语言内容。"}</p>
              <div className="flex justify-end">
                <button
                  type="button"
                  className="rounded-full bg-[var(--color-brand-primary)] px-4 py-2 text-xs font-semibold text-white shadow transition hover:bg-[var(--color-brand-secondary)]"
                  onClick={closeDialog}
                >
                  明白了
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    );

    return createPortal(Modal, document.body);
  }, [closeDialog, confirmTranslate, errorMessage, label, state]);

  return {
    openDialog,
    closeDialog,
    isLoading: state === "loading",
    renderDialog,
  };
}
