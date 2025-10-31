"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ChangeEvent, type RefObject } from "react";
import Image from "next/image";
import Link from "next/link";
import { createPortal, useFormState, useFormStatus } from "react-dom";

import type { UpdateSiteConfigActionState } from "../actions";
import { updateSiteConfigAction } from "../actions";
import { useToast } from "@/providers/ToastProvider";
import { ConfigPreviewFrame } from "./ConfigPreviewFrame";
import { EditorDialog } from "./EditorDialog";
import {
  DEFAULT_LOCALE,
  ensureArray,
  ensureLocalizedRecord,
  ensureString,
  mergeMeta,
  setLocaleText,
} from "./editorUtils";
import { navigation_config } from "@/data/configs";

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value ?? null)) as T;
}

const LOCALE_LABELS: Record<string, string> = {
  "zh-CN": "简体中文",
  "en": "English",
};
const SUPPORTED_LOCALES = Object.keys(LOCALE_LABELS) as Array<keyof typeof LOCALE_LABELS>;

interface LocalizedRecord {
  [locale: string]: string;
}

interface NavigationChildLinkState {
  id: string;
  slug: string;
  href: string;
  label: LocalizedRecord;
}

interface NavigationMainLinkState {
  id: string;
  slug: string;
  href: string;
  label: LocalizedRecord;
  children: NavigationChildLinkState[];
}

interface NavigationUtilityLinkState {
  id: string;
  slug: string;
  href: string;
  label: LocalizedRecord;
}

interface NavigationConfigState {
  mainTitle: LocalizedRecord;
  utilityTitle: LocalizedRecord;
  mainLinks: NavigationMainLinkState[];
  utilityLinks: NavigationUtilityLinkState[];
  extraGroups: Record<string, unknown>[];
  _meta?: Record<string, unknown>;
}

type EditingTarget = { type: "main" } | { type: "utility" };

const NAV_EDIT_GROUPS: Array<{
  anchor: string;
  label: string;
  actions: Array<{ label: string; target: EditingTarget }>;
}> = [
  {
    anchor: "main-nav",
    label: "主导航链接",
    actions: [{ label: "编辑导航", target: { type: "main" } }],
  },
  {
    anchor: "utility-nav",
    label: "快捷入口",
    actions: [{ label: "编辑快捷入口", target: { type: "utility" } }],
  },
];

const FALLBACK_NAVIGATION = navigation_config;

export function NavigationConfigEditor({ configKey, initialConfig }: { configKey: string; initialConfig: Record<string, unknown> }) {
  const [config, setConfig] = useState<NavigationConfigState>(() => normalizeNavigationConfig(initialConfig));
  const [baseline, setBaseline] = useState<NavigationConfigState>(() => normalizeNavigationConfig(initialConfig));
  const [editing, setEditing] = useState<EditingTarget | null>(null);
  const [formState, dispatch] = useFormState<UpdateSiteConfigActionState, FormData>(updateSiteConfigAction, { status: "idle" });
  const formRef = useRef<HTMLFormElement>(null);
  const latestConfigRef = useRef(config);
  const toast = useToast();

  useEffect(() => {
    const next = normalizeNavigationConfig(initialConfig);
    setConfig(next);
    setBaseline(next);
  }, [initialConfig]);

  useEffect(() => {
    latestConfigRef.current = config;
  }, [config]);

  useEffect(() => {
    if (formState.status === "success") {
      setBaseline(deepClone(latestConfigRef.current));
      formRef.current?.classList.add("animate-pulse");
      const timer = window.setTimeout(() => formRef.current?.classList.remove("animate-pulse"), 400);
      toast.success("保存成功");
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [formState.status, toast]);

  const payload = useMemo(() => JSON.stringify(serializeNavigationConfig(config)), [config]);
  const isDirty = useMemo(() => JSON.stringify(config) !== JSON.stringify(baseline), [config, baseline]);

  return (
    <div className="space-y-10">

      <NavigationPreview config={config} onEdit={setEditing} />

      {editing?.type === "main" ? (
        <MainLinksDialog
          value={config.mainLinks}
          onCancel={() => setEditing(null)}
          onSave={(next) => {
            setConfig((prev) => ({ ...prev, mainLinks: next }));
            setEditing(null);
          }}
        />
      ) : null}

      {editing?.type === "utility" ? (
        <UtilityLinksDialog
          value={config.utilityLinks}
          onCancel={() => setEditing(null)}
          onSave={(next) => {
            setConfig((prev) => ({ ...prev, utilityLinks: next }));
            setEditing(null);
          }}
        />
      ) : null}
    </div>
  );
}

function NavigationPreview({ config, onEdit }: { config: NavigationConfigState; onEdit: (target: EditingTarget) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const anchors = usePreviewAnchors(containerRef);

  const fallbackMain = useMemo(() => buildMainLinksFromFallback(), []);
  const fallbackUtility = useMemo(() => buildUtilityLinksFromFallback(), []);

  const mainLinks = config.mainLinks.length ? config.mainLinks : fallbackMain;
  const utilityLinks = config.utilityLinks.length ? config.utilityLinks : fallbackUtility;

  return (
    <ConfigPreviewFrame
      title="导航栏预览"
      description="预览与前端保持一致，可视化调整桌面与移动端菜单。"
      viewportWidth={1180}
      autoScale
      maxHeight={null}
    >
      <div ref={containerRef} className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white">
        <NavigationHeader mainLinks={mainLinks} utilityLinks={utilityLinks} />
        <PreviewEditControls anchors={anchors} onEdit={onEdit} />
      </div>
    </ConfigPreviewFrame>
  );
}

function NavigationHeader({
  mainLinks,
  utilityLinks,
}: {
  mainLinks: NavigationMainLinkState[];
  utilityLinks: NavigationUtilityLinkState[];
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="border-b border-[var(--color-border)] bg-white">
      <div className="mx-auto flex h-20 w-full max-w-[1180px] items-center justify-between px-4 sm:px-6 lg:px-8" data-preview-anchor="main-nav">
        <Link href="#" className="flex items-center gap-3" aria-label="预览 LOGO">
          <Image src="/logo-horizontal.png" alt="TIMES TENT" width={144} height={44} className="h-11 w-auto" />
        </Link>
        <nav className="hidden items-center gap-6 lg:flex">
          {mainLinks.map((link) => (
            <PreviewNavItem key={link.id} link={link} />
          ))}
        </nav>
        <div className="hidden items-center gap-3 lg:flex" data-preview-anchor="utility-nav">
          {utilityLinks.map((link) => (
            <Link
              key={link.id}
              href={link.href || "#"}
              className="rounded-full border border-[var(--color-border)] px-4 py-2 text-xs font-semibold text-[var(--color-brand-secondary)] transition hover:border-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary)]"
            >
              {formatLocalized(link.label)}
            </Link>
          ))}
        </div>
        <button
          type="button"
          aria-label="切换菜单"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--color-border)] text-[var(--color-brand-secondary)] lg:hidden"
          onClick={() => setMobileOpen((prev) => !prev)}
        >
          {mobileOpen ? "✕" : "≡"}
        </button>
      </div>
      {mobileOpen ? (
        <div className="border-t border-[var(--color-border)] bg-white lg:hidden">
          <nav className="space-y-3 px-4 py-6">
            {mainLinks.map((link) => (
              <div key={link.id} className="rounded-lg border border-[var(--color-border)]">
                <Link
                  href={link.href || "#"}
                  className="block px-4 py-3 text-sm font-semibold text-[var(--color-brand-secondary)]"
                >
                  {formatLocalized(link.label) || link.href || "导航链接"}
                </Link>
                {link.children.length ? (
                  <div className="border-t border-[var(--color-border)] bg-[var(--color-surface-muted)]">
                    {link.children.map((child) => (
                      <Link
                        key={child.id}
                        href={child.href || "#"}
                        className="block px-4 py-2 text-xs text-[var(--color-text-secondary)] hover:bg-white"
                      >
                        {formatLocalized(child.label) || child.href || "子链接"}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
            {utilityLinks.length ? (
              <div className="space-y-2 border-t border-[var(--color-border)] pt-3">
                {utilityLinks.map((link) => (
                  <Link
                    key={link.id}
                    href={link.href || "#"}
                    className="block rounded-full bg-[var(--color-surface-muted)] px-4 py-2 text-center text-sm font-semibold text-[var(--color-brand-secondary)]"
                  >
                    {formatLocalized(link.label) || link.href || "快捷入口"}
                  </Link>
                ))}
              </div>
            ) : null}
          </nav>
        </div>
      ) : null}
    </header>
  );
}

function PreviewNavItem({ link }: { link: NavigationMainLinkState }) {
  const label = formatLocalized(link.label) || link.href || "导航";
  const hasChildren = link.children.length > 0;
  return (
    <div className="relative group">
      <Link
        href={link.href || "#"}
        className="text-sm font-medium text-[var(--color-text-secondary)] transition group-hover:text-[var(--color-brand-primary)]"
      >
        {label}
      </Link>
      {hasChildren ? (
        <div className="invisible absolute left-0 top-10 min-w-[200px] rounded-xl border border-[var(--color-border)] bg-white p-3 shadow-lg opacity-0 transition group-hover:visible group-hover:opacity-100">
          <div className="flex flex-col gap-2">
            {link.children.map((child) => (
              <Link
                key={child.id}
                href={child.href || "#"}
                className="rounded-lg px-3 py-2 text-xs text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-brand-primary)]"
              >
                {formatLocalized(child.label) || child.href || "子链接"}
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MainLinksDialog({ value, onSave, onCancel }: { value: NavigationMainLinkState[]; onSave: (next: NavigationMainLinkState[]) => void; onCancel: () => void }) {
  const [draft, setDraft] = useState<NavigationMainLinkState[]>(() => value.map(cloneMainLink));

  useEffect(() => {
    setDraft(value.map(cloneMainLink));
  }, [value]);

  const handleAdd = () => {
    setDraft((prev) => [
      ...prev,
      {
        id: createId("nav-main"),
        slug: "",
        href: "",
        label: { [DEFAULT_LOCALE]: "新导航" },
        children: [],
      },
    ]);
  };

  const handleMove = (index: number, offset: -1 | 1) => {
    setDraft((prev) => {
      const next = [...prev];
      const target = index + offset;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const handleRemove = (index: number) => {
    setDraft((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleAddChild = (parentId: string) => {
    setDraft((prev) =>
      prev.map((link) =>
        link.id === parentId
          ? {
              ...link,
              children: [
                ...link.children,
                { id: createId("nav-child"), slug: "", href: "", label: { [DEFAULT_LOCALE]: "新子链接" } },
              ],
            }
          : link,
      ),
    );
  };

  const handleRemoveChild = (parentId: string, childId: string) => {
    setDraft((prev) =>
      prev.map((link) =>
        link.id === parentId
          ? { ...link, children: link.children.filter((child) => child.id !== childId) }
          : link,
      ),
    );
  };

  const handleMoveChild = (parentId: string, index: number, offset: -1 | 1) => {
    setDraft((prev) =>
      prev.map((link) => {
        if (link.id !== parentId) return link;
        const nextChildren = [...link.children];
        const target = index + offset;
        if (target < 0 || target >= nextChildren.length) return link;
        [nextChildren[index], nextChildren[target]] = [nextChildren[target], nextChildren[index]];
        return { ...link, children: nextChildren };
      }),
    );
  };

  return (
    <EditorDialog title="编辑主导航" subtitle="调整顶部导航链接与下拉菜单" onSave={() => onSave(draft.map(cloneMainLink))} onCancel={onCancel}>
      <div className="space-y-5 text-sm">
        <div className="flex justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-text-tertiary,#8690a3)]">主导航</h3>
          <button
            type="button"
            onClick={handleAdd}
            className="rounded-full border border-[var(--color-brand-primary)] px-3 py-1 text-xs font-semibold text-[var(--color-brand-primary)]"
          >
            + 新增导航
          </button>
        </div>
        {draft.length ? (
          <div className="space-y-4">
            {draft.map((link, index) => (
              <div key={link.id} className="space-y-3 rounded-2xl border border-[var(--color-border)] bg-white/85 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--color-text-tertiary,#8690a3)]">
                  <span>导航 {index + 1}</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleMove(index, -1)}
                      disabled={index === 0}
                      className="rounded-full border border-[var(--color-border)] px-3 py-1 transition hover:border-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary)] disabled:opacity-50"
                    >
                      上移
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMove(index, 1)}
                      disabled={index === draft.length - 1}
                      className="rounded-full border border-[var(--color-border)] px-3 py-1 transition hover:border-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary)] disabled:opacity-50"
                    >
                      下移
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemove(index)}
                      className="rounded-full border border-rose-200 px-3 py-1 text-rose-500 transition hover:bg-rose-50"
                    >
                      删除
                    </button>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <TextField
                    label="Slug"
                    value={link.slug}
                    onChange={(next) =>
                      setDraft((prev) => prev.map((item) => (item.id === link.id ? { ...item, slug: next } : item)))
                    }
                    placeholder="例如 products"
                  />
                  <TextField
                    label="链接地址"
                    value={link.href}
                    onChange={(next) =>
                      setDraft((prev) => prev.map((item) => (item.id === link.id ? { ...item, href: next } : item)))
                    }
                    placeholder="/path 或 https://"
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {SUPPORTED_LOCALES.map((locale) => (
                    <TextField
                      key={`${link.id}-label-${locale}`}
                      label={`链接文案（${LOCALE_LABELS[locale]}）`}
                      value={link.label[locale] ?? ""}
                      onChange={(next) =>
                        setDraft((prev) =>
                          prev.map((item) =>
                            item.id === link.id
                              ? { ...item, label: setLocaleText(item.label, next, locale) }
                              : item,
                          ),
                        )
                      }
                    />
                  ))}
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-text-tertiary,#8690a3)]">下拉子链接</h4>
                    <button
                      type="button"
                      onClick={() => handleAddChild(link.id)}
                      className="rounded-full border border-[var(--color-border)] px-3 py-1 text-xs font-semibold text-[var(--color-brand-secondary)] transition hover:border-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary)]"
                    >
                      + 新增子链接
                    </button>
                  </div>
                  {link.children.length ? (
                    <div className="space-y-3">
                      {link.children.map((child, childIndex) => (
                        <div key={child.id} className="space-y-3 rounded-2xl border border-[var(--color-border)] bg-white/60 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--color-text-tertiary,#8690a3)]">
                            <span>子链接 {childIndex + 1}</span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleMoveChild(link.id, childIndex, -1)}
                                disabled={childIndex === 0}
                                className="rounded-full border border-[var(--color-border)] px-3 py-1 transition hover:border-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary)] disabled:opacity-50"
                              >
                                上移
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMoveChild(link.id, childIndex, 1)}
                                disabled={childIndex === link.children.length - 1}
                                className="rounded-full border border-[var(--color-border)] px-3 py-1 transition hover:border-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary)] disabled:opacity-50"
                              >
                                下移
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveChild(link.id, child.id)}
                                className="rounded-full border border-rose-200 px-3 py-1 text-rose-500 transition hover:bg-rose-50"
                              >
                                删除
                              </button>
                            </div>
                          </div>
                          <div className="grid gap-4 md:grid-cols-2">
                            <TextField
                              label="Slug"
                              value={child.slug}
                              onChange={(next) =>
                                setDraft((prev) =>
                                  prev.map((item) =>
                                    item.id === link.id
                                      ? {
                                          ...item,
                                          children: item.children.map((entry) =>
                                            entry.id === child.id ? { ...entry, slug: next } : entry,
                                          ),
                                        }
                                      : item,
                                  ),
                                )
                              }
                              placeholder="例如 products-gable"
                            />
                            <TextField
                              label="链接地址"
                              value={child.href}
                              onChange={(next) =>
                                setDraft((prev) =>
                                  prev.map((item) =>
                                    item.id === link.id
                                      ? {
                                          ...item,
                                          children: item.children.map((entry) =>
                                            entry.id === child.id ? { ...entry, href: next } : entry,
                                          ),
                                        }
                                      : item,
                                  ),
                                )
                              }
                              placeholder="/path 或 https://"
                            />
                          </div>
                          <div className="grid gap-4 md:grid-cols-2">
                            {SUPPORTED_LOCALES.map((locale) => (
                              <TextField
                                key={`${child.id}-label-${locale}`}
                                label={`显示文本（${LOCALE_LABELS[locale]}）`}
                                value={child.label[locale] ?? ""}
                                onChange={(next) =>
                                  setDraft((prev) =>
                                    prev.map((item) =>
                                      item.id === link.id
                                        ? {
                                            ...item,
                                            children: item.children.map((entry) =>
                                              entry.id === child.id
                                                ? { ...entry, label: setLocaleText(entry.label, next, locale) }
                                                : entry,
                                            ),
                                          }
                                        : item,
                                    ),
                                  )
                                }
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-white/45 px-4 py-3 text-xs text-[var(--color-text-tertiary,#8690a3)]">
                      当前导航暂无子链接，点击“新增子链接”即可添加下拉菜单。
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-white/65 px-4 py-6 text-xs text-[var(--color-text-tertiary,#8690a3)]">
            暂无导航，点击右上角“新增导航”开始配置。
          </div>
        )}
      </div>
    </EditorDialog>
  );
}

function UtilityLinksDialog({ value, onSave, onCancel }: { value: NavigationUtilityLinkState[]; onSave: (next: NavigationUtilityLinkState[]) => void; onCancel: () => void }) {
  const [draft, setDraft] = useState<NavigationUtilityLinkState[]>(() => value.map(cloneUtilityLink));

  useEffect(() => {
    setDraft(value.map(cloneUtilityLink));
  }, [value]);

  const handleAdd = () => {
    setDraft((prev) => [
      ...prev,
      { id: createId("nav-utility"), slug: "", href: "", label: { [DEFAULT_LOCALE]: "新入口" } },
    ]);
  };

  const handleRemove = (id: string) => {
    setDraft((prev) => prev.filter((item) => item.id !== id));
  };

  const handleMove = (index: number, offset: -1 | 1) => {
    setDraft((prev) => {
      const next = [...prev];
      const target = index + offset;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  return (
    <EditorDialog title="编辑快捷入口" subtitle="调整导航右侧快捷链接" onSave={() => onSave(draft.map(cloneUtilityLink))} onCancel={onCancel}>
      <div className="space-y-4 text-sm">
        <div className="flex justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-text-tertiary,#8690a3)]">快捷入口</h3>
          <button
            type="button"
            onClick={handleAdd}
            className="rounded-full border border-[var(--color-brand-primary)] px-3 py-1 text-xs font-semibold text-[var(--color-brand-primary)]"
          >
            + 新增入口
          </button>
        </div>
        {draft.length ? (
          <div className="space-y-3">
            {draft.map((link, index) => (
              <div key={link.id} className="space-y-3 rounded-2xl border border-[var(--color-border)] bg-white/75 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--color-text-tertiary,#8690a3)]">
                  <span>入口 {index + 1}</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleMove(index, -1)}
                      disabled={index === 0}
                      className="rounded-full border border-[var(--color-border)] px-3 py-1 transition hover:border-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary)] disabled:opacity-50"
                    >
                      上移
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMove(index, 1)}
                      disabled={index === draft.length - 1}
                      className="rounded-full border border-[var(--color-border)] px-3 py-1 transition hover:border-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary)] disabled:opacity-50"
                    >
                      下移
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemove(link.id)}
                      className="rounded-full border border-rose-200 px-3 py-1 text-rose-500 transition hover:bg-rose-50"
                    >
                      删除
                    </button>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <TextField
                    label="Slug"
                    value={link.slug}
                    onChange={(next) =>
                      setDraft((prev) => prev.map((item) => (item.id === link.id ? { ...item, slug: next } : item)))
                    }
                    placeholder="例如 videos"
                  />
                  <TextField
                    label="链接地址"
                    value={link.href}
                    onChange={(next) =>
                      setDraft((prev) => prev.map((item) => (item.id === link.id ? { ...item, href: next } : item)))
                    }
                    placeholder="/path 或 https://"
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {SUPPORTED_LOCALES.map((locale) => (
                    <TextField
                      key={`${link.id}-label-${locale}`}
                      label={`显示文本（${LOCALE_LABELS[locale]}）`}
                      value={link.label[locale] ?? ""}
                      onChange={(next) =>
                        setDraft((prev) =>
                          prev.map((item) =>
                            item.id === link.id
                              ? { ...item, label: setLocaleText(item.label, next, locale) }
                              : item,
                          ),
                        )
                      }
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-white/60 px-4 py-6 text-xs text-[var(--color-text-tertiary,#8690a3)]">
            暂无快捷入口，点击上方按钮添加。
          </div>
        )}
      </div>
    </EditorDialog>
  );
}

function PreviewEditControls({ anchors, onEdit }: { anchors: AnchorMap; onEdit: (target: EditingTarget) => void }) {
  return (
    <>
      {NAV_EDIT_GROUPS.map(({ anchor, actions, label }) => {
        const element = anchors[anchor];
        if (!element) return null;
        const isMain = anchor === "main-nav";
        return createPortal(
          <div className="pointer-events-none absolute inset-0">
            <div
              className={
                isMain
                  ? "pointer-events-auto absolute left-4 top-4 flex flex-wrap items-center gap-2"
                  : "pointer-events-auto absolute right-4 top-4 flex flex-wrap items-center gap-2"
              }
            >
              <span className="rounded-full bg-black/60 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-white/85 shadow">
                {label}
              </span>
              <div className="flex flex-wrap gap-2">
                {actions.map((action) => (
                  <button
                    key={action.label}
                    type="button"
                    onClick={() => onEdit(action.target)}
                    className="rounded-full bg-[var(--color-brand-primary)] px-3 py-1 text-xs font-semibold text-white shadow transition hover:bg-[#d82234]"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          </div>,
          element,
        );
      })}
    </>
  );
}

function SubmitButton({ disabled, highlight }: { disabled: boolean; highlight?: boolean }) {
  const { pending } = useFormStatus();
  const shouldPulse = Boolean(highlight && !disabled && !pending);
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className={`inline-flex items-center justify-center rounded-full bg-[var(--color-brand-primary)] px-5 py-2 text-sm font-semibold text-white shadow transition hover:bg-[var(--color-brand-secondary)] disabled:cursor-not-allowed disabled:opacity-60 ${
        shouldPulse ? "animate-[pulse_0.6s_ease-in-out_infinite] ring-4 ring-offset-4 ring-offset-white ring-[var(--color-brand-primary)] shadow-[0_0_36px_rgba(216,34,52,0.45)]" : ""
      }`}
    >
      {pending ? "保存中..." : "保存配置"}
    </button>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  helper,
  multiline = false,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  helper?: string;
  multiline?: boolean;
  rows?: number;
}) {
  return (
    <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-text-tertiary,#8690a3)]">
      <span>{label}</span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          rows={rows}
          className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-text-secondary)] focus:border-[var(--color-brand-primary)] focus:outline-none"
        />
      ) : (
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-text-secondary)] focus:border-[var(--color-brand-primary)] focus:outline-none"
        />
      )}
      {helper ? <span className="text-[10px] text-[var(--color-text-tertiary,#8690a3)]">{helper}</span> : null}
    </label>
  );
}

function usePreviewAnchors(containerRef: RefObject<HTMLElement>): AnchorMap {
  const [anchors, setAnchors] = useState<AnchorMap>({});

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const originalPositions = new Map<HTMLElement, string>();

    const updateAnchors = () => {
      const next: AnchorMap = {};
      for (const { anchor } of NAV_EDIT_GROUPS) {
        const element = container.querySelector<HTMLElement>(`[data-preview-anchor="${anchor}"]`);
        if (!element) continue;
        if (getComputedStyle(element).position === "static") {
          if (!originalPositions.has(element)) {
            originalPositions.set(element, element.style.position || "");
          }
          element.style.position = "relative";
        }
        next[anchor] = element;
      }
      setAnchors((prev) => {
        const prevKeys = Object.keys(prev);
        const nextKeys = Object.keys(next);
        if (prevKeys.length === nextKeys.length && nextKeys.every((key) => prev[key] === next[key])) {
          return prev;
        }
        return next;
      });
    };

    const observer = new MutationObserver(updateAnchors);
    observer.observe(container, { childList: true, subtree: true });
    updateAnchors();

    return () => {
      observer.disconnect();
      originalPositions.forEach((value, element) => {
        element.style.position = value;
      });
    };
  }, [containerRef]);

  return anchors;
}

type AnchorMap = Record<string, HTMLElement | undefined>;

function normalizeNavigationConfig(raw: Record<string, unknown>): NavigationConfigState {
  const record = ensureRecord(raw);
  const groups = ensureArray<Record<string, unknown>>(record.groups);
  const mainGroup = groups.find((group) => ensureString(group.key) === "main") ?? ensureRecord(groups[0]);
  const utilityGroup = groups.find((group) => ensureString(group.key) === "utility") ?? {};

  const mainLinks = ensureArray<Record<string, unknown>>(mainGroup.links).map((link, index) => normalizeMainLink(link, index));
  const utilityLinks = ensureArray<Record<string, unknown>>(utilityGroup.links).map((link, index) => normalizeUtilityLink(link, index));
  const extraGroups = groups
    .filter((group) => {
      const key = ensureString(group.key);
      return key !== "main" && key !== "utility";
    })
    .map((group) => deepClone(group));

  return {
    mainTitle: ensureLocalizedRecord(mainGroup.title),
    utilityTitle: ensureLocalizedRecord(utilityGroup.title),
    mainLinks,
    utilityLinks,
    extraGroups,
    _meta: ensureRecord(record._meta),
  };
}

function serializeNavigationConfig(config: NavigationConfigState): Record<string, unknown> {
  const mainTitle = cleanLocalized(config.mainTitle);
  const utilityTitle = cleanLocalized(config.utilityTitle);

  const mainGroup = {
    key: "main",
    title:
      Object.keys(mainTitle).length
        ? mainTitle
        : deepClone(
            FALLBACK_NAVIGATION.groups.find((group) => group.key === "main")?.title ?? {
              [DEFAULT_LOCALE]: "主导航",
            },
          ),
    links: config.mainLinks.map((link) => ({
      slug: link.slug.trim(),
      href: link.href.trim(),
      label: cleanLocalized(link.label, true),
      ...(link.children.length
        ? {
            children: link.children
              .filter((child) => child.href.trim())
              .map((child) => ({ slug: child.slug.trim(), href: child.href.trim(), label: cleanLocalized(child.label, true) })),
          }
        : {}),
    })),
  };

  const utilityGroup = {
    key: "utility",
    title:
      Object.keys(utilityTitle).length
        ? utilityTitle
        : deepClone(
            FALLBACK_NAVIGATION.groups.find((group) => group.key === "utility")?.title ?? {
              [DEFAULT_LOCALE]: "附加导航",
            },
          ),
    links: config.utilityLinks
      .filter((link) => link.href.trim())
      .map((link) => ({
        slug: link.slug.trim(),
        href: link.href.trim(),
        label: cleanLocalized(link.label, true),
      })),
  };

  const groups = [mainGroup, utilityGroup, ...config.extraGroups.map((group) => deepClone(group))];

  return mergeMeta({ groups }, config._meta);
}

function buildMainLinksFromFallback(): NavigationMainLinkState[] {
  const mainGroup = FALLBACK_NAVIGATION.groups.find((group) => group.key === "main");
  if (!mainGroup) return [];
  return ensureArray(mainGroup.links).map((link, index) => normalizeMainLink(link as Record<string, unknown>, index));
}

function buildUtilityLinksFromFallback(): NavigationUtilityLinkState[] {
  const utilityGroup = FALLBACK_NAVIGATION.groups.find((group) => group.key === "utility");
  if (!utilityGroup) return [];
  return ensureArray(utilityGroup.links).map((link, index) => normalizeUtilityLink(link as Record<string, unknown>, index));
}

function normalizeMainLink(raw: Record<string, unknown>, index: number): NavigationMainLinkState {
  const slug = ensureString(raw.slug);
  const href = ensureString(raw.href);
  const children = ensureArray<Record<string, unknown>>(raw.children).map((child, childIndex) => ({
    id: makeStableId("nav-child", ensureString(child.slug) || ensureString(child.href), childIndex),
    slug: ensureString(child.slug),
    href: ensureString(child.href),
    label: ensureLocalizedRecord(child.label),
  }));
  return {
    id: makeStableId("nav-main", slug || href, index),
    slug,
    href,
    label: ensureLocalizedRecord(raw.label),
    children,
  };
}

function normalizeUtilityLink(raw: Record<string, unknown>, index: number): NavigationUtilityLinkState {
  const slug = ensureString(raw.slug);
  const href = ensureString(raw.href);
  return {
    id: makeStableId("nav-utility", slug || href, index),
    slug,
    href,
    label: ensureLocalizedRecord(raw.label),
  };
}

function cloneMainLink(link: NavigationMainLinkState): NavigationMainLinkState {
  return {
    id: link.id,
    slug: link.slug,
    href: link.href,
    label: { ...link.label },
    children: link.children.map((child) => ({ id: child.id, slug: child.slug, href: child.href, label: { ...child.label } })),
  };
}

function cloneUtilityLink(link: NavigationUtilityLinkState): NavigationUtilityLinkState {
  return {
    id: link.id,
    slug: link.slug,
    href: link.href,
    label: { ...link.label },
  };
}

function cleanLocalized(record: LocalizedRecord, required = false): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [locale, value] of Object.entries(record)) {
    const trimmed = value?.trim();
    if (trimmed) {
      result[locale] = trimmed;
    }
  }
  if (required && Object.keys(result).length === 0) {
    return { [DEFAULT_LOCALE]: "" };
  }
  return result;
}

function ensureRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function makeStableId(prefix: string, seed: string, index: number): string {
  const base = seed.trim().replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return `${prefix}-${base || index}`;
}

function createId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`;
}

function formatLocalized(record: LocalizedRecord): string {
  const value = record[DEFAULT_LOCALE];
  if (value && value.trim()) return value;
  const fallback = Object.values(record).find((item) => item?.trim().length);
  return fallback ?? "";
}
