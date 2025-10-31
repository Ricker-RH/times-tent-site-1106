import Link from "next/link";

import { AdminChannelSettingsPanel } from "./AdminChannelSettingsPanel";
import { LogoutButton } from "./LogoutButton";
import { VISIBILITY_CONFIG_KEY } from "@/constants/visibility";
import { getCurrentAdmin } from "@/server/auth";
import { getAdminChannelSettings, resolveAdminChannels } from "@/server/adminChannels";
import { listSiteConfigSummaries } from "@/server/siteConfigs";
import { listRecentSiteConfigHistory } from "@/server/siteConfigHistory";
import { RecentHistoryPanel } from "./RecentHistoryPanel";

export const dynamic = "force-dynamic";

function formatDate(value?: string): string {
  if (!value) return "--";
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

export default async function AdminDashboardPage() {
  const [session, summaries, channelSettings] = await Promise.all([
    getCurrentAdmin(),
    listSiteConfigSummaries(),
    getAdminChannelSettings(),
  ]);

  const isSuperAdmin = session?.role === "superadmin";
  const channelsForEditor = resolveAdminChannels(summaries, channelSettings, { includeHidden: true });
  const restrictedKeys = new Set<string>([VISIBILITY_CONFIG_KEY]);
  const visibleChannels = isSuperAdmin
    ? channelsForEditor
    : channelsForEditor.filter((channel) => !channel.hidden && !restrictedKeys.has(channel.key));
  const channelSettingsMeta = channelSettings?._meta
    ? {
        updatedAt: channelSettings._meta.updatedAt,
        updatedBy: channelSettings._meta.updatedBy,
      }
    : undefined;
  const identityLabel = session?.email ?? session?.username ?? "管理员";
  const roleLabel = session?.role === "superadmin" ? "Superadmin" : "Admin";
  const recentHistory = isSuperAdmin ? await listRecentSiteConfigHistory(100) : [];

  return (
    <div className="space-y-12">
      <header className="space-y-4">
        <p className="inline-flex items-center rounded-full bg-[var(--color-brand-primary)]/10 px-3 py-1 text-xs font-semibold text-[var(--color-brand-primary)]">
          配置中心
        </p>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold text-[var(--color-brand-secondary)]">频道配置总览</h1>
            <p className="max-w-2xl text-sm text-[var(--color-text-secondary)]">
              查看并管理各频道的内容 JSON。点击卡片进入编辑详情，提交后内容将实时写入数据库。
            </p>
            {isSuperAdmin ? (
              <div className="mt-2">
                <Link href="/admin/users" className="inline-flex items-center rounded-full border border-[var(--color-border)] bg-white/70 px-3 py-1 text-xs text-[var(--color-brand-secondary)] hover:border-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary)]">
                  管理员账号
                </Link>
              </div>
            ) : null}
          </div>
          <div className="flex items-center gap-3 rounded-full border border-[var(--color-border)] bg-white/70 px-4 py-2 text-xs text-[var(--color-text-secondary)]">
            <span className="font-semibold text-[var(--color-brand-secondary)]">{identityLabel}</span>
            <span className="rounded-full bg-[var(--color-brand-primary)]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--color-brand-primary)]">
              {roleLabel}
            </span>
            <LogoutButton username={identityLabel} role={session?.role ?? "admin"} showIdentity={false} />
          </div>
        </div>
      </header>

      {isSuperAdmin ? (
        <section className="grid gap-8 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] xl:items-start">
          <AdminChannelSettingsPanel
            channels={channelsForEditor.map((channel) => ({
              key: channel.key,
              title: channel.title,
              adminPath: channel.adminPath,
              hidden: channel.hidden,
            }))}
            meta={channelSettingsMeta}
            className="h-full"
          />
          <RecentHistoryPanel
            records={recentHistory}
            className="h-full xl:sticky xl:top-24 xl:z-20"
          />
        </section>
      ) : null}

      <section>
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {visibleChannels.map((item) => (
            <Link
              key={item.key}
              href={`/admin/${encodeURIComponent(item.key)}`}
              className={`group flex h-full flex-col justify-between rounded-2xl border border-[var(--color-border)] bg-white/80 p-6 shadow-sm transition hover:-translate-y-1 hover:border-[var(--color-brand-primary)] hover:shadow-lg ${item.hidden ? "opacity-60 hover:opacity-80" : ""}`}
            >
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="inline-flex w-fit items-center rounded-full bg-[var(--color-brand-primary)]/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-brand-primary)]">
                    {item.key}
                  </span>
                  {item.hidden ? (
                    <span className="inline-flex items-center rounded-full border border-dashed border-[var(--color-border)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--color-text-tertiary,#8690a3)]">
                      已隐藏
                    </span>
                  ) : null}
                </div>
                <h2 className="text-xl font-semibold text-[var(--color-brand-secondary)]">
                  {item.title ?? "未设置标题"}
                </h2>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  {item.adminPath ? `路径：${item.adminPath}` : "可编辑 JSON 配置"}
                </p>
              </div>
              <div className="mt-6 flex items-center justify-between text-xs text-[var(--color-text-tertiary,#8690a3)]">
                <span>最近更新</span>
                <span>{formatDate(item.updatedAt)}</span>
              </div>
            </Link>
          ))}
        </div>
        {visibleChannels.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-white/60 p-10 text-center text-sm text-[var(--color-text-secondary)]">
            暂无数据库配置，请先通过 SQL 添加一条记录。
          </div>
        ) : null}
      </section>
    </div>
  );
}
