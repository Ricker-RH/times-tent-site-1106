"use client";

import Image from "next/image";

import { t } from "@/data";
import type { AboutConfig } from "@/server/pageConfigs";

const STAT_CARD_CLASS = "rounded-2xl bg-[#c81c24] px-5 py-4 text-white";

interface AboutCompanySectionProps {
  introSection: AboutConfig["introSection"];
}

export function AboutCompanySection({ introSection }: AboutCompanySectionProps): JSX.Element {
  if (!introSection) {
    return <></>;
  }
  const title = t(introSection.title);
  const strapline = t(introSection.strapline);
  const paragraph = t(introSection.paragraph);

  return (
    <section className="bg-white pb-16 pt-8" id="about-company">
      <div className="mx-auto w-full max-w-[1200px] space-y-9 px-4 sm:px-6 lg:px-8">
        <div className="space-y-3 text-center md:text-left">
          <h2 className="text-2xl font-bold text-[var(--color-brand-secondary)] md:text-3xl">{title}</h2>
          <p className="text-base text-[var(--color-text-secondary)]">{strapline}</p>
          <p className="whitespace-pre-line text-sm text-[var(--color-text-secondary)] md:text-base">{paragraph}</p>
        </div>

        <div className="space-y-2">
          <div className="relative overflow-hidden rounded-[12px] bg-white shadow-[0_26px_70px_rgba(15,23,42,0.18)]">
            <div className="relative">
              <Image
                src={introSection.campusImage}
                alt={title}
                width={2000}
                height={1200}
                className="h-full w-full object-cover"
                priority
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-black/35 via-black/10 to-transparent" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-black/45 via-black/15 to-transparent" />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {(introSection.stats ?? []).map((stat, index) => (
              <div
                key={`stat-${index}-${stat.value}`}
                className={STAT_CARD_CLASS}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/75">{t(stat.label)}</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
