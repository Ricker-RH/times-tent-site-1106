import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";

import { requireAdmin } from "@/server/auth";
import { query } from "@/server/db";
import { getLastLoginActivity } from "@/server/adminActivity";
import { verifyHumanAction, resetAdminUserPassword, setAdminUserActive, renameAdminUser } from "./actions";

type AdminDetail = {
  username: string;
  role: string | null;
  is_active: boolean | null;
  created_at?: Date;
};

async function fetchAdminDetail(username: string): Promise<AdminDetail | null> {
  try {
    const { rows } = await query<AdminDetail>(
      `SELECT username, role, "isActive" AS is_active, created_at FROM admin_users WHERE username = $1 LIMIT 1`,
      [username],
    );
    if (rows.length) return rows[0];
  } catch {
    try {
      const { rows } = await query<AdminDetail>(
        `SELECT username, role, "isActive" AS is_active FROM admin_users WHERE username = $1 LIMIT 1`,
        [username],
      );
      if (rows.length) return rows[0];
    } catch {}
  }
  return null;
}

async function fetchEditCount(username: string): Promise<number> {
  try {
    const { rows } = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM site_config_history WHERE actor_username = $1`,
      [username],
    );
    const value = rows[0]?.count;
    return value ? Number(value) : 0;
  } catch {
    return 0;
  }
}

export const dynamic = "force-dynamic";

export default async function AdminUserDetailPage({ params, searchParams }: { params: { username: string }, searchParams?: Record<string, string | string[] | undefined> }) {
  await requireAdmin({ role: "superadmin" });

  const username = Array.isArray(params.username) ? params.username[0] : params.username;
  if (!username) redirect("/admin/users");

  const verifiedParam = (typeof searchParams?.verified === "string" ? searchParams?.verified : Array.isArray(searchParams?.verified) ? searchParams?.verified?.[0] : undefined) === "1";
  const cookieStore = cookies();
  const verifiedCookie = cookieStore.get("tt_admin_detail_verified")?.value === "1";
  const verified = verifiedParam || verifiedCookie;

  if (!verified) {
    return (
      <div className="space-y-8">
        <Link href="/admin/users" className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-text-secondary)] transition hover:text-[var(--color-brand-primary)]">
          ← 返回管理员列表
        </Link>
        <header className="space-y-3">
          <h1 className="text-2xl font-semibold text-[var(--color-brand-secondary)]">真人验证</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">为保护管理员隐私，请完成下方验证后查看 {username} 的详细信息。</p>
        </header>
        <HumanVerifyForm username={username} />
      </div>
    );
  }

  const [detail, lastLogin, edits] = await Promise.all([
    fetchAdminDetail(username),
    getLastLoginActivity(username),
    fetchEditCount(username),
  ]);

  return (
    <div className="space-y-10">
      <div className="space-y-4">
        <Link href="/admin/users" className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-text-secondary)] transition hover:text-[var(--color-brand-primary)]">
          ← 返回管理员列表
        </Link>
        <div className="flex items-center gap-2">
          <span className="inline-flex w-fit items-center rounded-full bg-[var(--color-brand-primary)]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-brand-primary)]">
            管理员详情
          </span>
          <span className="text-xs text-[var(--color-text-tertiary,#8690a3)]">{username}</span>
        </div>
        <h1 className="text-3xl font-semibold text-[var(--color-brand-secondary)]">{username}</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">查看管理员的基础信息与活动记录。</p>
      </div>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-[var(--color-border)] bg-white/80 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[var(--color-brand-secondary)]">基础信息</h2>
          <ul className="mt-3 space-y-2 text-sm text-[var(--color-text-secondary)]">
            <li>账号名称：{detail?.username ?? username}</li>
            <li>权限：{detail?.role === "superadmin" ? "Superadmin" : "Admin"}</li>
            <li>状态：{detail?.is_active === false ? "已停用" : "启用"}</li>
            <li>注册时间：{detail?.created_at ? new Date(detail.created_at).toLocaleString("zh-CN") : "--"}</li>
            <li>最近登录时间：{lastLogin?.time ? new Date(lastLogin.time!).toLocaleString("zh-CN") : "--"}</li>
            <li>最近登录地址：{lastLogin?.ip ?? "--"}</li>
            <li>编辑次数：{edits}</li>
            <li>密码：不显示明文，支持下方重置</li>
          </ul>
        </div>
        <div className="rounded-2xl border border-[var(--color-border)] bg-white/80 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[var(--color-brand-secondary)]">重置密码</h2>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">仅 superadmin 可重置该管理员密码。</p>
          <ResetPasswordForm username={username} />
        </div>
        <div className="rounded-2xl border border-[var(--color-border)] bg-white/80 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[var(--color-brand-secondary)]">启用/停用</h2>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">更改该账户的启用状态。</p>
          <SetActiveForm username={username} active={detail?.is_active !== false} />
        </div>
        <div className="rounded-2xl border border-[var(--color-border)] bg-white/80 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[var(--color-brand-secondary)]">修改账户名称</h2>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">重命名用户名（3–50 字符）。</p>
          <RenameForm username={username} />
        </div>
      </section>
    </div>
  );
}

async function HumanVerifyForm({ username }: { username: string }) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const code = Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
  const lines = Array.from({ length: 6 }, () => ({
    x1: Math.floor(Math.random() * 160),
    y1: Math.floor(Math.random() * 50),
    x2: Math.floor(Math.random() * 160),
    y2: Math.floor(Math.random() * 50),
    opacity: (Math.random() * 0.6 + 0.2).toFixed(2),
  }));
  const chars = code.split("").map((ch, i) => ({
    char: ch,
    x: 10 + i * 25 + Math.floor(Math.random() * 8),
    y: 35 + Math.floor(Math.random() * 6) - 3,
    rotate: Math.floor(Math.random() * 40) - 20,
  }));
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="160" height="50">
      <defs>
        <filter id="noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" result="noise" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
      </defs>
      <rect width="160" height="50" fill="#f7f9fc" />
      ${lines
        .map(
          (l) => `<line x1="${l.x1}" y1="${l.y1}" x2="${l.x2}" y2="${l.y2}" stroke="#9aa7b2" stroke-width="1" opacity="${l.opacity}" />`,
        )
        .join("")}
      ${chars
        .map(
          (c) => `<text x="${c.x}" y="${c.y}" transform="rotate(${c.rotate}, ${c.x}, ${c.y})" font-family="monospace" font-size="24" fill="#334155">${c.char}</text>`,
        )
        .join("")}
    </svg>
  `;
  const hash = await bcrypt.hash(code, 10);
  return (
    <form action={verifyHumanAction} method="post" className="space-y-6">
      <input type="hidden" name="username" value={username} />
      {/* hash is generated server-side to avoid storing state */}
      <input type="hidden" name="hash" value={hash} />
      <label className="block text-sm font-medium text-[var(--color-brand-secondary)]">请输入图形验证码</label>
      <div className="flex items-center gap-4">
        <div className="rounded-lg border border-[var(--color-border)] bg-white p-1" dangerouslySetInnerHTML={{ __html: svg }} />
        <input name="answer" className="w-40 rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm focus:border-[var(--color-brand-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/30" required placeholder="输入上方 6 位字符（不区分大小写）" />
      </div>
      <button type="submit" className="rounded-full bg-[var(--color-brand-primary)] px-5 py-3 text-sm font-semibold text-white">提交验证</button>
      <p className="text-xs text-[var(--color-text-tertiary,#8690a3)]">每次进入详情都需验证。</p>
    </form>
  );
}

function ResetPasswordForm({ username }: { username: string }) {
  return (
    <form action={resetAdminUserPassword} className="mt-4 space-y-4">
      <input type="hidden" name="username" value={username} />
      <div className="space-y-2">
        <label className="block text-sm font-medium text-[var(--color-brand-secondary)]" htmlFor="new-password">新密码</label>
        <input id="new-password" name="password" type="password" required className="w-full rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm focus:border-[var(--color-brand-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/30" placeholder="请输入新密码（6–100 位）" />
      </div>
      <button type="submit" className="rounded-full bg-[var(--color-brand-primary)] px-5 py-3 text-sm font-semibold text-white">确认重置</button>
      <p className="text-xs text-[var(--color-text-tertiary,#8690a3)]">重置后请通知该管理员尽快登录并修改个人密码。</p>
    </form>
  );
}

function SetActiveForm({ username, active }: { username: string; active: boolean }) {
  return (
    <form action={setAdminUserActive} className="mt-4 space-y-4">
      <input type="hidden" name="username" value={username} />
      <div className="space-y-2">
        <label className="block text-sm font-medium text-[var(--color-brand-secondary)]">状态</label>
        <select name="active" defaultValue={active ? "true" : "false"} className="w-full rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm focus:border-[var(--color-brand-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/30">
          <option value="true">启用</option>
          <option value="false">停用</option>
        </select>
      </div>
      <button type="submit" className="rounded-full bg-[var(--color-brand-primary)] px-5 py-3 text-sm font-semibold text-white">保存状态</button>
    </form>
  );
}

function RenameForm({ username }: { username: string }) {
  return (
    <form action={renameAdminUser} className="mt-4 space-y-4">
      <input type="hidden" name="username" value={username} />
      <div className="space-y-2">
        <label className="block text-sm font-medium text-[var(--color-brand-secondary)]" htmlFor="next-username">新用户名</label>
        <input id="next-username" name="nextUsername" required minLength={3} maxLength={50} className="w-full rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm focus:border-[var(--color-brand-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/30" placeholder="输入新用户名" />
      </div>
      <button type="submit" className="rounded-full bg-[var(--color-brand-primary)] px-5 py-3 text-sm font-semibold text-white">确认重命名</button>
    </form>
  );
}
