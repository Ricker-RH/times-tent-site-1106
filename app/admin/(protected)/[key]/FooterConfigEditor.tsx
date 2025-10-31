"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ChangeEvent, type RefObject } from "react";
import Image from "next/image";
import Link from "next/link";
import { createPortal, useFormState, useFormStatus } from "react-dom";

import { navigation_config } from "@/data/configs";
import type { NavigationConfig, NavigationLink } from "@/types/navigation";

import type { UpdateSiteConfigActionState } from "../actions";
import { updateSiteConfigAction } from "../actions";
import { useToast } from "@/providers/ToastProvider";
import { ConfigPreviewFrame } from "./ConfigPreviewFrame";
import { EditorDialog } from "./EditorDialog";
import { SaveBar } from "./SaveBar";
import {
  DEFAULT_LOCALE,
  ensureArray,
  ensureLocalizedRecord,
  ensureString,
  getLocaleText,
  mergeMeta,
  setLocaleText,
} from "./editorUtils";

const LOCALE_LABELS: Record<string, string> = {
  "zh-CN": "简体中文",
  "en": "English",
};
const SUPPORTED_LOCALES = Object.keys(LOCALE_LABELS) as Array<keyof typeof LOCALE_LABELS>;

type LocalizedRecord = Record<string, string>;

const MAX_PHONE_COUNT = 3;
const PHONE_ICON_COMPONENTS = [PreviewPhoneDeskIcon, PreviewPhoneMobileIcon, PreviewPhoneClassicIcon] as const;

interface FooterBrandState {
  logo: string;
  name: LocalizedRecord;
  tagline: LocalizedRecord;
}

interface FooterContactPhoneState {
  id: string;
  label: string;
  href: string;
}

interface FooterContactState {
  address: LocalizedRecord;
  phones: FooterContactPhoneState[];
  emailLabel: string;
  emailHref: string;
}

interface FooterNavLinkState {
  id: string;
  label: LocalizedRecord;
  href: string;
}

interface FooterNavGroupState {
  id: string;
  title: LocalizedRecord;
  links: FooterNavLinkState[];
}

interface FooterQuickLinkState {
  id: string;
  label: LocalizedRecord;
  href: string;
}

interface FooterLegalState {
  copyright: LocalizedRecord;
  icp: LocalizedRecord;
  privacyLabel: LocalizedRecord;
  privacyHref: string;
  termsLabel: LocalizedRecord;
  termsHref: string;
}

interface FooterConfigState {
  brand: FooterBrandState;
  contact: FooterContactState;
  navigationGroups: FooterNavGroupState[];
  quickLinks: FooterQuickLinkState[];
  legal: FooterLegalState;
  _meta?: Record<string, unknown>;
}

type EditingTarget =
  | { type: "brand" }
  | { type: "contact" }
  | { type: "navigation" }
  | { type: "quick-links" }
  | { type: "legal" };

const FOOTER_EDIT_GROUPS: Array<{
  anchor: string;
  label: string;
  actions: Array<{ label: string; target: EditingTarget }>;
}> = [
  {
    anchor: "brand",
    label: "品牌与联系",
    actions: [
      { label: "品牌信息", target: { type: "brand" } },
      { label: "联系信息", target: { type: "contact" } },
    ],
  },
  {
    anchor: "navigation",
    label: "链接分组",
    actions: [{ label: "导航分组", target: { type: "navigation" } }],
  },
  {
    anchor: "quick-links",
    label: "快捷入口",
    actions: [{ label: "快捷链接", target: { type: "quick-links" } }],
  },
  {
    anchor: "legal-links",
    label: "版权信息",
    actions: [{ label: "版权与备案", target: { type: "legal" } }],
  },
];

export function FooterConfigEditor({ configKey, initialConfig }: { configKey: string; initialConfig: Record<string, unknown> }) {
  const [config, setConfig] = useState<FooterConfigState>(() => normalizeFooterConfig(initialConfig));
  const [baseline, setBaseline] = useState<FooterConfigState>(() => normalizeFooterConfig(initialConfig));
  const [editing, setEditing] = useState<EditingTarget | null>(null);
  const [formState, dispatch] = useFormState<UpdateSiteConfigActionState, FormData>(updateSiteConfigAction, { status: "idle" });
  const formRef = useRef<HTMLFormElement>(null);
  const latestConfigRef = useRef(config);
  const toast = useToast();

  useEffect(() => {
    const next = normalizeFooterConfig(initialConfig);
    setConfig(next);
    setBaseline(next);
  }, [initialConfig]);

  useEffect(() => {
    latestConfigRef.current = config;
  }, [config]);

  useEffect(() => {
    if (formState.status === "success") {
      const current = latestConfigRef.current;
      setBaseline(structuredClone(current));
      formRef.current?.classList.add("animate-pulse");
      const timer = window.setTimeout(() => formRef.current?.classList.remove("animate-pulse"), 400);
      toast.success("保存成功");
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [formState.status, toast]);

  const payload = useMemo(() => JSON.stringify(serializeFooterConfig(config)), [config]);
  const isDirty = useMemo(() => JSON.stringify(config) !== JSON.stringify(baseline), [config, baseline]);
  const dirtyLabel = isDirty ? "有未保存的更改" : "暂无未保存的更改";

  return (
    <div className="space-y-10">

      <FooterPreview config={config} onEdit={setEditing} />

      {editing?.type === "brand" ? (
        <BrandDialog
          value={config.brand}
          onCancel={() => setEditing(null)}
          onSave={(next) => {
            setConfig((prev) => ({ ...prev, brand: next }));
            setEditing(null);
          }}
        />
      ) : null}

      {editing?.type === "contact" ? (
        <ContactDialog
          value={config.contact}
          onCancel={() => setEditing(null)}
          onSave={(next) => {
            setConfig((prev) => ({ ...prev, contact: next }));
            setEditing(null);
          }}
        />
      ) : null}

      {editing?.type === "navigation" ? (
        <NavigationDialog
          value={config.navigationGroups}
          onCancel={() => setEditing(null)}
          onSave={(next) => {
            setConfig((prev) => ({ ...prev, navigationGroups: next }));
            setEditing(null);
          }}
        />
      ) : null}

      {editing?.type === "quick-links" ? (
        <QuickLinksDialog
          value={config.quickLinks}
          onCancel={() => setEditing(null)}
          onSave={(next) => {
            setConfig((prev) => ({ ...prev, quickLinks: next }));
            setEditing(null);
          }}
        />
      ) : null}

      {editing?.type === "legal" ? (
        <LegalDialog
          value={config.legal}
          onCancel={() => setEditing(null)}
          onSave={(next) => {
            setConfig((prev) => ({ ...prev, legal: next }));
            setEditing(null);
          }}
        />
      ) : null}

      <SaveBar
        configKey={configKey}
        payload={payload}
        formAction={dispatch}
        isDirty={isDirty}
        status={formState}
        formRef={formRef}
      />
    </div>
  );
}

function FooterPreview({ config, onEdit }: { config: FooterConfigState; onEdit: (target: EditingTarget) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const anchors = usePreviewAnchors(containerRef);

  const brandNameZh = getLocaleText(config.brand.name, "zh-CN", "广州时代篷房有限公司");
  const brandNameEn = getLocaleText(config.brand.name, "en", brandNameZh);
  const taglineZh = getLocaleText(config.brand.tagline, "zh-CN", "模块化临建 · 设计制造交付一体");
  const address = getLocaleText(config.contact.address, "zh-CN", "广东省广州市");
  const icp = getLocaleText(config.legal.icp, undefined, "浙ICP备00000000号");
  const copyright = getLocaleText(config.legal.copyright, undefined, "© Times Tent");
  const contactPhones = config.contact.phones.filter((phone) =>
    Boolean(phone.label?.trim() || phone.href?.trim()),
  );
  const previewPhones = contactPhones.length
    ? contactPhones
    : [{ id: "placeholder", label: "联系电话", href: "" }];

  const navigationConfig = useMemo<NavigationConfig>(createNavigationConfig, []);
  const navDerivedGroups = useMemo(
    () => buildNavigationGroupsFromNavigation(navigationConfig),
    [navigationConfig],
  );

  const hasConfiguredNavigation = config.navigationGroups.length > 0;
  const navigationGroups = hasConfiguredNavigation
    ? config.navigationGroups
    : navDerivedGroups.length
      ? navDerivedGroups
      : [
          {
            id: "fallback-group",
            title: { [DEFAULT_LOCALE]: "链接分组" },
            links: [
              { id: "fallback-link", label: { [DEFAULT_LOCALE]: "示例链接" }, href: "/" },
              { id: "fallback-link-2", label: { [DEFAULT_LOCALE]: "联系我们" }, href: "/contact" },
            ],
          },
        ];

  const navShortcuts = useMemo(
    () => buildQuickLinksFromNavigation(navigationConfig),
    [navigationConfig],
  );

  const hasConfiguredQuickLinks = config.quickLinks.length > 0;
  const quickLinks = hasConfiguredQuickLinks
    ? config.quickLinks
    : navShortcuts.length
      ? navShortcuts
      : [
          { id: "quick-1", label: { [DEFAULT_LOCALE]: "首页" }, href: "/" },
          { id: "quick-2", label: { [DEFAULT_LOCALE]: "产品中心" }, href: "/products" },
        ];

  const usingNavigationColumns = !hasConfiguredNavigation && navDerivedGroups.length > 0;
  const usingNavigationShortcuts = !hasConfiguredQuickLinks && navShortcuts.length > 0;

  return (
    <ConfigPreviewFrame
      title="网站尾部预览"
      description="预览与前端一致，点击区域内的编辑按钮即可修改内容。"
      viewportWidth={1180}
      autoScale
      maxHeight={null}
    >
      <div ref={containerRef} className="relative">
        <footer className="overflow-hidden bg-[var(--color-brand-secondary)] text-white">
          <div className="mx-auto w-full max-w-[1180px] space-y-12 px-4 py-14 sm:px-6 lg:px-8">
            <div
              className="grid gap-12 lg:grid-cols-[minmax(280px,320px)_minmax(0,1fr)] lg:items-start lg:gap-16"
              data-preview-anchor="brand"
            >
              <div className="space-y-6">
                <div className="space-y-4">
                  {config.brand.logo ? (
                    <Image src={config.brand.logo} alt={brandNameZh} width={240} height={64} className="h-12 w-auto" />
                  ) : (
                    <div className="flex h-12 w-48 items-center justify-center rounded-xl border border-white/20 text-sm text-white/70">
                      上传 LOGO
                    </div>
                  )}
                  <div className="space-y-1 text-white">
                    <p className="text-2xl font-semibold tracking-[0.02em]">{brandNameZh}</p>
                    <p className="text-lg tracking-[-0.04em] text-white/80">{brandNameEn}</p>
                    <p className="text-sm text-white/80">{taglineZh}</p>
                  </div>
                </div>
                <div className="space-y-3 text-sm text-white/85" data-preview-anchor="contact">
                  <div className="flex items-start gap-2">
                    <span className="mt-1 text-white/80">📍</span>
                    <p className="leading-relaxed">{address}</p>
                  </div>
                  {previewPhones.map((phone, index) => {
                    const label = phone.label?.trim() || "联系电话";
                    const href = phone.href?.trim() || `tel:${label.replace(/\s+/g, "")}`;
                    const IconComponent = PHONE_ICON_COMPONENTS[index] ?? PreviewPhoneClassicIcon;
                    return (
                      <div key={phone.id ?? `phone-${index}`} className="flex items-center gap-2">
                        <IconComponent className="h-4 w-4 text-white/70" />
                        <a href={href} className="transition hover:text-white">
                          {label}
                        </a>
                      </div>
                    );
                  })}
                  <div className="flex items-center gap-2">
                    <span className="text-white/80">✉</span>
                    <a href={config.contact.emailHref || "mailto:"} className="transition hover:text-white">
                      {config.contact.emailLabel || "邮箱"}
                    </a>
                  </div>
                </div>
              </div>
              <nav className="flex flex-1 flex-wrap items-start justify-between gap-8" data-preview-anchor="navigation">
                {navigationGroups.map((group) => (
                  <div key={group.id} className="flex-1 min-w-[160px] space-y-3 text-left">
                    <p className="text-base font-bold tracking-wide text-[var(--color-brand-primary)]">
                      {getLocaleText(group.title, undefined, "链接分组")}
                    </p>
                    <ul className="space-y-2 text-sm text-white/75">
                      {group.links.length ? (
                        group.links.map((item) => (
                          <li key={item.id}>
                            <Link href={item.href || "#"} className="transition hover:text-white">
                              {getLocaleText(item.label, undefined, item.href || "链接")}
                            </Link>
                          </li>
                        ))
                      ) : (
                        <li className="text-white/50">暂无链接</li>
                      )}
                    </ul>
                  </div>
                ))}
              </nav>
              {usingNavigationColumns ? (
                <p className="col-span-full text-xs text-white/45">
                  当前分组根据导航栏配置自动生成，如需调整请前往“导航栏”配置页面。
                </p>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-4 border-t border-white/10 pt-6 text-xs text-white/70" data-preview-anchor="quick-links">
              {quickLinks.map((item) => (
                <Link key={item.id} href={item.href || "#"} className="transition hover:text-white">
                  {getLocaleText(item.label, undefined, item.href || "链接")}
                </Link>
              ))}
              {usingNavigationShortcuts ? (
                <span className="w-full text-[11px] text-white/45">
                  快捷入口同样来自导航栏主菜单，若需调整请修改对应导航链接。
                </span>
              ) : null}
            </div>

            <div className="flex flex-col gap-2 border-t border-white/10 pt-6 text-xs text-white/55 sm:flex-row sm:items-center sm:justify-between">
              <p>{copyright}</p>
              <div className="flex flex-wrap gap-3" data-preview-anchor="legal-links">
                <Link href={config.legal.privacyHref || "#"} className="transition hover:text-white">
                  {getLocaleText(config.legal.privacyLabel, undefined, "隐私政策")}
                </Link>
                <Link href={config.legal.termsHref || "#"} className="transition hover:text-white">
                  {getLocaleText(config.legal.termsLabel, undefined, "服务条款")}
                </Link>
                <span>{icp}</span>
              </div>
            </div>
          </div>
        </footer>
        <PreviewEditControls anchors={anchors} onEdit={onEdit} />
      </div>
    </ConfigPreviewFrame>
  );
}

type AnchorMap = Record<string, HTMLElement | undefined>;

function usePreviewAnchors(containerRef: RefObject<HTMLElement>): AnchorMap {
  const [anchors, setAnchors] = useState<AnchorMap>({});

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const originalPositions = new Map<HTMLElement, string>();

    const updateAnchors = () => {
      const next: AnchorMap = {};
      for (const { anchor } of FOOTER_EDIT_GROUPS) {
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

function PreviewEditControls({ anchors, onEdit }: { anchors: AnchorMap; onEdit: (target: EditingTarget) => void }) {
  return (
    <>
      {FOOTER_EDIT_GROUPS.map(({ anchor, actions, label }) => {
        const element = anchors[anchor];
        if (!element) return null;
        const isBrandAnchor = anchor === "brand";
        const isLegalAnchor = anchor === "legal-links";
        const baseContainer = "pointer-events-auto absolute";
        const columnContainer = "flex flex-col gap-2";
        const containerClasses = isBrandAnchor
          ? `${baseContainer} ${columnContainer} left-4 bottom-2 items-start`
          : isLegalAnchor
            ? `${baseContainer} flex gap-2 items-center right-full bottom-1 pr-3`
            : `${baseContainer} ${columnContainer} right-4 top-4 items-end`;
        const labelClasses = "rounded-full bg-black/60 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-white/85 shadow";
        return createPortal(
          <div className="pointer-events-none absolute inset-0">
            <div className={containerClasses}>
              <span className={labelClasses}>
                {label}
              </span>
              <div
                className={
                  isBrandAnchor
                    ? "flex flex-wrap gap-2"
                    : isLegalAnchor
                      ? "flex items-center gap-2"
                      : "flex flex-wrap justify-end gap-2"
                }
              >
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

function BrandDialog({ value, onSave, onCancel }: { value: FooterBrandState; onSave: (next: FooterBrandState) => void; onCancel: () => void }) {
  const [draft, setDraft] = useState<FooterBrandState>(() => structuredClone(value));

  useEffect(() => {
    setDraft(structuredClone(value));
  }, [value]);

  return (
    <EditorDialog title="编辑品牌信息" subtitle="更新 LOGO、公司名称与标语" onSave={() => onSave(structuredClone(draft))} onCancel={onCancel}>
      <div className="space-y-6 text-sm">
        <ImageUploadField
          label="LOGO 图片"
          value={draft.logo}
          onChange={(next) => setDraft((prev) => ({ ...prev, logo: next }))}
          helper="建议上传透明背景 PNG，宽 240px 左右"
        />
        <div className="grid gap-4 md:grid-cols-2">
          {SUPPORTED_LOCALES.map((locale) => (
            <TextField
              key={`brand-name-${locale}`}
              label={`企业名称（${LOCALE_LABELS[locale]}）`}
              value={draft.name[locale] ?? ""}
              onChange={(next) =>
                setDraft((prev) => ({ ...prev, name: setLocaleText(prev.name, next, locale) }))
              }
            />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {SUPPORTED_LOCALES.map((locale) => (
            <TextField
              key={`brand-tagline-${locale}`}
              label={`品牌标语（${LOCALE_LABELS[locale]}）`}
              value={draft.tagline[locale] ?? ""}
              onChange={(next) =>
                setDraft((prev) => ({ ...prev, tagline: setLocaleText(prev.tagline, next, locale) }))
              }
            />
          ))}
        </div>
      </div>
    </EditorDialog>
  );
}

function ContactDialog({ value, onSave, onCancel }: { value: FooterContactState; onSave: (next: FooterContactState) => void; onCancel: () => void }) {
  const [draft, setDraft] = useState<FooterContactState>(() => structuredClone(value));

  useEffect(() => {
    setDraft(structuredClone(value));
  }, [value]);

  const handlePhoneChange = (id: string, field: "label" | "href", next: string) => {
    setDraft((prev) => ({
      ...prev,
      phones: prev.phones.map((phone) => (phone.id === id ? { ...phone, [field]: next } : phone)),
    }));
  };

  const handleAddPhone = () => {
    setDraft((prev) => {
      if (prev.phones.length >= MAX_PHONE_COUNT) return prev;
      return {
        ...prev,
        phones: [...prev.phones, { id: createId("contact-phone"), label: "", href: "" }],
      };
    });
  };

  const handleRemovePhone = (id: string) => {
    setDraft((prev) => {
      if (prev.phones.length <= 1) return prev;
      return {
        ...prev,
        phones: prev.phones.filter((phone) => phone.id !== id),
      };
    });
  };

  const phoneLimitReached = draft.phones.length >= MAX_PHONE_COUNT;

  return (
    <EditorDialog title="编辑联系信息" subtitle="更新地址、电话与邮箱" onSave={() => onSave(structuredClone(draft))} onCancel={onCancel}>
      <div className="space-y-6 text-sm">
        {SUPPORTED_LOCALES.map((locale) => (
          <TextField
            key={`address-${locale}`}
            label={`公司地址（${LOCALE_LABELS[locale]}）`}
            value={draft.address[locale] ?? ""}
            onChange={(next) =>
              setDraft((prev) => ({ ...prev, address: setLocaleText(prev.address, next, locale) }))
            }
            multiline
            rows={3}
          />
        ))}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-text-tertiary,#8690a3)]">
              联系电话
            </h3>
            <button
              type="button"
              onClick={handleAddPhone}
              className="rounded-full border border-[var(--color-brand-primary)] px-3 py-1 text-xs font-semibold text-[var(--color-brand-primary)] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={phoneLimitReached}
            >
              + 添加电话
            </button>
          </div>
          {draft.phones.map((phone, index) => (
            <div key={phone.id} className="space-y-3 rounded-2xl border border-[var(--color-border)] bg-white/80 p-4">
              <div className="flex items-center justify-between text-xs text-[var(--color-text-tertiary,#8690a3)]">
                <span>电话 {index + 1}</span>
                {draft.phones.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => handleRemovePhone(phone.id)}
                    className="rounded-full border border-rose-200 px-3 py-1 text-rose-500 transition hover:bg-rose-50"
                  >
                    删除
                  </button>
                ) : null}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <TextField
                  label="电话显示文本"
                  value={phone.label}
                  onChange={(next) => handlePhoneChange(phone.id, "label", next)}
                />
                <TextField
                  label="电话链接（tel:）"
                  value={phone.href}
                  onChange={(next) => handlePhoneChange(phone.id, "href", next)}
                  placeholder="tel:+86..."
                />
              </div>
            </div>
          ))}
          {phoneLimitReached ? (
            <p className="text-xs text-[var(--color-text-tertiary,#8690a3)]">最多支持保存 {MAX_PHONE_COUNT} 个电话。</p>
          ) : null}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <TextField
            label="邮箱显示文本"
            value={draft.emailLabel}
            onChange={(next) => setDraft((prev) => ({ ...prev, emailLabel: next }))}
          />
          <TextField
            label="邮箱链接（mailto:）"
            value={draft.emailHref}
            onChange={(next) => setDraft((prev) => ({ ...prev, emailHref: next }))}
            placeholder="mailto:"
          />
        </div>
      </div>
    </EditorDialog>
  );
}

function NavigationDialog({ value, onSave, onCancel }: { value: FooterNavGroupState[]; onSave: (next: FooterNavGroupState[]) => void; onCancel: () => void }) {
  const [draft, setDraft] = useState<FooterNavGroupState[]>(() => value.map(cloneNavGroup));

  useEffect(() => {
    setDraft(value.map(cloneNavGroup));
  }, [value]);

  const handleAddGroup = () => {
    setDraft((prev) => [
      ...prev,
      {
        id: createId("nav-group"),
        title: { [DEFAULT_LOCALE]: "新分组" },
        links: [],
      },
    ]);
  };

  const handleRemoveGroup = (id: string) => {
    setDraft((prev) => prev.filter((group) => group.id !== id));
  };

  const handleAddLink = (groupId: string) => {
    setDraft((prev) =>
      prev.map((group) =>
        group.id === groupId
          ? {
              ...group,
              links: [
                ...group.links,
                {
                  id: createId("nav-link"),
                  href: "",
                  label: { [DEFAULT_LOCALE]: "新链接" },
                },
              ],
            }
          : group,
      ),
    );
  };

  const handleRemoveLink = (groupId: string, linkId: string) => {
    setDraft((prev) =>
      prev.map((group) =>
        group.id === groupId
          ? { ...group, links: group.links.filter((link) => link.id !== linkId) }
          : group,
      ),
    );
  };

  return (
    <EditorDialog title="编辑导航分组" subtitle="为尾部添加分组与链接" onSave={() => onSave(draft.map(cloneNavGroup))} onCancel={onCancel}>
      <div className="space-y-6 text-sm">
        <div className="flex justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-text-tertiary,#8690a3)]">
            链接分组
          </h3>
          <button
            type="button"
            onClick={handleAddGroup}
            className="rounded-full border border-[var(--color-brand-primary)] px-3 py-1 text-xs font-semibold text-[var(--color-brand-primary)]"
          >
            + 新增分组
          </button>
        </div>
        {draft.length ? (
          <div className="space-y-5">
            {draft.map((group, groupIndex) => (
              <div key={group.id} className="space-y-4 rounded-2xl border border-[var(--color-border)] bg-white/80 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--color-text-tertiary,#8690a3)]">
                  <span>分组 {groupIndex + 1}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveGroup(group.id)}
                    className="rounded-full border border-rose-200 px-3 py-1 text-rose-500 transition hover:bg-rose-50"
                  >
                    删除分组
                  </button>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {SUPPORTED_LOCALES.map((locale) => (
                    <TextField
                      key={`${group.id}-title-${locale}`}
                      label={`分组标题（${LOCALE_LABELS[locale]}）`}
                      value={group.title[locale] ?? ""}
                      onChange={(next) =>
                        setDraft((prev) =>
                          prev.map((item) =>
                            item.id === group.id
                              ? { ...item, title: setLocaleText(item.title, next, locale) }
                              : item,
                          ),
                        )
                      }
                    />
                  ))}
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-text-tertiary,#8690a3)]">
                      链接
                    </h4>
                    <button
                      type="button"
                      onClick={() => handleAddLink(group.id)}
                      className="rounded-full border border-[var(--color-border)] px-3 py-1 text-xs font-semibold text-[var(--color-brand-secondary)] transition hover:border-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary)]"
                    >
                      + 新增链接
                    </button>
                  </div>
                  {group.links.length ? (
                    <div className="space-y-3">
                      {group.links.map((link) => (
                        <div key={link.id} className="space-y-3 rounded-2xl border border-[var(--color-border)] bg-white/60 p-4">
                          <div className="flex justify-between text-xs text-[var(--color-text-tertiary,#8690a3)]">
                            <span>链接</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveLink(group.id, link.id)}
                              className="rounded-full border border-rose-200 px-3 py-1 text-rose-500 transition hover:bg-rose-50"
                            >
                              删除
                            </button>
                          </div>
                          <TextField
                            label="链接地址"
                            value={link.href}
                            onChange={(next) =>
                              setDraft((prev) =>
                                prev.map((item) =>
                                  item.id === group.id
                                    ? {
                                        ...item,
                                        links: item.links.map((entry) =>
                                          entry.id === link.id ? { ...entry, href: next } : entry,
                                        ),
                                      }
                                    : item,
                                ),
                              )
                            }
                            placeholder="/path or https://"
                          />
                          <div className="grid gap-4 md:grid-cols-2">
                            {SUPPORTED_LOCALES.map((locale) => (
                              <TextField
                                key={`${link.id}-label-${locale}`}
                                label={`链接文案（${LOCALE_LABELS[locale]}）`}
                                value={link.label[locale] ?? ""}
                                onChange={(next) =>
                                  setDraft((prev) =>
                                    prev.map((item) =>
                                      item.id === group.id
                                        ? {
                                            ...item,
                                            links: item.links.map((entry) =>
                                              entry.id === link.id
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
                    <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-white/40 px-4 py-3 text-xs text-[var(--color-text-tertiary,#8690a3)]">
                      当前分组暂无链接，点击上方按钮添加。
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-white/60 px-4 py-6 text-xs text-[var(--color-text-tertiary,#8690a3)]">
            暂无分组，点击右上角“新增分组”开始配置。
          </div>
        )}
      </div>
    </EditorDialog>
  );
}

function QuickLinksDialog({ value, onSave, onCancel }: { value: FooterQuickLinkState[]; onSave: (next: FooterQuickLinkState[]) => void; onCancel: () => void }) {
  const [draft, setDraft] = useState<FooterQuickLinkState[]>(() => value.map(cloneQuickLink));

  useEffect(() => {
    setDraft(value.map(cloneQuickLink));
  }, [value]);

  const handleAdd = () => {
    setDraft((prev) => [
      ...prev,
      { id: createId("quick-link"), href: "", label: { [DEFAULT_LOCALE]: "新链接" } },
    ]);
  };

  const handleRemove = (id: string) => {
    setDraft((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <EditorDialog title="编辑快捷链接" subtitle="配置尾部快捷入口" onSave={() => onSave(draft.map(cloneQuickLink))} onCancel={onCancel}>
      <div className="space-y-4 text-sm">
        <div className="flex justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-text-tertiary,#8690a3)]">快捷链接</h3>
          <button
            type="button"
            onClick={handleAdd}
            className="rounded-full border border-[var(--color-brand-primary)] px-3 py-1 text-xs font-semibold text-[var(--color-brand-primary)]"
          >
            + 新增链接
          </button>
        </div>
        {draft.length ? (
          <div className="space-y-3">
            {draft.map((link) => (
              <div key={link.id} className="space-y-3 rounded-2xl border border-[var(--color-border)] bg-white/70 p-4">
                <div className="flex justify-between text-xs text-[var(--color-text-tertiary,#8690a3)]">
                  <span>快捷链接</span>
                  <button
                    type="button"
                    onClick={() => handleRemove(link.id)}
                    className="rounded-full border border-rose-200 px-3 py-1 text-rose-500 transition hover:bg-rose-50"
                  >
                    删除
                  </button>
                </div>
                <TextField
                  label="链接地址"
                  value={link.href}
                  onChange={(next) =>
                    setDraft((prev) => prev.map((item) => (item.id === link.id ? { ...item, href: next } : item)))
                  }
                  placeholder="/path or https://"
                />
                <div className="grid gap-4 md:grid-cols-2">
                  {SUPPORTED_LOCALES.map((locale) => (
                    <TextField
                      key={`${link.id}-quick-${locale}`}
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
            暂无快捷链接，点击右上角添加。
          </div>
        )}
      </div>
    </EditorDialog>
  );
}

function LegalDialog({ value, onSave, onCancel }: { value: FooterLegalState; onSave: (next: FooterLegalState) => void; onCancel: () => void }) {
  const [draft, setDraft] = useState<FooterLegalState>(() => structuredClone(value));

  useEffect(() => {
    setDraft(structuredClone(value));
  }, [value]);

  return (
    <EditorDialog title="编辑版权与备案" subtitle="更新版权声明、条款链接" onSave={() => onSave(structuredClone(draft))} onCancel={onCancel}>
      <div className="space-y-6 text-sm">
        {SUPPORTED_LOCALES.map((locale) => (
          <TextField
            key={`copyright-${locale}`}
            label={`版权声明（${LOCALE_LABELS[locale]}）`}
            value={draft.copyright[locale] ?? ""}
            onChange={(next) =>
              setDraft((prev) => ({ ...prev, copyright: setLocaleText(prev.copyright, next, locale) }))
            }
            multiline
            rows={2}
          />
        ))}
        {SUPPORTED_LOCALES.map((locale) => (
          <TextField
            key={`icp-${locale}`}
            label={`备案号（${LOCALE_LABELS[locale]}）`}
            value={draft.icp[locale] ?? ""}
            onChange={(next) => setDraft((prev) => ({ ...prev, icp: setLocaleText(prev.icp, next, locale) }))}
          />
        ))}
        <div className="grid gap-4 md:grid-cols-2">
          {SUPPORTED_LOCALES.map((locale) => (
            <TextField
              key={`privacy-${locale}`}
              label={`隐私政策标题（${LOCALE_LABELS[locale]}）`}
              value={draft.privacyLabel[locale] ?? ""}
              onChange={(next) =>
                setDraft((prev) => ({ ...prev, privacyLabel: setLocaleText(prev.privacyLabel, next, locale) }))
              }
            />
          ))}
          <TextField
            label="隐私政策链接"
            value={draft.privacyHref}
            onChange={(next) => setDraft((prev) => ({ ...prev, privacyHref: next }))}
            placeholder="/privacy"
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {SUPPORTED_LOCALES.map((locale) => (
            <TextField
              key={`terms-${locale}`}
              label={`服务条款标题（${LOCALE_LABELS[locale]}）`}
              value={draft.termsLabel[locale] ?? ""}
              onChange={(next) =>
                setDraft((prev) => ({ ...prev, termsLabel: setLocaleText(prev.termsLabel, next, locale) }))
              }
            />
          ))}
          <TextField
            label="服务条款链接"
            value={draft.termsHref}
            onChange={(next) => setDraft((prev) => ({ ...prev, termsHref: next }))}
            placeholder="/terms"
          />
        </div>
      </div>
    </EditorDialog>
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

function ImageUploadField({
  label,
  value,
  onChange,
  helper,
  uploadEndpoint = "/api/uploads",
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  helper?: string;
  uploadEndpoint?: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelectFile = () => fileInputRef.current?.click();

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("请上传图片文件");
      event.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("图片大小不能超过 5MB");
      event.target.value = "";
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch(uploadEndpoint, { method: "POST", body: formData });
      const result = (await response.json().catch(() => null)) as { url?: string; error?: string } | null;
      if (!response.ok || !result?.url) {
        throw new Error(result?.error ?? "上传失败，请稍后重试");
      }
      onChange(result.url);
    } catch (err) {
      console.error("image upload failed", err);
      setError(err instanceof Error ? err.message : "上传失败，请稍后重试");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const handleClear = () => {
    onChange("");
    setError(null);
  };

  const hasValue = Boolean(value?.trim());

  return (
    <div className="space-y-2 text-sm">
      <span className="font-medium text-[var(--color-brand-secondary)]">{label}</span>
      <div className="space-y-2 rounded-2xl border border-[var(--color-border)] bg-white/80 p-3">
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="https://..."
          className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-brand-secondary)] focus:border-[var(--color-brand-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/30"
        />
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            type="button"
            onClick={handleSelectFile}
            className="rounded-full border border-[var(--color-brand-primary)] px-3 py-1 font-semibold text-[var(--color-brand-primary)] transition hover:bg-[var(--color-brand-primary)]/10"
            disabled={uploading}
          >
            {uploading ? "上传中..." : "本地上传"}
          </button>
          {hasValue ? (
            <button
              type="button"
              onClick={handleClear}
              className="rounded-full border border-[var(--color-border)] px-3 py-1 text-[var(--color-text-secondary)] transition hover:border-rose-200 hover:text-rose-500"
            >
              清空
            </button>
          ) : null}
          {error ? <span className="text-rose-500">{error}</span> : null}
        </div>
        {helper ? <p className="text-xs text-[var(--color-text-tertiary,#8690a3)]">{helper}</p> : null}
        {hasValue ? (
          <div className="relative mt-2 h-32 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]">
            <Image src={value} alt="图片预览" fill sizes="100vw" className="object-cover" />
          </div>
        ) : null}
      </div>
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
    </div>
  );
}

function ensureRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function hasLocalized(record: LocalizedRecord): boolean {
  return Object.values(record).some((value) => value?.trim().length);
}

function cleanLocalized(record: LocalizedRecord, required = false): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [locale, value] of Object.entries(record)) {
    const trimmed = value?.trim();
    if (trimmed) {
      result[locale] = trimmed;
    }
  }
  if (!Object.keys(result).length && required) {
    return { [DEFAULT_LOCALE]: "" };
  }
  return result;
}

function normalizeFooterConfig(raw: Record<string, unknown>): FooterConfigState {
  const record = ensureRecord(raw);
  const brandRecord = ensureRecord(record.brand);
  const contactRecord = ensureRecord(record.contact);
  const legalRecord = ensureRecord(record.legal);

  const navigationGroups = ensureArray<Record<string, unknown>>(record.navigationGroups).map((group, index) => {
    const title = ensureLocalizedRecord(group.title);
    const links = ensureArray<Record<string, unknown>>(group.links).map((link, linkIndex) => ({
      id: makeStableId("nav-link", ensureString(link.href) || ensureString(linkIndex), linkIndex),
      href: ensureString(link.href),
      label: ensureLocalizedRecord(link.label),
    }));
    return {
      id: makeStableId("nav-group", ensureString(title[DEFAULT_LOCALE]) || `group-${index}`, index),
      title,
      links,
    } satisfies FooterNavGroupState;
  });

  const quickLinks = ensureArray<Record<string, unknown>>(record.quickLinks).map((link, index) => ({
    id: makeStableId("quick-link", ensureString(link.href) || `quick-${index}`, index),
    href: ensureString(link.href),
    label: ensureLocalizedRecord(link.label),
  }));

  let phones = ensureArray<Record<string, unknown>>(contactRecord.phones)
    .map((phone, index) => ({
      id: makeStableId(
        "contact-phone",
        ensureString(phone.href) || ensureString(phone.label) || `phone-${index}`,
        index,
      ),
      label: ensureString(ensureRecord(phone).label),
      href: ensureString(ensureRecord(phone).href),
    }))
    .filter((phone) => Boolean(phone.label.trim() || phone.href.trim()))
    .slice(0, MAX_PHONE_COUNT);

  if (!phones.length) {
    const legacyPhone = ensureRecord(contactRecord.phone);
    const legacyLabel = ensureString(legacyPhone.label);
    const legacyHref = ensureString(legacyPhone.href);
    if (legacyLabel || legacyHref) {
      phones = [
        {
          id: makeStableId("contact-phone", legacyHref || legacyLabel || "primary", 0),
          label: legacyLabel,
          href: legacyHref,
        },
      ];
    }
  }

  if (!phones.length) {
    phones = [{ id: createId("contact-phone"), label: "", href: "" }];
  }

  return {
    brand: {
      logo: ensureString(brandRecord.logo),
      name: ensureLocalizedRecord(brandRecord.name),
      tagline: ensureLocalizedRecord(brandRecord.tagline),
    },
    contact: {
      address: ensureLocalizedRecord(contactRecord.address),
      phones,
      emailLabel: ensureString(ensureRecord(contactRecord.email).label),
      emailHref: ensureString(ensureRecord(contactRecord.email).href),
    },
    navigationGroups,
    quickLinks,
    legal: {
      copyright: ensureLocalizedRecord(legalRecord.copyright),
      icp: ensureLocalizedRecord(legalRecord.icp),
      privacyLabel: ensureLocalizedRecord(ensureRecord(legalRecord.privacy).label),
      privacyHref: ensureString(ensureRecord(legalRecord.privacy).href),
      termsLabel: ensureLocalizedRecord(ensureRecord(legalRecord.terms).label),
      termsHref: ensureString(ensureRecord(legalRecord.terms).href),
    },
    _meta: ensureRecord(record._meta),
  } satisfies FooterConfigState;
}

function serializeFooterConfig(config: FooterConfigState): Record<string, unknown> {
  const navigationGroups = config.navigationGroups
    .map((group) => ({
      title: cleanLocalized(group.title, true),
      links: group.links
        .filter((link) => link.href.trim())
        .map((link) => ({
          href: link.href.trim(),
          label: cleanLocalized(link.label, true),
        })),
    }))
    .filter((group) => group.links.length > 0);

  const quickLinks = config.quickLinks
    .filter((link) => link.href.trim())
    .map((link) => ({
      href: link.href.trim(),
      label: cleanLocalized(link.label, true),
    }));

  const phones = config.contact.phones
    .map((phone) => ({
      label: phone.label.trim(),
      href: phone.href.trim(),
    }))
    .filter((phone) => phone.label || phone.href)
    .slice(0, MAX_PHONE_COUNT);

  const serialized = {
    brand: {
      logo: config.brand.logo.trim(),
      name: cleanLocalized(config.brand.name, true),
      ...(hasLocalized(config.brand.tagline) ? { tagline: cleanLocalized(config.brand.tagline) } : {}),
    },
    contact: {
      address: cleanLocalized(config.contact.address, true),
      phones,
      ...(phones[0] ? { phone: phones[0] } : {}),
      email: {
        label: config.contact.emailLabel.trim(),
        href: config.contact.emailHref.trim(),
      },
    },
    navigationGroups,
    quickLinks,
    legal: {
      copyright: cleanLocalized(config.legal.copyright, true),
      ...(hasLocalized(config.legal.icp) ? { icp: cleanLocalized(config.legal.icp) } : {}),
      privacy: {
        href: config.legal.privacyHref.trim(),
        label: cleanLocalized(config.legal.privacyLabel, true),
      },
      terms: {
        href: config.legal.termsHref.trim(),
        label: cleanLocalized(config.legal.termsLabel, true),
      },
    },
  } as const;

  return mergeMeta(serialized, config._meta);
}

function cloneNavGroup(group: FooterNavGroupState): FooterNavGroupState {
  return {
    id: group.id,
    title: { ...group.title },
    links: group.links.map(cloneNavLink),
  };
}

function cloneNavLink(link: FooterNavLinkState): FooterNavLinkState {
  return {
    id: link.id,
    href: link.href,
    label: { ...link.label },
  };
}

function cloneQuickLink(link: FooterQuickLinkState): FooterQuickLinkState {
  return {
    id: link.id,
    href: link.href,
    label: { ...link.label },
  };
}

function createNavigationConfig(): NavigationConfig {
  return JSON.parse(JSON.stringify(navigation_config)) as NavigationConfig;
}

function buildNavigationGroupsFromNavigation(navigation: NavigationConfig | undefined): FooterNavGroupState[] {
  if (!navigation?.groups?.length) return [];
  const mainGroup = navigation.groups.find((group) => group.key === "main") ?? navigation.groups[0];
  if (!mainGroup?.links?.length) return [];

  return ensureArray<NavigationLink>(mainGroup.links)
    .map((link, index) => {
      const children = ensureArray<NavigationLink>(link.children);
      if (!children.length) return null;
      return {
        id: makeStableId("nav-column", ensureString(link.slug) || ensureString(link.href) || `nav-${index}`, index),
        title: ensureLocalizedRecord(link.label),
        links: children.map((child, childIndex) => ({
          id: makeStableId(
            "nav-column-link",
            ensureString(child.slug) || ensureString(child.href) || `nav-${index}-link-${childIndex}`,
            childIndex,
          ),
          href: ensureString(child.href),
          label: ensureLocalizedRecord(child.label),
        })),
      } satisfies FooterNavGroupState;
    })
    .filter((group): group is FooterNavGroupState => Boolean(group));
}

function buildQuickLinksFromNavigation(navigation: NavigationConfig | undefined): FooterQuickLinkState[] {
  if (!navigation?.groups?.length) return [];
  const mainGroup = navigation.groups.find((group) => group.key === "main") ?? navigation.groups[0];
  if (!mainGroup?.links?.length) return [];

  const quickOrder = ["home", "videos", "news", "contact"] as const;
  const bySlug = new Map<string, NavigationLink>();
  ensureArray<NavigationLink>(mainGroup.links).forEach((link) => {
    if (link.slug) {
      bySlug.set(String(link.slug), link);
    }
  });

  return quickOrder
    .map((slug, index) => {
      const link = bySlug.get(slug);
      if (!link) return null;
      return {
        id: makeStableId("quick-nav", slug, index),
        href: ensureString(link.href),
        label: ensureLocalizedRecord(link.label),
      } satisfies FooterQuickLinkState;
    })
    .filter((link): link is FooterQuickLinkState => Boolean(link));
}


function PreviewPhoneClassicIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <rect x={7} y={3} width={10} height={18} rx={1.5} stroke="currentColor" strokeWidth={1.5} />
      <path d="M10 6h4" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
      <circle cx={12} cy={18} r={0.9} fill="currentColor" />
    </svg>
  );
}

function PreviewPhoneDeskIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path
        d="M4.5 9.5h15a1.5 1.5 0 011.5 1.5v6.25a1.75 1.75 0 01-1.75 1.75H4.75A1.75 1.75 0 013 17.25V11a1.5 1.5 0 011.5-1.5z"
        stroke="currentColor"
        strokeWidth={1.5}
      />
      <path
        d="M7 9c0-2.761 2.239-5 5-5s5 2.239 5 5"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      <path d="M9.5 15h5" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
    </svg>
  );
}

function PreviewPhoneMobileIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <rect x={8} y={3} width={8} height={18} rx={1.5} stroke="currentColor" strokeWidth={1.5} />
      <path d="M10 6h4" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
      <circle cx={12} cy={18} r={0.9} fill="currentColor" />
    </svg>
  );
}

function makeStableId(prefix: string, seed: string, index: number): string {
  const base = seed.trim().replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return `${prefix}-${base || index}`;
}

function createId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`;
}
