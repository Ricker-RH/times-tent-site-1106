"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { AdminRedirectError, requireAdmin } from "@/server/auth";
import { VISIBILITY_CONFIG_KEY } from "@/constants/visibility";

import { mergeSettingsWithKeys, saveAdminChannelSettings } from "@/server/adminChannels";
import { listSiteConfigSummaries, saveSiteConfig } from "@/server/siteConfigs";
import { getSiteConfigHistoryEntry } from "@/server/siteConfigHistory";

export type UpdateSiteConfigActionState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

export type UpdateAdminChannelSettingsState = UpdateSiteConfigActionState;
export type RestoreSiteConfigVersionState = UpdateSiteConfigActionState;

async function ensureAdmin(options?: Parameters<typeof requireAdmin>[0]) {
  try {
    return await requireAdmin(options);
  } catch (error) {
    if (error instanceof AdminRedirectError) {
      redirect(error.location);
    }
    throw error;
  }
}

export async function updateSiteConfigAction(
  _prevState: UpdateSiteConfigActionState,
  formData: FormData,
): Promise<UpdateSiteConfigActionState> {
  const session = await ensureAdmin();

  const key = formData.get("key");
  const payload = formData.get("payload");

  if (typeof key !== "string" || !key.trim()) {
    return { status: "error", message: "配置键无效" };
  }

  if (typeof payload !== "string") {
    return { status: "error", message: "缺少配置内容" };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(payload);
  } catch (error) {
    return { status: "error", message: "JSON 解析失败，请检查格式" };
  }

  try {
    const trimmedKey = key.trim();
    if (trimmedKey === VISIBILITY_CONFIG_KEY && session.role !== "superadmin") {
      return { status: "error", message: "仅 superadmin 可修改该配置" };
    }
    // 统一在所有配置保存时写入 _meta.updatedAt
    if (parsed && typeof parsed === "object") {
      const record = parsed as Record<string, unknown>;
      const prevMeta = record._meta && typeof record._meta === "object" ? (record._meta as Record<string, unknown>) : {};
      const nextMeta: Record<string, unknown> = { ...prevMeta, updatedAt: new Date().toISOString() };
      if (trimmedKey === VISIBILITY_CONFIG_KEY) {
        nextMeta.schema = "visibility.v1";
      }
      record._meta = nextMeta;
    }
    await saveSiteConfig(trimmedKey, parsed, {
      actor: {
        id: session.id,
        username: session.username,
        email: session.email,
        role: session.role,
      },
      sourcePath: `/admin/${encodeURIComponent(trimmedKey)}`,
    });
    revalidatePath("/admin");
    revalidatePath(`/admin/${encodeURIComponent(trimmedKey)}`);
    if (trimmedKey === "产品中心") {
      // 产品中心变更需同步刷新产品详情编辑页面的目录与预览
      revalidatePath(`/admin/${encodeURIComponent("产品详情")}`);
    }
    if (trimmedKey === "产品详情") {
      // 产品详情变更需同步刷新前台产品列表与对应详情页
      try {
        const obj = parsed as Record<string, unknown>;
        const slugs = Object.keys(obj).filter((k) => k && k !== "_meta");
        revalidatePath("/products");
        for (const slug of slugs) {
          revalidatePath(`/products/${encodeURIComponent(slug)}`);
        }
      } catch {}
    }
    if (trimmedKey === "案例展示") {
      // 案例展示变更需刷新前台分类页与对应案例详情页
      try {
        const obj = parsed as Record<string, unknown>;
        const categories = Array.isArray((obj as Record<string, unknown>).categories)
          ? ((obj as Record<string, unknown>).categories as Array<Record<string, unknown>>)
          : [];
        for (const cat of categories) {
          const categorySlug = typeof cat.slug === "string" ? cat.slug : "";
          if (categorySlug) {
            revalidatePath(`/cases/${encodeURIComponent(categorySlug)}`);
          }
          const studies = Array.isArray(cat.studies) ? (cat.studies as Array<Record<string, unknown>>) : [];
          for (const study of studies) {
            const studySlug = typeof study.slug === "string" ? study.slug : "";
            if (categorySlug && studySlug) {
              revalidatePath(`/cases/${encodeURIComponent(categorySlug)}/${encodeURIComponent(studySlug)}`);
            }
          }
        }
      } catch {}
    }
    return { status: "success", message: "保存成功" };
  } catch (error) {
    console.error("Failed to save site config", error);
    return { status: "error", message: "保存失败，请稍后再试" };
  }
}

export async function updateAdminChannelSettingsAction(
  _prevState: UpdateAdminChannelSettingsState,
  formData: FormData,
): Promise<UpdateAdminChannelSettingsState> {
  const session = await ensureAdmin({ role: "superadmin" });

  const payload = formData.get("payload");
  if (typeof payload !== "string") {
    return { status: "error", message: "缺少排序数据" };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(payload);
  } catch (error) {
    return { status: "error", message: "排序数据格式无效" };
  }

  if (!Array.isArray(parsed)) {
    return { status: "error", message: "排序数据格式无效" };
  }

  const order: string[] = [];
  const hiddenKeys: string[] = [];
  const seen = new Set<string>();

  for (const item of parsed) {
    if (!item || typeof item !== "object") {
      return { status: "error", message: "排序数据格式无效" };
    }
    const record = item as Record<string, unknown>;
    const key = typeof record.key === "string" ? record.key.trim() : "";
    if (!key) {
      return { status: "error", message: "存在无效的频道键" };
    }
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    order.push(key);
    if (record.hidden === true) {
      hiddenKeys.push(key);
    }
  }

  const summaries = await listSiteConfigSummaries();
  if (!order.length && summaries.length > 0) {
    return { status: "error", message: "至少保留一个频道" };
  }

  const keys = summaries.map((summary) => summary.key);
  const merged = mergeSettingsWithKeys(keys, { order, hiddenKeys });
  merged._meta = {
    updatedAt: new Date().toISOString(),
    updatedBy: session.username ?? session.email ?? session.id,
  };

  try {
    await saveAdminChannelSettings(merged, {
      actor: {
        id: session.id,
        username: session.username,
        email: session.email,
        role: session.role,
      },
      sourcePath: "/admin",
      note: "更新频道排序与可见性",
    });
    revalidatePath("/admin");
    revalidatePath("/admin", "layout");
    order.forEach((key) => {
      revalidatePath(`/admin/${encodeURIComponent(key)}`);
    });
    return { status: "success", message: "频道设置已保存" };
  } catch (error) {
    console.error("Failed to save admin channel settings", error);
    return { status: "error", message: "保存失败，请稍后再试" };
  }
}

export async function restoreSiteConfigVersionAction(
  _prevState: RestoreSiteConfigVersionState,
  formData: FormData,
): Promise<RestoreSiteConfigVersionState> {
  const session = await ensureAdmin({ role: "superadmin" });

  const historyIdRaw = formData.get("historyId");
  const historyId = typeof historyIdRaw === "string" ? Number(historyIdRaw) : Number.NaN;
  if (!Number.isInteger(historyId) || historyId <= 0) {
    return { status: "error", message: "历史记录编号无效" };
  }

  const modeRaw = formData.get("mode");
  const mode: "current" | "previous" = modeRaw === "previous" ? "previous" : "current";

  const entry = await getSiteConfigHistoryEntry(historyId);
  if (!entry) {
    return { status: "error", message: "未找到对应的历史记录" };
  }

  const targetValue = mode === "previous" ? entry.previousValue : entry.value;
  if (typeof targetValue === "undefined" || targetValue === null) {
    return { status: "error", message: "该记录缺少可恢复的数据" };
  }

  try {
    // 恢复时也写入 _meta.updatedAt，表示最新一次变更时间
    const nextValue = (() => {
      if (targetValue && typeof targetValue === "object") {
        const record = targetValue as Record<string, unknown>;
        const prevMeta = record._meta && typeof record._meta === "object" ? (record._meta as Record<string, unknown>) : {};
        return { ...record, _meta: { ...prevMeta, updatedAt: new Date().toISOString() } };
      }
      return targetValue;
    })();

    await saveSiteConfig(entry.key, nextValue, {
      actor: {
        id: session.id,
        username: session.username,
        email: session.email,
        role: session.role,
      },
      sourcePath: `/admin/${encodeURIComponent(entry.key)}`,
      action: "restore",
      note: mode === "previous"
        ? `恢复为版本 #${historyId} 修改前的数据`
        : `恢复至历史版本 #${historyId}`,
    });
    revalidatePath("/admin");
    revalidatePath(`/admin/${encodeURIComponent(entry.key)}`);
    return { status: "success", message: "已恢复到所选历史版本" };
  } catch (error) {
    console.error("Failed to restore site config version", error);
    return { status: "error", message: "恢复失败，请稍后再试" };
  }
}
