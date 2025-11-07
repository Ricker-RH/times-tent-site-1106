"use client";

import Image from "next/image";

import { t } from "@/data";
import type { AboutConfig } from "@/server/pageConfigs";

interface AboutFactorySectionProps {
  manufacturingSection: AboutConfig["manufacturingSection"];
}

export function AboutFactorySection({ manufacturingSection }: AboutFactorySectionProps): JSX.Element {
  if (!manufacturingSection) {
    return <></>;
  }

  const galleryItems = manufacturingSection.gallery ?? [];
  const bulletPoints = manufacturingSection.bulletPoints ?? [];

  return (
    <section className="bg-[var(--color-surface-muted)] py-16" id="about-factory">
      <div className="mx-auto w-full max-w-[1200px] space-y-9 px-4 sm:px-6 lg:px-8">
        <div className="space-y-2 text-center md:text-left">
          <h2 className="text-2xl font-semibold text-[var(--color-brand-secondary)] md:text-3xl">
            {t(manufacturingSection.title)}
          </h2>
          <p className="text-base leading-7 text-[var(--color-text-secondary)]">
            {t(manufacturingSection.description)}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          {galleryItems.slice(0, 6).map((item, index) => (
            <div key={`${item.image}-${index}`} className="overflow-hidden rounded-md">
              <Image
                src={item.image}
                alt={t(item.label)}
                width={1200}
                height={800}
                className="h-full w-full object-cover"
              />
            </div>
          ))}
        </div>

        <article className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white p-6 text-[var(--color-text-secondary)] shadow-[0_18px_45px_rgba(15,23,42,0.12)] md:p-8">
          <div className="grid gap-6 md:grid-cols-3">
            {bulletPoints.map((point, index) => (
              <div
                key={`${t(point)}-${index}`}
                className={`relative space-y-3 ${index > 0 ? "md:border-l md:border-dashed md:border-[var(--color-border)] md:pl-6" : ""}`}
              >
                <h3 className="text-sm font-semibold text-[var(--color-brand-secondary)]">{t(point)}</h3>
              </div>
            ))}
          </div>
        </article>

      </div>
    </section>
  );
}
