"use client";

import Image from "next/image";

import { t } from "@/data";
import type { ContactConfig } from "@/server/pageConfigs";

interface ContactHeroSectionProps {
  hero: NonNullable<ContactConfig["hero"]>;
}

export function ContactHeroSection({ hero }: ContactHeroSectionProps): JSX.Element {
  const eyebrow = t(hero.eyebrow).trim();
  const title = t(hero.title);
  const description = t(hero.description);
  const overlayEnabled = hero.overlayEnabled !== false;

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0">
        <Image
          src={hero.backgroundImage}
          alt={title || "Contact hero"}
          fill
          sizes="100vw"
          className="object-cover"
          priority
        />
        {overlayEnabled ? (
          <>
            <div className="absolute inset-0 bg-gradient-to-br from-black/85 via-black/55 to-black/35" />
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute -left-24 top-1/4 h-72 w-72 rounded-full bg-[var(--color-brand-primary)]/35 blur-3xl" />
              <div className="absolute right-[-120px] top-1/3 h-64 w-64 rounded-full bg-white/25 blur-3xl" />
            </div>
          </>
        ) : null}
      </div>

      <div className="relative z-10 mx-auto flex min-h-[420px] w-full max-w-[1200px] flex-col justify-center gap-6 px-4 py-16 text-white sm:px-6 md:py-24 lg:px-8">
        {eyebrow ? (
          <span
            className={`inline-flex w-fit items-center rounded-full px-5 py-1 text-xs font-semibold uppercase tracking-[0.35em] ${
              overlayEnabled ? "bg-white/15" : "bg-black/45 backdrop-blur"
            }`}
          >
            {eyebrow}
          </span>
        ) : null}
        <div className="max-w-4xl space-y-4">
          <h1
            className={`max-w-3xl text-3xl font-semibold md:text-4xl ${
              overlayEnabled ? "" : "drop-shadow-[0_6px_24px_rgba(0,0,0,0.55)]"
            }`}
          >
            {title}
          </h1>
          {description?.trim() ? (
            <p
              className={`w-full text-sm md:text-base ${
                overlayEnabled ? "text-white/85" : "text-white drop-shadow-[0_4px_18px_rgba(0,0,0,0.6)]"
              }`}
            >
              {description}
            </p>
          ) : null}
        </div>
      </div>

      {(hero.metrics ?? []).length ? (
        <div className="absolute inset-x-0 bottom-8 z-10">
          <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap gap-4 text-xs font-medium text-white/80">
              {(hero.metrics ?? []).map((metric) => (
                <span
                  key={`${metric.value}-${t(metric.label)}`}
                  className={`inline-flex items-center gap-3 rounded-full px-5 py-2 ${
                    overlayEnabled ? "bg-white/10 backdrop-blur" : "bg-black/50 backdrop-blur"
                  }`}
                >
                  <span className="text-lg font-semibold text-white">{metric.value}</span>
                  {t(metric.label)}
                </span>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
