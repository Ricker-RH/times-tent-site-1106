import { product_details } from "@/data/configs";
import { PRODUCT_MEDIA, DEFAULT_MEDIA } from "@/data/productMedia";
import { resolveImageSrc, sanitizeImageSrc } from "@/utils/image";
import { DEFAULT_LOCALE, getCurrentLocale } from "@/data";

function toStringValue(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return fallback;
}

function readLocalized(value: unknown, fallback = ""): string {
  if (!value) return fallback;
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value !== "object" || Array.isArray(value)) return fallback;
  const record = value as Record<string, unknown>;
  const active = getCurrentLocale?.() ?? DEFAULT_LOCALE;
  const byActive = record[active];
  if (typeof byActive === "string" && byActive.trim()) return byActive;
  const byDefault = record[DEFAULT_LOCALE];
  if (typeof byDefault === "string" && byDefault.trim()) return byDefault;
  const first = Object.values(record).find((v) => typeof v === "string" && v.trim().length);
  return typeof first === "string" ? first : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function asStringArray(value: unknown, fallback: string[] = []): string[] {
  if (!Array.isArray(value)) return [...fallback];
  const result: string[] = [];
  value.forEach((item, index) => {
    const str = readLocalized(item, fallback[index] ?? "").trim();
    if (str) {
      result.push(str);
    }
  });
  return result.length ? result : [...fallback];
}

function asStringMatrix(value: unknown, fallback: string[][] = []): string[][] {
  if (!Array.isArray(value)) return fallback.map((group) => [...group]);
  const groups: string[][] = [];
  value.forEach((group, idx) => {
    if (!Array.isArray(group)) return;
    const normalized = asStringArray(group, fallback[idx] ?? []);
    if (normalized.length) {
      groups.push(normalized);
    }
  });
  return groups.length ? groups : fallback.map((group) => [...group]);
}

interface RawPair {
  label?: unknown;
  value?: unknown;
}

function asPairMatrix(value: unknown, fallback: DetailMetricGroup[] = []): DetailMetricGroup[] {
  if (!Array.isArray(value)) return fallback.map((group) => group.map((item) => ({ ...item })));
  const groups: DetailMetricGroup[] = [];
  value.forEach((group, groupIdx) => {
    if (!Array.isArray(group)) return;
    const normalized: DetailMetricGroup = [];
    group.forEach((item, itemIdx) => {
      if (!isRecord(item)) return;
      const fallbackItem = fallback[groupIdx]?.[itemIdx];
      const label = readLocalized(item.label, fallbackItem?.label ?? "").trim();
      const val = readLocalized(item.value, fallbackItem?.value ?? "").trim();
      if (label || val) {
        normalized.push({ label, value: val });
      }
    });
    if (normalized.length) {
      groups.push(normalized);
    }
  });
  return groups.length ? groups : fallback.map((group) => group.map((item) => ({ ...item })));
}

export interface DetailHeroConfig {
  badge?: string;
  description?: string;
  scenarios?: string;
  image?: string;
}

export interface DetailMetricItem {
  label: string;
  value: string;
}

export type DetailMetricGroup = DetailMetricItem[];

export interface DetailSectionConfig {
  heading: string;
  paragraphs: string[];
  lists: string[][];
  pairs: DetailMetricGroup[];
}

export interface DetailGalleryItem {
  src: string;
  alt: string;
}

export interface DetailCtaConfig {
  title: string;
  description?: string;
  primaryLabel: string;
  primaryHref?: string;
  phoneLabel?: string;
  phoneNumber?: string;
}

export interface ProductDetailConfig {
  slug?: string;
  title: string;
  hero: DetailHeroConfig;
  breadcrumb: string[];
  sections: DetailSectionConfig[];
  gallery: DetailGalleryItem[];
  cta?: DetailCtaConfig;
}

export type ProductDetailConfigMap = Record<string, ProductDetailConfig>;

export interface ProductDetailSeed {
  title?: string;
  summary?: string;
  tagline?: string;
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
    cta: detail.cta ? { ...detail.cta } : undefined,
  };
}

function buildDefaultSections(seed?: ProductDetailSeed): DetailSectionConfig[] {
  const summaryPlaceholder = seed?.summary ?? "请在此补充产品概览，说明结构特点与交付能力。";
  return [
    {
      heading: "产品概览",
      paragraphs: [summaryPlaceholder],
      lists: [],
      pairs: [],
    },
    {
      heading: "典型场景与亮点",
      paragraphs: [
        "描述适用场景、使用体验与差异化亮点，可结合租赁、搭建或运营案例。",
      ],
      lists: [],
      pairs: [],
    },
    {
      heading: "项目实景图库",
      paragraphs: [],
      lists: [],
      pairs: [],
    },
  ];
}

function buildFallbackDetail(slug: string, seed?: ProductDetailSeed): ProductDetailConfig {
  const fallbackRaw = product_details[slug as keyof typeof product_details];
  const media = PRODUCT_MEDIA[slug] ?? DEFAULT_MEDIA;
  if (!fallbackRaw || !isRecord(fallbackRaw)) {
    const derivedTitle = seed?.title ?? slug;
    return {
      title: derivedTitle,
      hero: {
        image: media.hero,
        description: seed?.summary ?? "请在此补充该产品的简介与价值主张。",
        scenarios: seed?.tagline ?? "",
        badge: "PRODUCT",
      },
      breadcrumb: ["首页", "产品", derivedTitle],
      sections: buildDefaultSections(seed),
      gallery: media.gallery.map((item) => ({ ...item })),
      cta: {
        title: "需要定制方案？",
        description:
          "留下项目信息，24 小时内由行业顾问回电，为您提供方案设计、预算测算与现场勘查。",
        primaryLabel: "提交项目信息",
        primaryHref: "/contact",
        phoneLabel: "致电",
        phoneNumber: "400-800-1234",
      },
    };
  }

  const heroRaw = asRecord(fallbackRaw.hero);
  const sectionsRaw = Array.isArray(fallbackRaw.sections) ? [...fallbackRaw.sections] : [];

  return {
    title: readLocalized(fallbackRaw.title, slug),
    hero: {
      badge: toStringValue(heroRaw.badge),
      description: toStringValue(heroRaw.description),
      scenarios: toStringValue(heroRaw.scenarios),
      image: toStringValue(heroRaw.image, media.hero),
    },
    breadcrumb:
      Array.isArray(fallbackRaw.breadcrumb) && fallbackRaw.breadcrumb.length
        ? fallbackRaw.breadcrumb.map((item) => readLocalized(item, slug) || slug)
        : ["首页", "产品", readLocalized(fallbackRaw.title, slug) || slug],
    sections:
      sectionsRaw.length
        ? sectionsRaw.map((section, index) => normalizeDetailSection(section, index))
        : buildDefaultSections(seed),
    gallery: media.gallery.map((item) => ({ ...item })),
    cta: {
      title: "需要定制方案？",
      description:
        "留下项目信息，24 小时内由行业顾问回电，为您提供方案设计、预算测算与现场勘查。",
      primaryLabel: "提交项目信息",
      primaryHref: "/contact",
      phoneLabel: "致电",
      phoneNumber: "400-800-1234",
    },
  };
}

function normalizeDetailSection(section: unknown, index: number): DetailSectionConfig {
  if (!isRecord(section)) {
    return {
      heading: `内容模块 ${index + 1}`,
      paragraphs: [],
      lists: [],
      pairs: [],
    };
  }
  const heading = readLocalized(section.heading, `内容模块 ${index + 1}`).trim();
  const paragraphs = asStringArray(section.paragraphs ?? section.description ?? []);
  const lists = asStringMatrix(section.lists ?? []);
  const pairs = asPairMatrix(section.pairs ?? []);
  return {
    heading: heading || `内容模块 ${index + 1}`,
    paragraphs,
    lists,
    pairs,
  };
}

export function normalizeProductDetail(raw: unknown, slug: string, seed?: ProductDetailSeed): ProductDetailConfig {
  const fallback = buildFallbackDetail(slug, seed);
  if (!isRecord(raw)) {
    return cloneDetail(fallback);
  }

  const heroRaw = asRecord(raw.hero);
  const sectionsRaw = Array.isArray(raw.sections) ? [...raw.sections] : fallback.sections;

  const fallbackHeroImage = fallback.hero.image ?? DEFAULT_MEDIA.hero;
  const hero: DetailHeroConfig = {
    badge: readLocalized(heroRaw.badge, fallback.hero.badge ?? ""),
    description: readLocalized(heroRaw.description, fallback.hero.description ?? ""),
    scenarios: readLocalized(heroRaw.scenarios, fallback.hero.scenarios ?? ""),
    image: resolveImageSrc(toStringValue(heroRaw.image), fallbackHeroImage),
  };

  const breadcrumb = Array.isArray(raw.breadcrumb)
    ? raw.breadcrumb.map((item, index) => readLocalized(item, fallback.breadcrumb[index] ?? "")).filter((item) => item.trim())
    : [...fallback.breadcrumb];

  const sections = sectionsRaw.map((section, index) => {
    const fallbackSection = fallback.sections[index];
    if (!fallbackSection) {
      return normalizeDetailSection(section, index);
    }
    const normalized = normalizeDetailSection(section, index);
    return {
      heading: normalized.heading || fallbackSection.heading,
      paragraphs: normalized.paragraphs.length ? normalized.paragraphs : [...fallbackSection.paragraphs],
      lists: normalized.lists.length ? normalized.lists : fallbackSection.lists.map((list) => [...list]),
      pairs: normalized.pairs.length
        ? normalized.pairs
        : fallbackSection.pairs.map((group) => group.map((item) => ({ ...item }))),
    };
  });

  if (!sections.length) {
    sections.push(...fallback.sections.map((section, index) => normalizeDetailSection(section, index)));
  }

  const gallery = Array.isArray(raw.gallery)
    ? (raw.gallery
        .map((item) => {
          if (!isRecord(item)) return null;
          const src = sanitizeImageSrc(toStringValue(item.src));
          const alt = readLocalized(item.alt, fallback.title).trim();
          if (!src) return null;
          return { src, alt: alt || fallback.title };
        })
        .filter(Boolean) as DetailGalleryItem[])
    : fallback.gallery.map((item) => ({ ...item }));

  const ctaRaw = asRecord(raw.cta);
  const fallbackCta = fallback.cta ?? {
    title: "需要定制方案？",
    description:
      "留下项目信息，24 小时内由行业顾问回电，为您提供方案设计、预算测算与现场勘查。",
    primaryLabel: "提交项目信息",
    primaryHref: "/contact",
    phoneLabel: "致电",
    phoneNumber: "400-800-1234",
  };
  const cta: DetailCtaConfig = {
    title: readLocalized(ctaRaw.title, fallbackCta.title),
    description: readLocalized(ctaRaw.description, fallbackCta.description ?? ""),
    primaryLabel: readLocalized(ctaRaw.primaryLabel, fallbackCta.primaryLabel),
    primaryHref: toStringValue(ctaRaw.primaryHref, fallbackCta.primaryHref ?? ""),
    phoneLabel: readLocalized(ctaRaw.phoneLabel, fallbackCta.phoneLabel ?? ""),
    phoneNumber: toStringValue(ctaRaw.phoneNumber, fallbackCta.phoneNumber ?? ""),
  };

  return {
    title: readLocalized(raw.title, fallback.title),
    hero,
    breadcrumb: breadcrumb.length ? breadcrumb : [...fallback.breadcrumb],
    sections,
    gallery: gallery.length ? gallery : fallback.gallery.map((item) => ({ ...item })),
    cta,
  };
}

export function normalizeProductDetailMap(value: unknown, seeds?: Record<string, ProductDetailSeed>): ProductDetailConfigMap {
  const input = isRecord(value) ? value : {};
  const reservedKeys = new Set<string>(["_meta"]);
  const inputSlugs = Object.keys(input).filter((key) => !reservedKeys.has(key));
  const seedSlugs = Object.keys(seeds ?? {});
  const baseSlugs = Object.keys(product_details);
  const slugs = new Set<string>([...seedSlugs, ...inputSlugs, ...baseSlugs]);
  const result: ProductDetailConfigMap = {};
  slugs.forEach((slug) => {
    result[slug] = normalizeProductDetail(input[slug], slug, (seeds ?? {})[slug]);
  });
  return result;
}

function serializeStringArray(values: string[]): string[] {
  return values.map((item) => item.trim()).filter((item) => item);
}

function serializeStringMatrix(values: string[][]): string[][] {
  return values
    .map((group) => serializeStringArray(group))
    .filter((group) => group.length);
}

function serializePairMatrix(values: DetailMetricGroup[]): DetailMetricGroup[] {
  return values
    .map((group) =>
      group
        .map((item) => ({ label: item.label.trim(), value: item.value.trim() }))
        .filter((item) => item.label || item.value),
    )
    .filter((group) => group.length);
}

export function serializeProductDetail(detail: ProductDetailConfig): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (detail.title.trim()) result.title = detail.title.trim();
  const hero: Record<string, string> = {};
  if (detail.hero.badge?.trim()) hero.badge = detail.hero.badge.trim();
  if (detail.hero.description?.trim()) hero.description = detail.hero.description.trim();
  if (detail.hero.scenarios?.trim()) hero.scenarios = detail.hero.scenarios.trim();
  if (detail.hero.image?.trim()) hero.image = detail.hero.image.trim();
  if (Object.keys(hero).length) {
    result.hero = hero;
  }

  const breadcrumb = serializeStringArray(detail.breadcrumb);
  if (breadcrumb.length) {
    result.breadcrumb = breadcrumb;
  }

  const sections = detail.sections
    .map((section) => {
      const heading = section.heading.trim();
      const paragraphs = serializeStringArray(section.paragraphs);
      const lists = serializeStringMatrix(section.lists);
      const pairs = serializePairMatrix(section.pairs);
      const output: Record<string, unknown> = {};
      if (heading) output.heading = heading;
      if (paragraphs.length) output.paragraphs = paragraphs;
      if (lists.length) output.lists = lists;
      if (pairs.length) output.pairs = pairs;
      return Object.keys(output).length ? output : null;
    })
    .filter(Boolean);
  if (sections.length) {
    result.sections = sections;
  }

  const gallery = detail.gallery
    .map((item) => ({ src: item.src.trim(), alt: item.alt.trim() || detail.title.trim() }))
    .filter((item) => item.src);
  if (gallery.length) {
    result.gallery = gallery;
  }

  if (detail.cta) {
    const cta: Record<string, unknown> = {};
    if (detail.cta.title?.trim()) cta.title = detail.cta.title.trim();
    if (detail.cta.description?.trim()) cta.description = detail.cta.description.trim();
    if (detail.cta.primaryLabel?.trim()) cta.primaryLabel = detail.cta.primaryLabel.trim();
    if (detail.cta.primaryHref?.trim()) cta.primaryHref = detail.cta.primaryHref.trim();
    if (detail.cta.phoneLabel?.trim()) cta.phoneLabel = detail.cta.phoneLabel.trim();
    if (detail.cta.phoneNumber?.trim()) cta.phoneNumber = detail.cta.phoneNumber.trim();
    if (Object.keys(cta).length) {
      (result as any).cta = cta;
    }
  }

  return result;
}

export function serializeProductDetailMap(map: ProductDetailConfigMap): Record<string, unknown> {
  const entries = Object.entries(map)
    .map(([slug, detail]) => {
      const serialized = serializeProductDetail(detail);
      if (!Object.keys(serialized).length) return null;
      return [slug, serialized] as const;
    })
    .filter(Boolean) as Array<[string, Record<string, unknown>]>;
  return Object.fromEntries(entries);
}

export function listAvailableProductDetailSlugs(): string[] {
  return Object.keys(product_details);
}

export function createProductDetailFallback(slug: string, seed?: ProductDetailSeed): ProductDetailConfig {
  return cloneDetail(buildFallbackDetail(slug, seed));
}
