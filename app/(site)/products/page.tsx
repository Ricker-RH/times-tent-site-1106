import type { JSX, SVGProps } from "react";
import Image from "next/image";
import Link from "next/link";
import { ensurePageVisible, getHiddenSections } from "@/server/visibility";

import { getProductCenterConfig } from "@/server/pageConfigs";
import { t, setCurrentLocale } from "@/data";
import { normalizeLocalizedField } from "@/i18n/locales";
import { getRequestLocale } from "@/server/locale";

export const metadata = {
  title: "模块化产品矩阵 | 时代篷房",
  description: "了解人字形、弧形、弯柱、锥顶、双层等核心篷房产品，掌握结构亮点与应用场景。",
};

type ProductCenterData = Awaited<ReturnType<typeof getProductCenterConfig>>;

const DEFAULT_PRODUCT_IMAGE = "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&w=1600&q=80";

function resolveText(value: unknown, fallback = ""): string {
  if (!value) return fallback;
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    const result = t(value as Record<string, string | undefined>);
    return result || fallback;
  }
  return fallback;
}

const hasOwn = (target: unknown, key: string): boolean =>
  target !== null && typeof target === "object" && Object.prototype.hasOwnProperty.call(target, key);

const normalizeCtaLabel = (value: string): string => {
  const withoutArrows = value.replace(/→+/g, "").trim();
  return withoutArrows || value.trim();
};

const hasLocalizedContent = (value: unknown): boolean => {
  if (!value) {
    return false;
  }
  if (typeof value === "string") {
    return value.trim().length > 0;
  }
  if (typeof value === "object") {
    const record = normalizeLocalizedField(value);
    return Object.values(record).some((entry) => typeof entry === "string" && entry.trim().length > 0);
  }
  return false;
};

export default async function ProductsPage(): Promise<JSX.Element> {
  const visibility = await ensurePageVisible("productsIndex");
  const hiddenSections = getHiddenSections(visibility, "productsIndex");
  const hideHero = hiddenSections.hero === true;
  const hideSidebar = hiddenSections.sidebar === true;
  const hideProductList = hiddenSections.productList === true;
  // 设置当前请求语言，确保 t() 使用正确的 locale
  const locale = getRequestLocale();
  setCurrentLocale(locale);
  const config = await getProductCenterConfig();
  const cards = config.products.map((product) => {
    const title = resolveText(product.name, product.slug);
    const tagline = resolveText(product.tagline);
    const summaryHasOwn = hasOwn(product, "summary") || hasOwn(product, "summaryEn");
    const summaryHasContent = hasLocalizedContent(product.summary) || hasLocalizedContent(product.summaryEn);
    let description = resolveText(product.summary);
    if (summaryHasOwn && !summaryHasContent) {
      description = "";
    } else if (!description) {
      description = typeof product.summaryEn === "string" ? product.summaryEn : "";
    }
    if (!summaryHasOwn && !description) {
      description = tagline;
    }
    return {
      slug: product.slug,
      title,
      description,
      tagline,
      image: product.image ?? DEFAULT_PRODUCT_IMAGE,
      href: `/products/${product.slug}`,
    };
  });
  const hero = config.hero;
  const sidebarTitle = resolveText(config.sidebarTitle, "产品");
  const rawCardCtaLabel = resolveText(config.productCardCtaLabel, "查看详情");
  const cardCtaLabel = normalizeCtaLabel(rawCardCtaLabel);

  return (
    <main className="flex-1">
      <div className="bg-white pb-16 pt-10">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-8 px-4 sm:px-6 md:flex-row lg:px-8">
          {hideSidebar ? null : (
            <div className="md:w-[260px] md:shrink-0">
              <aside className="rounded-lg border border-[var(--color-border)] bg-white p-4 shadow-sm md:sticky md:top-24">
                <h2 className="px-3 text-sm font-semibold text-[var(--color-brand-secondary)]">{sidebarTitle}</h2>
                <div className="mt-3 space-y-2">
                  {cards.map((product) => (
                    <Link
                      key={product.href}
                      href={product.href}
                      className="block rounded-md bg-[var(--color-surface-muted)] px-4 py-3 text-sm text-[var(--color-brand-secondary)] transition hover:bg-white hover:text-[var(--color-brand-primary)]"
                    >
                      {product.title}
                    </Link>
                  ))}
                </div>
              </aside>
            </div>
          )}

          <div className="flex-1 space-y-8">
            <Breadcrumb />
            {hideHero ? null : <HeroCard hero={hero} />}
            {hideProductList ? null : (
              <div className="grid gap-6 lg:grid-cols-2">
                {cards.map((product) => (
                  <ProductCard key={product.href} product={product} ctaLabel={cardCtaLabel} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function Breadcrumb() {
  return (
    <nav aria-label="面包屑导航">
      <ol className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-secondary)]">
        <li className="flex items-center gap-2">
          <Link href="/" className="transition hover:text-[var(--color-brand-primary)]">
            首页
          </Link>
          <ChevronIcon className="h-3.5 w-3.5" />
        </li>
        <li className="text-[var(--color-brand-secondary)]">产品</li>
      </ol>
    </nav>
  );
}

function HeroCard({ hero }: { hero: ProductCenterData["hero"] }) {
  if (!hero) {
    return null;
  }
  const eyebrow = resolveText(hero.eyebrow);
  const title = resolveText(hero.title, "模块化产品矩阵");
  const description = resolveText(hero.description);
  const overlayEnabled = hero.overlayEnabled !== false;
  return (
    <section className="relative mt-1 overflow-hidden rounded-lg border border-[var(--color-border)] bg-black text-white md:mt-0">
      <Image src={hero.image ?? DEFAULT_PRODUCT_IMAGE} alt={title || "产品中心"} fill className="object-cover" priority sizes="100vw" />
      {overlayEnabled ? <div className="absolute inset-0 bg-gradient-to-br from-black/85 via-black/60 to-black/35" /> : null}
      <div className="relative space-y-5 p-8 md:p-12 lg:max-w-2xl">
        {eyebrow ? (
          <span
            className={`inline-flex w-fit items-center rounded-full px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] ${
              overlayEnabled ? "bg-white/20" : "bg-black/40 backdrop-blur"
            }`}
          >
            {eyebrow}
          </span>
        ) : null}
        <h1
          className={`text-3xl font-semibold md:text-4xl ${
            overlayEnabled ? "" : "drop-shadow-[0_6px_25px_rgba(0,0,0,0.55)]"
          }`}
        >
          {title}
        </h1>
        <p
          className={`max-w-2xl text-sm md:text-base ${
            overlayEnabled ? "text-white/80" : "text-white drop-shadow-[0_4px_18px_rgba(0,0,0,0.65)]"
          }`}
        >
          {description}
        </p>
      </div>
    </section>
  );
}

function ProductCard({ product, ctaLabel }: { product: { slug: string; title: string; description: string; href: string; image: string; tagline?: string }; ctaLabel: string }) {
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] transition hover:-translate-y-1 hover:shadow-xl">
      <div className="relative h-72 w-full">
        <Image src={product.image} alt={product.title} fill className="object-cover" sizes="100vw" />
      </div>
      <div className="flex flex-1 flex-col space-y-4 p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-semibold text-[var(--color-brand-secondary)]">{product.title}</h2>
          {product.tagline ? (
            <span className="rounded-full bg-white px-4 py-1 text-xs font-semibold text-[var(--color-brand-primary)]">
              {product.tagline}
            </span>
          ) : null}
        </div>
        <p className="text-sm text-[var(--color-text-secondary)]">{product.description}</p>
        <div className="mt-auto flex justify-start pt-2">
          <Link
            href={product.href}
            className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-brand-primary)]"
          >
            {normalizeCtaLabel(ctaLabel)}
            <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </article>
  );
}

function ChevronIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
