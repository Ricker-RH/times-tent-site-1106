"use client";

import type { MouseEvent, ReactNode } from "react";

interface EditorDialogProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onSave: () => void;
  onCancel: () => void;
  saveLabel?: string;
  cancelLabel?: string;
}

export function EditorDialog({
  title,
  subtitle,
  children,
  onSave,
  onCancel,
  saveLabel = "保存并关闭",
  cancelLabel = "取消",
}: EditorDialogProps) {
  // 严格限制关闭方式：仅允许按钮触发关闭
  const handleBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
    // 不做任何处理，点击蒙层不关闭
    // 但保留函数以便未来扩展（例如提示文案）
    if (event.target !== event.currentTarget) return;
  };

  return (
    <div
      role="dialog"
      aria-modal
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      onClick={handleBackdropClick}
    >
      <div className="flex w-full max-w-4xl max-h-[85vh] flex-col overflow-hidden rounded-3xl border border-[var(--color-border)] bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--color-border)] px-5 py-4">
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-[0.35em] text-[var(--color-text-tertiary,#8690a3)]">正在编辑</p>
            <h2 className="text-lg font-semibold text-[var(--color-brand-secondary)]">{title}</h2>
            {subtitle ? <p className="text-xs text-[var(--color-text-secondary)]">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-[var(--color-border)] px-3 py-1 text-xs text-[var(--color-text-secondary)] transition hover:border-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary)]"
            aria-label="关闭编辑弹窗"
          >
            ×
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-5 text-sm">{children}</div>
        <div className="flex justify-end gap-2 border-t border-[var(--color-border)] bg-white px-5 py-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-[var(--color-border)] px-4 py-2 text-xs font-semibold text-[var(--color-text-secondary)] transition hover:border-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary)]"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onSave}
            className="rounded-full bg-[var(--color-brand-primary)] px-4 py-2 text-xs font-semibold text-white shadow transition hover:bg-[var(--color-brand-secondary)]"
          >
            {saveLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
