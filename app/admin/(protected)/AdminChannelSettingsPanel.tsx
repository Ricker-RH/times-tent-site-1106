"use client";

import type { DragEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useToast } from "@/providers/ToastProvider";

import type { UpdateAdminChannelSettingsState } from "./actions";
import { updateAdminChannelSettingsAction } from "./actions";

interface ChannelItem {
  key: string;
  title?: string;
  adminPath?: string;
  hidden: boolean;
}

interface MetaInfo {
  updatedAt?: string;
  updatedBy?: string;
}

interface AdminChannelSettingsPanelProps {
  channels: ChannelItem[];
  meta?: MetaInfo;
  className?: string;
}

type DropIndicator = {
  key: string;
  position: "before" | "after";
};

function normalisePayload(items: ChannelItem[]): string {
  return JSON.stringify(items.map((item) => ({ key: item.key, hidden: Boolean(item.hidden) })));
}

function formatTimestamp(value?: string): string | null {
  if (!value) return null;
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return value;
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

function SaveButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="inline-flex items-center justify-center rounded-full bg-[var(--color-brand-primary)] px-5 py-2 text-sm font-semibold text-white shadow transition hover:bg-[var(--color-brand-secondary)] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "保存中..." : "保存排序"}
    </button>
  );
}

export function AdminChannelSettingsPanel({ channels, meta, className }: AdminChannelSettingsPanelProps) {
  const [items, setItems] = useState<ChannelItem[]>(channels);
  const initialBaseline = useMemo(() => normalisePayload(channels), [channels]);
  const [baselineJson, setBaselineJson] = useState(initialBaseline);
  const payloadJson = useMemo(() => normalisePayload(items), [items]);
  const [draggingKey, setDraggingKey] = useState<string | null>(null);
  const [dropIndicator, setDropIndicator] = useState<DropIndicator | null>(null);
  const previousStatusRef = useRef<UpdateAdminChannelSettingsState["status"]>("idle");
  const [state, formAction] = useFormState<UpdateAdminChannelSettingsState, FormData>(
    updateAdminChannelSettingsAction,
    { status: "idle" },
  );
  const toast = useToast();

  useEffect(() => {
    setItems(channels);
    setBaselineJson(initialBaseline);
    setDraggingKey(null);
    setDropIndicator(null);
  }, [channels, initialBaseline]);

  useEffect(() => {
    if (state.status === "success" && previousStatusRef.current !== "success") {
      setBaselineJson(normalisePayload(items));
      setDraggingKey(null);
      setDropIndicator(null);
      toast.success("保存成功");
      window.dispatchEvent(
        new CustomEvent("site-config:save-success", { detail: { key: "admin-channel-settings" } }),
      );
    }
    previousStatusRef.current = state.status;
  }, [state.status, items, toast]);

  const isDirty = payloadJson !== baselineJson;

  const handleToggleHidden = (index: number, hidden: boolean) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], hidden };
      return next;
    });
  };

  const handleReset = () => {
    setItems(channels);
    setBaselineJson(initialBaseline);
    setDraggingKey(null);
    setDropIndicator(null);
  };

  const handleDragStart = (event: DragEvent<HTMLDivElement>, key: string) => {
    event.dataTransfer.effectAllowed = "move";
    try {
      event.dataTransfer.setData("text/plain", key);
    } catch (error) {
      // ignore setData errors in unsupported browsers
    }
    setDraggingKey(key);
  };

  const handleDragOverCard = (event: DragEvent<HTMLDivElement>, key: string) => {
    if (!draggingKey) return;
    event.preventDefault();
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    const offset = event.clientY - rect.top;
    const position: "before" | "after" = offset > rect.height / 2 ? "after" : "before";
    if (dropIndicator?.key !== key || dropIndicator.position !== position) {
      setDropIndicator({ key, position });
    }
  };

  const handleDragLeaveCard = (event: DragEvent<HTMLDivElement>, key: string) => {
    if (!dropIndicator || dropIndicator.key !== key) {
      return;
    }
    const related = event.relatedTarget as Node | null;
    if (related && event.currentTarget.contains(related)) {
      return;
    }
    setDropIndicator(null);
  };

  const handleDropOnCard = (event: DragEvent<HTMLDivElement>, key: string) => {
    event.preventDefault();
    event.stopPropagation();
    if (!draggingKey) {
      setDropIndicator(null);
      return;
    }
    if (draggingKey === key) {
      setDropIndicator(null);
      setDraggingKey(null);
      return;
    }

    const position = dropIndicator?.key === key ? dropIndicator.position : "after";

    setItems((prev) => {
      const fromIndex = prev.findIndex((item) => item.key === draggingKey);
      const targetIndex = prev.findIndex((item) => item.key === key);
      if (fromIndex === -1 || targetIndex === -1) {
        return prev;
      }

      let insertionIndex = position === "after" ? targetIndex + 1 : targetIndex;
      if (fromIndex < insertionIndex) {
        insertionIndex -= 1;
      }

      if (insertionIndex === fromIndex) {
        return prev;
      }

      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(insertionIndex, 0, moved);
      return next;
    });

    setDropIndicator(null);
    setDraggingKey(null);
  };

  const handleDragEnd = () => {
    setDropIndicator(null);
    setDraggingKey(null);
  };

  const handleDragOverContainer = (event: DragEvent<HTMLDivElement>) => {
    if (!draggingKey) return;
    event.preventDefault();
  };

  const handleDropOnContainer = (event: DragEvent<HTMLDivElement>) => {
    if (!draggingKey) return;
    event.preventDefault();
    setItems((prev) => {
      const fromIndex = prev.findIndex((item) => item.key === draggingKey);
      if (fromIndex === -1) {
        return prev;
      }
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.push(moved);
      return next;
    });
    setDropIndicator(null);
    setDraggingKey(null);
  };

  const infoMessage = (() => {
    if (state.status === "success") {
      return { tone: "success" as const, text: state.message };
    }
    if (state.status === "error") {
      return { tone: "error" as const, text: state.message };
    }
    return null;
  })();

  const lastUpdated = formatTimestamp(meta?.updatedAt);

  return (
    <section
      className={`rounded-2xl border border-[var(--color-border)] bg-white/70 p-6 shadow-sm ${className ?? ""}`.trim()}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[var(--color-brand-secondary)]">频道排序与可见性</h2>
          <p className="text-sm text-[var(--color-text-secondary)]">
            按住卡片左侧手柄拖动即可调整顺序，并可随时隐藏频道；保存后普通管理员的配置中心将实时同步变更，支持多次保存。
          </p>
        </div>
        <div className="text-xs text-[var(--color-text-tertiary,#8690a3)]">
          {lastUpdated ? <div>最后更新：{lastUpdated}</div> : null}
          {meta?.updatedBy ? <div>操作人：{meta.updatedBy}</div> : null}
        </div>
      </div>

      <form action={formAction} className="mt-6 space-y-6">
        <input type="hidden" name="payload" value={payloadJson} />
        <div className="sticky top-20 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--color-brand-primary)]/50 bg-white/95 px-4 py-3 shadow-md backdrop-blur supports-[backdrop-filter]:bg-white/80">
          <div className="space-y-1 text-xs text-[var(--color-text-secondary)]">
            <span className="inline-flex items-center gap-2">
              <span className="rounded-full bg-[var(--color-brand-primary)]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-[var(--color-brand-primary)]">
                全局保存
              </span>
              <span className={isDirty ? "font-semibold text-[var(--color-brand-primary)]" : "text-[var(--color-text-tertiary,#8690a3)]"}>
                {isDirty ? "当前排序存在未保存变更" : "暂无未保存的变更"}
              </span>
            </span>
            <span className="block text-[var(--color-text-tertiary,#8690a3)]">
              拖动排序或切换隐藏后，需要点击右侧保存按钮才能同步给所有管理员。
            </span>
            {infoMessage ? (
              <span
                className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-[10px] font-semibold ${
                  infoMessage.tone === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-rose-200 bg-rose-50 text-rose-600"
                }`}
              >
                {infoMessage.text}
              </span>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SaveButton disabled={!isDirty} />
            <button
              type="button"
              onClick={handleReset}
              disabled={!isDirty}
              className="rounded-full border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text-secondary)] transition hover:border-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              恢复初始排序
            </button>
          </div>
        </div>
        <div
          className="max-h-[420px] space-y-3 overflow-auto pr-1"
          onDragOver={handleDragOverContainer}
          onDrop={handleDropOnContainer}
        >
          {items.map((item, index) => {
            const isDragging = draggingKey === item.key;
            const highlightBefore = dropIndicator?.key === item.key && dropIndicator.position === "before";
            const highlightAfter = dropIndicator?.key === item.key && dropIndicator.position === "after";
            return (
              <div
                key={item.key}
                draggable
                onDragStart={(event) => handleDragStart(event, item.key)}
                onDragOver={(event) => handleDragOverCard(event, item.key)}
                onDrop={(event) => handleDropOnCard(event, item.key)}
                onDragLeave={(event) => handleDragLeaveCard(event, item.key)}
                onDragEnd={handleDragEnd}
                className={`relative flex items-center justify-between gap-3 rounded-2xl border bg-white/80 px-4 py-3 shadow-sm transition ${
                  isDragging ? "border-[var(--color-brand-primary)] shadow-md opacity-80" : "border-[var(--color-border)]"
                } ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
              >
                {highlightBefore ? (
                  <span className="absolute inset-x-3 -top-1 h-1 rounded-full bg-[var(--color-brand-primary)]" />
                ) : null}
                {highlightAfter ? (
                  <span className="absolute inset-x-3 -bottom-1 h-1 rounded-full bg-[var(--color-brand-primary)]" />
                ) : null}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-dashed border-[var(--color-border)] text-sm text-[var(--color-text-tertiary,#8690a3)]">
                      ☰
                    </span>
                    <span className="text-sm font-semibold text-[var(--color-brand-secondary)]">{item.key}</span>
                    {item.hidden ? (
                      <span className="inline-flex items-center rounded-full border border-dashed border-[var(--color-border)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--color-text-tertiary,#8690a3)]">
                        已隐藏
                      </span>
                    ) : null}
                  </div>
                  {item.title ? (
                    <p className="mt-1 truncate text-xs text-[var(--color-text-secondary)]">{item.title}</p>
                  ) : null}
                  {item.adminPath ? (
                    <p className="mt-1 truncate text-[10px] text-[var(--color-text-tertiary,#8690a3)]">路径：{item.adminPath}</p>
                  ) : null}
                </div>
                <label className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] px-3 py-1 text-xs text-[var(--color-text-secondary)]">
                  <input
                    type="checkbox"
                    checked={item.hidden}
                    onChange={(event) => handleToggleHidden(index, event.target.checked)}
                    className="h-4 w-4 rounded border-[var(--color-border)] text-[var(--color-brand-primary)] focus:ring-[var(--color-brand-primary)]"
                  />
                  隐藏
                </label>
              </div>
            );
          })}
          {items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-white/60 px-4 py-6 text-center text-sm text-[var(--color-text-secondary)]">
              当前暂无可管理的频道。
            </div>
          ) : null}
        </div>

      </form>
    </section>
  );
}
