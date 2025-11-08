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
        <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-black/45 to-black/30" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[420px] w-full max-w-[1200px] flex-col justify-center gap-6 px-4 py-16 text-white sm:px-6 md:py-24 lg:px-8">
        {eyebrow ? (
          <span className="inline-flex w-fit items-center rounded-full bg-white/15 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em]">
            {eyebrow}
          </span>
        ) : null}
        <h1 className="max-w-3xl text-3xl font-semibold md:text-4xl">{title}</h1>
        <p className="w-full whitespace-nowrap text-sm text-white/80 md:text-base">{description}</p>
      </div>
    </section>
  );
}
