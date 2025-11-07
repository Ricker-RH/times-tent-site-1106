"use client";

import Image from "next/image";

import { t } from "@/data";
import type { AboutConfig } from "@/server/pageConfigs";

interface AboutTeamSectionProps {
  teamSection: AboutConfig["teamSection"];
}

export function AboutTeamSection({ teamSection }: AboutTeamSectionProps): JSX.Element {
  if (!teamSection) {
    return <></>;
  }

  return (
    <section className="bg-white py-14" id="about-team">
      <div className="mx-auto w-full max-w-[1200px] space-y-12 px-4 sm:px-6 lg:px-8">
        <div className="space-y-3 text-center md:text-left">
          <h2 className="text-2xl font-semibold text-[var(--color-brand-secondary)] md:text-3xl">
            {t(teamSection.title)}
          </h2>
          <p className="text-base leading-7 text-[var(--color-text-secondary)]">{t(teamSection.description)}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {(teamSection.composition ?? []).map((item, index) => (
            <div
              key={`composition-${index}-${item.value}`}
              className="rounded-[10px] bg-[var(--color-surface-muted)] px-6 py-6 text-left shadow-[0_18px_60px_rgba(15,23,42,0.08)]"
            >
              <p className="text-4xl font-semibold text-[var(--color-brand-secondary)]">{item.value}</p>
              <p className="mt-3 text-sm font-semibold text-[var(--color-brand-secondary)]">{t(item.label)}</p>
              <p className="mt-2 text-sm text-[var(--color-text-secondary)]">{t(item.description)}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {(teamSection.leadership ?? []).map((leader) => (
            <div
              key={leader.name}
              className="overflow-hidden rounded-[12px] bg-white shadow-[0_28px_80px_rgba(15,23,42,0.1)]"
            >
              <div className="relative h-64 w-full">
                <Image
                  src={leader.image}
                  alt={leader.name}
                  fill
                  sizes="(min-width: 1280px) 30vw, (min-width: 768px) 33vw, 100vw"
                  className="object-cover"
                />
              </div>
              <div className="space-y-2 px-6 py-6">
                <p className="text-sm font-semibold text-[var(--color-brand-secondary)]">{leader.name}</p>
                <p className="text-xs uppercase tracking-[0.25em] text-[var(--color-brand-primary)]">{t(leader.role)}</p>
                <p className="text-sm text-[var(--color-text-secondary)]">{t(leader.bio)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
