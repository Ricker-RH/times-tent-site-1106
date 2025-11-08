import type { SVGProps } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ensurePageVisible, getHiddenSections } from "@/server/visibility";

import { CaseSidebar } from "@/components/cases/CaseSidebar";
import { CaseGallery } from "@/components/cases/CaseGallery";
import {
  fetchCaseCategories,
  fetchCaseStudy,
  fetchCaseStudyBySlug,
} from "@/server/cases";
import { t, setCurrentLocale } from "@/data";
import { getRequestLocale } from "@/server/locale";
import { fetchCasesConfig } from "@/server/cases";

function toTValue(value: unknown): string | Record<string, string | undefined> | undefined {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") return value as Record<string, string | undefined>;
  return undefined;
}


interface CaseDetailProps {
  params: { category: string; slug: string };
}

export async function generateStaticParams() {
  const categories = await fetchCaseCategories();
  const params: Array<{ category: string; slug: string }> = [];
  for (const category of categories) {
    for (const study of category.studies) {
      params.push({ category: category.slug, slug: study.slug });
    }
  }
  return params;
}

export async function generateMetadata({ params }: CaseDetailProps) {
  const data = await fetchCaseStudyBySlug(params.slug);
  if (!data) {
    return { title: "案例详情" };
  }
  return {
    title: `${t(data.study.title)} | 案例展示`,
    description: t(data.study.summary),
  };
}

export default async function CaseDetailPage({ params }: CaseDetailProps) {
  const visibility = await ensurePageVisible("casesDetail");
  const hiddenSections = getHiddenSections(visibility, "casesDetail");
  const hideSidebar = hiddenSections.sidebar === true;
  const hideHero = hiddenSections.hero === true;
  const hideBackground = hiddenSections.background === true;
  const hideHighlights = hiddenSections.highlights === true;
  const hideDeliverables = hiddenSections.deliverables === true;
  const hideGallery = hiddenSections.gallery === true;
  const hideRelated = hiddenSections.related === true;
  const hideAdvisor = hiddenSections.advisor === true;

  const locale = getRequestLocale();
  setCurrentLocale(locale);

  const [categories, data, config] = await Promise.all([
    fetchCaseCategories(),
    fetchCaseStudy(params.category, params.slug),
    fetchCasesConfig(),
  ]);

  if (!data) {
    notFound();
  }

  const { category, study } = data;
  const galleryLightbox = (config as any).galleryLightbox ?? {};
  const resolveGalleryText = (value: unknown, fallback: string) => {
    const resolved = t(toTValue(value));
    return resolved?.toString().trim().length ? (resolved as string) : fallback;
  };
  const galleryHint = resolveGalleryText(galleryLightbox.openHint, "点击查看大图");
  const galleryNext = resolveGalleryText(galleryLightbox.nextLabel, "下一张");
  const galleryPrev = resolveGalleryText(galleryLightbox.prevLabel, "上一张");
  const galleryClose = resolveGalleryText(galleryLightbox.closeLabel, "关闭");
  const galleryCounter = resolveGalleryText(galleryLightbox.counterPattern, "图 {{current}} / {{total}}");
  type StudyMetric = { label: string | unknown; value: string | unknown };
  const metricsOriginal: ReadonlyArray<{ label: unknown; value: unknown }> =
    Array.isArray((study as any).metricsI18n) && (study as any).metricsI18n.length
      ? ((study as any).metricsI18n as ReadonlyArray<{ label: unknown; value: unknown }>)
      : (Array.isArray((study as any).metrics)
          ? ((study as any).metrics as ReadonlyArray<{ label: string; value: string }>)
          : []);
  const metricsLocalized: Array<{ label: string; value: string }> = metricsOriginal.map((m) => ({
    label: t(toTValue(m.label)),
    value: t(toTValue(m.value)),
  }));
  const showBackgroundSection = !hideBackground && (Boolean(study.background) || metricsLocalized.length > 0);
  const relatedStudies = category.studies.filter((item) => item.slug !== study.slug);
  const featuredStudies = relatedStudies.slice(0, 3);

  const baseCrumbs: ReadonlyArray<{ href?: string; label?: string | Record<string, string | undefined> | undefined }> = (
    Array.isArray((config as any).breadcrumbI18n) && (config as any).breadcrumbI18n.length
      ? ((config as any).breadcrumbI18n as ReadonlyArray<{ href?: string; label?: string | Record<string, string | undefined> | undefined }>)
      : ((config.breadcrumb ?? [
          { href: "/", label: "首页" },
          { href: "/cases", label: "案例展示" },
        ]) as ReadonlyArray<{ href?: string; label?: string | Record<string, string | undefined> | undefined }>)
  );

  return (
    <main className="flex-1">
      <div className="bg-white pb-20 pt-10">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-8 px-4 sm:px-6 md:flex-row lg:px-8">
          {hideSidebar ? null : (
            <div className="md:w-[260px] md:shrink-0">
              <CaseSidebar
                categories={categories}
                activeCategory={category.slug}
                activeStudySlug={study.slug}
              />
            </div>
          )}

          <div className="flex-1 space-y-8">

            <Breadcrumb
              items={[
                ...baseCrumbs,
                { href: `/cases/${category.slug}`, label: category.name },
                { label: study.title },
              ]}
            />

            {hideHero ? null : (
              <div className="overflow-hidden rounded-lg border border-[var(--color-border)] bg-white">
                <div className="relative h-[360px] w-full">
                  <Image
                    src={study.image}
                    alt={t(study.title)}
                    fill
                    className="object-cover"
                    sizes="100vw"
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  <div className="absolute inset-0 flex flex-col justify-end gap-3 p-8 text-white">
                    <div className="flex flex-wrap items-center gap-3 text-xs text-white/80">
                      {study.year ? <span>{study.year}</span> : null}
                      {study.location ? <span>{t(study.location)}</span> : null}
                      <span className="rounded-full bg-white/20 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.3em]">
                         {t(category.name)}
                       </span>
                    </div>
                    <h1 className="text-3xl font-semibold md:text-4xl">{t(study.title)}</h1>
                    {t(study.summary) ? (
                      <p className="max-w-3xl text-sm text-white/80">{t(study.summary)}</p>
                    ) : null}
                  </div>
                </div>
              </div>
            )}

            {showBackgroundSection ? (
              <section className="rounded-lg border border-[var(--color-border)] bg-white p-8">
                <h2 className="text-xl font-semibold text-[var(--color-brand-secondary)]">项目背景</h2>
                <div className={`mt-4 grid gap-6 ${study.backgroundImage ? "md:grid-cols-[1.1fr_0.9fr]" : ""}`}>
                  <div>
                    {t(study.background) ? (
                      <p className="text-sm text-[var(--color-text-secondary)]">{t(study.background)}</p>
                    ) : null}
                    {metricsLocalized.length ? (
                      <div className="mt-6 grid gap-4 sm:grid-cols-3">
                        {metricsLocalized.map((metric) => (
                          <div key={`${metric.label}-${metric.value}`} className="rounded-md border border-[var(--color-border)] bg-white p-4 text-center">
                            <p className="text-lg font-semibold text-[var(--color-brand-secondary)]">{metric.value}</p>
                            <p className="text-xs text-[var(--color-text-secondary)]">{metric.label}</p>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  {study.backgroundImage ? (
                    <figure className="relative h-64 overflow-hidden rounded-xl">
                      <Image
                        src={study.backgroundImage}
                        alt={`${t(study.title)} 项目背景`}
                        fill
                        className="object-cover"
                        sizes="(min-width: 1024px) 40vw, 100vw"
                      />
                    </figure>
                  ) : null}
                </div>
              </section>
            ) : null}


            {(() => {
              const highlightsCandidates: ReadonlyArray<string | unknown> =
                Array.isArray((study as any).highlightsI18n) && (study as any).highlightsI18n.length
                  ? ((study as any).highlightsI18n as ReadonlyArray<string | unknown>)
                  : ((study.highlights ?? []) as ReadonlyArray<string>);
              const highlightsDisplay = highlightsCandidates.map((item) => t(toTValue(item)));
              return highlightsDisplay.length && !hideHighlights ? (
                <section className="rounded-lg border border-[var(--color-border)] bg-white p-8">
                  <h2 className="text-xl font-semibold text-[var(--color-brand-secondary)]">解决方案亮点</h2>
                  <div className={`mt-6 grid gap-6 ${study.highlightsImage ? "lg:grid-cols-[minmax(0,2fr)_340px]" : ""}`}>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {highlightsDisplay.map((item) => (
                        <div
                          key={item}
                          className="rounded-xl border border-[var(--color-border)] bg-white p-5 shadow-[0_14px_35px_rgba(15,23,42,0.12)] text-center transition hover:-translate-y-1"
                        >
                          <p className="text-sm font-semibold leading-6 text-[var(--color-brand-primary)]">{item}</p>
                        </div>
                      ))}
                    </div>
                    {study.highlightsImage ? (
                      <figure className="relative h-64 overflow-hidden rounded-xl">
                        <Image
                          src={study.highlightsImage}
                          alt={`${t(study.title)} 亮点配图`}
                          fill
                          className="object-cover"
                          sizes="(min-width: 1024px) 30vw, 100vw"
                        />
                      </figure>
                    ) : null}
                  </div>
                </section>
              ) : null;
            })()}


            {(() => {
              const deliverablesCandidates: ReadonlyArray<string | unknown> =
                Array.isArray((study as any).deliverablesI18n) && (study as any).deliverablesI18n.length
                  ? ((study as any).deliverablesI18n as ReadonlyArray<string | unknown>)
                  : ((study.deliverables ?? []) as ReadonlyArray<string>);
              const deliverablesDisplay = deliverablesCandidates.map((item) => t(toTValue(item)));
              return deliverablesDisplay.length && !hideDeliverables ? (
                <section className="rounded-lg border border-[var(--color-border)] bg-white p-8">
                  <h2 className="text-xl font-semibold text-[var(--color-brand-secondary)]">交付成果</h2>
                  <div className={`mt-4 grid gap-6 ${study.deliverablesImage ? "md:grid-cols-[minmax(0,1.4fr)_1fr]" : ""}`}>
                    <div className="space-y-3 text-sm text-[var(--color-text-secondary)]">
                      {deliverablesDisplay.map((item) => (
                        <p key={item} className="flex items-start gap-2">
                          <span className="mt-1 inline-block h-2 w-2 rounded-full bg-[var(--color-brand-primary)]"></span>
                          <span>{item}</span>
                        </p>
                      ))}
                    </div>
                    {study.deliverablesImage ? (
                      <figure className="relative h-56 overflow-hidden rounded-xl">
                        <Image
                          src={study.deliverablesImage}
                          alt={`${t(study.title)} 交付成果配图`}
                          fill
                          className="object-cover"
                          sizes="(min-width: 1024px) 35vw, 100vw"
                        />
                      </figure>
                    ) : null}
                  </div>
                </section>
              ) : null;
            })()}

            {study.gallery?.length && !hideGallery ? (
              <section className="rounded-lg border border-[var(--color-border)] bg-white p-8">
                <h2 className="text-xl font-semibold text-[var(--color-brand-secondary)]">项目实景图库</h2>
                <CaseGallery
                  images={study.gallery}
                  title={t(study.title)}
                  hintLabel={galleryHint}
                  prevLabel={galleryPrev}
                  nextLabel={galleryNext}
                  closeLabel={galleryClose}
                  counterPattern={galleryCounter}
                />
              </section>
            ) : null}

            {featuredStudies.length && !hideRelated ? (
              <section className="rounded-lg border border-[var(--color-border)] bg-white p-8">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-[var(--color-brand-secondary)]">更多同类案例</h2>
                  <Link href={`/cases/${category.slug}`} className="text-sm font-semibold text-[var(--color-brand-primary)]">
                    返回分类 →
                  </Link>
                </div>
                <div className="mt-6 grid gap-6 md:grid-cols-3">
                  {featuredStudies.map((item) => (
                    <Link
                      key={item.slug}
                      href={`/cases/${category.slug}/${item.slug}`}
                      className="group overflow-hidden rounded-md border border-[var(--color-border)] bg-white transition hover:-translate-y-1 hover:shadow-lg"
                    >
                      <div className="relative h-40">
                        <Image
                          src={item.image}
                          alt={t(item.title)}
                          fill
                          className="object-cover transition duration-500 group-hover:scale-105"
                          sizes="(min-width: 768px) 33vw, 100vw"
                        />
                      </div>
                      <div className="space-y-2 p-4">
                        <p className="text-xs text-[var(--color-text-secondary)]">
                          {item.year ? `${item.year}` : null}
                          {item.year && t(item.location) ? " · " : null}
                          {t(item.location) ?? null}
                        </p>
                        <h3 className="text-sm font-semibold text-[var(--color-brand-secondary)]">{t(item.title)}</h3>
                        {t(item.summary) ? (
                          <p className="text-xs text-[var(--color-text-secondary)] line-clamp-3">{t(item.summary)}</p>
                        ) : null}
                        <span className="inline-flex text-xs font-semibold text-[var(--color-brand-primary)]">查看详情</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}

            {hideAdvisor ? null : <AdvisorCTA />}
          </div>
        </div>
      </div>
    </main>
  );
}

function Breadcrumb({ items }: { items: ReadonlyArray<{ href?: string; label?: string | Record<string, string | undefined> | undefined }> }) {
  return (
    <nav aria-label="面包屑导航">
      <ol className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-secondary)]">
        {items.map((item, index) => {
          const href = item.href;
          const rawLabel = (item as any).label;
          const label = typeof rawLabel === "string" ? rawLabel : t(toTValue(rawLabel));
          const isLast = index === items.length - 1;
          return (
            <li key={`${href ?? ""}-${label ?? ""}`} className="flex items-center gap-2">
              {href ? (
                <Link href={href} className="transition hover:text-[var(--color-brand-primary)]">
                  {label}
                </Link>
              ) : (
                <span className={isLast ? "text-[var(--color-brand-secondary)]" : ""}>{label}</span>
              )}
              {isLast ? null : <ChevronIcon className="h-3.5 w-3.5" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function AdvisorCTA() {
  return (
    <section className="rounded-lg border border-[var(--color-border)] bg-white p-6 md:p-8">
      <div className="space-y-4 text-left">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-[var(--color-brand-secondary)]">需要定制方案？</p>
          <p className="text-sm text-[var(--color-text-secondary)] md:text-base">
            留下项目信息，24 小时内由行业顾问回电，为您提供方案设计、预算测算与现场勘查。
          </p>
        </div>
        <div className="flex flex-col items-start gap-3 text-sm">
          <Link href="/contact" className="rounded-full bg-[var(--color-brand-primary)] px-6 py-3 text-center font-semibold text-white transition hover:bg-red-600 w-full">
            提交项目信息
          </Link>
          <Link href="tel:400-800-1234" className="rounded-full bg-[var(--color-brand-primary)] px-6 py-3 text-center font-semibold text-white transition hover:bg-red-600 w-full">
            致电 400-800-1234
          </Link>
        </div>
      </div>
    </section>
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
