import Link from "next/link";

import { redirect } from "next/navigation";

import { AdminRedirectError, requireAdmin } from "@/server/auth";
import { listContactSubmissions } from "@/server/contactSubmissions";

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

function formatScenario(value: string | null): string {
  switch (value) {
    case "sports":
      return "体育赛事";
    case "hospitality":
      return "文旅营地";
    case "industrial":
      return "工业仓储";
    case "brand":
      return "品牌活动";
    case "other":
      return "其他";
    default:
      return "未选择";
  }
}

function formatFormType(value: string | null): string {
  if (!value) return "--";
  switch (value) {
    case "contact":
      return "联系表单";
    case "download":
      return "资料下载";
    case "case":
      return "案例咨询";
    default:
      return value;
  }
}

export const dynamic = "force-dynamic";

export default async function ContactSubmissionsPage() {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof AdminRedirectError) {
      redirect(error.location);
    }
    throw error;
  }
  const submissions = await listContactSubmissions(200);

  return (
    <div className="space-y-10">
      <header className="space-y-4">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-text-secondary)] transition hover:text-[var(--color-brand-primary)]"
        >
          ← 返回总览
        </Link>
        <div className="flex flex-col gap-3">
          <h1 className="text-3xl font-semibold text-[var(--color-brand-secondary)]">前端提交记录</h1>
          <p className="max-w-2xl text-sm text-[var(--color-text-secondary)]">
            汇总前台「联系我们」等表单的用户提交，按照时间倒序展示，便于跟进线索。
          </p>
        </div>
      </header>

      {submissions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-white/60 p-10 text-center text-sm text-[var(--color-text-secondary)]">
          目前暂无提交记录。
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[var(--color-border)] text-sm">
            <thead className="bg-[var(--color-surface-muted)]">
              <tr className="text-left text-xs uppercase tracking-[0.28em] text-[var(--color-text-tertiary,#8690a3)]">
                <th className="px-4 py-3">时间</th>
                <th className="px-4 py-3">联系人</th>
                <th className="px-4 py-3">公司/机构</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">电话</th>
                <th className="px-4 py-3">应用场景</th>
                <th className="px-4 py-3">预计档期</th>
                <th className="px-4 py-3">项目简介</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)] bg-white">
              {submissions.map((item) => (
                <tr key={item.id} className="align-top">
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-[var(--color-text-secondary)]">
                    {formatTimestamp(item.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1 text-xs text-[var(--color-brand-secondary)]">
                      <span className="font-semibold">{item.name}</span>
                      {item.sourcePath ? (
                        <span className="text-[var(--color-text-tertiary,#8690a3)]">来源：{item.sourcePath}</span>
                      ) : null}
                      {item.formType ? (
                        <span className="text-[var(--color-text-tertiary,#8690a3)]">类型：{formatFormType(item.formType)}</span>
                      ) : null}
                      {item.locale ? (
                        <span className="text-[var(--color-text-tertiary,#8690a3)]">语言：{item.locale}</span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--color-text-secondary)]">
                    {item.company ?? "--"}
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--color-text-secondary)]">
                    {item.email}
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--color-text-secondary)]">
                    {item.phone ?? "--"}
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--color-text-secondary)]">
                    {formatScenario(item.scenario)}
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--color-text-secondary)]">
                    {item.timeline ?? "--"}
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--color-text-secondary)]">
                    <div className="max-w-xs space-y-2 whitespace-pre-line">
                      {item.brief ? <p>简介：{item.brief}</p> : null}
                      {item.message && item.message !== item.brief ? <p>留言：{item.message}</p> : null}
                      {!item.brief && (!item.message || item.message === item.brief) ? <span>--</span> : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
