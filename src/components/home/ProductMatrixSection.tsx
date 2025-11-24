import Image from "next/image";
import Link from "next/link";

import { getCurrentLocale, t } from "@/data";
import type { LocalizedField } from "@/i18n/locales";

const FALLBACK_PRODUCT_IMAGE = "https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&w=1600&q=80";
const FALLBACK_OVERVIEW_IMAGE = "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&w=1600&q=80";
const FALLBACK_INVENTORY_IMAGE = "https://images.unsplash.com/photo-1542626991-cbc4e32524cc?auto=format&w=2000&q=80";
const FALLBACK_CAPABILITY_IMAGE = "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&w=1600&q=80";

const CTA_BUTTON_BASE =
  "inline-flex items-center justify-center rounded-[6px] px-6 py-3 text-sm font-semibold transform transition duration-200 ease-out hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-primary)]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-white";
const CTA_BUTTON_PRIMARY = `${CTA_BUTTON_BASE} bg-[var(--color-brand-primary)] text-white hover:bg-[#d82234]`;
const CTA_BUTTON_SECONDARY = CTA_BUTTON_PRIMARY;

type LocalizedOrString = string | LocalizedField | Record<string, string | undefined>;

type ResolveTextOptions = {
  localizedOnly?: boolean;
};

function resolveText(value: LocalizedOrString | undefined, fallback = "", options?: ResolveTextOptions): string {
  if (value === null || typeof value === "undefined") {
    return fallback;
  }
  if (typeof value === "string") {
    return value;
  }
  if (options?.localizedOnly) {
    const locale = getCurrentLocale();
    if (!locale) {
      return fallback;
    }
    const localizedValue = value[locale];
    if (typeof localizedValue === "string") {
      return localizedValue;
    }
    return fallback;
  }
  return t(value) || fallback;
}

const normalizeCtaLabel = (value: string): string => {
  const withoutArrows = value.replace(/→+/g, "").trim();
  return withoutArrows || value.trim();
};

export interface HomeProductCard {
  slug: string;
  title: LocalizedOrString;
  description?: LocalizedOrString;
  href: string;
  image?: string;
  badge?: LocalizedOrString;
  tagline?: LocalizedOrString;
  ctaLabel?: LocalizedOrString;
}

export interface HomeCompanyOverview {
  title?: LocalizedOrString;
  hero?: {
    title?: LocalizedOrString;
    secondary?: LocalizedOrString;
    description?: LocalizedOrString;
    image?: string;
  };
  stats?: Array<{ label?: LocalizedOrString; value?: string }>;
  serviceHighlights?: Array<{ title?: LocalizedOrString; description?: LocalizedOrString }>;
  capabilities?: Array<{ title?: LocalizedOrString; subtitle?: LocalizedOrString; description?: LocalizedOrString; image?: string }>;
  gallery?: {
    hero?: Array<{ title?: LocalizedOrString; image?: string }>;
    support?: Array<{ title?: LocalizedOrString; image?: string }>;
  };
  capabilityHeading?: LocalizedOrString;
}

export interface HomeInventoryHighlight {
  heading?: LocalizedOrString;
  description?: LocalizedOrString;
  heroImage?: string;
  ctas?: Array<{ href: string; label: LocalizedOrString }>;
}

export interface HomeContactCta {
  eyebrow?: LocalizedOrString;
  title?: LocalizedOrString;
  description?: LocalizedOrString;
  primary?: { href?: string; label?: LocalizedOrString };
  secondary?: { href?: string; label?: LocalizedOrString };
}

export interface ProductMatrixSectionProps {
  productShowcase: {
    heading?: LocalizedOrString;
    description?: LocalizedOrString;
    cardCtaLabel?: LocalizedOrString;
    cards: HomeProductCard[];
  };
  companyOverview?: HomeCompanyOverview;
  inventoryHighlight?: HomeInventoryHighlight;
  contactCta?: HomeContactCta;
  hiddenSections?: {
    product?: boolean;
    company?: boolean;
    inventory?: boolean;
    contactCta?: boolean;
  };
}

export function ProductMatrixSection({
  productShowcase,
  companyOverview,
  inventoryHighlight,
  contactCta,
  hiddenSections,
}: ProductMatrixSectionProps): JSX.Element {
  const hideProduct = hiddenSections?.product === true;
  const hideCompany = hiddenSections?.company === true;
  const hideInventory = hiddenSections?.inventory === true;
  const hideContactCta = hiddenSections?.contactCta === true;
  const cards = productShowcase.cards ?? [];
  const rawCardCtaLabel = resolveText(productShowcase.cardCtaLabel, "查看详情");
  const cardCtaLabel = normalizeCtaLabel(rawCardCtaLabel);

  const overview = companyOverview ?? {};
  const overviewHero = overview.hero;
  const overviewStats = overview.stats ?? [];
  const overviewServiceHighlights = overview.serviceHighlights ?? [];
  const overviewCapabilities = overview.capabilities ?? [];
  const overviewGalleryHero = overview.gallery?.hero ?? [];
  const overviewGallerySupport = overview.gallery?.support ?? [];
  const overviewTitle = resolveText(overview.title, "广州时代篷房有限公司");

  const inventory = inventoryHighlight ?? {};
  const contact = contactCta ?? {};
  const showContactCta =
    !hideContactCta &&
    (resolveText(contact.title).trim().length > 0 || resolveText(contact.description).trim().length > 0 || contact.primary || contact.secondary);

  return (
    <>
      {cards.length && !hideProduct ? (
        <section className="relative bg-[var(--color-surface-muted)] py-16" data-preview-anchor="product">
          <div className="mx-auto w-full max-w-[1200px] space-y-6 px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="max-w-3xl space-y-2">
                <h2 className="text-2xl font-bold text-[var(--color-brand-secondary)] md:text-3xl">
                  {resolveText(productShowcase.heading, "核心篷房产品矩阵")}
                </h2>
                {resolveText(productShowcase.description) ? (
                  <p className="text-sm text-[var(--color-text-secondary)]">{resolveText(productShowcase.description)}</p>
                ) : null}
              </div>
              <Link
                href="/products"
                className={`${CTA_BUTTON_SECONDARY} self-start md:self-auto`}
              >
                查看所有产品
              </Link>
            </div>

            <div className="grid auto-rows-fr gap-6 md:grid-cols-2 xl:grid-cols-3">
              {cards.map((product) => (
                <article
                  key={product.slug}
                  className="group relative flex h-full flex-col overflow-hidden rounded-lg border border-[var(--color-border)] bg-white transition hover:-translate-y-1 hover:shadow-xl cursor-pointer"
                >
                  <Link href={product.href} className="absolute inset-0 z-10" aria-label={resolveText(product.title)}>
                    <span className="sr-only">{resolveText(product.title)}</span>
                  </Link>
                  <div className="relative flex-none overflow-hidden">
                    <div className="relative h-[220px] w-full overflow-hidden sm:h-[240px]">
                      <Image
                        src={resolveImage(product.image, FALLBACK_PRODUCT_IMAGE)}
                        alt={resolveText(product.title)}
                        fill
                        sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
                        className="object-cover transition duration-500 group-hover:scale-105"
                      />
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col gap-3 p-6">
                    <div className="space-y-3 overflow-hidden">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-xl font-semibold text-[var(--color-brand-secondary)]">{resolveText(product.title)}</h3>
                        {(() => {
                          const text = resolveText(product.tagline).trim();
                          if (!text) {
                            return null;
                          }
                          return (
                            <span className="rounded-full bg-[var(--color-surface-muted)] px-3 py-1 text-[11px] font-semibold text-[var(--color-brand-primary)]">
                              {text}
                            </span>
                          );
                        })()}
                      </div>
                      {(() => {
                        const description = resolveText(product.description).trim();
                        if (!description) {
                          return null;
                        }
                        return (
                          <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">
                            {description}
                          </p>
                        );
                      })()}
                    </div>
                    <div className="mt-auto flex justify-start pt-1">
                      <Link
                        href={product.href}
                        className="inline-flex items-center gap-1 self-start text-sm font-semibold text-[var(--color-brand-primary)]"
                      >
                        {normalizeCtaLabel(resolveText(product.ctaLabel, cardCtaLabel))}
                        <span aria-hidden>→</span>
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {(resolveText(inventory.heading) || resolveText(inventory.description) || inventory.heroImage) && !hideInventory ? (
        <section className="relative py-16" data-preview-anchor="inventory">
          <div className="mx-auto w-full max-w-[1200px] space-y-6 px-4 sm:px-6 lg:px-8">
            <div className="text-center sm:text-left">
              {resolveText(inventory.heading) ? (
                <h3 className="text-2xl font-semibold text-[var(--color-brand-secondary)] md:text-3xl">{resolveText(inventory.heading)}</h3>
              ) : null}
            </div>
            <div className="relative overflow-hidden rounded-xl border border-[var(--color-border)]">
              <div className="relative h-[520px] w-full">
                <Image
                  src={resolveImage(inventory.heroImage, FALLBACK_INVENTORY_IMAGE)}
                  alt={resolveText(inventory.heading, "现货库存")}
                  fill
                  sizes="(min-width: 1280px) 100vw, 100vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-black/35" />
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 px-6 text-center text-white">
                  {resolveText(inventory.description) ? (
                    <p className="max-w-2xl text-lg font-semibold leading-relaxed text-white/90 md:text-xl">
                      {resolveText(inventory.description)}
                    </p>
                  ) : null}
                  <div className="flex flex-col items-center gap-4 sm:flex-row">
                    {(inventory.ctas ?? [
                      { href: "/inventory#in-stock", label: "现货库存" },
                      { href: "/inventory#rental", label: "租赁业务" },
                    ]).map((cta, index) => (
                      <Link
                        key={`${cta.href}-${cta.label}`}
                        href={cta.href}
                        className={`${index === 0 ? CTA_BUTTON_PRIMARY : CTA_BUTTON_SECONDARY} min-w-[160px]`}
                      >
                        {resolveText(cta.label)}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {overviewHero && !hideCompany ? (
        <section className="relative bg-white pt-14 pb-6" data-preview-anchor="company">
          <div className="mx-auto w-full max-w-[1200px] space-y-5 px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-2 text-left md:flex-row md:items-end md:justify-between">
              <h2 className="text-2xl font-bold text-[var(--color-brand-secondary)] md:text-3xl">{overviewTitle}</h2>
            </div>

            <article className="relative overflow-hidden rounded-lg border border-[var(--color-border)] shadow-xl">
                 <div className="relative h-full min-h-[520px]">
                    <Image
                      src={resolveImage(overviewHero.image, FALLBACK_OVERVIEW_IMAGE)}
                      alt={resolveText(overviewHero.title, overviewTitle)}
                      fill
                      sizes="(min-width: 1280px) 100vw, 100vw"
                      className="object-cover"
                    />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(208,40,39,0.45),transparent_45%),linear-gradient(120deg,rgba(11,17,32,0.9),rgba(17,24,46,0.7)60%,rgba(17,24,46,0.55))]" />

                <div className="relative z-10 grid h-full gap-10 p-8 text-white md:p-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-start">
                  <div className="flex h-full flex-col gap-6">
                    <div className="space-y-4">
                      {resolveText(overviewHero.title) ? (
                        <h3 className="max-w-3xl text-2xl font-semibold text-white md:text-3xl">
                          {resolveText(overviewHero.title)}
                        </h3>
                      ) : null}
                      {resolveText(overviewHero.description) ? (
                        <p className="max-w-3xl whitespace-pre-line text-xs text-white/85 md:text-sm">
                          {resolveText(overviewHero.description)}
                        </p>
                      ) : null}
                    </div>

                    {(overviewStats.length || overviewServiceHighlights.length) ? (
                      <div className="mt-auto space-y-4">
                        {overviewStats.length ? (
                          <div className="grid gap-3 text-white sm:grid-cols-2 lg:grid-cols-4">
                            {overviewStats.map((stat) => (
                              <div key={`${resolveText(stat.label)}-${stat.value}`} className="rounded-md bg-white/35 p-3 backdrop-blur">
                                <p className="text-lg font-semibold">{stat.value}</p>
                                <p className="text-[11px] text-white/70">{resolveText(stat.label)}</p>
                              </div>
                            ))}
                          </div>
                        ) : null}

                        {overviewServiceHighlights.length ? (
                          <div className="space-y-3 text-white">
                            {overviewServiceHighlights.map((item, index) => (
                              <div key={`${resolveText(item.title, 'highlight')}-${index}`} className="space-y-1">
                                <p className="flex items-center gap-2 text-sm font-semibold">
                                  <span className="inline-block h-2 w-2 rounded-full bg-[var(--color-brand-primary)]" />
                                  {resolveText(item.title)}
                                </p>
                                {resolveText(item.description) ? (
                                  <p className="pl-4 text-xs text-white/80">{resolveText(item.description)}</p>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>

                  <div className="space-y-5">
                    {overviewGalleryHero.map((item) => (
                      <div
                        key={`${item.image}-${resolveText(item.title)}`}
                        className="group relative overflow-hidden rounded-lg shadow-[0_28px_70px_rgba(15,23,42,0.32)] transition-transform duration-500"
                      >
                        <div className="relative h-72 w-full">
                          <Image
                            src={resolveImage(item.image, FALLBACK_OVERVIEW_IMAGE)}
                            alt={resolveText(item.title, "实景")}
                            fill
                            sizes="(min-width: 1280px) 40vw, 100vw"
                            className="object-cover transition-transform duration-700 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-gradient-to-tr from-black/65 via-black/20 to-transparent" />
                          <div className="absolute bottom-5 left-5 space-y-1">
                            {resolveText(item.title) ? (
                              <p className="text-lg font-semibold text-white">{resolveText(item.title)}</p>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ))}

                    {overviewGallerySupport.length ? (
                      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:mt-10">
                        {overviewGallerySupport.map((item) => (
                          <div
                            key={`${item.image}-${resolveText(item.title)}`}
                            className="group relative overflow-hidden rounded-lg shadow-[0_24px_60px_rgba(15,23,42,0.28)] transition-transform duration-500"
                          >
                            <div className="relative h-52 w-full">
                              <Image
                                src={resolveImage(item.image, FALLBACK_OVERVIEW_IMAGE)}
                                alt={resolveText(item.title, "实景")}
                                fill
                                sizes="(min-width: 1280px) 20vw, 50vw"
                                className="object-cover transition-transform duration-700 group-hover:scale-105"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-transparent" />
                              {resolveText(item.title) ? (
                                <p className="absolute bottom-4 left-4 text-sm font-semibold text-white">{resolveText(item.title)}</p>
                              ) : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </article>
          </div>
        </section>
      ) : null}

      {!hideCompany && overviewCapabilities.length ? (
        <CapabilityCarousel heading={overview.capabilityHeading} items={overviewCapabilities} />
      ) : null}

      {showContactCta ? (
        <section className="bg-[var(--color-brand-secondary)] py-14 text-white" data-preview-anchor="contactCta">
          <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-8 px-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
            <div className="space-y-3">
              {resolveText(contact.eyebrow) ? (
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/70">{resolveText(contact.eyebrow)}</p>
              ) : null}
              {resolveText(contact.title) ? (
                <h3 className="text-2xl font-semibold md:text-3xl">{resolveText(contact.title)}</h3>
              ) : null}
              {resolveText(contact.description) ? (
                <p className="max-w-2xl text-sm text-white/80 md:text-base">{resolveText(contact.description)}</p>
              ) : null}
            </div>
            <div className="flex flex-col gap-4 sm:flex-row">
              {contact.primary ? (
                <Link
                  href={contact.primary.href ?? "/contact#form"}
                  className={`${CTA_BUTTON_PRIMARY} min-w-[180px] focus-visible:ring-offset-[var(--color-brand-secondary)]`}
                >
                  {resolveText(contact.primary.label, "预约项目沟通")}
                </Link>
              ) : null}
              {contact.secondary ? (
                <Link
                  href={contact.secondary.href ?? "/contact"}
                  className={`${CTA_BUTTON_SECONDARY} min-w-[180px] focus-visible:ring-offset-[var(--color-brand-secondary)]`}
                >
                  {resolveText(contact.secondary.label, "查看联系方式")}
                </Link>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}

type CapabilityItem = {
  data: { title?: LocalizedOrString; subtitle?: LocalizedOrString; description?: LocalizedOrString; image?: string };
  titleText: string;
  subtitleText: string;
  descriptionText: string;
};

function CapabilityCarousel({
  heading,
  items,
}: {
  heading?: LocalizedOrString;
  items: Array<{ title?: LocalizedOrString; subtitle?: LocalizedOrString; description?: LocalizedOrString; image?: string }>;
}) {
  const cards: CapabilityItem[] = items
    .map((item) => {
      const titleText = resolveText(item.title).trim();
      const subtitleText = resolveText(item.subtitle, "", { localizedOnly: true }).trim();
      const descriptionText = resolveText(item.description, "", { localizedOnly: true }).trim();
      return {
        data: item,
        titleText,
        subtitleText,
        descriptionText,
      };
    })
    .filter(({ data, titleText, subtitleText, descriptionText }) =>
      Boolean(titleText || subtitleText || descriptionText || data.image?.trim()),
    );
  if (!cards.length) {
    return null;
  }
  const loop = [...cards, ...cards];
  return (
    <section className="bg-white py-5">
      <div className="mx-auto w-full max-w-[1200px] space-y-4 px-4 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-2">
          <h3 className="text-xl font-semibold tracking-tight text-[var(--color-brand-secondary)] sm:text-[1.6rem]">
            {resolveText(heading, "核心能力与资质")}
          </h3>
        </header>
        <div className="overflow-hidden">
          <div
            className="mx-auto flex w-max gap-4"
            style={{ animation: 'home-capability-carousel 65s linear infinite' }}
          >
            {loop.map(({ data, titleText, subtitleText, descriptionText }, index) => {
              return (
                <article
                  key={`${titleText || subtitleText || "capability"}-${index}`}
                  className="relative w-[240px] flex-shrink-0 overflow-hidden rounded-2xl p-4 text-[var(--color-brand-secondary)] sm:w-[260px]"
                >
                  <div className="flex h-full flex-col gap-4">
                    <div className="relative h-32 w-full overflow-hidden rounded-xl">
                      <Image
                        src={resolveImage(data.image, FALLBACK_CAPABILITY_IMAGE)}
                        alt={titleText || subtitleText || "能力亮点"}
                        fill
                        sizes="(min-width: 1280px) 20vw, (min-width: 768px) 30vw, 60vw"
                        className="object-cover"
                      />
                    </div>
                    <div className="space-y-2 text-center">
                      {titleText ? (
                        <p className="text-sm font-semibold leading-relaxed text-[var(--color-brand-secondary)]">{titleText}</p>
                      ) : null}
                      {subtitleText ? (
                        <p className="text-xs text-[var(--color-brand-primary)]/75">{subtitleText}</p>
                      ) : null}
                      {descriptionText ? (
                        <p className="text-xs text-[var(--color-text-secondary)]">{descriptionText}</p>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>
      <style>{`
        @keyframes home-capability-carousel {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </section>
  );
}

import { resolveImageSrc } from "@/utils/image";

function resolveImage(value: string | undefined, fallback: string): string {
  return resolveImageSrc(value, fallback);
}
