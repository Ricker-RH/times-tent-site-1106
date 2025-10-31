"use client";

import Image from "next/image";

import { t } from "@/data";
import type { AboutConfig } from "@/server/pageConfigs";

const STAT_CARD_CLASSES = [
  "rounded-md bg-gradient-to-br from-[#473225]/95 via-[#644331]/90 to-[#7b5742]/90 px-5 py-4 text-white shadow-[0_18px_45px_rgba(22,16,10,0.38)]",
  "rounded-md bg-gradient-to-br from-[#4f3c2f]/95 via-[#705340]/90 to-[#8c6850]/90 px-5 py-4 text-white shadow-[0_18px_45px_rgba(22,16,10,0.32)]",
  "rounded-md bg-gradient-to-br from-[#5c4334]/95 via-[#7e5d44]/90 to-[#9a7154]/85 px-5 py-4 text-white shadow-[0_18px_45px_rgba(22,16,10,0.28)]",
  "rounded-md bg-gradient-to-br from-[#6a4c39]/95 via-[#8d6751]/90 to-[#ac7f63]/85 px-5 py-4 text-white shadow-[0_18px_45px_rgba(22,16,10,0.24)]",
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
