export function LogoutButton({
  username,
  role,
  showIdentity = true,
}: {
  username?: string | null;
  role: string;
  showIdentity?: boolean;
}) {
  return (
    <form action="/admin/logout" method="post">
      <button
        type="submit"
        className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-white px-4 py-2 text-xs font-semibold text-[var(--color-brand-secondary)] transition hover:border-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary)]"
      >
        {showIdentity ? (
          <span className="hidden sm:inline">
            {username ?? "管理员"}
            <span className="ml-2 rounded-full bg-[var(--color-brand-primary)]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.3em] text-[var(--color-brand-primary)]">
              {role === "superadmin" ? "Super" : "Admin"}
            </span>
          </span>
        ) : null}
        <span className="sm:hidden">退出</span>
        <span>退出登录</span>
      </button>
    </form>
  );
}
