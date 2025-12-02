import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "账号冲突 | TIMES TENT",
  description: "您的账号已在另一设备登录，本设备已被退出。",
};

function resolveLogin(reason?: string, next?: string): string {
  const params = new URLSearchParams();
  if (reason) params.set("reason", reason);
  if (next && next.startsWith("/")) params.set("next", next);
  const qs = params.toString();
  return qs ? `/admin/login?${qs}` : "/admin/login";
}

export default function ConflictPage({ searchParams }: { searchParams?: { next?: string } }) {
  const next = typeof searchParams?.next === "string" ? searchParams.next : "/admin";
  const login = resolveLogin(undefined, next);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0f1116] px-4">
      <div className="w-full max-w-md rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-800 shadow">
        <h1 className="text-lg font-semibold">账号在另一设备登录</h1>
        <p className="mt-2 text-sm">您的账号已在另一设备登录，本设备已被退出。请确认并重新登录以继续使用。</p>
        <div className="mt-4 flex gap-3">
          <Link href={login} className="rounded-full bg-[var(--color-brand-primary)] px-5 py-2 text-sm font-semibold text-white">
            确认并前往登录
          </Link>
          <Link href="/" className="rounded-full border border-[var(--color-border)] px-5 py-2 text-sm text-[var(--color-text-secondary)]">
            返回首页
          </Link>
        </div>
        <p className="mt-3 text-xs text-[var(--color-text-tertiary,#8690a3)]">重新登录后将仅允许一个设备在线。</p>
      </div>
    </div>
  );
}
