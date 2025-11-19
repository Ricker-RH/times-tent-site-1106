import type { SVGProps } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ensurePageVisible, getHiddenSections } from "@/server/visibility";
import { t, setCurrentLocale } from "@/data";
import { getRequestLocale } from "@/server/locale";
import { normalizeLocalizedField } from "@/i18n/locales";
import { translateUi } from "@/i18n/dictionary";
import { ProductHeroCarousel } from "@/components/products/ProductHeroCarousel";
import { ProductTabsSection } from "@/components/products/ProductTabsSection";
import type { ProductDetailTabTarget } from "@/types/productDetails";

export const dynamic = "force-dynamic";

import {
  getProductCenterConfig,
  getProductDetails,
} from "@/server/pageConfigs";
import { PRODUCT_MEDIA, DEFAULT_MEDIA } from "@/data/productMedia";

const normalizeHeading = (s: string) => {
  const base = (s || "").trim().toLowerCase();
  const stripped = base.replace(/[，,。.\-–—_:：;；/／~（）()《》【】\[\]「」『』·]/g, "");
  return stripped;
};
const OVERVIEW_KEYS = [
  "产品概览", "產品概覽", "产品概述", "產品概述", "产品介绍", "產品介紹",
  "概览", "總覽", "概述", "介绍", "overview", "product overview",
];
const HIGHLIGHTS_KEYS = [
  "典型场景与亮点", "典型場景與亮點", "典型场景", "典型場景", "场景与亮点", "場景與亮點",
  "亮点与场景", "亮點與場景", "应用场景", "應用場景", "产品亮点", "產品亮點",
  "亮点", "亮點", "highlights", "typical scenarios", "highlights & scenarios", "scenarios",
];
const GALLERY_KEYS = [
  "项目实景图库", "项目实景图集", "项目图库", "项目图集", "项目实景", "项目实拍",
  "项目图", "项目图片", "实景图库", "实景图集", "图库", "图集", "图片集",
  "gallery", "project gallery", "image gallery",
];

interface ProductPageProps {
  params: { slug: string };
}

const cx = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(" ");
const CTA_BUTTON_BASE = "inline-flex items-center justify-center rounded-[6px] px-6 py-3 text-sm font-semibold transition";
const CTA_BUTTON_PRIMARY = `${CTA_BUTTON_BASE} bg-[var(--color-brand-primary)] text-white shadow-lg shadow-red-200/25 hover:bg-[#d82234]`;
const CTA_BUTTON_SECONDARY = CTA_BUTTON_PRIMARY;

const hasOwn = (target: unknown, key: string): boolean =>
  target !== null && typeof target === "object" && Object.prototype.hasOwnProperty.call(target, key);

const resolveLocalizedText = (value: unknown): string => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    return t(normalizeLocalizedField(value));
  }
  return "";
};

const hasLocalizedContent = (value: unknown): boolean => {
  if (!value) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "object") {
    const record = normalizeLocalizedField(value);
    return Object.values(record).some((entry) => typeof entry === "string" && entry.trim().length > 0);
  }
  return false;
};

const getLegacyField = (
  product: Awaited<ReturnType<typeof getProductCenterConfig>>["products"][number],
  key: "summaryEn" | "taglineEn",
): string | undefined => {
  const value = product?.[key];
  return typeof value === "string" ? value : undefined;
};

export async function generateStaticParams() {
  const config = await getProductCenterConfig();
  return config.products.map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({ params }: ProductPageProps) {
  // 确保 t() 使用当前请求语言
  const locale = getRequestLocale();
  setCurrentLocale(locale);

  const productDetails = await getProductDetails();
  const detail = productDetails[params.slug];
  if (detail) {
    const title = detail.title;
    const description = detail.hero.description ?? detail.sections[0]?.paragraphs?.[0] ?? "";
    return {
      title: `${title} | 产品中心`,
      description,
    };
  }
  const config = await getProductCenterConfig();
  const product = config.products.find((item) => item.slug === params.slug);
  if (!product) {
    return { title: "产品详情" };
  }
  const productTitle = typeof product.name === "string" ? product.name : t(product.name) || params.slug;
  const summarySource: unknown = product.summary;
  const summaryLegacy = getLegacyField(product, "summaryEn");
  const summaryHasOwn = typeof summarySource !== "undefined" || typeof summaryLegacy !== "undefined";
  const summaryHasContent = hasLocalizedContent(summarySource) || hasLocalizedContent(summaryLegacy);
  let description = resolveLocalizedText(summarySource);
  if (summaryHasOwn && !summaryHasContent) {
    description = "";
  } else if (!summaryHasOwn && !description) {
    description = resolveLocalizedText(summaryLegacy);
  }
  if (!summaryHasOwn && !description) {
    const taglineLegacy = getLegacyField(product, "taglineEn");
    description = resolveLocalizedText(product.tagline);
    if (!description) {
      description = resolveLocalizedText(taglineLegacy);
    }
  }
  return {
    title: `${productTitle} | 产品中心`,
    description,
  };
}

export default async function ProductDetailPage({ params }: ProductPageProps) {
  const locale = getRequestLocale();
  setCurrentLocale(locale);
  const visibility = await ensurePageVisible("productDetail");
  const hiddenSections = getHiddenSections(visibility, "productDetail");
  const hideHero = hiddenSections.hero === true;
  const hideOverview = hiddenSections.overview === true;
  const hideHighlights = hiddenSections.highlights === true;
  const hideGallery = hiddenSections.gallery === true;
  const hideExtraSections = hiddenSections.extraSections === true;
  const hideAdvisor = hiddenSections.advisor === true;
  const productDetails = await getProductDetails();
  const detail = productDetails[params.slug];
  const productsConfig = await getProductCenterConfig();
  const listMeta = productsConfig.products.find((item) => item.slug === params.slug) ?? null;
  const listMetaTagline = listMeta?.tagline
    ? typeof listMeta.tagline === "string"
      ? listMeta.tagline
      : t(listMeta.tagline) || null
    : null;
  const products = productsConfig.products.map((item) => ({
    title: typeof item.name === "string" ? item.name : t(item.name) || item.slug,
    href: `/products/${item.slug}`,
    slug: item.slug,
  }));

  if (!detail) {
    notFound();
  }

  const media = PRODUCT_MEDIA[params.slug] ?? DEFAULT_MEDIA;
  const heroImage = detail.hero.image || media.hero;
  const heroSlidesSources = [
    ...(heroImage ? [{ src: heroImage, alt: detail.title }] : []),
    ...(detail.gallery?.length ? detail.gallery : media.gallery).map((item) => ({ src: item.src, alt: item.alt || detail.title })),
  ];
  const carouselSlides = heroSlidesSources.reduce<Array<{ src: string; alt: string }>>((acc, slide) => {
    if (!slide.src) return acc;
    if (acc.some((existing) => existing.src === slide.src)) {
      return acc;
    }
    acc.push(slide);
    return acc;
  }, []);

  const breadcrumbItems = detail.breadcrumb ?? [];
  const findIndexByKeys = (keys: string[]) =>
    detail.sections.findIndex((section) => {
      const heading = normalizeHeading(section.heading || "");
      return keys.some((key) => {
        const k = normalizeHeading(key);
        return heading.includes(k) || k.includes(heading);
      });
    });
  const overviewIndex = findIndexByKeys(OVERVIEW_KEYS);
  const highlightsIndex = findIndexByKeys(HIGHLIGHTS_KEYS);
  const galleryIndex = findIndexByKeys(GALLERY_KEYS);
  const otherSections = detail.sections.filter((_, index) => ![overviewIndex, highlightsIndex, galleryIndex].includes(index));
  const heroHeading = (detail.hero.heading ?? detail.title)?.trim() || detail.title;
  const heroBadge = (detail.hero.badge && detail.hero.badge.trim()) ? detail.hero.badge : null;
  const heroEyebrow = detail.hero.scenarios || null;
  const hiddenTabTargets: Partial<Record<ProductDetailTabTarget, boolean>> = {
    intro: hideOverview,
    specs: hideHighlights,
    accessories: hideGallery,
  };
  const hasVisibleTabs = detail.tabs.some((tab) => tab.visible !== false && !hiddenTabTargets[tab.target]);

  return (
    <div className="bg-white pb-20 pt-10">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-8 px-4 sm:px-6 lg:px-8 md:flex-row">
        <div className="md:w-[260px] md:shrink-0">
          <aside className="rounded-lg border border-[var(--color-border)] bg-white p-4 shadow-sm md:sticky md:top-24">
            <h2 className="px-3 text-sm font-semibold text-[var(--color-brand-secondary)]">产品</h2>
            <div className="mt-3 space-y-2">
              {products.map((product) => {
                const isActive = product.slug === params.slug;
                return (
                  <Link
                    key={product.href}
                    href={product.href}
                    className={cx(
                      "block rounded-md px-4 py-3 text-sm transition",
                      isActive
                        ? "bg-[var(--color-brand-primary)] font-semibold text-white shadow"
                        : "bg-[var(--color-surface-muted)] text-[var(--color-brand-secondary)] hover:bg-white hover:text-[var(--color-brand-primary)]",
                    )}
                  >
                    {product.title}
                  </Link>
                );
              })}
            </div>
          </aside>
        </div>

        <div className="flex-1 space-y-8">
          <nav aria-label="面包屑导航">
            <ol className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-secondary)]">
              {breadcrumbItems.map((item, index) => {
                const isLast = index === breadcrumbItems.length - 1;
                const href = index === 0 ? "/" : index === 1 ? "/products" : undefined;
                return (
                  <li key={`${item}-${index}`} className="flex items-center gap-2">
                    {isLast || !href ? (
                      <span className="text-[var(--color-brand-secondary)]">{item}</span>
                    ) : (
                      <Link href={href} className="transition hover:text-[var(--color-brand-primary)]">
                        {item}
                      </Link>
                    )}
                    {!isLast ? <IconChevronRight className="h-3.5 w-3.5" /> : null}
                  </li>
                );
              })}
            </ol>
          </nav>

          {hideHero ? null : (
            <ProductHeroCarousel
              slides={carouselSlides}
              title={heroHeading}
              description={detail.hero.description}
              badge={heroBadge}
              eyebrow={heroEyebrow}
              overlayEnabled={detail.hero.overlayEnabled !== false}
            />
          )}

          {hasVisibleTabs ? (
            <ProductTabsSection
              tabs={detail.tabs}
              intro={detail.intro}
              specs={detail.specs}
              accessories={detail.accessories}
              hiddenTargets={hiddenTabTargets}
            />
          ) : null}

          {hideExtraSections
            ? null
            : otherSections.map((section) => (
              <section key={section.heading} className="rounded-lg border border-[var(--color-border)] bg-white p-8">
                <h2 className="text-xl font-semibold text-[var(--color-brand-secondary)]">{section.heading}</h2>
                <div className="mt-4 space-y-4 text-sm leading-7 text-[var(--color-text-secondary)]">
                  {section.paragraphs?.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </section>
            ))}

          {hideAdvisor ? null : <ProductAdvisorCTA cta={detail.cta} />}
        </div>
      </div>
    </div>
  );
}

function IconChevronRight(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function ProductAdvisorCTA({ cta }: { cta?: { title?: string; description?: string; primaryLabel?: string; primaryHref?: string; phoneLabel?: string; phoneNumber?: string } }) {
  const locale = getRequestLocale();
  const title = (cta?.title && cta.title.trim()) ? cta.title : translateUi(locale, "cases.cta.custom.heading");
  const description = (cta?.description && cta.description.trim()) ? cta.description : translateUi(locale, "cases.cta.custom.description");
  const primaryLabel = (cta?.primaryLabel && cta.primaryLabel.trim()) ? cta.primaryLabel : translateUi(locale, "cases.cta.custom.submit");
  const primaryHref = (cta?.primaryHref && cta.primaryHref.trim()) ? cta.primaryHref : "/contact";
  const phoneNumber = (cta?.phoneNumber && cta.phoneNumber.trim()) ? cta.phoneNumber : "400-800-1234";
  const phoneLabel = (cta?.phoneLabel && cta.phoneLabel.trim()) ? cta.phoneLabel : (locale === "en" ? "Call" : locale === "zh-TW" ? "致電" : "致电");

  return (
    <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-6 md:p-8">
      <div className="space-y-4 text-left">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-[var(--color-brand-secondary)]">{title}</p>
          <p className="text-sm text-[var(--color-text-secondary)] md:text-base">
            {description}
          </p>
        </div>
        <div className="flex flex-col gap-3 text-sm sm:flex-row">
          <Link href={primaryHref} className={`${CTA_BUTTON_PRIMARY} w-full sm:flex-1`}>
            {primaryLabel}
          </Link>
          <Link href={`tel:${phoneNumber}`} className={`${CTA_BUTTON_PRIMARY} w-full sm:flex-1`}>
            {`${phoneLabel} ${phoneNumber}`}
          </Link>
        </div>
      </div>
    </section>
  );
}
