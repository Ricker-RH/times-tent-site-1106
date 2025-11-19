import type { SVGProps } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ensurePageVisible, getHiddenSections } from "@/server/visibility";

import { CaseSidebar } from "@/components/cases/CaseSidebar";
import {
  fetchCaseCategories,
  fetchCaseCategoryBySlug,
  fetchCasesConfig,
} from "@/server/cases";
import { t, setCurrentLocale } from "@/data";
import { getRequestLocale } from "@/server/locale";

interface CategoryPageProps {
  params: { category: string };
}

export async function generateStaticParams() {
  const categories = await fetchCaseCategories();
  return categories
    .filter((category) => category.studies.length)
    .map((category) => ({ category: category.slug }));
}

export async function generateMetadata({ params }: CategoryPageProps) {
  const category = await fetchCaseCategoryBySlug(params.category);
  if (!category) {
    return { title: "案例展示" };
  }
  return {
    title: `${t(category.name)} | 案例展示`,
    description: t(category.intro),
  };
}

export default async function CaseCategoryPage({ params }: CategoryPageProps) {
  const visibility = await ensurePageVisible("casesCategory");
  const hiddenSections = getHiddenSections(visibility, "casesCategory");
  const hideSidebar = hiddenSections.sidebar === true;
  const hideHeader = hiddenSections.header === true;
  const hideCaseGrid = hiddenSections.caseGrid === true;
  const hideCta = hiddenSections.cta === true;
  const locale = getRequestLocale();
  setCurrentLocale(locale);
  const [config, categories] = await Promise.all([
    fetchCasesConfig(),
    fetchCaseCategories(),
  ]);
  const category = categories.find((item) => item.slug === params.category);

  if (!category) {
    notFound();
  }

  const baseCrumbs: ReadonlyArray<{ href?: string; label?: unknown }> = (
    Array.isArray((config as any).breadcrumbI18n) && (config as any).breadcrumbI18n.length
      ? ((config as any).breadcrumbI18n as ReadonlyArray<{ href?: string; label?: unknown }>)
      : ((config.breadcrumb ?? [
          { href: "/", label: "首页" },
          { href: "/cases", label: "案例展示" },
        ]) as ReadonlyArray<{ href?: string; label?: unknown }>)
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
                title={config.sidebarTitle}
              />
            </div>
          )}

          <div className="flex-1 space-y-8">
            <Breadcrumb items={[
              ...baseCrumbs,
              { href: `/cases/${category.slug}`, label: category.name },
            ]} />
            {hideHeader ? null : (
              <header className="space-y-3">
                <h1 className="text-2xl font-semibold text-[var(--color-brand-secondary)] md:text-3xl">{t(category.name)}</h1>
                <p className="text-sm text-[var(--color-text-secondary)] md:text-base">{t(category.intro)}</p>
              </header>
            )}

            {hideCaseGrid ? null : (
              <div className="grid gap-6">
                {category.studies.map((study) => (
                  <article key={study.slug} className="relative overflow-hidden rounded-lg border border-[var(--color-border)]">
                    <div className="relative h-[360px] w-full md:h-[400px]">
                      <Image
                        src={study.image}
                        alt={t(study.title)}
                        fill
                        className="object-cover"
                        sizes="100vw"
                      />
                      <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
                        <Link href={`/cases/${category.slug}/${study.slug}`} className="inline-block text-2xl font-extrabold text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)] md:text-3xl">
                          {t(study.title)}
                        </Link>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}

            {hideCta ? null : (
              <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-6">
                <div className="space-y-4 text-left">
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-[var(--color-brand-secondary)]">需要定制方案？</p>
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      留下项目信息，24 小时内由行业顾问回电，为您提供方案设计、预算测算与现场勘查。
                    </p>
                  </div>
                  <div className="flex flex-col gap-3 text-sm sm:flex-row">
                    <Link href="/contact" className="rounded-[6px] bg-[var(--color-brand-primary)] px-6 py-3 text-center font-semibold text-white transition hover:bg-red-600 w-full sm:flex-1">
                      提交项目信息
                    </Link>
                    <Link
                      href="tel:400-800-1234"
                      className="rounded-full bg-[var(--color-brand-primary)] px-6 py-3 text-center font-semibold text-white transition hover:bg-red-600 w-full sm:flex-1"
                    >
                      致电 400-800-1234
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function Breadcrumb({ items }: { items: Array<{ href?: string; label?: unknown }> }) {
  return (
    <nav aria-label="面包屑导航">
      <ol className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-secondary)]">
        {items.map((item, index) => {
          const href = item.href;
          const rawLabel = (item as any).label;
          const label = typeof rawLabel === "string" ? rawLabel : t(rawLabel);
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

function ChevronIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
