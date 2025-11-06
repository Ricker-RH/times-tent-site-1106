import type { JSX } from "react";
import type { Metadata } from "next";
import { ensurePageVisible, getHiddenSections } from "@/server/visibility";

import HomeClient, {
  type HomeApplicationTab,
  type HomeHeroData,
  type HomeHeroSlide,
} from "./HomeClient";

import type {
  HomeCompanyOverview,
  HomeInventoryHighlight,
  HomeProductCard,
  ProductMatrixSectionProps,
} from "@/components/home/ProductMatrixSection";
import { fetchCasesConfig } from "@/server/cases";
import {
  getHomeConfig,
  getProductCenterConfig,
  type HomeConfig,
  type ProductCenterConfig,
  type CaseCategory,
} from "@/server/pageConfigs";
import { FALLBACK_HOME_CONFIG } from "@/constants/siteFallbacks";
import { DEFAULT_LOCALE, normalizeLocalizedField } from "@/i18n/locales";
import { getCurrentLocale, setCurrentLocale } from "@/data";
import { getRequestLocale } from "@/server/locale";

type ProductShowcaseSection = NonNullable<HomeConfig["productShowcase"]>;
type ProductShowcaseCard = NonNullable<ProductShowcaseSection["cards"]>[number];
type CaseStudySource = CaseCategory["studies"][number];

type LocalizedOrString = string | Record<string, string>;

function resolveLocalizedCandidate(value: unknown): LocalizedOrString | undefined {
  if (!value) return undefined;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
  }
  if (typeof value === "object") {
    const record = normalizeLocalizedField(value);
    const entries = Object.entries(record).filter(([, val]) => typeof val === "string" && (val as string).trim().length > 0) as [
      string,
      string,
    ][];
    if (entries.length) {
      const normalized: Record<string, string> = {};
      entries.forEach(([key, val]) => {
        normalized[key] = val.trim();
      });
      return normalized;
    }
  }
  return undefined;
}

function pickLocalizedValue(...candidates: unknown[]): LocalizedOrString | undefined {
  for (const candidate of candidates) {
    const resolved = resolveLocalizedCandidate(candidate);
    if (resolved !== undefined) {
      return resolved;
    }
  }
  return undefined;
}

function isExplicitEmptyLocalized(value: unknown): boolean {
  if (value === null) return true;
  if (typeof value === "undefined") return false;
  if (typeof value === "string") {
    return value.trim().length === 0;
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (!entries.length) {
      return false;
    }
    return entries.every(([, raw]) => {
      if (raw === null || typeof raw === "undefined") {
        return true;
      }
      if (typeof raw === "string") {
        return raw.trim().length === 0;
      }
      return false;
    });
  }
  return false;
}

function toDefaultLocaleString(candidates: unknown[], fallback = ""): string {
  const value = pickLocalizedValue(...candidates);
  if (!value) return fallback;
  if (typeof value === "string") return value;
  const record = normalizeLocalizedField(value);
  const active = getCurrentLocale?.() ?? DEFAULT_LOCALE;
  return record[active] ?? record[DEFAULT_LOCALE] ?? Object.values(record)[0] ?? fallback;
}

// Resolve array of string | LocalizedField to ACTIVE locale strings
function toDefaultLocaleStringArray(candidate: unknown): string[] {
  if (!Array.isArray(candidate)) {
    return [];
  }
  const active = getCurrentLocale?.() ?? DEFAULT_LOCALE;
  const result: string[] = [];
  for (const item of candidate) {
    if (typeof item === "string") {
      const trimmed = item.trim();
      if (trimmed) result.push(trimmed);
      continue;
    }
    if (item && typeof item === "object") {
      const record = normalizeLocalizedField(item);
      const val = record[active] ?? record[DEFAULT_LOCALE] ?? Object.values(record)[0];
      const trimmed = (val || "").trim();
      if (trimmed) result.push(trimmed);
    }
  }
  return result;
}

export const metadata: Metadata = {
  title: "时代篷房 TIMES TENT",
  description: "时代篷房一站式模块化篷房解决方案，覆盖体育赛事、文旅酒店、工业仓储、展览活动等多元应用场景。",
};

export const dynamic = "force-dynamic";

export default async function Page(): Promise<JSX.Element> {
  const visibility = await ensurePageVisible("home");
  const locale = getRequestLocale();
  setCurrentLocale(locale);

  const [homeConfig, casesConfig, productConfig] = await Promise.all([
    getHomeConfig(),
    fetchCasesConfig(),
    getProductCenterConfig(),
  ]);

  const caseCategories = normalizeCaseCategories(casesConfig.categories);
  const hiddenSections = getHiddenSections(visibility, "home");
  const hero = buildHeroData(homeConfig, caseCategories);
  const applicationTabs = buildApplicationTabs(homeConfig, caseCategories);
  const applicationSection = buildApplicationSection(homeConfig);
  const productShowcase = buildProductShowcase(homeConfig, productConfig);
  const companyOverview = buildCompanyOverview(homeConfig);
  const inventoryHighlight = buildInventoryHighlight(homeConfig);
  const contactCta = buildContactCta(homeConfig);

  // 自动隐藏：当配置显式置为 null 时，不展示对应板块
  const heroRaw = homeConfig.hero ?? {};
  const shouldHideHero =
    Object.prototype.hasOwnProperty.call(heroRaw, "title") &&
    Object.prototype.hasOwnProperty.call(heroRaw, "description") &&
    Object.prototype.hasOwnProperty.call(heroRaw, "badge") &&
    (heroRaw as Record<string, unknown>).title === null &&
    (heroRaw as Record<string, unknown>).description === null &&
    (heroRaw as Record<string, unknown>).badge === null;

  const applicationRaw = homeConfig.applicationAreas ?? {};
  const shouldHideApplications =
    Object.prototype.hasOwnProperty.call(applicationRaw, "heading") &&
    Object.prototype.hasOwnProperty.call(applicationRaw, "description") &&
    Object.prototype.hasOwnProperty.call(applicationRaw, "actionLabel") &&
    (applicationRaw as Record<string, unknown>).heading === null &&
    (applicationRaw as Record<string, unknown>).description === null &&
    (applicationRaw as Record<string, unknown>).actionLabel === null;

  const productRaw = homeConfig.productShowcase ?? {};
  const shouldHideProduct =
    Object.prototype.hasOwnProperty.call(productRaw, "heading") &&
    Object.prototype.hasOwnProperty.call(productRaw, "viewAllLabel") &&
    Object.prototype.hasOwnProperty.call(productRaw, "cardCtaLabel") &&
    (productRaw as Record<string, unknown>).heading === null &&
    (productRaw as Record<string, unknown>).viewAllLabel === null &&
    (productRaw as Record<string, unknown>).cardCtaLabel === null;

  const companyRaw = homeConfig.companyOverview ?? {};
  const companyHeroRaw = companyRaw.hero ?? {};
  const shouldHideCompany =
    Object.prototype.hasOwnProperty.call(companyRaw, "title") &&
    Object.prototype.hasOwnProperty.call(companyHeroRaw, "title") &&
    Object.prototype.hasOwnProperty.call(companyHeroRaw, "description") &&
    (companyRaw as Record<string, unknown>).title === null &&
    (companyHeroRaw as Record<string, unknown>).title === null &&
    (companyHeroRaw as Record<string, unknown>).description === null;

  const inventoryRaw = homeConfig.inventoryHighlight ?? {};
  const shouldHideInventory =
    Object.prototype.hasOwnProperty.call(inventoryRaw, "heading") &&
    Object.prototype.hasOwnProperty.call(inventoryRaw, "description") &&
    (inventoryRaw as Record<string, unknown>).heading === null &&
    (inventoryRaw as Record<string, unknown>).description === null;

  const contactRaw = homeConfig.contactCta ?? {};
  const shouldHideContactCta =
    Object.prototype.hasOwnProperty.call(contactRaw, "eyebrow") &&
    Object.prototype.hasOwnProperty.call(contactRaw, "title") &&
    Object.prototype.hasOwnProperty.call(contactRaw, "description") &&
    (contactRaw as Record<string, unknown>).eyebrow === null &&
    (contactRaw as Record<string, unknown>).title === null &&
    (contactRaw as Record<string, unknown>).description === null;

  const mergedHidden = {
    ...hiddenSections,
    hero: hiddenSections.hero || shouldHideHero,
    applications: hiddenSections.applications || shouldHideApplications,
    product: hiddenSections.product || shouldHideProduct,
    company: hiddenSections.company || shouldHideCompany,
    inventory: hiddenSections.inventory || shouldHideInventory,
    contactCta: hiddenSections.contactCta || shouldHideContactCta,
  };

  return (
    <HomeClient
      hero={hero}
      applicationTabs={applicationTabs}
      applicationSection={applicationSection}
      productShowcase={productShowcase}
      companyOverview={companyOverview}
      inventoryHighlight={inventoryHighlight}
      contactCta={contactCta}
      hiddenSections={mergedHidden}
    />
  );
}

function buildHeroData(homeConfig: HomeConfig, categories: CaseCategoryView[]): HomeHeroData {
  const heroConfig = homeConfig.hero ?? {};
  const fallbackHero = FALLBACK_HOME_CONFIG.hero ?? {};
  const hasBadgeProp = Object.prototype.hasOwnProperty.call(heroConfig, "badge");
  let badge = pickLocalizedValue(
    heroConfig.badge,
    (heroConfig as Record<string, unknown>)?.badgeEn,
    fallbackHero.badge,
    (fallbackHero as Record<string, unknown>)?.badgeEn,
    "模块化临建 · 极速交付",
  );
  if (hasBadgeProp && (heroConfig as Record<string, unknown>).badge === null) {
    badge = "";
  } else if (
    hasBadgeProp &&
    typeof (heroConfig as Record<string, unknown>).badge === "string" &&
    ((heroConfig as Record<string, unknown>).badge as string).trim().length === 0
  ) {
    // 显式空字符串视为置空，不触发回退
    badge = "";
  } else if (
    hasBadgeProp &&
    heroConfig.badge &&
    typeof heroConfig.badge === "object"
  ) {
    // 如果是本地化对象但所有语言都为空字符串，则视为显式置空
    const record = heroConfig.badge as Record<string, unknown>;
    const hasAnyNonEmpty = Object.values(record).some((val) => typeof val === "string" && val.trim().length > 0);
    if (!hasAnyNonEmpty) {
      badge = "";
    }
  }
  const hasTitleProp = Object.prototype.hasOwnProperty.call(heroConfig, "title");
  let title = pickLocalizedValue(
    heroConfig.title,
    (heroConfig as Record<string, unknown>)?.titleEn,
    fallbackHero.title,
    (fallbackHero as Record<string, unknown>)?.titleEn,
    "时代篷房",
  );
  if (hasTitleProp && (heroConfig as Record<string, unknown>).title === null) {
    title = "";
  } else if (
    hasTitleProp &&
    typeof (heroConfig as Record<string, unknown>).title === "string" &&
    ((heroConfig as Record<string, unknown>).title as string).trim().length === 0
  ) {
    // 显式空字符串视为置空，不触发回退
    title = "";
  }
  const hasDescriptionProp = Object.prototype.hasOwnProperty.call(heroConfig, "description");
  let description = pickLocalizedValue(
    heroConfig.description,
    (heroConfig as Record<string, unknown>)?.descriptionEn,
    fallbackHero.description,
    (fallbackHero as Record<string, unknown>)?.descriptionEn,
    "撑起每个重要时刻 — 专业铝合金篷房设计 · 制造 · 方案交付。",
  );
  if (hasDescriptionProp && (heroConfig as Record<string, unknown>).description === null) {
    description = "";
  } else if (
    hasDescriptionProp &&
    typeof (heroConfig as Record<string, unknown>).description === "string" &&
    ((heroConfig as Record<string, unknown>).description as string).trim().length === 0
  ) {
    // 显式空字符串视为置空，不触发回退
    description = "";
  }

  const slides: HomeHeroSlide[] = [];
  const seen = new Set<string>();
  const slidesSource = Array.isArray(heroConfig.slides) ? heroConfig.slides : [];
  for (const item of slidesSource) {
    const slug = item.caseRef?.slug ?? "";
    if (!slug || seen.has(slug)) continue;
    const found = findCaseStudy(categories, slug, item.caseRef?.category);
    const study = found?.study;
    const category = found?.category;
    const href = item.href ?? (category && study ? `/cases/${category.slug}/${study.slug}` : `/cases/${slug}`);
    const image = item.imageOverride?.src ?? study?.image ?? "https://images.unsplash.com/photo-1542626991-cbc4e32524cc?auto=format&w=2000&q=80";
    const fallbackEyebrow = [category?.name, study?.location].filter(Boolean).join(" · ");
    const overrideHighlightI18n = toDefaultLocaleStringArray((item as any).highlightsOverrideI18n);
    const overrideHighlightSimple = Array.isArray((item as any).highlightsOverride)
      ? ((item as any).highlightsOverride as unknown[])
          .filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
          .map((entry) => entry.trim())
      : undefined;
    const studyHighlights = Array.isArray(study?.highlights)
      ? study.highlights
          .filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
          .map((entry) => entry.trim())
      : [];
    const hasOverrideFlag = Object.prototype.hasOwnProperty.call(item, "highlightsOverrideI18n")
      || Object.prototype.hasOwnProperty.call(item, "highlightsOverride");
    const highlights = hasOverrideFlag
      ? (overrideHighlightI18n.length ? overrideHighlightI18n : (overrideHighlightSimple ?? []))
      : studyHighlights;
    slides.push({
      slug,
      href,
      title: study?.title ?? slug,
      summary: study?.summary,
      highlights,
      image,
      category: category?.name ?? category?.slug,
      eyebrow: toDefaultLocaleString([ (item as any).eyebrowOverride, fallbackEyebrow ], fallbackEyebrow) || undefined,
    });
    seen.add(slug);
  }

  if (!slides.length) {
    const fallbackCategory = categories[0];
    const fallbackStudy = fallbackCategory?.studies?.[0];
    if (fallbackCategory && fallbackStudy) {
      const fallbackHighlights = Array.isArray(fallbackStudy.highlights)
        ? fallbackStudy.highlights
            .filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
            .map((entry) => entry.trim())
        : [];
      const fallbackTitle = fallbackStudy.title ?? fallbackStudy.slug;
      const fallbackImage = fallbackStudy.image ?? "https://images.unsplash.com/photo-1542626991-cbc4e32524cc?auto=format&w=2000&q=80";
      slides.push({
        slug: fallbackStudy.slug,
        href: `/cases/${fallbackCategory.slug}/${fallbackStudy.slug}`,
        title: fallbackTitle,
        summary: fallbackStudy.summary,
        highlights: fallbackHighlights,
        image: fallbackImage,
        category: fallbackCategory.name ?? fallbackCategory.slug,
        eyebrow: `${fallbackCategory.name} · ${fallbackStudy.location ?? ""}`.trim(),
      });
    }
  }

  const primaryHref = heroConfig.ctaPrimaryHref ?? slides[0]?.href ?? "/cases";
  const secondaryHref = heroConfig.ctaSecondaryHref ?? "/cases";
  const hasPrimaryLabelProp = Object.prototype.hasOwnProperty.call(heroConfig, "ctaPrimary");
  let primaryLabel = pickLocalizedValue(
    heroConfig.ctaPrimary,
    (heroConfig as Record<string, unknown>)?.ctaPrimaryEn,
    fallbackHero.ctaPrimary,
    (fallbackHero as Record<string, unknown>)?.ctaPrimaryEn,
    "查看详情",
  );
  if (hasPrimaryLabelProp && (heroConfig as Record<string, unknown>).ctaPrimary === null) {
    primaryLabel = "";
  }
  const hasSecondaryLabelProp = Object.prototype.hasOwnProperty.call(heroConfig, "ctaSecondary");
  let secondaryLabel = pickLocalizedValue(
    heroConfig.ctaSecondary,
    (heroConfig as Record<string, unknown>)?.ctaSecondaryEn,
    fallbackHero.ctaSecondary,
    (fallbackHero as Record<string, unknown>)?.ctaSecondaryEn,
    "更多案例",
  );
  if (hasSecondaryLabelProp && (heroConfig as Record<string, unknown>).ctaSecondary === null) {
    secondaryLabel = "";
  }

  return {
    badge,
    title,
    description,
    highlights: slides[0]?.highlights ?? [],
    slides,
    primaryCta: hasPrimaryLabelProp
      ? primaryLabel
        ? { label: primaryLabel, href: primaryHref }
        : undefined
      : slides[0]
        ? { label: slides[0].title ?? "查看详情", href: slides[0].href }
        : undefined,
    secondaryCta: hasSecondaryLabelProp
      ? secondaryLabel
        ? { label: secondaryLabel, href: secondaryHref }
        : undefined
      : { label: "更多案例", href: secondaryHref },
  };
}

function buildApplicationTabs(homeConfig: HomeConfig, categories: CaseCategoryView[]): HomeApplicationTab[] {
  const selected = homeConfig.applicationAreas?.selectedCategorySlugs?.filter(Boolean) ?? [];
  const overrides = new Map(
    (homeConfig.applicationAreas?.items ?? [])
      .filter((item) => item.areaKey)
      .map((item) => [item.areaKey as string, item]),
  );

  const categoriesBySlug = new Map(categories.map((category) => [category.slug, category]));

  const orderedSlugs = selected.length ? selected : categories.map((category) => category.slug);

  const tabs: HomeApplicationTab[] = [];
  for (const slug of orderedSlugs) {
    const category = categoriesBySlug.get(slug);
    if (!category) continue;
    const override = overrides.get(slug);
    const primaryStudy = category.studies[0];
    const fallbackImage = "https://images.unsplash.com/photo-1552083375-1447ce886485?auto=format&w=1600&q=80";
    const image = override?.imageOverride?.trim() || primaryStudy?.image || fallbackImage;

    const hasHighlightOverride = override ? Object.prototype.hasOwnProperty.call(override, "highlightOverride") : false;
    const hasHighlightEnOverride = override ? Object.prototype.hasOwnProperty.call(override as Record<string, unknown>, "highlightEnOverride") : false;
    const highlightRaw = hasHighlightOverride || hasHighlightEnOverride
      ? override?.highlightOverride
      : Array.isArray(primaryStudy?.highlights)
        ? primaryStudy.highlights.find((entry) => typeof entry === "string" && entry.trim().length > 0)
        : undefined;

    const hasNameOverride = override ? Object.prototype.hasOwnProperty.call(override, "nameOverride") : false;
    const hasDescriptionOverride = override ? Object.prototype.hasOwnProperty.call(override, "descriptionOverride") : false;
    const hasDescriptionEnOverride = override ? Object.prototype.hasOwnProperty.call(override as Record<string, unknown>, "descriptionEnOverride") : false;

    const name =
      pickLocalizedValue(
        override?.nameOverride,
        (override as Record<string, unknown>)?.nameEnOverride,
        category.name,
        slug,
      ) ?? slug;

    // helper: detect explicit empty (string "", null, or localized object with all empty)
    const isEmptyLocalized = (val: unknown): boolean => {
      if (val === null) return true;
      if (typeof val === "string") return val.trim().length === 0;
      if (val && typeof val === "object") {
        const record = normalizeLocalizedField(val);
        const values = Object.values(record);
        return values.length > 0 && values.every((v) => typeof v !== "string" || v.trim().length === 0);
      }
      return false;
    };

    // description: if override prop exists and both CN/EN are explicitly empty, disable fallback by returning null
    let description: any;
    const descCn = override?.descriptionOverride as unknown;
    const descEn = (override as Record<string, unknown>)?.descriptionEnOverride as unknown;
    const descPropExists = hasDescriptionOverride || hasDescriptionEnOverride;
    if (descPropExists && isEmptyLocalized(descCn) && isEmptyLocalized(descEn)) {
      description = null;
    } else {
      description = pickLocalizedValue(
        descCn,
        descEn,
        category.intro,
        "",
      );
    }

    // highlight: if override prop exists and both CN/EN are explicitly empty, disable fallback by returning null
    let highlight: any;
    const hlCn = override?.highlightOverride as unknown;
    const hlEn = (override as Record<string, unknown>)?.highlightEnOverride as unknown;
    const hlPropExists = hasHighlightOverride || hasHighlightEnOverride;
    if (hlPropExists && isEmptyLocalized(hlCn) && isEmptyLocalized(hlEn)) {
      highlight = null;
    } else {
      const highlightText = pickLocalizedValue(
        hlCn,
        hlEn,
        highlightRaw,
      );
      highlight = typeof highlightText === "string" || typeof highlightText === "object" ? highlightText : undefined;
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

function buildApplicationSection(homeConfig: HomeConfig) {
  const fallbackApplication = FALLBACK_HOME_CONFIG.applicationAreas ?? {};
  const raw = homeConfig.applicationAreas ?? {};
  const headingExists = Object.prototype.hasOwnProperty.call(raw, "heading");
  const headingValue = (raw as Record<string, unknown>)?.heading;
  const isEmptyHeading =
    headingValue === null ||
    (typeof headingValue === "string" && headingValue.trim().length === 0) ||
    (typeof headingValue === "object" && Object.keys(normalizeLocalizedField(headingValue)).length === 0);

  const heading = headingExists && isEmptyHeading
    ? null
    : pickLocalizedValue(
        raw.heading,
        (raw as Record<string, unknown>)?.headingEn,
        fallbackApplication.heading,
        (fallbackApplication as Record<string, unknown>)?.headingEn,
        "五大核心应用场景",
      );

  // description: if field exists and is explicitly empty/null, disable fallback by returning null
  const descriptionExists = Object.prototype.hasOwnProperty.call(raw, "description");
  const descriptionValue = (raw as Record<string, unknown>)?.description;
  const isEmptyDescription =
    descriptionValue === null ||
    (typeof descriptionValue === "string" && descriptionValue.trim().length === 0) ||
    (typeof descriptionValue === "object" &&
      Object.values(normalizeLocalizedField(descriptionValue)).every((v) => (typeof v === "string" ? v.trim().length === 0 : true)));

  const description = descriptionExists && isEmptyDescription
    ? null
    : pickLocalizedValue(
        raw.description,
        (raw as Record<string, unknown>)?.descriptionEn,
        fallbackApplication.description,
        (fallbackApplication as Record<string, unknown>)?.descriptionEn,
      );

  return {
    heading,
    description,
    actionLabel: pickLocalizedValue(
      raw.actionLabel,
      (raw as Record<string, unknown>)?.actionLabelEn,
      fallbackApplication.actionLabel,
      (fallbackApplication as Record<string, unknown>)?.actionLabelEn,
      "查看详情",
    ),
  };
}

function buildProductShowcase(homeConfig: HomeConfig, productConfig: ProductCenterConfig): ProductMatrixSectionProps["productShowcase"] {
  const productShowcaseConfig = homeConfig.productShowcase ?? {};
  const selected = Array.isArray(productShowcaseConfig.selectedProductSlugs)
    ? productShowcaseConfig.selectedProductSlugs.filter(
        (slug): slug is string => typeof slug === "string" && slug.trim().length > 0,
      )
    : [];
  const cardsSource: ProductShowcaseCard[] = Array.isArray(productShowcaseConfig.cards)
    ? (productShowcaseConfig.cards as ProductShowcaseCard[])
    : [];
  const cardConfigs = cardsSource.filter(
    (card): card is ProductShowcaseCard & { productSlug: string } =>
      typeof card?.productSlug === "string" && card.productSlug.trim().length > 0,
  );
  const overridesBySlug = new Map(
    cardConfigs.map((card) => [card.productSlug.trim(), card]),
  );
  const productsBySlug = new Map(productConfig.products.map((product) => [product.slug, product]));

  const fallbackOrder = cardConfigs.map((card) => card.productSlug.trim());
  const baseOrder = selected.length ? selected : fallbackOrder;
  const seen = new Set<string>();
  const slugs: string[] = [];
  for (const slug of baseOrder) {
    const cleanSlug = slug.trim();
    if (!cleanSlug || seen.has(cleanSlug)) continue;
    const hasOverride = overridesBySlug.has(cleanSlug);
    const hasProduct = productsBySlug.has(cleanSlug);
    if (!hasOverride && !hasProduct) continue;
    seen.add(cleanSlug);
    slugs.push(cleanSlug);
  }

  if (!slugs.length) {
    for (const product of productConfig.products) {
      const cleanSlug = product.slug?.trim();
      if (!cleanSlug || seen.has(cleanSlug)) continue;
      seen.add(cleanSlug);
      slugs.push(cleanSlug);
    }
  }

  const hasOwn = (target: unknown, key: string): boolean =>
    target !== null && typeof target === "object" && Object.prototype.hasOwnProperty.call(target, key);

  const isExplicitEmpty = (value: unknown): boolean => {
    if (value === null) return true;
    if (typeof value === "string") return value.trim().length === 0;
    if (value && typeof value === "object") {
      const record = normalizeLocalizedField(value);
      const values = Object.values(record);
      if (values.length === 0) {
        return true;
      }
      return values.every((entry) => (typeof entry === "string" ? entry.trim().length === 0 : true));
    }
    return false;
  };

  const resolveSummary = (
    product: ProductCenterConfig["products"][number] | undefined,
    override: ProductShowcaseCard | undefined,
  ): LocalizedOrString | undefined => {
    const overrideHasSummary = hasOwn(override, "summaryOverride") || hasOwn(override, "summaryEnOverride");
    const overrideSummaryCandidates: unknown[] = [
      override?.summaryOverride,
      override?.summaryEnOverride,
    ];
    const overrideHasContent = overrideSummaryCandidates.some((candidate) => resolveLocalizedCandidate(candidate) !== undefined);
    if (overrideHasSummary) {
      if (!overrideHasContent || overrideSummaryCandidates.every((candidate) => isExplicitEmpty(candidate))) {
        return "";
      }
      return pickLocalizedValue(override?.summaryOverride, override?.summaryEnOverride);
    }

    const productHasSummary = hasOwn(product, "summary") || hasOwn(product, "summaryEn");
    const productSummaryCandidates: unknown[] = [product?.summary, product?.summaryEn];
    const productHasContent = productSummaryCandidates.some((candidate) => resolveLocalizedCandidate(candidate) !== undefined);
    if (productHasSummary) {
      if (!productHasContent || productSummaryCandidates.every((candidate) => isExplicitEmpty(candidate))) {
        return "";
      }
      return pickLocalizedValue(product?.summary, product?.summaryEn);
    }

    return pickLocalizedValue(product?.tagline);
  };

  const cards: HomeProductCard[] = [];
  for (const slug of slugs) {
    const product = productsBySlug.get(slug);
    const override = overridesBySlug.get(slug);
    const title = pickLocalizedValue(
      override?.nameOverride,
      (override as Record<string, unknown>)?.nameEnOverride,
      product?.name,
      slug,
    ) ?? slug;
    const description = resolveSummary(product, override);
    const image = override?.imageOverride?.trim() || product?.image;
    const tagline = pickLocalizedValue(product?.tagline);
    cards.push({
      slug,
      title,
      description,
      image,
      href: `/products/${slug}`,
      tagline,
    });
  }

  const heading =
    pickLocalizedValue(
      productShowcaseConfig.heading,
      (productShowcaseConfig as Record<string, unknown>)?.headingEn,
      FALLBACK_HOME_CONFIG.productShowcase?.heading,
      (FALLBACK_HOME_CONFIG.productShowcase as Record<string, unknown>)?.headingEn,
      "核心篷房产品矩阵",
    ) ?? "核心篷房产品矩阵";

  const viewAllLabel =
    pickLocalizedValue(
      (productShowcaseConfig as Record<string, unknown>)?.viewAllLabel,
      (productShowcaseConfig as Record<string, unknown>)?.viewAllLabelEn,
      (FALLBACK_HOME_CONFIG.productShowcase as Record<string, unknown>)?.viewAllLabel,
      "浏览所有产品",
    ) ?? "浏览所有产品";

  const cardCtaLabel =
    pickLocalizedValue(
      productShowcaseConfig.cardCtaLabel,
      (productShowcaseConfig as Record<string, unknown>)?.cardCtaLabelEn,
      FALLBACK_HOME_CONFIG.productShowcase?.cardCtaLabel,
      "查看详情",
    ) ?? "查看详情";

  let description =
    pickLocalizedValue(
      (productShowcaseConfig as Record<string, unknown>)?.description,
      (productShowcaseConfig as Record<string, unknown>)?.descriptionEn,
      (FALLBACK_HOME_CONFIG.productShowcase as Record<string, unknown>)?.description,
      (FALLBACK_HOME_CONFIG.productShowcase as Record<string, unknown>)?.descriptionEn,
      "精选核心产品，适配赛事、展会、文旅等多场景。",
    );

  // 显式空值策略：当配置为 null、空字符串或所有语言都为空时，不回退到默认值
  const hasDescriptionProp = Object.prototype.hasOwnProperty.call(productShowcaseConfig, "description");
  if (hasDescriptionProp && (productShowcaseConfig as Record<string, unknown>).description === null) {
    description = "";
  } else if (
    hasDescriptionProp &&
    typeof (productShowcaseConfig as Record<string, unknown>).description === "string" &&
    (((productShowcaseConfig as Record<string, unknown>).description as string).trim().length === 0)
  ) {
    description = "";
  } else if (
    hasDescriptionProp &&
    productShowcaseConfig.description &&
    typeof productShowcaseConfig.description === "object"
  ) {
    const record = productShowcaseConfig.description as Record<string, unknown>;
    const hasAnyNonEmpty = Object.values(record).some((val) => typeof val === "string" && val.trim().length > 0);
    if (!hasAnyNonEmpty) {
      description = "";
    }
  }

  return {
    heading,
    viewAllHref: "/products",
    viewAllLabel,
    cardCtaLabel,
    description,
    cards,
  };
}

function buildCompanyOverview(homeConfig: HomeConfig): HomeCompanyOverview {
  const company = homeConfig.companyOverview ?? {};
  const fallbackCompany = FALLBACK_HOME_CONFIG.companyOverview ?? {};
  const heroConfig = company.hero ?? fallbackCompany.hero ?? {};
  const gallerySource =
    (Array.isArray(company.gallery) && company.gallery.length ? company.gallery : undefined)
      ?? (Array.isArray(fallbackCompany.gallery) ? fallbackCompany.gallery : []);
  const statsSource =
    (Array.isArray(company.stats) && company.stats.length ? company.stats : undefined)
      ?? (Array.isArray(fallbackCompany.stats) ? fallbackCompany.stats : []);
  const highlightsSource =
    (Array.isArray(company.serviceHighlights) && company.serviceHighlights.length ? company.serviceHighlights : undefined)
      ?? (Array.isArray(fallbackCompany.serviceHighlights) ? fallbackCompany.serviceHighlights : []);
  const capabilitiesSource =
    (Array.isArray(company.capabilities) && company.capabilities.length ? company.capabilities : undefined)
      ?? (Array.isArray(fallbackCompany.capabilities) ? fallbackCompany.capabilities : []);

  return {
    title: pickLocalizedValue(
      company.title,
      (company as Record<string, unknown>)?.titleEn,
      fallbackCompany.title,
      (fallbackCompany as Record<string, unknown>)?.titleEn,
    ),
    capabilityHeading: pickLocalizedValue(
      (company as Record<string, unknown>)?.capabilityHeading,
      (company as Record<string, unknown>)?.capabilityHeadingEn,
      (fallbackCompany as Record<string, unknown>)?.capabilityHeading,
      (fallbackCompany as Record<string, unknown>)?.capabilityHeadingEn,
      "核心能力与资质",
    ),
    hero: heroConfig
      ? {
          title: pickLocalizedValue(
            heroConfig.title,
            (heroConfig as Record<string, unknown>)?.titleEn,
            fallbackCompany.hero?.title,
            (fallbackCompany.hero as Record<string, unknown> | undefined)?.titleEn,
          ),
          secondary: pickLocalizedValue(
            heroConfig.secondary,
            (heroConfig as Record<string, unknown>)?.secondaryEn,
            fallbackCompany.hero?.secondary,
            (fallbackCompany.hero as Record<string, unknown> | undefined)?.secondaryEn,
          ),
          description: pickLocalizedValue(
            heroConfig.description,
            (heroConfig as Record<string, unknown>)?.descriptionEn,
            fallbackCompany.hero?.description,
            (fallbackCompany.hero as Record<string, unknown> | undefined)?.descriptionEn,
          ),
          image: heroConfig.image ?? fallbackCompany.hero?.image,
        }
      : undefined,
    stats: statsSource.map((stat, index) => {
      const fallbackStat = (fallbackCompany.stats ?? [])[index] ?? {};
      return {
        label: pickLocalizedValue(
          stat?.label,
          (stat as Record<string, unknown>)?.labelEn,
          fallbackStat?.label,
          (fallbackStat as Record<string, unknown>)?.labelEn,
        ),
        value: (stat?.value ?? fallbackStat?.value) as string | undefined,
      };
    }),
    serviceHighlights: highlightsSource.map((item, index) => {
      const fallbackItem = (fallbackCompany.serviceHighlights ?? [])[index] ?? {};
      return {
        title: pickLocalizedValue(
          item?.title,
          (item as Record<string, unknown>)?.titleEn,
          fallbackItem?.title,
          (fallbackItem as Record<string, unknown>)?.titleEn,
        ),
        description: pickLocalizedValue(
          item?.description,
          (item as Record<string, unknown>)?.descriptionEn,
          item?.subtitle,
          (item as Record<string, unknown>)?.subtitleEn,
          fallbackItem?.description,
          (fallbackItem as Record<string, unknown>)?.descriptionEn,
          fallbackItem?.subtitle,
          (fallbackItem as Record<string, unknown>)?.subtitleEn,
        ),
      };
    }),
    capabilities: capabilitiesSource.map((item, index) => {
      const fallbackItem = (fallbackCompany.capabilities ?? [])[index] ?? {};
      const subtitleExplicitEmpty = isExplicitEmptyLocalized(item?.subtitle);
      const descriptionExplicitEmpty = isExplicitEmptyLocalized(item?.description);
      return {
        title: pickLocalizedValue(
          item?.title,
          (item as Record<string, unknown>)?.titleEn,
          fallbackItem?.title,
          (fallbackItem as Record<string, unknown>)?.titleEn,
        ),
        subtitle: subtitleExplicitEmpty
          ? ""
          : pickLocalizedValue(
              item?.subtitle,
              (item as Record<string, unknown>)?.subtitleEn,
              fallbackItem?.subtitle,
              (fallbackItem as Record<string, unknown>)?.subtitleEn,
            ),
        description: descriptionExplicitEmpty
          ? ""
          : pickLocalizedValue(
              item?.description,
              (item as Record<string, unknown>)?.descriptionEn,
              fallbackItem?.description,
              (fallbackItem as Record<string, unknown>)?.descriptionEn,
            ),
        image: item?.image ?? fallbackItem?.image,
      };
    }),
    gallery: {
      hero: gallerySource.length
        ? [
            {
              title: pickLocalizedValue(
                gallerySource[0]?.label,
                (gallerySource[0] as Record<string, unknown>)?.labelEn,
                (fallbackCompany.gallery ?? [])[0]?.label,
              ),
              image: gallerySource[0]?.image,
            },
          ]
        : [],
      support: gallerySource.slice(1, 3).map((item, index) => {
        const fallbackItem = (fallbackCompany.gallery ?? [])[index + 1] ?? {};
        return {
          title: pickLocalizedValue(
            item?.label,
            (item as Record<string, unknown>)?.labelEn,
            fallbackItem?.label,
            (fallbackItem as Record<string, unknown>)?.labelEn,
          ),
          image: item?.image ?? fallbackItem?.image,
        };
      }),
    },
  };
}

function buildInventoryHighlight(homeConfig: HomeConfig): HomeInventoryHighlight {
  const highlight = homeConfig.inventoryHighlight ?? {};
  const fallbackHighlight = FALLBACK_HOME_CONFIG.inventoryHighlight ?? {};
  const ctasSource =
    (Array.isArray(highlight.ctas) && highlight.ctas.length ? highlight.ctas : undefined)
      ?? (Array.isArray(fallbackHighlight.ctas) ? fallbackHighlight.ctas : []);
  return {
    heading: pickLocalizedValue(
      highlight.heading,
      (highlight as Record<string, unknown>)?.headingEn,
      fallbackHighlight.heading,
      (fallbackHighlight as Record<string, unknown>)?.headingEn,
    ),
    description: pickLocalizedValue(
      highlight.description,
      (highlight as Record<string, unknown>)?.descriptionEn,
      fallbackHighlight.description,
      (fallbackHighlight as Record<string, unknown>)?.descriptionEn,
    ),
    heroImage: highlight.heroImage ?? fallbackHighlight.heroImage,
    ctas:
      ctasSource.length
        ? ctasSource.map((cta, index) => {
            const fallbackCta = (fallbackHighlight.ctas ?? [])[index] ?? {};
            const labelCandidate = pickLocalizedValue(
              cta?.label,
              (cta as Record<string, unknown>)?.labelEn,
              fallbackCta?.label,
              (fallbackCta as Record<string, unknown>)?.labelEn,
            );
            return {
              href: cta?.href ?? fallbackCta?.href ?? "/contact",
              label: labelCandidate ?? (cta?.label ?? fallbackCta?.label ?? "联系顾问"),
            };
          })
        : [
            { href: "/inventory", label: "查看库存" },
            { href: "/contact", label: "联系顾问" },
          ],
  };
}

function buildContactCta(homeConfig: HomeConfig) {
  const contact = homeConfig.contactCta ?? {};
  const fallbackContact = FALLBACK_HOME_CONFIG.contactCta ?? {};
  const primaryConfig = contact.primary ?? fallbackContact.primary ?? {};
  const secondaryConfig = contact.secondary ?? fallbackContact.secondary ?? {};

  return {
    eyebrow: pickLocalizedValue(
      contact.eyebrow,
      (contact as Record<string, unknown>)?.eyebrowEn,
      fallbackContact.eyebrow,
      (fallbackContact as Record<string, unknown>)?.eyebrowEn,
      "联系团队",
    ),
    title: pickLocalizedValue(
      contact.title,
      (contact as Record<string, unknown>)?.titleEn,
      fallbackContact.title,
      (fallbackContact as Record<string, unknown>)?.titleEn,
      "需要快速响应的模块化空间方案？",
    ),
    description: pickLocalizedValue(
      contact.description,
      (contact as Record<string, unknown>)?.descriptionEn,
      fallbackContact.description,
      (fallbackContact as Record<string, unknown>)?.descriptionEn,
    ),
    primary: primaryConfig
      ? {
          href: primaryConfig.href ?? "/contact#form",
          label: pickLocalizedValue(
            primaryConfig.label,
            (primaryConfig as Record<string, unknown>)?.labelEn,
            fallbackContact.primary?.label,
            (fallbackContact.primary as Record<string, unknown> | undefined)?.labelEn,
            "预约项目沟通",
          ),
        }
      : undefined,
    secondary: secondaryConfig
      ? {
          href: secondaryConfig.href ?? "/contact",
          label: pickLocalizedValue(
            secondaryConfig.label,
            (secondaryConfig as Record<string, unknown>)?.labelEn,
            fallbackContact.secondary?.label,
            (fallbackContact.secondary as Record<string, unknown> | undefined)?.labelEn,
            "查看联系方式",
          ),
        }
      : undefined,
  };
}

function findCaseStudy(categories: CaseCategoryView[], slug: string, categorySlug?: string) {
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

interface CaseStudyView {
  slug: string;
  title?: string;
  summary?: string;
  highlights: string[];
  image?: string;
  location?: string;
}

interface CaseCategoryView {
  slug: string;
  name?: string;
  intro?: string;
  studies: CaseStudyView[];
}

function normalizeCaseCategories(categories: readonly CaseCategory[] | CaseCategory[] | undefined): CaseCategoryView[] {
  if (!categories) {
    return [];
  }
  const result: CaseCategoryView[] = [];
  for (const category of categories) {
    if (!category || typeof category !== "object") continue;
    const slug = typeof category.slug === "string" ? category.slug : "";
    if (!slug) continue;
    const name = typeof category.name === "string" ? category.name : undefined;
    const intro = typeof category.intro === "string" ? category.intro : undefined;
    const studiesSource: CaseStudySource[] = Array.isArray(category.studies)
      ? (category.studies as CaseStudySource[])
      : [];
    const studies: CaseStudyView[] = [];
    for (const study of studiesSource) {
      if (!study || typeof study !== "object") continue;
      const studySlug = typeof study.slug === "string" ? study.slug : "";
      if (!studySlug) continue;
      const highlightsI18n = toDefaultLocaleStringArray((study as any).highlightsI18n);
      const highlightsRaw = Array.isArray(study.highlights)
        ? (study.highlights as unknown[])
            .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
            .map((item) => item.trim())
        : [];
      const highlights = highlightsI18n.length ? highlightsI18n : highlightsRaw;
      studies.push({
        slug: studySlug,
        title: typeof study.title === "string" ? study.title : undefined,
        summary: typeof study.summary === "string" ? study.summary : undefined,
        highlights,
        image: typeof study.image === "string" ? study.image : undefined,
        location: typeof study.location === "string" ? study.location : undefined,
      });
    }
    result.push({
      slug,
      name,
      intro,
      studies,
    });
  }
  return result;
}
