import Link from "next/link";

import { ConfigHistoryPanel } from "./ConfigHistoryPanel";
import { EditConfigForm } from "./EditConfigForm";
import { getConfigEditorComponent } from "./configEditorRegistry";
import { getCurrentAdmin } from "@/server/auth";
import { getSiteConfigRaw } from "@/server/siteConfigs";
import { getProductCenterConfig } from "@/server/pageConfigs";
import { listSiteConfigHistory } from "@/server/siteConfigHistory";
import { VISIBILITY_CONFIG_KEY } from "@/constants/visibility";
import { PreviewLocaleSwitch } from "./PreviewLocaleSwitch";
import { getVisibilityConfig } from "@/server/visibility";

export const dynamic = "force-dynamic";

function resolveMeta(value: unknown) {
  if (!value || typeof value !== "object") {
    return {};
  }
  const record = value as Record<string, unknown>;
  const meta = record._meta;
  if (!meta || typeof meta !== "object") {
    return {};
  }
  const metaRecord = meta as Record<string, unknown>;
  return {
    schema: typeof metaRecord.schema === "string" ? metaRecord.schema : undefined,
    updatedAt: typeof metaRecord.updatedAt === "string" ? metaRecord.updatedAt : undefined,
    adminPath: typeof metaRecord.adminPath === "string" ? metaRecord.adminPath : undefined,
  };
}

function formatDate(value?: string) {
  if (!value) return undefined;
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

export default async function AdminConfigDetailPage({
  params,
}: {
  params: { key: string };
}) {
  const rawKey = Array.isArray(params.key) ? params.key.join("/") : params.key;
  const configKey = decodeURIComponent(rawKey);

  const session = await getCurrentAdmin();
  const isSuperAdmin = session?.role === "superadmin";

  const [value, history] = await Promise.all([
    getSiteConfigRaw(configKey),
    isSuperAdmin ? listSiteConfigHistory(configKey, 30) : Promise.resolve([]),
  ]);

  let relatedData: Record<string, unknown> | undefined;
  if (configKey === "首页") {
    const productCenterConfig = await getProductCenterConfig();
    const visibilityConfig = await getVisibilityConfig();
    relatedData = { productCenterConfig, visibilityConfig, isSuperAdmin };
  }

  if (configKey === VISIBILITY_CONFIG_KEY && !isSuperAdmin) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-white/70 p-10 text-sm text-[var(--color-text-secondary)]">
        仅 superadmin 可访问页面可见性配置。
      </div>
    );
  }
  const isNewRecord = value === null;
  const safeValue = value ?? {};

  const meta = resolveMeta(safeValue);
  const prettyValue = JSON.stringify(safeValue, null, 2);
  const canRenderVisual = typeof safeValue === "object" && safeValue !== null;
  const record = canRenderVisual ? (safeValue as Record<string, unknown>) : {};
  const ConfigEditor = getConfigEditorComponent(configKey);

  return (
    <div className="space-y-10">
      <div className="space-y-4">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-text-secondary)] transition hover:text-[var(--color-brand-primary)]"
        >
          ← 返回总览
        </Link>
        <div className="flex flex-col gap-3">
          <span className="inline-flex w-fit items-center rounded-full bg-[var(--color-brand-primary)]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-brand-primary)]">
            {configKey}
          </span>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-3xl font-semibold text-[var(--color-brand-secondary)]">编辑配置</h1>
            <PreviewLocaleSwitch />
          </div>
          <p className="max-w-2xl text-sm text-[var(--color-text-secondary)]">
            更新后会立即写入数据库，并在前台页面请求时实时生效。建议在提交前校验 JSON 结构与字段。可通过下方按钮快速格式化或恢复初始值。
          </p>
          {isNewRecord ? (
            <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-white/60 px-4 py-3 text-xs text-[var(--color-text-secondary)]">
              当前数据库中暂无该键的记录，保存后将自动创建一条新配置。
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--color-text-tertiary,#8690a3)]">
          {meta.schema ? <span>Schema：{meta.schema}</span> : null}
          {meta.adminPath ? <span>管理路径：{meta.adminPath}</span> : null}
          {meta.updatedAt ? <span>最近更新：{formatDate(meta.updatedAt)}</span> : null}
        </div>
      </div>
      {canRenderVisual ? (
        <ConfigEditor configKey={configKey} initialConfig={record} relatedData={relatedData} />
      ) : (
        <EditConfigForm configKey={configKey} defaultValue={prettyValue} />
      )}
      {isSuperAdmin ? (
        <ConfigHistoryPanel history={history} configKey={configKey} />
      ) : null}
    </div>
  );
}
