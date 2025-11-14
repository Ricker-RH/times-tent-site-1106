"use client";

import Image from "next/image";

import { t } from "@/data";
import type { AboutConfig } from "@/server/pageConfigs";

interface AboutHeroSectionProps {
  hero: AboutConfig["hero"];
}

export function AboutHeroSection({ hero }: AboutHeroSectionProps): JSX.Element {
  if (!hero) {
    return <></>;
  }
  const eyebrow = t(hero.eyebrow);
  const title = t(hero.title);
  const description = t(hero.description);
  const overlayEnabled = hero.overlayEnabled ?? true;

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0">
        <Image
          src={hero.backgroundImage}
          alt={eyebrow}
          fill
          sizes="100vw"
          className="object-cover"
          priority
        />
        {overlayEnabled ? <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-black/45 to-black/30" /> : null}
      </div>

      <div className="relative z-10 mx-auto flex min-h-[420px] w-full max-w-[1200px] flex-col justify-center gap-8 px-4 py-16 text-white sm:px-6 md:py-24 lg:px-8">
        {eyebrow ? (
          <span
            className={`inline-flex w-fit items-center rounded-full px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] ${
              overlayEnabled ? "bg-white/15" : "bg-black/40 backdrop-blur"
            }`}
          >
            {eyebrow}
          </span>
        ) : null}
        <h1
          className={`max-w-3xl text-3xl font-semibold md:text-4xl ${
            overlayEnabled ? "" : "drop-shadow-[0_6px_24px_rgba(0,0,0,0.55)]"
          }`}
        >
          {title}
        </h1>
        <p
          className={`w-full text-sm md:text-base ${
            overlayEnabled ? "text-white/80" : "text-white drop-shadow-[0_4px_18px_rgba(0,0,0,0.6)]"
          }`}
        >
          {description}
        </p>
      </div>
    </section>
  );
}
