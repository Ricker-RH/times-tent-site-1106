"use client";

import { useCallback } from "react";

import { useGlobalTranslation } from "@/hooks/useGlobalTranslationManager";

export function GlobalTranslationBar(): JSX.Element | null {
  const manager = useGlobalTranslation();

  const handleTranslate = useCallback(async () => {
    if (!manager) return;
    await manager.translateAll();
  }, [manager]);

  const handleUndo = useCallback(() => {
    if (!manager) return;
    manager.undoLast();
  }, [manager]);

  if (!manager) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]/60 p-4 text-sm text-[var(--color-text-secondary)]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="font-semibold text-[var(--color-brand-secondary)]">全局自动翻译</p>
          <p className="text-xs text-[var(--color-text-tertiary,#8690a3)]">
            一键同步当前页面的多语言内容。若部分字段翻译失败，将在结果弹窗中注明，可手动补充或撤销本次自动翻译。
          </p>
          <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--color-text-tertiary,#8690a3)]">
            已检测字段：{manager.fieldCount}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleTranslate}
            disabled={manager.isTranslating}
            className="inline-flex items-center justify-center rounded-full bg-[var(--color-brand-primary)] px-4 py-2 text-xs font-semibold text-white shadow transition hover:bg-[var(--color-brand-secondary)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {manager.isTranslating ? "翻译中…" : "全局自动翻译"}
          </button>
          <button
            type="button"
            onClick={handleUndo}
            disabled={!manager.canUndo || manager.isTranslating}
            className="inline-flex items-center justify-center rounded-full border border-[var(--color-border)] px-4 py-2 text-xs font-semibold text-[var(--color-text-secondary)] transition hover:border-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            撤销上次自动翻译
          </button>
        </div>
      </div>
    </div>
  );
}
