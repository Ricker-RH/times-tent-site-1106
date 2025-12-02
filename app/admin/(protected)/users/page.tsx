import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";

import { requireAdmin } from "@/server/auth";
import { query } from "@/server/db";
import AdminUserCreateForm from "./AdminUserCreateForm";
import { updateAdminUserRole, deleteAdminUser } from "./actions";

export const metadata: Metadata = {
  title: "管理员账号管理 | TIMES TENT",
  description: "创建与查看管理员账号，仅 superadmin 可访问。",
};

export const dynamic = "force-dynamic";

type AdminUserSummary = {
  username: string;
  role: string | null;
  is_active: boolean | null;
};

async function listAdminUsers(): Promise<AdminUserSummary[]> {
  try {
    const { rows } = await query<AdminUserSummary>(
      `SELECT username, role, "isActive" AS is_active FROM admin_users ORDER BY role DESC, username ASC`
    );
    return rows;
  } catch (error) {
    console.error("Failed to list admin users", error);
    return [];
  }
}

export default async function AdminUsersPage() {
  await requireAdmin({ role: "superadmin" });

  const users = await listAdminUsers();

  return (
    <div className="space-y-10">
      <header className="space-y-3">
        <p className="inline-flex items-center rounded-full bg-[var(--color-brand-primary)]/10 px-3 py-1 text-xs font-semibold text-[var(--color-brand-primary)]">
          管理员账号
        </p>
        <h1 className="text-2xl font-semibold text-[var(--color-brand-secondary)]">创建与管理管理员</h1>
        <p className="max-w-2xl text-sm text-[var(--color-text-secondary)]">
          仅 superadmin 可创建新的管理员账号。创建后可使用该用户名与密码登录配置中心。
        </p>
      </header>

      <section className="grid gap-8 xl:grid-cols-2 xl:items-start">
        <div className="space-y-6">
          <div className="rounded-2xl border border-[var(--color-border)] bg-white/80 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[var(--color-brand-secondary)]">注册新管理员</h2>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">默认角色为 admin，可选择创建为 superadmin。</p>
            <div className="mt-6">
              <AdminUserCreateForm />
            </div>
          </div>
        </div>
        <div className="space-y-6">
          <div className="rounded-2xl border border-[var(--color-border)] bg-white/80 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[var(--color-brand-secondary)]">现有管理员</h2>
            {users.length ? (
              <div className="mt-4 divide-y divide-[var(--color-border)]">
                {users.map((user) => (
                  <div key={user.username} className="flex items-center justify-between py-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-[var(--color-brand-secondary)]">{user.username}</span>
                        <span className="rounded-full bg-[var(--color-brand-primary)]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--color-brand-primary)]">
                          {user.role === "superadmin" ? "Superadmin" : "Admin"}
                        </span>
                        {user.is_active === false ? (
                          <span className="inline-flex items-center rounded-full border border-dashed border-[var(--color-border)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--color-text-tertiary,#8690a3)]">
                            已停用
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {user.role !== "superadmin" ? (
                        <form action={updateAdminUserRole} className="inline-flex items-center gap-2">
                          <input type="hidden" name="username" value={user.username} />
                          <input type="hidden" name="role" value="superadmin" />
                          <button
                            type="submit"
                            className="rounded-full border border-[var(--color-border)] px-3 py-1 text-xs text-[var(--color-text-secondary)] transition hover:border-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary)]"
                          >
                            升级为 Superadmin
                          </button>
                        </form>
                      ) : (
                        <span className="text-[10px] text-[var(--color-text-tertiary,#8690a3)]">最高权限</span>
                      )}
                      <Link
                        href={`/admin/users/${encodeURIComponent(user.username)}`}
                        className="rounded-full border border-[var(--color-border)] px-3 py-1 text-xs text-[var(--color-text-secondary)] transition hover:border-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary)]"
                      >
                        查看详情
                      </Link>
                      <form action={deleteAdminUser} className="inline-flex items-center gap-2">
                        <input type="hidden" name="username" value={user.username} />
                        <button
                          type="submit"
                          className="rounded-full border border-rose-200 px-3 py-1 text-xs text-rose-600 transition hover:bg-rose-50"
                        >
                          删除
                        </button>
                      </form>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-[var(--color-text-secondary)]">暂无管理员记录或数据库不可用。</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
