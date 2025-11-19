"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";

import { t } from "@/data";
import type { AboutConfig } from "@/server/pageConfigs";

import styles from "./AboutHonorsSection.module.css";

interface AboutHonorsSectionProps {
  honorsSection: AboutConfig["honorsSection"];
}

export function AboutHonorsSection({ honorsSection }: AboutHonorsSectionProps): JSX.Element {
  if (!honorsSection) {
    return <></>;
  }
  const tracks = [honorsSection.certificates ?? [], honorsSection.patents ?? []];

  return (
    <section className="bg-[var(--color-surface-muted)] py-14" id="about-honors">
      <div className="mx-auto w-full max-w-[1200px] space-y-12 px-4 sm:px-6 lg:px-8">
        <div className="space-y-5 text-center md:text-left">
          <h2 className="text-2xl font-semibold text-[var(--color-brand-secondary)] md:text-3xl">
            {t(honorsSection.title)}
          </h2>
          <p className="text-base leading-7 text-[var(--color-text-secondary)]">
            {t(honorsSection.description)}
          </p>
        </div>

        <div className="space-y-8">
          {tracks.map((items, trackIndex) => (
            <div key={trackIndex} className={styles.scroller}>
              <div className={styles.track}>
                {items.map((item, idx) => {
                  const itemName = t(item?.name);
                  return (
                    <figure
                      key={`honor-${trackIndex}-a-${idx}`}
                      className="flex flex-col items-center gap-2 text-center text-sm text-[var(--color-text-secondary)]"
                    >
                      <Image
                        src={item?.image ?? "https://images.unsplash.com/photo-1503602642458-232111445657?auto=format&w=1600&q=80"}
                        alt={itemName || "荣誉"}
                        width={220}
                        height={150}
                        loading="eager"
                        priority={idx < items.length}
                        className={styles.itemImage}
                      />
                      <figcaption className="max-w-[220px] font-medium text-[var(--color-brand-secondary)]">
                        {itemName}
                      </figcaption>
                    </figure>
                  );
                })}
              </div>
              <div className={styles.trackClone} aria-hidden>
                {items.map((item, idx) => {
                  const itemName = t(item?.name);
                  return (
                    <figure
                      key={`honor-${trackIndex}-b-${idx}`}
                      className="flex flex-col items-center gap-2 text-center text-sm text-[var(--color-text-secondary)]"
                    >
                      <Image
                        src={item?.image ?? "https://images.unsplash.com/photo-1503602642458-232111445657?auto=format&w=1600&q=80"}
                        alt={itemName || "荣誉"}
                        width={220}
                        height={150}
                        loading="eager"
                        className={styles.itemImage}
                      />
                      <figcaption className="max-w-[220px] font-medium text-[var(--color-brand-secondary)]">
                        {itemName}
                      </figcaption>
                    </figure>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
