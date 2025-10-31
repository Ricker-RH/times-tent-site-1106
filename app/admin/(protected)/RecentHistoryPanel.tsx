"use client";

import { useMemo, useState } from "react";

import type { SiteConfigHistoryRecord } from "@/server/siteConfigHistory";
import { describeDiff } from "./historyUtils";

function formatTimestamp(value: string): string {
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

export function RecentHistoryPanel({
  records,
  className,
}: {
  records: SiteConfigHistoryRecord[];
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [filterKey, setFilterKey] = useState<string | null>(null);
  const [dialogMode, setDialogMode] = useState<"all" | "category">("all");
  const sortedRecords = useMemo(
    () =>
      [...records].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [records],
  );
  const grouped = useMemo(() => {
    const map = new Map<string, { key: string; count: number; latest: SiteConfigHistoryRecord }>();
    for (const record of sortedRecords) {
      const entry = map.get(record.key);
      if (entry) {
        entry.count += 1;
        if (new Date(record.createdAt).getTime() > new Date(entry.latest.createdAt).getTime()) {
          entry.latest = record;
        }
      } else {
        map.set(record.key, { key: record.key, count: 1, latest: record });
      }
    }
    return Array.from(map.values()).sort((a, b) =>
      new Date(b.latest.createdAt).getTime() - new Date(a.latest.createdAt).getTime(),
    );
  }, [sortedRecords]);

  const topGroups = grouped.slice(0, 6);

  const filteredRecords = useMemo(() => {
    if (dialogMode === "category" && filterKey) {
      return sortedRecords.filter((record) => record.key === filterKey);
    }
    return sortedRecords;
  }, [sortedRecords, dialogMode, filterKey]);
  return (
    <section
      className={`rounded-2xl border border-[var(--color-border)] bg-white/70 p-6 shadow-sm ${className ?? ""}`.trim()}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[var(--color-brand-secondary)]">最近修改记录</h2>
          <p className="text-xs text-[var(--color-text-secondary)]">
            汇总最新 100 条配置变更，分类展示；点击查看详细历史。
          </p>
        </div>
        {records.length ? (
          <button
            type="button"
            onClick={() => {
              setFilterKey(null);
              setDialogMode("all");
              setOpen(true);
            }}
            className="rounded-full border border-[var(--color-brand-primary)] px-4 py-1.5 text-xs font-semibold text-[var(--color-brand-primary)] transition hover:bg-[var(--color-brand-primary)]/10"
          >
            查看全部记录
          </button>
        ) : null}
      </div>

      {records.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-[var(--color-border)] bg-white/60 px-4 py-6 text-center text-sm text-[var(--color-text-secondary)]">
          暂无历史数据，等待首次修改后自动生成。
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          {topGroups.map((group) => (
            <button
              key={group.key}
              type="button"
              onClick={() => {
                setFilterKey(group.key);
                setDialogMode("category");
                setOpen(true);
              }}
              className="space-y-3 rounded-2xl border border-[var(--color-border)] bg-white/80 p-4 text-left shadow-sm transition hover:border-[var(--color-brand-primary)] hover:shadow-lg"
            >
              <div className="text-sm font-semibold text-[var(--color-brand-secondary)]">{group.key}</div>
              <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-tertiary,#8690a3)]">
                <span>最近：{formatTimestamp(group.latest.createdAt)}</span>
                <span>
                  操作人：{group.latest.actorUsername ?? group.latest.actorEmail ?? group.latest.actorId ?? "未知"}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-10" onClick={() => setOpen(false)}>
          <div
            className="relative flex w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] px-6 py-4">
              <div>
                <h3 className="text-base font-semibold text-[var(--color-brand-secondary)]">
                  {dialogMode === "category" && filterKey ? `${filterKey} · 最近记录` : "全部修改记录"}
                </h3>
                <p className="text-xs text-[var(--color-text-secondary)]">展示完整的修改明细、操作人及时间信息</p>
              </div>
              <div className="flex items-center gap-3">
                {dialogMode === "category" ? (
                  <button
                    type="button"
                    onClick={() => {
                      setFilterKey(null);
                      setDialogMode("all");
                    }}
                    className="rounded-full border border-[var(--color-brand-primary)] px-3 py-1 text-xs font-semibold text-[var(--color-brand-primary)] transition hover:bg-[var(--color-brand-primary)]/10"
                  >
                    查看全部记录
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="text-sm font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-brand-primary)]"
                >
                  关闭
                </button>
              </div>
            </header>
            <div className="max-h-[70vh] overflow-y-auto divide-y divide-[var(--color-border)]">
              {filteredRecords.map((record) => (
                <div key={record.id} className="space-y-3 px-6 py-4 text-sm text-[var(--color-text-secondary)]">
                  <div className="text-sm font-semibold text-[var(--color-brand-secondary)]">{record.key}</div>
                  <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-[var(--color-text-tertiary,#8690a3)]">
                    <span>时间：{formatTimestamp(record.createdAt)}</span>
                    <span>
                      操作人：{record.actorUsername ?? record.actorEmail ?? record.actorId ?? "未知"}
                    </span>
                    {record.actorRole ? (
                      <span className="rounded-full bg-[var(--color-brand-primary)]/10 px-2 py-0.5 text-[10px] font-semibold text-[var(--color-brand-primary)]">
                        {record.actorRole}
                      </span>
                    ) : null}
                  </div>
                  <div className="space-y-1 text-xs text-[var(--color-text-secondary)]">
                    <div>动作：{record.action === "restore" ? "恢复版本" : "更新配置"}</div>
                    {record.note ? <div>备注：{record.note}</div> : null}
                    {record.sourcePath ? <div>来源：{record.sourcePath}</div> : null}
                  </div>
                  <div className="rounded-xl bg-[var(--color-surface-muted)]/60 p-3 text-xs text-[var(--color-text-secondary)]">
                    {record.diff.length ? (
                      <ul className="space-y-1">
                        {record.diff.map((entry, index) => (
                          <li key={`${record.id}-detail-${index}`}>{describeDiff(record.key, entry.op, entry.path, entry.before, entry.after)}</li>
                        ))}
                      </ul>
                    ) : (
                      <span>无字段变化（可能为恢复操作或初始化记录）。</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
