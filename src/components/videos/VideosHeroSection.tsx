"use client";

import Image from "next/image";

import { t } from "@/data";
import type { VideosHero } from "@/types/videos";

interface VideosHeroSectionProps {
  hero: VideosHero;
}

export function VideosHeroSection({ hero }: VideosHeroSectionProps): JSX.Element {
  const eyebrow = t(hero.eyebrow);
  const title = t(hero.title);
  const description = t(hero.description);

  // Fallback image to avoid Next/Image missing src error
  const HERO_FALLBACK_IMAGE = "https://images.unsplash.com/photo-1500530855697-b5864f8b3222?auto=format&w=2000&q=80";
  const bgSrc = hero.backgroundImage && hero.backgroundImage.trim()
    ? hero.backgroundImage
    : HERO_FALLBACK_IMAGE;

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0">
        <Image
          src={bgSrc}
          alt={eyebrow || "Video library hero"}
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
        <p className="max-w-2xl text-sm text-white/80 md:text-base">{description}</p>
      </div>
    </section>
  );
}
