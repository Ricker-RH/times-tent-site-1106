"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import { useFormState, useFormStatus } from "react-dom";

import { ConfigPreviewFrame } from "./ConfigPreviewFrame";
import { EditorDialog } from "./EditorDialog";
import { LocalizedTextField, type LocalizedValue } from "./LocalizedTextField";
import type { UpdateSiteConfigActionState } from "../actions";
import { updateSiteConfigAction } from "../actions";
import { useToast } from "@/providers/ToastProvider";
import { resolveImageSrc, sanitizeImageSrc } from "@/utils/image";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, ensureLocalizedRecord, getLocaleText, setLocaleText, ensureLocalizedNoFallback, serializeLocalizedAllowEmpty } from "./editorUtils";
import { useGlobalTranslationRegistrationForConfig } from "@/hooks/useGlobalTranslationManager";
import type { LocaleKey } from "@/i18n/locales";
import type { CaseCategory } from "@/server/pageConfigs";


interface CaseStudyMetric {
  label: string;
  value: string;
}

interface CaseStudyMetricI18n {
  label: LocalizedValue;
  value: LocalizedValue;
}

interface CaseStudySpecI18n {
  label: LocalizedValue;
  value: LocalizedValue;
}

interface CaseStudyConfig {
  slug: string;
  title: LocalizedValue;
  year: string;
  location: LocalizedValue;
  summary: LocalizedValue;
  background: LocalizedValue;
  backgroundImage?: string;
  deliverables: string[];
  metrics: CaseStudyMetric[];
  image: string;
  gallery: string[];
  highlightsImage?: string;
  deliverablesImage?: string;
  highlightsI18n?: LocalizedValue[];
  deliverablesI18n?: LocalizedValue[];
  metricsI18n?: CaseStudyMetricI18n[];
  technicalDescription?: LocalizedValue;
  technicalSpecs?: CaseStudySpecI18n[];
}

interface CaseCategoryConfig {
  slug: string;
  name: LocalizedValue;
  intro: LocalizedValue;
  studies: CaseStudyConfig[];
}

interface HeroConfig {
  eyebrow: LocalizedValue;
  title: LocalizedValue;
  description: LocalizedValue;
  image: string;
}

interface SectionHeadingConfig {
  eyebrow: string;
  title: string;
  description: string;
}

interface RecommendationsConfig {
  eyebrow: string;
  title: string;
  description: string;
  linkLabel: string;
}

// 新增：案例详情页底部咨询配置
interface ConsultationConfig {
  title: LocalizedValue;
  description: LocalizedValue;
  primaryLabel: LocalizedValue;
  primaryHref: string;
  phoneLabel: LocalizedValue;
  phoneNumber: string;
}

interface GalleryLightboxConfig {
  openHint: LocalizedValue;
  nextLabel: LocalizedValue;
  prevLabel: LocalizedValue;
  closeLabel: LocalizedValue;
  counterPattern: LocalizedValue;
}

interface BreadcrumbItem {
  href: string;
  label: string;
}

interface CasesConfig {
  hero: HeroConfig;
  breadcrumb: BreadcrumbItem[];
  sectionHeading: SectionHeadingConfig;
  categories: CaseCategoryConfig[];
  recommendations: RecommendationsConfig;
  // 新增：底部咨询 CTA
  consultation?: ConsultationConfig;
  galleryLightbox?: GalleryLightboxConfig;
  sidebarTitle: string;
  categoryCaseCountSuffix: string;
  _meta?: Record<string, unknown>;
  breadcrumbI18n?: Array<{ href?: string; label?: string | LocalizedValue }>;
}

type PreviewPage =
  | { view: "category"; categoryIndex: number }
  | { view: "study"; categoryIndex: number; studyIndex: number };

type StudyScope =
  | "basic"
  | "background"
  | "gallery"
  | "highlights_i18n"
  | "deliverables_i18n"
  | "metrics_i18n";

const DEFAULT_HERO_IMAGE = "https://images.unsplash.com/photo-1542626991-cbc4e32524cc?auto=format&w=2000&q=80";
const DEFAULT_STUDY_IMAGE = "https://images.unsplash.com/photo-1508609349937-5ec4ae374ebf?auto=format&w=1600&q=80";

function ensureLocalized(value: unknown, fallback: string): LocalizedValue {
  return ensureLocalizedNoFallback(value) as LocalizedValue;
}

function cleanLocalized(v: unknown): LocalizedValue {
  return serializeLocalizedAllowEmpty(ensureLocalizedRecord(v) as Record<string, string>) as LocalizedValue;
}

function toStringValue(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return fallback;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => toStringValue(item).trim())
    .filter((item) => item.length);
}

function asMetricArray(value: unknown): CaseStudyMetric[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return null;
      const record = item as Record<string, unknown>;
      const label = toStringValue(record.label).trim();
      const metricValue = toStringValue(record.value).trim();
      if (!label && !metricValue) return null;
      return { label, value: metricValue } as CaseStudyMetric;
    })
    .filter(Boolean) as CaseStudyMetric[];
}

function normalizeStudy(raw: unknown, index: number): CaseStudyConfig {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {
      slug: `case-${index + 1}`,
      title: ensureLocalized(undefined, "未命名案例"),
      year: "",
      location: ensureLocalized(undefined, ""),
      summary: ensureLocalized(undefined, "在此补充案例摘要，概述关键成效。"),
      background: ensureLocalized(undefined, "在此补充项目背景，描述客户与挑战。"),
      backgroundImage: "",
      deliverables: [],
      metrics: [],
      image: DEFAULT_STUDY_IMAGE,
      gallery: [
        "https://images.unsplash.com/photo-1542626991-cbc4e32524cc?auto=format&w=1600&q=80",
        "https://images.unsplash.com/photo-1516035069371-29a6bab2f01e?auto=format&w=1600&q=80",
        "https://images.unsplash.com/photo-1508609349937-5ec4ae374ebf?auto=format&w=1600&q=80",
      ],
      highlightsI18n: [
        ensureLocalized("专业团队现场执行", ""),
        ensureLocalized("供电与网络保障", ""),
        ensureLocalized("安全风控与秩序维护", ""),
      ],
      deliverablesI18n: [
        ensureLocalized("方案设计文档", ""),
        ensureLocalized("项目实施计划", ""),
        ensureLocalized("设备采购清单", ""),
        ensureLocalized("现场安装与调试", ""),
        ensureLocalized("验收与培训", ""),
      ],
      metricsI18n: [
        { label: ensureLocalized("覆盖面积", ""), value: ensureLocalized("10,000㎡+", "") },
        { label: ensureLocalized("参与人数", ""), value: ensureLocalized("5,000+", "") },
        { label: ensureLocalized("设备数量", ""), value: ensureLocalized("100+", "") },
      ],
      highlightsImage: "",
      deliverablesImage: "",
      technicalDescription: ensureLocalized(undefined, "在此补充技术参数说明。"),
      technicalSpecs: [
        { label: ensureLocalized("结构跨度", ""), value: ensureLocalized("30m", "") },
        { label: ensureLocalized("檐口高度", ""), value: ensureLocalized("8m", "") },
      ],
    };
  }
  const record = raw as Record<string, unknown>;
  return {
    slug: toStringValue(record.slug, `case-${index + 1}`),
    title: ensureLocalized(record.title, ""),
    year: toStringValue(record.year),
    location: ensureLocalized(record.location, ""),
    summary: ensureLocalized(record.summary, ""),
    background: ensureLocalized(record.background, ""),
    backgroundImage: resolveImageSrc(toStringValue((record as any).backgroundImage), ""),
    deliverables: asStringArray(record.deliverables),
    metrics: asMetricArray(record.metrics),
    image: resolveImageSrc(toStringValue(record.image), ""),
    gallery: asStringArray(record.gallery),
    highlightsImage: resolveImageSrc(toStringValue((record as any).highlightsImage), ""),
    deliverablesImage: resolveImageSrc(toStringValue((record as any).deliverablesImage), ""),
    highlightsI18n: Array.isArray((record as any).highlightsI18n)
      ? ((record as any).highlightsI18n as Array<unknown>)
          .map((item) => ensureLocalized(item, ""))
          .filter((v) => Object.keys(v).length > 0)
      : undefined,
    deliverablesI18n: Array.isArray((record as any).deliverablesI18n)
      ? ((record as any).deliverablesI18n as Array<unknown>)
          .map((item) => ensureLocalized(item, ""))
          .filter((v) => Object.keys(v).length > 0)
      : undefined,
    metricsI18n: Array.isArray((record as any).metricsI18n)
      ? ((record as any).metricsI18n as Array<unknown>)
          .map((item) => {
            if (!item || typeof item !== "object" || Array.isArray(item)) return null;
            const rec = item as Record<string, unknown>;
            const label = ensureLocalized(rec.label, "");
            const value = ensureLocalized(rec.value, "");
            if (Object.values(label).every((entry) => !entry.trim()) && Object.values(value).every((entry) => !entry.trim())) {
              return null;
            }
            return { label, value } satisfies CaseStudyMetricI18n;
          })
          .filter((metric): metric is CaseStudyMetricI18n => Boolean(metric))
      : undefined,
    technicalDescription: ensureLocalized((record as any).technicalDescription, ""),
    technicalSpecs: Array.isArray((record as any).technicalSpecs)
      ? ((record as any).technicalSpecs as Array<unknown>)
          .map((item) => {
            if (!item || typeof item !== "object" || Array.isArray(item)) return null;
            const rec = item as Record<string, unknown>;
            const label = ensureLocalized(rec.label, "");
            const value = ensureLocalized(rec.value, "");
            if (Object.keys(label).length === 0 && Object.keys(value).length === 0) {
              return null;
            }
            return { label, value } satisfies CaseStudySpecI18n;
          })
          .filter((spec): spec is CaseStudySpecI18n => Boolean(spec))
      : undefined,
  } satisfies CaseStudyConfig;
}

function normalizeCategory(raw: unknown, index: number): CaseCategoryConfig {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {
      slug: `category-${index + 1}`,
      name: ensureLocalized(undefined, ""),
      intro: ensureLocalized(undefined, ""),
      studies: [],
    };
  }
  const record = raw as Record<string, unknown>;
  const studiesRaw = Array.isArray(record.studies) ? record.studies : [];
  const studies = studiesRaw.map((study, studyIndex) => normalizeStudy(study, studyIndex));
  const name = ensureLocalized(record.name, "");
  const intro = ensureLocalized(record.intro, "");
  const nameEn = toStringValue((record as any).nameEn);
  const introEn = toStringValue((record as any).introEn);
  if (nameEn) name["en" as LocaleKey] = nameEn;
  if (introEn) intro["en" as LocaleKey] = introEn;
  return {
    slug: toStringValue(record.slug, `category-${index + 1}`),
    name,
    intro,
    studies: studies.length ? studies : [normalizeStudy(undefined, 0)],
  } satisfies CaseCategoryConfig;
}

function normalizeConfig(raw: Record<string, unknown>): CasesConfig {
  const heroRaw = (raw.hero ?? {}) as Record<string, unknown>;
  const sectionHeadingRaw = (raw.sectionHeading ?? {}) as Record<string, unknown>;
  const recommendationsRaw = (raw.recommendations ?? {}) as Record<string, unknown>;
  const consultationRaw = (raw.consultation ?? {}) as Record<string, unknown>;
  const galleryLightboxRaw = (raw.galleryLightbox ?? {}) as Record<string, unknown>;
  const categoriesRaw = Array.isArray(raw.categories) ? raw.categories : [];
  const breadcrumbRaw = Array.isArray(raw.breadcrumb) ? raw.breadcrumb : [];

  // 先进行基础规范化
  const normalizedCategories = categoriesRaw.map((category, index) => normalizeCategory(category, index));

  // 移除 fallback 合并逻辑：仅按现有数据规范化
  let mergedCategories = normalizedCategories;

  return {
    hero: {
      eyebrow: ensureLocalized(heroRaw.eyebrow, ""),
      title: ensureLocalized(heroRaw.title, ""),
      description: ensureLocalized(heroRaw.description, ""),
      image: resolveImageSrc(toStringValue(heroRaw.image), ""),
    },
    breadcrumb: breadcrumbRaw
      .map((item) => {
        if (!item || typeof item !== "object" || Array.isArray(item)) return null;
        const record = item as Record<string, unknown>;
        const label = toStringValue(record.label);
        const href = toStringValue(record.href);
        if (!label && !href) return null;
        return { label: label || href, href };
      })
      .filter(Boolean) as BreadcrumbItem[],
    breadcrumbI18n: Array.isArray((raw as any).breadcrumbI18n)
      ? ((raw as any).breadcrumbI18n as Array<unknown>)
          .map((item) => {
            if (!item || typeof item !== "object" || Array.isArray(item)) return null;
            const rec = item as Record<string, unknown>;
            const href = toStringValue(rec.href);
            const label =
              typeof rec.label === "string" ? rec.label.trim() : ensureLocalized(rec.label, "");
            if ((typeof label === "string" ? !label : Object.keys(label).length === 0) && !href) return null;
            return { href, label };
          })
          .filter(Boolean) as Array<{ href?: string; label?: string | LocalizedValue }>
      : undefined,
    sectionHeading: {
      eyebrow: toStringValue(sectionHeadingRaw.eyebrow),
      title: toStringValue(sectionHeadingRaw.title),
      description: toStringValue(sectionHeadingRaw.description),
    },
    categories: mergedCategories,
    recommendations: {
      eyebrow: toStringValue(recommendationsRaw.eyebrow),
      title: toStringValue(recommendationsRaw.title),
      description: toStringValue(recommendationsRaw.description),
      linkLabel: toStringValue(recommendationsRaw.linkLabel),
    },
    consultation: {
      title: ensureLocalized(consultationRaw.title, ""),
      description: ensureLocalized(consultationRaw.description, ""),
      primaryLabel: ensureLocalized(consultationRaw.primaryLabel, ""),
      primaryHref: toStringValue(consultationRaw.primaryHref),
      phoneLabel: ensureLocalized(consultationRaw.phoneLabel, ""),
      phoneNumber: toStringValue(consultationRaw.phoneNumber),
    },
    galleryLightbox: {
      openHint: ensureLocalized(galleryLightboxRaw.openHint, "点击查看大图"),
      nextLabel: ensureLocalized(galleryLightboxRaw.nextLabel, "下一张"),
      prevLabel: ensureLocalized(galleryLightboxRaw.prevLabel, "上一张"),
      closeLabel: ensureLocalized(galleryLightboxRaw.closeLabel, "关闭"),
      counterPattern: ensureLocalized(galleryLightboxRaw.counterPattern, "图 {{current}} / {{total}}"),
    },
    sidebarTitle: toStringValue(raw.sidebarTitle),
    categoryCaseCountSuffix: toStringValue(raw.categoryCaseCountSuffix),
    _meta:
      typeof raw._meta === "object" && raw._meta !== null
        ? (raw._meta as Record<string, unknown>)
        : undefined,
  } satisfies CasesConfig;
}

function serializeStudy(study: CaseStudyConfig): Record<string, unknown> {
  const result: Record<string, unknown> = {
    slug: study.slug,
    title: cleanLocalized(study.title),
  };
  if (study.year.trim()) result.year = study.year.trim();
  const locationClean = cleanLocalized(study.location);
  if (Object.keys(locationClean).length) result.location = locationClean;
  const summaryClean = cleanLocalized(study.summary);
  if (Object.keys(summaryClean).length) result.summary = summaryClean;
  const backgroundClean = cleanLocalized(study.background);
  if (Object.keys(backgroundClean).length) result.background = backgroundClean;

  if (study.image.trim()) result.image = study.image.trim();
  if (study.backgroundImage?.trim()) result.backgroundImage = study.backgroundImage.trim();
  if (study.highlightsImage?.trim()) result.highlightsImage = study.highlightsImage.trim();
  if (study.deliverablesImage?.trim()) result.deliverablesImage = study.deliverablesImage.trim();
  if (study.gallery.length) result.gallery = study.gallery;

  if (Array.isArray(study.highlightsI18n)) {
    const highlightsI18n = study.highlightsI18n
      .map((item) => cleanLocalized(item))
      .filter((v) => Object.keys(v).length > 0);
    if (highlightsI18n.length) result.highlightsI18n = highlightsI18n;
  }
  if (Array.isArray(study.deliverablesI18n)) {
    const deliverablesI18n = study.deliverablesI18n
      .map((item) => cleanLocalized(item))
      .filter((v) => Object.keys(v).length > 0);
    if (deliverablesI18n.length) result.deliverablesI18n = deliverablesI18n;
  }
  if (Array.isArray(study.metricsI18n)) {
    const metricsI18n = study.metricsI18n
      .map((item) => {
        const label = cleanLocalized(item.label);
        const value = cleanLocalized(item.value);
        if (Object.keys(label).length === 0 && Object.keys(value).length === 0) return null;
        return { label, value } as CaseStudyMetricI18n;
      })
      .filter((metric): metric is CaseStudyMetricI18n => Boolean(metric));
    if (metricsI18n.length) result.metricsI18n = metricsI18n;
  }
  const technicalDescription = study.technicalDescription ? cleanLocalized(study.technicalDescription) : undefined;
  if (technicalDescription && Object.keys(technicalDescription).length) {
    result.technicalDescription = technicalDescription;
  }
  if (Array.isArray(study.technicalSpecs)) {
    const technicalSpecs = study.technicalSpecs
      .map((item) => {
        const label = cleanLocalized(item.label);
        const value = cleanLocalized(item.value);
        if (Object.keys(label).length === 0 && Object.keys(value).length === 0) return null;
        return { label, value } as CaseStudySpecI18n;
      })
      .filter((spec): spec is CaseStudySpecI18n => Boolean(spec));
    if (technicalSpecs.length) result.technicalSpecs = technicalSpecs;
  }

  return result;
}

function serializeCategory(category: CaseCategoryConfig): Record<string, unknown> {
  const result: Record<string, unknown> = {
    slug: category.slug,
    name: cleanLocalized(category.name),
    intro: cleanLocalized(category.intro),
    studies: category.studies.map(serializeStudy),
  };
  return result;
}

function serializeConfig(config: CasesConfig): Record<string, unknown> {
  const hero: Record<string, unknown> = {};
  if (config.hero.image.trim()) hero.image = config.hero.image.trim();
  const heroEyebrow = cleanLocalized(config.hero.eyebrow);
  if (Object.keys(heroEyebrow).length) hero.eyebrow = heroEyebrow;
  const heroTitle = cleanLocalized(config.hero.title);
  if (Object.keys(heroTitle).length) hero.title = heroTitle;
  const heroDescription = cleanLocalized(config.hero.description);
  if (Object.keys(heroDescription).length) hero.description = heroDescription;

  const sectionHeading: Record<string, unknown> = {};
  if (config.sectionHeading.eyebrow.trim()) sectionHeading.eyebrow = config.sectionHeading.eyebrow.trim();
  if (config.sectionHeading.title.trim()) sectionHeading.title = config.sectionHeading.title.trim();
  if (config.sectionHeading.description.trim()) sectionHeading.description = config.sectionHeading.description.trim();

  const recommendations: Record<string, unknown> = {};
  if (config.recommendations.eyebrow.trim()) recommendations.eyebrow = config.recommendations.eyebrow.trim();
  if (config.recommendations.title.trim()) recommendations.title = config.recommendations.title.trim();
  if (config.recommendations.description.trim()) recommendations.description = config.recommendations.description.trim();
  if (config.recommendations.linkLabel.trim()) recommendations.linkLabel = config.recommendations.linkLabel.trim();

  // 新增：序列化咨询 CTA
  const consultation: Record<string, unknown> = {};
  if (config.consultation) {
    const c = config.consultation;
    const title = cleanLocalized(typeof c.title === "string" ? ensureLocalized(c.title, "") : c.title);
    if (Object.keys(title).length) consultation.title = title;
    const description = cleanLocalized(typeof c.description === "string" ? ensureLocalized(c.description, "") : c.description);
    if (Object.keys(description).length) consultation.description = description;
    const primaryLabel = cleanLocalized(typeof c.primaryLabel === "string" ? ensureLocalized(c.primaryLabel, "") : c.primaryLabel);
    if (Object.keys(primaryLabel).length) consultation.primaryLabel = primaryLabel;
    if (toStringValue(c.primaryHref).trim()) consultation.primaryHref = toStringValue(c.primaryHref).trim();
    const phoneLabel = cleanLocalized(typeof c.phoneLabel === "string" ? ensureLocalized(c.phoneLabel, "") : c.phoneLabel);
    if (Object.keys(phoneLabel).length) consultation.phoneLabel = phoneLabel;
    if (toStringValue(c.phoneNumber).trim()) consultation.phoneNumber = toStringValue(c.phoneNumber).trim();
  }

  const galleryLightbox: Record<string, unknown> = {};
  if (config.galleryLightbox) {
    const gl = config.galleryLightbox;
    const openHint = cleanLocalized(gl.openHint);
    if (Object.keys(openHint).length) galleryLightbox.openHint = openHint;
    const nextLabel = cleanLocalized(gl.nextLabel);
    if (Object.keys(nextLabel).length) galleryLightbox.nextLabel = nextLabel;
    const prevLabel = cleanLocalized(gl.prevLabel);
    if (Object.keys(prevLabel).length) galleryLightbox.prevLabel = prevLabel;
    const closeLabel = cleanLocalized(gl.closeLabel);
    if (Object.keys(closeLabel).length) galleryLightbox.closeLabel = closeLabel;
    const counterPattern = cleanLocalized(gl.counterPattern);
    if (Object.keys(counterPattern).length) galleryLightbox.counterPattern = counterPattern;
  }

  const breadcrumb = config.breadcrumb
    .map((item) => ({ label: item.label.trim(), href: item.href.trim() }))
    .filter((item) => item.label || item.href);

  const result: Record<string, unknown> = {
    hero,
    sectionHeading,
    categories: config.categories.map(serializeCategory),
    recommendations,
    consultation,
    galleryLightbox,
    sidebarTitle: config.sidebarTitle,
    categoryCaseCountSuffix: config.categoryCaseCountSuffix,
  };

  if (breadcrumb.length) {
    result.breadcrumb = breadcrumb;
  }

  if (Array.isArray(config.breadcrumbI18n)) {
    const breadcrumbI18n = config.breadcrumbI18n
      .map((item) => {
        const href = toStringValue(item.href);
        const label = typeof item.label === "string" ? item.label.trim() : item.label ? cleanLocalized(item.label) : undefined;
        if (!href && (!label || (typeof label === "string" ? !label : Object.keys(label).length === 0))) return null;
        return { href, label };
      })
      .filter(Boolean) as Array<{ href?: string; label?: string | LocalizedValue }>;
    if (breadcrumbI18n.length) result.breadcrumbI18n = breadcrumbI18n;
  }

  if (config._meta) {
    result._meta = { ...config._meta };
  }

  return result;
}

function cloneCategory(category: CaseCategoryConfig): CaseCategoryConfig {
  return {
    slug: category.slug,
    name: ensureLocalizedRecord(category.name) as LocalizedValue,
    intro: ensureLocalizedRecord(category.intro) as LocalizedValue,
    studies: category.studies.map((study) => ({
      slug: study.slug,
      title: ensureLocalizedRecord(study.title) as LocalizedValue,
      year: study.year,
      location: ensureLocalizedRecord(study.location) as LocalizedValue,
      summary: ensureLocalizedRecord(study.summary) as LocalizedValue,
      background: ensureLocalizedRecord(study.background) as LocalizedValue,
      backgroundImage: study.backgroundImage,
      deliverables: [...study.deliverables],
      metrics: study.metrics.map((metric) => ({ ...metric })),
      image: study.image,
      gallery: [...study.gallery],
      highlightsImage: study.highlightsImage,
      deliverablesImage: study.deliverablesImage,
      highlightsI18n: study.highlightsI18n ? [...study.highlightsI18n] : undefined,
      deliverablesI18n: study.deliverablesI18n ? [...study.deliverablesI18n] : undefined,
      metricsI18n: study.metricsI18n ? study.metricsI18n.map((m) => ({ label: m.label, value: m.value })) : undefined,
      technicalDescription: study.technicalDescription
        ? (ensureLocalizedRecord(study.technicalDescription) as LocalizedValue)
        : undefined,
      technicalSpecs: study.technicalSpecs
        ? study.technicalSpecs.map((spec) => ({ label: spec.label, value: spec.value }))
        : undefined,
    })),
  };
}

function cloneConfig(value: CasesConfig): CasesConfig {
  return JSON.parse(JSON.stringify(value)) as CasesConfig;
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
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
    </div>
  );
}

function BreadcrumbPreview({ breadcrumb, breadcrumbI18n }: { breadcrumb: BreadcrumbItem[]; breadcrumbI18n?: Array<{ href?: string; label?: string | LocalizedValue }> }) {
  const items: Array<{ href?: string; label?: unknown }> = (Array.isArray(breadcrumbI18n) && breadcrumbI18n.length
    ? breadcrumbI18n
    : (breadcrumb.length ? breadcrumb : [
        { label: "首页" },
      ])
  ) as Array<{ href?: string; label?: unknown }>;

  return (
    <nav aria-label="面包屑导航">
      <ol className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-secondary)]">
        {items.map((item, index) => {
          const rawLabel = (item as any).label as unknown;
          const label = typeof rawLabel === "string" ? rawLabel : getLocaleText(rawLabel as any);
          const isLast = index === items.length - 1;
          return (
            <li key={`${label ?? ""}-${index}`} className="flex items-center gap-2">
              <span className={isLast ? "text-[var(--color-brand-secondary)]" : "transition hover:text-[var(--color-brand-primary)]"}>{label}</span>
              {isLast ? null : (
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="m9 18 6-6-6-6" />
                </svg>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

interface PreviewProps {
  config: CasesConfig;
  selectedCategoryIndex: number;
  previewPage: PreviewPage;
  onSelectCategory: (index: number) => void;
  onNavigateCategory: (index: number) => void;
  onNavigateStudy: (categoryIndex: number, studyIndex: number) => void;
  onEditHero: () => void;
  onEditSectionHeading: () => void;
  onEditGeneral: () => void;
  onEditRecommendations: () => void;
  onEditConsultation: () => void;
  onEditGalleryLightbox: () => void;
  onEditCategory: (index: number) => void;
  onEditStudy: (categoryIndex: number, studyIndex: number, scope?: StudyScope) => void;
  onAddCategory: () => void;
  onRemoveCategory: (index: number) => void;
  onReorderCategory: (sourceIndex: number, targetIndex: number) => void;
  // 管理端目录：支持案例增删与拖拽排序
  onAddStudy: (categoryIndex: number) => void;
  onRemoveStudy: (categoryIndex: number, studyIndex: number) => void;
  onReorderStudy: (categoryIndex: number, sourceIndex: number, targetIndex: number) => void;
}

function CasesPreviewSurface({
  config,
  selectedCategoryIndex,
  previewPage,
  onSelectCategory,
  onNavigateCategory,
  onNavigateStudy,
  onEditHero,
  onEditSectionHeading,
  onEditGeneral,
  onEditRecommendations,
  onEditConsultation,
  onEditGalleryLightbox,
  onEditCategory,
  onEditStudy,
  onAddCategory,
  onRemoveCategory,
  onReorderCategory,
  onAddStudy,
  onRemoveStudy,
  onReorderStudy,
}: PreviewProps) {
  const categories = config.categories ?? [];
  const dragSourceRef = useRef<number | null>(null);
  const [dragTargetIndex, setDragTargetIndex] = useState<number | null>(null);
  // 案例级拖拽状态
  const studyDragSourceRef = useRef<number | null>(null);
  const [studyDragTargetIndex, setStudyDragTargetIndex] = useState<number | null>(null);

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
    onReorderCategory(sourceIndex, index);
    handleDragEnd();
  };

  // 案例级拖拽处理器
  const handleStudyDragStart = (event: DragEvent<HTMLDivElement>, studyIndex: number) => {
    studyDragSourceRef.current = studyIndex;
    setStudyDragTargetIndex(studyIndex);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(studyIndex));
  };

  const handleStudyDragOver = (event: DragEvent<HTMLDivElement>, studyIndex: number) => {
    event.preventDefault();
    if (studyDragTargetIndex !== studyIndex) {
      setStudyDragTargetIndex(studyIndex);
    }
  };

  const handleStudyDragEnd = () => {
    studyDragSourceRef.current = null;
    setStudyDragTargetIndex(null);
  };

  const handleStudyDrop = (
    event: DragEvent<HTMLDivElement>,
    studyIndex: number,
    categoryIndex: number,
  ) => {
    event.preventDefault();
    const sourceIndex = studyDragSourceRef.current;
    if (sourceIndex === null) {
      handleStudyDragEnd();
      return;
    }
    onReorderStudy(categoryIndex, sourceIndex, studyIndex);
    handleStudyDragEnd();
  };

  const safeCategoryIndex =
    categories.length === 0
      ? 0
      : Math.max(0, Math.min(previewPage.categoryIndex, categories.length - 1));

  const activeCategory = categories[safeCategoryIndex];
  const categoryCaseSuffix = config.categoryCaseCountSuffix || "个案例";

  const renderOverview = () => (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <BreadcrumbPreview breadcrumb={config.breadcrumb} breadcrumbI18n={config.breadcrumbI18n} />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onEditHero}
            className="rounded-full border border-[var(--color-border)] px-4 py-2 text-xs font-semibold text-[var(--color-brand-primary)] transition hover:border-[var(--color-brand-primary)] hover:bg-[var(--color-brand-primary)]/10"
          >
            编辑英雄区
          </button>
          <button
            type="button"
            onClick={onEditSectionHeading}
            className="rounded-full border border-[var(--color-border)] px-4 py-2 text-xs font-semibold text-[var(--color-brand-secondary)] transition hover:border-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary)]"
          >
            编辑导语
          </button>
          <button
            type="button"
            onClick={onEditGeneral}
            className="rounded-full border border-[var(--color-border)] px-4 py-2 text-xs font-semibold text-[var(--color-brand-secondary)] transition hover:border-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary)]"
          >
            通用设置
          </button>
          <button
            type="button"
            onClick={onEditRecommendations}
            className="rounded-full border border-[var(--color-border)] px-4 py-2 text-xs font-semibold text-[var(--color-brand-secondary)] transition hover:border-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary)]"
          >
            推荐模块
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)]">
        <div className="relative h-[360px]">
          {(() => {
            const heroImage = sanitizeImageSrc(config.hero.image);
            return heroImage ? (
              <Image
                src={heroImage}
                alt={getLocaleText(config.hero.title) || ""}
                fill
                sizes="100vw"
                className="object-cover"
                priority
              />
            ) : null;
          })()}
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/35 to-transparent" />
          <div className="absolute inset-0 flex flex-col justify-end gap-3 p-8 text-white">
            {getLocaleText(config.hero.eyebrow) ? (
              <span className="inline-flex w-fit rounded-full bg-white/20 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em]">
                {getLocaleText(config.hero.eyebrow)}
              </span>
            ) : null}
            {getLocaleText(config.hero.title) ? (
              <h1 className="text-3xl font-semibold md:text-4xl">{getLocaleText(config.hero.title)}</h1>
            ) : null}
            {getLocaleText(config.hero.description) ? (
              <p className="max-w-3xl text-sm text-white/80">{getLocaleText(config.hero.description)}</p>
            ) : null}
          </div>
        </div>
      </div>

      <section className="mt-12 max-w-3xl space-y-3">
        {config.sectionHeading.eyebrow ? (
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-brand-primary)]">
            {config.sectionHeading.eyebrow}
          </span>
        ) : null}
        {config.sectionHeading.title ? (
          <h2 className="text-3xl font-semibold text-[var(--color-brand-secondary)]">{config.sectionHeading.title}</h2>
        ) : null}
        {config.sectionHeading.description ? (
          <p className="text-sm text-[var(--color-text-secondary)]">{config.sectionHeading.description}</p>
        ) : null}
      </section>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        {categories.map((category, index) => {
          const studies = category.studies ?? [];
          const isPreviewing = previewPage.categoryIndex === index;
          return (
            <article
              key={category.slug || index}
              className={`flex h-full flex-col rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-8 shadow-sm transition ${
                isPreviewing ? "ring-2 ring-[var(--color-brand-primary)]" : ""
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                {getLocaleText(category.name) ? (
                  <h3 className="text-2xl font-semibold text-[var(--color-brand-secondary)]">{getLocaleText(category.name)}</h3>
                ) : null}
                <div className="flex items-center gap-2 text-xs">

                  <button
                    type="button"
                    onClick={() => onNavigateCategory(index)}
                    className="rounded-full border border-[var(--color-brand-primary)] px-3 py-1 font-semibold text-[var(--color-brand-primary)] transition hover:bg-[var(--color-brand-primary)]/10"
                  >
                    预览分类
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onSelectCategory(index);
                      onEditCategory(index);
                    }}
                    className="rounded-full border border-[var(--color-border)] px-3 py-1 font-semibold text-[var(--color-brand-secondary)] transition hover:border-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary)]"
                  >
                    编辑分类
                  </button>
                </div>
              </div>
              <p className="mt-3 text-sm text-[var(--color-text-secondary)]">{getLocaleText(category.intro, undefined, "在此补充分类简介，说明覆盖的场景。")}</p>
              <ul className="mt-4 space-y-2 text-sm text-[var(--color-text-secondary)]">
                {studies.map((study) => (
                  <li key={study.slug} className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[var(--color-brand-primary)]" />
                    <span>{getLocaleText(study.title, undefined, study.slug)}</span>
                  </li>
                ))}
                {!studies.length ? (
                  <li className="text-xs text-[var(--color-text-tertiary,#8690a3)]">暂无案例</li>
                ) : null}
              </ul>
            </article>
          );
        })}
        {!categories.length ? (
          <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-white/70 p-8 text-center text-sm text-[var(--color-text-secondary)]">
            暂无分类，请点击左侧“新增分类”。
          </div>
        ) : null}
      </div>

      <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-8 text-center">
        {config.recommendations.eyebrow ? (
          <span className="inline-flex rounded-full bg-white px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-brand-primary)]">
            {config.recommendations.eyebrow}
          </span>
        ) : null}
        {config.recommendations.title ? (
          <h3 className="mt-4 text-2xl font-semibold text-[var(--color-brand-secondary)]">
            {config.recommendations.title}
          </h3>
        ) : null}
        {config.recommendations.description ? (
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            {config.recommendations.description}
          </p>
        ) : null}
        {config.recommendations.linkLabel ? (
          <div className="mt-6 inline-flex items-center rounded-full bg-[var(--color-brand-primary)] px-6 py-3 text-sm font-semibold text-white">
            {config.recommendations.linkLabel}
          </div>
        ) : null}
      </section>
    </div>
  );

  const renderCategoryView = () => {
    if (!activeCategory) {
      return (
        <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-white/70 p-8 text-center text-sm text-[var(--color-text-secondary)]">
          当前暂无分类，请在左侧新增后预览。
        </div>
      );
    }

    const studies = activeCategory.studies ?? [];

    return (
      <div className="space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <BreadcrumbPreview
            breadcrumb={[]}
            breadcrumbI18n={[
              ...(
                Array.isArray(config.breadcrumbI18n) && config.breadcrumbI18n.length
                  ? config.breadcrumbI18n
                  : [{ label: "首页" }]
              ),
              { label: getLocaleText(activeCategory.name) },
            ]}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                onSelectCategory(safeCategoryIndex);
                onEditCategory(safeCategoryIndex);
              }}
              className="rounded-full border border-[var(--color-border)] px-4 py-2 text-xs font-semibold text-[var(--color-brand-primary)] transition hover:border-[var(--color-brand-primary)] hover:bg-[var(--color-brand-primary)]/10"
            >
              编辑分类
            </button>
          </div>
        </div>

        <header className="space-y-2">
          {getLocaleText(activeCategory.name) ? (
            <h2 className="text-2xl font-semibold text-[var(--color-brand-secondary)] md:text-3xl">{getLocaleText(activeCategory.name)}</h2>
          ) : null}
          {getLocaleText(activeCategory.intro) ? (
            <p className="text-sm text-[var(--color-text-secondary)] md:text-base">{getLocaleText(activeCategory.intro)}</p>
          ) : null}
          <p className="text-xs text-[var(--color-text-tertiary,#8690a3)]">
            {studies.length} {categoryCaseSuffix}
          </p>
        </header>

        <div className="grid gap-6">
          {studies.length ? (
            studies.map((study, studyIndex) => (
              <article key={study.slug || studyIndex} className="relative overflow-hidden rounded-lg border border-[var(--color-border)]">
                <div className="relative h-[360px] w-full md:h-[400px]">
                  <Image
                    src={resolveImageSrc(study.image, DEFAULT_STUDY_IMAGE)}
                    alt={getLocaleText(study.title, undefined, study.slug || `案例 ${studyIndex + 1}`)}
                    fill
                    className="object-cover"
                    sizes="100vw"
                  />
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 px-6 text-center">
                    <h3 className="text-2xl font-semibold text-white drop-shadow-[0_8px_18px_rgba(0,0,0,0.35)] md:text-3xl">
                      {getLocaleText(study.title, undefined, study.slug || "案例")}
                    </h3>
                    <button
                      type="button"
                      onClick={() => onNavigateStudy(safeCategoryIndex, studyIndex)}
                      className="inline-flex items-center rounded-full border border-[var(--color-brand-primary)] px-6 py-3 text-sm font-semibold text-[var(--color-brand-primary)] transition hover:bg-[var(--color-brand-primary)] hover:text-white"
                    >
                      查看详情
                    </button>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-white/70 p-8 text-center text-sm text-[var(--color-text-secondary)]">
              当前分类暂无案例，请在“编辑分类”中新增。
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderStudyView = () => {
    if (previewPage.view !== "study") {
      return null;
    }
    const category = categories[previewPage.categoryIndex];
    if (!category) {
      return renderCategoryView();
    }
    const study = category.studies?.[previewPage.studyIndex];
    if (!study) {
      return renderCategoryView();
    }

    const relatedStudies = category.studies.filter((_, idx) => idx !== previewPage.studyIndex);
    const featuredStudies = relatedStudies.slice(0, 3);

    return (
      <div className="space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <BreadcrumbPreview
            breadcrumb={[]}
            breadcrumbI18n={[
              ...(
                Array.isArray(config.breadcrumbI18n) && config.breadcrumbI18n.length
                  ? config.breadcrumbI18n
                  : [{ label: "首页" }]
              ),
              { label: getLocaleText(category.name) },
              { label: getLocaleText(study.title) },
            ]}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onNavigateCategory(previewPage.categoryIndex)}
              className="rounded-full border border-[var(--color-border)] px-4 py-2 text-xs font-semibold text-[var(--color-brand-secondary)] transition hover:border-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary)]"
            >
              返回分类
            </button>

          </div>
        </div>

        <section className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white">
          <div className="relative h-[360px] w-full">
            {(() => {
              const studyImage = sanitizeImageSrc(study.image);
              return studyImage ? (
                <Image
                  src={studyImage}
                  alt={getLocaleText(study.title) || ""}
                  fill
                  className="object-cover"
                  sizes="100vw"
                  priority
                />
              ) : null;
            })()}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute inset-0 flex flex-col justify-end gap-3 p-8 text-white">
              <div className="absolute top-4 right-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onEditStudy(previewPage.categoryIndex, previewPage.studyIndex, "basic")}
                  className="rounded-full border border-white/50 bg-black/20 px-3 py-1 text-[10px] font-semibold text-white transition hover:border-white hover:bg-black/30"
                >
                  编辑基础信息
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-white/80">
                {study.year ? <span>{study.year}</span> : null}
                {study.year && study.location ? <span>·</span> : null}
                {study.location ? <span>{getLocaleText(study.location)}</span> : null}
                <span className="rounded-full bg-white/20 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.3em]">
                  {getLocaleText(category.name)}
                </span>
              </div>
              {getLocaleText(study.title) ? (
                <h1 className="text-3xl font-semibold md:text-4xl">{getLocaleText(study.title)}</h1>
              ) : null}
              {study.summary ? (
                <p className="max-w-3xl text-sm text-white/80">{getLocaleText(study.summary)}</p>
              ) : null}
            </div>
          </div>
        </section>

        {study.background || (study.metricsI18n?.length ?? 0) > 0 ? (
          <section className="rounded-2xl border border-[var(--color-border)] bg-white p-8">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-[var(--color-brand-secondary)]">项目背景</h2>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onEditStudy(previewPage.categoryIndex, previewPage.studyIndex, "background")}
                  className="rounded-full border border-[var(--color-border)] px-3 py-1 text-[10px] font-semibold text-[var(--color-brand-secondary)] transition hover:border-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary)]"
                >
                  编辑项目背景
                </button>
                <button
                  type="button"
                  onClick={() => onEditStudy(previewPage.categoryIndex, previewPage.studyIndex, "metrics_i18n")}
                  className="rounded-full border border-[var(--color-border)] px-3 py-1 text-[10px] font-semibold text-[var(--color-brand-secondary)] transition hover:border-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary)]"
                >
                  指标（多语言）
                </button>
              </div>
            </div>
            <div className="mt-4 space-y-6">
              {study.background ? (
                <p className="text-sm text-[var(--color-text-secondary)]">{getLocaleText(study.background, undefined, "")}</p>
              ) : null}
              {(study.metricsI18n?.length ?? 0) > 0 ? (
                <div className="grid gap-4 sm:grid-cols-3">
                  {(study.metricsI18n ?? []).map((metric: any) => {
                    const label = typeof metric.label === "string" ? metric.label : getLocaleText(metric.label, undefined, "");
                    const value = typeof metric.value === "string" ? metric.value : getLocaleText(metric.value, undefined, "");
                    return (
                      <div key={`${label}-${value}`} className="rounded-md border border-[var(--color-border)] bg-white p-4 text-center">
                        <p className="text-lg font-semibold text-[var(--color-brand-secondary)]">{value}</p>
                        <p className="text-xs text-[var(--color-text-secondary)]">{label}</p>
                      </div>
                    );
                  })}
                </div>
              ) : null}
              {study.backgroundImage ? (
                <figure className="relative aspect-[16/9] w-full overflow-hidden rounded-xl">
                  <Image
                    src={resolveImageSrc(study.backgroundImage, DEFAULT_STUDY_IMAGE)}
                    alt="项目背景配图"
                    fill
                    className="object-cover"
                    sizes="(min-width: 1024px) 40vw, 100vw"
                  />
                </figure>
              ) : null}
            </div>
          </section>
        ) : null}

        {study.highlightsI18n?.length ? (
          <section className="rounded-2xl border border-[var(--color-border)] bg-white p-8">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-[var(--color-brand-secondary)]">解决方案亮点</h2>
              <button
                type="button"
                onClick={() => onEditStudy(previewPage.categoryIndex, previewPage.studyIndex, "highlights_i18n")}
                className="rounded-full border border-[var(--color-border)] px-3 py-1 text-[10px] font-semibold text-[var(--color-brand-secondary)] transition hover:border-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary)]"
              >
                亮点（多语言）
              </button>
            </div>
            <div className="mt-6 space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {(study.highlightsI18n ?? []).map((item: any, idx: number) => {
                  const text = typeof item === "string" ? item : getLocaleText(item, undefined, "");
                  return (
                    <div
                      key={`${text}-${idx}`}
                      className="rounded-xl border border-[var(--color-border)] bg-white p-5 text-center shadow-[0_14px_35px_rgba(15,23,42,0.12)]"
                    >
                      <p className="text-sm font-semibold leading-6 text-[var(--color-brand-primary)]">{text}</p>
                    </div>
                  );
                })}
              </div>
              {study.highlightsImage ? (
                <figure className="relative aspect-[16/9] w-full overflow-hidden rounded-xl">
                  <Image
                    src={resolveImageSrc(study.highlightsImage, DEFAULT_STUDY_IMAGE)}
                    alt="亮点配图"
                    fill
                    className="object-cover"
                    sizes="(min-width: 1024px) 30vw, 100vw"
                  />
                </figure>
              ) : null}
            </div>
          </section>
        ) : null}

        {study.deliverablesI18n?.length ? (
          <section className="rounded-2xl border border-[var(--color-border)] bg-white p-8">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-[var(--color-brand-secondary)]">交付成果</h2>
              <button
                type="button"
                onClick={() => onEditStudy(previewPage.categoryIndex, previewPage.studyIndex, "deliverables_i18n")}
                className="rounded-full border border-[var(--color-border)] px-3 py-1 text-[10px] font-semibold text-[var(--color-brand-secondary)] transition hover:border-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary)]"
              >
                交付（多语言）
              </button>
            </div>
            <div className="mt-4 space-y-6">
              <div className="space-y-3 text-sm text-[var(--color-text-secondary)]">
                {(study.deliverablesI18n || []).map((item: any, idx: number) => {
                  const text = typeof item === "string" ? item : getLocaleText(item, undefined, "");
                  return (
                    <p key={`${text}-${idx}`} className="flex items-start gap-2">
                      <span className="mt-1 inline-block h-2 w-2 rounded-full bg-[var(--color-brand-primary)]"></span>
                      <span>{text}</span>
                    </p>
                  );
                })}
              </div>
              {study.deliverablesImage ? (
                <figure className="relative aspect-[16/9] w-full overflow-hidden rounded-xl">
                  <Image
                    src={resolveImageSrc(study.deliverablesImage, DEFAULT_STUDY_IMAGE)}
                    alt="交付成果配图"
                    fill
                    className="object-cover"
                    sizes="(min-width: 1024px) 35vw, 100vw"
                  />
                </figure>
              ) : null}
            </div>
          </section>
        ) : null}

        {study.gallery?.length ? (
          <section className="rounded-2xl border border-[var(--color-border)] bg-white p-8">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-[var(--color-brand-secondary)]">项目实景图库</h2>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onEditStudy(previewPage.categoryIndex, previewPage.studyIndex, "gallery")}
                  className="rounded-full border border-[var(--color-border)] px-3 py-1 text-[10px] font-semibold text-[var(--color-brand-secondary)] transition hover:border-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary)]"
                >
                  编辑项目图库
                </button>
                <button
                  type="button"
                  onClick={onEditGalleryLightbox}
                  className="rounded-full border border-[var(--color-border)] px-3 py-1 text-[10px] font-semibold text-[var(--color-brand-secondary)] transition hover:border-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary)]"
                >
                  图库交互文案
                </button>
              </div>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {study.gallery.map((item, index) => (
                <figure key={`${item}-${index}`} className="relative aspect-[16/9] overflow-hidden rounded-lg">
                  <Image
                    src={resolveImageSrc(item, DEFAULT_STUDY_IMAGE)}
                    alt={`${getLocaleText(study.title, undefined, study.slug || "案例")} 图集 ${index + 1}`}
                    fill
                    className="object-cover"
                    sizes="(min-width: 1280px) 30vw, (min-width: 768px) 45vw, 100vw"
                  />
                </figure>
              ))}
            </div>
          </section>
        ) : null}

        {featuredStudies.length ? (
          <section className="rounded-2xl border border-[var(--color-border)] bg-white p-8">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-[var(--color-brand-secondary)]">更多同类案例</h2>
              <button
                type="button"
                onClick={() => onNavigateCategory(previewPage.categoryIndex)}
                className="text-sm font-semibold text-[var(--color-brand-primary)]"
              >
                返回分类 →
              </button>
            </div>
            <div className="mt-6 grid gap-6 md:grid-cols-3">
              {featuredStudies.map((item, index) => {
                const studyIndex = category.studies.findIndex((candidate) => candidate.slug === item.slug);
                return (
                  <button
                    type="button"
                    key={item.slug || index}
                    onClick={() => onNavigateStudy(previewPage.categoryIndex, studyIndex >= 0 ? studyIndex : 0)}
                    className="group overflow-hidden rounded-md border border-[var(--color-border)] bg-white text-left transition hover:-translate-y-1 hover:shadow-lg"
                  >
                    <div className="relative h-40">
                      {(() => {
                        const itemImage = sanitizeImageSrc(item.image);
                        return itemImage ? (
                          <Image
                            src={itemImage}
                            alt={getLocaleText(item.title) || ""}
                            fill
                            className="object-cover transition duration-500 group-hover:scale-105"
                            sizes="(min-width: 768px) 33vw, 100vw"
                          />
                        ) : null;
                      })()}
                    </div>
                    <div className="space-y-2 p-4">
                      <p className="text-xs text-[var(--color-text-secondary)]">
                        {item.year ? `${item.year}` : null}
                        {item.year && item.location ? " · " : null}
                        {item.location ? getLocaleText(item.location) : null}
                      </p>
                      {getLocaleText(item.title) ? (
                        <h3 className="text-sm font-semibold text-[var(--color-brand-secondary)]">{getLocaleText(item.title)}</h3>
                      ) : null}
                      {item.summary ? (
                        <p className="text-xs text-[var(--color-text-secondary)] line-clamp-3">{getLocaleText(item.summary)}</p>
                      ) : null}
                      <span className="inline-flex text-xs font-semibold text-[var(--color-brand-primary)]">查看详情</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        ) : null}

        <section className="relative rounded-lg border border-[var(--color-border)] bg-white p-6 md:p-8">
          <button
            type="button"
            onClick={onEditConsultation}
            className="absolute right-4 top-4 rounded-full border border-[var(--color-border)] px-3 py-1 text-xs font-semibold text-[var(--color-brand-primary)] transition hover:border-[var(--color-brand-primary)] hover:bg-[var(--color-brand-primary)]/10"
          >
            编辑底部 CTA
          </button>
          <div className="space-y-4 text-left">
            <div className="space-y-2">
              {getLocaleText(config.consultation?.title) ? (
                <p className="text-sm font-semibold text-[var(--color-brand-secondary)]">
                  {getLocaleText(config.consultation?.title)}
                </p>
              ) : null}
              {getLocaleText(config.consultation?.description) ? (
                <p className="text-sm text-[var(--color-text-secondary)] md:text-base">
                  {getLocaleText(config.consultation?.description)}
                </p>
              ) : null}
            </div>
            <div className="flex flex-col items-start gap-3 text-sm">
              {getLocaleText(config.consultation?.primaryLabel) && config.consultation?.primaryHref?.trim() ? (
                <Link
                  href={config.consultation!.primaryHref.trim()}
                  className="rounded-full bg-[var(--color-brand-primary)] px-6 py-3 text-center font-semibold text-white transition hover:bg-red-600 w-full"
                >
                  {getLocaleText(config.consultation!.primaryLabel)}
                </Link>
              ) : null}
              {getLocaleText(config.consultation?.phoneLabel) && config.consultation?.phoneNumber?.trim() ? (
                <Link
                  href={`tel:${config.consultation!.phoneNumber.trim()}`}
                  className="rounded-full bg-[var(--color-brand-primary)] px-6 py-3 text-center font-semibold text-white transition hover:bg-red-600 w-full"
                >
                  {getLocaleText(config.consultation!.phoneLabel) + " " + config.consultation!.phoneNumber.trim()}
                </Link>
              ) : null}
            </div>
          </div>
        </section>
      </div>
    );
  };

  const mainContent =
    previewPage.view === "category"
      ? renderCategoryView()
      : renderStudyView();

  return (
    <ConfigPreviewFrame
      title="案例展示页面"
      description="预览分类页与案例详情，支持拖拽排序与快速跳转。"
      viewportWidth={1200}
      autoScale
      maxHeight={null}
    >
      <div className="bg-white pb-20 pt-10">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-8 px-4 sm:px-6 md:flex-row lg:px-8">
            <div className="md:w-[260px] md:shrink-0">
              {/* 管理端目录：增删、删除与拖拽排序，点击导航到预览 */}
              <aside className="rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-sm md:sticky md:top-24">
                <div className="flex items-center justify-between gap-2">
                  {config.sidebarTitle ? (
                    <h2 className="text-sm font-semibold text-[var(--color-brand-secondary)]">{config.sidebarTitle}</h2>
                  ) : null}
                  <button
                    type="button"
                    onClick={onAddCategory}
                    className="rounded-full border border-dashed border-[var(--color-brand-primary)] px-3 py-1 text-[11px] font-semibold text-[var(--color-brand-primary)] transition hover:bg-[var(--color-brand-primary)]/10"
                  >
                    新增分类
                  </button>
                </div>
                <div className="mt-4 space-y-2 text-sm text-[var(--color-brand-secondary)]">
                  {categories.map((category, index) => {
                    const isActiveCategory = previewPage.categoryIndex === index;
                    const studies = category.studies ?? [];
                    return (
                      <div key={category.slug || index} className="space-y-1">
                        <div
                          className={[
                            "group flex items-center gap-2 rounded-xl border border-transparent bg-[var(--color-surface-muted)] px-3 py-2 transition hover:bg-white",
                            isActiveCategory ? "border-[var(--color-brand-primary)] bg-white" : "",
                            dragTargetIndex === index ? "ring-2 ring-[var(--color-brand-primary)]" : "",
                          ].join(" ")}
                          draggable
                          onDragStart={(e) => handleDragStart(e as unknown as DragEvent<HTMLDivElement>, index)}
                          onDragOver={(e) => handleDragOver(e as unknown as DragEvent<HTMLDivElement>, index)}
                          onDrop={(e) => handleDrop(e as unknown as DragEvent<HTMLDivElement>, index)}
                          onDragEnd={handleDragEnd}
                        >
                          <button
                            type="button"
                            className="cursor-grab select-none text-xs text-[var(--color-text-tertiary,#8690a3)] hover:text-[var(--color-brand-primary)]"
                            aria-label="拖动调整顺序"
                          >
                            ≡
                          </button>
                          <button type="button" className="flex-1 truncate text-left transition hover:text-[var(--color-brand-primary)]" onClick={() => onNavigateCategory(index)}>
                            {getLocaleText(category.name, undefined, category.slug || "分类")}
                          </button>
                          <button
                            type="button"
                            onClick={() => onRemoveCategory(index)}
                            className="text-xs text-rose-500 transition hover:text-rose-600"
                            disabled={categories.length <= 1}
                          >
                            删除
                          </button>
                        </div>

                        {isActiveCategory && (
                          <div className="space-y-1 rounded-md bg-[var(--color-surface-muted)] p-2">
                            {studies.map((study, studyIndex) => {
                              const isActiveStudy =
                                previewPage.view === "study" &&
                                previewPage.categoryIndex === index &&
                                previewPage.studyIndex === studyIndex;
                              return (
                                <div
                                  key={study.slug || studyIndex}
                                  className={[
                                    "group flex items-center gap-2 rounded-xl border border-transparent bg-[var(--color-surface-muted)] px-3 py-2 transition hover:bg-white",
                                    isActiveStudy ? "border-[var(--color-brand-primary)] bg-white" : "",
                                    studyDragTargetIndex === studyIndex ? "ring-2 ring-[var(--color-brand-primary)]" : "",
                                  ].join(" ")}
                                  draggable
                                  onDragStart={(e) => handleStudyDragStart(e as unknown as DragEvent<HTMLDivElement>, studyIndex)}
                                  onDragOver={(e) => handleStudyDragOver(e as unknown as DragEvent<HTMLDivElement>, studyIndex)}
                                  onDrop={(e) => handleStudyDrop(e as unknown as DragEvent<HTMLDivElement>, studyIndex, index)}
                                  onDragEnd={handleStudyDragEnd}
                                >
                                  <button
                                    type="button"
                                    className="cursor-grab select-none text-xs text-[var(--color-text-tertiary,#8690a3)] hover:text-[var(--color-brand-primary)]"
                                    aria-label="拖动调整顺序"
                                  >
                                    ≡
                                  </button>
                                  <button
                                    type="button"
                                    className="flex-1 truncate text-left transition hover:text-[var(--color-brand-primary)]"
                                    onClick={() => onNavigateStudy(index, studyIndex)}
                                  >
                                    {getLocaleText(study.title, undefined, study.slug || "案例")}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onRemoveStudy(index, studyIndex)}
                                    className="text-xs text-rose-500 transition hover:text-rose-600"
                                  >
                                    删除
                                  </button>
                                </div>
                              );
                            })}
                            <button
                              type="button"
                              onClick={() => onAddStudy(index)}
                              className="mt-3 flex w-full items-center justify-center rounded-xl border border-dashed border-[var(--color-brand-primary)] px-4 py-3 text-xs font-semibold text-[var(--color-brand-primary)] transition hover:bg-[var(--color-brand-primary)]/10"
                            >
                              + 新增案例
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {!categories.length ? (
                    <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-white/70 p-4 text-center text-xs text-[var(--color-text-secondary)]">
                      暂无分类，请点击上方“新增分类”。
                    </div>
                  ) : null}
                </div>
              </aside>
            </div>
          <div className="flex-1 space-y-8">{mainContent}</div>
        </div>
      </div>
    </ConfigPreviewFrame>
  );
}


interface HeroDialogProps {
  value: HeroConfig;
  onSave: (next: HeroConfig) => void;
  onCancel: () => void;
}

function HeroEditorDialog({ value, onSave, onCancel }: HeroDialogProps) {
  const [draft, setDraft] = useState<HeroConfig>({ ...value });

  useEffect(() => {
    setDraft({ ...value });
  }, [value]);

  return (
    <EditorDialog
      title="编辑英雄区"
      subtitle="更新案例展示封面、标题与描述"
      onSave={() => onSave({ ...draft })}
      onCancel={onCancel}
    >
      <div className="space-y-4 text-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <LocalizedTextField
              label="眉头（可选）"
              value={draft.eyebrow}
              onChange={(next) => setDraft((prev) => ({ ...prev, eyebrow: next }))}
              placeholder="CASE STUDIES"
            />
          </div>
          <ImageInput
            label="封面图片"
            value={draft.image}
            onChange={(next) => setDraft((prev) => ({ ...prev, image: next }))}
            helper="最佳尺寸 1200×360"
          />
        </div>
        <div className="space-y-2">
          <LocalizedTextField
            label="主标题"
            value={draft.title}
            onChange={(next) => setDraft((prev) => ({ ...prev, title: next }))}
            placeholder="案例展示"
          />
        </div>
        <div className="space-y-2">
          <LocalizedTextField
            label="描述"
            value={draft.description}
            onChange={(next) => setDraft((prev) => ({ ...prev, description: next }))}
            multiline
            placeholder="概述案例频道的核心能力或服务范围"
          />
        </div>
      </div>
    </EditorDialog>
  );
}

interface SectionHeadingDialogProps {
  value: SectionHeadingConfig;
  onSave: (next: SectionHeadingConfig) => void;
  onCancel: () => void;
}

function SectionHeadingEditorDialog({ value, onSave, onCancel }: SectionHeadingDialogProps) {
  const [draft, setDraft] = useState<SectionHeadingConfig>({ ...value });

  useEffect(() => {
    setDraft({ ...value });
  }, [value]);

  return (
    <EditorDialog
      title="编辑导语"
      subtitle="维护频道导语与描述文案"
      onSave={() => onSave({ ...draft })}
      onCancel={onCancel}
    >
      <div className="space-y-4 text-sm">
        <div className="space-y-2">
          <span className="font-medium text-[var(--color-brand-secondary)]">眉头（可选）</span>
          <input
            value={draft.eyebrow}
            onChange={(event) => setDraft((prev) => ({ ...prev, eyebrow: event.target.value }))}
            className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
            placeholder="SPORTS / HOSPITALITY"
          />
        </div>
        <div className="space-y-2">
          <span className="font-medium text-[var(--color-brand-secondary)]">主标题</span>
          <input
            value={draft.title}
            onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))}
            className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-base font-medium text-[var(--color-brand-secondary)]"
            placeholder="核心应用场景"
          />
        </div>
        <div className="space-y-2">
          <span className="font-medium text-[var(--color-brand-secondary)]">描述</span>
          <textarea
            value={draft.description}
            onChange={(event) => setDraft((prev) => ({ ...prev, description: event.target.value }))}
            rows={5}
            className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm leading-relaxed"
            placeholder="补充频道导语，说明覆盖的案例类型与能力"
          />
        </div>
      </div>
    </EditorDialog>
  );
}

interface GeneralDialogProps {
  value: {
    sidebarTitle: string;
    categoryCaseCountSuffix: string;
    breadcrumb: BreadcrumbItem[];
  };
  onSave: (next: GeneralDialogProps["value"]) => void;
  onCancel: () => void;
}

function GeneralSettingsDialog({ value, onSave, onCancel }: GeneralDialogProps) {
  const [sidebarTitle, setSidebarTitle] = useState(value.sidebarTitle);
  const [caseCountSuffix, setCaseCountSuffix] = useState(value.categoryCaseCountSuffix);
  const [items, setItems] = useState<BreadcrumbItem[]>(value.breadcrumb);

  useEffect(() => {
    setSidebarTitle(value.sidebarTitle);
    setCaseCountSuffix(value.categoryCaseCountSuffix);
    setItems(value.breadcrumb.map((item) => ({ ...item })));
  }, [value]);

  const handleItemChange = (index: number, field: keyof BreadcrumbItem, nextValue: string) => {
    setItems((prev) => {
      const draft = [...prev];
      draft[index] = { ...draft[index], [field]: nextValue };
      return draft;
    });
  };

  const handleAddItem = () => {
    setItems((prev) => [...prev, { label: "", href: "" }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  return (
    <EditorDialog
      title="通用设置"
      subtitle="维护面包屑、侧栏标题与案例数量显示"
      onSave={() =>
        onSave({
          sidebarTitle,
          categoryCaseCountSuffix: caseCountSuffix,
          breadcrumb: items
            .map((item) => ({ label: item.label.trim(), href: item.href.trim() }))
            .filter((item) => item.label || item.href),
        })
      }
      onCancel={onCancel}
    >
      <div className="space-y-6 text-sm">
        <div className="space-y-2">
          <span className="font-medium text-[var(--color-brand-secondary)]">侧栏标题</span>
          <input
            value={sidebarTitle}
            onChange={(event) => setSidebarTitle(event.target.value)}
            className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
            placeholder="案例分类"
          />
        </div>
        <div className="space-y-2">
          <span className="font-medium text-[var(--color-brand-secondary)]">案例数量后缀</span>
          <input
            value={caseCountSuffix}
            onChange={(event) => setCaseCountSuffix(event.target.value)}
            className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
            placeholder="个案例"
          />
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-medium text-[var(--color-brand-secondary)]">面包屑节点</span>
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
                    <span className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-text-tertiary,#8690a3)]">文案</span>
                    <input
                      value={item.label}
                      onChange={(event) => handleItemChange(index, "label", event.target.value)}
                      className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-text-tertiary,#8690a3)]">链接</span>
                    <input
                      value={item.href}
                      onChange={(event) => handleItemChange(index, "href", event.target.value)}
                      placeholder="/cases"
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

interface RecommendationsDialogProps {
  value: RecommendationsConfig;
  onSave: (next: RecommendationsConfig) => void;
  onCancel: () => void;
}

function RecommendationsEditorDialog({ value, onSave, onCancel }: RecommendationsDialogProps) {
  const [draft, setDraft] = useState<RecommendationsConfig>({ ...value });

  useEffect(() => {
    setDraft({ ...value });
  }, [value]);

  return (
    <EditorDialog
      title="推荐模块"
      subtitle="更新页面底部的案例咨询模块"
      onSave={() => onSave({ ...draft })}
      onCancel={onCancel}
    >
      <div className="space-y-4 text-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <span className="font-medium text-[var(--color-brand-secondary)]">眉头（可选）</span>
            <input
              value={draft.eyebrow}
              onChange={(event) => setDraft((prev) => ({ ...prev, eyebrow: event.target.value }))}
              className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
              placeholder="专业顾问"
            />
          </div>
          <div className="space-y-2">
            <span className="font-medium text-[var(--color-brand-secondary)]">按钮文案</span>
            <input
              value={draft.linkLabel}
              onChange={(event) => setDraft((prev) => ({ ...prev, linkLabel: event.target.value }))}
              className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
              placeholder="联系顾问"
            />
          </div>
        </div>
        <div className="space-y-2">
          <span className="font-medium text-[var(--color-brand-secondary)]">标题</span>
          <input
            value={draft.title}
            onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))}
            className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-base font-medium text-[var(--color-brand-secondary)]"
            placeholder="获取定制化案例报告"
          />
        </div>
        <div className="space-y-2">
          <span className="font-medium text-[var(--color-brand-secondary)]">描述</span>
          <textarea
            value={draft.description}
            onChange={(event) => setDraft((prev) => ({ ...prev, description: event.target.value }))}
            rows={4}
            className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm leading-relaxed"
            placeholder="说明联系我们可以获得哪些支持"
          />
        </div>
      </div>
    </EditorDialog>
  );
}

interface ConsultationDialogProps {
  value: ConsultationConfig;
  onSave: (next: ConsultationConfig) => void;
  onCancel: () => void;
}

function ConsultationEditorDialog({ value, onSave, onCancel }: ConsultationDialogProps) {
  const [draft, setDraft] = useState<ConsultationConfig>({ ...value });

  useEffect(() => {
    setDraft({ ...value });
  }, [value]);

  return (
    <EditorDialog
      title="编辑底部 CTA"
      subtitle="更新咨询 CTA 文案、链接与电话"
      onSave={() => onSave({ ...draft })}
      onCancel={onCancel}
    >
      <div className="space-y-4 text-sm">
        <div className="space-y-2">
          <LocalizedTextField
            label="CTA 标题"
            value={draft.title}
            onChange={(next: LocalizedValue) => setDraft((prev) => ({ ...prev, title: next }))}
            placeholder="需要定制方案？"
          />
        </div>
        <div className="space-y-2">
          <LocalizedTextField
            label="CTA 描述"
            value={draft.description}
            onChange={(next: LocalizedValue) => setDraft((prev) => ({ ...prev, description: next }))}
            multiline
            placeholder="补充咨询引导文案"
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <LocalizedTextField
              label="主要按钮文案"
              value={draft.primaryLabel}
              onChange={(next: LocalizedValue) => setDraft((prev) => ({ ...prev, primaryLabel: next }))}
              placeholder="提交项目信息"
            />
          </div>
          <div className="space-y-2">
            <span className="font-medium text-[var(--color-brand-secondary)]">主要按钮链接</span>
            <input
              value={draft.primaryHref}
              onChange={(event) => setDraft((prev) => ({ ...prev, primaryHref: event.target.value }))}
              className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
              placeholder="/contact"
            />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <LocalizedTextField
              label="电话按钮文案"
              value={draft.phoneLabel}
              onChange={(next: LocalizedValue) => setDraft((prev) => ({ ...prev, phoneLabel: next }))}
              placeholder="致电"
            />
          </div>
          <div className="space-y-2">
            <span className="font-medium text-[var(--color-brand-secondary)]">客服电话号码</span>
            <input
              value={draft.phoneNumber}
              onChange={(event) => setDraft((prev) => ({ ...prev, phoneNumber: event.target.value }))}
              className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
              placeholder="400-800-1234"
            />
          </div>
        </div>
      </div>
    </EditorDialog>
  );
}

interface GalleryLightboxDialogProps {
  value: GalleryLightboxConfig;
  onSave: (next: GalleryLightboxConfig) => void;
  onCancel: () => void;
}

function GalleryLightboxDialog({ value, onSave, onCancel }: GalleryLightboxDialogProps) {
  const [draft, setDraft] = useState<GalleryLightboxConfig>({ ...value });

  useEffect(() => {
    setDraft({ ...value });
  }, [value]);

  return (
    <EditorDialog
      title="编辑图库交互文案"
      subtitle="配置点击查看大图提示与弹窗操作按钮文案"
      onSave={() => onSave({ ...draft })}
      onCancel={onCancel}
    >
      <div className="space-y-4 text-sm">
        <LocalizedTextField
          label="卡片悬浮提示"
          value={draft.openHint}
          onChange={(next: LocalizedValue) => setDraft((prev) => ({ ...prev, openHint: next }))}
          placeholder="点击查看大图"
        />
        <div className="grid gap-4 md:grid-cols-2">
          <LocalizedTextField
            label="上一张按钮文案"
            value={draft.prevLabel}
            onChange={(next: LocalizedValue) => setDraft((prev) => ({ ...prev, prevLabel: next }))}
            placeholder="上一张"
          />
          <LocalizedTextField
            label="下一张按钮文案"
            value={draft.nextLabel}
            onChange={(next: LocalizedValue) => setDraft((prev) => ({ ...prev, nextLabel: next }))}
            placeholder="下一张"
          />
        </div>
        <LocalizedTextField
          label="关闭按钮文案"
          value={draft.closeLabel}
          onChange={(next: LocalizedValue) => setDraft((prev) => ({ ...prev, closeLabel: next }))}
          placeholder="关闭大图"
        />
        <LocalizedTextField
          label="计数文案（支持 {{current}} / {{total}} 占位符）"
          value={draft.counterPattern}
          onChange={(next: LocalizedValue) => setDraft((prev) => ({ ...prev, counterPattern: next }))}
          placeholder="图 {{current}} / {{total}}"
        />
      </div>
    </EditorDialog>
  );
}

interface CaseStudyDialogProps {
  value: CaseStudyConfig;
  scope?: StudyScope;
  onSave: (next: CaseStudyConfig) => void;
  onRemove: () => void;
  onCancel: () => void;
  disableRemove?: boolean;
}

function CaseStudyEditorDialog({ value, scope, onSave, onRemove, onCancel, disableRemove }: CaseStudyDialogProps) {
  const [draft, setDraft] = useState<CaseStudyConfig>({ ...value });

  useEffect(() => {
    setDraft({ ...value });
  }, [value]);

  const handleMetricChange = (index: number, field: keyof CaseStudyMetric, nextValue: string) => {
    setDraft((prev) => {
      const metrics = prev.metrics.map((metric) => ({ ...metric }));
      metrics[index] = { ...metrics[index], [field]: nextValue };
      return { ...prev, metrics };
    });
  };

  const handleAddMetric = () => {
    setDraft((prev) => ({ ...prev, metrics: [...prev.metrics, { label: "", value: "" }] }));
  };

  const handleRemoveMetric = (index: number) => {
    setDraft((prev) => ({ ...prev, metrics: prev.metrics.filter((_, idx) => idx !== index) }));
  };

  const handleArrayChange = (key: "deliverables" | "gallery", index: number, nextValue: string) => {
    setDraft((prev) => {
      const list = [...(prev[key] as string[])];
      list[index] = nextValue;
      return { ...prev, [key]: list };
    });
  };

  const handleArrayAdd = (key: "deliverables" | "gallery") => {
    setDraft((prev) => ({ ...prev, [key]: [...(prev[key] as string[]), ""] }));
  };

  const handleArrayRemove = (key: "deliverables" | "gallery", index: number) => {
    setDraft((prev) => ({ ...prev, [key]: (prev[key] as string[]).filter((_, idx) => idx !== index) }));
  };

  // i18n arrays: highlightsI18n & deliverablesI18n
  const handleI18nArrayChange = (key: "highlightsI18n" | "deliverablesI18n", index: number, nextValue: LocalizedValue) => {
    setDraft((prev) => {
      const existing: LocalizedValue[] = Array.isArray((prev as any)[key])
        ? ([...(prev as any)[key]] as LocalizedValue[])
        : [];
      existing[index] = nextValue;
      return { ...prev, [key]: existing } as CaseStudyConfig;
    });
  };

  const handleI18nArrayAdd = (key: "highlightsI18n" | "deliverablesI18n") => {
    setDraft((prev) => {
      const existing: LocalizedValue[] = Array.isArray((prev as any)[key])
        ? ([...(prev as any)[key]] as LocalizedValue[])
        : [];
      existing.push(ensureLocalized(undefined, ""));
      return { ...prev, [key]: existing } as CaseStudyConfig;
    });
  };

  const handleI18nArrayRemove = (key: "highlightsI18n" | "deliverablesI18n", index: number) => {
    setDraft((prev) => {
      const existing: LocalizedValue[] = Array.isArray((prev as any)[key])
        ? ([...(prev as any)[key]] as LocalizedValue[])
        : [];
      const next = existing.filter((_, idx) => idx !== index);
      return { ...prev, [key]: next.length ? next : undefined } as CaseStudyConfig;
    });
  };

  // i18n metrics: metricsI18n label & value
  const handleMetricI18nChange = (index: number, field: "label" | "value", nextValue: LocalizedValue) => {
    setDraft((prev) => {
      const list: CaseStudyMetricI18n[] = Array.isArray(prev.metricsI18n)
        ? prev.metricsI18n.map((m) => ({ label: m.label, value: m.value }))
        : [];
      const current = list[index] ?? { label: ensureLocalized(undefined, ""), value: ensureLocalized(undefined, "") };
      current[field] = nextValue;
      list[index] = current;
      return { ...prev, metricsI18n: list };
    });
  };

  const handleAddMetricI18n = () => {
    setDraft((prev) => ({
      ...prev,
      metricsI18n: [...(prev.metricsI18n ?? []), { label: ensureLocalized(undefined, ""), value: ensureLocalized(undefined, "") }],
    }));
  };

  const handleRemoveMetricI18n = (index: number) => {
    setDraft((prev) => {
      const list = (prev.metricsI18n ?? []).filter((_, idx) => idx !== index);
      return { ...prev, metricsI18n: list.length ? list : undefined };
    });
  };

  const handleTechnicalSpecChange = (index: number, field: keyof CaseStudySpecI18n, nextValue: LocalizedValue) => {
    setDraft((prev) => {
      const specs: CaseStudySpecI18n[] = Array.isArray(prev.technicalSpecs)
        ? prev.technicalSpecs.map((spec) => ({ label: spec.label, value: spec.value }))
        : [];
      const current = specs[index] ?? { label: ensureLocalized(undefined, ""), value: ensureLocalized(undefined, "") };
      current[field] = nextValue;
      specs[index] = current;
      return { ...prev, technicalSpecs: specs };
    });
  };

  const handleAddTechnicalSpec = () => {
    setDraft((prev) => ({
      ...prev,
      technicalSpecs: [...(prev.technicalSpecs ?? []), { label: ensureLocalized(undefined, ""), value: ensureLocalized(undefined, "") }],
    }));
  };

  const handleRemoveTechnicalSpec = (index: number) => {
    setDraft((prev) => {
      const specs = (prev.technicalSpecs ?? []).filter((_, idx) => idx !== index);
      return { ...prev, technicalSpecs: specs.length ? specs : undefined };
    });
  };

  return (
    <EditorDialog
      title={
        scope === "basic" ? "编辑基础信息" :
        scope === "background" ? "编辑项目背景" :
        scope === "gallery" ? "编辑项目图库" :
        scope === "highlights_i18n" ? "编辑亮点（多语言）" :
        scope === "deliverables_i18n" ? "编辑交付成果（多语言）" :
        scope === "metrics_i18n" ? "编辑项目指标（多语言）" :
        "编辑案例详情"
      }
      subtitle={
        scope === "basic" ? "维护标题、Slug、年份、地点、摘要与主图" :
        scope === "background" ? "更新项目背景描述" :
        scope === "gallery" ? "维护案例图库" :
        scope === "highlights_i18n" ? "维护亮点（多语言）" :
        scope === "deliverables_i18n" ? "维护交付（多语言）" :
        scope === "metrics_i18n" ? "维护指标（多语言）" :
        "维护案例信息、亮点与图库"
      }
      onSave={() => onSave({
        ...draft,
        deliverables: [],
        gallery: draft.gallery.map((item) => item.trim()).filter((item) => item),
        metrics: [],
      })}
      onCancel={onCancel}
    >
      <div className="space-y-6 text-sm">
        {(!scope || scope === "basic") && (
          <div className="grid gap-4 md:grid-cols-2">
            <LocalizedTextField
              label="案例标题"
              value={draft.title}
              onChange={(next) => setDraft((prev) => ({ ...prev, title: next }))}
              placeholder="案例名称"
            />
            <div className="space-y-2">
              <span className="font-medium text-[var(--color-brand-secondary)]">Slug</span>
              <input
                value={draft.slug}
                onChange={(event) => setDraft((prev) => ({ ...prev, slug: event.target.value }))}
                className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
                placeholder="unique-case-slug"
              />
            </div>
          </div>
        )}
        {(!scope || scope === "basic") && (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <span className="font-medium text-[var(--color-brand-secondary)]">年份</span>
              <input
                value={draft.year}
                onChange={(event) => setDraft((prev) => ({ ...prev, year: event.target.value }))}
                className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
                placeholder="2025"
              />
            </div>
            <LocalizedTextField
              label="地点"
              value={draft.location}
              onChange={(next) => setDraft((prev) => ({ ...prev, location: next }))}
              placeholder="广东广州"
            />
          </div>
        )}
        {(!scope || scope === "basic") && (
          <LocalizedTextField
            label="案例摘要"
            value={draft.summary}
            onChange={(next) => setDraft((prev) => ({ ...prev, summary: next }))}
            placeholder="概述案例亮点与交付内容"
            multiline
          />
        )}
        {(!scope || scope === "background") && (
          <div className="space-y-4">
            <LocalizedTextField
              label="项目背景"
              value={draft.background}
              onChange={(next) => setDraft((prev) => ({ ...prev, background: next }))}
              placeholder="描述项目需求、挑战或整体背景"
              multiline
            />
            <ImageInput
              label="项目背景配图（可选）"
              value={draft.backgroundImage ?? ""}
              onChange={(next) => setDraft((prev) => ({ ...prev, backgroundImage: next }))}
              helper="最佳尺寸 1200×675（16:9），留空则仅展示文字"
            />
          </div>
        )}
        {(!scope || scope === "basic") && (
          <ImageInput
            label="主图"
            value={draft.image}
            onChange={(next) => setDraft((prev) => ({ ...prev, image: next }))}
            helper="最佳尺寸 1200×400"
          />
        )}

        <div className="grid gap-4 md:grid-cols-2">
          {(!scope || scope === "highlights_i18n") && (
            <div className="space-y-4">
              <LocalizedArrayEditor
                title="亮点（多语言）"
                values={draft.highlightsI18n}
                placeholder="亮点描述（不同语言）"
                onChange={(index, next) => handleI18nArrayChange("highlightsI18n", index, next)}
                onAdd={() => handleI18nArrayAdd("highlightsI18n")}
                onRemove={(index) => handleI18nArrayRemove("highlightsI18n", index)}
              />
              <ImageInput
                label="亮点配图（可选）"
                value={draft.highlightsImage ?? ""}
                onChange={(next) => setDraft((prev) => ({ ...prev, highlightsImage: next }))}
                helper="最佳尺寸 1200×675（16:9），留空则不展示"
              />
            </div>
          )}
          {(!scope || scope === "deliverables_i18n") && (
            <div className="space-y-4">
              <LocalizedArrayEditor
                title="交付成果（多语言）"
                values={draft.deliverablesI18n}
                placeholder="交付内容（不同语言）"
                onChange={(index, next) => handleI18nArrayChange("deliverablesI18n", index, next)}
                onAdd={() => handleI18nArrayAdd("deliverablesI18n")}
                onRemove={(index) => handleI18nArrayRemove("deliverablesI18n", index)}
              />
              <ImageInput
                label="交付成果配图（可选）"
                value={draft.deliverablesImage ?? ""}
                onChange={(next) => setDraft((prev) => ({ ...prev, deliverablesImage: next }))}
                helper="最佳尺寸 1200×675（16:9），留空则不展示"
              />
            </div>
          )}
        </div>

        {(!scope || scope === "metrics_i18n") && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium text-[var(--color-brand-secondary)]">项目指标（多语言）</span>
              <button
                type="button"
                onClick={handleAddMetricI18n}
                className="rounded-full border border-dashed border-[var(--color-brand-primary)] px-3 py-1 text-xs font-semibold text-[var(--color-brand-primary)] transition hover:bg-[var(--color-brand-primary)]/10"
              >
                新增指标
              </button>
            </div>
            <div className="space-y-2">
              {(draft.metricsI18n ?? []).map((metric, index) => (
                <div key={index} className="grid gap-2 rounded-2xl border border-[var(--color-border)] bg-white/80 p-4 md:grid-cols-[1fr_auto_1fr] md:items-center">
                  <div className="w-full">
                    <LocalizedTextField
                      label="指标名称"
                      value={metric.label}
                      onChange={(next) => handleMetricI18nChange(index, "label", next)}
                      placeholder="指标名称（多语言）"
                    />
                  </div>
                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveMetricI18n(index)}
                      className="rounded-full border border-[var(--color-border)] px-3 py-1 text-xs text-rose-500 hover:border-rose-200"
                    >
                      删除
                    </button>
                  </div>
                  <div className="w-full">
                    <LocalizedTextField
                      label="指标值"
                      value={metric.value}
                      onChange={(next) => handleMetricI18nChange(index, "value", next)}
                      placeholder="指标值（多语言）"
                    />
                  </div>
                </div>
              ))}
              {!((draft.metricsI18n ?? []).length) ? (
                <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-white/60 p-4 text-xs text-[var(--color-text-secondary)]">
                  尚未配置多语言指标。
                </div>
              ) : null}
            </div>
          </div>
        )}
        <div className="space-y-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]/60 p-4">
          <LocalizedTextField
            label="技术参数说明"
            value={draft.technicalDescription ?? ensureLocalized(undefined, "")}
            onChange={(next) => setDraft((prev) => ({ ...prev, technicalDescription: next }))}
            multiline
            placeholder="补充技术要点、系统搭配等说明"
          />
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium text-[var(--color-brand-secondary)]">技术参数表</span>
              <button
                type="button"
                onClick={handleAddTechnicalSpec}
                className="rounded-full border border-dashed border-[var(--color-brand-primary)] px-3 py-1 text-xs font-semibold text-[var(--color-brand-primary)] transition hover:bg-[var(--color-brand-primary)]/10"
              >
                新增参数
              </button>
            </div>
            <div className="space-y-2">
              {(draft.technicalSpecs ?? []).map((spec, index) => (
                <div key={index} className="grid gap-2 rounded-xl border border-[var(--color-border)] bg-white p-3 md:grid-cols-[1fr_auto_1fr] md:items-center">
                  <LocalizedTextField
                    label="参数名称"
                    value={spec.label}
                    onChange={(next) => handleTechnicalSpecChange(index, "label", next)}
                    placeholder="如：结构跨度"
                  />
                  <div className="flex justify-center py-2 md:py-0">
                    <button
                      type="button"
                      onClick={() => handleRemoveTechnicalSpec(index)}
                      className="rounded-full border border-rose-200 px-3 py-1 text-xs text-rose-500 transition hover:bg-rose-50"
                    >
                      删除
                    </button>
                  </div>
                  <LocalizedTextField
                    label="参数值"
                    value={spec.value}
                    onChange={(next) => handleTechnicalSpecChange(index, "value", next)}
                    placeholder="如：36 米"
                  />
                </div>
              ))}
              {!((draft.technicalSpecs ?? []).length) ? (
                <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-white/60 p-4 text-xs text-[var(--color-text-tertiary)]">
                  暂无技术参数，请新增。
                </div>
              ) : null}
            </div>
          </div>
        </div>
        {(!scope || scope === "gallery") && (
          <GalleryEditor
            title="项目图库"
            values={draft.gallery}
            onChange={(index, value) => handleArrayChange("gallery", index, value)}
            onAdd={() => handleArrayAdd("gallery")}
            onRemove={(index) => handleArrayRemove("gallery", index)}
          />
        )}
        <div className="flex justify-between border-t border-[var(--color-border)] pt-4 text-xs">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-[var(--color-border)] px-4 py-2 font-semibold text-[var(--color-text-secondary)] transition hover:border-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary)]"
          >
            取消
          </button>
          {!disableRemove ? (
            <button
              type="button"
              onClick={onRemove}
              className="rounded-full border border-rose-200 px-4 py-2 font-semibold text-rose-500 transition hover:bg-rose-50"
            >
              删除案例
            </button>
          ) : null}
        </div>
      </div>
    </EditorDialog>
  );
}

interface ArrayEditorProps {
  title: string;
  values: string[];
  placeholder?: string;
  onChange: (index: number, next: string) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}

function ArrayEditor({ title, values, placeholder, onChange, onAdd, onRemove }: ArrayEditorProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-medium text-[var(--color-brand-secondary)]">{title}</span>
        <button
          type="button"
          onClick={onAdd}
          className="rounded-full border border-dashed border-[var(--color-brand-primary)] px-3 py-1 text-xs font-semibold text-[var(--color-brand-primary)] transition hover:bg-[var(--color-brand-primary)]/10"
        >
          新增
        </button>
      </div>
      <div className="space-y-2">
        {values.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <input
              value={item}
              onChange={(event) => onChange(index, event.target.value)}
              className="flex-1 rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
              placeholder={placeholder}
            />
            <button
              type="button"
              onClick={() => onRemove(index)}
              className="rounded-full border border-[var(--color-border)] px-3 py-1 text-xs text-rose-500 hover:border-rose-200"
            >
              删除
            </button>
          </div>
        ))}
        {!values.length ? (
          <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-white/60 p-4 text-xs text-[var(--color-text-secondary)]">
            暂无内容，请新增。
          </div>
        ) : null}
      </div>
    </div>
  );
}

function GalleryEditor({ title, values, onChange, onAdd, onRemove }: ArrayEditorProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-medium text-[var(--color-brand-secondary)]">{title}</span>
        <button
          type="button"
          onClick={onAdd}
          className="rounded-full border border-dashed border-[var(--color-brand-primary)] px-3 py-1 text-xs font-semibold text-[var(--color-brand-primary)] transition hover:bg-[var(--color-brand-primary)]/10"
        >
          新增图片
        </button>
      </div>
      <div className="space-y-3">
        {values.map((item, index) => (
          <div key={index} className="rounded-2xl border border-[var(--color-border)] bg-white/80 p-3">
            <ImageInput
              label={`图片 ${index + 1}`}
              value={item}
              onChange={(next) => onChange(index, next)}
              placeholder="https://...（最佳尺寸 1200×675，16:9）"
              helper="最佳尺寸 1200×675（16:9）。支持填写链接或本地上传"
            />
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                onClick={() => onRemove(index)}
                className="rounded-full border border-[var(--color-border)] px-3 py-1 text-xs text-rose-500 hover:border-rose-200"
              >
                删除
              </button>
            </div>
          </div>
        ))}
        {!values.length ? (
          <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-white/60 p-4 text-xs text-[var(--color-text-secondary)]">
            暂无图片，请新增。
          </div>
        ) : null}
      </div>
    </div>
  );
}

interface LocalizedArrayEditorProps {
  title: string;
  values?: LocalizedValue[];
  placeholder?: string;
  onChange: (index: number, next: LocalizedValue) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}

function LocalizedArrayEditor({ title, values = [], placeholder, onChange, onAdd, onRemove }: LocalizedArrayEditorProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-medium text-[var(--color-brand-secondary)]">{title}</span>
        <button
          type="button"
          onClick={onAdd}
          className="rounded-full border border-dashed border-[var(--color-brand-primary)] px-3 py-1 text-xs font-semibold text-[var(--color-brand-primary)] transition hover:bg-[var(--color-brand-primary)]/10"
        >
          新增
        </button>
      </div>
      <div className="space-y-2">
        {values.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <div className="flex-1">
              <LocalizedTextField
                label=""
                value={item}
                onChange={(next) => onChange(index, next)}
                placeholder={placeholder}
              />
            </div>
            <button
              type="button"
              onClick={() => onRemove(index)}
              className="h-[36px] rounded-full border border-[var(--color-border)] px-3 py-1 text-xs text-rose-500 hover:border-rose-200"
            >
              删除
            </button>
          </div>
        ))}
        {!values.length ? (
          <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-white/60 p-4 text-xs text-[var(--color-text-secondary)]">
            暂无内容，请新增。
          </div>
        ) : null}
      </div>
    </div>
  );
}

interface CaseCategoryDialogProps {
  value: CaseCategoryConfig;
  onSave: (next: CaseCategoryConfig) => void;
  onRemove: () => void;
  onCancel: () => void;
  disableRemove?: boolean;
}

function CaseCategoryEditorDialog({ value, onSave, onRemove, onCancel, disableRemove }: CaseCategoryDialogProps) {
  const [draft, setDraft] = useState<CaseCategoryConfig>(() => cloneCategory(value));
  const [editingStudyIndex, setEditingStudyIndex] = useState<number | null>(null);

  useEffect(() => {
    setDraft(cloneCategory(value));
  }, [value]);

  const handleAddStudy = () => {
    setDraft((prev) => {
      const studies = [...prev.studies, normalizeStudy(undefined, prev.studies.length)];
      return { ...prev, studies };
    });
    setEditingStudyIndex(draft.studies.length);
  };

  const handleRemoveStudy = (index: number) => {
    setDraft((prev) => ({ ...prev, studies: prev.studies.filter((_, idx) => idx !== index) }));
  };

  const handleMoveStudy = (index: number, delta: number) => {
    setDraft((prev) => {
      const studies = [...prev.studies];
      const target = index + delta;
      if (target < 0 || target >= studies.length) return prev;
      const [moved] = studies.splice(index, 1);
      studies.splice(target, 0, moved);
      return { ...prev, studies };
    });
  };

  const handleStudySave = (index: number, study: CaseStudyConfig) => {
    setDraft((prev) => {
      const studies = [...prev.studies];
      studies[index] = study;
      return { ...prev, studies };
    });
    setEditingStudyIndex(null);
  };

  return (
    <EditorDialog
      title="编辑案例分类"
      subtitle="维护分类信息与所属案例"
      onSave={() => onSave({
        ...draft,
        name: cleanLocalized(draft.name),
        intro: cleanLocalized(draft.intro),
        slug: draft.slug.trim() || `category-${Date.now()}`,
        studies: draft.studies.map((study) => ({
          ...study,
          deliverables: [],
          gallery: study.gallery.map((item) => item.trim()).filter((item) => item),
          metrics: [],
        })),
      })}
      onCancel={onCancel}
    >
      <div className="space-y-6 text-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <LocalizedTextField
            label="分类名称"
            value={draft.name}
            onChange={(next) => setDraft((prev) => ({ ...prev, name: next }))}
            placeholder="体育赛事"
          />
          <div className="space-y-2">
            <span className="font-medium text-[var(--color-brand-secondary)]">Slug</span>
            <input
              value={draft.slug}
              onChange={(event) => setDraft((prev) => ({ ...prev, slug: event.target.value }))}
              className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
              placeholder="sports-events"
            />
          </div>
        </div>

        <div className="space-y-2">
          <LocalizedTextField
            label="分类简介"
            value={draft.intro}
            onChange={(next) => setDraft((prev) => ({ ...prev, intro: next }))}
            placeholder="在此补充分类简介，说明覆盖的场景。"
            multiline
          />
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-medium text-[var(--color-brand-secondary)]">案例列表</span>
            <button
              type="button"
              onClick={handleAddStudy}
              className="rounded-full border border-dashed border-[var(--color-brand-primary)] px-3 py-1 text-xs font-semibold text-[var(--color-brand-primary)] transition hover:bg-[var(--color-brand-primary)]/10"
            >
              新增案例
            </button>
          </div>
          <div className="space-y-2">
            {draft.studies.map((study, index) => (
              <div key={study.slug || index} className="rounded-2xl border border-[var(--color-border)] bg-white/80 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="relative h-16 w-24 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]">
                      {(() => {
                        const previewImage = sanitizeImageSrc(study.image);
                        return previewImage ? (
                          <Image
                            src={previewImage}
                            alt={getLocaleText(study.title) || ""}
                            fill
                            className="object-cover"
                            sizes="96px"
                          />
                        ) : null;
                      })()}
                    </div>
                    <div>
                      {getLocaleText(study.title) ? (
                        <p className="text-sm font-semibold text-[var(--color-brand-secondary)]">{getLocaleText(study.title)}</p>
                      ) : null}
                      <p className="text-xs text-[var(--color-text-tertiary,#8690a3)]">
                        {study.year ? study.year : null}
                        {study.year && study.location ? " · " : null}
                        {study.location ? getLocaleText(study.location) : null}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => handleMoveStudy(index, -1)}
                      className="rounded-full border border-[var(--color-border)] px-3 py-1 transition hover:border-[var(--color-brand-primary)]"
                      disabled={index === 0}
                    >
                      上移
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveStudy(index, 1)}
                      className="rounded-full border border-[var(--color-border)] px-3 py-1 transition hover:border-[var(--color-brand-primary)]"
                      disabled={index === draft.studies.length - 1}
                    >
                      下移
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingStudyIndex(index)}
                      className="rounded-full border border-[var(--color-border)] px-3 py-1 font-semibold text-[var(--color-brand-primary)] transition hover:border-[var(--color-brand-primary)] hover:bg-[var(--color-brand-primary)]/10"
                    >
                      编辑
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveStudy(index)}
                      className="rounded-full border border-rose-200 px-3 py-1 text-rose-500 transition hover:bg-rose-50"
                      disabled={draft.studies.length <= 1}
                    >
                      删除
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {!draft.studies.length ? (
              <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-white/60 p-4 text-xs text-[var(--color-text-secondary)]">
                尚未添加案例，请新增。
              </div>
            ) : null}
          </div>
        </div>
        <div className="flex justify-between border-t border-[var(--color-border)] pt-4 text-xs">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-[var(--color-border)] px-4 py-2 font-semibold text-[var(--color-text-secondary)] transition hover:border-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary)]"
          >
            取消
          </button>
          <button
            type="button"
            onClick={onRemove}
            disabled={disableRemove}
            className="rounded-full border border-rose-200 px-4 py-2 font-semibold text-rose-500 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            删除分类
          </button>
        </div>
      </div>
      {editingStudyIndex !== null ? (
        <CaseStudyEditorDialog
          value={draft.studies[editingStudyIndex]}
          onSave={(next) => handleStudySave(editingStudyIndex, next)}
          onRemove={() => {
            handleRemoveStudy(editingStudyIndex);
            setEditingStudyIndex(null);
          }}
          disableRemove={draft.studies.length <= 1}
          onCancel={() => setEditingStudyIndex(null)}
        />
      ) : null}
    </EditorDialog>
  );
}

type EditingTarget =
  | { type: "hero" }
  | { type: "sectionHeading" }
  | { type: "general" }
  | { type: "recommendations" }
  | { type: "consultation" }
  | { type: "galleryLightbox" }
  | { type: "category"; index: number }
  | { type: "study"; categoryIndex: number; studyIndex: number; scope?: StudyScope };

interface CasesConfigEditorProps {
  configKey: string;
  initialConfig: Record<string, unknown>;
}

export function CasesConfigEditor({ configKey, initialConfig }: CasesConfigEditorProps) {
  const [config, setConfig] = useState<CasesConfig>(() => normalizeConfig(initialConfig));
  useGlobalTranslationRegistrationForConfig({ config, setConfig, labelPrefix: configKey });
  const [baselineSnapshot, setBaselineSnapshot] = useState(() =>
    JSON.stringify(normalizeConfig(initialConfig)),
  );
  const [selectedCategoryIndex, setSelectedCategoryIndex] = useState(0);
  const [previewPage, setPreviewPage] = useState<PreviewPage>(() => ({ view: "category", categoryIndex: 0 }));
  const [editing, setEditing] = useState<EditingTarget | null>(null);
  const [formState, dispatch] = useFormState<UpdateSiteConfigActionState, FormData>(updateSiteConfigAction, {
    status: "idle",
  });
  const toast = useToast();


  const formRef = useRef<HTMLFormElement>(null);
  const prevStatusRef = useRef(formState.status);

  useEffect(() => {
    const normalized = normalizeConfig(initialConfig);
    setConfig(normalized);
    setBaselineSnapshot(JSON.stringify(normalized));
  }, [initialConfig]);

  useEffect(() => {
    if (!config.categories.length) {
      setSelectedCategoryIndex(0);
      setPreviewPage({ view: "category", categoryIndex: 0 });
      return;
    }

    if (selectedCategoryIndex >= config.categories.length) {
      setSelectedCategoryIndex(config.categories.length - 1);
    }
  }, [config.categories.length, selectedCategoryIndex]);

  const payload = useMemo(() => JSON.stringify(serializeConfig(config)), [config]);
  const configSnapshot = useMemo(() => JSON.stringify(config), [config]);
  const isDirty = useMemo(() => configSnapshot !== baselineSnapshot, [configSnapshot, baselineSnapshot]);
  const statusLabel = isDirty ? "有未保存的更改" : "暂无未保存的更改";

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



  const handleNavigateCategoryPreview = (index: number) => {
    if (!config.categories.length) {
      setSelectedCategoryIndex(0);
      setPreviewPage({ view: "category", categoryIndex: 0 });
      return;
    }
    const safeIndex = Math.max(0, Math.min(index, config.categories.length - 1));
    setSelectedCategoryIndex(safeIndex);
    setPreviewPage({ view: "category", categoryIndex: safeIndex });
  };

  const handleNavigateStudyPreview = (categoryIndex: number, studyIndex: number) => {
    if (!config.categories.length) {
      setSelectedCategoryIndex(0);
      setPreviewPage({ view: "category", categoryIndex: 0 });
      return;
    }
    const safeCategoryIndex = Math.max(0, Math.min(categoryIndex, config.categories.length - 1));
    const category = config.categories[safeCategoryIndex];
    if (!category || !category.studies.length) {
      handleNavigateCategoryPreview(safeCategoryIndex);
      return;
    }
    const safeStudyIndex = Math.max(0, Math.min(studyIndex, category.studies.length - 1));
    setSelectedCategoryIndex(safeCategoryIndex);
    setPreviewPage({ view: "study", categoryIndex: safeCategoryIndex, studyIndex: safeStudyIndex });
  };

  const handleAddCategory = () => {
    setConfig((prev) => {
      const next = cloneConfig(prev);
      next.categories.push(normalizeCategory(undefined, next.categories.length));
      return next;
    });
    const newIndex = config.categories.length;
    setSelectedCategoryIndex(newIndex);
    setPreviewPage({ view: "category", categoryIndex: newIndex });
    setEditing({ type: "category", index: newIndex });
  };

  const handleRemoveCategory = (index: number) => {
    if (config.categories.length <= 1) return;
    const ok = window.confirm("确定删除该分类？删除后将自动保存。");
    if (!ok) return;

    const nextConfig = cloneConfig(config);
    nextConfig.categories.splice(index, 1);
    const nextCategories = nextConfig.categories;

    setConfig(nextConfig);
    setSelectedCategoryIndex((prevSelected) => {
      if (!nextCategories.length) return 0;
      if (prevSelected === index) return Math.max(0, index - 1);
      if (prevSelected > index) return prevSelected - 1;
      return prevSelected;
    });
    setPreviewPage((prev) => {
      if (!nextCategories.length) return { view: "category", categoryIndex: 0 };

      if (prev.categoryIndex === index) {
        const nextIndex = Math.max(0, index - 1);
        const targetCategory = nextCategories[nextIndex];
        if (!targetCategory) return { view: "category", categoryIndex: nextIndex };
        if (prev.view === "study") {
          const studies = targetCategory.studies ?? [];
          if (!studies.length) {
            return { view: "category", categoryIndex: nextIndex };
          }
          const safeStudyIndex = Math.min(prev.studyIndex, studies.length - 1);
          return { view: "study", categoryIndex: nextIndex, studyIndex: safeStudyIndex };
        }
        return { view: "category", categoryIndex: nextIndex };
      }

      if (prev.categoryIndex > index) {
        if (prev.view === "study") {
          return {
            view: "study",
            categoryIndex: prev.categoryIndex - 1,
            studyIndex: prev.studyIndex,
          };
        }
        return { view: "category", categoryIndex: prev.categoryIndex - 1 };
      }

      return prev;
    });

    const fd = new FormData();
    fd.append("key", configKey);
    fd.append("payload", JSON.stringify(serializeConfig(nextConfig)));
    dispatch(fd);
  };

  const handleReorderCategory = (sourceIndex: number, targetIndex: number) => {
    if (sourceIndex === targetIndex) return;

    const next = cloneConfig(config);
    const [moved] = next.categories.splice(sourceIndex, 1);
    next.categories.splice(targetIndex, 0, moved);

    const confirmed = window.confirm("确定调整分类顺序？确认后将自动保存，并更新目录与导航。");
    if (!confirmed) return;

    setConfig(next);
    setSelectedCategoryIndex((prevSelected) => {
      if (prevSelected === sourceIndex) return targetIndex;
      if (prevSelected > sourceIndex && prevSelected <= targetIndex) return prevSelected - 1;
      if (prevSelected < sourceIndex && prevSelected >= targetIndex) return prevSelected + 1;
      return prevSelected;
    });
    setPreviewPage((prev) => {
      if (prev.categoryIndex === sourceIndex) {
        if (prev.view === "study") {
          return { view: "study", categoryIndex: targetIndex, studyIndex: prev.studyIndex };
        }
        return { view: "category", categoryIndex: targetIndex };
      }
      if (prev.categoryIndex > sourceIndex && prev.categoryIndex <= targetIndex) {
        if (prev.view === "study") {
          return {
            view: "study",
            categoryIndex: prev.categoryIndex - 1,
            studyIndex: prev.studyIndex,
          };
        }
        return { view: "category", categoryIndex: prev.categoryIndex - 1 };
      }
      if (prev.categoryIndex < sourceIndex && prev.categoryIndex >= targetIndex) {
        if (prev.view === "study") {
          return {
            view: "study",
            categoryIndex: prev.categoryIndex + 1,
            studyIndex: prev.studyIndex,
          };
        }
        return { view: "category", categoryIndex: prev.categoryIndex + 1 };
      }
      return prev;
    });

    setEditing(null);

    const fd = new FormData();
    fd.append("key", configKey);
    fd.append("payload", JSON.stringify(serializeConfig(next)));
    dispatch(fd);
  };

  // 目录内案例增删与排序处理
const handleAddStudyConfig = (categoryIndex: number) => {
  const next = cloneConfig(config);
  const cat = next.categories[categoryIndex];
  if (!cat) return;
  const newStudyIndex = (cat.studies?.length ?? 0);
  const newStudy = normalizeStudy(undefined, newStudyIndex);
  cat.studies = [...(cat.studies ?? []), newStudy];

  setConfig(next);
  setSelectedCategoryIndex(categoryIndex);
  setPreviewPage({ view: "study", categoryIndex, studyIndex: newStudyIndex });

  const fd = new FormData();
  fd.append("key", configKey);
  fd.append("payload", JSON.stringify(serializeConfig(next)));
  dispatch(fd);
};

  const handleRemoveStudyConfig = (categoryIndex: number, studyIndex: number) => {
    const cat = config.categories[categoryIndex];
    if (!cat) return;
    const ok = window.confirm("确定删除该案例？删除后将自动保存。");
    if (!ok) return;

    const next = cloneConfig(config);
    const targetCategory = next.categories[categoryIndex];
    if (!targetCategory) return;
    const nextStudies = (targetCategory.studies ?? []).filter((_, idx) => idx !== studyIndex);
    targetCategory.studies = nextStudies;

    setConfig(next);
    setPreviewPage((prev) => {
      if (prev.view === "study" && prev.categoryIndex === categoryIndex) {
        if (!nextStudies.length) return { view: "category", categoryIndex };
        const safeIndex = Math.min(prev.studyIndex === studyIndex ? studyIndex : prev.studyIndex, nextStudies.length - 1);
        return { view: "study", categoryIndex, studyIndex: safeIndex };
      }
      return prev;
    });

    setEditing(null);

    const fd = new FormData();
    fd.append("key", configKey);
    fd.append("payload", JSON.stringify(serializeConfig(next)));
    dispatch(fd);
  };

  const handleReorderStudyConfig = (categoryIndex: number, sourceIndex: number, targetIndex: number) => {
    if (sourceIndex === targetIndex) return;

    const next = cloneConfig(config);
    const cat = next.categories[categoryIndex];
    if (!cat) return;
    const studies = [...(cat.studies ?? [])];
    const [moved] = studies.splice(sourceIndex, 1);
    studies.splice(targetIndex, 0, moved);
    cat.studies = studies;

    const confirmed = window.confirm("确定调整案例顺序？确认后将自动保存，并更新目录与导航。");
    if (!confirmed) return;

    setConfig(next);
    setPreviewPage((prev) => {
      if (prev.view === "study" && prev.categoryIndex === categoryIndex) {
        if (prev.studyIndex === sourceIndex) return { view: "study", categoryIndex, studyIndex: targetIndex };
        if (prev.studyIndex > sourceIndex && prev.studyIndex <= targetIndex) return { view: "study", categoryIndex, studyIndex: prev.studyIndex - 1 };
        if (prev.studyIndex < sourceIndex && prev.studyIndex >= targetIndex) return { view: "study", categoryIndex, studyIndex: prev.studyIndex + 1 };
      }
      return prev;
    });

    setEditing(null);

    const fd = new FormData();
    fd.append("key", configKey);
    fd.append("payload", JSON.stringify(serializeConfig(next)));
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
          const fd = new FormData();
          fd.append("key", configKey);
          fd.append("payload", JSON.stringify(serializeConfig(nextConfig)));
          dispatch(fd);
          setEditing(null);
        }}
        onCancel={() => setEditing(null)}
      />
    );
  } else if (editing?.type === "sectionHeading") {
    dialog = (
      <SectionHeadingEditorDialog
        value={config.sectionHeading}
        onSave={(next) => {
          const nextConfig = { ...config, sectionHeading: { ...next } };
          setConfig(nextConfig);
          const fd = new FormData();
          fd.append("key", configKey);
          fd.append("payload", JSON.stringify(serializeConfig(nextConfig)));
          dispatch(fd);
          setEditing(null);
        }}
        onCancel={() => setEditing(null)}
      />
    );
  } else if (editing?.type === "general") {
    dialog = (
      <GeneralSettingsDialog
        value={{
          sidebarTitle: config.sidebarTitle,
          categoryCaseCountSuffix: config.categoryCaseCountSuffix,
          breadcrumb: config.breadcrumb,
        }}
        onSave={(next) => {
          const nextConfig = {
            ...config,
            sidebarTitle: next.sidebarTitle,
            categoryCaseCountSuffix: next.categoryCaseCountSuffix,
            breadcrumb: next.breadcrumb.map((item) => ({
              label: item.label || "",
              href: item.href || "",
            })),
          };
          setConfig(nextConfig);
          const fd = new FormData();
          fd.append("key", configKey);
          fd.append("payload", JSON.stringify(serializeConfig(nextConfig)));
          dispatch(fd);
          setEditing(null);
        }}
        onCancel={() => setEditing(null)}
      />
    );
  } else if (editing?.type === "recommendations") {
    dialog = (
      <RecommendationsEditorDialog
        value={config.recommendations}
        onSave={(next) => {
          const nextConfig = { ...config, recommendations: next };
          setConfig(nextConfig);
          const fd = new FormData();
          fd.append("key", configKey);
          fd.append("payload", JSON.stringify(serializeConfig(nextConfig)));
          dispatch(fd);
          setEditing(null);
        }}
        onCancel={() => setEditing(null)}
      />
    );
  } else if (editing?.type === "consultation") {
    dialog = (
      <ConsultationEditorDialog
        value={config.consultation ?? {
          title: ensureLocalizedRecord("需要定制方案？") as LocalizedValue,
          description: ensureLocalizedRecord("") as LocalizedValue,
          primaryLabel: ensureLocalizedRecord("提交项目信息") as LocalizedValue,
          primaryHref: "/contact",
          phoneLabel: ensureLocalizedRecord("致电") as LocalizedValue,
          phoneNumber: "400-800-1234",
        }}
        onSave={(next) => {
          const nextConfig = { ...config, consultation: { ...next } };
          setConfig(nextConfig);
          const fd = new FormData();
          fd.append("key", configKey);
          fd.append("payload", JSON.stringify(serializeConfig(nextConfig)));
          dispatch(fd);
          setEditing(null);
        }}
        onCancel={() => setEditing(null)}
      />
    );
  } else if (editing?.type === "galleryLightbox") {
    dialog = (
      <GalleryLightboxDialog
        value={
          config.galleryLightbox ?? {
            openHint: ensureLocalized(undefined, "点击查看大图"),
            nextLabel: ensureLocalized(undefined, "下一张"),
            prevLabel: ensureLocalized(undefined, "上一张"),
            closeLabel: ensureLocalized(undefined, "关闭"),
            counterPattern: ensureLocalized(undefined, "图 {{current}} / {{total}}"),
          }
        }
        onSave={(next) => {
          const nextConfig = { ...config, galleryLightbox: { ...next } };
          setConfig(nextConfig);
          setEditing(null);
          const fd = new FormData();
          fd.append("key", configKey);
          fd.append("payload", JSON.stringify(serializeConfig(nextConfig)));
          dispatch(fd);
        }}
        onCancel={() => setEditing(null)}
      />
    );
  } else if (editing?.type === "category") {
    const category = config.categories[editing.index];
    if (category) {
      dialog = (
        <CaseCategoryEditorDialog
          value={category}
          disableRemove={config.categories.length <= 1}
          onSave={(next) => {
            const nextConfig = cloneConfig(config);
            nextConfig.categories[editing.index] = next;
            setConfig(nextConfig);
            setEditing(null);
            setSelectedCategoryIndex(editing.index);
            if (previewPage.view === "study" && previewPage.categoryIndex === editing.index) {
              if (!next.studies.length) {
                setPreviewPage({ view: "category", categoryIndex: editing.index });
              } else {
                const safeStudyIndex = Math.min(
                  previewPage.studyIndex,
                  next.studies.length - 1,
                );
                setPreviewPage({
                  view: "study",
                  categoryIndex: editing.index,
                  studyIndex: safeStudyIndex,
                });
              }
            } else if (previewPage.view === "category" && previewPage.categoryIndex === editing.index) {
              setPreviewPage({ view: "category", categoryIndex: editing.index });
            }
            const fd = new FormData();
            fd.append("key", configKey);
            fd.append("payload", JSON.stringify(serializeConfig(nextConfig)));
            dispatch(fd);
          }}
          onRemove={() => {
            handleRemoveCategory(editing.index);
            setEditing(null);
          }}
          onCancel={() => setEditing(null)}
        />
      );
    }
  } else if (editing?.type === "study") {
    const category = config.categories[editing.categoryIndex];
    const study = category?.studies?.[editing.studyIndex];
    if (category && study) {
      dialog = (
        <CaseStudyEditorDialog
          value={study}
          scope={editing.scope}
          disableRemove={true}
          onSave={(next) => {
            const nextConfig = cloneConfig(config);
            const targetCategory = nextConfig.categories[editing.categoryIndex];
            if (targetCategory) {
              targetCategory.studies[editing.studyIndex] = next;
            }
            setConfig(nextConfig);
            const fd = new FormData();
            fd.append("key", configKey);
            fd.append("payload", JSON.stringify(serializeConfig(nextConfig)));
            dispatch(fd);
            setEditing(null);
          }}
          onRemove={() => {
            const nextStudyCount = Math.max(0, category.studies.length - 1);
            setConfig((prev) => {
              const nextConfig = cloneConfig(prev);
              const targetCategory = nextConfig.categories[editing.categoryIndex];
              if (targetCategory) {
                targetCategory.studies.splice(editing.studyIndex, 1);
              }
              return nextConfig;
            });
            setPreviewPage((prev) => {
              if (prev.view !== "study" || prev.categoryIndex !== editing.categoryIndex) {
                return prev;
              }
              if (!nextStudyCount) {
                return { view: "category", categoryIndex: editing.categoryIndex };
              }
              const safeStudyIndex = Math.min(editing.studyIndex, nextStudyCount - 1);
              return {
                view: "study",
                categoryIndex: editing.categoryIndex,
                studyIndex: safeStudyIndex,
              };
            });
            setEditing(null);
          }}
          onCancel={() => setEditing(null)}
        />
      );
    }
  }

  return (
    <div className="space-y-10">

      <CasesPreviewSurface
        config={config}
        selectedCategoryIndex={selectedCategoryIndex}
        previewPage={previewPage}
        onSelectCategory={setSelectedCategoryIndex}
        onNavigateCategory={handleNavigateCategoryPreview}
        onNavigateStudy={handleNavigateStudyPreview}
        onEditHero={() => setEditing({ type: "hero" })}
        onEditSectionHeading={() => setEditing({ type: "sectionHeading" })}
        onEditGeneral={() => setEditing({ type: "general" })}
        onEditRecommendations={() => setEditing({ type: "recommendations" })}
        onEditConsultation={() => setEditing({ type: "consultation" })}
        onEditGalleryLightbox={() => setEditing({ type: "galleryLightbox" })}
        onEditCategory={(index) => setEditing({ type: "category", index })}
        onEditStudy={(categoryIndex, studyIndex, scope) =>
          setEditing({ type: "study", categoryIndex, studyIndex, scope })
        }
        onAddCategory={handleAddCategory}
        onRemoveCategory={handleRemoveCategory}
        onReorderCategory={handleReorderCategory}
        onAddStudy={handleAddStudyConfig}
        onRemoveStudy={handleRemoveStudyConfig}
        onReorderStudy={handleReorderStudyConfig}
      />

      {dialog}
    </div>
  );
}
