"use client";

import Image from "next/image";

import { t } from "@/data";
import type { AboutConfig } from "@/server/pageConfigs";

import { AboutIcon, type AboutIconName } from "./icons";

interface AboutWhySectionProps {
  whyUsSection: AboutConfig["whyUsSection"];
}

export function AboutWhySection({ whyUsSection }: AboutWhySectionProps): JSX.Element {
  if (!whyUsSection) {
    return <></>;
  }

  return (
    <section className="bg-white pt-16 pb-10" id="about-why">
      <div className="mx-auto w-full max-w-[1200px] space-y-8 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 text-left md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl space-y-2">
            <h2 className="text-2xl font-bold text-[var(--color-brand-secondary)] md:text-3xl">
              {t(whyUsSection.title)}
            </h2>
            <p className="text-base text-[var(--color-text-secondary)]">
              {t(whyUsSection.description)}
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {(whyUsSection.highlights ?? []).map((highlight) => (
            <div
              key={t(highlight.title)}
              className="relative flex h-full flex-col overflow-hidden rounded-lg text-white shadow-[0_24px_50px_rgba(15,23,42,0.22)] transition hover:-translate-y-1"
            >
              <Image
                src={highlight.image}
                alt={t(highlight.title)}
                fill
                sizes="(min-width: 1280px) 25vw, (min-width: 768px) 40vw, 90vw"
                className="object-cover"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-black/60 via-black/40 to-black/20" />
              <div className="relative z-10 flex h-full flex-col gap-4 p-5">
                <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-white/85 text-[var(--color-brand-primary)] shadow">
                  <AboutIcon name={(highlight.icon as AboutIconName) ?? "timeline"} />
                </span>
                <div className="rounded-md bg-white/70 p-4 text-[var(--color-brand-secondary)] shadow backdrop-blur">
                  <h3 className="text-sm font-semibold">{t(highlight.title)}</h3>
                  <p className="mt-2 text-xs text-[var(--color-text-secondary)]">{t(highlight.description)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
