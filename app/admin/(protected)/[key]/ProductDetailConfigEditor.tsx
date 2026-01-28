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
  type ProductDetailTabConfig,
  type ProductDetailTabTarget,
  type ProductIntroConfig,
  type ProductSpecsConfig,
  type ProductAccessoriesConfig,
} from "@/types/productDetails";
import { ProductHeroCarousel } from "@/components/products/ProductHeroCarousel";
import { ProductTabsSection } from "@/components/products/ProductTabsSection";
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
  onEditTabs: () => void;
  onEditIntro: () => void;
  onEditSpecs: () => void;
  onEditAccessories: () => void;
}

function toStringValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return "";
}

function cloneDetail(detail: ProductDetailConfig): ProductDetailConfig {
  return {
    slug: detail.slug,
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
    tabs: detail.tabs.map((tab) => ({ ...tab })),
    intro: {
      blocks: detail.intro.blocks.map((block) => ({ ...block })),
    },
    specs: {
      columns: [...detail.specs.columns],
      rows: detail.specs.rows.map((row) => [...row]),
      caption: detail.specs.caption,
    },
    accessories: {
      items: detail.accessories.items.map((item) => ({ ...item })),
    },
    cta: detail.cta ? { ...detail.cta } : undefined,
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
    hero?: { heading?: LocalizedValue; badge?: LocalizedValue; scenarios?: LocalizedValue; description?: LocalizedValue; viewGalleryLabel?: LocalizedValue };
    sections?: Array<{
      heading?: LocalizedValue;
      paragraphs?: LocalizedValue[];
      lists?: LocalizedValue[][];
      pairs?: Array<Array<{ label?: LocalizedValue; value?: LocalizedValue }>>;
    }>;
    gallery?: Array<{ alt?: LocalizedValue }>;
    cta?: { title?: LocalizedValue; description?: LocalizedValue; primaryLabel?: LocalizedValue; phoneLabel?: LocalizedValue };
    tabs?: Array<{ label?: LocalizedValue }>;
    intro?: { blocks?: Array<{ title?: LocalizedValue; subtitle?: LocalizedValue }> };
    specs?: { columns?: Array<LocalizedValue | undefined>; rows?: Array<Array<LocalizedValue | undefined> | undefined>; caption?: LocalizedValue };
    accessories?: { items?: Array<{ title?: LocalizedValue; description?: LocalizedValue }> };
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
    const heroHeading = cleanLocalized(heroRaw.heading);
    const heroBadge = cleanLocalized(heroRaw.badge);
    const heroScenarios = cleanLocalized(heroRaw.scenarios);
    const heroDescription = cleanLocalized(heroRaw.description);
    const heroViewGalleryLabel = cleanLocalized(heroRaw.viewGalleryLabel);
    if (hasAnyLv(heroHeading) || hasAnyLv(heroBadge) || hasAnyLv(heroScenarios) || hasAnyLv(heroDescription) || hasAnyLv(heroViewGalleryLabel)) {
      entry.hero = {};
      if (hasAnyLv(heroHeading)) entry.hero.heading = heroHeading;
      if (hasAnyLv(heroBadge)) entry.hero.badge = heroBadge;
      if (hasAnyLv(heroScenarios)) entry.hero.scenarios = heroScenarios;
      if (hasAnyLv(heroDescription)) entry.hero.description = heroDescription;
      if (hasAnyLv(heroViewGalleryLabel)) entry.hero.viewGalleryLabel = heroViewGalleryLabel;
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

    // tabs
    const tabsRaw = Array.isArray((raw as any).tabs) ? (((raw as any).tabs as any[]) ?? []) : [];
    const tabsOv = tabsRaw.map((tab) => {
      const t = asRecord(tab);
      const label = cleanLocalized(t.label);
      return hasAnyLv(label) ? { label } : {};
    });
    if (tabsOv.some((tab) => Object.keys(tab).length)) {
      entry.tabs = tabsOv;
    }

    // intro blocks
    const introRaw = asRecord((raw as any).intro);
    const introBlocks = Array.isArray(introRaw.blocks) ? ((introRaw.blocks as unknown[]) ?? []) : [];
    const introOv = introBlocks.map((block) => {
      const b = asRecord(block);
      const title = cleanLocalized(b.title);
      const subtitle = cleanLocalized(b.subtitle);
      const rec: { title?: LocalizedValue; subtitle?: LocalizedValue } = {};
      if (hasAnyLv(title)) rec.title = title;
      if (hasAnyLv(subtitle)) rec.subtitle = subtitle;
      return Object.keys(rec).length ? rec : undefined;
    }).filter((block): block is { title?: LocalizedValue; subtitle?: LocalizedValue } => Boolean(block));
    if (introOv.length) {
      entry.intro = { blocks: introOv };
    }

    // specs
    const specsRaw = asRecord((raw as any).specs);
    const columnsRaw = Array.isArray(specsRaw.columns) ? ((specsRaw.columns as unknown[]) ?? []) : [];
    const columnsOv = columnsRaw.map((col) => {
      const record = cleanLocalized(col);
      return hasAnyLv(record) ? record : undefined;
    });
    const rowsRaw = Array.isArray(specsRaw.rows) ? ((specsRaw.rows as unknown[]) ?? []) : [];
    const rowsOv = rowsRaw.map((row) => {
      if (!Array.isArray(row)) return undefined;
      const rowClean = row.map((cell) => {
        const record = cleanLocalized(cell);
        return hasAnyLv(record) ? record : undefined;
      });
      return rowClean.some(Boolean) ? rowClean : undefined;
    });
    const captionOv = cleanLocalized(specsRaw.caption);
    if (columnsOv.some(Boolean) || rowsOv.some(Boolean) || hasAnyLv(captionOv)) {
      entry.specs = {};
      if (columnsOv.some(Boolean)) entry.specs.columns = columnsOv;
      if (rowsOv.some(Boolean)) entry.specs.rows = rowsOv;
      if (hasAnyLv(captionOv)) entry.specs.caption = captionOv;
    }

    // accessories
    const accessoriesRaw = asRecord((raw as any).accessories);
    const accessoryItems = Array.isArray(accessoriesRaw.items) ? ((accessoriesRaw.items as unknown[]) ?? []) : [];
    const accessoriesOv = accessoryItems.map((item) => {
      const r = asRecord(item);
      const title = cleanLocalized(r.title);
      const description = cleanLocalized(r.description);
      const rec: { title?: LocalizedValue; description?: LocalizedValue } = {};
      if (hasAnyLv(title)) rec.title = title;
      if (hasAnyLv(description)) rec.description = description;
      return Object.keys(rec).length ? rec : undefined;
    }).filter((item): item is { title?: LocalizedValue; description?: LocalizedValue } => Boolean(item));
    if (accessoriesOv.length) {
      entry.accessories = { items: accessoriesOv };
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
    if (override.hero?.heading && hasAnyLv(override.hero.heading)) {
      heroRaw.heading = mergeLocalized(heroRaw.heading, override.hero.heading);
    }
    if (override.hero?.badge && hasAnyLv(override.hero.badge)) {
      heroRaw.badge = mergeLocalized(heroRaw.badge, override.hero.badge);
    }
    if (override.hero?.scenarios && hasAnyLv(override.hero.scenarios)) {
      heroRaw.scenarios = mergeLocalized(heroRaw.scenarios, override.hero.scenarios);
    }
    if (override.hero?.description && hasAnyLv(override.hero.description)) {
      heroRaw.description = mergeLocalized(heroRaw.description, override.hero.description);
    }
    if (override.hero?.viewGalleryLabel && hasAnyLv(override.hero.viewGalleryLabel)) {
      heroRaw.viewGalleryLabel = mergeLocalized(heroRaw.viewGalleryLabel, override.hero.viewGalleryLabel);
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

    if (override.tabs && Array.isArray(override.tabs)) {
      const tabsRaw = Array.isArray((detailRaw as any).tabs)
        ? ([...(((detailRaw as any).tabs as unknown[]) ?? [])])
        : [];
      override.tabs.forEach((tabOverride, index) => {
        if (!tabOverride) return;
        const tabRaw = asRecord(tabsRaw[index]);
        if (tabOverride.label && hasAnyLv(tabOverride.label)) {
          tabRaw.label = mergeLocalized(tabRaw.label, tabOverride.label);
        }
        tabsRaw[index] = tabRaw;
      });
      (detailRaw as any).tabs = tabsRaw;
    }

    if (override.intro?.blocks && Array.isArray(override.intro.blocks)) {
      const introRaw = asRecord((detailRaw as any).intro);
      const blocksRaw = Array.isArray(introRaw.blocks) ? ([...((introRaw.blocks as unknown[]) ?? [])]) : [];
      override.intro.blocks.forEach((blockOverride, index) => {
        if (!blockOverride) return;
        const blockRaw = asRecord(blocksRaw[index]);
        if (blockOverride.title && hasAnyLv(blockOverride.title)) {
          blockRaw.title = mergeLocalized(blockRaw.title, blockOverride.title);
        }
        if (blockOverride.subtitle && hasAnyLv(blockOverride.subtitle)) {
          blockRaw.subtitle = mergeLocalized(blockRaw.subtitle, blockOverride.subtitle);
        }
        blocksRaw[index] = blockRaw;
      });
      introRaw.blocks = blocksRaw;
      (detailRaw as any).intro = introRaw;
    }

    if (override.specs) {
      const specsRaw = asRecord((detailRaw as any).specs);
      const columnsRaw = Array.isArray(specsRaw.columns) ? ([...((specsRaw.columns as unknown[]) ?? [])]) : [];
      override.specs.columns?.forEach((columnOverride, index) => {
        if (!columnOverride) return;
        columnsRaw[index] = mergeLocalized(columnsRaw[index], columnOverride);
      });
      if (columnsRaw.length) {
        specsRaw.columns = columnsRaw;
      }
      if (override.specs.rows && Array.isArray(override.specs.rows)) {
        const rowsRaw = Array.isArray(specsRaw.rows) ? ([...((specsRaw.rows as unknown[]) ?? [])]) : [];
        override.specs.rows.forEach((rowOverride, rowIndex) => {
          if (!rowOverride || !Array.isArray(rowOverride)) return;
          const rowRaw = Array.isArray(rowsRaw[rowIndex]) ? [...(rowsRaw[rowIndex] as unknown[])] : [];
          rowOverride.forEach((cellOverride, cellIndex) => {
            if (!cellOverride) return;
            rowRaw[cellIndex] = mergeLocalized(rowRaw[cellIndex], cellOverride);
          });
          rowsRaw[rowIndex] = rowRaw;
        });
        if (rowsRaw.length) {
          specsRaw.rows = rowsRaw;
        }
      }
      if (override.specs.caption && hasAnyLv(override.specs.caption)) {
        specsRaw.caption = mergeLocalized(specsRaw.caption, override.specs.caption);
      }
      (detailRaw as any).specs = specsRaw;
    }

    if (override.accessories?.items && Array.isArray(override.accessories.items)) {
      const accessoriesRaw = asRecord((detailRaw as any).accessories);
      const itemsRaw = Array.isArray(accessoriesRaw.items) ? ([...((accessoriesRaw.items as unknown[]) ?? [])]) : [];
      override.accessories.items.forEach((itemOverride, index) => {
        if (!itemOverride) return;
        const itemRaw = asRecord(itemsRaw[index]);
        if (itemOverride.title && hasAnyLv(itemOverride.title)) {
          itemRaw.title = mergeLocalized(itemRaw.title, itemOverride.title);
        }
        if (itemOverride.description && hasAnyLv(itemOverride.description)) {
          itemRaw.description = mergeLocalized(itemRaw.description, itemOverride.description);
        }
        itemsRaw[index] = itemRaw;
      });
      accessoriesRaw.items = itemsRaw;
      (detailRaw as any).accessories = accessoriesRaw;
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

function createLocalizedRecord(base: string, preset?: LocalizedValue): LocalizedValue {
  const merged: Record<string, string> = {
    ...(preset ?? {}),
    [DEFAULT_LOCALE]: base ?? "",
  } as Record<string, string>;
  return cleanLocalized(merged);
}

const TAB_LABEL_FALLBACK: Record<ProductDetailTabTarget, string> = {
  intro: "产品介绍",
  specs: "产品参数",
  accessories: "可选配件",
};

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
  onEditTabs,
  onEditIntro,
  onEditSpecs,
  onEditAccessories,
}: PreviewProps) {
  const media = PRODUCT_MEDIA[slug] ?? DEFAULT_MEDIA;
  const heroImage = resolveImageSrc(detail.hero.image, media.hero);
  const heroSlidesSources = [
    ...(heroImage ? [{ src: heroImage, alt: detail.title }] : []),
    ...(detail.gallery.length ? detail.gallery : media.gallery),
  ];
  const heroSlides = heroSlidesSources.reduce<Array<{ src: string; alt: string }>>((acc, slide) => {
    if (!slide?.src) return acc;
    if (acc.some((existing) => existing.src === slide.src)) {
      return acc;
    }
    acc.push({ src: slide.src, alt: slide.alt || detail.title });
    return acc;
  }, []);

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

  const otherSections = detail.sections.filter(
    (_, index) => ![overviewIndex, highlightsIndex, galleryIndex].includes(index),
  );
  const heroHeading = detail.hero.heading || detail.title;
  const heroBadge = detail.hero.badge || null;
  const heroEyebrow = detail.hero.scenarios || undefined;
  const heroOverlayEnabled = detail.hero.overlayEnabled !== false;

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

            <div className="relative">
        <ProductHeroCarousel
          slides={heroSlides}
          title={heroHeading}
          description={detail.hero.description}
          badge={heroBadge}
          eyebrow={heroEyebrow}
          overlayEnabled={heroOverlayEnabled}
          viewGalleryLabel={detail.hero.viewGalleryLabel}
        />
              <div className="absolute right-4 top-4 z-10 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={onEditHero}
                  className="rounded-full border border-white/70 bg-black/50 px-3 py-1 text-xs font-semibold text-white shadow transition hover:bg-white hover:text-[var(--color-brand-primary)]"
                >
                  编辑顶部轮播
                </button>
                <button
                  type="button"
                  onClick={onEditGallery}
                  className="rounded-full border border-white/70 bg-black/50 px-3 py-1 text-xs font-semibold text-white shadow transition hover:bg-white hover:text-[var(--color-brand-primary)]"
                >
                  编辑图库资源
                </button>
              </div>
            </div>

            <div className="relative">
              <ProductTabsSection
                tabs={detail.tabs}
                intro={detail.intro}
                specs={detail.specs}
                accessories={detail.accessories}
              />
              <div className="absolute right-4 top-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={onEditTabs}
                  className="rounded-full border border-[var(--color-border)] bg-white/90 px-3 py-1 text-xs font-semibold text-[var(--color-brand-primary)] transition hover:border-[var(--color-brand-primary)] hover:bg-[var(--color-brand-primary)]/10"
                >
                  编辑 Tab 排序
                </button>
                <button
                  type="button"
                  onClick={onEditIntro}
                  className="rounded-full border border-[var(--color-border)] bg-white/90 px-3 py-1 text-xs font-semibold text-[var(--color-brand-secondary)] transition hover:border-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary)]"
                >
                  编辑产品介绍
                </button>
                <button
                  type="button"
                  onClick={onEditSpecs}
                  className="rounded-full border border-[var(--color-border)] bg-white/90 px-3 py-1 text-xs font-semibold text-[var(--color-brand-secondary)] transition hover:border-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary)]"
                >
                  编辑产品参数
                </button>
                <button
                  type="button"
                  onClick={onEditAccessories}
                  className="rounded-full border border-[var(--color-border)] bg-white/90 px-3 py-1 text-xs font-semibold text-[var(--color-brand-secondary)] transition hover:border-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary)]"
                >
                  编辑可选配件
                </button>
              </div>
            </div>

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
      hero: { heading: LocalizedValue; badge: LocalizedValue; scenarios: LocalizedValue; description: LocalizedValue; viewGalleryLabel: LocalizedValue };
    },
  ) => void;
  onCancel: () => void;
  initialLocalized?: {
    title?: LocalizedValue;
    hero?: {
      heading?: LocalizedValue;
      badge?: LocalizedValue;
      scenarios?: LocalizedValue;
      description?: LocalizedValue;
      viewGalleryLabel?: LocalizedValue;
    };
  };
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

  const [titleRecord, setTitleRecord] = useState<LocalizedValue>(() => createInitialLocalized(value.hero.heading ?? value.title, initialLocalized?.hero?.heading ?? initialLocalized?.title));
  const [badgeRecord, setBadgeRecord] = useState<LocalizedValue>(() => createInitialLocalized(value.hero.badge ?? "", initialLocalized?.hero?.badge));
  const [scenariosRecord, setScenariosRecord] = useState<LocalizedValue>(() => createInitialLocalized(value.hero.scenarios ?? "", initialLocalized?.hero?.scenarios));
  const [descriptionRecord, setDescriptionRecord] = useState<LocalizedValue>(() => createInitialLocalized(value.hero.description ?? "", initialLocalized?.hero?.description));
  const [viewGalleryLabelRecord, setViewGalleryLabelRecord] = useState<LocalizedValue>(() => createInitialLocalized(value.hero.viewGalleryLabel ?? "查看大图", initialLocalized?.hero?.viewGalleryLabel));
  const [overlayEnabled, setOverlayEnabled] = useState<boolean>(() => value.hero.overlayEnabled !== false);

  useEffect(() => {
    setDraft(cloneDetail(value));
    setTitleRecord(createInitialLocalized(value.hero.heading ?? value.title, initialLocalized?.hero?.heading ?? initialLocalized?.title));
    setBadgeRecord(createInitialLocalized(value.hero.badge ?? "", initialLocalized?.hero?.badge));
    setScenariosRecord(createInitialLocalized(value.hero.scenarios ?? "", initialLocalized?.hero?.scenarios));
    setDescriptionRecord(createInitialLocalized(value.hero.description ?? "", initialLocalized?.hero?.description));
    setViewGalleryLabelRecord(createInitialLocalized(value.hero.viewGalleryLabel ?? "查看大图", initialLocalized?.hero?.viewGalleryLabel));
    setOverlayEnabled(value.hero.overlayEnabled !== false);
  }, [value, initialLocalized]);

  return (
    <EditorDialog
      title="编辑英雄区"
      subtitle="调整标题、概述及顶部背景"
      onSave={() => {
        const next = cloneDetail(draft);
        const headingValue = (titleRecord[DEFAULT_LOCALE] ?? "").trim();
        if (headingValue) {
          next.title = headingValue;
        }
        next.hero = {
          ...next.hero,
          heading: headingValue,
          badge: (badgeRecord[DEFAULT_LOCALE] ?? "").trim(),
          scenarios: (scenariosRecord[DEFAULT_LOCALE] ?? "").trim(),
          description: (descriptionRecord[DEFAULT_LOCALE] ?? "").trim(),
          viewGalleryLabel: (viewGalleryLabelRecord[DEFAULT_LOCALE] ?? "").trim(),
          overlayEnabled,
        };
        onSave(next, {
          title: cleanLocalized(titleRecord),
          hero: {
            heading: cleanLocalized(titleRecord),
            badge: cleanLocalized(badgeRecord),
            scenarios: cleanLocalized(scenariosRecord),
            description: cleanLocalized(descriptionRecord),
            viewGalleryLabel: cleanLocalized(viewGalleryLabelRecord),
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
          <LocalizedTextField
            label="查看大图按钮文案"
            translationContext={`${heroContextBase}查看大图`}
            value={viewGalleryLabelRecord}
            onChange={setViewGalleryLabelRecord}
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
        <label className="flex items-center gap-2 text-xs font-semibold text-[var(--color-brand-secondary)]">
          <input
            type="checkbox"
            checked={overlayEnabled}
            onChange={(event) => setOverlayEnabled(event.target.checked)}
            className="h-4 w-4 rounded border-[var(--color-border)] text-[var(--color-brand-primary)] focus:ring-[var(--color-brand-primary)]"
          />
          启用背景蒙版
        </label>
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

interface TabsEditorDialogProps {
  value: ProductDetailTabConfig[];
  onSave: (next: ProductDetailTabConfig[], localized?: Array<{ label?: LocalizedValue }>) => void;
  onCancel: () => void;
  initialLocalized?: Array<{ label?: LocalizedValue }>;
}

function TabsEditorDialog({ value, onSave, onCancel, initialLocalized }: TabsEditorDialogProps) {
  type TabDraft = ProductDetailTabConfig;
  const ensureDraft = (tab: ProductDetailTabConfig, index: number): TabDraft => ({
    id: tab.id?.trim() || `tab-${index + 1}`,
    label: tab.label?.trim() || TAB_LABEL_FALLBACK[tab.target],
    target: tab.target,
    visible: tab.visible !== false,
  });
  const fallbackTabs: ProductDetailTabConfig[] = [
    { id: "tab-intro", label: TAB_LABEL_FALLBACK.intro, target: "intro", visible: true },
    { id: "tab-specs", label: TAB_LABEL_FALLBACK.specs, target: "specs", visible: true },
    { id: "tab-accessories", label: TAB_LABEL_FALLBACK.accessories, target: "accessories", visible: true },
  ];
  const initialTabs = (value.length ? value : fallbackTabs).map(ensureDraft);
  const [tabs, setTabs] = useState<TabDraft[]>(initialTabs);
  const [labels, setLabels] = useState<LocalizedValue[]>(() =>
    initialTabs.map((tab, index) => createLocalizedRecord(tab.label ?? TAB_LABEL_FALLBACK[tab.target], initialLocalized?.[index]?.label)),
  );

  const updateTab = (index: number, updater: (prev: TabDraft) => TabDraft) => {
    setTabs((prev) => prev.map((tab, idx) => (idx === index ? updater(tab) : tab)));
  };

  const handleMove = (index: number, delta: number) => {
    setTabs((prev) => {
      const next = [...prev];
      const target = index + delta;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setLabels((prev) => {
      const next = [...prev];
      const target = index + delta;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const handleRemove = (index: number) => {
    if (tabs.length <= 1) return;
    setTabs((prev) => prev.filter((_, idx) => idx !== index));
    setLabels((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleAdd = () => {
    setTabs((prev) => [...prev, { id: `tab-${Date.now()}`, label: TAB_LABEL_FALLBACK.intro, target: "intro", visible: true }]);
    setLabels((prev) => [...prev, createLocalizedRecord(TAB_LABEL_FALLBACK.intro)]);
  };

  const handleSave = () => {
    const nextTabs = tabs.map((tab, index) => {
      const record = labels[index];
      const defaultLabel = TAB_LABEL_FALLBACK[tab.target];
      const labelText = (record?.[DEFAULT_LOCALE] ?? tab.label ?? defaultLabel).trim() || defaultLabel;
      return {
        id: tab.id.trim() || `tab-${index + 1}`,
        label: labelText,
        target: tab.target,
        visible: tab.visible !== false,
      } satisfies ProductDetailTabConfig;
    });
    const localized = labels.map((record) => ({ label: cleanLocalized(record) }));
    onSave(nextTabs, localized);
  };

  return (
    <EditorDialog
      title="编辑 Tab 导航"
      subtitle="自定义 Tab 顺序、命名与关联内容"
      onSave={handleSave}
      onCancel={onCancel}
    >
      <div className="space-y-4 text-sm">
        {tabs.map((tab, index) => (
          <div key={tab.id} className="rounded-2xl border border-[var(--color-border)] bg-white/80 p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-text-tertiary,#8690a3)]">
                Tab {index + 1}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleMove(index, -1)}
                  className="rounded-full border border-[var(--color-border)] px-3 py-1 text-xs"
                  disabled={index === 0}
                >
                  上移
                </button>
                <button
                  type="button"
                  onClick={() => handleMove(index, 1)}
                  className="rounded-full border border-[var(--color-border)] px-3 py-1 text-xs"
                  disabled={index === tabs.length - 1}
                >
                  下移
                </button>
                {tabs.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => handleRemove(index)}
                    className="rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-500"
                  >
                    删除
                  </button>
                ) : null}
              </div>
            </div>
            <div className="mt-4 space-y-3">
              <LocalizedTextField
                label="按钮文案"
                value={labels[index]}
                onChange={(next) => {
                  const nextRecords = [...labels];
                  nextRecords[index] = cleanLocalized(next);
                  setLabels(nextRecords);
                  updateTab(index, (prev) => ({ ...prev, label: (next[DEFAULT_LOCALE] ?? prev.label).trim() }));
                }}
              />
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-xs text-[var(--color-text-tertiary,#8690a3)]">关联内容类型</label>
                  <select
                    value={tab.target}
                    onChange={(event) => {
                      const target = event.target.value as ProductDetailTabTarget;
                      updateTab(index, (prev) => ({ ...prev, target }));
                      setLabels((prev) => {
                        const nextRecords = [...prev];
                        const record = nextRecords[index];
                        const fallbackLabel = TAB_LABEL_FALLBACK[target];
                        nextRecords[index] = createLocalizedRecord(record?.[DEFAULT_LOCALE] ?? fallbackLabel, record);
                        return nextRecords;
                      });
                    }}
                    className="mt-1 w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
                  >
                    <option value="intro">产品介绍</option>
                    <option value="specs">产品参数</option>
                    <option value="accessories">可选配件</option>
                  </select>
                </div>
                <label className="flex items-center gap-2 text-xs font-semibold text-[var(--color-brand-secondary)]">
                  <input
                    type="checkbox"
                    checked={tab.visible !== false}
                    onChange={(event) => updateTab(index, (prev) => ({ ...prev, visible: event.target.checked }))}
                    className="h-4 w-4 rounded border-[var(--color-border)] text-[var(--color-brand-primary)] focus:ring-[var(--color-brand-primary)]"
                  />
                  在页面中显示
                </label>
              </div>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={handleAdd}
          className="w-full rounded-2xl border border-dashed border-[var(--color-brand-primary)] bg-white/60 px-4 py-3 text-sm font-semibold text-[var(--color-brand-primary)]"
        >
          新增 Tab
        </button>
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
    (value.length ? value : [{ src: "", alt: "" }]).map((item, idx) => ({
      src: item.src.trim(),
      altRecord: createInitialLocalized(item.alt, initialLocalized?.[idx]?.alt),
    })),
  );

  useEffect(() => {
    setItems((value.length ? value : [{ src: "", alt: "" }]).map((item, idx) => ({
      src: item.src.trim(),
      altRecord: createInitialLocalized(item.alt, initialLocalized?.[idx]?.alt),
    })));
  }, [value, initialLocalized]);

  const handleSrcChange = (index: number, next: string) => {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, src: next } : it)));
  };

  const handleAltChange = (index: number, next: LocalizedValue) => {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, altRecord: next } : it)));
  };

  const handleAdd = () => {
    setItems((prev) => [...prev, { src: "", altRecord: createInitialLocalized("") }]);
  };

  const handleRemove = (index: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSave = () => {
    const trimmed = items;
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
          className="rounded-full border border-dashed border-[var(--color-brand-primary)] px-3 py-1 text-xs font-semibold text-[var(--color-brand-primary)] transition hover:bg-[var(--color-brand-primary)]/10"
        >
          新增图片
        </button>
      </div>
    </EditorDialog>
  );
}

interface IntroEditorDialogProps {
  value: ProductIntroConfig;
  onSave: (next: ProductIntroConfig, localized?: { blocks?: Array<{ title?: LocalizedValue; subtitle?: LocalizedValue }> }) => void;
  onCancel: () => void;
  initialLocalized?: { blocks?: Array<{ title?: LocalizedValue; subtitle?: LocalizedValue }> };
}

function IntroBlocksEditorDialog({ value, onSave, onCancel, initialLocalized }: IntroEditorDialogProps) {
  type BlockDraft = {
    id: string;
    image: string;
    title: LocalizedValue;
    subtitle: LocalizedValue;
  };
  const sourceBlocks = value.blocks.length
    ? value.blocks
    : [{ id: "intro-1", title: "", subtitle: "", image: "" }];
  const [blocks, setBlocks] = useState<BlockDraft[]>(() =>
    sourceBlocks.map((block, index) => ({
      id: block.id?.trim() || `intro-${index + 1}`,
      image: block.image ?? "",
      title: createLocalizedRecord(block.title ?? "", initialLocalized?.blocks?.[index]?.title),
      subtitle: createLocalizedRecord(block.subtitle ?? "", initialLocalized?.blocks?.[index]?.subtitle),
    })),
  );

  const handleAdd = () => {
    setBlocks((prev) => [
      ...prev,
      {
        id: `intro-${Date.now()}`,
        image: "",
        title: createLocalizedRecord(""),
        subtitle: createLocalizedRecord(""),
      },
    ]);
  };

  const handleRemove = (index: number) => {
    setBlocks((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleMove = (index: number, delta: number) => {
    setBlocks((prev) => {
      const next = [...prev];
      const target = index + delta;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const handleSave = () => {
    const nextBlocks = blocks.map((block, index) => ({
      id: block.id.trim() || `intro-${index + 1}`,
      title: (block.title?.[DEFAULT_LOCALE] ?? "").trim(),
      subtitle: (block.subtitle?.[DEFAULT_LOCALE] ?? "").trim(),
      image: block.image.trim(),
    }));
    const localized = {
      blocks: blocks.map((block) => ({
        title: cleanLocalized(block.title),
        subtitle: cleanLocalized(block.subtitle),
      })),
    };
    onSave({ blocks: nextBlocks }, localized);
  };

  return (
    <EditorDialog
      title="编辑产品介绍"
      subtitle="配置文案块的大标题、小标题与图片"
      onSave={handleSave}
      onCancel={onCancel}
    >
      <div className="space-y-2 text-sm">
        {blocks.map((block, index) => (
          <article key={block.id} className="rounded-2xl bg-white/80 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.3em] text-[var(--color-text-tertiary,#8690a3)]">
              <span className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-text-tertiary,#8690a3)]">
                文案块 {index + 1}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleMove(index, -1)}
                  className="rounded-full border border-[var(--color-border)] px-3 py-1 text-xs"
                  disabled={index === 0}
                >
                  上移
                </button>
                <button
                  type="button"
                  onClick={() => handleMove(index, 1)}
                  className="rounded-full border border-[var(--color-border)] px-3 py-1 text-xs"
                  disabled={index === blocks.length - 1}
                >
                  下移
                </button>
                {blocks.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => handleRemove(index)}
                    className="rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-500"
                  >
                    删除
                  </button>
                ) : null}
              </div>
            </div>
            <div className="mt-4 space-y-3">
              <LocalizedTextField
                label="大标题"
                value={block.title}
                onChange={(next) =>
                  setBlocks((prev) => prev.map((item, idx) => (idx === index ? { ...item, title: cleanLocalized(next) } : item)))}
              />
              <LocalizedTextField
                label="小标题"
                value={block.subtitle}
                onChange={(next) =>
                  setBlocks((prev) => prev.map((item, idx) => (idx === index ? { ...item, subtitle: cleanLocalized(next) } : item)))}
                multiline
                rows={3}
              />
              <ImageInput
                label="配图（可选）"
                value={block.image}
                onChange={(next) =>
                  setBlocks((prev) => prev.map((item, idx) => (idx === index ? { ...item, image: next } : item)))}
                placeholder="https:// 或 /uploads/..."
              />
            </div>
          </article>
        ))}
        <button
          type="button"
          onClick={handleAdd}
          className="w-full rounded-2xl border border-dashed border-[var(--color-brand-primary)] bg-white/60 px-4 py-3 text-sm font-semibold text-[var(--color-brand-primary)]"
        >
          新增文案块
        </button>
      </div>
    </EditorDialog>
  );
}

interface SpecsEditorDialogProps {
  value: ProductSpecsConfig;
  onSave: (next: ProductSpecsConfig, localized?: { columns?: Array<LocalizedValue | undefined>; rows?: Array<Array<LocalizedValue | undefined> | undefined>; caption?: LocalizedValue }) => void;
  onCancel: () => void;
  initialLocalized?: { columns?: Array<LocalizedValue | undefined>; rows?: Array<Array<LocalizedValue | undefined> | undefined>; caption?: LocalizedValue };
  slug: string;
}

function SpecsEditorDialog({ value, onSave, onCancel, initialLocalized, slug }: SpecsEditorDialogProps) {
  const specsContextBase = `产品详情(${slug || "未命名产品"})参数`;
  const [columns, setColumns] = useState<string[]>(() => (value.columns.length ? [...value.columns] : ["参数项", "参数值"]));
  const [rows, setRows] = useState<string[][]>(() => (value.rows.length ? value.rows.map((row) => [...row]) : [["", ""]]));
  
  const [columnLocalized, setColumnLocalized] = useState<Array<LocalizedValue | undefined>>(() =>
    columns.map((col, index) => createLocalizedRecord(col, initialLocalized?.columns?.[index])),
  );
  
  const [rowsLocalized, setRowsLocalized] = useState<Array<Array<LocalizedValue | undefined>>>(() =>
    rows.map((row, rowIndex) => 
      row.map((cell, cellIndex) => createLocalizedRecord(cell, initialLocalized?.rows?.[rowIndex]?.[cellIndex]))
    )
  );

  const [captionRecord, setCaptionRecord] = useState<LocalizedValue>(() => createLocalizedRecord(value.caption ?? "", initialLocalized?.caption));

  useEffect(() => {
    setRows((prev) => prev.map((row) => {
      const next = [...row];
      if (next.length < columns.length) {
        return [...next, ...Array(columns.length - next.length).fill("")];
      }
      if (next.length > columns.length) {
        return next.slice(0, columns.length);
      }
      return next;
    }));
    
    setRowsLocalized((prev) => prev.map((row) => {
      const next = [...row];
      if (next.length < columns.length) {
        return [...next, ...Array(columns.length - next.length).fill(undefined)];
      }
      if (next.length > columns.length) {
        return next.slice(0, columns.length);
      }
      return next;
    }));
  }, [columns.length]);

  const handleAddColumn = () => {
    setColumns((prev) => [...prev, `列 ${prev.length + 1}`]);
    setRows((prev) => prev.map((row) => [...row, ""]));
    setColumnLocalized((prev) => [...prev, createLocalizedRecord("")]);
    setRowsLocalized((prev) => prev.map((row) => [...row, undefined]));
  };

  const handleRemoveColumn = (index: number) => {
    if (columns.length <= 1) return;
    setColumns((prev) => prev.filter((_, idx) => idx !== index));
    setRows((prev) => prev.map((row) => row.filter((_, idx) => idx !== index)));
    setColumnLocalized((prev) => prev.filter((_, idx) => idx !== index));
    setRowsLocalized((prev) => prev.map((row) => row.filter((_, idx) => idx !== index)));
  };

  const handleAddRow = () => {
    setRows((prev) => [...prev, Array(columns.length).fill("")]);
    setRowsLocalized((prev) => [...prev, Array(columns.length).fill(undefined)]);
  };

  const handleRemoveRow = (index: number) => {
    if (rows.length <= 1) return;
    setRows((prev) => prev.filter((_, idx) => idx !== index));
    setRowsLocalized((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSave = () => {
    const sanitizedColumns = columns.map((col) => col.trim());
    const sanitizedRows = rows.map((row) => row.map((cell) => cell.trim()));
    const nextSpecs: ProductSpecsConfig = {
      columns: sanitizedColumns,
      rows: sanitizedRows,
      caption: (captionRecord[DEFAULT_LOCALE] ?? "").trim(),
    };
    const localized = {
      columns: columnLocalized.map((record) => (record ? cleanLocalized(record) : undefined)),
      rows: rowsLocalized.map((row) => row.map((cell) => (cell ? cleanLocalized(cell) : undefined))),
      caption: cleanLocalized(captionRecord),
    };
    onSave(nextSpecs, localized);
  };

  return (
    <EditorDialog title="编辑产品参数" subtitle="配置表头、行列与可选的表格说明" onSave={handleSave} onCancel={onCancel}>
      <div className="space-y-4 text-sm">
        <div className="space-y-3 rounded-2xl border border-[var(--color-border)] bg-white/90 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-text-tertiary,#8690a3)]">表头</span>
            <button
              type="button"
              onClick={handleAddColumn}
              className="rounded-full border border-[var(--color-border)] px-3 py-1 text-xs font-semibold text-[var(--color-brand-primary)]"
            >
              新增列
            </button>
          </div>
          <div className="space-y-3">
            {columns.map((column, index) => (
              <div key={`column-${index}`} className="rounded-xl border border-[var(--color-border)] bg-white/80 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[var(--color-brand-secondary)]">列 {index + 1}</span>
                  {columns.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => handleRemoveColumn(index)}
                      className="rounded-full border border-rose-200 px-3 py-1 text-[11px] font-semibold text-rose-500"
                    >
                      删除
                    </button>
                  ) : null}
                </div>
                <LocalizedTextField
                  label="列标题"
                  translationContext={`${specsContextBase}列${index + 1}`}
                  value={columnLocalized[index] ?? createLocalizedRecord(column)}
                  onChange={(next) => {
                    setColumnLocalized((prev) => {
                      const copy = [...prev];
                      copy[index] = cleanLocalized(next);
                      return copy;
                    });
                    setColumns((prev) => prev.map((col, idx) => (idx === index ? (next[DEFAULT_LOCALE] ?? col) : col)));
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--color-border)] bg-white/90 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-text-tertiary,#8690a3)]">参数行</span>
            <button
              type="button"
              onClick={handleAddRow}
              className="rounded-full border border-[var(--color-border)] px-3 py-1 text-xs font-semibold text-[var(--color-brand-secondary)]"
            >
              新增行
            </button>
          </div>
          <div className="mt-4 space-y-3">
            {rows.map((row, rowIndex) => (
              <div key={`row-${rowIndex}`} className="rounded-xl border border-[var(--color-border)] bg-white/70 p-3">
                <div className="flex items-center justify-between text-xs text-[var(--color-text-tertiary,#8690a3)]">
                  <span>行 {rowIndex + 1}</span>
                  {rows.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => handleRemoveRow(rowIndex)}
                      className="rounded-full border border-rose-200 px-3 py-1 text-[11px] font-semibold text-rose-500"
                    >
                      删除
                    </button>
                  ) : null}
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {row.map((cell, cellIndex) => (
                    <LocalizedTextField
                      key={`cell-${rowIndex}-${cellIndex}`}
                      label={`列 ${cellIndex + 1}`}
                      translationContext={`${specsContextBase}行${rowIndex + 1}列${cellIndex + 1}`}
                      value={rowsLocalized[rowIndex]?.[cellIndex] ?? createLocalizedRecord(cell)}
                      onChange={(next) => {
                        setRowsLocalized((prev) => {
                          const copy = [...prev];
                          if (!copy[rowIndex]) copy[rowIndex] = [];
                          copy[rowIndex] = [...(copy[rowIndex] || [])];
                          copy[rowIndex][cellIndex] = cleanLocalized(next);
                          return copy;
                        });
                        setRows((prev) =>
                          prev.map((r, idx) =>
                            idx === rowIndex ? r.map((c, cIdx) => (cIdx === cellIndex ? (next[DEFAULT_LOCALE] ?? c) : c)) : r,
                          ),
                        );
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <LocalizedTextField
          label="表格说明（可选）"
          translationContext={`${specsContextBase}说明`}
          value={captionRecord}
          onChange={(next) => setCaptionRecord(cleanLocalized(next))}
          multiline
          rows={2}
        />
      </div>
    </EditorDialog>
  );
}

interface AccessoriesEditorDialogProps {
  value: ProductAccessoriesConfig;
  onSave: (next: ProductAccessoriesConfig, localized?: { items?: Array<{ title?: LocalizedValue; description?: LocalizedValue }> }) => void;
  onCancel: () => void;
  initialLocalized?: { items?: Array<{ title?: LocalizedValue; description?: LocalizedValue }> };
}

function AccessoriesEditorDialog({ value, onSave, onCancel, initialLocalized }: AccessoriesEditorDialogProps) {
  type AccessoryDraft = {
    id: string;
    image: string;
    title: LocalizedValue;
    description: LocalizedValue;
  };
  const sourceItems = value.items.length
    ? value.items
    : [{ id: "accessory-1", title: "", description: "", image: "" }];
  const [items, setItems] = useState<AccessoryDraft[]>(() =>
    sourceItems.map((item, index) => ({
      id: item.id?.trim() || `accessory-${index + 1}`,
      image: item.image ?? "",
      title: createLocalizedRecord(item.title ?? "", initialLocalized?.items?.[index]?.title),
      description: createLocalizedRecord(item.description ?? "", initialLocalized?.items?.[index]?.description),
    })),
  );

  const handleAdd = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `accessory-${Date.now()}`,
        image: "",
        title: createLocalizedRecord(""),
        description: createLocalizedRecord(""),
      },
    ]);
  };

  const handleRemove = (index: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSave = () => {
    const nextItems = items.map((item, index) => ({
      id: item.id.trim() || `accessory-${index + 1}`,
      image: item.image.trim(),
      title: (item.title?.[DEFAULT_LOCALE] ?? "").trim(),
      description: (item.description?.[DEFAULT_LOCALE] ?? "").trim(),
    }));
    const localized = {
      items: items.map((item) => ({
        title: cleanLocalized(item.title),
        description: cleanLocalized(item.description),
      })),
    };
    onSave({ items: nextItems }, localized);
  };

  return (
    <EditorDialog
      title="编辑可选配件"
      subtitle="设置配件卡片的标题、描述与图片"
      onSave={handleSave}
      onCancel={onCancel}
    >
      <div className="space-y-4 text-sm">
        {items.map((item, index) => (
          <div key={item.id} className="rounded-2xl border border-[var(--color-border)] bg-white/90 p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-text-tertiary,#8690a3)]">
                配件 {index + 1}
              </span>
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="rounded-full border border-rose-200 px-3 py-1 text-[11px] font-semibold text-rose-500"
              >
                删除
              </button>
            </div>
            <div className="mt-3 space-y-3">
              <LocalizedTextField
                label="配件标题"
                value={item.title}
                onChange={(next) =>
                  setItems((prev) => prev.map((entry, idx) => (idx === index ? { ...entry, title: cleanLocalized(next) } : entry)))}
              />
              <LocalizedTextField
                label="配件描述"
                value={item.description}
                onChange={(next) =>
                  setItems((prev) => prev.map((entry, idx) => (idx === index ? { ...entry, description: cleanLocalized(next) } : entry)))}
                multiline
                rows={2}
              />
              <ImageInput
                label="配件图片"
                value={item.image}
                onChange={(next) =>
                  setItems((prev) => prev.map((entry, idx) => (idx === index ? { ...entry, image: next } : entry)))}
                placeholder="https:// 或 /uploads/..."
              />
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={handleAdd}
          className="w-full rounded-2xl border border-dashed border-[var(--color-brand-primary)] bg-white/60 px-4 py-3 text-sm font-semibold text-[var(--color-brand-primary)]"
        >
          新增配件
        </button>
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
    | { type: "tabs" }
    | { type: "intro" }
    | { type: "specs" }
    | { type: "accessories" }
    | null
  >(null);

  const [formState, dispatch] = useFormState<UpdateSiteConfigActionState, FormData>(updateSiteConfigAction, {
    status: "idle",
  });
  const formRef = useRef<HTMLFormElement>(null);
  const toast = useToast();
  const prevStatusRef = useRef(formState.status);

  const [localizedOverrides, setLocalizedOverrides] = useState<LocalizedOverridesMap>({});
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
                  heading: localized.hero.heading,
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
    } else if (editing?.type === "tabs") {
      dialog = (
        <TabsEditorDialog
          value={detail.tabs}
          initialLocalized={localizedOverrides[selectedSlug]?.tabs}
          onSave={(next, localized) => {
            const current = cloneDetail(details[selectedSlug]);
            current.tabs = next;
            const nextDetails = { ...details, [selectedSlug]: current };
            let nextOverrides = localizedOverrides;
            if (localized) {
              nextOverrides = {
                ...localizedOverrides,
                [selectedSlug]: {
                  ...(localizedOverrides[selectedSlug] ?? {}),
                  tabs: localized,
                },
              };
            }
            setDetails(nextDetails);
            setLocalizedOverrides(nextOverrides);
            const fd = new FormData();
            fd.set("key", configKey);
            fd.set("payload", JSON.stringify(mergeSerializedWithOverrides(serializeProductDetailMap(nextDetails), nextOverrides)));
            dispatch(fd);
            setEditing(null);
          }}
          onCancel={() => setEditing(null)}
        />
      );
    } else if (editing?.type === "intro") {
      dialog = (
        <IntroBlocksEditorDialog
          value={detail.intro}
          initialLocalized={localizedOverrides[selectedSlug]?.intro}
          onSave={(next, localized) => {
            const current = cloneDetail(details[selectedSlug]);
            current.intro = next;
            const nextDetails = { ...details, [selectedSlug]: current };
            let nextOverrides = localizedOverrides;
            if (localized) {
              nextOverrides = {
                ...localizedOverrides,
                [selectedSlug]: {
                  ...(localizedOverrides[selectedSlug] ?? {}),
                  intro: localized,
                },
              };
            }
            setDetails(nextDetails);
            setLocalizedOverrides(nextOverrides);
            const fd = new FormData();
            fd.set("key", configKey);
            fd.set("payload", JSON.stringify(mergeSerializedWithOverrides(serializeProductDetailMap(nextDetails), nextOverrides)));
            dispatch(fd);
            setEditing(null);
          }}
          onCancel={() => setEditing(null)}
        />
      );
    } else if (editing?.type === "specs") {
      dialog = (
        <SpecsEditorDialog
          value={detail.specs}
          initialLocalized={localizedOverrides[selectedSlug]?.specs}
          slug={selectedSlug}
          onSave={(next, localized) => {
            const current = cloneDetail(details[selectedSlug]);
            current.specs = next;
            const nextDetails = { ...details, [selectedSlug]: current };
            let nextOverrides = localizedOverrides;
            if (localized) {
              nextOverrides = {
                ...localizedOverrides,
                [selectedSlug]: {
                  ...(localizedOverrides[selectedSlug] ?? {}),
                  specs: localized,
                },
              };
            }
            setDetails(nextDetails);
            setLocalizedOverrides(nextOverrides);
            const fd = new FormData();
            fd.set("key", configKey);
            fd.set("payload", JSON.stringify(mergeSerializedWithOverrides(serializeProductDetailMap(nextDetails), nextOverrides)));
            dispatch(fd);
            setEditing(null);
          }}
          onCancel={() => setEditing(null)}
        />
      );
    } else if (editing?.type === "accessories") {
      dialog = (
        <AccessoriesEditorDialog
          value={detail.accessories}
          initialLocalized={localizedOverrides[selectedSlug]?.accessories}
          onSave={(next, localized) => {
            const current = cloneDetail(details[selectedSlug]);
            current.accessories = next;
            const nextDetails = { ...details, [selectedSlug]: current };
            let nextOverrides = localizedOverrides;
            if (localized) {
              nextOverrides = {
                ...localizedOverrides,
                [selectedSlug]: {
                  ...(localizedOverrides[selectedSlug] ?? {}),
                  accessories: localized,
                },
              };
            }
            setDetails(nextDetails);
            setLocalizedOverrides(nextOverrides);
            const fd = new FormData();
            fd.set("key", configKey);
            fd.set("payload", JSON.stringify(mergeSerializedWithOverrides(serializeProductDetailMap(nextDetails), nextOverrides)));
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
          onEditTabs={() => setEditing({ type: "tabs" })}
          onEditIntro={() => setEditing({ type: "intro" })}
          onEditSpecs={() => setEditing({ type: "specs" })}
          onEditAccessories={() => setEditing({ type: "accessories" })}
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
