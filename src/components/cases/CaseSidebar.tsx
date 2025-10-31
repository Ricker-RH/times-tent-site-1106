import Link from "next/link";

import type { CaseCategory } from "@/server/pageConfigs";
import { t } from "@/data";

interface CaseSidebarProps {
  categories: ReadonlyArray<CaseCategory>;
  activeCategory?: string;
  activeStudySlug?: string;
  title?: string;
  className?: string;
}

export function CaseSidebar({ categories, activeCategory, activeStudySlug, title = "案例展示", className = "" }: CaseSidebarProps) {
  return (
    <aside
      className={["rounded-lg border border-[var(--color-border)] bg-white p-4 shadow-sm md:sticky md:top-24", className]
        .filter(Boolean)
        .join(" ")}
    >
      <h2 className="px-3 text-sm font-semibold text-[var(--color-brand-secondary)]">{t(title)}</h2>
      <div className="mt-3 space-y-2">
        {categories.map((category) => {
          const isActiveCategory = category.slug === activeCategory;
          return (
            <div key={category.slug} className="space-y-1">
              <Link
                href={`/cases/${category.slug}`}
                className={[
                  "block rounded-md px-4 py-3 text-sm transition",
                  isActiveCategory
                    ? "bg-[var(--color-brand-primary)] font-semibold text-white shadow"
                    : "bg-[var(--color-surface-muted)] text-[var(--color-brand-secondary)] hover:bg-white hover:text-[var(--color-brand-primary)]",
                ].join(" ")}
              >
                {t(category.name)}
              </Link>
              {isActiveCategory && category.studies.length ? (
                <div className="space-y-1 rounded-md bg-[var(--color-surface-muted)] p-2">
                  {category.studies.map((study) => {
                    const isActiveStudy = study.slug === activeStudySlug;
                    return (
                      <Link
                        key={study.slug}
                        href={`/cases/${category.slug}/${study.slug}`}
                        className={[
                          "block rounded-md px-3 py-2 text-xs transition",
                          isActiveStudy
                            ? "border border-[var(--color-brand-primary)] bg-white font-semibold text-[var(--color-brand-primary)] shadow"
                            : "text-[var(--color-text-secondary)] hover:bg-white hover:text-[var(--color-brand-primary)]",
                        ].join(" ")}
                      >
                        {t(study.title)}
                      </Link>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
