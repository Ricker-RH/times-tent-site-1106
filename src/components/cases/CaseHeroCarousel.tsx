"use client";

import { useState } from "react";
import Image from "next/image";

interface CaseHeroCarouselProps {
  slides: ReadonlyArray<string>;
  title: string;
  category: string;
  year?: string | number;
  location?: string;
  summary?: string;
}

export function CaseHeroCarousel({ slides, title, category, year, location, summary }: CaseHeroCarouselProps) {
  const validSlides = slides.filter(Boolean);
  const [index, setIndex] = useState(0);
  if (!validSlides.length) {
    return null;
  }

  const go = (delta: number) => {
    setIndex((prev) => {
      const next = (prev + delta + validSlides.length) % validSlides.length;
      return next;
    });
  };

  const showOverlay = index === 0;

  return (
    <section className="relative overflow-hidden">
      <div className="relative h-[420px] w-full sm:h-[520px]">
        <Image
          key={`${validSlides[index]}-${index}`}
          src={validSlides[index]}
          alt={title}
          fill
          priority
          className="object-cover transition-opacity duration-300"
        />
        {showOverlay ? <div className="absolute inset-0 bg-gradient-to-tr from-black/70 via-black/35 to-transparent" /> : null}
        {showOverlay ? (
          <div className="absolute inset-0 flex flex-col justify-end gap-4 px-4 py-10 text-white sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-center gap-3 text-xs text-white/80">
              {year ? <span>{year}</span> : null}
              {location ? <span>{location}</span> : null}
              <span className="rounded-full bg-white/20 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.3em]">
                {category}
              </span>
            </div>
            <h1 className="text-3xl font-semibold md:text-4xl">{title}</h1>
            {summary ? <p className="max-w-3xl text-sm text-white/85 md:text-base">{summary}</p> : null}
          </div>
        ) : null}
        {validSlides.length > 1 ? (
          <>
            <button
              type="button"
              aria-label="上一张"
              onClick={() => go(-1)}
              className="absolute left-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-[var(--color-brand-secondary)] shadow-lg transition hover:bg-white"
            >
              ‹
            </button>
            <button
              type="button"
              aria-label="下一张"
              onClick={() => go(1)}
              className="absolute right-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-[var(--color-brand-secondary)] shadow-lg transition hover:bg-white"
            >
              ›
            </button>
            <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2">
              {validSlides.map((slide, dotIndex) => (
                <button
                  key={`${slide}-${dotIndex}`}
                  type="button"
                  aria-label={`跳转到第 ${dotIndex + 1} 张`}
                  onClick={() => setIndex(dotIndex)}
                  className={`h-2.5 w-2.5 rounded-full transition ${
                    dotIndex === index ? "bg-[var(--color-brand-primary)]" : "bg-white/40 hover:bg-white/70"
                  }`}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}
