import Image from "next/image";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentAdmin } from "@/server/auth";
import { query } from "@/server/db";

import { LoginForm } from "./LoginForm";
import { SupportContact } from "./SupportContact";

export const metadata: Metadata = {
  title: "登录配置中心 | TIMES TENT",
  description: "进入 TIMES TENT 配置中心，管理站点内容。",
};

export const dynamic = "force-dynamic";

function resolveRedirect(target?: string): string {
  if (target && target.startsWith("/")) {
    return target;
  }
  return "/admin";
}

export default async function AdminLoginPage({ searchParams }: { searchParams?: { next?: string; reason?: string } }) {
  const current = await getCurrentAdmin();
  const next = typeof searchParams?.next === "string" ? searchParams.next : undefined;
  const reason = typeof searchParams?.reason === "string" ? searchParams.reason : undefined;

  let currentIsActive = false;
  try {
    if (current?.username && current?.jti) {
      const { rows } = await query<{ jti: string }>(
        `SELECT jti FROM admin_session_locks WHERE username = $1 LIMIT 1`,
        [current.username]
      );
      const activeJti = rows[0]?.jti;
      currentIsActive = Boolean(activeJti && activeJti === current.jti);
    }
  } catch {}

  if (currentIsActive && reason !== "conflict") {
    redirect(resolveRedirect(next));
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0f1116] px-4 py-16 text-white">
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_top,rgba(216,34,52,0.18),transparent_58%)]" />
      <div className="absolute inset-0 z-10 bg-[radial-gradient(circle_at_bottom_right,rgba(16,17,22,0),rgba(16,17,22,0.92))]" />
      <div className="pointer-events-none absolute inset-0 z-20 opacity-40" style={{
        backgroundImage:
          "linear-gradient(120deg,rgba(255,255,255,0.04) 0,rgba(255,255,255,0.04) 1px,transparent 1px,transparent 60px), linear-gradient(210deg,rgba(255,255,255,0.03) 0,rgba(255,255,255,0.03) 1px,transparent 1px,transparent 60px)",
        backgroundSize: "60px 60px",
      }} />
      <div
        className="pointer-events-none absolute bottom-[-20%] left-1/2 z-20 h-[420px] w-[820px] -translate-x-1/2 opacity-70"
        style={{
          background: "linear-gradient(180deg, rgba(216,34,52,0.75), rgba(16,17,23,0.2))",
          clipPath: "polygon(0% 100%, 12% 40%, 24% 68%, 36% 30%, 52% 60%, 66% 24%, 80% 62%, 92% 35%, 100% 80%, 100% 100%)",
          filter: "blur(0.5px)",
        }}
      />
      <div
        className="pointer-events-none absolute bottom-[-35%] left-1/2 z-10 h-[480px] w-[980px] -translate-x-1/2 opacity-35"
        style={{
          background: "linear-gradient(180deg, rgba(216,34,52,0.35), rgba(16,17,23,0.95))",
          clipPath: "polygon(0% 100%, 8% 55%, 18% 68%, 30% 36%, 44% 55%, 60% 28%, 76% 58%, 88% 45%, 100% 70%, 100% 100%)",
        }}
      />
      <div className="pointer-events-none absolute right-[8%] top-[12%] z-30 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(216,34,52,0.45),rgba(216,34,52,0))] blur-3xl" />
      <div
        className="pointer-events-none absolute left-[-12%] top-[24%] z-20 h-[540px] w-[540px] rounded-full"
        style={{
          background:
            "radial-gradient(circle at center, rgba(39,43,55,0.45), rgba(12,14,18,0.05)), repeating-radial-gradient(circle at center, rgba(216,34,52,0.14) 0 24px, transparent 24px 48px), repeating-conic-gradient(from 0deg, rgba(255,255,255,0.08) 0deg 6deg, transparent 6deg 12deg)",
          border: "1px solid rgba(216,34,52,0.35)",
          boxShadow: "0 60px 120px rgba(216,34,52,0.18), inset -30px -45px 65px rgba(9,10,14,0.65)",
          opacity: 0.85,
          maskImage: "radial-gradient(circle at 65% 50%, rgba(0,0,0,1) 0 68%, rgba(0,0,0,0.9) 74%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(circle at 65% 50%, rgba(0,0,0,1) 0 68%, rgba(0,0,0,0.9) 74%, transparent 100%)",
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute left-[12%] top-[16%] z-30 h-32 w-44"
        style={{
          background: "linear-gradient(140deg, rgba(216,34,52,0.85), rgba(216,34,52,0.55))",
          clipPath: "polygon(50% 0%, 100% 85%, 85% 85%, 72% 100%, 28% 100%, 15% 85%, 0% 85%)",
          boxShadow: "0 28px 45px rgba(216,34,52,0.22)",
          opacity: 0.9,
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute right-[10%] bottom-[30%] z-25 h-36 w-36"
        style={{
          background:
            "radial-gradient(circle, rgba(16,17,22,1) 0 35%, transparent 38%), repeating-conic-gradient(from 0deg, rgba(216,34,52,0.7) 0deg 12deg, transparent 12deg 24deg)",
          borderRadius: "50%",
          maskImage: "radial-gradient(circle, rgba(0,0,0,1) 0 65%, transparent 68%)",
          WebkitMaskImage: "radial-gradient(circle, rgba(0,0,0,1) 0 65%, transparent 68%)",
          filter: "drop-shadow(0 18px 35px rgba(216,34,52,0.25))",
          opacity: 0.65,
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute right-[30%] top-[18%] z-25 h-44 w-44 rounded-full"
        style={{
          background:
            "radial-gradient(circle at center, rgba(216,34,52,0.28), rgba(16,17,22,0.05)), linear-gradient(90deg, rgba(255,255,255,0.18) 1px, transparent 1px), linear-gradient(0deg, rgba(255,255,255,0.12) 1px, transparent 1px)",
          backgroundSize: "100% 100%, 16px 16px, 16px 16px",
          mixBlendMode: "screen",
          border: "1px solid rgba(216,34,52,0.25)",
          boxShadow: "0 20px 40px rgba(216,34,52,0.18)",
        }}
        aria-hidden
      />

      <div className="relative z-40 mx-auto flex w-full max-w-[1100px] flex-col items-center gap-8 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-xl space-y-4 text-center lg:text-left">
          <p className="inline-flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.55em] text-[#d82234]">
            TIMES TENT
            <span className="hidden h-px w-12 bg-[#d82234]/50 lg:block" aria-hidden />
          </p>
          <h1 className="text-3xl font-semibold text-white md:text-4xl">
            全球模块化篷房运营中心
          </h1>
          <p className="text-sm leading-7 text-white/70 md:text-base">
            覆盖体育赛事、文旅展会与国际化仓储场景的内容配置平台。登录后即可实时管理站点数据，联动全国项目交付节奏。
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-white/60 lg:justify-start">
            <span className="rounded-full border border-white/10 px-3 py-1 uppercase tracking-[0.25em]">Modular Tent</span>
            <span className="rounded-full border border-white/10 px-3 py-1 uppercase tracking-[0.25em]">Tech Ops</span>
            <span className="rounded-full border border-white/10 px-3 py-1 uppercase tracking-[0.25em]">Global Delivery</span>
          </div>
        </div>

        <div className="w-full max-w-md">
          <div className="relative overflow-hidden rounded-3xl border border-white/20 bg-white/85 p-8 shadow-[0_14px_36px_rgba(8,10,16,0.35)] backdrop-blur">
            <div className="absolute -right-16 -top-16 h-36 w-36 rounded-full bg-[radial-gradient(circle,rgba(216,34,52,0.25),rgba(216,34,52,0))]" />
            <div className="absolute -left-12 bottom-[-40px] h-32 w-32 rounded-full bg-[radial-gradient(circle,rgba(18,21,28,0.25),rgba(18,21,28,0))]" />
            <div className="relative space-y-6">
              <div className="space-y-2 text-center">
                <Image
                  src="/logo-horizontal.png"
                  alt="TIMES TENT 时代篷房"
                  width={200}
                  height={64}
                  priority
                  className="mx-auto h-12 w-auto"
                />
                <h2 className="text-lg font-semibold text-[var(--color-brand-secondary)] md:text-xl">配置中心登录</h2>
                <p className="text-xs text-[var(--color-text-secondary)]">使用后台账号密码进入管理界面</p>
              </div>
              {reason === "conflict" ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
                  您的账号已在另一设备登录，本设备已被退出。请重新登录以继续使用。
                </div>
              ) : null}
              <LoginForm next={next} />
              <SupportContact />
              <div className="text-center text-xs text-[var(--color-text-tertiary,#8690a3)]">
                <Link href="/" className="text-[var(--color-brand-primary)] hover:underline">
                  返回网站首页
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
