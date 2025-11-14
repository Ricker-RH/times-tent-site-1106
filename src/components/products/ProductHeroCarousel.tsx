"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";

export interface ProductHeroCarouselSlide {
  src: string;
  alt: string;
}

interface ProductHeroCarouselProps {
  slides: ProductHeroCarouselSlide[];
  title: string;
  description?: string | null;
  eyebrow?: string | null;
  badge?: string | null;
  overlayEnabled?: boolean;
}

export function ProductHeroCarousel({ slides, title, description, eyebrow, badge, overlayEnabled = true }: ProductHeroCarouselProps) {
  const validSlides = useMemo(() => {
    const unique = new Map<string, ProductHeroCarouselSlide>();
    slides.forEach((slide) => {
      if (!slide?.src) return;
      const key = `${slide.src}|${slide.alt ?? ""}`;
      if (!unique.has(key)) {
        unique.set(key, {
          src: slide.src,
          alt: slide.alt || title,
        });
      }
    });
    return Array.from(unique.values());
  }, [slides, title]);

  const [index, setIndex] = useState(0);
  const [autoplay, setAutoplay] = useState(true);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const go = useCallback(
    (delta: number) => {
      setIndex((prev) => {
        if (!validSlides.length) return 0;
        return (prev + delta + validSlides.length) % validSlides.length;
      });
    },
    [validSlides.length],
  );

  useEffect(() => {
    if (!autoplay || isLightboxOpen || validSlides.length < 2) {
      return;
    }
    const timer = setInterval(() => go(1), 5000);
    return () => clearInterval(timer);
  }, [autoplay, isLightboxOpen, validSlides.length, go]);

  useEffect(() => {
    if (index >= validSlides.length) {
      setIndex(0);
    }
  }, [index, validSlides.length]);

  if (!validSlides.length) {
    return null;
  }

  const active = validSlides[index];

  const hasBadge = Boolean(badge?.trim());
  const hasEyebrow = Boolean(eyebrow?.trim());
  const hasTitle = Boolean(title?.trim());
  const hasDescription = Boolean(description?.trim());
  const showTextContent = index === 0 && (hasBadge || hasEyebrow || hasTitle || hasDescription);
  const showOverlayLayer = overlayEnabled !== false && showTextContent;

  return (
    <section className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]">
      <div
        className="relative aspect-[16/9] w-full"
        onMouseEnter={() => setAutoplay(false)}
        onMouseLeave={() => setAutoplay(true)}
      >
        <Image
          key={`${active.src}-${index}`}
          src={active.src}
          alt={active.alt}
          fill
          priority
          className="object-cover"
          sizes="(min-width: 1280px) 1200px, 100vw"
        />
        {showOverlayLayer ? (
          <>
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
            <div className="absolute inset-0 flex flex-col justify-end gap-3 px-5 py-8 text-white sm:px-8">
              <div className="flex flex-wrap items-center gap-3 text-xs text-white/80">
                {hasBadge ? (
                  <span className="rounded-full bg-white/20 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.3em]">
                    {badge}
                  </span>
                ) : null}
                {hasEyebrow ? (
                  <span className="rounded-full bg-white/15 px-3 py-1 text-[0.7rem] font-semibold">{eyebrow}</span>
                ) : null}
              </div>
              {hasTitle ? <h1 className="text-3xl font-semibold leading-tight md:text-4xl">{title}</h1> : null}
              {hasDescription ? (
                <p className="max-w-3xl text-sm text-white/85 md:text-base">{description}</p>
              ) : null}
            </div>
          </>
        ) : null}
        {!showOverlayLayer && showTextContent ? (
          <div className="absolute inset-0 flex flex-col justify-end gap-3 px-5 py-8 text-white sm:px-8">
            <div className="flex flex-wrap items-center gap-3 text-xs text-white/80">
              {hasBadge ? (
                <span className="rounded-full bg-black/40 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.3em]">
                  {badge}
                </span>
              ) : null}
              {hasEyebrow ? (
                <span className="rounded-full bg-black/35 px-3 py-1 text-[0.7rem] font-semibold">{eyebrow}</span>
              ) : null}
            </div>
            {hasTitle ? <h1 className="text-3xl font-semibold leading-tight md:text-4xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)]">{title}</h1> : null}
            {hasDescription ? (
              <p className="max-w-3xl text-sm text-white/90 md:text-base drop-shadow-[0_1px_4px_rgba(0,0,0,0.45)]">{description}</p>
            ) : null}
          </div>
        ) : null}
        {validSlides.length > 1 ? (
          <>
            <button
              type="button"
              aria-label="上一张"
              onClick={() => go(-1)}
              className="absolute left-4 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/30 text-white shadow-lg transition hover:bg-black/50 sm:flex"
            >
              ‹
            </button>
            <button
              type="button"
              aria-label="下一张"
              onClick={() => go(1)}
              className="absolute right-4 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/30 text-white shadow-lg transition hover:bg-black/50 sm:flex"
            >
              ›
            </button>
          </>
        ) : null}
        <button
          type="button"
          onClick={() => setIsLightboxOpen(true)}
          className="absolute right-4 top-4 rounded-full bg-black/60 px-4 py-2 text-xs font-semibold text-white shadow-lg transition hover:bg-black/80"
        >
          查看大图
        </button>
        {validSlides.length > 1 ? (
          <div className="absolute bottom-4 left-1/2 hidden -translate-x-1/2 items-center gap-2 sm:flex">
            {validSlides.map((slide, dotIndex) => (
              <button
                key={`${slide.src}-${dotIndex}`}
                type="button"
                aria-label={`跳转到第 ${dotIndex + 1} 张`}
                onClick={() => setIndex(dotIndex)}
                className={`h-2.5 w-2.5 rounded-full border border-white/60 transition ${
                  dotIndex === index ? "bg-white" : "bg-transparent"
                }`}
              />
            ))}
          </div>
        ) : null}
      </div>

      {isLightboxOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setIsLightboxOpen(false)}
        >
          <div className="relative h-[85vh] w-full max-w-6xl" onClick={(event) => event.stopPropagation()}>
            <Image src={active.src} alt={active.alt} fill className="object-contain" sizes="100vw" />
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
