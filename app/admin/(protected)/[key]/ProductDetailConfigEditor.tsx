"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { useFormState, useFormStatus } from "react-dom";

import { ConfigPreviewFrame } from "./ConfigPreviewFrame";
import { EditorDialog } from "./EditorDialog";
import { SaveBar } from "./SaveBar";
import { LocalizedTextField as SharedLocalizedTextField } from "./LocalizedTextField";
import type { UpdateSiteConfigActionState } from "../actions";
import { updateSiteConfigAction } from "../actions";
import { useToast } from "@/providers/ToastProvider";
import { resolveImageSrc, sanitizeImageSrc } from "@/utils/image";
import {
  createProductDetailFallback,
  listAvailableProductDetailSlugs,
  normalizeProductDetailMap,
  serializeProductDetailMap,
  type ProductDetailSeed,
  type DetailGalleryItem,
  type DetailMetricGroup,
  type ProductDetailConfig,
  type ProductDetailConfigMap,
} from "@/types/productDetails";
import { PRODUCT_MEDIA, DEFAULT_MEDIA } from "@/data/productMedia";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, ensureLocalizedRecord } from "./editorUtils";
import type { LocaleKey } from "@/i18n/locales";
import { useGlobalTranslationRegistrationForConfig } from "@/hooks/useGlobalTranslationManager";

interface ProductDetailConfigEditorProps {
  configKey: string;
  initialConfig: Record<string, unknown>;
  productSeeds?: Record<string, ProductDetailSeed>;
  productOrder?: string[];
  productCenter?: Record<string, unknown>;
}

interface PreviewProps {
  slug: string;
  detail: ProductDetailConfig;
  availableSlugs: string[];
  slugLabels: Record<string, string>;
  onSelectSlug: (slug: string) => void;
  onDeleteSlug: (slug: string) => void;
  onEditHero: () => void;
  onEditBreadcrumb: () => void;
  onEditSection: (index: number) => void;
  onRemoveSection: (index: number) => void;
  onEditGallery: () => void;
  onEditCta: () => void;
}

function toStringValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return "";
}

function cloneDetail(detail: ProductDetailConfig): ProductDetailConfig {
  return {
    title: detail.title,
    hero: { ...detail.hero },
    breadcrumb: [...detail.breadcrumb],
    sections: detail.sections.map((section) => ({
      heading: section.heading,
      paragraphs: [...section.paragraphs],
      lists: section.lists.map((list) => [...list]),
      pairs: section.pairs.map((group) => group.map((item) => ({ ...item }))),
    })),
    gallery: detail.gallery.map((item) => ({ ...item })),
  };
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
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
    </div>
  );
}

// 本地化字段类型与输入控件

type LocalizedValue = Record<LocaleKey, string>;

function cleanLocalized(record: unknown): LocalizedValue {
  const r = ensureLocalizedRecord(record) as LocalizedValue;
  const result: LocalizedValue = {} as LocalizedValue;
  for (const code of SUPPORTED_LOCALES) {
    const v = r[code as LocaleKey] ?? "";
    result[code as LocaleKey] = typeof v === "string" ? v.trim() : "";
  }
  return result;
}

// 仅保留非空值的本地化记录，避免写入空字符串
function compactLocalized(value: unknown): LocalizedValue {
  const r = ensureLocalizedRecord(value) as LocalizedValue;
  const result: Partial<LocalizedValue> = {};
  for (const code of SUPPORTED_LOCALES) {
    const v = r[code as LocaleKey];
    if (typeof v === "string") {
      const t = v.trim();
      if (t.length) {
        result[code as LocaleKey] = t;
      }
    }
  }
  return result as LocalizedValue;
}

function toLocalizedRecord(value: unknown): LocalizedValue {
  if (typeof value === "string") {
    const t = value.trim();
    return t.length ? ({ [DEFAULT_LOCALE as LocaleKey]: t } as LocalizedValue) : ({} as LocalizedValue);
  }
  return compactLocalized(value);
}

function mergeLocalized(existing: unknown, next?: LocalizedValue): LocalizedValue {
  const base = toLocalizedRecord(existing);
  const override = compactLocalized(next ?? {});
  return { ...base, ...override } as LocalizedValue;
}

// 从原始配置中提取本地化覆盖：用于初始化 localizedOverrides
function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

type LocalizedOverridesMap = Record<
  string,
  {
    title?: LocalizedValue;
    hero?: { badge?: LocalizedValue; scenarios?: LocalizedValue; description?: LocalizedValue };
    sections?: Array<{
      heading?: LocalizedValue;
      paragraphs?: LocalizedValue[];
      lists?: LocalizedValue[][];
      pairs?: Array<Array<{ label?: LocalizedValue; value?: LocalizedValue }>>;
    }>;
    gallery?: Array<{ alt?: LocalizedValue }>;
    cta?: { title?: LocalizedValue; description?: LocalizedValue; primaryLabel?: LocalizedValue; phoneLabel?: LocalizedValue };
  }
>;

function hasAnyLv(lv?: LocalizedValue): boolean {
  return lv ? SUPPORTED_LOCALES.some((code) => ((lv[code as LocaleKey] || "").trim().length > 0)) : false;
}

function extractLocalizedOverrides(rawMap: Record<string, unknown>, slugs: string[]): LocalizedOverridesMap {
  const result: LocalizedOverridesMap = {};
  for (const slug of slugs) {
    const raw = asRecord(rawMap[slug]);
    const entry: LocalizedOverridesMap[string] = {};

    // title
    const titleRec = cleanLocalized(raw.title);
    if (hasAnyLv(titleRec)) entry.title = titleRec;

    // hero
    const heroRaw = asRecord(raw.hero);
    const heroBadge = cleanLocalized(heroRaw.badge);
    const heroScenarios = cleanLocalized(heroRaw.scenarios);
    const heroDescription = cleanLocalized(heroRaw.description);
    if (hasAnyLv(heroBadge) || hasAnyLv(heroScenarios) || hasAnyLv(heroDescription)) {
      entry.hero = {};
      if (hasAnyLv(heroBadge)) entry.hero.badge = heroBadge;
      if (hasAnyLv(heroScenarios)) entry.hero.scenarios = heroScenarios;
      if (hasAnyLv(heroDescription)) entry.hero.description = heroDescription;
    }

    // sections
    const sectionsRaw = Array.isArray((raw as any).sections) ? (((raw as any).sections as any[]) ?? []) : [];
    const sectionOverrides: NonNullable<LocalizedOverridesMap[string]["sections"]> = [];
    sectionsRaw.forEach((secRaw, idx) => {
      const s = asRecord(secRaw);
      const ov: NonNullable<LocalizedOverridesMap[string]["sections"]>[number] = {};
      const headingRec = cleanLocalized(s.heading);
      if (hasAnyLv(headingRec)) ov.heading = headingRec;

      const paragraphsRaw = Array.isArray(s.paragraphs) ? (s.paragraphs as unknown[]) : [];
      const paragraphOv = paragraphsRaw
        .map((p) => cleanLocalized(p))
        .filter((rec) => hasAnyLv(rec));
      if (paragraphOv.length) ov.paragraphs = paragraphOv;

      const listsRaw = Array.isArray(s.lists) ? (s.lists as unknown[]) : [];
      const listOv = listsRaw
        .map((group) => (Array.isArray(group) ? (group as unknown[]) : []))
        .map((group) => group.map((item) => cleanLocalized(item)).filter((rec) => hasAnyLv(rec)))
        .filter((group) => group.length);
      if (listOv.length) ov.lists = listOv as LocalizedValue[][];

      const pairsRaw = Array.isArray(s.pairs) ? (s.pairs as unknown[]) : [];
      const pairOv = pairsRaw
        .map((group) => (Array.isArray(group) ? (group as unknown[]) : []))
        .map((group) =>
          group
            .map((item) => {
              const it = asRecord(item);
              const label = cleanLocalized(it.label);
              const value = cleanLocalized(it.value);
              const rec: { label?: LocalizedValue; value?: LocalizedValue } = {};
              if (hasAnyLv(label)) rec.label = label;
              if (hasAnyLv(value)) rec.value = value;
              return rec;
            })
            .filter((it) => Object.keys(it).length > 0),
        )
        .filter((group) => group.length);
      if (pairOv.length) ov.pairs = pairOv as Array<Array<{ label?: LocalizedValue; value?: LocalizedValue }>>;

      sectionOverrides[idx] = ov;
    });
    if (sectionOverrides.some((it) => Boolean(it && Object.keys(it).length))) {
      entry.sections = sectionOverrides;
    }

    // gallery
    const galleryRaw = Array.isArray((raw as any).gallery) ? (((raw as any).gallery as any[]) ?? []) : [];
    const galleryOv = galleryRaw.map((item) => {
      const it = asRecord(item);
      const altRec = cleanLocalized(it.alt);
      return hasAnyLv(altRec) ? { alt: altRec } : {};
    });
    if (galleryOv.some((it) => Object.keys(it).length)) entry.gallery = galleryOv as Array<{ alt?: LocalizedValue }>;

    // cta
    const ctaRaw = asRecord(raw.cta);
    const ctaTitle = cleanLocalized(ctaRaw.title);
    const ctaDesc = cleanLocalized(ctaRaw.description);
    const ctaPrimary = cleanLocalized(ctaRaw.primaryLabel);
    const ctaPhoneLabel = cleanLocalized(ctaRaw.phoneLabel);
    if (hasAnyLv(ctaTitle) || hasAnyLv(ctaDesc) || hasAnyLv(ctaPrimary) || hasAnyLv(ctaPhoneLabel)) {
      entry.cta = {};
      if (hasAnyLv(ctaTitle)) entry.cta.title = ctaTitle;
      if (hasAnyLv(ctaDesc)) entry.cta.description = ctaDesc;
      if (hasAnyLv(ctaPrimary)) entry.cta.primaryLabel = ctaPrimary;
      if (hasAnyLv(ctaPhoneLabel)) entry.cta.phoneLabel = ctaPhoneLabel;
    }

    if (Object.keys(entry).length) {
      result[slug] = entry;
    }
  }
  return result;
}

function mergeSerializedWithOverrides(
  base: Record<string, unknown>,
  overrides: LocalizedOverridesMap,
): Record<string, unknown> {
  const copy = JSON.parse(JSON.stringify(base)) as Record<string, unknown>;
  for (const [slug, override] of Object.entries(overrides)) {
    const detailRaw = asRecord(copy[slug]);

    if (override.title && hasAnyLv(override.title)) {
      detailRaw.title = mergeLocalized(detailRaw.title, override.title);
    }

    const heroRaw = asRecord(detailRaw.hero);
    if (override.hero?.badge && hasAnyLv(override.hero.badge)) {
      heroRaw.badge = mergeLocalized(heroRaw.badge, override.hero.badge);
    }
    if (override.hero?.scenarios && hasAnyLv(override.hero.scenarios)) {
      heroRaw.scenarios = mergeLocalized(heroRaw.scenarios, override.hero.scenarios);
    }
    if (override.hero?.description && hasAnyLv(override.hero.description)) {
      heroRaw.description = mergeLocalized(heroRaw.description, override.hero.description);
    }
    if (Object.keys(heroRaw).length) {
      detailRaw.hero = heroRaw;
    }

    if (override.sections && Array.isArray(override.sections)) {
      const sectionsRaw = Array.isArray((detailRaw as any).sections)
        ? (((detailRaw as any).sections as unknown[]) ?? [])
        : [];
      override.sections.forEach((ov, index) => {
        if (!ov) return;
        const sectionRaw = asRecord(sectionsRaw[index]);
        if (ov.heading && hasAnyLv(ov.heading)) {
          sectionRaw.heading = mergeLocalized(sectionRaw.heading, ov.heading);
        }
        if (ov.paragraphs && Array.isArray(ov.paragraphs)) {
          const paragraphs = ov.paragraphs.filter(hasAnyLv).map((p) => compactLocalized(p));
          if (paragraphs.length) sectionRaw.paragraphs = paragraphs;
        }
        if (ov.lists && Array.isArray(ov.lists)) {
          const lists = ov.lists
            .map((group) => group.filter(hasAnyLv).map((item) => compactLocalized(item)))
            .filter((group) => group.length);
          if (lists.length) sectionRaw.lists = lists as unknown as string[][];
        }
        if (ov.pairs && Array.isArray(ov.pairs)) {
          const pairs = ov.pairs
            .map((group) =>
              group
                .map((item) => {
                  const record = asRecord(item);
                  const label = cleanLocalized(record.label);
                  const value = cleanLocalized(record.value);
                  const next: Record<string, unknown> = {};
                  if (hasAnyLv(label)) next.label = mergeLocalized(next.label, label);
                  if (hasAnyLv(value)) next.value = mergeLocalized(next.value, value);
                  return next;
                })
                .filter((item) => Object.keys(item).length > 0),
            )
            .filter((group) => group.length);
          if (pairs.length) sectionRaw.pairs = pairs as unknown as Array<Record<string, unknown>>[];
        }
        sectionsRaw[index] = sectionRaw;
      });
      (detailRaw as any).sections = sectionsRaw;
    }

    if (override.gallery && Array.isArray(override.gallery)) {
      const galleryRaw = Array.isArray((detailRaw as any).gallery)
        ? (((detailRaw as any).gallery as unknown[]) ?? [])
        : [];
      override.gallery.forEach((ov, index) => {
        if (!ov) return;
        const itemRaw = asRecord(galleryRaw[index]);
        if (ov.alt && hasAnyLv(ov.alt)) {
          itemRaw.alt = mergeLocalized(itemRaw.alt, ov.alt);
        }
        galleryRaw[index] = itemRaw;
      });
      (detailRaw as any).gallery = galleryRaw;
    }

    if (override.cta) {
      const ctaRaw = asRecord(detailRaw.cta);
      if (override.cta.title && hasAnyLv(override.cta.title)) {
        ctaRaw.title = mergeLocalized(ctaRaw.title, override.cta.title);
      }
      if (override.cta.description && hasAnyLv(override.cta.description)) {
        ctaRaw.description = mergeLocalized(ctaRaw.description, override.cta.description);
      }
      if (override.cta.primaryLabel && hasAnyLv(override.cta.primaryLabel)) {
        ctaRaw.primaryLabel = mergeLocalized(ctaRaw.primaryLabel, override.cta.primaryLabel);
      }
      if (override.cta.phoneLabel && hasAnyLv(override.cta.phoneLabel)) {
        ctaRaw.phoneLabel = mergeLocalized(ctaRaw.phoneLabel, override.cta.phoneLabel);
      }
      if (Object.keys(ctaRaw).length) {
        (detailRaw as any).cta = ctaRaw;
      }
    }

    copy[slug] = detailRaw;
  }
  return copy;
}

function LocalizedTextField({
  label,
  value,
  onChange,
  multiline = false,
  rows = 3,
  placeholder,
  translationContext,
  helper,
}: {
  label: string;
  value: LocalizedValue | string;
  onChange: (next: LocalizedValue) => void;
  multiline?: boolean;
  rows?: number;
  placeholder?: string;
  translationContext?: string;
  helper?: string;
}) {
  const normalized = cleanLocalized(value);
  return (
    <SharedLocalizedTextField
      label={label}
      value={normalized}
      multiline={multiline}
      rows={rows}
      placeholder={placeholder}
      translationContext={translationContext}
      helper={helper}
      onChange={(next) => onChange(cleanLocalized(next))}
    />
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

function ProductDetailPreview({
  slug,
  detail,
  availableSlugs,
  slugLabels,
  onSelectSlug,
  onDeleteSlug,
  onEditHero,
  onEditBreadcrumb,
  onEditSection,
  onRemoveSection,
  onEditGallery,
  onEditCta,
}: PreviewProps) {
  const media = PRODUCT_MEDIA[slug] ?? DEFAULT_MEDIA;
  const heroImage = resolveImageSrc(detail.hero.image, media.hero);
  const galleryImages = (detail.gallery.length ? detail.gallery : media.gallery).slice(0, 3);

  const normalizeHeading = (s: string) => {
    const base = (s || "").trim().toLowerCase();
    const stripped = base.replace(/[，,。.\-–—_:：;；/／~（）()《》【】\[\]「」『』·]/g, "");
    return stripped;
  };
  const overviewKeys = [
    "产品概览",
    "產品概覽",
    "产品概述",
    "產品概述",
    "产品介绍",
    "產品介紹",
    "概览",
    "總覽",
    "概述",
    "介绍",
    "overview",
    "product overview",
  ];
  const highlightsKeys = [
    "典型场景与亮点",
    "典型場景與亮點",
    "典型场景",
    "典型場景",
    "场景与亮点",
    "場景與亮點",
    "亮点与场景",
    "亮點與場景",
    "应用场景",
    "應用場景",
    "产品亮点",
    "產品亮點",
    "亮点",
    "亮點",
    "highlights",
    "typical scenarios",
    "highlights & scenarios",
    "scenarios",
  ];
  const galleryKeys = [
    "项目实景图库",
    "项目实景图集",
    "项目图库",
    "项目图集",
    "项目实景",
    "项目实拍",
    "项目图",
    "项目图片",
    "实景图库",
    "实景图集",
    "图库",
    "图集",
    "图片集",
    "gallery",
    "project gallery",
    "image gallery",
  ];
  const findIndexByKeys = (keys: string[]) =>
    detail.sections.findIndex((section) => {
      const heading = normalizeHeading(section.heading || "");
      return keys.some((key) => {
        const k = normalizeHeading(key);
        return heading.includes(k) || k.includes(heading);
      });
    });
  const overviewIndex = findIndexByKeys(overviewKeys);
  const highlightsIndex = findIndexByKeys(highlightsKeys);
  const galleryIndex = findIndexByKeys(galleryKeys);

  const overviewSection = overviewIndex >= 0 ? detail.sections[overviewIndex] : null;
  const highlightsSection = highlightsIndex >= 0 ? detail.sections[highlightsIndex] : null;
  const gallerySection = galleryIndex >= 0 ? detail.sections[galleryIndex] : null;
  const otherSections = detail.sections.filter(
    (_, index) => ![overviewIndex, highlightsIndex, galleryIndex].includes(index),
  );

  return (
    <ConfigPreviewFrame
      title="产品详情页面"
      description="点击页面上的编辑按钮，在真实预览中维护该产品的详情内容。"
      viewportWidth={1200}
      autoScale
      maxHeight={null}
    >
      <div className="bg-white pb-16 pt-8">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-8 px-6 lg:flex-row">
          <aside className="lg:w-[260px] lg:shrink-0">
            <div className="rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-sm">
              <div className="text-sm font-semibold text-[var(--color-brand-secondary)]">产品</div>
              <div className="mt-4 space-y-2 text-sm text-[var(--color-brand-secondary)]">
                {availableSlugs.map((item) => {
                  const isActive = item === slug;
                  return (
                    <div
                      key={item}
                      className={`flex w-full items-center justify-between rounded-xl px-4 py-3 transition ${
                        isActive
                          ? "bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)]"
                          : "bg-[var(--color-surface-muted)] hover:bg-white"
                      }`}
                    >
                      <button type="button" onClick={() => onSelectSlug(item)} className="flex-1 text-left">
                        <span className="truncate">{slugLabels[item] ?? item}</span>
                      </button>
                      <div className="ml-3 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onSelectSlug(item)}
                          className="text-[10px] uppercase tracking-[0.3em] text-[var(--color-text-tertiary,#8690a3)] hover:text-[var(--color-brand-primary)]"
                        >
                          切换
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteSlug(item)}
                          className="rounded-full border border-[var(--color-border)] px-3 py-1 text-[11px] font-semibold text-rose-500 hover:border-rose-200"
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </aside>

          <div className="flex-1 space-y-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <nav aria-label="面包屑导航" className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-secondary)]">
                {detail.breadcrumb.map((item, index) => {
                  const isLast = index === detail.breadcrumb.length - 1;
                  return (
                    <span key={`${item}-${index}`} className="flex items-center gap-2">
                      <span className={isLast ? "text-[var(--color-brand-secondary)]" : "hover:text-[var(--color-brand-primary)]"}>{item}</span>
                      {!isLast ? <span className="text-[var(--color-text-tertiary,#8690a3)]">/</span> : null}
                    </span>
                  );
                })}
              </nav>
              <button
                type="button"
                onClick={onEditBreadcrumb}
                className="rounded-full border border-[var(--color-border)] px-4 py-2 text-xs font-semibold text-[var(--color-brand-secondary)] transition hover:border-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary)]"
              >
                编辑面包屑
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
                <Image src={heroImage} alt={detail.title} fill sizes="100vw" className="object-cover" priority />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                <div className="absolute inset-0 flex flex-col justify-end gap-4 p-10">
                  <div className="flex flex-wrap items-center gap-3 text-xs text-white/80">
                    {detail.hero.scenarios ? <span>{detail.hero.scenarios}</span> : null}
                  </div>
                  <h1 className="text-3xl font-semibold md:text-4xl">{detail.title}</h1>
                  {detail.hero.description ? (
                    <p className="max-w-3xl text-sm text-white/80 md:text-base">{detail.hero.description}</p>
                  ) : null}
                </div>
              </div>
            </section>

            {overviewSection ? (
              <section className="relative rounded-2xl border border-[var(--color-border)] bg-white p-8 shadow-md">
                <button
                  type="button"
                  onClick={() => onEditSection(overviewIndex)}
                  className="absolute right-4 top-4 rounded-full border border-[var(--color-border)] px-3 py-1 text-xs font-semibold text-[var(--color-brand-primary)] transition hover:border-[var(--color-brand-primary)] hover:bg-[var(--color-brand-primary)]/10"
                >
                  编辑概览
                </button>
                <h2 className="text-xl font-semibold text-[var(--color-brand-secondary)]">{overviewSection.heading}</h2>
                <div className="mt-4 space-y-4 text-sm leading-7 text-[var(--color-text-secondary)]">
                  {overviewSection.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
                {overviewSection.pairs.map((pair, index) => (
                  <div key={index} className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {pair.map((item) => (
                      <div
                        key={`${item.label}-${item.value}`}
                        className="rounded-xl border border-[var(--color-border)] bg-white p-5 text-center shadow-[0_14px_35px_rgba(15,23,42,0.12)] transition hover:-translate-y-1"
                      >
                        <p className="text-sm uppercase tracking-[0.2em] text-[var(--color-brand-primary)] font-semibold">{item.label}</p>
                        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{item.value}</p>
                      </div>
                    ))}
                  </div>
                ))}
              </section>
            ) : null}

            {highlightsSection ? (
              <section className="relative rounded-2xl border border-[var(--color-border)] bg-white p-8">
                <button
                  type="button"
                  onClick={() => onEditSection(highlightsIndex)}
                  className="absolute right-4 top-4 rounded-full border border-[var(--color-border)] px-3 py-1 text-xs font-semibold text-[var(--color-brand-primary)] transition hover:border-[var(--color-brand-primary)] hover:bg-[var(--color-brand-primary)]/10"
                >
                  编辑亮点
                </button>
                <h2 className="text-xl font-semibold text-[var(--color-brand-secondary)]">{highlightsSection.heading}</h2>
                <div className="mt-4 space-y-3 text-sm leading-7 text-[var(--color-text-secondary)]">
                  {highlightsSection.paragraphs.map((paragraph) => (
                    <p key={paragraph} className="flex items-start gap-2">
                      <span className="mt-2 inline-block h-2 w-2 rounded-full bg-[var(--color-brand-primary)]" />
                      <span>{paragraph}</span>
                    </p>
                  ))}
                </div>
                {highlightsSection.lists.map((list, index) => (
                  <ul key={index} className="mt-4 list-disc space-y-2 pl-5 text-sm text-[var(--color-text-secondary)]">
                    {list.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ))}
              </section>
            ) : null}

            <section className="relative rounded-2xl border border-[var(--color-border)] bg-white p-8">
              <div className="absolute right-4 top-4 flex gap-2">
                {gallerySection ? (
                  <button
                    type="button"
                    onClick={() => onEditSection(galleryIndex)}
                    className="rounded-full border border-[var(--color-border)] px-3 py-1 text-xs font-semibold text-[var(--color-brand-primary)] transition hover:border-[var(--color-brand-primary)] hover:bg-[var(--color-brand-primary)]/10"
                  >
                    编辑标题
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={onEditGallery}
                  className="rounded-full border border-[var(--color-border)] px-3 py-1 text-xs font-semibold text-[var(--color-brand-primary)] transition hover:border-[var(--color-brand-primary)] hover:bg-[var(--color-brand-primary)]/10"
                >
                  编辑图库
                </button>
              </div>
              <h2 className="text-xl font-semibold text-[var(--color-brand-secondary)]">{gallerySection?.heading ?? "项目实景图库"}</h2>
              <div className="mt-6 grid grid-cols-3 gap-4">
                {galleryImages.slice(0, 3).map((item, index) => (
                  <figure key={`${item.src}-${index}`} className="relative aspect-[16/9] overflow-hidden rounded-lg">
                        <Image
                          src={resolveImageSrc(item.src, media.gallery[0]?.src ?? heroImage)}
                          alt={item.alt}
                          fill
                          className="object-cover"
                          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 45vw, 100vw"
                        />
                  </figure>
                ))}
              </div>
            </section>

            {otherSections.map((section, index) => {
              const sectionIndex = detail.sections.findIndex((item) => item === section);
              return (
                <section key={`${section.heading}-${index}`} className="relative rounded-2xl border border-[var(--color-border)] bg-white p-8">
                  <div className="absolute right-4 top-4 flex gap-2">
                    <button
                      type="button"
                      onClick={() => onEditSection(sectionIndex)}
                      className="rounded-full border border-[var(--color-border)] px-3 py-1 text-xs font-semibold text-[var(--color-brand-primary)] transition hover:border-[var(--color-brand-primary)] hover:bg-[var(--color-brand-primary)]/10"
                    >
                      编辑
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveSection(sectionIndex)}
                      className="rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-500 transition hover:bg-rose-50"
                    >
                      删除
                    </button>
                  </div>
                  <h2 className="text-xl font-semibold text-[var(--color-brand-secondary)]">{section.heading}</h2>
                  <div className="mt-4 space-y-4 text-sm leading-7 text-[var(--color-text-secondary)]">
                    {section.paragraphs.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </div>
                  {section.lists.map((list, listIndex) => (
                    <ul key={listIndex} className="mt-4 list-disc space-y-2 pl-5 text-sm text-[var(--color-text-secondary)]">
                      {list.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  ))}
                </section>
              );
            })}

            <section className="relative rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-8">
              <button
                type="button"
                onClick={onEditCta}
                className="absolute right-4 top-4 rounded-full border border-[var(--color-border)] px-3 py-1 text-xs font-semibold text-[var(--color-brand-primary)] transition hover:border-[var(--color-brand-primary)] hover:bg-[var(--color-brand-primary)]/10"
              >
                编辑底部 CTA
              </button>
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="max-w-2xl">
                  <h2 className="text-xl font-semibold text-[var(--color-brand-secondary)]">{detail.cta?.title ?? "需要定制方案？"}</h2>
                  {detail.cta?.description ? (
                    <p className="mt-2 text-sm text-[var(--color-text-secondary)]">{detail.cta?.description}</p>
                  ) : null}
                </div>
                <div className="flex items-center gap-3">
                  <Link
                    href={detail.cta?.primaryHref ?? "#"}
                    className="rounded-full bg-[var(--color-brand-primary)] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[var(--color-brand-primary)]/90"
                  >
                    {detail.cta?.primaryLabel ?? "提交项目信息"}
                  </Link>
                  <span className="text-sm text-[var(--color-brand-secondary)]">
                    {(detail.cta?.phoneLabel ?? "致电") + " " + (detail.cta?.phoneNumber ?? "400-800-1234")}
                  </span>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </ConfigPreviewFrame>
  );
}

interface HeroDialogProps {
  value: ProductDetailConfig;
  onSave: (
    next: ProductDetailConfig,
    localized: {
      title: LocalizedValue;
      hero: { badge: LocalizedValue; scenarios: LocalizedValue; description: LocalizedValue };
    },
  ) => void;
  onCancel: () => void;
  initialLocalized?: { title?: LocalizedValue; hero?: { badge?: LocalizedValue; scenarios?: LocalizedValue; description?: LocalizedValue } };
}

function HeroEditorDialog({ value, onSave, onCancel, initialLocalized }: HeroDialogProps) {
  const slugContext = value.slug || "未命名产品";
  const heroContextBase = `产品详情(${slugContext})英雄区`;
  const [draft, setDraft] = useState<ProductDetailConfig>(() => cloneDetail(value));

  // 初始化本地化记录：默认语言取当前值，其他语言优先使用覆盖
  const createInitialLocalized = (val: string, preset?: LocalizedValue) => {
    const record: LocalizedValue = {} as LocalizedValue;
    for (const code of SUPPORTED_LOCALES) {
      const key = code as LocaleKey;
      record[key] = code === DEFAULT_LOCALE ? (val ?? "") : (preset?.[key] ?? "");
    }
    return record;
  };

  const [titleRecord, setTitleRecord] = useState<LocalizedValue>(() => createInitialLocalized(value.title, initialLocalized?.title));
  const [badgeRecord, setBadgeRecord] = useState<LocalizedValue>(() => createInitialLocalized(value.hero.badge ?? "", initialLocalized?.hero?.badge));
  const [scenariosRecord, setScenariosRecord] = useState<LocalizedValue>(() => createInitialLocalized(value.hero.scenarios ?? "", initialLocalized?.hero?.scenarios));
  const [descriptionRecord, setDescriptionRecord] = useState<LocalizedValue>(() => createInitialLocalized(value.hero.description ?? "", initialLocalized?.hero?.description));

  useEffect(() => {
    setDraft(cloneDetail(value));
    setTitleRecord(createInitialLocalized(value.title, initialLocalized?.title));
    setBadgeRecord(createInitialLocalized(value.hero.badge ?? "", initialLocalized?.hero?.badge));
    setScenariosRecord(createInitialLocalized(value.hero.scenarios ?? "", initialLocalized?.hero?.scenarios));
    setDescriptionRecord(createInitialLocalized(value.hero.description ?? "", initialLocalized?.hero?.description));
  }, [value, initialLocalized]);

  return (
    <EditorDialog
      title="编辑英雄区"
      subtitle="调整标题、概述及顶部背景"
      onSave={() => {
        const next = cloneDetail(draft);
        // 默认语言直接写回快照，其他语言作为覆盖值
        next.title = (titleRecord[DEFAULT_LOCALE] ?? next.title).trim();
        next.hero = {
          ...next.hero,
          badge: (badgeRecord[DEFAULT_LOCALE] ?? "").trim(),
          scenarios: (scenariosRecord[DEFAULT_LOCALE] ?? "").trim(),
          description: (descriptionRecord[DEFAULT_LOCALE] ?? "").trim(),
        };
        onSave(next, {
          title: cleanLocalized(titleRecord),
          hero: {
            badge: cleanLocalized(badgeRecord),
            scenarios: cleanLocalized(scenariosRecord),
            description: cleanLocalized(descriptionRecord),
          },
        });
      }}
      onCancel={onCancel}
    >
      <div className="space-y-4 text-sm">
        <LocalizedTextField
          label="页面标题"
          translationContext={`${heroContextBase}页面标题`}
          value={titleRecord}
          onChange={setTitleRecord}
        />
        <div className="grid gap-4 md:grid-cols-2">
          <LocalizedTextField
            label="英雄区徽章（可选）"
            translationContext={`${heroContextBase}徽章`}
            value={badgeRecord}
            onChange={setBadgeRecord}
          />
          <LocalizedTextField
            label="适用场景"
            translationContext={`${heroContextBase}适用场景`}
            value={scenariosRecord}
            onChange={setScenariosRecord}
          />
        </div>
        <LocalizedTextField
          label="概述描述"
          translationContext={`${heroContextBase}概述描述`}
          value={descriptionRecord}
          onChange={setDescriptionRecord}
          multiline
          rows={4}
        />
        <ImageInput
          label="背景图"
          value={draft.hero.image ?? ""}
          onChange={(next) => setDraft((prev) => ({ ...prev, hero: { ...prev.hero, image: next } }))}
          placeholder="支持上传或粘贴外链"
          helper="最佳尺寸 908×360"
        />
      </div>
    </EditorDialog>
  );
}

interface BreadcrumbDialogProps {
  value: string[];
  onSave: (next: string[]) => void;
  onCancel: () => void;
}

function BreadcrumbEditorDialog({ value, onSave, onCancel }: BreadcrumbDialogProps) {
  const [items, setItems] = useState<string[]>(() => [...value]);

  useEffect(() => {
    setItems([...value]);
  }, [value]);

  const handleChange = (index: number, next: string) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = next;
      return copy;
    });
  };

  const handleAdd = () => {
    setItems((prev) => [...prev, ""]);
  };

  const handleRemove = (index: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  return (
    <EditorDialog
      title="编辑面包屑"
      subtitle="调整详情页顶部的导航路径"
      onSave={() => onSave(items.map((item) => item.trim()).filter((item) => item))}
      onCancel={onCancel}
    >
      <div className="space-y-4 text-sm">
        {items.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <input
              value={item}
              onChange={(event) => handleChange(index, event.target.value)}
              className="flex-1 rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
            />
            {items.length > 1 ? (
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="rounded-full border border-[var(--color-border)] px-3 py-1 text-xs text-rose-500 hover:border-rose-200"
              >
                删除
              </button>
            ) : null}
          </div>
        ))}
        <button
          type="button"
          onClick={handleAdd}
          className="rounded-full border border-dashed border-[var(--color-brand-primary)] px-3 py-1 text-xs font-semibold text-[var(--color-brand-primary)] transition hover:bg-[var(--color-brand-primary)]/10"
        >
          新增节点
        </button>
      </div>
    </EditorDialog>
  );
}

interface SectionDialogProps {
  value: ProductDetailConfig["sections"][number];
  slug: string;
  index: number;
  onSave: (
    next: ProductDetailConfig["sections"][number],
    localized?: {
      heading?: LocalizedValue;
      paragraphs?: LocalizedValue[];
      lists?: LocalizedValue[][];
      pairs?: Array<Array<{ label?: LocalizedValue; value?: LocalizedValue }>>;
    }
  ) => void;
  onCancel: () => void;
  initialLocalized?: {
    heading?: LocalizedValue;
    paragraphs?: LocalizedValue[];
    lists?: LocalizedValue[][];
    pairs?: Array<Array<{ label?: LocalizedValue; value?: LocalizedValue }>>;
  };
}

function SectionEditorDialog({ value, slug, index, onSave, onCancel, initialLocalized }: SectionDialogProps) {
  const sectionContextBase = `产品详情(${slug || "未命名产品"})章节${index + 1}`;
  const createInitialLocalized = (val: string, preset?: LocalizedValue) => {
    const record: LocalizedValue = {} as LocalizedValue;
    SUPPORTED_LOCALES.forEach((code) => {
      const key = code as LocaleKey;
      record[key] = code === DEFAULT_LOCALE ? (val ?? "") : (preset?.[key] ?? "");
    });
    return record;
  };

  const [headingRecord, setHeadingRecord] = useState<LocalizedValue>(() => createInitialLocalized(value.heading, initialLocalized?.heading));
  const [paragraphRecords, setParagraphRecords] = useState<LocalizedValue[]>(() => {
    const count = Math.max(value.paragraphs.length, initialLocalized?.paragraphs?.length ?? 0);
    return Array.from({ length: count }, (_, i) => createInitialLocalized(value.paragraphs[i] ?? "", initialLocalized?.paragraphs?.[i]));
  });
  const [listRecords, setListRecords] = useState<LocalizedValue[][]>(() => {
    const gCount = Math.max(value.lists.length, initialLocalized?.lists?.length ?? 0);
    return Array.from({ length: gCount }, (_, gi) => {
      const baseGroup = value.lists[gi] ?? [];
      const ovGroup = initialLocalized?.lists?.[gi] ?? [];
      const iCount = Math.max(baseGroup.length, ovGroup.length);
      return Array.from({ length: iCount }, (_, ii) => createInitialLocalized(baseGroup[ii] ?? "", ovGroup[ii]));
    });
  });
  const [pairRecords, setPairRecords] = useState<Array<Array<{ label: LocalizedValue; value: LocalizedValue }>>>(() => {
    const gCount = Math.max(value.pairs.length, initialLocalized?.pairs?.length ?? 0);
    return Array.from({ length: gCount }, (_, gi) => {
      const baseGroup = value.pairs[gi] ?? [];
      const ovGroup = initialLocalized?.pairs?.[gi] ?? [];
      const iCount = Math.max(baseGroup.length, ovGroup.length);
      return Array.from({ length: iCount }, (_, ii) => {
        const baseItem = baseGroup[ii];
        const ovItem = ovGroup[ii];
        return {
          label: createInitialLocalized(baseItem?.label ?? "", ovItem?.label),
          value: createInitialLocalized(baseItem?.value ?? "", ovItem?.value),
        };
      });
    });
  });

  useEffect(() => {
    setHeadingRecord(createInitialLocalized(value.heading, initialLocalized?.heading));
    const pCount = Math.max(value.paragraphs.length, initialLocalized?.paragraphs?.length ?? 0);
    setParagraphRecords(Array.from({ length: pCount }, (_, i) => createInitialLocalized(value.paragraphs[i] ?? "", initialLocalized?.paragraphs?.[i])));
    const gCount = Math.max(value.lists.length, initialLocalized?.lists?.length ?? 0);
    setListRecords(Array.from({ length: gCount }, (_, gi) => {
      const baseGroup = value.lists[gi] ?? [];
      const ovGroup = initialLocalized?.lists?.[gi] ?? [];
      const iCount = Math.max(baseGroup.length, ovGroup.length);
      return Array.from({ length: iCount }, (_, ii) => createInitialLocalized(baseGroup[ii] ?? "", ovGroup[ii]));
    }));
    const pgCount = Math.max(value.pairs.length, initialLocalized?.pairs?.length ?? 0);
    setPairRecords(Array.from({ length: pgCount }, (_, gi) => {
      const baseGroup = value.pairs[gi] ?? [];
      const ovGroup = initialLocalized?.pairs?.[gi] ?? [];
      const iCount = Math.max(baseGroup.length, ovGroup.length);
      return Array.from({ length: iCount }, (_, ii) => {
        const baseItem = baseGroup[ii];
        const ovItem = ovGroup[ii];
        return {
          label: createInitialLocalized(baseItem?.label ?? "", ovItem?.label),
          value: createInitialLocalized(baseItem?.value ?? "", ovItem?.value),
        };
      });
    }));
  }, [value, initialLocalized]);

  const addParagraph = () => setParagraphRecords((prev) => [...prev, createInitialLocalized("")]);
  const removeParagraph = (index: number) => setParagraphRecords((prev) => prev.filter((_, i) => i !== index));

  const addListGroup = () => setListRecords((prev) => [...prev, []]);
  const addListItem = (groupIndex: number) =>
    setListRecords((prev) => prev.map((g, i) => (i === groupIndex ? [...g, createInitialLocalized("")] : g)));
  const removeListItem = (groupIndex: number, itemIndex: number) =>
    setListRecords((prev) => prev.map((g, i) => (i === groupIndex ? g.filter((_, j) => j !== itemIndex) : g)));
  const removeListGroup = (groupIndex: number) => setListRecords((prev) => prev.filter((_, i) => i !== groupIndex));

  const addPairGroup = () => setPairRecords((prev) => [...prev, []]);
  const addPairItem = (groupIndex: number) =>
    setPairRecords((prev) => prev.map((g, i) => (i === groupIndex ? [...g, { label: createInitialLocalized(""), value: createInitialLocalized("") }] : g)));
  const removePairItem = (groupIndex: number, itemIndex: number) =>
    setPairRecords((prev) => prev.map((g, i) => (i === groupIndex ? g.filter((_, j) => j !== itemIndex) : g)));
  const removePairGroup = (groupIndex: number) => setPairRecords((prev) => prev.filter((_, i) => i !== groupIndex));

  const handleSave = () => {
    const next: ProductDetailConfig["sections"][number] = {
      heading: (headingRecord[DEFAULT_LOCALE] ?? "").trim(),
      paragraphs: paragraphRecords.map((r) => (r[DEFAULT_LOCALE] ?? "").trim()).filter((t) => t.length > 0),
      lists: listRecords.map((group) => group.map((r) => (r[DEFAULT_LOCALE] ?? "").trim()).filter((t) => t.length > 0)).filter((g) => g.length > 0),
      pairs: pairRecords
        .map((group) =>
          group
            .map((item) => ({
              label: (item.label[DEFAULT_LOCALE] ?? "").trim(),
              value: (item.value[DEFAULT_LOCALE] ?? "").trim(),
            }))
            .filter((p) => p.label.length > 0 || p.value.length > 0),
        )
        .filter((g) => g.length > 0),
    };

    const localized = {
      heading: headingRecord,
      paragraphs: paragraphRecords,
      lists: listRecords,
      pairs: pairRecords.map((group) => group.map((item) => ({ label: item.label, value: item.value }))),
    };

    onSave(next, localized);
  };

  return (
    <EditorDialog title="编辑章节" subtitle="维护段落、要点与指标卡片" onCancel={onCancel} onSave={handleSave}>
      <div className="space-y-6 text-sm">
        <LocalizedTextField
          label="章节标题"
          translationContext={`${sectionContextBase}标题`}
          value={headingRecord}
          onChange={setHeadingRecord}
        />

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-medium text-[var(--color-brand-secondary)]">段落</span>
            <button
              type="button"
              onClick={addParagraph}
              className="rounded-full border border-dashed border-[var(--color-brand-primary)] px-3 py-1 text-xs font-semibold text-[var(--color-brand-primary)] transition hover:bg-[var(--color-brand-primary)]/10"
            >
              新增段落
            </button>
          </div>
          <div className="space-y-3">
            {paragraphRecords.map((rec, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <div className="flex-1">
                  <LocalizedTextField
                    label={`段落 ${idx + 1}`}
                    translationContext={`${sectionContextBase}段落${idx + 1}`}
                    value={rec}
                    onChange={(val) => setParagraphRecords((prev) => prev.map((r, i) => (i === idx ? val : r)))}
                    multiline
                    rows={4}
                  />
                </div>
                <button
                  type="button"
                  className="rounded-full border border-[var(--color-border)] px-3 py-1 text-xs text-rose-500 hover:border-rose-200"
                  onClick={() => removeParagraph(idx)}
                >
                  删除
                </button>
              </div>
            ))}
            {!paragraphRecords.length ? <p className="text-xs text-[var(--color-text-tertiary,#8690a3)]">暂无段落内容。</p> : null}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-medium text-[var(--color-brand-secondary)]">要点列表</span>
            <button
              type="button"
              onClick={addListGroup}
              className="rounded-full border border-dashed border-[var(--color-brand-primary)] px-3 py-1 text-xs font-semibold text-[var(--color-brand-primary)] transition hover:bg-[var(--color-brand-primary)]/10"
            >
              新增分组
            </button>
          </div>
          <div className="space-y-3">
            {listRecords.map((group, gi) => (
              <div key={gi} className="rounded-2xl border border-[var(--color-border)] bg-white/80 p-4">
                <div className="flex items-center justify-between text-xs text-[var(--color-text-tertiary,#8690a3)]">
                  <span>列表 {gi + 1}</span>
                  <button
                    type="button"
                    className="rounded-full border border-[var(--color-border)] px-3 py-1 text-[11px] font-semibold text-rose-500 hover:border-rose-200"
                    onClick={() => removeListGroup(gi)}
                  >
                    删除分组
                  </button>
                </div>
                <div className="mt-3 space-y-2">
                  {group.map((rec, ii) => (
                    <div key={ii} className="flex items-start gap-2">
                      <div className="flex-1">
                        <LocalizedTextField
                          label={`条目 ${ii + 1}`}
                          translationContext={`${sectionContextBase}要点列表${gi + 1}条目${ii + 1}`}
                          value={rec}
                          onChange={(val) =>
                            setListRecords((prev) =>
                              prev.map((g, i) => (i === gi ? g.map((r, j) => (j === ii ? val : r)) : g)),
                            )
                          }
                        />
                      </div>
                      <button
                        type="button"
                        className="rounded-full border border-[var(--color-border)] px-3 py-1 text-xs text-rose-500 hover:border-rose-200"
                        onClick={() => removeListItem(gi, ii)}
                      >
                        删除
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addListItem(gi)}
                    className="rounded-full border border-dashed border-[var(--color-brand-primary)] px-3 py-1 text-xs font-semibold text-[var(--color-brand-primary)] transition hover:bg-[var(--color-brand-primary)]/10"
                  >
                    新增条目
                  </button>
                </div>
              </div>
            ))}
            {!listRecords.length ? <p className="text-xs text-[var(--color-text-tertiary,#8690a3)]">尚未配置列表要点。</p> : null}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-medium text-[var(--color-brand-secondary)]">指标卡片</span>
            <button
              type="button"
              onClick={addPairGroup}
              className="rounded-full border border-dashed border-[var(--color-brand-primary)] px-3 py-1 text-xs font-semibold text-[var(--color-brand-primary)] transition hover:bg-[var(--color-brand-primary)]/10"
            >
              新增行
            </button>
          </div>
          <div className="space-y-3">
            {pairRecords.map((group, gi) => (
              <div key={gi} className="rounded-2xl border border-[var(--color-border)] bg-white/80 p-4">
                <div className="flex items-center justify-between text-xs text-[var(--color-text-tertiary,#8690a3)]">
                  <span>指标行 {gi + 1}</span>
                  <button
                    type="button"
                    className="rounded-full border border-[var(--color-border)] px-3 py-1 text-[11px] font-semibold text-rose-500 hover:border-rose-200"
                    onClick={() => removePairGroup(gi)}
                  >
                    删除行
                  </button>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {group.map((item, ii) => (
                    <div key={ii} className="space-y-2 rounded-xl border border-[var(--color-border)] bg-white p-3">
                      <LocalizedTextField
                        label={`指标名称 ${ii + 1}`}
                        translationContext={`${sectionContextBase}指标行${gi + 1}名称${ii + 1}`}
                        value={item.label}
                        onChange={(val) =>
                          setPairRecords((prev) =>
                            prev.map((g, i) => (i === gi ? g.map((it, j) => (j === ii ? { ...it, label: val } : it)) : g)),
                          )
                        }
                      />
                      <LocalizedTextField
                        label={`指标值 ${ii + 1}`}
                        translationContext={`${sectionContextBase}指标行${gi + 1}数值${ii + 1}`}
                        value={item.value}
                        onChange={(val) =>
                          setPairRecords((prev) =>
                            prev.map((g, i) => (i === gi ? g.map((it, j) => (j === ii ? { ...it, value: val } : it)) : g)),
                          )
                        }
                      />
                      <div className="flex justify-end">
                        <button
                          type="button"
                          className="rounded-full border border-[var(--color-border)] px-3 py-1 text-[11px] text-rose-500 hover:border-rose-200"
                          onClick={() => removePairItem(gi, ii)}
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => addPairItem(gi)}
                  className="mt-3 rounded-full border border-dashed border-[var(--color-brand-primary)] px-3 py-1 text-xs font-semibold text-[var(--color-brand-primary)] transition hover:bg-[var(--color-brand-primary)]/10"
                >
                  新增指标
                </button>
              </div>
            ))}
            {!pairRecords.length ? <p className="text-xs text-[var(--color-text-tertiary,#8690a3)]">暂无指标卡片。</p> : null}
          </div>
        </div>
      </div>
    </EditorDialog>
  );
}

interface GalleryDialogProps {
  value: DetailGalleryItem[];
  onSave: (next: DetailGalleryItem[], localized?: Array<{ alt?: LocalizedValue }>) => void;
  onCancel: () => void;
  initialLocalized?: Array<{ alt?: LocalizedValue }>;
  slug: string;
}

function GalleryEditorDialog({ value, onSave, onCancel, initialLocalized, slug }: GalleryDialogProps) {
  const galleryContextBase = `产品详情(${slug || "未命名产品"})图库`;
  const createInitialLocalized = (val: string, preset?: LocalizedValue) => {
    const record: LocalizedValue = {} as LocalizedValue;
    SUPPORTED_LOCALES.forEach((code) => {
      const key = code as LocaleKey;
      record[key] = code === DEFAULT_LOCALE ? (val ?? "") : (preset?.[key] ?? "");
    });
    return record;
  };

  const [items, setItems] = useState<Array<{ src: string; altRecord: LocalizedValue }>>(() =>
    value.slice(0, 3).map((item, idx) => ({ src: item.src.trim(), altRecord: createInitialLocalized(item.alt, initialLocalized?.[idx]?.alt) })),
  );

  useEffect(() => {
    setItems(value.slice(0, 3).map((item, idx) => ({ src: item.src.trim(), altRecord: createInitialLocalized(item.alt, initialLocalized?.[idx]?.alt) })));
  }, [value, initialLocalized]);

  const handleSrcChange = (index: number, next: string) => {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, src: next } : it)));
  };

  const handleAltChange = (index: number, next: LocalizedValue) => {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, altRecord: next } : it)));
  };

  const handleAdd = () => {
    setItems((prev) => (prev.length >= 3 ? prev : [...prev, { src: "", altRecord: createInitialLocalized("") }]));
  };

  const handleRemove = (index: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSave = () => {
    const trimmed = items.slice(0, 3);
    const next = trimmed
      .map((it) => ({ src: it.src.trim(), alt: (it.altRecord[DEFAULT_LOCALE] ?? "").trim() || "产品图库" }))
      .filter((item) => item.src);
    const localized = trimmed.map((it) => ({ alt: it.altRecord }));
    onSave(next, localized);
  };

  return (
    <EditorDialog
      title="编辑项目图库"
      subtitle="维护图片地址与替代文本"
      onSave={handleSave}
      onCancel={onCancel}
    >
      <div className="space-y-4 text-sm">
        {items.map((item, index) => (
          <div key={index} className="space-y-3 rounded-2xl border border-[var(--color-border)] bg-white/80 p-4">
            <div className="flex items-center justify-between text-xs text-[var(--color-text-tertiary,#8690a3)]">
              <span>图片 {index + 1}</span>
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="rounded-full border border-[var(--color-border)] px-3 py-1 text-[11px] font-semibold text-rose-500 hover:border-rose-200"
              >
                删除
              </button>
            </div>
            <ImageInput
              label="图片地址"
              value={item.src}
              onChange={(next) => handleSrcChange(index, next)}
              placeholder="支持上传或外链"
              helper="建议尺寸 1200×675（16:9）"
            />
            <LocalizedTextField
              label="替代文本"
              translationContext={`${galleryContextBase}图片${index + 1}替代文本`}
              value={item.altRecord}
              onChange={(val) => handleAltChange(index, val)}
            />
          </div>
        ))}
        <button
          type="button"
          onClick={handleAdd}
          disabled={items.length >= 3}
          className={`rounded-full border border-dashed border-[var(--color-brand-primary)] px-3 py-1 text-xs font-semibold transition hover:bg-[var(--color-brand-primary)]/10 ${items.length >= 3 ? "opacity-50 cursor-not-allowed text-[var(--color-muted)] hover:bg-transparent" : "text-[var(--color-brand-primary)]"}`}
        >
          新增图片（最多 3 张）
        </button>
        {items.length >= 3 && (
          <p className="mt-2 text-[11px] text-[var(--color-muted)]">已达上限：最多 3 张，建议尺寸 1200×675（16:9）。</p>
        )}
      </div>
    </EditorDialog>
  );
}

interface CtaDialogProps {
  value: NonNullable<ProductDetailConfig["cta"]>;
  onSave: (
    next: NonNullable<ProductDetailConfig["cta"]>,
    localized?: { title?: LocalizedValue; description?: LocalizedValue; primaryLabel?: LocalizedValue; phoneLabel?: LocalizedValue },
  ) => void;
  onCancel: () => void;
  initialLocalized?: { title?: LocalizedValue; description?: LocalizedValue; primaryLabel?: LocalizedValue; phoneLabel?: LocalizedValue };
  slug: string;
}

function CtaEditorDialog({ value, onSave, onCancel, initialLocalized, slug }: CtaDialogProps) {
  const ctaContextBase = `产品详情(${slug || "未命名产品"})CTA`;
  const createInitialLocalized = (val: string, preset?: LocalizedValue) => {
    const record: LocalizedValue = {} as LocalizedValue;
    SUPPORTED_LOCALES.forEach((code) => {
      const key = code as LocaleKey;
      record[key] = code === DEFAULT_LOCALE ? (val ?? "") : (preset?.[key] ?? "");
    });
    return record;
  };

  const [titleRecord, setTitleRecord] = useState<LocalizedValue>(() => createInitialLocalized(value.title ?? "", initialLocalized?.title));
  const [descriptionRecord, setDescriptionRecord] = useState<LocalizedValue>(() => createInitialLocalized(value.description ?? "", initialLocalized?.description));
  const [primaryLabelRecord, setPrimaryLabelRecord] = useState<LocalizedValue>(() => createInitialLocalized(value.primaryLabel ?? "", initialLocalized?.primaryLabel));
  const [phoneLabelRecord, setPhoneLabelRecord] = useState<LocalizedValue>(() => createInitialLocalized(value.phoneLabel ?? "", initialLocalized?.phoneLabel));
  const [primaryHref, setPrimaryHref] = useState<string>(() => (value.primaryHref ?? ""));
  const [phoneNumber, setPhoneNumber] = useState<string>(() => (value.phoneNumber ?? ""));

  useEffect(() => {
    setTitleRecord(createInitialLocalized(value.title ?? "", initialLocalized?.title));
    setDescriptionRecord(createInitialLocalized(value.description ?? "", initialLocalized?.description));
    setPrimaryLabelRecord(createInitialLocalized(value.primaryLabel ?? "", initialLocalized?.primaryLabel));
    setPhoneLabelRecord(createInitialLocalized(value.phoneLabel ?? "", initialLocalized?.phoneLabel));
    setPrimaryHref(value.primaryHref ?? "");
    setPhoneNumber(value.phoneNumber ?? "");
  }, [value, initialLocalized]);

  const handleSave = () => {
    const next = {
      title: (titleRecord[DEFAULT_LOCALE] ?? "").trim(),
      description: (descriptionRecord[DEFAULT_LOCALE] ?? "").trim(),
      primaryLabel: (primaryLabelRecord[DEFAULT_LOCALE] ?? "").trim(),
      primaryHref: (primaryHref ?? "").trim(),
      phoneLabel: (phoneLabelRecord[DEFAULT_LOCALE] ?? "").trim(),
      phoneNumber: (phoneNumber ?? "").trim(),
    };
    const localized = {
      title: titleRecord,
      description: descriptionRecord,
      primaryLabel: primaryLabelRecord,
      phoneLabel: phoneLabelRecord,
    };
    onSave(next, localized);
  };

  return (
    <EditorDialog
      title="编辑底部 CTA"
      subtitle="配置描述、主按钮与联系电话"
      onSave={handleSave}
      onCancel={onCancel}
    >
      <div className="space-y-4 text-sm">
        <LocalizedTextField
          label="CTA 标题"
          translationContext={`${ctaContextBase}标题`}
          value={titleRecord}
          onChange={setTitleRecord}
        />
        <LocalizedTextField
          label="CTA 描述"
          translationContext={`${ctaContextBase}描述`}
          value={descriptionRecord}
          onChange={setDescriptionRecord}
          multiline
          rows={3}
        />
        <div className="grid gap-4 md:grid-cols-2">
          <LocalizedTextField
            label="主按钮文本"
            translationContext={`${ctaContextBase}主按钮文本`}
            value={primaryLabelRecord}
            onChange={setPrimaryLabelRecord}
          />
          <div>
            <label className="block text-xs text-[var(--color-text-tertiary,#8690a3)]">主按钮链接</label>
            <input
              value={primaryHref}
              onChange={(e) => setPrimaryHref(e.target.value)}
              placeholder="# 或 https://..."
              className="mt-1 w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <LocalizedTextField
            label="电话按钮文本"
            translationContext={`${ctaContextBase}电话按钮文本`}
            value={phoneLabelRecord}
            onChange={setPhoneLabelRecord}
          />
          <div>
            <label className="block text-xs text-[var(--color-text-tertiary,#8690a3)]">联系电话</label>
            <input
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="如 400-800-1234"
              className="mt-1 w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
            />
          </div>
        </div>
      </div>
    </EditorDialog>
  );
}

export function ProductDetailConfigEditor({ configKey, initialConfig, productSeeds = {}, productOrder = [], productCenter }: ProductDetailConfigEditorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fallbackSlugs = useMemo(() => listAvailableProductDetailSlugs(), []);

  const [details, setDetails] = useState<ProductDetailConfigMap>(() => normalizeProductDetailMap(initialConfig, productSeeds));
  useGlobalTranslationRegistrationForConfig({ config: details, setConfig: setDetails, labelPrefix: configKey });
  const [baselineSnapshot, setBaselineSnapshot] = useState(() => {
    const normalized = normalizeProductDetailMap(initialConfig, productSeeds);
    return JSON.stringify(serializeProductDetailMap(normalized));
  });
  // 本地记录被删除的 slug，避免服务端种子与排序导致目录仍显示
  const [removedSlugs, setRemovedSlugs] = useState<string[]>([]);

  useEffect(() => {
    const normalized = normalizeProductDetailMap(initialConfig, productSeeds);
    setDetails(normalized);
    const slugs = Object.keys(normalized);
    const extracted = extractLocalizedOverrides(initialConfig as Record<string, unknown>, slugs);
    setLocalizedOverrides(extracted);
    setBaselineSnapshot(JSON.stringify(mergeSerializedWithOverrides(serializeProductDetailMap(normalized), extracted)));
  }, [initialConfig, productSeeds]);

  const slugParam = searchParams.get("slug");

  const orderedSlugs = useMemo(() => {
    const order: string[] = [];
    const push = (slug?: string) => {
      if (!slug) return;
      if (removedSlugs.includes(slug)) return;
      if (!order.includes(slug)) {
        order.push(slug);
      }
    };
    const preferred = productOrder.length ? productOrder : fallbackSlugs;
    preferred.forEach(push);
    Object.keys(productSeeds).forEach(push);
    Object.keys(details).forEach(push);
    if (slugParam) push(slugParam);
    return order;
  }, [productOrder, fallbackSlugs, productSeeds, details, slugParam, removedSlugs]);

  const availableSlugs = orderedSlugs;

  const slugLabels = useMemo(() => {
    const entries = availableSlugs.map((slug) => [slug, productSeeds[slug]?.title ?? slug]);
    return Object.fromEntries(entries);
  }, [availableSlugs, productSeeds]);

  const fallbackSlug = availableSlugs.find((slug) => details[slug]) ?? availableSlugs[0] ?? "";

  const [selectedSlug, setSelectedSlug] = useState(() => {
    if (slugParam && availableSlugs.includes(slugParam)) {
      return slugParam;
    }
    return fallbackSlug;
  });

  useEffect(() => {
    if (slugParam && availableSlugs.includes(slugParam)) {
      setSelectedSlug(slugParam);
      return;
    }
    if (!availableSlugs.includes(selectedSlug) && fallbackSlug) {
      setSelectedSlug(fallbackSlug);
    }
  }, [slugParam, availableSlugs, fallbackSlug, selectedSlug]);

  useEffect(() => {
    if (!selectedSlug) return;
    setDetails((prev) => {
      if (prev[selectedSlug]) return prev;
      return {
        ...prev,
        [selectedSlug]: createProductDetailFallback(selectedSlug, productSeeds[selectedSlug]),
      } satisfies ProductDetailConfigMap;
    });
  }, [selectedSlug, productSeeds]);

  const handleSelectSlug = (slug: string) => {
    setSelectedSlug(slug);
    const params = new URLSearchParams(searchParams.toString());
    params.set("slug", slug);
    router.replace(`${window.location.pathname}?${params.toString()}`);
  };

  const [editing, setEditing] = useState<
    | { type: "hero" }
    | { type: "breadcrumb" }
    | { type: "section"; index: number }
    | { type: "gallery" }
    | { type: "cta" }
    | null
  >(null);

  const [formState, dispatch] = useFormState<UpdateSiteConfigActionState, FormData>(updateSiteConfigAction, {
    status: "idle",
  });
  const formRef = useRef<HTMLFormElement>(null);
  const toast = useToast();
  const prevStatusRef = useRef(formState.status);

  const [localizedOverrides, setLocalizedOverrides] = useState<
    Record<
      string,
      {
        title?: LocalizedValue;
        hero?: { badge?: LocalizedValue; scenarios?: LocalizedValue; description?: LocalizedValue };
        sections?: Array<{
          heading?: LocalizedValue;
          paragraphs?: LocalizedValue[];
          lists?: LocalizedValue[][];
          pairs?: Array<Array<{ label?: LocalizedValue; value?: LocalizedValue }>>;
        }>;
        gallery?: Array<{ alt?: LocalizedValue }>;
        cta?: { title?: LocalizedValue; description?: LocalizedValue; primaryLabel?: LocalizedValue; phoneLabel?: LocalizedValue };
      }
    >
  >({});
  const payloadObject = useMemo(
    () => mergeSerializedWithOverrides(serializeProductDetailMap(details), localizedOverrides),
    [details, localizedOverrides],
  );
  const payload = useMemo(() => JSON.stringify(payloadObject), [payloadObject]);
  const payloadWithMeta = useMemo(() => {
    const prevMeta = (initialConfig as Record<string, unknown> & { _meta?: Record<string, unknown> })._meta;
    const schema = prevMeta && typeof prevMeta["schema"] === "string" ? (prevMeta["schema"] as string) : "product-details.v1";
    const adminPathPrev = prevMeta && typeof prevMeta["adminPath"] === "string" ? (prevMeta["adminPath"] as string) : undefined;
    const now = new Date().toISOString();
    const next = {
      ...payloadObject,
      _meta: {
        ...(prevMeta ?? {}),
        schema,
        updatedAt: now,
        adminPath: adminPathPrev ?? `/admin/${encodeURIComponent(configKey)}`,
      },
    } as Record<string, unknown>;
    return JSON.stringify(next);
  }, [payloadObject, initialConfig, configKey]);
  const detailsSnapshot = useMemo(() => JSON.stringify(details), [details]);

  const detail = details[selectedSlug] ?? details[fallbackSlug];
  const isDirty = useMemo(() => payload !== baselineSnapshot, [payload, baselineSnapshot]);
  const statusLabel = isDirty ? "有未保存的更改" : "暂无未保存的更改";

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    if (formState.status === "success") {
      setBaselineSnapshot(payload);
      toast.success("保存成功");
      window.dispatchEvent(
        new CustomEvent("site-config:save-success", { detail: { key: configKey } }),
      );
      formRef.current?.classList.add("animate-pulse");
      const timer = setTimeout(() => formRef.current?.classList.remove("animate-pulse"), 400);
      cleanup = () => clearTimeout(timer);
    }
    return cleanup;
  }, [formState, payload, toast, configKey]);

  let dialog: JSX.Element | null = null;
  if (detail) {
    if (editing?.type === "hero") {
      dialog = (
        <HeroEditorDialog
          value={detail}
          initialLocalized={{
            title: localizedOverrides[selectedSlug]?.title,
            hero: localizedOverrides[selectedSlug]?.hero,
          }}
          onSave={(next, localized) => {
            const nextDetails = { ...details, [selectedSlug]: next };
            const nextOverrides = {
              ...localizedOverrides,
              [selectedSlug]: {
                ...(localizedOverrides[selectedSlug] ?? {}),
                title: localized.title,
                hero: {
                  ...(localizedOverrides[selectedSlug]?.hero ?? {}),
                  badge: localized.hero.badge,
                  scenarios: localized.hero.scenarios,
                  description: localized.hero.description,
                },
              },
            };
            setDetails(nextDetails);
            setLocalizedOverrides(nextOverrides);
            const fd = new FormData();
            fd.set("key", configKey);
            fd.set(
              "payload",
              JSON.stringify(
                mergeSerializedWithOverrides(serializeProductDetailMap(nextDetails), nextOverrides),
              ),
            );
            dispatch(fd);
            setEditing(null);
          }}
          onCancel={() => setEditing(null)}
        />
      );
    } else if (editing?.type === "breadcrumb") {
      dialog = (
        <BreadcrumbEditorDialog
          value={detail.breadcrumb}
          onSave={(next) => {
            const nextDetails = {
              ...details,
              [selectedSlug]: { ...details[selectedSlug], breadcrumb: next },
            };
            setDetails(nextDetails);
            const fd = new FormData();
            fd.set("key", configKey);
            fd.set(
              "payload",
              JSON.stringify(
                mergeSerializedWithOverrides(
                  serializeProductDetailMap(nextDetails),
                  localizedOverrides,
                ),
              ),
            );
            dispatch(fd);
            setEditing(null);
          }}
          onCancel={() => setEditing(null)}
        />
      );
    } else if (editing?.type === "section") {
      const section = detail.sections[editing.index];
      if (section) {
        dialog = (
          <SectionEditorDialog
            value={section}
            slug={selectedSlug}
            index={editing.index}
            initialLocalized={localizedOverrides[selectedSlug]?.sections?.[editing.index]}
            onSave={(next, localized) => {
              const current = cloneDetail(details[selectedSlug]);
              current.sections[editing.index] = next;
              const nextDetails = {
                ...details,
                [selectedSlug]: current,
              };
              let nextOverrides = localizedOverrides;
              if (localized) {
                const prevEntry = localizedOverrides[selectedSlug] ?? {};
                const prevSections = prevEntry.sections ?? [];
                const nextSections = [...prevSections];
                nextSections[editing.index] = {
                  heading: localized.heading,
                  paragraphs: localized.paragraphs,
                  lists: localized.lists,
                  pairs: localized.pairs,
                };
                nextOverrides = {
                  ...localizedOverrides,
                  [selectedSlug]: {
                    ...prevEntry,
                    sections: nextSections,
                  },
                };
              }
              setDetails(nextDetails);
              setLocalizedOverrides(nextOverrides);
              const fd = new FormData();
              fd.set("key", configKey);
              fd.set(
                "payload",
                JSON.stringify(
                  mergeSerializedWithOverrides(
                    serializeProductDetailMap(nextDetails),
                    nextOverrides,
                  ),
                ),
              );
              dispatch(fd);
              setEditing(null);
            }}
            onCancel={() => setEditing(null)}
          />
        );
      }
    } else if (editing?.type === "gallery") {
      dialog = (
        <GalleryEditorDialog
          value={detail.gallery}
          initialLocalized={localizedOverrides[selectedSlug]?.gallery}
          slug={selectedSlug}
          onSave={(next, localized) => {
            const nextDetails = {
              ...details,
              [selectedSlug]: { ...details[selectedSlug], gallery: next },
            };
            let nextOverrides = localizedOverrides;
            if (localized) {
              const prevEntry = localizedOverrides[selectedSlug] ?? {};
              const prevGallery = prevEntry.gallery ?? [];
              const nextGallery = [...prevGallery];
              localized.forEach((ov, index) => {
                nextGallery[index] = { alt: ov.alt };
              });
              nextOverrides = {
                ...localizedOverrides,
                [selectedSlug]: { ...prevEntry, gallery: nextGallery },
              };
            }
            setDetails(nextDetails);
            setLocalizedOverrides(nextOverrides);
            const fd = new FormData();
            fd.set("key", configKey);
            fd.set(
              "payload",
              JSON.stringify(
                mergeSerializedWithOverrides(
                  serializeProductDetailMap(nextDetails),
                  nextOverrides,
                ),
              ),
            );
            dispatch(fd);
            setEditing(null);
          }}
          onCancel={() => setEditing(null)}
        />
      );
    } else if (editing?.type === "cta") {
      dialog = (
        <CtaEditorDialog
          value={detail.cta ?? { title: "", description: "", primaryLabel: "", primaryHref: "", phoneLabel: "", phoneNumber: "" }}
          initialLocalized={localizedOverrides[selectedSlug]?.cta}
          slug={selectedSlug}
          onSave={(next, localized) => {
            const nextDetails = {
              ...details,
              [selectedSlug]: { ...details[selectedSlug], cta: next },
            };
            let nextOverrides = localizedOverrides;
            if (localized) {
              nextOverrides = {
                ...localizedOverrides,
                [selectedSlug]: {
                  ...(localizedOverrides[selectedSlug] ?? {}),
                  cta: {
                    title: localized.title,
                    description: localized.description,
                    primaryLabel: localized.primaryLabel,
                    phoneLabel: localized.phoneLabel,
                  },
                },
              };
            }
            setDetails(nextDetails);
            setLocalizedOverrides(nextOverrides);
            const fd = new FormData();
            fd.set("key", configKey);
            fd.set(
              "payload",
              JSON.stringify(
                mergeSerializedWithOverrides(
                  serializeProductDetailMap(nextDetails),
                  nextOverrides,
                ),
              ),
            );
            dispatch(fd);
            setEditing(null);
          }}
          onCancel={() => setEditing(null)}
        />
      );
    }
  }


  const handleRemoveSection = (index: number) => {
    setDetails((prev) => {
      const current = cloneDetail(prev[selectedSlug]);
      current.sections.splice(index, 1);
      return {
        ...prev,
        [selectedSlug]: current,
      };
    });
    setLocalizedOverrides((prev) => {
      const entry = prev[selectedSlug];
      if (!entry?.sections) return prev;
      const nextSections = [...entry.sections];
      nextSections.splice(index, 1);
      return {
        ...prev,
        [selectedSlug]: { ...entry, sections: nextSections },
      };
    });
  };

  const handleDeleteSlug = (slug: string) => {
    const ok = window.confirm("确定删除该产品详情？删除后将自动保存。");
    if (!ok) return;

    // 删除详情与本地化覆盖
    const nextDetails = { ...details };
    delete nextDetails[slug];

    const nextOverrides = { ...localizedOverrides };
    delete nextOverrides[slug];

    setDetails(nextDetails);
    setLocalizedOverrides(nextOverrides);
    // 隐藏目录中的已删除项（避免种子/排序导致仍显示）
    setRemovedSlugs((prev) => (prev.includes(slug) ? prev : [...prev, slug]));

    if (selectedSlug === slug) {
      const nextSlug = availableSlugs.find((s) => s !== slug) ?? fallbackSlug;
      if (nextSlug) {
        handleSelectSlug(nextSlug);
      }
    }

    // 自动保存产品详情配置
    const nextPayloadObject = mergeSerializedWithOverrides(serializeProductDetailMap(nextDetails), nextOverrides);
    const fdDetails = new FormData();
    fdDetails.set("key", configKey);
    fdDetails.set("payload", JSON.stringify(nextPayloadObject));
    dispatch(fdDetails);

    // 同步更新产品中心：移除对应 slug 并保存
    try {
      const pc = (productCenter ?? {}) as Record<string, any>;
      const products: Array<Record<string, any>> = Array.isArray(pc.products) ? pc.products : [];
      if (products.length > 1) {
        const nextProducts = products.filter((item) => item?.slug !== slug);
        const nextProductCenter = { ...pc, products: nextProducts };
        const fdCenter = new FormData();
        fdCenter.set("key", "产品中心");
        fdCenter.set("payload", JSON.stringify(nextProductCenter));
        dispatch(fdCenter);
      }
    } catch (e) {
      console.warn("同步更新产品中心失败", e);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/admin/${encodeURIComponent("产品中心")}`}
          className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-text-secondary)] transition hover:text-[var(--color-brand-primary)]"
        >
          ← 返回产品中心
        </Link>
        <span className="rounded-full bg-[var(--color-brand-primary)]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-brand-primary)]">
          {selectedSlug}
        </span>
      </div>


      {detail ? (
        <ProductDetailPreview
          slug={selectedSlug}
          detail={detail}
          availableSlugs={availableSlugs}
          slugLabels={slugLabels}
          onSelectSlug={handleSelectSlug}
          onDeleteSlug={handleDeleteSlug}
          onEditHero={() => setEditing({ type: "hero" })}
          onEditBreadcrumb={() => setEditing({ type: "breadcrumb" })}
          onEditSection={(index) => setEditing({ type: "section", index })}
          onRemoveSection={handleRemoveSection}
          onEditGallery={() => setEditing({ type: "gallery" })}
          onEditCta={() => setEditing({ type: "cta" })}
        />
      ) : (
        <div className="rounded-2xl border border-[var(--color-border)] bg-white/80 p-10 text-sm text-[var(--color-text-secondary)]">
          暂无可用的产品详情，请先在产品中心添加对应的产品。
        </div>
      )}

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
