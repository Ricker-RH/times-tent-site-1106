"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";

interface CaseHeroCarouselProps {
  slides: ReadonlyArray<string>;
  title: string;
  year?: string | number;
  location?: string;
  summary?: string;
  overlayEnabled?: boolean;
}

export function CaseHeroCarousel({ slides, title, year, location, summary, overlayEnabled = true }: CaseHeroCarouselProps) {
  const validSlides = useMemo(() => slides.filter(Boolean), [slides]);
  const [index, setIndex] = useState(0);
  const [autoplay, setAutoplay] = useState(true);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const go = useCallback((delta: number) => {
    setIndex((prev) => {
      const next = (prev + delta + validSlides.length) % validSlides.length;
      return next;
    });
  }, [validSlides.length]);

  useEffect(() => {
    if (validSlides.length <= 1 || !autoplay || isLightboxOpen) return;
    const timer = setInterval(() => {
      go(1);
    }, 5000);
    return () => clearInterval(timer);
  }, [validSlides.length, autoplay, isLightboxOpen, go]);

  if (!validSlides.length) {
    return null;
  }

  const showText = index === 0;
  const showOverlay = showText && overlayEnabled;

  return (
    <section className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]">
      <div
        className="relative aspect-[16/9] w-full"
        onMouseEnter={() => setAutoplay(false)}
        onMouseLeave={() => setAutoplay(true)}
      >
        <Image
          key={`${validSlides[index]}-${index}`}
          src={validSlides[index]}
          alt={title}
          fill
          priority
          className="object-cover transition-opacity duration-300"
        />
        {showOverlay ? <div className="absolute inset-0 bg-gradient-to-tr from-black/70 via-black/35 to-transparent" /> : null}
        {showText ? (
          <div className="absolute inset-0 flex flex-col justify-end gap-4 px-4 py-10 text-white sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-center gap-3 text-xs text-white/80">
              {year ? (
                <span className={overlayEnabled ? "" : "rounded-full bg-black/40 px-3 py-1 backdrop-blur"}>{year}</span>
              ) : null}
              {location ? (
                <span className={overlayEnabled ? "" : "rounded-full bg-black/40 px-3 py-1 backdrop-blur"}>{location}</span>
              ) : null}
            </div>
              <div className="space-y-2">
                <h1
                  className={`text-3xl font-semibold md:text-4xl ${
                    overlayEnabled ? "" : "drop-shadow-[0_6px_24px_rgba(0,0,0,0.6)]"
                  }`}
                >
                  {title}
                </h1>
                {summary ? (
                  <p
                    className={`max-w-3xl text-sm md:text-base ${
                      overlayEnabled ? "text-white/85" : "text-white drop-shadow-[0_4px_18px_rgba(0,0,0,0.65)]"
                    }`}
                  >
                    {summary}
                  </p>
                ) : null}
              </div>
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
        <button
          type="button"
          onClick={() => setIsLightboxOpen(true)}
          className="absolute right-4 top-4 rounded-full bg-black/60 px-4 py-2 text-xs font-semibold text-white shadow-lg transition hover:bg-black/80"
        >
          查看大图
        </button>
      </div>
      {isLightboxOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setIsLightboxOpen(false)}
        >
          <div className="relative h-[80vh] w-full max-w-5xl" onClick={(event) => event.stopPropagation()}>
            <Image src={validSlides[index]} alt={title} fill className="object-contain" sizes="100vw" />
            <button
              type="button"
              onClick={() => setIsLightboxOpen(false)}
              className="absolute right-4 top-4 rounded-full bg-black/70 px-4 py-2 text-sm font-semibold text-white hover:bg-black"
            >
              关闭
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
