"use client";

import Image from "next/image";

import { t } from "@/data";
import type { AboutConfig } from "@/server/pageConfigs";

const STAT_CARD_CLASSES = [
  "rounded-2xl border border-white/15 bg-gradient-to-br from-[#ff7b8a]/90 via-[#d02827]/90 to-[#8f101b]/85 px-5 py-4 text-white shadow-[0_24px_55px_rgba(208,40,39,0.45)] backdrop-blur-xl",
  "rounded-2xl border border-white/15 bg-gradient-to-br from-[#ff8f9c]/85 via-[#e1353a]/85 to-[#a61220]/80 px-5 py-4 text-white shadow-[0_20px_50px_rgba(208,40,39,0.38)] backdrop-blur-xl",
  "rounded-2xl border border-white/15 bg-gradient-to-br from-[#ffa6b1]/80 via-[#f0484c]/80 to-[#bb1925]/75 px-5 py-4 text-white shadow-[0_18px_46px_rgba(208,40,39,0.32)] backdrop-blur-xl",
  "rounded-2xl border border-white/15 bg-gradient-to-br from-[#ffbdc3]/75 via-[#ff6370]/75 to-[#c7222e]/70 px-5 py-4 text-white shadow-[0_16px_40px_rgba(208,40,39,0.28)] backdrop-blur-xl",
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

        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
    </section>
  );
}
