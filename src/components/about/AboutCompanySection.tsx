"use client";

import Image from "next/image";

import { t } from "@/data";
import type { AboutConfig } from "@/server/pageConfigs";

const STAT_CARD_CLASSES = [
  "rounded-xl border border-white/15 bg-gradient-to-br from-[#ff5f6d]/80 via-[#ff2e56]/75 to-[#b31217]/75 px-5 py-4 text-white shadow-[0_18px_50px_rgba(208,40,39,0.45)] backdrop-blur-md",
  "rounded-xl border border-white/15 bg-gradient-to-br from-[#ff7a88]/75 via-[#ff3b5f]/70 to-[#c01628]/75 px-5 py-4 text-white shadow-[0_18px_45px_rgba(208,40,39,0.38)] backdrop-blur-md",
  "rounded-xl border border-white/15 bg-gradient-to-br from-[#ffa1ac]/70 via-[#ff5c72]/70 to-[#d31f33]/70 px-5 py-4 text-white shadow-[0_16px_40px_rgba(208,40,39,0.32)] backdrop-blur-md",
  "rounded-xl border border-white/15 bg-gradient-to-br from-[#ffc0c8]/65 via-[#ff768a]/65 to-[#e02f40]/65 px-5 py-4 text-white shadow-[0_14px_36px_rgba(208,40,39,0.28)] backdrop-blur-md",
] as const;

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

          <div className="absolute inset-x-6 bottom-6 grid gap-3 sm:grid-cols-4">
            {(introSection.stats ?? []).map((stat, index) => (
              <div
                key={`stat-${index}-${stat.value}`}
                className={STAT_CARD_CLASSES[index] ?? STAT_CARD_CLASSES[STAT_CARD_CLASSES.length - 1]}
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
