'use client';

import { useCallback, useState } from "react";
import Image from "next/image";

interface CaseGalleryProps {
  images: ReadonlyArray<string>;
  title: string;
}

export function CaseGallery({ images, title }: CaseGalleryProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const handleOpen = useCallback((index: number) => {
    setActiveIndex(index);
  }, []);

  const handleClose = useCallback(() => {
    setActiveIndex(null);
  }, []);

  if (!images?.length) {
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
              点击查看大图
            </span>
          </button>
        ))}
      </div>

      {activeIndex !== null ? (
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
            aria-label="关闭大图"
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
                src={images[activeIndex]}
                alt={`${title} 图 ${activeIndex + 1}`}
                fill
                sizes="(min-width: 1280px) 60vw, 100vw"
                className="object-contain"
                priority
              />
            </div>
            <p className="text-center text-sm text-white/80">
              {title} · 图 {activeIndex + 1}/{images.length}
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}
