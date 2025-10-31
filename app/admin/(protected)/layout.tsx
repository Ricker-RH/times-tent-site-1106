import Image from "next/image";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import type { AdminSession } from "@/server/auth";
import { AdminRedirectError, requireAdmin } from "@/server/auth";
import { createNavigationItems, getAdminChannelSettings } from "@/server/adminChannels";
import { listSiteConfigSummaries } from "@/server/siteConfigs";
import { WatermarkOverlay } from "./WatermarkOverlay";
import { cookies } from "next/headers";
import AdminLocaleRoot from "./AdminLocaleRoot";
import AdminWatermarkToggle from "./AdminWatermarkToggle";

export const metadata: Metadata = {
  title: "配置中心 | TIMES TENT",
  description: "管理站点各频道的内容配置。",
};

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  let session: AdminSession;
  try {
    session = await requireAdmin();
  } catch (error) {
    if (error instanceof AdminRedirectError) {
      return redirect(error.location);
    }
    throw error;
  }
  const [summaries, channelSettings] = await Promise.all([
    listSiteConfigSummaries(),
    getAdminChannelSettings(),
  ]);

  const dynamicNavItems = createNavigationItems(summaries, channelSettings);
  const navItems = [
    { label: "总览", href: "/admin" },
    ...dynamicNavItems,
    { label: "提交记录", href: "/admin/submissions" },
  ];

  const identityLabel = session.username ?? session.email ?? "管理员";
  const roleLabel = session.role === "superadmin" ? "superadmin" : "admin";
  const isSuperadmin = session.role === "superadmin";
  const now = new Date();
  const formatTwoDigits = (value: number) => value.toString().padStart(2, "0");
  const dateLabel = [
    now.getFullYear(),
    formatTwoDigits(now.getMonth() + 1),
    formatTwoDigits(now.getDate()),
    formatTwoDigits(now.getHours()),
    formatTwoDigits(now.getMinutes()),
  ].join("-");

  // Watermark visibility switch: env defaults + superadmin local override
  const watermarkEnabled = process.env.ENABLE_ADMIN_WATERMARK === "true";
  const allowedRolesEnv = process.env.ADMIN_WATERMARK_ROLES ?? ""; // e.g. "superadmin,admin"
  const allowedRoles = allowedRolesEnv
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const cookieEnabled = cookies().get("ADMIN_WATERMARK_OVERRIDE")?.value === "true";
  const shouldRenderWatermark =
    (watermarkEnabled && (allowedRoles.length === 0 || allowedRoles.includes(session.role))) ||
    (isSuperadmin && cookieEnabled);

  return (
    <div className="relative min-h-screen bg-[var(--color-background)] text-[var(--color-foreground)]">
      {shouldRenderWatermark && (
        <WatermarkOverlay username={identityLabel} roleLabel={roleLabel} dateLabel={dateLabel} />
      )}
      <header className="border-b border-[var(--color-border)] bg-white/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-6 px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/admin" className="flex items-center gap-3 text-[var(--color-brand-secondary)]">
            <span className="inline-flex items-center justify-center rounded-2xl bg-[var(--color-brand-primary)]/10 px-4 py-2">
              <Image src="/logo-horizontal.png" alt="TIMES TENT" width={120} height={40} className="h-8 w-auto" />
            </span>
            <span className="sr-only">总览</span>
          </Link>
          <nav className="hidden flex-1 items-center justify-end gap-4 overflow-x-auto whitespace-nowrap text-sm text-[var(--color-text-secondary)] sm:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full px-3 py-1 transition hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-brand-primary)]"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <AdminLocaleRoot>{children}</AdminLocaleRoot>
        <div className="mt-8 flex justify-end">
          <AdminWatermarkToggle isSuperadmin={isSuperadmin} />
        </div>
      </main>
    </div>
  );
}
