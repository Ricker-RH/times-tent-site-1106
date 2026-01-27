"use client";

import Image from "next/image";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, RefObject } from "react";
import { createPortal, useFormState, useFormStatus } from "react-dom";

import type { HomeCompanyOverview, HomeInventoryHighlight, ProductMatrixSectionProps } from "@/components/home/ProductMatrixSection";
import { FALLBACK_HOME_CONFIG, FALLBACK_PRODUCT_CENTER_CONFIG } from "@/constants/siteFallbacks";
import { cases_config, products_cards } from "@/data/configs";
import type { CaseCategory, CasesConfig, HomeConfig, ProductCenterConfig, CaseStudy } from "@/server/pageConfigs";

import type { UpdateSiteConfigActionState } from "../actions";
import { updateSiteConfigAction } from "../actions";
import { useToast } from "@/providers/ToastProvider";
import { useLocalizedAutoTranslate } from "@/hooks/useLocalizedAutoTranslate";
import { useGlobalTranslationRegistrationForConfig } from "@/hooks/useGlobalTranslationManager";
import { ConfigPreviewFrame } from "./ConfigPreviewFrame";
import { EditorDialog } from "./EditorDialog";
import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  ensureArray,
  ensureLocalizedRecord,
  ensureString,
  getLocaleText,
  mergeMeta,
  setLocaleText,
  ensureLocalizedNoFallback,
  serializeLocalizedAllowEmpty,
} from "./editorUtils";
import HomeClient, {
  type HomeApplicationTab,
  type HomeHeroData,
  type HomeHeroSlide,
} from "../../../(site)/HomeClient";
import { ensureCompleteLocalizedField, type LocaleKey } from "@/i18n/locales";
import { useLocale } from "@/providers/LocaleProvider";

const LOCALES = SUPPORTED_LOCALES.map((code) => {
  switch (code) {
    case "zh-CN":
      return { code, label: "中文" } as const;
    case "zh-TW":
      return { code, label: "繁體" } as const;
    case "en":
      return { code, label: "English" } as const;
    default:
      return { code, label: code } as const;
  }
});

type LocalizedText = Record<LocaleKey, string>;

function createEmptyLocalized(defaultValue = ""): LocalizedText {
  const result = {} as LocalizedText;
  SUPPORTED_LOCALES.forEach((locale) => {
    result[locale] = defaultValue;
  });
  return result;
}

function normalizeLocalizedText(
  value: unknown,
  fallback: LocalizedText,
  legacy?: Partial<Record<LocaleKey, unknown>>,
): LocalizedText {
  const record = ensureLocalizedRecord(value);
  if (legacy) {
    Object.entries(legacy).forEach(([locale, legacyValue]) => {
      if (!SUPPORTED_LOCALES.includes(locale as LocaleKey)) return;
      if (typeof legacyValue !== "string") return;
      const trimmed = legacyValue.trim();
      if (trimmed) {
        record[locale] = trimmed;
      }
    });
  }
  // 无回退：保留原始空值，不注入默认或 legacy 文本
  const completedRecord = ensureLocalizedNoFallback(record);
  const completed: LocalizedText = createEmptyLocalized("");
  SUPPORTED_LOCALES.forEach((locale) => {
    completed[locale] = completedRecord[locale] ?? "";
  });
  return completed;
}

function isLocalizedEmpty(value: LocalizedText | null | undefined): boolean {
  if (!value) return true;
  return SUPPORTED_LOCALES.every((locale) => !value[locale]?.trim());
}

function cloneLocalized(value: LocalizedText | null | undefined, fallback = ""): LocalizedText {
  const sourceRecord = ensureLocalizedNoFallback(value ?? {});
  const clone = {} as LocalizedText;
  SUPPORTED_LOCALES.forEach((locale) => {
    clone[locale] = sourceRecord[locale] ?? "";
  });
  return clone;
}

function cloneCompanyOverviewState(value: CompanyOverviewState): CompanyOverviewState {
  return {
    title: cloneLocalized(value.title),
    hero: {
      title: cloneLocalized(value.hero.title),
      secondary: cloneLocalized(value.hero.secondary),
      description: cloneLocalized(value.hero.description),
      image: value.hero.image,
    },
    stats: value.stats.map((stat) => ({
      ...stat,
      label: cloneLocalized(stat.label),
    })),
    serviceHighlights: value.serviceHighlights.map((item) => ({
      ...item,
      title: cloneLocalized(item.title),
      description: cloneLocalized(item.description),
    })),
    capabilities: value.capabilities.map((item) => ({
      ...item,
      title: cloneLocalized(item.title),
      subtitle: cloneLocalized(item.subtitle),
      description: cloneLocalized(item.description),
      image: item.image,
    })),
    gallery: Array.isArray(value.gallery)
      ? value.gallery.map((item) => ({
          ...item,
          label: cloneLocalized(item.label),
          image: item.image,
        }))
      : [],
    capabilityHeading: cloneLocalized(value.capabilityHeading),
  } satisfies CompanyOverviewState;
}

function cloneApplicationAreasState(value: ApplicationAreasState): ApplicationAreasState {
  return {
    heading: cloneLocalized(value.heading),
    description: cloneLocalized(value.description),
    actionLabel: cloneLocalized(value.actionLabel),
    overlayEnabled: value.overlayEnabled !== false,
    selectedCategorySlugs: [...value.selectedCategorySlugs],
    items: value.items.map((item) => ({
      ...item,
      nameOverride: cloneLocalized(item.nameOverride),
      descriptionOverride: cloneLocalized(item.descriptionOverride),
      highlightOverride: cloneLocalized(item.highlightOverride),
    })),
  } satisfies ApplicationAreasState;
}

function cloneInventoryHighlightState(value: InventoryHighlightState): InventoryHighlightState {
  return {
    heading: cloneLocalized(value.heading),
    description: cloneLocalized(value.description),
    heroImage: value.heroImage,
    ctas: value.ctas.map((cta) => ({
      ...cta,
      label: cloneLocalized(cta.label),
    })),
  } satisfies InventoryHighlightState;
}

function cloneContactCtaState(value: ContactCtaState): ContactCtaState {
  return {
    eyebrow: cloneLocalized(value.eyebrow),
    title: cloneLocalized(value.title),
    description: cloneLocalized(value.description),
    primary: {
      href: value.primary.href ?? "",
      label: cloneLocalized(value.primary.label),
    },
    secondary: {
      href: value.secondary.href ?? "",
      label: cloneLocalized(value.secondary.label),
    },
  } satisfies ContactCtaState;
}

function cloneHeroState(value: HeroState): HeroState {
  return {
    badge: cloneLocalized(value.badge),
    title: cloneLocalized(value.title),
    description: cloneLocalized(value.description),
    ctaPrimary: cloneLocalized(value.ctaPrimary),
    ctaPrimaryHref: value.ctaPrimaryHref ?? "",
    ctaSecondary: cloneLocalized(value.ctaSecondary),
    ctaSecondaryHref: value.ctaSecondaryHref ?? "",
    highlights: cloneLocalized(value.highlights),
    overlayEnabled: value.overlayEnabled !== false,
    slides: value.slides.map((slide) => ({
      ...slide,
      eyebrow: cloneLocalized(slide.eyebrow),
      highlights: cloneLocalized(slide.highlights),
    })),
  } satisfies HeroState;
}

function serializeLocalizedField(value: LocalizedText): Record<string, string> {
  // 保留空值键以确保显式清空后的状态在序列化后仍可回显
  return serializeLocalizedAllowEmpty(value as Record<string, string>);
}

interface HeroSlideState {
  id: string;
  caseSlug: string;
  caseCategory: string;
  href: string;
  imageSrc: string;
  eyebrow: LocalizedText;
  highlights: LocalizedText;
}

interface HeroState {
  badge: LocalizedText;
  title: LocalizedText;
  description: LocalizedText;
  ctaPrimary: LocalizedText;
  ctaPrimaryHref: string;
  ctaSecondary: LocalizedText;
  ctaSecondaryHref: string;
  highlights: LocalizedText;
  slides: HeroSlideState[];
  overlayEnabled: boolean;
}

interface CompanyHeroState {
  title: LocalizedText;
  secondary: LocalizedText;
  description: LocalizedText;
  image: string;
}

interface CompanyStatState {
  id: string;
  label: LocalizedText;
  value: string;
}

interface CompanyHighlightState {
  id: string;
  title: LocalizedText;
  description: LocalizedText;
}

interface CompanyCapabilityState {
  id: string;
  title: LocalizedText;
  subtitle: LocalizedText;
  description: LocalizedText;
  image: string;
}

interface CompanyGalleryState {
  id: string;
  image: string;
  label: LocalizedText;
}

interface CompanyOverviewState {
  title: LocalizedText;
  hero: CompanyHeroState;
  stats: CompanyStatState[];
  serviceHighlights: CompanyHighlightState[];
  capabilities: CompanyCapabilityState[];
  gallery: CompanyGalleryState[];
  capabilityHeading: LocalizedText;
}

interface ProductCardState {
  id: string;
  productSlug: string;
  nameOverride: LocalizedText;
  imageOverride: string;
  summaryOverride: LocalizedText;
}

interface ProductShowcaseState {
  heading: LocalizedText;
  description: LocalizedText;
  cardCtaLabel: LocalizedText;
  selectedProductSlugs: string[];
  cards: ProductCardState[];
}

interface ProductOption {
  value: string;
  label: string;
  title: LocalizedText;
  summary: LocalizedText;
  tagline: LocalizedText;
}

interface ApplicationItemState {
  id: string;
  areaKey: string;
  imageOverride: string;
  nameOverride: LocalizedText;
  nameOverrideEnabled: boolean;
  descriptionOverride: LocalizedText;
  descriptionOverrideEnabled: boolean;
  highlightOverride: LocalizedText;
  highlightOverrideEnabled: boolean;
}

interface ApplicationAreasState {
  heading: LocalizedText;
  description: LocalizedText;
  actionLabel: LocalizedText;
  overlayEnabled: boolean;
  selectedCategorySlugs: string[];
  items: ApplicationItemState[];
}

interface InventoryCtaState {
  id: string;
  href: string;
  label: LocalizedText;
}

interface InventoryHighlightState {
  heading: LocalizedText;
  description: LocalizedText;
  heroImage: string;
  ctas: InventoryCtaState[];
}

interface ContactCtaActionState {
  href: string;
  label: LocalizedText;
}

interface ContactCtaState {
  eyebrow: LocalizedText;
  title: LocalizedText;
  description: LocalizedText;
  primary: ContactCtaActionState;
  secondary: ContactCtaActionState;
}

type HomeHeroSlideConfig = NonNullable<NonNullable<HomeConfig["hero"]>["slides"]>[number];
type HomeCompanyOverviewConfig = NonNullable<HomeConfig["companyOverview"]>;
type HomeProductShowcaseConfig = NonNullable<HomeConfig["productShowcase"]>;
type HomeApplicationAreasConfig = NonNullable<HomeConfig["applicationAreas"]>;
type HomeInventoryHighlightConfig = NonNullable<HomeConfig["inventoryHighlight"]>;

interface HomeConfigState {
  hero: HeroState;
  companyOverview: CompanyOverviewState;
  productShowcase: ProductShowcaseState;
  applicationAreas: ApplicationAreasState;
  inventoryHighlight: InventoryHighlightState;
  contactCta: ContactCtaState;
  _meta?: Record<string, unknown>;
}

type HeroScope = "copy" | "cta" | "slides" | "full";
type CompanyScope = "overview" | "stats" | "highlights" | "capabilities" | "gallery" | "full";
type ProductScope = "copy" | "selection" | "cards" | "full";
type ApplicationScope = "copy" | "selection" | "items" | "full";
type InventoryScope = "copy" | "ctas" | "full";
type ContactCtaScope = "copy" | "actions" | "full";

type EditingTarget =
  | { type: "hero"; scope: HeroScope }
  | { type: "company"; scope: CompanyScope }
  | { type: "product"; scope: ProductScope }
  | { type: "applications"; scope: ApplicationScope }
  | { type: "inventory"; scope: InventoryScope }
  | { type: "contactCta"; scope: ContactCtaScope };

interface CaseStudyOption {
  value: string;
  label: string;
  category: string;
  href: string;
}

const DEFAULT_PRODUCT_OPTIONS: ProductOption[] = products_cards.map((product) => {
  const slug = ensureString(product.href).split("/").pop() ?? "";
  const title = ensureCompleteLocalizedField(product.title, slug || "产品");
  const summary = ensureCompleteLocalizedField(product.description, "");
  const tagline = ensureCompleteLocalizedField(product.tagline, "");
  return {
    value: slug,
    label: getLocaleText(title, undefined, slug || "产品"),
    title,
    summary,
    tagline,
  };
});


function clean(value: string): string {
  return value.trim();
}

function optional(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function ensureObject<T>(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function makeStableId(prefix: string, seed: string, index: number): string {
  const base = seed.trim().replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return `${prefix}-${base || index}`;
}

function createId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`;
}

function normalizeHeroSlide(raw: unknown, index: number, caseStudyLookup: Map<string, CaseStudyOption>): HeroSlideState {
  const slide = ensureObject(raw);
  const caseRef = ensureObject(slide.caseRef);
  const imageOverride = ensureObject(slide.imageOverride);
  const caseSlug = ensureString(caseRef.slug);
  const fallbackCase = caseSlug ? caseStudyLookup.get(caseSlug) : undefined;
  const caseCategory = ensureString(caseRef.category) || fallbackCase?.category || "";
  const href = ensureString(slide.href) || fallbackCase?.href || "";

  const eyebrow = normalizeLocalizedText(slide.eyebrowOverride, createEmptyLocalized(""));

  const rawHighlightsI18n = ensureArray<unknown>((slide as any).highlightsOverrideI18n);
  const rawHighlights = ensureArray<string>(slide.highlightsOverride);
  let highlights: LocalizedText;
  if (rawHighlightsI18n.length) {
    const byLocale = {} as Record<LocaleKey, string[]>;
    SUPPORTED_LOCALES.forEach((locale) => (byLocale[locale] = []));
    rawHighlightsI18n.forEach((item) => {
      if (typeof item === "string") {
        const cleaned = clean(item);
        if (cleaned) byLocale[DEFAULT_LOCALE].push(cleaned);
        return;
      }
      const rec = ensureLocalizedRecord(item);
      SUPPORTED_LOCALES.forEach((locale) => {
        const t = rec[locale]?.trim();
        if (t) byLocale[locale].push(clean(t));
      });
    });
    const result = createEmptyLocalized("");
    SUPPORTED_LOCALES.forEach((locale) => {
      result[locale] = byLocale[locale].join(",");
    });
    highlights = result;
  } else {
    const defaultValue = rawHighlights.map(clean).filter(Boolean).join(",");
    highlights = createEmptyLocalized(defaultValue);
  }

  return {
    id: makeStableId("hero-slide", caseSlug || href, index),
    caseSlug,
    caseCategory,
    href,
    imageSrc: ensureString(imageOverride.src),
    eyebrow,
    highlights,
  } satisfies HeroSlideState;
}

function normalizeHero(
  raw: unknown,
  caseCategoryOptions: { value: string; label: string }[],
  caseStudyLookup: Map<string, CaseStudyOption>
): HeroState {
  const hero = ensureObject(raw);
  const fallbackHero = FALLBACK_HOME_CONFIG.hero ?? {};
  const fallbackBadge = ensureCompleteLocalizedField(
    (fallbackHero as Record<string, unknown>).badge,
    "模块化临建 · 极速交付",
  ) as LocalizedText;
  const fallbackTitle = ensureCompleteLocalizedField(
    (fallbackHero as Record<string, unknown>).title,
    "时代篷房",
  ) as LocalizedText;
  const fallbackDescription = ensureCompleteLocalizedField(
    (fallbackHero as Record<string, unknown>).description,
    "撑起每个重要时刻 — 专业铝合金篷房设计 · 制造 · 方案交付。",
  ) as LocalizedText;
  const fallbackPrimary = ensureCompleteLocalizedField(
    (fallbackHero as Record<string, unknown>).ctaPrimary,
    "查看详情",
  ) as LocalizedText;
  const fallbackSecondary = ensureCompleteLocalizedField(
    (fallbackHero as Record<string, unknown>).ctaSecondary,
    "更多案例",
  ) as LocalizedText;
  const fallbackOverlayEnabled =
    typeof (fallbackHero as Record<string, unknown>)?.overlayEnabled === "boolean"
      ? Boolean((fallbackHero as Record<string, unknown>).overlayEnabled)
      : true;
  const badgeLegacy: Partial<Record<LocaleKey, unknown>> = {
    en: hero.badgeEn,
    "zh-TW": (hero as Record<string, unknown>)["badgeZhTw"],
  };
  const titleLegacy: Partial<Record<LocaleKey, unknown>> = {
    en: hero.titleEn,
    "zh-TW": (hero as Record<string, unknown>)["titleZhTw"],
  };
  const descriptionLegacy: Partial<Record<LocaleKey, unknown>> = {
    en: hero.descriptionEn,
    "zh-TW": (hero as Record<string, unknown>)["descriptionZhTw"],
  };
  const primaryLegacy: Partial<Record<LocaleKey, unknown>> = {
    en: (hero as Record<string, unknown>)["ctaPrimaryEn"],
    "zh-TW": (hero as Record<string, unknown>)["ctaPrimaryZhTw"],
  };
  const secondaryLegacy: Partial<Record<LocaleKey, unknown>> = {
    en: (hero as Record<string, unknown>)["ctaSecondaryEn"],
    "zh-TW": (hero as Record<string, unknown>)["ctaSecondaryZhTw"],
  };
  const slidesNormalized = ensureArray(hero.slides).map((slide, index) =>
    normalizeHeroSlide(slide, index, caseStudyLookup)
  );
  const initialHighlights = slidesNormalized[0]?.highlights ?? createEmptyLocalized("");
  const rawHighlights = (hero as Record<string, unknown>).highlights as Record<string, unknown> | undefined;
  const hasAnyRawHighlights = !!rawHighlights && SUPPORTED_LOCALES.some((locale) => {
    const v = rawHighlights[locale];
    return typeof v === "string" && (v as string).trim().length > 0;
  });
  const highlights = hasAnyRawHighlights
    ? normalizeLocalizedText(rawHighlights, initialHighlights)
    : cloneLocalized(initialHighlights);
  return {
    badge: normalizeLocalizedText(hero.badge, fallbackBadge, badgeLegacy),
    title: normalizeLocalizedText(hero.title, fallbackTitle, titleLegacy),
    description: normalizeLocalizedText(hero.description, fallbackDescription, descriptionLegacy),
    ctaPrimary: normalizeLocalizedText(hero.ctaPrimary, fallbackPrimary, primaryLegacy),
    ctaPrimaryHref: ensureString(hero.ctaPrimaryHref),
    ctaSecondary: normalizeLocalizedText(hero.ctaSecondary, fallbackSecondary, secondaryLegacy),
    ctaSecondaryHref: ensureString(hero.ctaSecondaryHref),
    highlights,
    overlayEnabled: typeof hero.overlayEnabled === "boolean" ? hero.overlayEnabled : fallbackOverlayEnabled,
    slides: slidesNormalized,
  } satisfies HeroState;
}

function normalizeCompanyHero(raw: unknown, fallback?: Record<string, unknown>): CompanyHeroState {
  const hero = ensureObject(raw);
  const empty = createEmptyLocalized("");
  const titleLegacy: Partial<Record<LocaleKey, unknown>> = {
    en: hero.titleEn,
    "zh-TW": (hero as Record<string, unknown>)["titleZhTw"],
  };
  const secondaryLegacy: Partial<Record<LocaleKey, unknown>> = {
    en: hero.secondaryEn,
    "zh-TW": (hero as Record<string, unknown>)["secondaryZhTw"],
  };
  const descriptionLegacy: Partial<Record<LocaleKey, unknown>> = {
    en: hero.descriptionEn,
    "zh-TW": (hero as Record<string, unknown>)["descriptionZhTw"],
  };
  return {
    title: normalizeLocalizedText(hero.title, empty, titleLegacy),
    secondary: normalizeLocalizedText(hero.secondary, empty, secondaryLegacy),
    description: normalizeLocalizedText(hero.description, empty, descriptionLegacy),
    image: ensureString(hero.image),
  } satisfies CompanyHeroState;
}

function normalizeCompanyOverview(raw: unknown): CompanyOverviewState {
  const overview = ensureObject(raw);
  const empty = createEmptyLocalized("");

  const titleLegacy: Partial<Record<LocaleKey, unknown>> = {
    en: overview.titleEn,
    "zh-TW": (overview as Record<string, unknown>)["titleZhTw"],
  };

  const capabilityHeadingLegacy: Partial<Record<LocaleKey, unknown>> = {
    en: (overview as Record<string, unknown>)["capabilityHeadingEn"],
    "zh-TW": (overview as Record<string, unknown>)["capabilityHeadingZhTw"],
  };

  const rawStats = ensureArray(overview.stats);
  const stats = rawStats.map((stat, index) => {
    const record = ensureObject(stat);
    const labelLegacy: Partial<Record<LocaleKey, unknown>> = {
      en: record.labelEn,
      "zh-TW": (record as Record<string, unknown>)["labelZhTw"],
    };
    const labelSeed = ensureString(record.label) || `company-stat-${index + 1}`;
    return {
      id: makeStableId("company-stat", labelSeed, index),
      label: normalizeLocalizedText(record.label, empty, labelLegacy),
      value: ensureString(record.value) || "",
    } satisfies CompanyStatState;
  });

  const rawHighlights = ensureArray(overview.serviceHighlights);
  const serviceHighlights = rawHighlights.map((highlight, index) => {
    const record = ensureObject(highlight);
    const highlightTitleLegacy: Partial<Record<LocaleKey, unknown>> = {
      en: record.titleEn,
      "zh-TW": (record as Record<string, unknown>)["titleZhTw"],
    };
    const descriptionSource = record.description ?? record.subtitle;
    const descriptionLegacy: Partial<Record<LocaleKey, unknown>> = {
      en: record.descriptionEn ?? record.subtitleEn,
      "zh-TW":
        (record as Record<string, unknown>)["descriptionZhTw"] ??
        (record as Record<string, unknown>)["subtitleZhTw"],
    };
    const highlightSeed = ensureString(record.title) || `company-highlight-${index + 1}`;
    return {
      id: makeStableId("company-highlight", highlightSeed, index),
      title: normalizeLocalizedText(record.title, empty, highlightTitleLegacy),
      description: normalizeLocalizedText(descriptionSource, empty, descriptionLegacy),
    } satisfies CompanyHighlightState;
  });

  const rawCapabilities = ensureArray(overview.capabilities);
  const capabilities = rawCapabilities.map((capability, index) => {
    const record = ensureObject(capability);
    const capabilityTitleLegacy: Partial<Record<LocaleKey, unknown>> = {
      en: record.titleEn,
      "zh-TW": (record as Record<string, unknown>)["titleZhTw"],
    };
    const capabilitySubtitleLegacy: Partial<Record<LocaleKey, unknown>> = {
      en: record.subtitleEn,
      "zh-TW": (record as Record<string, unknown>)["subtitleZhTw"],
    };
    const capabilityDescriptionLegacy: Partial<Record<LocaleKey, unknown>> = {
      en: record.descriptionEn,
      "zh-TW": (record as Record<string, unknown>)["descriptionZhTw"],
    };
    const capabilitySeed = ensureString(record.title) || `company-capability-${index + 1}`;
    return {
      id: makeStableId("company-capability", capabilitySeed, index),
      title: normalizeLocalizedText(record.title, empty, capabilityTitleLegacy),
      subtitle: normalizeLocalizedText(record.subtitle, empty, capabilitySubtitleLegacy),
      description: normalizeLocalizedText(record.description, empty, capabilityDescriptionLegacy),
      image: ensureString(record.image),
    } satisfies CompanyCapabilityState;
  });

  const rawGallery = ensureArray(overview.gallery);
  const normalizedGallery = rawGallery.map((item, index) => {
    const record = ensureObject(item);
    const labelLegacy: Partial<Record<LocaleKey, unknown>> = {
      en: record.labelEn,
      "zh-TW": (record as Record<string, unknown>)["labelZhTw"],
    };
    const labelSeed = ensureString(record.label) || `company-gallery-${index + 1}`;
    return {
      id: makeStableId("company-gallery", labelSeed, index),
      image: ensureString(record.image),
      label: normalizeLocalizedText(record.label, empty, labelLegacy),
    } satisfies CompanyGalleryState;
  });

  const overviewTitle = normalizeLocalizedText(overview.title, empty, titleLegacy);
  const capabilityHeading = normalizeLocalizedText(
    (overview as Record<string, unknown>)["capabilityHeading"],
    empty,
    capabilityHeadingLegacy,
  );

  return {
    title: overviewTitle,
    hero: normalizeCompanyHero(overview.hero),
    stats,
    serviceHighlights,
    capabilities,
    gallery: normalizedGallery,
    capabilityHeading,
  } satisfies CompanyOverviewState;
}

function normalizeProductShowcase(raw: unknown, productOptions: ProductOption[]): ProductShowcaseState {
  const showcase = ensureObject(raw);
  const empty = createEmptyLocalized("");

  const selectedProductSlugs = Array.from(
    new Set(
      ensureArray<string>(showcase.selectedProductSlugs)
        .map((slug) => ensureString(slug))
        .filter(Boolean)
        .map(clean),
    ),
  );

  const optionMap = new Map(productOptions.map((option) => [option.value, option]));

  const normalizedCards = ensureArray(showcase.cards).map((card, index) => {
    const record = ensureObject(card);
    const slug = ensureString(record.productSlug);
    const nameLegacy: Partial<Record<LocaleKey, unknown>> = {
      en: record.nameEnOverride,
      "zh-TW": (record as Record<string, unknown>)["nameZhTw"],
    };
    const summaryLegacy: Partial<Record<LocaleKey, unknown>> = {
      en: record.summaryEnOverride,
      "zh-TW": (record as Record<string, unknown>)["summaryZhTw"],
    };
    return {
      id: makeStableId("product-card", slug, index),
      productSlug: slug,
      nameOverride: normalizeLocalizedText(record.nameOverride, empty, nameLegacy),
      imageOverride: ensureString(record.imageOverride),
      summaryOverride: normalizeLocalizedText(record.summaryOverride, empty, summaryLegacy),
    } satisfies ProductCardState;
  });

  const optionSlugs = new Set(productOptions.map((option) => clean(option.value)));
  const overrideSlugs = new Set(normalizedCards.map((card) => clean(card.productSlug)).filter(Boolean));
  const allowedSlugs = new Set(Array.from(new Set([...optionSlugs, ...overrideSlugs])).filter(Boolean));
  const effectiveSelectedProductSlugs = allowedSlugs.size
    ? selectedProductSlugs.filter((slug) => allowedSlugs.has(slug))
    : selectedProductSlugs;

  return {
    heading: normalizeLocalizedText(
      showcase.heading,
      empty,
      {
        en: showcase.headingEn,
        "zh-TW": (showcase as Record<string, unknown>)["headingZhTw"],
      },
    ),
    description: normalizeLocalizedText(
      (showcase as Record<string, unknown>)["description"],
      empty,
      {
        en: (showcase as Record<string, unknown>)["descriptionEn"],
        "zh-TW": (showcase as Record<string, unknown>)["descriptionZhTw"],
      },
    ),
    cardCtaLabel: normalizeLocalizedText(
      showcase.cardCtaLabel,
      empty,
      {
        en: showcase.cardCtaLabelEn,
        "zh-TW": (showcase as Record<string, unknown>)["cardCtaLabelZhTw"],
      },
    ),
    selectedProductSlugs: effectiveSelectedProductSlugs,
    cards: normalizedCards,
  } satisfies ProductShowcaseState;
}

function normalizeApplicationAreas(raw: unknown, caseCategoryOptions: { value: string; label: string }[]): ApplicationAreasState {
  const application = ensureObject(raw);
  const fallback = ensureObject(FALLBACK_HOME_CONFIG.applicationAreas);
  const fallbackHeading = ensureCompleteLocalizedField(
    (fallback as Record<string, unknown>).heading,
    "五大核心应用场景",
  ) as LocalizedText;
  const fallbackDescription = ensureCompleteLocalizedField(
    (fallback as Record<string, unknown>).description,
    "",
  ) as LocalizedText;
  const fallbackActionLabel = ensureCompleteLocalizedField(
    (fallback as Record<string, unknown>).actionLabel,
    "查看详情",
  ) as LocalizedText;
  const fallbackOverlayEnabled =
    typeof (fallback as Record<string, unknown>).overlayEnabled === "boolean"
      ? Boolean((fallback as Record<string, unknown>).overlayEnabled)
      : true;
  const fallbackItems = new Map(
    ensureArray(fallback.items)
      .map((item) => {
        const record = ensureObject(item);
        const key = ensureString(record.areaKey);
        return key ? [key, record] : null;
      })
      .filter((entry): entry is [string, Record<string, unknown>] => Boolean(entry)),
  );

  const hasOwn = (record: Record<string, unknown>, keys: string[]): boolean =>
    keys.some((key) => Object.prototype.hasOwnProperty.call(record, key));

  return {
    heading: normalizeLocalizedText(application.heading, fallbackHeading, {
      en: application.headingEn,
      "zh-TW": (application as Record<string, unknown>)["headingZhTw"],
    }),
    description: normalizeLocalizedText(application.description, fallbackDescription, {
      en: application.descriptionEn,
      "zh-TW": (application as Record<string, unknown>)["descriptionZhTw"],
    }),
    actionLabel: normalizeLocalizedText(application.actionLabel, fallbackActionLabel, {
      en: application.actionLabelEn,
      "zh-TW": (application as Record<string, unknown>)["actionLabelZhTw"],
    }),
    overlayEnabled:
      typeof application.overlayEnabled === "boolean"
        ? application.overlayEnabled
        : fallbackOverlayEnabled,
    selectedCategorySlugs: ensureArray<string>(application.selectedCategorySlugs)
      .map((slug) => ensureString(slug))
      .filter(Boolean),
    items: ensureArray(application.items).map((item, index) => {
      const record = ensureObject(item);
      const areaKey = ensureString(record.areaKey);
      const fallbackCard = areaKey ? fallbackItems.get(areaKey) : undefined;
      const fallbackName = fallbackCard
        ? (ensureCompleteLocalizedField((fallbackCard as Record<string, unknown>).nameOverride, "") as LocalizedText)
        : createEmptyLocalized("");
      const fallbackDescriptionOverride = fallbackCard
        ? (ensureCompleteLocalizedField((fallbackCard as Record<string, unknown>).descriptionOverride, "") as LocalizedText)
        : createEmptyLocalized("");
      const fallbackHighlight = fallbackCard
        ? (ensureCompleteLocalizedField((fallbackCard as Record<string, unknown>).highlightOverride, "") as LocalizedText)
        : createEmptyLocalized("");

      const nameOverride = normalizeLocalizedText(record.nameOverride, fallbackName, {
        en: record.nameEnOverride,
        "zh-TW": (record as Record<string, unknown>)["nameZhTw"],
      });
      const descriptionOverride = normalizeLocalizedText(record.descriptionOverride, fallbackDescriptionOverride, {
        en: record.descriptionEnOverride,
        "zh-TW": (record as Record<string, unknown>)["descriptionZhTw"],
      });
      const highlightOverride = normalizeLocalizedText(record.highlightOverride, fallbackHighlight, {
        en: record.highlightEnOverride,
        "zh-TW": (record as Record<string, unknown>)["highlightZhTw"],
      });

      return {
        id: makeStableId("application-item", areaKey, index),
        areaKey,
        imageOverride: ensureString(record.imageOverride),
        nameOverride,
        nameOverrideEnabled: hasOwn(record, ["nameOverride", "nameEnOverride", "nameZhTw"]),
        descriptionOverride,
        descriptionOverrideEnabled: hasOwn(record, ["descriptionOverride", "descriptionEnOverride", "descriptionZhTw"]),
        highlightOverride,
        highlightOverrideEnabled: hasOwn(record, ["highlightOverride", "highlightEnOverride", "highlightZhTw"]),
      } satisfies ApplicationItemState;
    }),
  } satisfies ApplicationAreasState;
}

function normalizeInventoryHighlight(raw: unknown): InventoryHighlightState {
  const highlight = ensureObject(raw);
  const fallback = ensureObject(FALLBACK_HOME_CONFIG.inventoryHighlight);
  const fallbackHeading = ensureCompleteLocalizedField(
    (fallback as Record<string, unknown>).heading,
    "现货库存",
  ) as LocalizedText;
  const fallbackDescription = ensureCompleteLocalizedField(
    (fallback as Record<string, unknown>).description,
    "",
  ) as LocalizedText;
  const fallbackCtas = ensureArray(fallback.ctas).map((cta) => ensureObject(cta));

  const normalizedCtasSource = ensureArray(highlight.ctas);
  const sourceCtas = normalizedCtasSource.length ? normalizedCtasSource : fallbackCtas;

  return {
    heading: normalizeLocalizedText(highlight.heading, fallbackHeading, {
      en: highlight.headingEn,
      "zh-TW": (highlight as Record<string, unknown>)["headingZhTw"],
    }),
    description: normalizeLocalizedText(highlight.description, fallbackDescription, {
      en: highlight.descriptionEn,
      "zh-TW": (highlight as Record<string, unknown>)["descriptionZhTw"],
    }),
    heroImage: ensureString(highlight.heroImage) || ensureString(fallback.heroImage) || "",
    ctas: sourceCtas.map((cta, index) => {
      const record = ensureObject(cta);
      const fallbackCta = fallbackCtas[index] ?? fallbackCtas[0] ?? null;
      const fallbackLabel = fallbackCta
        ? (ensureCompleteLocalizedField(fallbackCta.label, ensureString(fallbackCta.label) || "") as LocalizedText)
        : createEmptyLocalized("");
      const label = normalizeLocalizedText(record.label, fallbackLabel, {
        en: record.labelEn,
        "zh-TW": (record as Record<string, unknown>)["labelZhTw"],
      });
      const href = ensureString(record.href) || (fallbackCta ? ensureString(fallbackCta.href) : undefined) || "/inventory";
      return {
        id: makeStableId("inventory-cta", href, index),
        href,
        label,
      } satisfies InventoryCtaState;
    }),
  } satisfies InventoryHighlightState;
}

function normalizeContactCta(raw: unknown): ContactCtaState {
  const source = ensureObject(raw);
  const fallback = ensureObject(FALLBACK_HOME_CONFIG.contactCta);

  const fallbackEyebrow = ensureCompleteLocalizedField(
    (fallback as Record<string, unknown>).eyebrow,
    "",
  ) as LocalizedText;
  const fallbackTitle = ensureCompleteLocalizedField(
    (fallback as Record<string, unknown>).title,
    "",
  ) as LocalizedText;
  const fallbackDescription = ensureCompleteLocalizedField(
    (fallback as Record<string, unknown>).description,
    "",
  ) as LocalizedText;

  const fallbackPrimary = ensureObject(fallback.primary);
  const fallbackSecondary = ensureObject(fallback.secondary);

  const sourcePrimary = ensureObject(source.primary);
  const sourceSecondary = ensureObject(source.secondary);

  return {
    eyebrow: normalizeLocalizedText(source.eyebrow, fallbackEyebrow, {
      en: (source as Record<string, unknown>).eyebrowEn,
      "zh-TW": (source as Record<string, unknown>)["eyebrowZhTw"],
    }),
    title: normalizeLocalizedText(source.title, fallbackTitle, {
      en: (source as Record<string, unknown>).titleEn,
      "zh-TW": (source as Record<string, unknown>)["titleZhTw"],
    }),
    description: normalizeLocalizedText(source.description, fallbackDescription, {
      en: (source as Record<string, unknown>).descriptionEn,
      "zh-TW": (source as Record<string, unknown>)["descriptionZhTw"],
    }),
    primary: {
      href: ensureString(sourcePrimary.href) || ensureString(source.primaryHref) || ensureString(fallbackPrimary.href) || "/contact",
      label: normalizeLocalizedText(sourcePrimary.label, ensureCompleteLocalizedField(fallbackPrimary.label, ensureString(fallbackPrimary.label) || "") as LocalizedText, {
        en: (sourcePrimary as Record<string, unknown>).labelEn,
        "zh-TW": (sourcePrimary as Record<string, unknown>)["labelZhTw"],
      }),
    },
    secondary: {
      href: ensureString(sourceSecondary.href) || ensureString(source.secondaryHref) || ensureString(fallbackSecondary.href) || "/about",
      label: normalizeLocalizedText(sourceSecondary.label, ensureCompleteLocalizedField(fallbackSecondary.label, ensureString(fallbackSecondary.label) || "") as LocalizedText, {
        en: (sourceSecondary as Record<string, unknown>).labelEn,
        "zh-TW": (sourceSecondary as Record<string, unknown>)["labelZhTw"],
      }),
    },
  } satisfies ContactCtaState;
}

function normalizeConfig(
  raw: Record<string, unknown>,
  productOptions: ProductOption[],
  caseCategoryOptions: { value: string; label: string }[],
  caseStudyLookup: Map<string, CaseStudyOption>
): HomeConfigState {
  const hero = normalizeHero(raw.hero, caseCategoryOptions, caseStudyLookup);
  const companyOverview = normalizeCompanyOverview(raw.companyOverview);
  const productShowcase = normalizeProductShowcase(raw.productShowcase, productOptions);
  const applicationAreas = normalizeApplicationAreas(raw.applicationAreas, caseCategoryOptions);
  const inventoryHighlight = normalizeInventoryHighlight(raw.inventoryHighlight);
  const contactCta = normalizeContactCta(raw.contactCta);
  const meta = raw._meta && typeof raw._meta === "object" ? (raw._meta as Record<string, unknown>) : undefined;

  return {
    hero,
    companyOverview,
    productShowcase,
    applicationAreas,
    inventoryHighlight,
    contactCta,
    _meta: meta ? { ...meta } : undefined,
  } satisfies HomeConfigState;
}

function serializeHeroSlide(slide: HeroSlideState): HomeHeroSlideConfig {
  const caseRef = slide.caseSlug || slide.caseCategory ? { slug: optional(slide.caseSlug), category: optional(slide.caseCategory) } : undefined;
  const imageOverride = slide.imageSrc ? { src: optional(slide.imageSrc) } : undefined;
  const result: HomeHeroSlideConfig = {};
  if (caseRef && (caseRef.slug || caseRef.category)) {
    result.caseRef = caseRef;
  }
  if (optional(slide.href)) {
    result.href = optional(slide.href);
  }
  if (imageOverride && imageOverride.src) {
    result.imageOverride = imageOverride;
  }

  const eyebrowField = serializeLocalizedField(slide.eyebrow);
  if (eyebrowField && Object.keys(eyebrowField).length > 0) {
    (result as any).eyebrowOverride = eyebrowField;
  }

  const tokensByLocale: Record<LocaleKey, string[]> = Object.fromEntries(
    SUPPORTED_LOCALES.map((l) => [l, [] as string[]]),
  ) as Record<LocaleKey, string[]>;
  SUPPORTED_LOCALES.forEach((locale) => {
    const raw = ensureString(slide.highlights?.[locale] ?? "");
    tokensByLocale[locale] = raw.split(",").map((v) => clean(v)).filter(Boolean);
  });
  const maxLen = Math.max(0, ...SUPPORTED_LOCALES.map((l) => tokensByLocale[l].length));
  const highlightsOverrideI18n: Array<string | Record<string, string>> = [];
  for (let i = 0; i < maxLen; i++) {
    const rec: Record<string, string> = {};
    SUPPORTED_LOCALES.forEach((locale) => {
      const token = tokensByLocale[locale][i];
      if (token) rec[locale] = token;
    });
    const keys = Object.keys(rec);
    if (keys.length === 0) continue;
    if (keys.length === 1 && keys[0] === DEFAULT_LOCALE) {
      highlightsOverrideI18n.push(rec[DEFAULT_LOCALE]);
    } else {
      highlightsOverrideI18n.push(rec);
    }
  }
  // 始终写入覆写字段：当为空时也保存为空数组，表示显式禁用回退
  (result as any).highlightsOverrideI18n = highlightsOverrideI18n;
  result.highlightsOverride = tokensByLocale[DEFAULT_LOCALE];
  return result;
}

function serializeConfig(config: HomeConfigState): HomeConfig {
  const heroBadgeField = serializeLocalizedField(config.hero.badge);
  const heroTitleField = serializeLocalizedField(config.hero.title);
  const heroDescriptionField = serializeLocalizedField(config.hero.description);
  const heroPrimaryField = serializeLocalizedField(config.hero.ctaPrimary);
  const heroSecondaryField = serializeLocalizedField(config.hero.ctaSecondary);

  const hero: HomeConfig["hero"] = {
    ...(optional(config.hero.ctaPrimaryHref) ? { ctaPrimaryHref: optional(config.hero.ctaPrimaryHref) } : {}),
    ...(optional(config.hero.ctaSecondaryHref) ? { ctaSecondaryHref: optional(config.hero.ctaSecondaryHref) } : {}),
    slides: config.hero.slides
      .map((slide) => serializeHeroSlide({ ...slide, highlights: config.hero.highlights }))
      .filter((slide) => Object.keys(slide).length > 0),
    overlayEnabled: config.hero.overlayEnabled !== false,
  };

  if (heroBadgeField) {
    hero.badge = heroBadgeField;
    const legacy = heroBadgeField["en"]?.trim();
    if (legacy) {
      hero.badgeEn = legacy;
    }
  } else if (isLocalizedEmpty(config.hero.badge)) {
    // 显式置空：当所有语言均为空时，写入 null 以阻止站点端回退
    hero.badge = null;
  }

  if (heroTitleField) {
    hero.title = heroTitleField;
    const legacy = heroTitleField["en"]?.trim();
    if (legacy) {
      hero.titleEn = legacy;
    }
  } else if (isLocalizedEmpty(config.hero.title)) {
    hero.title = undefined;
  }

  if (heroDescriptionField) {
    hero.description = heroDescriptionField;
    const legacy = heroDescriptionField["en"]?.trim();
    if (legacy) {
      hero.descriptionEn = legacy;
    }
  } else if (isLocalizedEmpty(config.hero.description)) {
    hero.description = undefined;
  }

  if (heroPrimaryField) {
    hero.ctaPrimary = heroPrimaryField;
    const legacy = heroPrimaryField["en"]?.trim();
    if (legacy) {
      hero.ctaPrimaryEn = legacy;
    }
  } else if (isLocalizedEmpty(config.hero.ctaPrimary)) {
    hero.ctaPrimary = undefined;
  }

  if (heroSecondaryField) {
    hero.ctaSecondary = heroSecondaryField;
    const legacy = heroSecondaryField["en"]?.trim();
    if (legacy) {
      hero.ctaSecondaryEn = legacy;
    }
  } else if (isLocalizedEmpty(config.hero.ctaSecondary)) {
    hero.ctaSecondary = undefined;
  }

  const companyOverview: HomeCompanyOverviewConfig = {};

  const companyTitleField = serializeLocalizedField(config.companyOverview.title);
  if (companyTitleField) {
    companyOverview.title = companyTitleField;
    const legacy = companyTitleField.en?.trim();
    if (legacy) {
      companyOverview.titleEn = legacy;
    }
  }

  const heroSource = config.companyOverview.hero;
  if (heroSource) {
    const heroConfig: NonNullable<HomeCompanyOverviewConfig["hero"]> = {};

    const heroTitleField = serializeLocalizedField(heroSource.title);
    if (heroTitleField) {
      heroConfig.title = heroTitleField;
      const legacy = heroTitleField.en?.trim();
      if (legacy) {
        heroConfig.titleEn = legacy;
      }
    }
    const heroSecondaryField = serializeLocalizedField(heroSource.secondary);
    if (heroSecondaryField) {
      heroConfig.secondary = heroSecondaryField;
      const legacy = heroSecondaryField.en?.trim();
      if (legacy) {
        heroConfig.secondaryEn = legacy;
      }
    }
    const heroDescriptionField = serializeLocalizedField(heroSource.description);
    if (heroDescriptionField) {
      heroConfig.description = heroDescriptionField;
      const legacy = heroDescriptionField.en?.trim();
      if (legacy) {
        heroConfig.descriptionEn = legacy;
      }
    }
    if (optional(heroSource.image)) {
      heroConfig.image = optional(heroSource.image);
    }
    if (Object.keys(heroConfig).length) {
      companyOverview.hero = heroConfig;
    }
  }

  const stats = config.companyOverview.stats
    .map((stat) => {
      const entry: NonNullable<HomeCompanyOverviewConfig["stats"]>[number] = {};
      const labelField = serializeLocalizedField(stat.label);
      if (labelField) {
        entry.label = labelField;
        const legacy = labelField.en?.trim();
        if (legacy) {
          entry.labelEn = legacy;
        }
      }
      if (optional(stat.value)) {
        entry.value = optional(stat.value);
      }
      return entry;
    })
    .filter((stat) => Object.keys(stat).length > 0);
  if (stats.length) {
    companyOverview.stats = stats;
  }

  const capabilityHeadingField = serializeLocalizedField(config.companyOverview.capabilityHeading);
  if (capabilityHeadingField) {
    companyOverview.capabilityHeading = capabilityHeadingField;
    const legacy = capabilityHeadingField.en?.trim();
    if (legacy) {
      companyOverview.capabilityHeadingEn = legacy;
    }
  }

  const serviceHighlights = config.companyOverview.serviceHighlights
    .map((highlight) => {
      const entry: NonNullable<HomeCompanyOverviewConfig["serviceHighlights"]>[number] = {};
      const titleField = serializeLocalizedField(highlight.title);
      if (titleField) {
        entry.title = titleField;
        const legacy = titleField.en?.trim();
        if (legacy) {
          entry.titleEn = legacy;
        }
      }
      const descriptionField = serializeLocalizedField(highlight.description);
      if (descriptionField) {
        entry.description = descriptionField;
        const legacy = descriptionField.en?.trim();
        if (legacy) {
          entry.descriptionEn = legacy;
        }
      }
      return entry;
    })
    .filter((highlight) => Object.keys(highlight).length > 0);
  if (serviceHighlights.length) {
    companyOverview.serviceHighlights = serviceHighlights;
  }

  const capabilities = config.companyOverview.capabilities
    .map((capability) => {
      const entry: NonNullable<HomeCompanyOverviewConfig["capabilities"]>[number] = {};
      const titleField = serializeLocalizedField(capability.title);
      if (titleField) {
        entry.title = titleField;
        const legacy = titleField.en?.trim();
        if (legacy) {
          entry.titleEn = legacy;
        }
      }
      const subtitleField = serializeLocalizedField(capability.subtitle);
      if (subtitleField) {
        entry.subtitle = subtitleField;
        const legacy = subtitleField.en?.trim();
        if (legacy) {
          entry.subtitleEn = legacy;
        }
      }
      const descriptionField = serializeLocalizedField(capability.description);
      if (descriptionField) {
        entry.description = descriptionField;
        const legacy = descriptionField.en?.trim();
        if (legacy) {
          entry.descriptionEn = legacy;
        }
      }
      if (optional(capability.image)) {
        entry.image = optional(capability.image);
      }
      return entry;
    })
    .filter((capability) => Object.keys(capability).length > 0);
  if (capabilities.length) {
    companyOverview.capabilities = capabilities;
  }

  const gallery = config.companyOverview.gallery
    .map((item) => {
      const entry: NonNullable<HomeCompanyOverviewConfig["gallery"]>[number] = {};
      if (optional(item.image)) {
        entry.image = optional(item.image);
      }
      const labelField = serializeLocalizedField(item.label);
      if (labelField) {
        entry.label = labelField;
        const legacy = labelField.en?.trim();
        if (legacy) {
          entry.labelEn = legacy;
        }
      }
      return entry;
    })
    .filter((item) => Object.keys(item).length > 0);
  if (gallery.length) {
    companyOverview.gallery = gallery;
  }

  const productShowcase: HomeProductShowcaseConfig = {
    selectedProductSlugs: config.productShowcase.selectedProductSlugs.filter(Boolean),
    cards: config.productShowcase.cards
      .map((card) => {
        const record: Record<string, unknown> = {};
        const slug = optional(card.productSlug);
        if (slug) {
          record.productSlug = slug;
        }
        if (card.imageOverride.trim()) {
          record.imageOverride = card.imageOverride.trim();
        }
        const nameField = serializeLocalizedField(card.nameOverride);
        if (nameField) {
          record.nameOverride = nameField;
        }
        const summaryField = serializeLocalizedField(card.summaryOverride);
        if (summaryField) {
          record.summaryOverride = summaryField;
        }
        return record;
      })
      .filter((card) => Object.keys(card).length > 0),
  };

  const headingField = serializeLocalizedField(config.productShowcase.heading);
  if (headingField) {
    productShowcase.heading = headingField;
  }

  const descriptionField = serializeLocalizedField(config.productShowcase.description);
  if (descriptionField) {
    productShowcase.description = descriptionField;
    const legacy = descriptionField.en?.trim();
    if (legacy) {
      productShowcase.descriptionEn = legacy;
    }
  }

  const cardCtaField = serializeLocalizedField(config.productShowcase.cardCtaLabel);
  if (cardCtaField) {
    productShowcase.cardCtaLabel = cardCtaField;
  }

  const applicationAreas: HomeApplicationAreasConfig = {
    overlayEnabled: config.applicationAreas.overlayEnabled !== false,
    selectedCategorySlugs: config.applicationAreas.selectedCategorySlugs.filter(Boolean),
    items: config.applicationAreas.items
      .map((item) => {
        const result: NonNullable<HomeApplicationAreasConfig["items"]>[number] = {};
        const areaKey = optional(item.areaKey);
        if (areaKey) {
          result.areaKey = areaKey;
        }
        const image = optional(item.imageOverride);
        if (image) {
          result.imageOverride = image;
        }

        const shouldPersistName = item.nameOverrideEnabled || !isLocalizedEmpty(item.nameOverride);
        if (shouldPersistName) {
          const nameField = serializeLocalizedField(item.nameOverride);
          if (nameField) {
            result.nameOverride = nameField;
            const legacy = nameField.en?.trim();
            if (legacy) {
              result.nameEnOverride = legacy;
            }
          }
        }

        const shouldPersistDescription = item.descriptionOverrideEnabled || !isLocalizedEmpty(item.descriptionOverride);
        if (shouldPersistDescription) {
          const descriptionField = serializeLocalizedField(item.descriptionOverride);
          if (descriptionField) {
            result.descriptionOverride = descriptionField;
            const legacy = descriptionField.en?.trim();
            if (legacy) {
              result.descriptionEnOverride = legacy;
            }
          }
        }

        const shouldPersistHighlight = item.highlightOverrideEnabled || !isLocalizedEmpty(item.highlightOverride);
        if (shouldPersistHighlight) {
          const highlightField = serializeLocalizedField(item.highlightOverride);
          if (highlightField) {
            result.highlightOverride = highlightField;
            const legacy = highlightField.en?.trim();
            if (legacy) {
              result.highlightEnOverride = legacy;
            }
          }
        }

        return result;
      })
      .filter((item) => Object.keys(item).length > 0),
  };

  const applicationHeadingField = serializeLocalizedField(config.applicationAreas.heading);
  if (applicationHeadingField) {
    applicationAreas.heading = applicationHeadingField;
    const legacy = applicationHeadingField.en?.trim();
    if (legacy) {
      applicationAreas.headingEn = legacy;
    }
  }

  const applicationDescriptionField = serializeLocalizedField(config.applicationAreas.description);
  if (applicationDescriptionField) {
    applicationAreas.description = applicationDescriptionField;
    const legacy = applicationDescriptionField.en?.trim();
    if (legacy) {
      applicationAreas.descriptionEn = legacy;
    }
  }

  const applicationActionLabelField = serializeLocalizedField(config.applicationAreas.actionLabel);
  if (applicationActionLabelField) {
    applicationAreas.actionLabel = applicationActionLabelField;
    const legacy = applicationActionLabelField.en?.trim();
    if (legacy) {
      applicationAreas.actionLabelEn = legacy;
    }
  }

  const inventoryHighlightCtas = ensureArray<InventoryCtaState>(config.inventoryHighlight.ctas)
    .map((cta) => {
      const href = optional(cta.href);
      if (!href) return null;
      const labelField = serializeLocalizedField(cta.label);
      if (!labelField) {
        return null;
      }
      const result: NonNullable<HomeInventoryHighlightConfig["ctas"]>[number] = {
        href,
        label: labelField,
      };
      const legacy = labelField.en?.trim();
      if (legacy) {
        result.labelEn = legacy;
      }
      return result;
    })
    .filter((cta): cta is NonNullable<HomeInventoryHighlightConfig["ctas"]>[number] => Boolean(cta));

  const inventoryHighlight: HomeInventoryHighlightConfig = {};
  const inventoryHeadingField = serializeLocalizedField(config.inventoryHighlight.heading);
  if (inventoryHeadingField) {
    inventoryHighlight.heading = inventoryHeadingField;
    const legacy = inventoryHeadingField.en?.trim();
    if (legacy) {
      inventoryHighlight.headingEn = legacy;
    }
  }

  const inventoryDescriptionField = serializeLocalizedField(config.inventoryHighlight.description);
  if (inventoryDescriptionField) {
    inventoryHighlight.description = inventoryDescriptionField;
    const legacy = inventoryDescriptionField.en?.trim();
    if (legacy) {
      inventoryHighlight.descriptionEn = legacy;
    }
  }

  if (optional(config.inventoryHighlight.heroImage)) {
    inventoryHighlight.heroImage = optional(config.inventoryHighlight.heroImage);
  }

  if (inventoryHighlightCtas.length) {
    inventoryHighlight.ctas = inventoryHighlightCtas;
  }

  const contactCta: NonNullable<HomeConfig["contactCta"]> = {};

  const contactEyebrowField = serializeLocalizedField(config.contactCta.eyebrow);
  if (contactEyebrowField) {
    contactCta.eyebrow = contactEyebrowField;
    const legacy = contactEyebrowField.en?.trim();
    if (legacy) {
      contactCta.eyebrowEn = legacy;
    }
  } else if (isLocalizedEmpty(config.contactCta.eyebrow)) {
    contactCta.eyebrow = undefined;
  }

  const contactTitleField = serializeLocalizedField(config.contactCta.title);
  if (contactTitleField) {
    contactCta.title = contactTitleField;
    const legacy = contactTitleField.en?.trim();
    if (legacy) {
      contactCta.titleEn = legacy;
    }
  } else if (isLocalizedEmpty(config.contactCta.title)) {
    contactCta.title = undefined;
  }

  const contactDescriptionField = serializeLocalizedField(config.contactCta.description);
  if (contactDescriptionField) {
    contactCta.description = contactDescriptionField;
    const legacy = contactDescriptionField.en?.trim();
    if (legacy) {
      contactCta.descriptionEn = legacy;
    }
  } else if (isLocalizedEmpty(config.contactCta.description)) {
    contactCta.description = undefined;
  }

  const contactCtaRaw = ensureObject(config.contactCta);
  const primaryHref = optional(config.contactCta.primary.href) || optional(contactCtaRaw["primaryHref"]) || "/contact";
  const primaryLabelField = serializeLocalizedField(config.contactCta.primary.label);
  if (primaryLabelField || primaryHref) {
    contactCta.primary = {
      ...(primaryHref ? { href: primaryHref } : {}),
      ...(primaryLabelField ? { label: primaryLabelField } : {}),
      ...(primaryLabelField?.en?.trim() ? { labelEn: primaryLabelField.en.trim() } : {}),
    };
  }

  const secondaryHref = optional(config.contactCta.secondary.href) || optional(contactCtaRaw["secondaryHref"]) || "/about";
  const secondaryLabelField = serializeLocalizedField(config.contactCta.secondary.label);
  if (secondaryLabelField || secondaryHref) {
    contactCta.secondary = {
      ...(secondaryHref ? { href: secondaryHref } : {}),
      ...(secondaryLabelField ? { label: secondaryLabelField } : {}),
      ...(secondaryLabelField?.en?.trim() ? { labelEn: secondaryLabelField.en.trim() } : {}),
    };
  }

  return mergeMeta(
    {
      hero,
      companyOverview,
      productShowcase,
      applicationAreas,
      inventoryHighlight,
      contactCta,
    } as HomeConfig,
    config._meta,
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

function LocalizedTextField({
  label,
  value,
  onChange,
  helper,
  multiline = false,
  rows = 3,
}: {
  label: string;
  value: LocalizedText;
  onChange: (next: LocalizedText) => void;
  helper?: string;
  multiline?: boolean;
  rows?: number;
}) {
  const [activeLocale, setActiveLocale] = useState<LocaleKey>(DEFAULT_LOCALE);
  const record = ensureLocalizedRecord(value);
  const currentValue = record[activeLocale] ?? "";
  const targetLocales = useMemo(
    () => LOCALES.map((locale) => locale.code as LocaleKey).filter((locale) => locale !== DEFAULT_LOCALE),
    [],
  );
  const normalizedValue = ensureLocalizedNoFallback(value);

  const translator = useLocalizedAutoTranslate({
    label,
    value: normalizedValue,
    sourceLocale: DEFAULT_LOCALE,
    targetLocales,
    context: label,
    onApply: (translations) => {
      const base = ensureLocalizedNoFallback(value);
      const next = { ...base } as LocalizedText;
      targetLocales.forEach((locale) => {
        const translated = translations[locale];
        if (typeof translated === "string" && translated.trim()) {
          next[locale] = translated.trim();
        }
      });
      onChange(next);
    },
  });

  const handleChange = (locale: LocaleKey, nextValue: string) => {
    const updated = setLocaleText(value, nextValue, locale) as LocalizedText;
    onChange(updated);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-text-tertiary,#8690a3)]">{label}</span>
        <div className="flex items-center gap-1">
          {LOCALES.map((locale) => (
            <button
              key={locale.code}
              type="button"
              onClick={() => setActiveLocale(locale.code as LocaleKey)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                activeLocale === locale.code
                  ? "border-[var(--color-brand-primary)] bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)]"
                  : "border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary)]"
              }`}
            >
              {locale.label}
            </button>
          ))}
          <button
            type="button"
            onClick={translator.openDialog}
            disabled={translator.isLoading}
            className="rounded-full border border-[var(--color-brand-primary)] px-3 py-1 text-xs font-semibold text-[var(--color-brand-primary)] transition hover:bg-[var(--color-brand-primary)]/10 disabled:cursor-not-allowed disabled:border-dashed disabled:text-[var(--color-text-tertiary,#8690a3)]"
          >
            {translator.isLoading ? "翻译中…" : "自动适配其他语言"}
          </button>
        </div>
      </div>
      {multiline ? (
        <textarea
          value={currentValue}
          onChange={(event) => handleChange(activeLocale, event.target.value)}
          rows={rows}
          className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm leading-relaxed text-[var(--color-text-secondary)] focus:border-[var(--color-brand-primary)] focus:outline-none"
        />
      ) : (
        <input
          value={currentValue}
          onChange={(event) => handleChange(activeLocale, event.target.value)}
          className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-text-secondary)] focus:border-[var(--color-brand-primary)] focus:outline-none"
        />
      )}
      {helper ? <span className="text-[10px] text-[var(--color-text-tertiary,#8690a3)]">{helper}</span> : null}
      {translator.renderDialog()}
    </div>
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

  const handleSelectFile = () => {
    fileInputRef.current?.click();
  };

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
      const response = await fetch(uploadEndpoint, {
        method: "POST",
        body: formData,
      });
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
      if (event.target) event.target.value = "";
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

const PREVIEW_ACTION_GROUPS: Array<{
  label: string;
  anchor: string;
  actions: Array<{ label: string; target: EditingTarget }>;
}> = [
  {
    anchor: "hero",
    label: "英雄区",
    actions: [
      { label: "文案", target: { type: "hero", scope: "copy" } },
      { label: "按钮", target: { type: "hero", scope: "cta" } },
      { label: "轮播", target: { type: "hero", scope: "slides" } },
      { label: "全部字段", target: { type: "hero", scope: "full" } },
    ],
  },
  {
    anchor: "company",
    label: "公司概览",
    actions: [
      { label: "概览文案", target: { type: "company", scope: "overview" } },
      { label: "经营数据", target: { type: "company", scope: "stats" } },
      { label: "服务亮点", target: { type: "company", scope: "highlights" } },
      { label: "资质能力", target: { type: "company", scope: "capabilities" } },
      { label: "图库", target: { type: "company", scope: "gallery" } },
      { label: "全部字段", target: { type: "company", scope: "full" } },
    ],
  },
  {
    anchor: "product",
    label: "产品矩阵",
    actions: [
      { label: "组标题", target: { type: "product", scope: "copy" } },
      { label: "精选产品", target: { type: "product", scope: "selection" } },
      { label: "卡片内容", target: { type: "product", scope: "cards" } },
      { label: "全部字段", target: { type: "product", scope: "full" } },
    ],
  },
  {
    anchor: "applications",
    label: "应用场景",
    actions: [
      { label: "板块文案", target: { type: "applications", scope: "copy" } },
      { label: "已选分类", target: { type: "applications", scope: "selection" } },
      { label: "卡片内容", target: { type: "applications", scope: "items" } },
      { label: "全部字段", target: { type: "applications", scope: "full" } },
    ],
  },
  {
    anchor: "inventory",
    label: "现货库存",
    actions: [
      { label: "文案", target: { type: "inventory", scope: "copy" } },
      { label: "按钮", target: { type: "inventory", scope: "ctas" } },
      { label: "全部字段", target: { type: "inventory", scope: "full" } },
    ],
  },
  {
    anchor: "contactCta",
    label: "联系 CTA",
    actions: [
      { label: "文案", target: { type: "contactCta", scope: "copy" } },
      { label: "按钮", target: { type: "contactCta", scope: "actions" } },
      { label: "全部字段", target: { type: "contactCta", scope: "full" } },
    ],
  },
];

type AnchorMap = Record<string, HTMLElement>;

function usePreviewAnchors(containerRef: RefObject<HTMLElement>): AnchorMap {
  const [anchors, setAnchors] = useState<AnchorMap>({});

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    const container = containerRef.current;
    if (!container) return;

    const originalPositions = new Map<HTMLElement, string>();

    const updateAnchors = () => {
      const next: AnchorMap = {};
      for (const { anchor } of PREVIEW_ACTION_GROUPS) {
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
        if (
          prevKeys.length === nextKeys.length &&
          nextKeys.every((key) => prev[key] === next[key])
        ) {
          return prev;
        }
        return next;
      });
    };

    const mutationObserver = new MutationObserver(updateAnchors);
    mutationObserver.observe(container, { childList: true, subtree: true });

    updateAnchors();

    return () => {
      mutationObserver.disconnect();
      originalPositions.forEach((value, element) => {
        element.style.position = value;
      });
    };
  }, [containerRef]);

  return anchors;
}

function HomePreview({
  config,
  onEdit,
  productConfig,
  casesConfig,
}: {
  config: HomeConfigState;
  onEdit: (target: EditingTarget) => void;
  productConfig: ProductCenterConfig;
  casesConfig?: CasesConfig;
}) {
  const { locale } = useLocale();
  const previewConfig = useMemo(() => serializeConfig(config), [config]);
  const mergedConfig = useMemo(() => mergeHomeConfigWithFallback(previewConfig), [previewConfig]);

  const casesConfigData = useMemo(() => {
    if (casesConfig) {
      return casesConfig;
    }
    // Fallback to static config if dynamic is missing, but prefer dynamic
    // If we absolutely must use a fallback, we should import the static one or handle empty
    return cases_config; 
  }, [casesConfig]);

  const previewProductConfig = useMemo<ProductCenterConfig>(
    () => ({
      ...productConfig,
      products: productConfig.products.map((product) => ({ ...product })),
    }),
    [productConfig],
  );

  const hero = useMemo<HomeHeroData>(
    () => buildPreviewHeroData(mergedConfig, casesConfigData),
    [mergedConfig, casesConfigData],
  );
  const applicationTabs = useMemo<HomeApplicationTab[]>(
    () => buildPreviewApplicationTabs(mergedConfig, casesConfigData),
    [mergedConfig, casesConfigData],
  );
  const applicationSection = useMemo(() => {
    const rawApp = (previewConfig.applicationAreas ?? {}) as Record<string, unknown>;
    const hasHeading = Object.prototype.hasOwnProperty.call(rawApp, "heading");
    const rawHeading = rawApp.heading;
    const isEmptyHeading =
      rawHeading === null ||
      (typeof rawHeading === "string" && rawHeading.trim().length === 0) ||
      (rawHeading && typeof rawHeading === "object" &&
        Object.values(ensureLocalizedRecord(rawHeading)).every((v) => (typeof v === "string" ? v.trim().length === 0 : true)));

    const hasDescription = Object.prototype.hasOwnProperty.call(rawApp, "description");
    const rawDescription = (rawApp as any).description;
    const isEmptyDescription =
      rawDescription === null ||
      (typeof rawDescription === "string" && rawDescription.trim().length === 0) ||
      (rawDescription && typeof rawDescription === "object" &&
        Object.values(ensureLocalizedRecord(rawDescription)).every((v) => (typeof v === "string" ? v.trim().length === 0 : true)));

    return {
      heading: hasHeading && isEmptyHeading ? null : mergedConfig.applicationAreas?.heading,
      description: hasDescription && isEmptyDescription ? null : mergedConfig.applicationAreas?.description,
      actionLabel: mergedConfig.applicationAreas?.actionLabel,
      overlayEnabled: mergedConfig.applicationAreas?.overlayEnabled !== false,
    };
  }, [mergedConfig, previewConfig]);
  const productShowcase = useMemo<ProductMatrixSectionProps["productShowcase"]>(
    () => buildPreviewProductShowcase(mergedConfig, previewProductConfig),
    [mergedConfig, previewProductConfig],
  );
  const companyOverview = useMemo<HomeCompanyOverview>(
    () => buildPreviewCompanyOverview(mergedConfig),
    [mergedConfig],
  );
  const inventoryHighlight = useMemo<HomeInventoryHighlight>(
    () => buildPreviewInventoryHighlight(mergedConfig),
    [mergedConfig],
  );
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const previewAnchors = usePreviewAnchors(previewContainerRef);

  return (
    <ConfigPreviewFrame
      title="首页预览"
      description="各板块右上角提供快捷配置入口"
      viewportWidth={1180}
      autoScale
      maxHeight={null}
    >
      <div ref={previewContainerRef} className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white">
        <HomeClient
          hero={hero}
          applicationTabs={applicationTabs}
          applicationSection={applicationSection}
          productShowcase={productShowcase}
          companyOverview={companyOverview}
          inventoryHighlight={inventoryHighlight}
          contactCta={mergedConfig.contactCta}
        />
        <PreviewActionRail anchors={previewAnchors} onEdit={onEdit} />
      </div>
    </ConfigPreviewFrame>
  );
}

function mergeHomeConfigWithFallback(config: HomeConfig): HomeConfig {
  // 预览不注入任何 FALLBACK，直接返回原始配置
  return config;
}

function buildPreviewHeroData(homeConfig: HomeConfig, casesConfig: CasesConfig): HomeHeroData {
  const heroConfig = homeConfig.hero ?? {};
  const slides: HomeHeroSlide[] = [];
  const seen = new Set<string>();
  for (const rawSlide of ensureArray(heroConfig.slides)) {
    const slide = ensureObject(rawSlide);
    const caseRef = ensureObject(slide.caseRef);
    const slug = ensureString(caseRef.slug);
    if (!slug || seen.has(slug)) continue;

    const categorySlug = ensureString(caseRef.category);
    const found = findCaseStudy(casesConfig.categories, slug, categorySlug);
    const categoryRecord = found?.category ? ensureObject(found.category) : undefined;
    const studyRecord = found?.study ? ensureObject(found.study) : undefined;
    const resolvedCategorySlug = categorySlug || ensureString(categoryRecord?.slug);
    const resolvedStudySlug = ensureString(studyRecord?.slug) || slug;

    const href = ensureString(slide.href)
      || (resolvedCategorySlug && studyRecord ? `/cases/${resolvedCategorySlug}/${resolvedStudySlug}` : `/cases/${slug}`);
    const imageOverride = ensureObject(slide.imageOverride);
    const image = ensureString(imageOverride.src) || ensureString(studyRecord?.image);
    if (!image) continue;

    // 当显式提供了覆写字段（即使为空数组），不回退到案例高亮
    const hasOverrideFlag = Object.prototype.hasOwnProperty.call(slide, "highlightsOverrideI18n")
      || Object.prototype.hasOwnProperty.call(slide, "highlightsOverride");
    const overrideCandidates: ReadonlyArray<string | unknown> = Array.isArray((slide as any).highlightsOverrideI18n)
      ? ((slide as any).highlightsOverrideI18n as ReadonlyArray<string | unknown>)
      : ensureArray<string>(slide.highlightsOverride);
    const overrideHighlights = overrideCandidates
      .map((item) => (typeof item === "string" ? item : getLocaleText(item as any, undefined, "")))
      .filter((s) => s.trim().length > 0);
    const highlightCandidates: ReadonlyArray<string | unknown> =
      Array.isArray((studyRecord as any)?.highlightsI18n) && (studyRecord as any)?.highlightsI18n.length
        ? ((studyRecord as any).highlightsI18n as ReadonlyArray<string | unknown>)
        : ensureArray<string>(studyRecord?.highlights);
    const studyHighlights = highlightCandidates
      .map((item) => (typeof item === "string" ? item : getLocaleText(item as any, undefined, "")))
      .filter((s) => s.trim().length > 0);
    const highlights = hasOverrideFlag ? Array.from(overrideHighlights) : Array.from(studyHighlights);

    slides.push({
      slug,
      href,
      title: ensureString(studyRecord?.title) || slug,
      summary: ensureString(studyRecord?.summary),
      highlights,
      image,
      category: ensureString(categoryRecord?.name) || ensureString(categoryRecord?.slug) || undefined,
    });
    seen.add(slug);
  }


  const primaryHref = heroConfig.ctaPrimaryHref ?? slides[0]?.href ?? "/cases";
  const secondaryHref = heroConfig.ctaSecondaryHref ?? "/cases";

  return {
    badge: heroConfig.badge,
    title: heroConfig.title,
    description: heroConfig.description,
    highlights: slides[0]?.highlights ?? [],
    slides,
    overlayEnabled: heroConfig.overlayEnabled !== false,
    primaryCta: heroConfig.ctaPrimary
      ? { label: heroConfig.ctaPrimary, href: primaryHref }
      : slides[0]
        ? { label: "查看详情", href: slides[0].href }
        : undefined,
    secondaryCta: heroConfig.ctaSecondary
      ? { label: heroConfig.ctaSecondary, href: secondaryHref }
      : { label: "更多案例", href: secondaryHref },
  };
}

function buildPreviewApplicationTabs(homeConfig: HomeConfig, casesConfig: CasesConfig): HomeApplicationTab[] {
  const selected = ensureArray<string>(homeConfig.applicationAreas?.selectedCategorySlugs)
    .map((slug) => ensureString(slug))
    .filter(Boolean);
  const overrides = new Map<string, ApplicationItemState>(
    ensureArray<ApplicationItemState>(homeConfig.applicationAreas?.items)
      .filter((item): item is ApplicationItemState => Boolean(item?.areaKey?.trim()))
      .map((item) => [item.areaKey.trim(), item]),
  );

  const categories = ensureArray<CaseCategory>(casesConfig.categories);
  const categoriesBySlug = new Map<string, CaseCategory>();
  for (const category of categories) {
    const slug = ensureString((category as CaseCategory).slug);
    if (slug) {
      categoriesBySlug.set(slug, category);
    }
  }

  const orderedSlugs = selected;

  const tabs: HomeApplicationTab[] = [];
  for (const slug of orderedSlugs) {
    const category = categoriesBySlug.get(slug);
    if (!category) continue;
    const categoryRecord = ensureObject(category);
    const fallbackName = ensureCompleteLocalizedField(
      {
        "zh-CN": ensureString(categoryRecord.name),
        en: ensureString((categoryRecord as Record<string, unknown>).nameEn),
      },
      ensureString(categoryRecord.name) || slug,
    ) as LocalizedText;
    const fallbackDescription = ensureCompleteLocalizedField(
      {
        "zh-CN": ensureString(categoryRecord.intro),
        en: ensureString((categoryRecord as Record<string, unknown>).introEn),
      },
      ensureString(categoryRecord.intro) || "",
    ) as LocalizedText;

    const override = overrides.get(slug);
    const studies = ensureArray<CaseStudy>(categoryRecord.studies);
    const primaryStudyRecord = studies.length ? ensureObject(studies[0]) : undefined;
    const image = ensureString(override?.imageOverride) || ensureString(primaryStudyRecord?.image);
    if (!image) continue;

    const highlightCandidates = ensureArray(primaryStudyRecord?.highlights)
      .map((entry) => ensureString(entry)?.trim())
      .filter((entry): entry is string => Boolean(entry));
    const fallbackHighlight = highlightCandidates[0];

    const name: LocalizedText | string =
      override && !isLocalizedEmpty(override.nameOverride)
        ? cloneLocalized(override.nameOverride)
        : fallbackName;

    let description: LocalizedText | string | null;
    const hasDescOverride =
      !!override &&
      (Object.prototype.hasOwnProperty.call(override, "descriptionOverride") ||
        Object.prototype.hasOwnProperty.call(override as any, "descriptionEnOverride"));
    if (hasDescOverride) {
      description = isLocalizedEmpty((override as any).descriptionOverride)
        ? null
        : cloneLocalized((override as any).descriptionOverride);
    } else {
      description = fallbackDescription;
    }

    let highlight: LocalizedText | string | undefined | null;
    const hasHighlightOverride =
      !!override &&
      (Object.prototype.hasOwnProperty.call(override, "highlightOverride") ||
        Object.prototype.hasOwnProperty.call(override as any, "highlightEnOverride"));
    if (hasHighlightOverride) {
      highlight = isLocalizedEmpty((override as any).highlightOverride)
        ? null
        : cloneLocalized((override as any).highlightOverride);
    } else if (fallbackHighlight) {
      highlight = fallbackHighlight;
    }

    tabs.push({
      slug,
      name,
      description,
      highlight,
      image,
      href: `/cases/${slug}`,
    });
  }

  return tabs;
}

function buildPreviewProductShowcase(
  homeConfig: HomeConfig,
  productConfig: ProductCenterConfig,
): ProductMatrixSectionProps["productShowcase"] {
  const selected = ensureArray<string>(homeConfig.productShowcase?.selectedProductSlugs)
    .map((slug) => ensureString(slug).trim())
    .filter(Boolean);

  const cardEntries = ensureArray(homeConfig.productShowcase?.cards)
    .map((card) => ensureObject(card))
    .map((card) => {
      const slug = ensureString(card.productSlug).trim();
      return slug ? ({ slug, card } as const) : null;
    })
    .filter((entry): entry is { slug: string; card: Record<string, unknown> } => Boolean(entry));

  const overridesBySlug = new Map(cardEntries.map(({ slug, card }) => [slug, card]));

  const productsBySlug = new Map(
    ensureArray(productConfig.products)
      .map((product) => ensureObject(product))
      .map((product) => {
        const slug = ensureString(product.slug).trim();
        return slug ? ({ slug, product } as const) : null;
      })
      .filter((entry): entry is { slug: string; product: Record<string, unknown> } => Boolean(entry))
      .map(({ slug, product }) => [slug, product]),
  );

  const fallbackOrder = cardEntries.map(({ slug }) => slug);
  const baseOrder = selected.length ? selected : fallbackOrder;
  const seen = new Set<string>();
  const slugs: string[] = [];
  for (const rawSlug of baseOrder) {
    const slug = ensureString(rawSlug).trim();
    if (!slug || seen.has(slug)) continue;
    if (!overridesBySlug.has(slug) && !productsBySlug.has(slug)) continue;
    seen.add(slug);
    slugs.push(slug);
  }

  if (!slugs.length) {
    for (const [slug] of productsBySlug) {
      if (!slug || seen.has(slug)) continue;
      seen.add(slug);
      slugs.push(slug);
    }
  }

  const cards: ProductMatrixSectionProps["productShowcase"]["cards"] = [];
  for (const slug of slugs) {
    const override = overridesBySlug.get(slug);
    const product = productsBySlug.get(slug);
    const title = (override?.nameOverride as unknown) ?? (product?.name as unknown) ?? slug;
    const description =
      (override?.summaryOverride as unknown)
        ?? (product?.summary as unknown)
        ?? (product?.tagline as unknown)
        ?? "";
    const image = optional(ensureString(override?.imageOverride)) ?? optional(ensureString(product?.image));
    const tagline = (product?.tagline as unknown) ?? undefined;
    cards.push({
      slug,
      title,
      description,
      image,
      href: `/products/${slug}`,
      tagline,
    });
  }

  return {
    heading: homeConfig.productShowcase?.heading,
    description: homeConfig.productShowcase?.description,
    cardCtaLabel: homeConfig.productShowcase?.cardCtaLabel,
    cards,
  };
}

function buildPreviewCompanyOverview(homeConfig: HomeConfig): HomeCompanyOverview {
  const company = homeConfig.companyOverview ?? {};
  const hero = company.hero;
  const galleryItems = company.gallery ?? [];
  return {
    title: company.title,
    capabilityHeading: company.capabilityHeading,
    hero: hero
      ? {
          title: hero.title,
          secondary: hero.secondary,
          description: hero.description,
          image: hero.image,
        }
      : undefined,
    stats: company.stats ?? [],
    serviceHighlights: (company.serviceHighlights ?? []).map((item) => ({
      title: item.title,
      description: item.description ?? item.subtitle,
    })),
    capabilities: (company.capabilities ?? []).map((item) => ({
      title: item.title,
      subtitle: item.subtitle,
      description: item.description,
      image: item.image,
    })),
    gallery: {
      hero: galleryItems.length
        ? [
            {
              title: galleryItems[0]?.label,
              image: galleryItems[0]?.image,
            },
          ]
        : [],
      support: galleryItems.slice(1, 3).map((item) => ({
        title: item.label,
        image: item.image,
      })),
    },
  };
}

function buildPreviewInventoryHighlight(homeConfig: HomeConfig): HomeInventoryHighlight {
  const highlight = homeConfig.inventoryHighlight ?? {};
  return {
    heading: highlight.heading,
    description: highlight.description,
    heroImage: highlight.heroImage,
    ctas:
      highlight.ctas?.map((cta) => ({
        href: cta.href,
        label: normalizeLocalizedText(
          cta.label,
          createEmptyLocalized(typeof cta.label === "string" ? cta.label : ""),
          { en: cta.labelEn },
        ),
      })) ?? [
      { href: "/inventory", label: "查看库存" },
      { href: "/contact", label: "联系顾问" },
    ],
  };
}

function findCaseStudy(categories: readonly CaseCategory[], slug: string, categorySlug?: string) {
  if (!slug) return null;
  if (categorySlug) {
    const category = categories.find((item) => item.slug === categorySlug);
    if (category) {
      const study = category.studies.find((item) => item.slug === slug);
      if (study) {
        return { category, study };
      }
    }
  }

  for (const category of categories) {
    const study = category.studies.find((item) => item.slug === slug);
    if (study) {
      return { category, study };
    }
  }

  return null;
}

function PreviewActionRail({ anchors, onEdit }: { anchors: AnchorMap; onEdit: (target: EditingTarget) => void }) {
  if (!PREVIEW_ACTION_GROUPS.length) return null;
  return (
    <>
      {PREVIEW_ACTION_GROUPS.map(({ label, anchor, actions }) => {
        const element = anchors[anchor];
        if (!element) return null;
        return createPortal(
          <div className="pointer-events-none absolute right-4 top-4 z-30 flex items-center gap-2">
            <span className="hidden rounded-full bg-black/65 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.3em] text-white/85 shadow-sm md:inline">
              {label}
            </span>
            <div className="pointer-events-auto flex flex-wrap gap-2">
              {actions.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  onClick={() => onEdit(action.target)}
                  className="rounded-full bg-[var(--color-brand-primary)] px-3 py-1 text-xs font-semibold text-white shadow-sm transition hover:bg-[#d82234]"
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>,
          element,
        );
      })}
    </>
  );
}

// Dialog implementations

function HeroDialog({
  value,
  scope,
  onSave,
  onCancel,
  caseCategoryOptions,
  caseStudyOptions,
  caseStudyLookup,
}: {
  value: HeroState;
  scope: HeroScope;
  onSave: (next: HeroState) => void;
  onCancel: () => void;
  caseCategoryOptions: { value: string; label: string }[];
  caseStudyOptions: CaseStudyOption[];
  caseStudyLookup: Map<string, CaseStudyOption>;
}) {
  const [draft, setDraft] = useState<HeroState>(() => cloneHeroState(value));

  useEffect(() => {
    setDraft(cloneHeroState(value));
  }, [value, scope]);

  const showCopy = scope === "copy" || scope === "full";
  const showCta = scope === "cta" || scope === "full";
  const showSlides = scope === "slides" || scope === "full";

  const handleAddSlide = () => {
    setDraft((prev) => ({
      ...prev,
      slides: [
        ...prev.slides,
        (() => {
          const defaultStudy = caseStudyOptions[0];
          return {
            id: createId("hero-slide"),
            caseSlug: defaultStudy?.value ?? "",
            caseCategory: defaultStudy?.category ?? caseCategoryOptions[0]?.value ?? "",
            href: defaultStudy?.href ?? "",
            imageSrc: "",
            eyebrow: createEmptyLocalized(""),
            highlights: createEmptyLocalized(""),
          } satisfies HeroSlideState;
        })(),
      ],
    }));
  };

  const handleMoveSlide = (index: number, offset: -1 | 1) => {
    setDraft((prev) => {
      const next = [...prev.slides];
      const target = index + offset;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return { ...prev, slides: next };
    });
  };

  return (
    <EditorDialog
      title={
        scope === "copy"
          ? "编辑首页英雄 - 文案"
          : scope === "cta"
            ? "编辑首页英雄 - 按钮"
            : scope === "slides"
              ? "编辑首页英雄 - 轮播"
              : "编辑首页英雄"
      }
      subtitle="调整首页首屏内容"
      onSave={() => onSave(cloneHeroState(draft))}
      onCancel={onCancel}
    >
      <div className="space-y-6 text-sm">
        {showCopy ? (
          <div className="space-y-4">
            <LocalizedTextField
              label="标题"
              value={draft.title}
              onChange={(next) => setDraft((prev) => ({ ...prev, title: next }))}
            />
            <LocalizedTextField
              label="眉头"
              value={draft.badge}
              onChange={(next) => setDraft((prev) => ({ ...prev, badge: next }))}
            />
            <LocalizedTextField
              label="描述"
              value={draft.description}
              onChange={(next) => setDraft((prev) => ({ ...prev, description: next }))}
              multiline
              rows={4}
            />
            <LocalizedTextField
              label="高亮标签（逗号分隔）"
              value={draft.highlights}
              onChange={(next) => setDraft((prev) => ({ ...prev, highlights: next }))}
              helper="例如：大型 活动 遮阳"
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
        ) : null}

        {showCta ? (
          <div className="space-y-4">
            <LocalizedTextField
              label="主按钮文本"
              value={draft.ctaPrimary}
              onChange={(next) => setDraft((prev) => ({ ...prev, ctaPrimary: next }))}
            />
            <TextField
              label="主按钮链接"
              value={draft.ctaPrimaryHref}
              onChange={(next) => setDraft((prev) => ({ ...prev, ctaPrimaryHref: next }))}
              placeholder="/cases"
            />
            <LocalizedTextField
              label="次按钮文本"
              value={draft.ctaSecondary}
              onChange={(next) => setDraft((prev) => ({ ...prev, ctaSecondary: next }))}
            />
            <TextField
              label="次按钮链接"
              value={draft.ctaSecondaryHref}
              onChange={(next) => setDraft((prev) => ({ ...prev, ctaSecondaryHref: next }))}
              placeholder="/products"
            />
          </div>
        ) : null}

        {showSlides ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-text-tertiary,#8690a3)]">轮播项目</h3>
              <button
                type="button"
                onClick={handleAddSlide}
                className="rounded-full border border-[var(--color-brand-primary)] px-3 py-1 text-xs font-semibold text-[var(--color-brand-primary)]"
              >
                + 新增轮播
              </button>
            </div>
            <div className="space-y-3">
              {draft.slides.map((slide, index) => (
                <div key={slide.id} className="space-y-3 rounded-2xl border border-[var(--color-border)] bg-white/80 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--color-text-tertiary,#8690a3)]">
                    <span>轮播 {index + 1}</span>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleMoveSlide(index, -1)}
                        className="rounded-full border border-[var(--color-border)] px-3 py-1 transition hover:border-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary)]"
                        disabled={index === 0}
                      >
                        上移
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveSlide(index, 1)}
                        className="rounded-full border border-[var(--color-border)] px-3 py-1 transition hover:border-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary)]"
                        disabled={index === draft.slides.length - 1}
                      >
                        下移
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setDraft((prev) => ({
                            ...prev,
                            slides: prev.slides.filter((_, idx) => idx !== index),
                          }))
                        }
                        className="rounded-full border border-rose-200 px-3 py-1 text-rose-500 transition hover:bg-rose-50"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-text-tertiary,#8690a3)]">
                      <span>关联案例</span>
                      <select
                        value={slide.caseSlug}
                        onChange={(event) => {
                          const nextSlug = event.target.value;
                          setDraft((prev) => ({
                            ...prev,
                            slides: prev.slides.map((item, idx) => {
                              if (idx !== index) return item;
                              const option = caseStudyLookup.get(nextSlug);
                              const previousOption = caseStudyLookup.get(item.caseSlug);
                              const shouldUpdateHref =
                                !item.href || (previousOption && item.href === previousOption.href);
                              const nextHref = option?.href ?? "";
                              return {
                                ...item,
                                caseSlug: nextSlug,
                                caseCategory: option?.category ?? "",
                                href: shouldUpdateHref ? nextHref : item.href,
                              } satisfies HeroSlideState;
                            }),
                          }));
                        }}
                        className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-text-secondary)] focus:border-[var(--color-brand-primary)] focus:outline-none"
                      >
                        <option value="">未选择</option>
                        {caseStudyOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-text-tertiary,#8690a3)]">
                      <span>案例分类</span>
                      <select
                        value={slide.caseCategory}
                        onChange={(event) =>
                          setDraft((prev) => ({
                            ...prev,
                            slides: prev.slides.map((item, idx) => (idx === index ? { ...item, caseCategory: event.target.value } : item)),
                          }))
                        }
                        className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-text-secondary)] focus:border-[var(--color-brand-primary)] focus:outline-none"
                      >
                        <option value="">未设置</option>
                        {caseCategoryOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <TextField
                    label="跳转链接"
                    value={slide.href}
                    onChange={(next) =>
                      setDraft((prev) => ({
                        ...prev,
                        slides: prev.slides.map((item, idx) => (idx === index ? { ...item, href: next } : item)),
                      }))
                    }
                    placeholder="https://"
                  />
                  <ImageUploadField
                    label="主视觉"
                    value={slide.imageSrc}
                    onChange={(next) =>
                      setDraft((prev) => ({
                        ...prev,
                        slides: prev.slides.map((item, idx) => (idx === index ? { ...item, imageSrc: next } : item)),
                      }))
                    }
                    helper="最佳尺寸 1920×680"
                  />


                </div>
              ))}
              {!draft.slides.length ? (
                <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-white/60 p-4 text-center text-xs text-[var(--color-text-secondary)]">
                  暂无轮播，请新增。
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </EditorDialog>
  );
}

function CompanyOverviewDialog({
  value,
  scope,
  onSave,
  onCancel,
}: {
  value: CompanyOverviewState;
  scope: CompanyScope;
  onSave: (next: CompanyOverviewState) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<CompanyOverviewState>(() => cloneCompanyOverviewState(value));

  useEffect(() => {
    setDraft(cloneCompanyOverviewState(value));
  }, [value, scope]);

  const showOverview = scope === "overview" || scope === "full";
  const showStats = scope === "stats" || scope === "full";
  const showHighlights = scope === "highlights" || scope === "full";
  const showCapabilities = scope === "capabilities" || scope === "full";
  const showGallery = scope === "gallery" || scope === "full";

  return (
    <EditorDialog
      title="编辑公司概览"
      subtitle="维护首页关于时代板块"
      onSave={() => onSave(cloneCompanyOverviewState(draft))}
      onCancel={onCancel}
    >
      <div className="space-y-6 text-sm">
        {showOverview ? (
          <div className="space-y-4">
            <LocalizedTextField
              label="板块标题"
              value={draft.title}
              onChange={(next) => setDraft((prev) => ({ ...prev, title: cloneLocalized(next) }))}
            />
            <div className="grid gap-4 md:grid-cols-2">

              <LocalizedTextField
                label="英雄标题"
                value={draft.hero.title}
                onChange={(next) =>
                  setDraft((prev) => ({ ...prev, hero: { ...prev.hero, title: cloneLocalized(next) } }))
                }
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <LocalizedTextField
                label="副标题"
                value={draft.hero.secondary}
                onChange={(next) =>
                  setDraft((prev) => ({ ...prev, hero: { ...prev.hero, secondary: cloneLocalized(next) } }))
                }
              />
              <LocalizedTextField
                label="英雄描述"
                value={draft.hero.description}
                onChange={(next) =>
                  setDraft((prev) => ({ ...prev, hero: { ...prev.hero, description: cloneLocalized(next) } }))
                }
                multiline
                rows={4}
              />
            </div>
            <ImageUploadField
              label="英雄主视觉"
              value={draft.hero.image}
              onChange={(next) => setDraft((prev) => ({ ...prev, hero: { ...prev.hero, image: next } }))}
              helper="最佳尺寸 1200×520"
            />
          </div>
        ) : null}

        {showStats ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-text-tertiary,#8690a3)]">经营数据</h3>
              <button
                type="button"
                onClick={() =>
                  setDraft((prev) => ({
                    ...prev,
                    stats: [
                      ...prev.stats,
                      { id: createId("company-stat"), label: createEmptyLocalized(""), value: "" },
                    ],
                  }))
                }
                className="rounded-full border border-[var(--color-brand-primary)] px-3 py-1 text-xs font-semibold text-[var(--color-brand-primary)]"
              >
                + 新增数据
              </button>
            </div>
            <div className="space-y-3">
              {draft.stats.map((stat, index) => (
                <div key={stat.id} className="space-y-3 rounded-2xl border border-[var(--color-border)] bg-white/80 p-4">
                  <div className="flex items-center justify-between text-xs text-[var(--color-text-tertiary,#8690a3)]">
                    <span>数据 {index + 1}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setDraft((prev) => ({
                          ...prev,
                          stats: prev.stats.filter((_, idx) => idx !== index),
                        }))
                      }
                      className="rounded-full border border-rose-200 px-3 py-1 text-rose-500 transition hover:bg-rose-50"
                    >
                      删除
                    </button>
                  </div>
                  <LocalizedTextField
                    label="指标标题"
                    value={stat.label}
                    onChange={(next) =>
                      setDraft((prev) => ({
                        ...prev,
                        stats: prev.stats.map((item, idx) =>
                          idx === index ? { ...item, label: cloneLocalized(next) } : item,
                        ),
                      }))
                    }
                  />
                  <TextField
                    label="指标数值"
                    value={stat.value}
                    onChange={(next) =>
                      setDraft((prev) => ({
                        ...prev,
                        stats: prev.stats.map((item, idx) => (idx === index ? { ...item, value: next } : item)),
                      }))
                    }
                  />
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {showHighlights ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-text-tertiary,#8690a3)]">服务亮点</h3>
              <button
                type="button"
                onClick={() =>
                  setDraft((prev) => ({
                    ...prev,
                    serviceHighlights: [
                      ...prev.serviceHighlights,
                      {
                        id: createId("company-highlight"),
                        title: createEmptyLocalized(""),
                        description: createEmptyLocalized(""),
                      },
                    ],
                  }))
                }
                className="rounded-full border border-[var(--color-brand-primary)] px-3 py-1 text-xs font-semibold text-[var(--color-brand-primary)]"
              >
                + 新增亮点
              </button>
            </div>
            <div className="space-y-3">
              {draft.serviceHighlights.map((highlight, index) => (
                <div key={highlight.id} className="space-y-3 rounded-2xl border border-[var(--color-border)] bg-white/80 p-4">
                  <div className="flex items-center justify-between text-xs text-[var(--color-text-tertiary,#8690a3)]">
                    <span>亮点 {index + 1}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setDraft((prev) => ({
                          ...prev,
                          serviceHighlights: prev.serviceHighlights.filter((_, idx) => idx !== index),
                        }))
                      }
                      className="rounded-full border border-rose-200 px-3 py-1 text-rose-500 transition hover:bg-rose-50"
                    >
                      删除
                    </button>
                  </div>
                  <LocalizedTextField
                    label="标题"
                    value={highlight.title}
                    onChange={(next) =>
                      setDraft((prev) => ({
                        ...prev,
                        serviceHighlights: prev.serviceHighlights.map((item, idx) =>
                          idx === index ? { ...item, title: cloneLocalized(next) } : item,
                        ),
                      }))
                    }
                  />
                  <LocalizedTextField
                    label="描述"
                    value={highlight.description}
                    onChange={(next) =>
                      setDraft((prev) => ({
                        ...prev,
                        serviceHighlights: prev.serviceHighlights.map((item, idx) =>
                          idx === index ? { ...item, description: cloneLocalized(next) } : item,
                        ),
                      }))
                    }
                    multiline
                    rows={3}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {showCapabilities ? (
          <div className="space-y-4">
            <LocalizedTextField
              label="板块小标题"
              value={draft.capabilityHeading}
              onChange={(next) =>
                setDraft((prev) => ({ ...prev, capabilityHeading: cloneLocalized(next) }))
              }
            />
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-text-tertiary,#8690a3)]">资质能力</h3>
              <button
                type="button"
                onClick={() =>
                  setDraft((prev) => ({
                    ...prev,
                    capabilities: [
                      ...prev.capabilities,
                      {
                        id: createId("company-capability"),
                        title: createEmptyLocalized(""),
                        subtitle: createEmptyLocalized(""),
                        description: createEmptyLocalized(""),
                        image: "",
                      },
                    ],
                  }))
                }
                className="rounded-full border border-[var(--color-brand-primary)] px-3 py-1 text-xs font-semibold text-[var(--color-brand-primary)]"
              >
                + 新增能力
              </button>
            </div>
            <div className="space-y-3">
              {draft.capabilities.map((capability, index) => (
                <div key={capability.id} className="space-y-3 rounded-2xl border border-[var(--color-border)] bg-white/80 p-4">
                  <div className="flex items-center justify-between text-xs text-[var(--color-text-tertiary,#8690a3)]">
                    <span>能力 {index + 1}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setDraft((prev) => ({
                          ...prev,
                          capabilities: prev.capabilities.filter((_, idx) => idx !== index),
                        }))
                      }
                      className="rounded-full border border-rose-200 px-3 py-1 text-rose-500 transition hover:bg-rose-50"
                    >
                      删除
                    </button>
                  </div>
                  <LocalizedTextField
                    label="标题"
                    value={capability.title}
                    onChange={(next) =>
                      setDraft((prev) => ({
                        ...prev,
                        capabilities: prev.capabilities.map((item, idx) =>
                          idx === index ? { ...item, title: cloneLocalized(next) } : item,
                        ),
                      }))
                    }
                  />
                  <LocalizedTextField
                    label="副标题"
                    value={capability.subtitle}
                    onChange={(next) =>
                      setDraft((prev) => ({
                        ...prev,
                        capabilities: prev.capabilities.map((item, idx) =>
                          idx === index ? { ...item, subtitle: cloneLocalized(next) } : item,
                        ),
                      }))
                    }
                  />
                  <LocalizedTextField
                    label="描述"
                    value={capability.description}
                    onChange={(next) =>
                      setDraft((prev) => ({
                        ...prev,
                        capabilities: prev.capabilities.map((item, idx) =>
                          idx === index ? { ...item, description: cloneLocalized(next) } : item,
                        ),
                      }))
                    }
                    multiline
                    rows={3}
                  />
                  <ImageUploadField
                    label="展示图片"
                    value={capability.image}
                    onChange={(next) =>
                      setDraft((prev) => ({
                        ...prev,
                        capabilities: prev.capabilities.map((item, idx) => (idx === index ? { ...item, image: next } : item)),
                      }))
                    }
                    helper="最佳尺寸 220×150"
                  />
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {showGallery ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-text-tertiary,#8690a3)]">图库</h3>
              <button
                type="button"
                onClick={() =>
                  setDraft((prev) => ({
                    ...prev,
                    gallery: [
                      ...prev.gallery,
                      { id: createId("company-gallery"), image: "", label: createEmptyLocalized("") },
                    ],
                  }))
                }
                className="rounded-full border border-[var(--color-brand-primary)] px-3 py-1 text-xs font-semibold text-[var(--color-brand-primary)]"
              >
                + 新增图片
              </button>
            </div>
            <div className="space-y-3">
              {draft.gallery.map((item, index) => (
                <div key={item.id} className="space-y-3 rounded-2xl border border-[var(--color-border)] bg-white/80 p-4">
                  <div className="flex items-center justify-between text-xs text-[var(--color-text-tertiary,#8690a3)]">
                    <span>图片 {index + 1}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setDraft((prev) => ({
                          ...prev,
                          gallery: prev.gallery.filter((_, idx) => idx !== index),
                        }))
                      }
                      className="rounded-full border border-rose-200 px-3 py-1 text-rose-500 transition hover:bg-rose-50"
                    >
                      删除
                    </button>
                  </div>
                  <ImageUploadField
                    label="图片地址"
                    value={item.image}
                    onChange={(next) =>
                      setDraft((prev) => ({
                        ...prev,
                        gallery: prev.gallery.map((galleryItem, idx) => (idx === index ? { ...galleryItem, image: next } : galleryItem)),
                      }))
                    }
                    helper={index === 0 ? "最佳尺寸 640×288" : "最佳尺寸 306×208"}
                  />
                  <LocalizedTextField
                    label="图片标题"
                    value={item.label}
                    onChange={(next) =>
                      setDraft((prev) => ({
                        ...prev,
                        gallery: prev.gallery.map((galleryItem, idx) =>
                          idx === index ? { ...galleryItem, label: cloneLocalized(next) } : galleryItem,
                        ),
                      }))
                    }
                  />
                </div>
              ))}
              {!draft.gallery.length ? (
                <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-white/60 p-4 text-center text-xs text-[var(--color-text-secondary)]">
                  暂无图库，请新增。
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </EditorDialog>
  );
}

function CheckboxList({
  label,
  options,
  values,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  values: string[];
  onChange: (next: string[]) => void;
}) {
  const toggle = (value: string) => {
    onChange(values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);
  };
  return (
    <div className="space-y-3">
      <span className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-text-tertiary,#8690a3)]">{label}</span>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => (
          <label key={option.value} className="flex items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-white/70 p-3 text-sm text-[var(--color-text-secondary)]">
            <input
              type="checkbox"
              checked={values.includes(option.value)}
              onChange={() => toggle(option.value)}
              className="h-4 w-4 rounded border-[var(--color-border)] text-[var(--color-brand-primary)] focus:ring-[var(--color-brand-primary)]"
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function ProductShowcaseDialog({
  value,
  scope,
  onSave,
  onCancel,
  productOptions,
}: {
  value: ProductShowcaseState;
  scope: ProductScope;
  onSave: (next: ProductShowcaseState) => void;
  onCancel: () => void;
  productOptions: ProductOption[];
}) {
  const [draft, setDraft] = useState<ProductShowcaseState>(() => ({
    heading: cloneLocalized(value.heading),
    description: cloneLocalized(value.description),
    cardCtaLabel: cloneLocalized(value.cardCtaLabel),
    selectedProductSlugs: [...value.selectedProductSlugs],
    cards: value.cards.map((card) => ({
      ...card,
      nameOverride: cloneLocalized(card.nameOverride),
      summaryOverride: cloneLocalized(card.summaryOverride),
    })),
  }));

  useEffect(() => {
    setDraft({
      heading: cloneLocalized(value.heading),
      description: cloneLocalized(value.description),
      cardCtaLabel: cloneLocalized(value.cardCtaLabel),
      selectedProductSlugs: [...value.selectedProductSlugs],
      cards: value.cards.map((card) => ({
        ...card,
        nameOverride: cloneLocalized(card.nameOverride),
        summaryOverride: cloneLocalized(card.summaryOverride),
      })),
    });
  }, [value, scope]);

  const showCopy = scope === "copy" || scope === "full";
  const showSelection = scope === "selection" || scope === "full";
  const showCards = scope === "cards" || scope === "full";

  const productSlugOptions = useMemo(() => {
    const baseOptions = productOptions;
    const baseSlugs = new Set(baseOptions.map((option) => option.value));
    const extraSlugs = Array.from(
      new Set(
        draft.cards
          .map((card) => card.productSlug.trim())
          .filter((slug) => slug && !baseSlugs.has(slug)),
      ),
    );

    if (!extraSlugs.length) {
      return baseOptions;
    }

    const extraOptions = extraSlugs.map((slug) => ({
      value: slug,
      label: `自定义：${slug}`,
    }));

    return [...baseOptions, ...extraOptions];
  }, [draft.cards, productOptions]);

  const handleMoveSelected = (index: number, offset: -1 | 1) => {
    setDraft((prev) => {
      const list = [...prev.selectedProductSlugs];
      const target = index + offset;
      if (target < 0 || target >= list.length) return prev;
      [list[index], list[target]] = [list[target], list[index]];
      return { ...prev, selectedProductSlugs: list };
    });
  };

  return (
    <EditorDialog
      title="编辑产品矩阵"
      subtitle="维护首页产品展示板块"
      onSave={() =>
        onSave({
          heading: cloneLocalized(draft.heading),
          description: cloneLocalized(draft.description),
          cardCtaLabel: cloneLocalized(draft.cardCtaLabel),
          selectedProductSlugs: [...draft.selectedProductSlugs],
          cards: draft.cards.map((card) => ({
            ...card,
            nameOverride: cloneLocalized(card.nameOverride),
            summaryOverride: cloneLocalized(card.summaryOverride),
          })),
        })
      }
      onCancel={onCancel}
    >
      <div className="space-y-6 text-sm">
        {showCopy ? (
          <div className="grid gap-4 md:grid-cols-2">
            <LocalizedTextField
              label="板块标题"
              value={draft.heading}
              onChange={(next) => setDraft((prev) => ({ ...prev, heading: next }))}
            />
            <div className="md:col-span-2">
              <LocalizedTextField
                label="板块摘要"
                value={draft.description}
                onChange={(next) => setDraft((prev) => ({ ...prev, description: next }))}
                multiline
                rows={4}
              />
            </div>
            <LocalizedTextField
              label="卡片按钮文案"
              value={draft.cardCtaLabel}
              onChange={(next) => setDraft((prev) => ({ ...prev, cardCtaLabel: next }))}
            />
          </div>
        ) : null}

        {showSelection ? (
          <CheckboxList
            label="精选产品"
            options={productOptions}
            values={draft.selectedProductSlugs}
            onChange={(next) => setDraft((prev) => ({ ...prev, selectedProductSlugs: next }))}
          />
        ) : null}

        {showSelection ? (
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-text-tertiary,#8690a3)]">精选产品顺序</h3>
            {draft.selectedProductSlugs.length ? (
              <div className="space-y-2">
                {draft.selectedProductSlugs.map((slug, index) => {
                  const label = productOptions.find((o) => o.value === slug)?.label || slug;
                  return (
                    <div key={`${slug}-${index}`} className="flex items-center justify-between rounded-2xl border border-[var(--color-border)] bg-white/70 p-3">
                      <span className="text-sm text-[var(--color-text-secondary)]">{label}</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleMoveSelected(index, -1)}
                          disabled={index === 0}
                          className="rounded-full border border-[var(--color-border)] px-3 py-1 transition hover:border-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary)] disabled:opacity-50"
                        >
                          上移
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveSelected(index, 1)}
                          disabled={index === draft.selectedProductSlugs.length - 1}
                          className="rounded-full border border-[var(--color-border)] px-3 py-1 transition hover:border-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary)] disabled:opacity-50"
                        >
                          下移
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-white/60 p-4 text-center text-xs text-[var(--color-text-secondary)]">未选择产品</div>
            )}
          </div>
        ) : null}

        {showCards ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-text-tertiary,#8690a3)]">卡片覆盖</h3>
              <button
                type="button"
                onClick={() =>
                  setDraft((prev) => ({
                    ...prev,
                    cards: [
                      ...prev.cards,
                      {
                        id: createId("product-card"),
                        productSlug: "",
                        nameOverride: createEmptyLocalized(""),
                        imageOverride: "",
                        summaryOverride: createEmptyLocalized(""),
                      },
                    ],
                  }))
                }
                className="rounded-full border border-[var(--color-brand-primary)] px-3 py-1 text-xs font-semibold text-[var(--color-brand-primary)]"
              >
                + 新增卡片
              </button>
            </div>
            <div className="space-y-3">
              {draft.cards.map((card, index) => (
                <div key={card.id} className="space-y-3 rounded-2xl border border-[var(--color-border)] bg-white/80 p-4">
                  <div className="flex items-center justify-between text-xs text-[var(--color-text-tertiary,#8690a3)]">
                    <span>卡片 {index + 1}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setDraft((prev) => ({
                          ...prev,
                          cards: prev.cards.filter((_, idx) => idx !== index),
                        }))
                      }
                      className="rounded-full border border-rose-200 px-3 py-1 text-rose-500 transition hover:bg-rose-50"
                    >
                      删除
                    </button>
                  </div>
                  <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-text-tertiary,#8690a3)]">
                    <span>产品 Slug</span>
                    <select
                      value={card.productSlug}
                      onChange={(event) => {
                        const nextSlug = event.target.value;
                        const option = productOptions.find((item) => item.value === nextSlug);
                        setDraft((prev) => ({
                          ...prev,
                          cards: prev.cards.map((item, idx) => {
                            if (idx !== index) return item;
                            const nextName = cloneLocalized(item.nameOverride);
                            const nextSummary = cloneLocalized(item.summaryOverride);
                            if (option && isLocalizedEmpty(item.nameOverride)) {
                              SUPPORTED_LOCALES.forEach((locale) => {
                                nextName[locale] = option.title[locale] ?? nextName[locale];
                              });
                            }
                            if (option && isLocalizedEmpty(item.summaryOverride)) {
                              SUPPORTED_LOCALES.forEach((locale) => {
                                nextSummary[locale] = option.summary[locale] ?? nextSummary[locale];
                              });
                            }
                            return {
                              ...item,
                              productSlug: nextSlug,
                              nameOverride: nextName,
                              summaryOverride: nextSummary,
                            };
                          }),
                        }));
                      }}
                      className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-text-secondary)] focus:border-[var(--color-brand-primary)] focus:outline-none"
                    >
                      <option value="">未选择</option>
                      {productSlugOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <span className="text-[10px] text-[var(--color-text-tertiary,#8690a3)]">
                      请选择需要覆盖的产品，Slug 将自动匹配。
                    </span>
                  </label>
                  <LocalizedTextField
                    label="名称覆盖"
                    value={card.nameOverride}
                    onChange={(next) =>
                      setDraft((prev) => ({
                        ...prev,
                        cards: prev.cards.map((item, idx) => (idx === index ? { ...item, nameOverride: next } : item)),
                      }))
                    }
                    helper="为空时使用产品默认名称"
                  />
                  <ImageUploadField
                    label="图片覆盖"
                    value={card.imageOverride}
                    onChange={(next) =>
                      setDraft((prev) => ({
                        ...prev,
                        cards: prev.cards.map((item, idx) => (idx === index ? { ...item, imageOverride: next } : item)),
                      }))
                    }
                    helper="最佳尺寸 384×288"
                  />
                  <LocalizedTextField
                    label="摘要"
                    value={card.summaryOverride}
                    onChange={(next) =>
                      setDraft((prev) => ({
                        ...prev,
                        cards: prev.cards.map((item, idx) => (idx === index ? { ...item, summaryOverride: next } : item)),
                      }))
                    }
                    multiline
                    rows={3}
                    helper="为空时使用产品默认摘要"
                  />
                </div>
              ))}
              {draft.cards.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-white/60 p-4 text-center text-xs text-[var(--color-text-secondary)]">
                  暂无卡片，请新增或从下方恢复默认卡片集合。
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </EditorDialog>
  );
}

function ApplicationAreasDialog({
  value,
  scope,
  onSave,
  onCancel,
  caseCategoryOptions,
}: {
  value: ApplicationAreasState;
  scope: ApplicationScope;
  onSave: (next: ApplicationAreasState) => void;
  onCancel: () => void;
  caseCategoryOptions: { value: string; label: string }[];
}) {
  const [draft, setDraft] = useState<ApplicationAreasState>(() => cloneApplicationAreasState(value));

  useEffect(() => {
    setDraft(cloneApplicationAreasState(value));
  }, [value, scope]);

  const handleMoveSelected = (index: number, offset: -1 | 1) => {
    setDraft((prev) => {
      const list = [...prev.selectedCategorySlugs];
      const target = index + offset;
      if (target < 0 || target >= list.length) return prev;
      [list[index], list[target]] = [list[target], list[index]];
      return { ...prev, selectedCategorySlugs: list };
    });
  };

  const showCopy = scope === "copy" || scope === "full";
  const showSelection = scope === "selection" || scope === "full";
  const showItems = scope === "items" || scope === "full";

  return (
    <EditorDialog
      title="编辑应用场景"
      subtitle="维护首页核心场景板块"
      onSave={() => onSave(cloneApplicationAreasState(draft))}
      onCancel={onCancel}
    >
      <div className="space-y-6 text-sm">
        {showCopy ? (
          <div className="space-y-4">
            <LocalizedTextField
              label="板块标题"
              value={draft.heading}
              onChange={(next) => setDraft((prev) => ({ ...prev, heading: cloneLocalized(next) }))}
            />
            <LocalizedTextField
              label="板块描述"
              value={draft.description}
              onChange={(next) =>
                setDraft((prev) => ({ ...prev, description: cloneLocalized(next) }))
              }
              multiline
              rows={4}
            />
            <LocalizedTextField
              label="操作文案"
              value={draft.actionLabel}
              onChange={(next) => setDraft((prev) => ({ ...prev, actionLabel: cloneLocalized(next) }))}
            />
            <label className="flex items-center gap-2 text-xs font-semibold text-[var(--color-brand-secondary)]">
              <input
                type="checkbox"
                checked={draft.overlayEnabled}
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
        ) : null}

        {showSelection ? (
          <CheckboxList
            label="已选分类"
            options={caseCategoryOptions}
            values={draft.selectedCategorySlugs}
            onChange={(next) => setDraft((prev) => ({ ...prev, selectedCategorySlugs: next }))}
          />
        ) : null}

        {showSelection ? (
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-text-tertiary,#8690a3)]">已选分类顺序</h3>
            {draft.selectedCategorySlugs.length ? (
              <div className="space-y-2">
                {draft.selectedCategorySlugs.map((slug, index) => {
                  const label = caseCategoryOptions.find((o) => o.value === slug)?.label || slug;
                  return (
                    <div key={`${slug}-${index}`} className="flex items-center justify-between rounded-2xl border border-[var(--color-border)] bg-white/70 p-3">
                      <span className="text-sm text-[var(--color-text-secondary)]">{label}</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleMoveSelected(index, -1)}
                          disabled={index === 0}
                          className="rounded-full border border-[var(--color-border)] px-3 py-1 transition hover:border-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary)] disabled:opacity-50"
                        >
                          上移
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveSelected(index, 1)}
                          disabled={index === draft.selectedCategorySlugs.length - 1}
                          className="rounded-full border border-[var(--color-border)] px-3 py-1 transition hover:border-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary)] disabled:opacity-50"
                        >
                          下移
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-white/60 p-4 text-center text-xs text-[var(--color-text-secondary)]">未选择分类</div>
            )}
          </div>
        ) : null}

        {showItems ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-text-tertiary,#8690a3)]">卡片内容</h3>
              <button
                type="button"
                onClick={() =>
                  setDraft((prev) => ({
                    ...prev,
                    items: [
                      ...prev.items,
                      {
                        id: createId("application-item"),
                        areaKey: caseCategoryOptions[0]?.value ?? "",
                        imageOverride: "",
                        nameOverride: createEmptyLocalized(""),
                        nameOverrideEnabled: false,
                        descriptionOverride: createEmptyLocalized(""),
                        descriptionOverrideEnabled: false,
                        highlightOverride: createEmptyLocalized(""),
                        highlightOverrideEnabled: false,
                      },
                    ],
                  }))
                }
                className="rounded-full border border-[var(--color-brand-primary)] px-3 py-1 text-xs font-semibold text-[var(--color-brand-primary)]"
              >
                + 新增卡片
              </button>
            </div>
            <div className="space-y-3">
              {draft.items.map((item, index) => (
                <div key={item.id} className="space-y-3 rounded-2xl border border-[var(--color-border)] bg-white/80 p-4">
                  <div className="flex items-center justify-between text-xs text-[var(--color-text-tertiary,#8690a3)]">
                    <span>卡片 {index + 1}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setDraft((prev) => ({
                          ...prev,
                          items: prev.items.filter((_, idx) => idx !== index),
                        }))
                      }
                      className="rounded-full border border-rose-200 px-3 py-1 text-rose-500 transition hover:bg-rose-50"
                    >
                      删除
                    </button>
                  </div>
                  <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-text-tertiary,#8690a3)]">
                    <span>场景分类</span>
                    <select
                      value={item.areaKey}
                      onChange={(event) =>
                        setDraft((prev) => ({
                          ...prev,
                          items: prev.items.map((card, idx) => (idx === index ? { ...card, areaKey: event.target.value } : card)),
                        }))
                      }
                      className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-text-secondary)] focus:border-[var(--color-brand-primary)] focus:outline-none"
                    >
                      <option value="">未设置</option>
                      {caseCategoryOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <ImageUploadField
                    label="图片覆盖"
                    value={item.imageOverride}
                    onChange={(next) =>
                      setDraft((prev) => ({
                        ...prev,
                        items: prev.items.map((card, idx) => (idx === index ? { ...card, imageOverride: next } : card)),
                      }))
                    }
                    helper="最佳尺寸 1200×520"
                  />
                  <LocalizedTextField
                    label="标题覆盖"
                    value={item.nameOverride}
                    onChange={(next) =>
                      setDraft((prev) => ({
                        ...prev,
                        items: prev.items.map((card, idx) =>
                          idx === index
                            ? { ...card, nameOverride: cloneLocalized(next), nameOverrideEnabled: true }
                            : card,
                        ),
                      }))
                    }
                  />
                  <LocalizedTextField
                    label="描述覆盖"
                    value={item.descriptionOverride}
                    onChange={(next) =>
                      setDraft((prev) => ({
                        ...prev,
                        items: prev.items.map((card, idx) =>
                          idx === index
                            ? {
                                ...card,
                                descriptionOverride: cloneLocalized(next),
                                descriptionOverrideEnabled: true,
                              }
                            : card,
                        ),
                      }))
                    }
                    multiline
                    rows={3}
                  />
                  <LocalizedTextField
                    label="亮点描述"
                    value={item.highlightOverride}
                    onChange={(next) =>
                      setDraft((prev) => ({
                        ...prev,
                        items: prev.items.map((card, idx) =>
                          idx === index
                            ? {
                                ...card,
                                highlightOverride: cloneLocalized(next),
                                highlightOverrideEnabled: true,
                              }
                            : card,
                        ),
                      }))
                    }
                    multiline
                    rows={3}
                  />
                  {(item.highlightOverrideEnabled
                    || !isLocalizedEmpty(item.highlightOverride)
                    || item.nameOverrideEnabled
                    || !isLocalizedEmpty(item.nameOverride)
                    || item.descriptionOverrideEnabled
                    || !isLocalizedEmpty(item.descriptionOverride)) ? (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() =>
                          setDraft((prev) => ({
                            ...prev,
                            items: prev.items.map((card, idx) =>
                              idx === index
                                ? {
                                    ...card,
                                    nameOverride: createEmptyLocalized(""),
                                    nameOverrideEnabled: false,
                                    descriptionOverride: createEmptyLocalized(""),
                                    descriptionOverrideEnabled: false,
                                    highlightOverride: createEmptyLocalized(""),
                                    highlightOverrideEnabled: false,
                                  }
                                : card,
                            ),
                          }))
                        }
                        className="text-[10px] font-semibold text-[var(--color-brand-primary)] underline-offset-2 hover:underline"
                      >
                        恢复默认内容
                      </button>
                    </div>
                  ) : null}
                </div>
              ))}
              {!draft.items.length ? (
                <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-white/60 p-4 text-center text-xs text-[var(--color-text-secondary)]">
                  暂无卡片，请新增。
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </EditorDialog>
  );
}

function InventoryHighlightDialog({
  value,
  scope,
  onSave,
  onCancel,
}: {
  value: InventoryHighlightState;
  scope: InventoryScope;
  onSave: (next: InventoryHighlightState) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<InventoryHighlightState>(() => cloneInventoryHighlightState(value));

  useEffect(() => {
    setDraft(cloneInventoryHighlightState(value));
  }, [value, scope]);

  const showCopy = scope === "copy" || scope === "full";
  const showCtas = scope === "ctas" || scope === "full";

  return (
    <EditorDialog
      title="编辑现货库存高光"
      subtitle="维护首页库存板块"
      onSave={() => onSave(cloneInventoryHighlightState(draft))}
      onCancel={onCancel}
    >
      <div className="space-y-6 text-sm">
        {showCopy ? (
          <div className="space-y-4">
            <LocalizedTextField
              label="标题"
              value={draft.heading}
              onChange={(next) => setDraft((prev) => ({ ...prev, heading: cloneLocalized(next) }))}
            />
            <LocalizedTextField
              label="描述"
              value={draft.description}
              onChange={(next) =>
                setDraft((prev) => ({ ...prev, description: cloneLocalized(next) }))
              }
              multiline
              rows={4}
            />
            <ImageUploadField
              label="主视觉"
              value={draft.heroImage}
              onChange={(next) => setDraft((prev) => ({ ...prev, heroImage: next }))}
              helper="最佳尺寸 1200×520"
            />
          </div>
        ) : null}

        {showCtas ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-text-tertiary,#8690a3)]">按钮</h3>
              <button
                type="button"
                onClick={() =>
                  setDraft((prev) => ({
                    ...prev,
                    ctas: [
                      ...prev.ctas,
                      { id: createId("inventory-cta"), href: "", label: createEmptyLocalized("") },
                    ],
                  }))
                }
                className="rounded-full border border-[var(--color-brand-primary)] px-3 py-1 text-xs font-semibold text-[var(--color-brand-primary)]"
              >
                + 新增按钮
              </button>
            </div>
            <div className="space-y-3">
              {draft.ctas.map((cta, index) => (
                <div key={cta.id} className="space-y-3 rounded-2xl border border-[var(--color-border)] bg-white/80 p-4">
                  <div className="flex items-center justify-between text-xs text-[var(--color-text-tertiary,#8690a3)]">
                    <span>按钮 {index + 1}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setDraft((prev) => ({
                          ...prev,
                          ctas: prev.ctas.filter((_, idx) => idx !== index),
                        }))
                      }
                      className="rounded-full border border-rose-200 px-3 py-1 text-rose-500 transition hover:bg-rose-50"
                    >
                      删除
                    </button>
                  </div>
                  <TextField
                    label="链接"
                    value={cta.href}
                    onChange={(next) =>
                      setDraft((prev) => ({
                        ...prev,
                        ctas: prev.ctas.map((item, idx) => (idx === index ? { ...item, href: next } : item)),
                      }))
                    }
                    placeholder="/inventory"
                  />
                  <LocalizedTextField
                    label="按钮文本"
                    value={cta.label}
                    onChange={(next) =>
                      setDraft((prev) => ({
                        ...prev,
                        ctas: prev.ctas.map((item, idx) =>
                          idx === index ? { ...item, label: cloneLocalized(next) } : item,
                        ),
                      }))
                    }
                  />
                </div>
              ))}
              {!draft.ctas.length ? (
                <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-white/60 p-4 text-center text-xs text-[var(--color-text-secondary)]">
                  暂无按钮，请新增。
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </EditorDialog>
  );
}

function ContactCtaDialog({
  value,
  scope,
  onSave,
  onCancel,
}: {
  value: ContactCtaState;
  scope: ContactCtaScope;
  onSave: (next: ContactCtaState) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<ContactCtaState>(() => cloneContactCtaState(value));

  useEffect(() => {
    setDraft(cloneContactCtaState(value));
  }, [value, scope]);

  const showCopy = scope === "copy" || scope === "full";
  const showActions = scope === "actions" || scope === "full";

  return (
    <EditorDialog
      title="编辑联系 CTA"
      subtitle="维护首页联系板块"
      onSave={() => onSave(cloneContactCtaState(draft))}
      onCancel={onCancel}
    >
      <div className="space-y-6 text-sm">
        {showCopy ? (
          <div className="space-y-4">
            <LocalizedTextField
              label="眉文"
              value={draft.eyebrow}
              onChange={(next) => setDraft((prev) => ({ ...prev, eyebrow: cloneLocalized(next) }))}
            />
            <LocalizedTextField
              label="标题"
              value={draft.title}
              onChange={(next) => setDraft((prev) => ({ ...prev, title: cloneLocalized(next) }))}
            />
            <LocalizedTextField
              label="描述"
              value={draft.description}
              onChange={(next) => setDraft((prev) => ({ ...prev, description: cloneLocalized(next) }))}
              multiline
              rows={4}
            />
          </div>
        ) : null}

        {showActions ? (
          <div className="space-y-6">
            <div className="space-y-4 rounded-2xl border border-[var(--color-border)] bg-white/80 p-4">
              <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-text-tertiary,#8690a3)]">主按钮</h3>
              <TextField
                label="链接"
                value={draft.primary.href}
                onChange={(next) => setDraft((prev) => ({ ...prev, primary: { ...prev.primary, href: next } }))}
                placeholder="/contact"
              />
              <LocalizedTextField
                label="按钮文本"
                value={draft.primary.label}
                onChange={(next) => setDraft((prev) => ({ ...prev, primary: { ...prev.primary, label: cloneLocalized(next) } }))}
              />
            </div>

            <div className="space-y-4 rounded-2xl border border-[var(--color-border)] bg-white/80 p-4">
              <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-text-tertiary,#8690a3)]">次按钮</h3>
              <TextField
                label="链接"
                value={draft.secondary.href}
                onChange={(next) => setDraft((prev) => ({ ...prev, secondary: { ...prev.secondary, href: next } }))}
                placeholder="/about"
              />
              <LocalizedTextField
                label="按钮文本"
                value={draft.secondary.label}
                onChange={(next) => setDraft((prev) => ({ ...prev, secondary: { ...prev.secondary, label: cloneLocalized(next) } }))}
              />
            </div>
          </div>
        ) : null}
      </div>
    </EditorDialog>
  );
}

export function HomeConfigEditor({
  configKey,
  initialConfig,
  relatedData,
}: {
  configKey: string;
  initialConfig: Record<string, unknown>;
  relatedData?: Record<string, unknown>;
}) {
  const casesConfig = useMemo<CasesConfig | undefined>(() => {
    return relatedData && typeof relatedData === "object"
      ? (relatedData as { casesConfig?: CasesConfig }).casesConfig
      : undefined;
  }, [relatedData]);

  const caseCategories = useMemo<CaseCategory[]>(() => {
    return ensureArray<CaseCategory>(casesConfig?.categories || cases_config?.categories);
  }, [casesConfig]);

  const caseCategoryOptions = useMemo(() => {
    return caseCategories.map((category) => ({
      value: ensureString(category.slug),
      label: ensureString(category.name) || ensureString(category.slug) || "分类",
    }));
  }, [caseCategories]);

  const caseStudyOptions = useMemo<CaseStudyOption[]>(() => {
    return caseCategories.flatMap((category) => {
      const categoryRecord = ensureObject(category);
      const categorySlug = ensureString(categoryRecord.slug);
      if (!categorySlug) return [] as CaseStudyOption[];
      const categoryLabel = ensureString(categoryRecord.name) || categorySlug || "分类";
      return ensureArray<CaseStudy>(categoryRecord.studies)
        .map((study) => {
          const studyRecord = ensureObject(study);
          const slug = ensureString(studyRecord.slug);
          if (!slug) return null;
          const title = ensureString(studyRecord.title) || slug;
          return {
            value: slug,
            label: `${categoryLabel} / ${title}`,
            category: categorySlug,
            href: `/cases/${categorySlug}/${slug}`,
          } as CaseStudyOption;
        })
        .filter((item): item is CaseStudyOption => Boolean(item));
    });
  }, [caseCategories]);

  const caseStudyLookup = useMemo(() => {
    return new Map(caseStudyOptions.map((option) => [option.value, option]));
  }, [caseStudyOptions]);

  const productCenterConfig = useMemo<ProductCenterConfig>(() => {
    const source =
      relatedData && typeof relatedData === "object"
        ? (relatedData as { productCenterConfig?: ProductCenterConfig }).productCenterConfig
        : undefined;
    const base = source ?? FALLBACK_PRODUCT_CENTER_CONFIG;
    return {
      ...base,
      products: base.products.map((product) => ({ ...product })),
    } satisfies ProductCenterConfig;
  }, [relatedData]);

  const productOptions = useMemo<ProductOption[]>(() => {
    const baseProducts = productCenterConfig.products.map((product) => ensureObject(product));
    const options = baseProducts
      .map((product) => {
        const slug = ensureString(product.slug)?.trim();
        if (!slug) return null;
        const title = ensureCompleteLocalizedField(product.name ?? product.title, slug) as LocalizedText;
        const summary = ensureCompleteLocalizedField(product.summary ?? product.description, "") as LocalizedText;
        const tagline = ensureCompleteLocalizedField(product.tagline, "") as LocalizedText;
        return {
          value: slug,
          label: getLocaleText(title, undefined, slug),
          title,
          summary,
          tagline,
        } satisfies ProductOption;
      })
      .filter((option): option is ProductOption => Boolean(option));
    if (!options.length) {
      return DEFAULT_PRODUCT_OPTIONS;
    }
    const seen = new Set<string>();
    const uniqueOptions: ProductOption[] = [];
    for (const option of options) {
      if (seen.has(option.value)) continue;
      seen.add(option.value);
      uniqueOptions.push(option);
    }
    for (const fallbackOption of DEFAULT_PRODUCT_OPTIONS) {
      if (seen.has(fallbackOption.value)) continue;
      seen.add(fallbackOption.value);
      uniqueOptions.push(fallbackOption);
    }
    return uniqueOptions;
  }, [productCenterConfig]);

  const normalizedInitialConfig = useMemo(
    () => normalizeConfig(initialConfig, productOptions, caseCategoryOptions, caseStudyLookup),
    [initialConfig, productOptions, caseCategoryOptions, caseStudyLookup],
  );

  const [config, setConfig] = useState<HomeConfigState>(normalizedInitialConfig);
  useGlobalTranslationRegistrationForConfig({ config, setConfig, labelPrefix: configKey });
  const [baseline, setBaseline] = useState<HomeConfigState>(normalizedInitialConfig);
  const [editing, setEditing] = useState<EditingTarget | null>(null);
  const [formState, dispatch] = useFormState<UpdateSiteConfigActionState, FormData>(updateSiteConfigAction, { status: "idle" });
  const formRef = useRef<HTMLFormElement>(null);
  const latestConfigRef = useRef(config);
  const prevStatusRef = useRef(formState.status);
  const prevResultRef = useRef(formState);
  const toast = useToast();

  useEffect(() => {
    setConfig(normalizedInitialConfig);
    setBaseline(normalizedInitialConfig);
  }, [normalizedInitialConfig]);

  useEffect(() => {
    latestConfigRef.current = config;
  }, [config]);

  useEffect(() => {
    if (formState.status === "success") {
      setBaseline({
        ...latestConfigRef.current,
        hero: {
          ...latestConfigRef.current.hero,
          slides: latestConfigRef.current.hero.slides.map((slide) => ({ ...slide })),
        },
        companyOverview: cloneCompanyOverviewState(latestConfigRef.current.companyOverview),
        productShowcase: {
          ...latestConfigRef.current.productShowcase,
          heading: cloneLocalized(latestConfigRef.current.productShowcase.heading),
          cardCtaLabel: cloneLocalized(latestConfigRef.current.productShowcase.cardCtaLabel),
          selectedProductSlugs: [...latestConfigRef.current.productShowcase.selectedProductSlugs],
          cards: latestConfigRef.current.productShowcase.cards.map((card) => ({
            ...card,
            nameOverride: cloneLocalized(card.nameOverride),
            summaryOverride: cloneLocalized(card.summaryOverride),
          })),
        },
        applicationAreas: cloneApplicationAreasState(latestConfigRef.current.applicationAreas),
        inventoryHighlight: cloneInventoryHighlightState(latestConfigRef.current.inventoryHighlight),
        contactCta: cloneContactCtaState(latestConfigRef.current.contactCta),
      });
      toast.success("保存成功");
      window.dispatchEvent(
        new CustomEvent("site-config:save-success", { detail: { key: configKey } }),
      );
      formRef.current?.classList.add("animate-pulse");
      const timer = window.setTimeout(() => formRef.current?.classList.remove("animate-pulse"), 400);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [formState, toast, configKey]);

  const payload = useMemo(() => JSON.stringify(serializeConfig(config)), [config]);
  const isDirty = useMemo(() => JSON.stringify(config) !== JSON.stringify(baseline), [config, baseline]);

  // 全局保存覆盖层状态与方法
  const [globalSavePhase, setGlobalSavePhase] = useState<"idle" | "saving" | "confirm_cancel" | "restoring">("idle");

  function startGlobalSave(nextConfig?: HomeConfigState) {
    const fd = new FormData();
    fd.set("key", configKey);
    try {
      const source = nextConfig ?? latestConfigRef.current;
      fd.set("payload", JSON.stringify(serializeConfig(source)));
    } catch {
      fd.set("payload", payload);
    }
    dispatch(fd);
  }

  useEffect(() => {
    const didStatusChange = prevStatusRef.current !== formState.status;
    if (didStatusChange) {
      prevStatusRef.current = formState.status;
    }

    if (formState.status === "success" || formState.status === "error") {
      if (globalSavePhase === "saving" || globalSavePhase === "restoring") {
        setGlobalSavePhase("idle");
      }
    }
  }, [formState, globalSavePhase]);

  function handleCancelSaveRequest() {}
  function handleCancelSaveConfirmExit() {
    setConfig(baseline);
    const fd = new FormData();
    fd.set("key", configKey);
    fd.set("payload", JSON.stringify(serializeConfig(baseline)));
    dispatch(fd);
  }
  function handleCancelSaveContinue() {}

  // 新增：读取可见性配置，并提供首页英雄区隐藏开关的保存逻辑

  return (
    <div className="space-y-10">


      <HomePreview
        config={config}
        onEdit={setEditing}
        productConfig={productCenterConfig}
        casesConfig={casesConfig}
      />

      {editing?.type === "hero" ? (
        <HeroDialog
          value={config.hero}
          scope={editing.scope}
          onCancel={() => setEditing(null)}
          onSave={(next) => {
            const updated = { ...config, hero: next };
            setConfig(updated);
            setEditing(null);
            startGlobalSave(updated);
          }}
          caseCategoryOptions={caseCategoryOptions}
          caseStudyOptions={caseStudyOptions}
          caseStudyLookup={caseStudyLookup}
        />
      ) : null}

      {editing?.type === "company" ? (
        <CompanyOverviewDialog
          value={config.companyOverview}
          scope={editing.scope}
          onCancel={() => setEditing(null)}
          onSave={(next) => {
            const updated = { ...config, companyOverview: next };
            setConfig(updated);
            setEditing(null);
            startGlobalSave(updated);
          }}
        />
      ) : null}

      {editing?.type === "product" ? (
        <ProductShowcaseDialog
          value={config.productShowcase}
          scope={editing.scope}
          productOptions={productOptions}
          onCancel={() => setEditing(null)}
          onSave={(next) => {
            const updated = { ...config, productShowcase: next };
            setConfig(updated);
            setEditing(null);
            startGlobalSave(updated);
          }}
        />
      ) : null}

      {editing?.type === "applications" ? (
        <ApplicationAreasDialog
          value={config.applicationAreas}
          scope={editing.scope}
          onCancel={() => setEditing(null)}
          onSave={(next) => {
            const updated = { ...config, applicationAreas: next };
            setConfig(updated);
            setEditing(null);
            startGlobalSave(updated);
          }}
          caseCategoryOptions={caseCategoryOptions}
        />
      ) : null}

      {editing?.type === "inventory" ? (
        <InventoryHighlightDialog
          value={config.inventoryHighlight}
          scope={editing.scope}
          onCancel={() => setEditing(null)}
          onSave={(next) => {
            const updated = { ...config, inventoryHighlight: next };
            setConfig(updated);
            setEditing(null);
            startGlobalSave(updated);
          }}
        />
      ) : null}

      {editing?.type === "contactCta" ? (
        <ContactCtaDialog
          value={config.contactCta}
          scope={editing.scope}
          onCancel={() => setEditing(null)}
          onSave={(next) => {
            const updated = { ...config, contactCta: next };
            setConfig(updated);
            setEditing(null);
            startGlobalSave(updated);
          }}
        />
      ) : null}

      {globalSavePhase !== "idle" ? (
        <div aria-live="polite" className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="pointer-events-auto w-[480px] max-w-[90vw] rounded-2xl bg-white p-6 shadow-xl">
            {globalSavePhase === "confirm_cancel" ? (
              <>
                <div className="mb-4 text-lg font-semibold">确认取消保存</div>
                <div className="mb-6 text-sm text-[var(--color-text-secondary)]">退出将会丢失本阶段的所有保存。是否退出保存并还原至保存前？</div>
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    className="rounded-md border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-gray-50"
                    onClick={handleCancelSaveContinue}
                  >
                    继续保存
                  </button>
                  <button
                    type="button"
                    className="rounded-md bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
                    onClick={handleCancelSaveConfirmExit}
                  >
                    是，退出保存
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="mb-2 text-lg font-semibold">正在全局保存</div>
                <div className="mb-6 text-sm text-[var(--color-text-secondary)]">请耐心等待，保存期间不要退出或刷新页面。</div>
                <div className="mb-6 flex items-center gap-3">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--color-brand-primary)] border-t-transparent" />
                  <span className="text-sm text-[var(--color-text-secondary)]">保存中…</span>
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    className="rounded-md border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-gray-50"
                    onClick={handleCancelSaveRequest}
                  >
                    取消保存
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
