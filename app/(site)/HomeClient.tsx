"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import type {
  HomeCompanyOverview,
  HomeContactCta,
  HomeInventoryHighlight,
  ProductMatrixSectionProps,
} from "@/components/home/ProductMatrixSection";
import { ProductMatrixSection } from "@/components/home/ProductMatrixSection";
import { t } from "@/data";
import type { LocalizedField } from "@/i18n/locales";

type LocalizedOrString = string | LocalizedField | Record<string, string | undefined> | null;

function resolveText(value: LocalizedOrString | undefined, fallback = ""): string {
  if (value === null) return "";
  if (typeof value === "string") return value; // treat empty string as intentional
  if (value === undefined) return fallback;
  const text = t(value);
  return text !== undefined && text !== null ? text : fallback;
}

export interface HomeHeroSlide {
  slug: string;
  href: string;
  title: string;
  summary?: string;
  highlights: string[];
  image: string;
  category?: string;
  eyebrow?: string;
}

export interface HomeApplicationTab {
  slug: string;
  name: LocalizedOrString;
  description?: LocalizedOrString;
  highlight?: LocalizedOrString;
  image: string;
  href: string;
}

export interface HomeApplicationSection {
  heading?: LocalizedOrString;
  description?: LocalizedOrString;
  actionLabel?: LocalizedOrString;
}

export interface HomeHeroData {
  badge?: LocalizedOrString;
  title?: LocalizedOrString;
  description?: LocalizedOrString;
  highlights?: string[];
  slides: HomeHeroSlide[];
  primaryCta?: { label?: LocalizedOrString; href: string };
  secondaryCta?: { label?: LocalizedOrString; href: string };
}

const CTA_BUTTON_BASE =
  "inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold transform transition duration-200 ease-out hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-primary)]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-white";
const CTA_BUTTON_PRIMARY = `${CTA_BUTTON_BASE} bg-[var(--color-brand-primary)] text-white hover:bg-[#d82234]`;
const CTA_BUTTON_SECONDARY = CTA_BUTTON_PRIMARY;

export interface HomeClientProps {
  hero: HomeHeroData;
  applicationTabs: HomeApplicationTab[];
  applicationSection?: HomeApplicationSection;
  productShowcase: ProductMatrixSectionProps["productShowcase"];
  companyOverview: HomeCompanyOverview | undefined;
  inventoryHighlight: HomeInventoryHighlight | undefined;
  contactCta: HomeContactCta | undefined;
  hiddenSections?: Partial<Record<"hero" | "applications" | "product" | "company" | "inventory" | "contactCta", boolean>>;
}

export default function HomeClient({
  hero,
  applicationTabs,
  applicationSection,
  productShowcase,
  companyOverview,
  inventoryHighlight,
  contactCta,
  hiddenSections,
}: HomeClientProps): JSX.Element {
  const hideHero = hiddenSections?.hero === true;
  const hideApplications = hiddenSections?.applications === true;
  const hideProduct = hiddenSections?.product === true;
  const hideCompany = hiddenSections?.company === true;
  const hideInventory = hiddenSections?.inventory === true;
  const hideContactCta = hiddenSections?.contactCta === true;
  const slides = useMemo<HomeHeroSlide[]>(() => {
    if (hero.slides.length) {
      return hero.slides;
    }
    const fallbackImage = hero.slides[0]?.image ?? "https://images.unsplash.com/photo-1542626991-cbc4e32524cc?auto=format&w=2000&q=80";
    return [
      {
        slug: "placeholder",
        href: "#",
        title: resolveText(hero.title, "时代篷房"),
        summary: resolveText(hero.description),
        highlights: [],
        image: fallbackImage,
        category: "",
        eyebrow: resolveText(hero.badge) || undefined,
      },
    ];
  }, [hero.badge, hero.description, hero.slides, hero.title]);

  const slidesCount = slides.length;
  const [heroIndex, setHeroIndex] = useState(() => (slidesCount > 1 ? 1 : 0));
  const [isTransitionEnabled, setIsTransitionEnabled] = useState(true);
  const [tabIndex, setTabIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(true);

  const carouselSlides = useMemo(() => {
    if (slidesCount <= 1) {
      return slides;
    }
    const first = slides[0];
    const last = slides[slidesCount - 1];
    return [last, ...slides, first];
  }, [slides, slidesCount]);

  useEffect(() => {
    setHeroIndex(slidesCount > 1 ? 1 : 0);
  }, [slidesCount]);

  useEffect(() => {
    if (slidesCount <= 1 || isPaused) return;

    const timer = window.setInterval(() => {
      setHeroIndex((prev) => prev + 1);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [slidesCount, isPaused]);

  useEffect(() => {
    if (!isTransitionEnabled) {
      const id = window.requestAnimationFrame(() => setIsTransitionEnabled(true));
      return () => window.cancelAnimationFrame(id);
    }
    return undefined;
  }, [isTransitionEnabled]);

  const handleHeroPrev = () => {
    if (slidesCount <= 1) return;
    setIsTransitionEnabled(true);
    setHeroIndex((prev) => prev - 1);
  };

  const handleHeroNext = () => {
    if (slidesCount <= 1) return;
    setIsTransitionEnabled(true);
    setHeroIndex((prev) => prev + 1);
  };

  const handleHeroTransitionEnd = () => {
    if (slidesCount <= 1) return;
    if (heroIndex === carouselSlides.length - 1) {
      setIsTransitionEnabled(false);
      setHeroIndex(1);
    } else if (heroIndex === 0) {
      setIsTransitionEnabled(false);
      setHeroIndex(carouselSlides.length - 2);
    }
  };

  const normalizedHeroIndex = slidesCount > 1 ? (heroIndex - 1 + slidesCount) % slidesCount : heroIndex;
  const activeHero = slides[normalizedHeroIndex] ?? slides[0];

  const isPrimarySlide = normalizedHeroIndex === 0;

  const applicationTab = applicationTabs[tabIndex] ?? applicationTabs[0] ?? null;
  const applicationHeading = resolveText(applicationSection?.heading, "五大核心应用场景");
  const applicationDescription = resolveText(applicationSection?.description);
  const applicationActionLabel = resolveText(applicationSection?.actionLabel, "查看详情");

  const primaryCta = hero.primaryCta
    ? {
        href: hero.primaryCta.href || activeHero?.href || "/cases",
        label: resolveText(hero.primaryCta.label, activeHero?.title ?? "查看详情"),
      }
    : activeHero
      ? { label: activeHero.title ?? "查看详情", href: activeHero.href }
      : undefined;
  const secondaryCta = hero.secondaryCta
    ? {
        href: hero.secondaryCta.href || "/cases",
        label: resolveText(hero.secondaryCta.label, "更多案例"),
      }
    : { label: "更多案例", href: "/cases" };

  const sanitizedHighlights = isPrimarySlide
    ? (Array.isArray(hero.highlights) && hero.highlights.length ? hero.highlights : activeHero?.highlights ?? [])
    : [];

  return (
    <main className="flex-1">
      {!hideHero ? (
      <section
        className="relative"
        data-preview-anchor="hero"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <div className="relative h-full overflow-hidden">
          <div
            className={`flex h-full ${isTransitionEnabled ? "transition-transform duration-700" : ""}`}
            style={{ transform: `translateX(-${heroIndex * 100}%)` }}
            onTransitionEnd={handleHeroTransitionEnd}
          >
            {carouselSlides.map((slide, idx) => {
              const isPrimaryImage = slides[0]?.slug === slide.slug;
              return (
                <Link
                  key={`${slide.slug}-${idx}`}
                  href={slide.href}
                  aria-label={slide.title}
                  className="relative block h-[520px] w-full flex-shrink-0 overflow-hidden sm:h-[600px] xl:h-[680px]"
                >
                  <Image
                    src={slide.image}
                    alt={slide.title}
                    fill
                    className="object-cover"
                    priority={slidesCount > 1 ? idx === 1 : idx === 0}
                  />
                  {isPrimaryImage ? (
                    <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/15 to-black/5" />
                  ) : null}
                </Link>
              );
            })}
          </div>
          {slidesCount > 1 ? (
            <>
              <button
                type="button"
                aria-label="上一张"
                onClick={handleHeroPrev}
                className="absolute left-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-[var(--color-brand-secondary)] shadow-lg transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-primary)]/25 focus-visible:ring-offset-2 focus-visible:ring-offset-white sm:left-6"
              >
                ‹
              </button>
              <button
                type="button"
                aria-label="下一张"
                onClick={handleHeroNext}
                className="absolute right-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-[var(--color-brand-secondary)] shadow-lg transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-primary)]/25 focus-visible:ring-offset-2 focus-visible:ring-offset-white sm:right-6"
              >
                ›
              </button>
            </>
          ) : null}
          <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-3">
            {slides.map((slide, idx) => (
              <button
                key={slide.slug}
                type="button"
                aria-label={`跳转到第 ${idx + 1}`}
                onClick={() => {
                  if (slidesCount <= 1) {
                    setHeroIndex(0);
                  } else {
                    setIsTransitionEnabled(true);
                    setHeroIndex(idx + 1);
                  }
                }}
                className={`h-2.5 w-2.5 rounded-full transition ${
                  idx === normalizedHeroIndex ? "bg-[var(--color-brand-primary)]" : "bg-white/35 hover:bg-white/60"
                }`}
              />
            ))}
          </div>
        </div>

        {isPrimarySlide ? (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-5 px-4 text-center text-white md:px-0">
            {activeHero?.eyebrow ? (
              <p className="text-xs uppercase tracking-[0.35em] text-white/70">{activeHero.eyebrow}</p>
            ) : resolveText(hero.badge) ? (
              <p className="text-xs uppercase tracking-[0.35em] text-white/70">{resolveText(hero.badge)}</p>
            ) : null}
            <h1 className="text-4xl font-bold leading-tight md:text-5xl">
              {resolveText(hero.title, activeHero?.title ?? "时代篷房")}
            </h1>
            <p className="max-w-2xl text-base text-white/80 md:text-lg">
              {resolveText(
                hero.description,
                activeHero?.summary ?? "撑起每个重要时刻 — 专业铝合金篷房设计 · 制造 · 方案交付。",
              )}
            </p>
            {sanitizedHighlights.length ? (
              <ul className="flex flex-wrap justify-center gap-3 text-xs text-white/85">
                {sanitizedHighlights.slice(0, 3).map((item) => (
                  <li key={`${activeHero.slug}-${item}`} className="rounded-full bg-white/15 px-3 py-1">
                    {item}
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="pointer-events-auto flex flex-wrap justify-center gap-4">
              {primaryCta ? (
                <Link
                  href={primaryCta.href}
                  aria-label={`查看详情: ${activeHero?.title ?? "案例"}`}
                  className={CTA_BUTTON_PRIMARY}
                >
                  {primaryCta.label}
                </Link>
              ) : null}
              {secondaryCta ? (
                <Link
                  href={secondaryCta.href}
                  className={CTA_BUTTON_SECONDARY}
                >
                  {secondaryCta.label}
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}
      </section>
      ) : null}

      {!hideApplications && applicationTab ? (
        <section className="relative bg-white py-20" data-preview-anchor="applications">
          <div className="mx-auto w-full max-w-[1200px] space-y-6 px-4 sm:px-6 lg:px-8">
            <div className="space-y-3 text-center md:text-left">
              <h2 className="text-2xl font-bold text-[var(--color-brand-secondary)] md:text-3xl">
                {applicationHeading}
              </h2>
              {applicationDescription ? (
                <p className="max-w-3xl text-sm text-[var(--color-text-secondary)] md:text-base">
                  {applicationDescription}
                </p>
              ) : null}
            </div>
            <div className="flex flex-col gap-0">
              <div
                role="tablist"
                className="flex w-full overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)]"
              >
                {applicationTabs.map((tab, idx) => (
                  <button
                    key={tab.slug}
                    role="tab"
                    type="button"
                    aria-selected={idx === tabIndex}
                    onClick={() => setTabIndex(idx)}
                    className={`flex-1 min-w-0 px-4 py-3 text-center text-sm font-semibold transform transition duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-primary)]/25 focus-visible:ring-offset-2 focus-visible:ring-offset-white ${
                      idx === tabIndex
                        ? "bg-white text-[var(--color-brand-primary)] shadow-[0_6px_18px_rgba(225,38,55,0.22)]"
                        : "text-[var(--color-brand-secondary)] hover:-translate-y-0.5 hover:bg-[var(--color-brand-primary)]/10"
                    } ${idx !== 0 ? "border-l border-[var(--color-border)]" : ""} ${idx === 0 ? "rounded-l-lg" : idx === applicationTabs.length - 1 ? "rounded-r-lg" : ""}`}
                  >
                    {resolveText(tab.name, tab.slug)}
                  </button>
                ))}
              </div>
              <article className="overflow-hidden rounded-lg border border-[var(--color-border)] shadow-[0_24px_60px_rgba(15,23,42,0.12)]">
                <div className="relative h-[420px] w-full md:h-[520px]">
                  <Image
                    src={applicationTab.image}
                    alt={resolveText(applicationTab.name, applicationTab.slug)}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center text-white md:px-12">
                    {resolveText(applicationTab.highlight) ? (
                      <span className="text-xs font-semibold uppercase tracking-[0.3em] text-white/80">{resolveText(applicationTab.highlight)}</span>
                    ) : null}
                    <h3 className="text-2xl font-semibold md:text-3xl">{resolveText(applicationTab.name, applicationTab.slug)}</h3>
                    {resolveText(applicationTab.description) ? (
                      <p className="max-w-2xl text-sm text-white/85 md:text-base">{resolveText(applicationTab.description)}</p>
                    ) : null}
                    {applicationActionLabel ? (
                      <Link
                        href={applicationTab.href}
                        className={`${CTA_BUTTON_SECONDARY} gap-2`}
                      >
                        {applicationActionLabel}
                        <span aria-hidden> →</span>
                      </Link>
                    ) : null}
                  </div>
                </div>
              </article>
            </div>
          </div>
        </section>
      ) : null}

      <ProductMatrixSection
        productShowcase={productShowcase}
        companyOverview={companyOverview}
        inventoryHighlight={inventoryHighlight}
        contactCta={contactCta}
        hiddenSections={{
          product: hideProduct,
          company: hideCompany,
          inventory: hideInventory,
          contactCta: hideContactCta,
        }}
      />
    </main>
  );
}
