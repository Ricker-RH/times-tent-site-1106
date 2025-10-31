"use client";

import { useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";

import type { SiteConfigHistoryRecord } from "@/server/siteConfigHistory";
import type { RestoreSiteConfigVersionState } from "../actions";
import { restoreSiteConfigVersionAction } from "../actions";
import { describeDiff } from "../historyUtils";

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

function RestoreButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center rounded-full border border-[var(--color-border)] px-3 py-1 text-xs font-semibold text-[var(--color-brand-secondary)] transition hover:border-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary)] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "恢复中..." : label}
    </button>
  );
}

function renderDiffSummary(history: SiteConfigHistoryRecord) {
  if (!history.diff.length) {
    return <span className="text-xs text-[var(--color-text-tertiary,#8690a3)]">无字段变化（可能为首次写入或恢复）</span>;
  }

  const maxItems = 6;
  const items = history.diff.slice(0, maxItems);
  return (
    <ul className="space-y-2 text-xs">
      {items.map((entry, index) => (
        <li key={`${history.id}-diff-${index}`} className="rounded-lg bg-[var(--color-surface-muted)]/60 p-2 text-[var(--color-text-secondary)]">
          {describeDiff(history.key, entry.op, entry.path, entry.before, entry.after)}
        </li>
      ))}
      {history.diff.length > maxItems ? (
        <li className="text-[10px] text-[var(--color-text-tertiary,#8690a3)]">…… 其余 {history.diff.length - maxItems} 项已省略</li>
      ) : null}
    </ul>
  );
}

export function ConfigHistoryPanel({
  history,
  configKey,
}: {
  history: SiteConfigHistoryRecord[];
  configKey: string;
}) {
  const router = useRouter();
  const [state, formAction] = useFormState<RestoreSiteConfigVersionState, FormData>(restoreSiteConfigVersionAction, {
    status: "idle",
  });

  useEffect(() => {
    if (state.status === "success") {
      router.refresh();
    }
  }, [state.status, router]);

  return (
    <section className="rounded-2xl border border-[var(--color-border)] bg-white/70 p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[var(--color-brand-secondary)]">修改记录</h2>
          <p className="text-sm text-[var(--color-text-secondary)]">
            仅 superadmin 可查看与回溯，记录 {configKey} 的所有改动。点击恢复后将覆盖当前配置，并生成一条新的版本记录。
          </p>
        </div>
        {state.status === "success" ? (
          <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs text-emerald-600">
            {state.message}
          </div>
        ) : null}
        {state.status === "error" ? (
          <div className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs text-rose-600">
            {state.message}
          </div>
        ) : null}
      </div>

      {history.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-[var(--color-border)] bg-white/60 px-4 py-6 text-center text-sm text-[var(--color-text-secondary)]">
          暂无历史数据。
        </div>
      ) : (
        <ol className="mt-6 space-y-4">
          {history.map((item) => (
            <li
              key={item.id}
              className="rounded-2xl border border-[var(--color-border)] bg-white/80 px-4 py-3 shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1 text-xs text-[var(--color-text-secondary)]">
                  <div>
                    <span className="font-semibold text-[var(--color-brand-secondary)]">{formatTimestamp(item.createdAt)}</span>
                    <span className="mx-2 text-[var(--color-text-tertiary,#8690a3)]">•</span>
                    <span>{item.actorUsername ?? item.actorEmail ?? item.actorId ?? "未知用户"}</span>
                    {item.actorRole ? (
                      <span className="ml-2 rounded-full bg-[var(--color-brand-primary)]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--color-brand-primary)]">
                        {item.actorRole}
                      </span>
                    ) : null}
                  </div>
                  {item.note ? <div>备注：{item.note}</div> : null}
                  {item.sourcePath ? <div>来源路径：{item.sourcePath}</div> : null}
                  <div>动作：{item.action === "restore" ? "恢复" : "更新"}</div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <form action={formAction}>
                    <input type="hidden" name="historyId" value={item.id} />
                    <input type="hidden" name="mode" value="current" />
                    <RestoreButton label="恢复为此版本" />
                  </form>
                  {item.previousValue ? (
                    <form action={formAction}>
                      <input type="hidden" name="historyId" value={item.id} />
                      <input type="hidden" name="mode" value="previous" />
                      <RestoreButton label="恢复到上一版本" />
                    </form>
                  ) : null}
                </div>
              </div>
              <div className="mt-3 rounded-xl bg-[var(--color-surface-muted)]/60 p-3">
                {renderDiffSummary(item)}
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
