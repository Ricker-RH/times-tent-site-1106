"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import { useFormState, useFormStatus } from "react-dom";

import { resolveImageSrc, sanitizeImageSrc } from "@/utils/image";

import { ConfigPreviewFrame } from "./ConfigPreviewFrame";
import { EditorDialog } from "./EditorDialog";
import { LocalizedTextField } from "./LocalizedTextField";
import { SaveBar } from "./SaveBar";
import type { UpdateSiteConfigActionState } from "../actions";
import { updateSiteConfigAction } from "../actions";
import { useToast } from "@/providers/ToastProvider";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, ensureLocalizedRecord, getLocaleText, setLocaleText } from "./editorUtils";
import type { LocaleKey } from "@/i18n/locales";
import { ensureCompleteLocalizedField } from "@/i18n/locales";
import { useGlobalTranslationRegistrationForConfig } from "@/hooks/useGlobalTranslationManager";

const DEFAULT_PRODUCT_IMAGE = "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&w=1600&q=80";

type LocalizedValue = Record<LocaleKey, string>;

const normalizeCtaLabel = (value: string): string => {
  const withoutArrows = value.replace(/→+/g, "").trim();
  return withoutArrows || value.trim();
};

interface ProductCard {
  slug: string;
  name: LocalizedValue;
  tagline: LocalizedValue;
  summary: LocalizedValue;
  description: LocalizedValue;
  image: string;
  href: string;
  summaryConfigured: boolean;
  taglineConfigured: boolean;
}

interface HeroConfig {
  eyebrow: LocalizedValue;
  title: LocalizedValue;
  description: LocalizedValue;
  image: string;
  overlayEnabled: boolean;
}



interface BreadcrumbItem {
  href: string;
  label: LocalizedValue;
}

interface ProductCenterConfig {
  hero: HeroConfig;

  products: ProductCard[];
  sidebarTitle: LocalizedValue;
  productCardCtaLabel: LocalizedValue;
  breadcrumb: BreadcrumbItem[];
  _meta?: Record<string, unknown>;
}

type EditingTarget =
  | { type: "hero" }
  | { type: "general" }
  | { type: "product"; index: number };

interface ProductCenterConfigEditorProps {
  configKey: string;
  initialConfig: Record<string, unknown>;
}

interface PreviewProps {
  config: ProductCenterConfig;
  selectedProductIndex: number;
  onSelectProduct: (index: number) => void;
  onEditHero: () => void;
  onEditGeneral: () => void;
  onEditProduct: (index: number) => void;
  onAddProduct: () => void;
  onRemoveProduct: (index: number) => void;
  onReorderProduct: (sourceIndex: number, targetIndex: number) => void;
}

function toStringValue(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return fallback;
}

function cleanLocalized(value: unknown, fallback = ""): LocalizedValue {
  const record = ensureCompleteLocalizedField(value, fallback) as LocalizedValue;
  const result: LocalizedValue = { ...record };
  for (const locale of SUPPORTED_LOCALES) {
    const v = result[locale];
    if (typeof v === "string") {
      result[locale] = v.trim();
    } else {
      result[locale] = "";
    }
  }
  return result;
}

function normalizeProduct(raw: unknown, index: number): ProductCard {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {
      slug: `product-${index + 1}`,
      name: cleanLocalized("", `模块化产品 ${index + 1}`),
      tagline: cleanLocalized("", ""),
      summary: cleanLocalized("", ""),
      description: cleanLocalized("", ""),
      image: DEFAULT_PRODUCT_IMAGE,
      href: "/products",
      summaryConfigured: false,
      taglineConfigured: false,
    };
  }
  const record = raw as Record<string, unknown>;
  const candidateName =
    (typeof record.name !== "undefined" ? record.name : undefined) ??
    (typeof record.title !== "undefined" ? record.title : undefined) ??
    (typeof record.productName !== "undefined" ? record.productName : undefined) ??
    (toStringValue(record.slug) || `产品 ${index + 1}`);
  const hasTaglineField =
    Object.prototype.hasOwnProperty.call(record, "tagline") ||
    Object.prototype.hasOwnProperty.call(record, "taglineEn");
  const hasSummaryField =
    Object.prototype.hasOwnProperty.call(record, "summary") ||
    Object.prototype.hasOwnProperty.call(record, "summaryEn");
  const summarySource = hasSummaryField ? record.summary : undefined;
  const candidateSummary =
    typeof summarySource !== "undefined" && summarySource !== null
      ? summarySource
      : (typeof record.description !== "undefined" ? record.description : undefined) ?? "";
  const candidateTagline =
    typeof record.tagline !== "undefined" && record.tagline !== null
      ? record.tagline
      : (typeof record.taglineEn !== "undefined" ? record.taglineEn : undefined) ?? "";
  return {
    slug: toStringValue(record.slug, `product-${index + 1}`),
    name: cleanLocalized(candidateName, `产品 ${index + 1}`),
    tagline: cleanLocalized(candidateTagline, ""),
    summary: cleanLocalized(candidateSummary, ""),
    description: cleanLocalized(record.description, ""),
    image: resolveImageSrc(
      toStringValue(record.imageOverride) || toStringValue(record.image) || toStringValue(record.heroImage),
      DEFAULT_PRODUCT_IMAGE,
    ),
    href: toStringValue(record.href) || toStringValue(record.ctaHref) || "/products",
    summaryConfigured: hasSummaryField,
    taglineConfigured: hasTaglineField,
  };
}

function normalizeConfig(raw: Record<string, unknown>): ProductCenterConfig {
  const heroRaw = (raw.hero ?? {}) as Record<string, unknown>;

  const breadcrumbRaw = Array.isArray(raw.breadcrumb) ? raw.breadcrumb : [];
  const productsRaw = Array.isArray(raw.products) ? raw.products : [];

  return {
    hero: {
      eyebrow: cleanLocalized(heroRaw.eyebrow, ""),
      title: cleanLocalized(heroRaw.title, "模块化产品矩阵"),
      description: cleanLocalized(heroRaw.description, ""),
      image: resolveImageSrc(toStringValue(heroRaw.image), DEFAULT_PRODUCT_IMAGE),
      overlayEnabled: heroRaw.overlayEnabled !== false,
    },
    products: productsRaw.map((product, index) => normalizeProduct(product, index)),
    sidebarTitle: cleanLocalized(raw.sidebarTitle, "产品"),
    productCardCtaLabel: cleanLocalized(raw.productCardCtaLabel, "查看详情"),
    breadcrumb: breadcrumbRaw
      .map((item) => {
        if (!item || typeof item !== "object" || Array.isArray(item)) return null;
        const record = item as Record<string, unknown>;
        const href = toStringValue(record.href);
        const label = cleanLocalized(record.label, href || "链接");
        return { label, href: href || "#" };
      })
      .filter(Boolean) as BreadcrumbItem[],
    _meta:
      typeof raw._meta === "object" && raw._meta !== null
        ? (raw._meta as Record<string, unknown>)
        : undefined,
  } satisfies ProductCenterConfig;
}

function serializeProduct(product: ProductCard): Record<string, unknown> {
  const result: Record<string, unknown> = {
    slug: product.slug,
  };
  const name = cleanLocalized(product.name);
  const tagline = cleanLocalized(product.tagline);
  const summary = cleanLocalized(product.summary);
  const description = cleanLocalized(product.description);

  const hasAny = (lv: LocalizedValue) => SUPPORTED_LOCALES.some((l) => (lv[l] || "").trim());
  if (hasAny(name)) result.name = name;
  if (product.taglineConfigured || hasAny(tagline)) result.tagline = tagline;
  if (product.summaryConfigured || hasAny(summary)) result.summary = summary;
  if (hasAny(description)) result.description = description;

  if (product.image.trim()) result.image = product.image.trim();
  if (product.href.trim()) result.href = product.href.trim();
  return result;
}

function serializeConfig(config: ProductCenterConfig): Record<string, unknown> {
  const hero: Record<string, unknown> = {};
  if (config.hero.image.trim()) hero.image = config.hero.image.trim();
  const heroEyebrow = cleanLocalized(config.hero.eyebrow);
  const heroTitle = cleanLocalized(config.hero.title);
  const heroDescription = cleanLocalized(config.hero.description);
  const hasAny = (lv: LocalizedValue) => SUPPORTED_LOCALES.some((l) => (lv[l] || "").trim());
  if (hasAny(heroEyebrow)) hero.eyebrow = heroEyebrow;
  if (hasAny(heroTitle)) hero.title = heroTitle;
  if (hasAny(heroDescription)) hero.description = heroDescription;
  hero.overlayEnabled = config.hero.overlayEnabled !== false;



  const breadcrumb = config.breadcrumb.map((item) => ({
    href: item.href || "#",
    label: cleanLocalized(item.label),
  }));

  const products = config.products.map(serializeProduct);

  const result: Record<string, unknown> = {
    hero,
    products,
    breadcrumb,
  };
  const sidebarTitle = cleanLocalized(config.sidebarTitle);
  const productCardCtaLabel = cleanLocalized(config.productCardCtaLabel);
  if (hasAny(sidebarTitle)) result.sidebarTitle = sidebarTitle;
  if (hasAny(productCardCtaLabel)) result.productCardCtaLabel = productCardCtaLabel;
  if (config._meta) result._meta = config._meta;
  return result;
}

function cloneConfig(value: ProductCenterConfig): ProductCenterConfig {
  return JSON.parse(JSON.stringify(value)) as ProductCenterConfig;
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

function ImageInput({
  label,
  value,
  onChange,
  placeholder,
  helper,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  helper?: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelectFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("请选择图片文件");
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
      const response = await fetch("/api/uploads", {
        method: "POST",
        body: formData,
      });
      const result = (await response.json().catch(() => null)) as { url?: string; error?: string } | null;
      if (!response.ok || !result?.url) {
        throw new Error(result?.error ?? "上传失败，请稍后重试");
      }
      onChange(result.url);
    } catch (err) {
      console.error("Image upload failed", err);
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

  const trimmed = value?.trim() ?? "";
  const previewSrc = sanitizeImageSrc(trimmed);
  const hasValue = Boolean(trimmed);

  return (
    <div className="space-y-2 text-sm">
      <span className="font-medium text-[var(--color-brand-secondary)]">{label}</span>
      <div className="space-y-2 rounded-2xl border border-[var(--color-border)] bg-white/80 p-3">
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
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
        {previewSrc ? (
          <div className="relative mt-2 h-32 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]">
            <Image src={previewSrc} alt="图片预览" fill sizes="100vw" className="object-cover" />
          </div>
        ) : hasValue ? (
          <p className="text-xs text-rose-500">图片地址无效，请输入以 http(s):// 或 / 开头的链接。</p>
        ) : null}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}

function BreadcrumbPreview({ breadcrumb }: { breadcrumb: BreadcrumbItem[] }) {
  const items = breadcrumb.length ? breadcrumb : [{ href: "/", label: cleanLocalized("", "首页") }, { href: "/products", label: cleanLocalized("", "产品") }];
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-secondary)]">
      {items.map((item, index) => (
        <span key={`${item.href}-${index}`} className="flex items-center gap-2">
          {index > 0 ? <span className="text-[var(--color-text-tertiary,#8690a3)]">/</span> : null}
          <span className={index === items.length - 1 ? "text-[var(--color-brand-secondary)]" : "hover:text-[var(--color-brand-primary)]"}>
            {getLocaleText(item.label) || "链接"}
          </span>
        </span>
      ))}
    </div>
  );
}

function ProductPreviewSurface({
  config,
  selectedProductIndex,
  onSelectProduct,
  onEditHero,
  onEditGeneral,
  onEditProduct,
  onAddProduct,
  onRemoveProduct,
  onReorderProduct,
}: PreviewProps) {
  const products = config.products ?? [];
  const heroOverlayEnabled = config.hero.overlayEnabled !== false;
  const dragSourceRef = useRef<number | null>(null);
  const [dragTargetIndex, setDragTargetIndex] = useState<number | null>(null);

  const handleDragStart = (event: DragEvent<HTMLDivElement>, index: number) => {
    dragSourceRef.current = index;
    setDragTargetIndex(index);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(index));
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>, index: number) => {
    event.preventDefault();
    if (dragTargetIndex !== index) {
      setDragTargetIndex(index);
    }
  };

  const handleDragEnd = () => {
    dragSourceRef.current = null;
    setDragTargetIndex(null);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>, index: number) => {
    event.preventDefault();
    const sourceIndex = dragSourceRef.current;
    if (sourceIndex === null) {
      handleDragEnd();
      return;
    }
    onReorderProduct(sourceIndex, index);
    handleDragEnd();
  };


  return (
    <ConfigPreviewFrame
      title="产品中心页面"
      description="预览与前台保持一致，可直接在画面中点击编辑按钮进行配置。"
      viewportWidth={1200}
      autoScale
      maxHeight={null}
    >
      <div className="bg-white pb-14 pt-8">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-8 px-6 lg:flex-row">
          <aside className="lg:w-[260px] lg:shrink-0">
            <div className="relative rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-[var(--color-brand-secondary)]">{getLocaleText(config.sidebarTitle, undefined, "产品")}</h2>
              </div>
              <div className="mt-4 space-y-2 text-sm text-[var(--color-brand-secondary)]">
                {products.map((product, index) => {
                  const slug = product.slug || `product-${index + 1}`;
                  const isActive = index === selectedProductIndex;
                  return (
                    <div
                      key={slug}
                      draggable
                      onDragStart={(event) => handleDragStart(event, index)}
                      onDragOver={(event) => handleDragOver(event, index)}
                      onDrop={(event) => handleDrop(event, index)}
                      onDragEnd={handleDragEnd}
                      className={`group flex items-center gap-2 rounded-xl border border-transparent bg-[var(--color-surface-muted)] px-3 py-2 transition hover:bg-white ${
                        isActive ? "border-[var(--color-brand-primary)] bg-white" : ""
                      } ${dragTargetIndex === index ? "ring-2 ring-[var(--color-brand-primary)]" : ""}`}
                    >
                      <button
                        type="button"
                        className="cursor-grab select-none text-xs text-[var(--color-text-tertiary,#8690a3)] hover:text-[var(--color-brand-primary)]"
                        aria-label="拖动调整顺序"
                      >
                        ≡
                      </button>
                      <Link
                        href={slug ? `/admin/${encodeURIComponent("产品详情")}?slug=${encodeURIComponent(slug)}` : "#"}
                        prefetch={false}
                        className="flex-1 truncate text-left transition hover:text-[var(--color-brand-primary)]"
                        onClick={() => onSelectProduct(index)}
                      >
                        {getLocaleText(product.name, undefined, "产品名称")}
                      </Link>
                      <button
                        type="button"
                        onClick={(event) => { event.stopPropagation(); onRemoveProduct(index); }}
                        className="text-xs text-rose-500 transition hover:text-rose-600"
                      >
                        删除
                      </button>
                    </div>
                  );
                })}
                {!products.length ? (
                  <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-white/60 p-4 text-xs text-[var(--color-text-secondary)]">
                    暂无产品卡片，请点击下方新增。
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={onAddProduct}
                  className="mt-3 flex w-full items-center justify-center rounded-xl border border-dashed border-[var(--color-brand-primary)] px-4 py-3 text-xs font-semibold text-[var(--color-brand-primary)] transition hover:bg-[var(--color-brand-primary)]/10"
                >
                  + 新增产品卡片
                </button>
              </div>
            </div>
          </aside>

          <div className="flex-1 space-y-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <BreadcrumbPreview breadcrumb={config.breadcrumb} />
              <button
                type="button"
                onClick={onEditGeneral}
                className="rounded-full border border-[var(--color-border)] px-4 py-2 text-xs font-semibold text-[var(--color-brand-secondary)] transition hover:border-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary)]"
              >
                编辑导航与 CTA
              </button>
            </div>

            <section className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-black text-white">
              <button
                type="button"
                onClick={onEditHero}
                className="absolute right-4 top-4 z-10 rounded-full border border-white/60 bg-black/40 px-3 py-1 text-xs font-semibold text-white backdrop-blur transition hover:bg-white hover:text-[var(--color-brand-primary)]"
              >
                编辑英雄区
              </button>
              <div className="relative h-80 w-full">
                <Image
                  src={resolveImageSrc(config.hero.image, DEFAULT_PRODUCT_IMAGE)}
                  alt={getLocaleText(config.hero.title, undefined, "模块化产品矩阵")}
                  fill
                  sizes="100vw"
                  className="object-cover"
                  priority
                />
                {heroOverlayEnabled ? (
                  <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-black/55 to-black/30" />
                ) : null}
                <div className="absolute inset-0 flex flex-col justify-end gap-5 p-10">
                  {config.hero.eyebrow ? (
                    <span
                      className={`inline-flex w-fit items-center rounded-full px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] ${
                        heroOverlayEnabled ? "bg-white/15" : "bg-black/45 backdrop-blur"
                      }`}
                    >
                      {getLocaleText(config.hero.eyebrow)}
                    </span>
                  ) : null}
                  <h1
                    className={`text-3xl font-semibold md:text-4xl ${
                      heroOverlayEnabled ? "" : "drop-shadow-[0_6px_24px_rgba(0,0,0,0.55)]"
                    }`}
                  >
                    {getLocaleText(config.hero.title, undefined, "模块化产品矩阵")}
                  </h1>
                  {getLocaleText(config.hero.description) ? (
                    <p
                      className={`max-w-2xl text-sm md:text-base ${
                        heroOverlayEnabled ? "text-white/80" : "text-white drop-shadow-[0_4px_18px_rgba(0,0,0,0.65)]"
                      }`}
                    >
                      {getLocaleText(config.hero.description)}
                    </p>
                  ) : null}
                </div>
              </div>
            </section>



            <section className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-[var(--color-brand-secondary)]">产品列表</h3>
                  <p className="text-xs text-[var(--color-text-tertiary,#8690a3)]">卡片 CTA 文案：{getLocaleText(config.productCardCtaLabel, undefined, "查看详情")}</p>
                </div>
                <button
                  type="button"
                  onClick={onAddProduct}
                  className="rounded-full border border-dashed border-[var(--color-brand-primary)] px-4 py-2 text-xs font-semibold text-[var(--color-brand-primary)] transition hover:bg-[var(--color-brand-primary)]/10"
                >
                  新增产品卡片
                </button>
              </div>
              <div className="grid gap-6 lg:grid-cols-2">
                {products.map((product, index) => (
                  <article
                    key={product.slug || index}
                    className={`group relative flex h-[420px] flex-col overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] transition hover:-translate-y-1 hover:shadow-xl ${
                      index === selectedProductIndex ? "ring-2 ring-[var(--color-brand-primary)]" : ""
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        onSelectProduct(index);
                        onEditProduct(index);
                      }}
                      className="absolute right-4 top-4 z-10 rounded-full border border-white/70 bg-black/30 px-3 py-1 text-xs font-semibold text-white opacity-0 transition group-hover:opacity-100"
                    >
                      编辑卡片
                    </button>
                    <div className="relative h-64 w-full">
                      <Image
                        src={resolveImageSrc(product.image, DEFAULT_PRODUCT_IMAGE)}
                        alt={getLocaleText(product.name, undefined, "产品")}
                        fill
                        sizes="100vw"
                        className="object-cover"
                      />
                    </div>
                    <div className="flex flex-1 flex-col gap-4 bg-white p-6">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <h4 className="text-2xl font-semibold text-[var(--color-brand-secondary)]">
                          {getLocaleText(product.name, undefined, "产品名称")}
                        </h4>
                        {(() => {
                          const taglineText = getLocaleText(product.tagline).trim();
                          if (!taglineText) {
                            return null;
                          }
                          return (
                            <span className="rounded-full bg-[var(--color-brand-primary)]/10 px-4 py-1 text-xs font-semibold text-[var(--color-brand-primary)]">
                              {taglineText}
                            </span>
                          );
                        })()}
                      </div>
                      <p className="text-sm text-[var(--color-text-secondary)]">
                        {(() => {
                          const summaryText = getLocaleText(product.summary);
                          if (summaryText.trim().length > 0) {
                            return summaryText;
                          }
                          if (product.summaryConfigured) {
                            return "";
                          }
                          return "在此编写产品亮点或摘要，展示结构、尺寸或核心优势。";
                        })()}
                      </p>
                      <div className="mt-auto flex justify-start pt-1">
                        <Link
                          href={product.slug ? `/admin/${encodeURIComponent("产品详情")}?slug=${encodeURIComponent(product.slug)}` : "#"}
                          prefetch={false}
                          className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-brand-primary)] transition hover:text-[var(--color-brand-secondary)]"
                        >
                          {normalizeCtaLabel(getLocaleText(config.productCardCtaLabel, undefined, "查看详情"))}
                          <span aria-hidden>→</span>
                        </Link>
                      </div>
                    </div>
                  </article>
                ))}
                {!products.length ? (
                  <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-white/60 p-8 text-center text-sm text-[var(--color-text-secondary)]">
                    暂无产品卡片，请点击“新增产品卡片”。
                  </div>
                ) : null}
              </div>
            </section>
          </div>
        </div>
      </div>
    </ConfigPreviewFrame>
  );
}

interface HeroEditorProps {
  value: HeroConfig;
  onSave: (next: HeroConfig) => void;
  onCancel: () => void;
}

function HeroEditorDialog({ value, onSave, onCancel }: HeroEditorProps) {
  const [draft, setDraft] = useState<HeroConfig>({ ...value });

  useEffect(() => {
    setDraft({ ...value });
  }, [value]);

  return (
    <EditorDialog
      title="编辑英雄区"
      subtitle="更新封面图片与标题"
      onSave={() => onSave({ ...draft })}
      onCancel={onCancel}
    >
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <LocalizedTextField
            label="眉头（可选）"
            value={draft.eyebrow}
            onChange={(next) => setDraft((prev) => ({ ...prev, eyebrow: next }))}
            placeholder="如：TIMES TENT"
          />
        </div>
        <LocalizedTextField
          label="主标题"
          value={draft.title}
          onChange={(next) => setDraft((prev) => ({ ...prev, title: next }))}
          placeholder="模块化产品矩阵"
        />
        <LocalizedTextField
          label="描述"
          value={draft.description}
          onChange={(next) => setDraft((prev) => ({ ...prev, description: next }))}
          multiline
          rows={4}
          placeholder="补充一句话介绍产品中心的核心价值。"
        />
        <ImageInput
          label="封面图片"
          value={draft.image}
          onChange={(next) => setDraft((prev) => ({ ...prev, image: next }))}
          placeholder="支持粘贴外链或上传"
          helper="最佳尺寸 908×360"
        />
        <label className="flex items-center gap-2 text-xs font-semibold text-[var(--color-brand-secondary)]">
          <input
            type="checkbox"
            checked={draft.overlayEnabled !== false}
            onChange={(event) =>
              setDraft((prev) => ({
                ...prev,
                overlayEnabled: event.target.checked,
              }))
            }
            className="h-4 w-4 rounded border-[var(--color-border)] text-[var(--color-brand-primary)] focus:ring-[var(--color-brand-primary)]"
          />
          启用背景蒙版
        </label>
      </div>
    </EditorDialog>
  );
}




interface GeneralEditorProps {
  value: Pick<ProductCenterConfig, "sidebarTitle" | "productCardCtaLabel" | "breadcrumb">;
  onSave: (next: { sidebarTitle: LocalizedValue; productCardCtaLabel: LocalizedValue; breadcrumb: BreadcrumbItem[] }) => void;
  onCancel: () => void;
}

function GeneralEditorDialog({ value, onSave, onCancel }: GeneralEditorProps) {
  const [sidebarTitle, setSidebarTitle] = useState(value.sidebarTitle);
  const [ctaLabel, setCtaLabel] = useState(value.productCardCtaLabel);
  const [items, setItems] = useState<BreadcrumbItem[]>(() => value.breadcrumb.map((item) => ({ ...item })));

  useEffect(() => {
    setSidebarTitle(value.sidebarTitle);
    setCtaLabel(value.productCardCtaLabel);
    setItems(value.breadcrumb.map((item) => ({ ...item })));
  }, [value]);

  const handleItemChange = (index: number, field: keyof BreadcrumbItem, next: any) => {
    setItems((prev) => {
      const draft = [...prev];
      if (field === "label") {
        draft[index] = { ...draft[index], label: next };
      } else {
        draft[index] = { ...draft[index], [field]: next };
      }
      return draft;
    });
  };

  const handleAddItem = () => {
    setItems((prev) => [...prev, { label: cleanLocalized(""), href: "" }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  return (
    <EditorDialog
      title="页面通用设置"
      subtitle="配置侧栏标题、卡片 CTA 文案及面包屑导航"
      onSave={() => onSave({ sidebarTitle, productCardCtaLabel: ctaLabel, breadcrumb: items })}
      onCancel={onCancel}
    >
      <div className="space-y-5 text-sm">
        <LocalizedTextField
          label="侧栏标题"
          value={sidebarTitle}
          onChange={(next) => setSidebarTitle(next)}
        />
        <LocalizedTextField
          label="卡片 CTA 文案"
          value={ctaLabel}
          onChange={(next) => setCtaLabel(next)}
        />
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-medium text-[var(--color-brand-secondary)]">面包屑导航</span>
            <button
              type="button"
              onClick={handleAddItem}
              className="rounded-full border border-dashed border-[var(--color-brand-primary)] px-3 py-1 text-xs font-semibold text-[var(--color-brand-primary)] transition hover:bg-[var(--color-brand-primary)]/10"
            >
              新增节点
            </button>
          </div>
          <div className="space-y-3">
            {items.map((item, index) => (
              <div key={index} className="rounded-2xl border border-[var(--color-border)] bg-white/80 p-4">
                <div className="flex items-center justify-between text-xs text-[var(--color-text-tertiary,#8690a3)]">
                  <span>节点 {index + 1}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(index)}
                    className="rounded-full border border-[var(--color-border)] px-3 py-1 text-[11px] font-semibold text-rose-500 hover:border-rose-200"
                  >
                    删除
                  </button>
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <LocalizedTextField
                      label="展示文案"
                      value={item.label}
                      onChange={(next) => handleItemChange(index, "label", next)}
                    />
                  </div>
                  <div className="space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-text-tertiary,#8690a3)]">链接</span>
                    <input
                      value={item.href}
                      onChange={(event) => handleItemChange(index, "href", event.target.value)}
                      placeholder="#"
                      className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              </div>
            ))}
            {!items.length ? (
              <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-white/60 p-5 text-xs text-[var(--color-text-secondary)]">
                尚未配置面包屑节点，新增后可填写显示文案与跳转链接。
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </EditorDialog>
  );
}

interface ProductEditorProps {
  value: ProductCard;
  index: number;
  total: number;
  onSave: (next: ProductCard) => void;
  onRemove: () => void;
  onCancel: () => void;
}

function ProductEditorDialog({ value, index, total, onSave, onRemove, onCancel }: ProductEditorProps) {
  const [draft, setDraft] = useState<ProductCard>({ ...value });

  useEffect(() => {
    setDraft({ ...value });
  }, [value]);

  return (
    <EditorDialog
      title={`编辑产品卡片 ${index + 1}`}
      subtitle="更新卡片基础信息，可在此删除当前卡片"
      onSave={() => onSave({ ...draft })}
      onCancel={onCancel}
    >
      <div className="space-y-5 text-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <LocalizedTextField
              label="产品名称"
              value={draft.name}
              onChange={(next) => setDraft((prev) => ({ ...prev, name: next }))}
              placeholder="人字形篷房"
            />
          </div>
          <div className="space-y-2">
            <span className="font-medium text-[var(--color-brand-secondary)]">Slug（用于跳转）</span>
            <input
              value={draft.slug}
              onChange={(event) => setDraft((prev) => ({ ...prev, slug: event.target.value }))}
              placeholder="gable-tent"
              className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-brand-secondary)] focus:border-[var(--color-brand-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/30"
            />
          </div>
        </div>
        <div className="space-y-2">
          <LocalizedTextField
            label="副标题 / 标签（可选）"
            value={draft.tagline}
            onChange={(next) =>
              setDraft((prev) => ({ ...prev, tagline: next, taglineConfigured: true }))}
            placeholder="旗舰爆款"
          />
        </div>
        <div className="space-y-2">
          <LocalizedTextField
            label="摘要"
            value={draft.summary}
            onChange={(next) =>
              setDraft((prev) => ({ ...prev, summary: next, summaryConfigured: true }))}
            multiline
            rows={4}
            placeholder="简要说明产品亮点、适用场景或核心参数。"
          />
        </div>
        <div className="space-y-2">
          <span className="font-medium text-[var(--color-brand-secondary)]">详情页链接</span>
          <input
            value={draft.href}
            onChange={(event) => setDraft((prev) => ({ ...prev, href: event.target.value }))}
            placeholder="/products/gable-tent"
            className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
          />
        </div>
        <ImageInput
          label="卡片封面图"
          value={draft.image}
          onChange={(next) => setDraft((prev) => ({ ...prev, image: next }))}
          placeholder="支持外链或上传"
          helper="最佳尺寸 442×288"
        />
        <div className="space-y-2">
          <LocalizedTextField
            label="详情页摘要（可选）"
            value={draft.description}
            onChange={(next) => setDraft((prev) => ({ ...prev, description: next }))}
            multiline
            rows={4}
            placeholder="详细描述将用于产品详情页顶部介绍。"
          />
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onRemove}
            disabled={total <= 1}
            className="rounded-full border border-rose-200 px-4 py-2 text-xs font-semibold text-rose-500 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            删除此卡片
          </button>
        </div>
      </div>
    </EditorDialog>
  );
}

export function ProductCenterConfigEditor({ configKey, initialConfig }: ProductCenterConfigEditorProps) {
  const [config, setConfig] = useState<ProductCenterConfig>(() => normalizeConfig(initialConfig));
  useGlobalTranslationRegistrationForConfig({ config, setConfig, labelPrefix: configKey });
  const [baselineSnapshot, setBaselineSnapshot] = useState(() =>
    JSON.stringify(normalizeConfig(initialConfig)),
  );
  const [selectedProductIndex, setSelectedProductIndex] = useState(0);
  const [editing, setEditing] = useState<EditingTarget | null>(null);
  const [formState, dispatch] = useFormState<UpdateSiteConfigActionState, FormData>(updateSiteConfigAction, {
    status: "idle",
  });
  const formRef = useRef<HTMLFormElement>(null);
  const toast = useToast();

  useEffect(() => {
    if (selectedProductIndex >= config.products.length) {
      setSelectedProductIndex(Math.max(0, config.products.length - 1));
    }
  }, [config.products.length, selectedProductIndex]);

  const payload = useMemo(() => JSON.stringify(serializeConfig(config)), [config]);
  const configSnapshot = useMemo(() => JSON.stringify(config), [config]);

  useEffect(() => {
    const normalized = normalizeConfig(initialConfig);
    setConfig(normalized);
    setBaselineSnapshot(JSON.stringify(normalized));
  }, [initialConfig]);

  const prevStatusRef = useRef(formState.status);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    if (formState.status === "success") {
      setBaselineSnapshot(configSnapshot);
      toast.success("保存成功");
      window.dispatchEvent(
        new CustomEvent("site-config:save-success", { detail: { key: configKey } }),
      );
      formRef.current?.classList.add("animate-pulse");
      const timer = setTimeout(() => formRef.current?.classList.remove("animate-pulse"), 400);
      cleanup = () => clearTimeout(timer);
    }
    return cleanup;
  }, [formState, configSnapshot, toast, configKey]);

    const handleReorderProduct = (sourceIndex: number, targetIndex: number) => {
    if (sourceIndex === targetIndex) return;
    // 先构造新的配置用于确认与保存
    const next = cloneConfig(config);
    const [moved] = next.products.splice(sourceIndex, 1);
    next.products.splice(targetIndex, 0, moved);

    const confirmed = window.confirm("确定调整产品顺序？确认后将自动保存，并更新目录与导航。");
    if (!confirmed) return;

    // 更新本地状态以立即反映顺序变化
    setConfig(next);
    setSelectedProductIndex((prevSelected) => {
      if (prevSelected === sourceIndex) return targetIndex;
      if (prevSelected > sourceIndex && prevSelected <= targetIndex) return prevSelected - 1;
      if (prevSelected < sourceIndex && prevSelected >= targetIndex) return prevSelected + 1;
      return prevSelected;
    });
    setEditing(null);

    // 自动保存（更新后端配置，触发相关页面与导航联动）
    const fd = new FormData();
    fd.append("key", configKey);
    fd.append("payload", JSON.stringify(serializeConfig(next)));
    dispatch(fd);
  };

  const handleAddProduct = () => {
    const newIndex = config.products.length;
    setConfig((prev) => {
      const next = cloneConfig(prev);
      next.products.push(
        normalizeProduct(
          {
            slug: `product-${newIndex + 1}`,
            name: "新品名称",
            summary: "补充一段简短摘要，描述产品亮点。",
            image: DEFAULT_PRODUCT_IMAGE,
            href: "/products",
          },
          newIndex,
        ),
      );
      return next;
    });
    setSelectedProductIndex(newIndex);
    setEditing({ type: "product", index: newIndex });
  };

  const handleRemoveProduct = (index: number) => {
    // 至少保留一张卡片，避免列表为空
    if (config.products.length <= 1) return;

    // 删除确认，删除后将自动保存到服务器
    const ok = window.confirm("确定删除该产品卡片？删除后将自动保存。");
    if (!ok) return;

    const nextConfig = cloneConfig(config);
    nextConfig.products.splice(index, 1);
    const nextLength = Math.max(0, nextConfig.products.length);

    // 先更新本地状态与选中索引
    setConfig(nextConfig);
    setEditing(null);
    setSelectedProductIndex((prevSelected) => {
      if (!nextLength) return 0;
      if (prevSelected > index) return prevSelected - 1;
      if (prevSelected === index) return Math.max(0, Math.min(index - 1, nextLength - 1));
      return Math.min(prevSelected, nextLength - 1);
    });

    // 自动保存到服务器
    const fd = new FormData();
    fd.append("key", configKey);
    fd.append("payload", JSON.stringify(serializeConfig(nextConfig)));
    dispatch(fd);
  };

  let dialog: JSX.Element | null = null;
  if (editing?.type === "hero") {
    dialog = (
      <HeroEditorDialog
        value={config.hero}
        onSave={(next) => {
          const nextConfig = { ...config, hero: { ...next } };
          setConfig(nextConfig);
          setEditing(null);
          const nextPayload = JSON.stringify(serializeConfig(nextConfig));
          const fd = new FormData();
          fd.append("key", configKey);
          fd.append("payload", nextPayload);
          dispatch(fd);
        }}
        onCancel={() => setEditing(null)}
      />
    );
  } else if (editing?.type === "general") {
    dialog = (
      <GeneralEditorDialog
        value={{
          sidebarTitle: config.sidebarTitle,
          productCardCtaLabel: config.productCardCtaLabel,
          breadcrumb: config.breadcrumb,
        }}
        onSave={(next) => {
          const breadcrumbFixed = next.breadcrumb
            .map((item) => ({
              label: cleanLocalized(item.label),
              href: item.href.trim() || "#",
            }))
            .filter((item) => {
              const hasLabel = SUPPORTED_LOCALES.some((l) => item.label[l]?.trim());
              return hasLabel || item.href !== "#";
            });
          const nextConfig = {
            ...config,
            sidebarTitle: next.sidebarTitle,
            productCardCtaLabel: next.productCardCtaLabel,
            breadcrumb: breadcrumbFixed,
          };
          setConfig(nextConfig);
          setEditing(null);
          const nextPayload = JSON.stringify(serializeConfig(nextConfig));
          const fd = new FormData();
          fd.append("key", configKey);
          fd.append("payload", nextPayload);
          dispatch(fd);
        }}
        onCancel={() => setEditing(null)}
      />
    );
  } else if (editing?.type === "product") {
    const product = config.products[editing.index];
    if (product) {
      dialog = (
        <ProductEditorDialog
          value={product}
          index={editing.index}
          total={config.products.length}
          onSave={(next) => {
            const nextConfig = cloneConfig(config);
            nextConfig.products[editing.index] = { ...next };
            setConfig(nextConfig);
            setEditing(null);
            setSelectedProductIndex(editing.index);
            const nextPayload = JSON.stringify(serializeConfig(nextConfig));
            const fd = new FormData();
            fd.append("key", configKey);
            fd.append("payload", nextPayload);
            dispatch(fd);
          }}
          onRemove={() => handleRemoveProduct(editing.index)}
          onCancel={() => setEditing(null)}
        />
      );
    }
  }

  const isDirty = useMemo(() => configSnapshot !== baselineSnapshot, [configSnapshot, baselineSnapshot]);
  const statusLabel = isDirty ? "有未保存的更改" : "暂无未保存的更改";

  return (
    <div className="space-y-10">

      <ProductPreviewSurface
        config={config}
        selectedProductIndex={selectedProductIndex}
        onSelectProduct={setSelectedProductIndex}
        onEditHero={() => setEditing({ type: "hero" })}
        onEditGeneral={() => setEditing({ type: "general" })}
        onEditProduct={(index) => setEditing({ type: "product", index })}
        onAddProduct={handleAddProduct}
        onRemoveProduct={handleRemoveProduct}
        onReorderProduct={handleReorderProduct}
      />

      {/* 保存表单区域 */}
      <SaveBar
        configKey={configKey}
        payload={payload}
        formAction={dispatch}
        isDirty={isDirty}
        fixed={false}
        status={formState}
        formRef={formRef}
      />

      {dialog}
    </div>
  );
}
