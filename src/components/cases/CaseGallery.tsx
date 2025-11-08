'use client';

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";

interface CaseGalleryProps {
  images: ReadonlyArray<string>;
  title: string;
  hintLabel?: string;
  nextLabel?: string;
  prevLabel?: string;
  closeLabel?: string;
  counterPattern?: string;
}

export function CaseGallery({
  images,
  title,
  hintLabel,
  nextLabel,
  prevLabel,
  closeLabel,
  counterPattern,
}: CaseGalleryProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const total = Array.isArray(images) ? images.length : 0;
  const hasImages = total > 0;
  const hasMultiple = total > 1;
  const safeHintLabel = hintLabel?.trim() || "点击查看大图";
  const safeNextLabel = nextLabel?.trim() || "下一张";
  const safePrevLabel = prevLabel?.trim() || "上一张";
  const safeCloseLabel = closeLabel?.trim() || "关闭";

  const handleOpen = useCallback((index: number) => {
    setActiveIndex(index);
  }, []);

  const handleClose = useCallback(() => {
    setActiveIndex(null);
  }, []);

  const handleNext = useCallback(() => {
    setActiveIndex((prev) => {
      if (prev === null) return 0;
      return (prev + 1) % total;
    });
  }, [total]);

  const handlePrev = useCallback(() => {
    setActiveIndex((prev) => {
      if (prev === null) return total - 1;
      return (prev - 1 + total) % total;
    });
  }, [total]);

  useEffect(() => {
    if (activeIndex === null) return;
    const listener = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") {
        event.preventDefault();
        handleNext();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        handlePrev();
      } else if (event.key === "Escape") {
        event.preventDefault();
        handleClose();
      }
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [activeIndex, handleClose, handleNext, handlePrev]);

  const activeImage = activeIndex !== null && hasImages ? images[activeIndex] : null;

  const counterText = useMemo(() => {
    if (activeIndex === null) return "";
    const pattern = counterPattern?.trim() || "图 {{current}} / {{total}}";
    return pattern
      .replace(/{{\s*current\s*}}/gi, String(activeIndex + 1))
      .replace(/{{\s*total\s*}}/gi, String(total));
  }, [activeIndex, counterPattern, total]);

  if (!hasImages) {
    return null;
  }

  return (
    <>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {images.map((src, index) => (
          <button
            type="button"
            key={`${src}-${index}`}
            className="group relative aspect-[16/9] overflow-hidden rounded-lg border border-black/5 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            onClick={() => handleOpen(index)}
            aria-label={`查看大图：${title} 图 ${index + 1}`}
          >
            <Image
              src={src}
              alt={`${title} 图 ${index + 1}`}
              fill
              className="object-cover transition duration-500 group-hover:scale-105"
              sizes="(min-width: 1280px) 30vw, (min-width: 768px) 45vw, 100vw"
            />
            <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-black/5 to-transparent opacity-0 transition group-hover:opacity-100" />
            <span className="pointer-events-none absolute inset-x-0 bottom-3 mx-auto w-fit rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white opacity-0 transition group-hover:opacity-100">
              {safeHintLabel}
            </span>
          </button>
        ))}
      </div>

      {activeIndex !== null && activeImage ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 px-4 py-10"
          role="dialog"
          aria-modal="true"
          aria-label={`${title} 图 ${activeIndex + 1}`}
          onClick={handleClose}
        >
          <button
            type="button"
            onClick={handleClose}
            className="absolute right-6 top-6 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/85 text-[var(--color-brand-secondary)] shadow-lg transition hover:bg-white"
            aria-label={safeCloseLabel}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
              <path d="M6.225 4.811 4.81 6.225 10.586 12l-5.775 5.775 1.414 1.414L12 13.414l5.775 5.775 1.414-1.414L13.414 12l5.775-5.775-1.414-1.414L12 10.586 6.225 4.811Z" />
            </svg>
          </button>

          <div
            className="w-full max-w-5xl space-y-4"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl bg-black shadow-2xl">
              <Image
                src={activeImage}
                alt={`${title} 图 ${activeIndex + 1}`}
                fill
                sizes="(min-width: 1280px) 60vw, 100vw"
                className="object-contain"
              />
              {hasMultiple ? (
                <>
                  <button
                    type="button"
                    className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-3 text-white transition hover:bg-black/80"
                    onClick={(event) => {
                      event.stopPropagation();
                      handlePrev();
                    }}
                    aria-label={safePrevLabel}
                  >
                    <ArrowIcon direction="left" />
                  </button>
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-3 text-white transition hover:bg-black/80"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleNext();
                    }}
                    aria-label={safeNextLabel}
                  >
                    <ArrowIcon direction="right" />
                  </button>
                </>
              ) : null}
            </div>
            <p className="text-center text-sm text-white/85">
              {title} · {counterText}
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}

function ArrowIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
    >
      {direction === "left" ? <path d="m15 6-6 6 6 6" /> : <path d="m9 6 6 6-6 6" />}
    </svg>
  );
}
