"use client";

import Image from "next/image";

import { t } from "@/data";
import type { ContactConfig } from "@/server/pageConfigs";

import { ContactIcon, type IconName } from "./icons";

interface ContactChannelsSectionProps {
  section: NonNullable<ContactConfig["contactSection"]>;
}

export function ContactChannelsSection({ section }: ContactChannelsSectionProps): JSX.Element {
  const { sectionHeading, cards, spotlight } = section;

  const headingTitle = t(sectionHeading.title).trim();
  const headingDesc = t(sectionHeading.description).trim();

  return (
    <section className="bg-white pt-8 pb-12">
      <div className="mx-auto grid w-full max-w-[1200px] gap-8 px-4 sm:px-6 md:grid-cols-[1.15fr,0.85fr] lg:items-stretch lg:px-8">
        <div className="flex h-full flex-col gap-6">
          <div className="flex flex-col gap-3 text-left md:flex-row md:items-end md:justify-between">
            <div className="max-w-3xl space-y-2">
              {headingTitle ? (
                <h2 className="text-2xl font-bold text-[var(--color-brand-secondary)] md:text-3xl">{headingTitle}</h2>
              ) : null}
              {headingDesc ? (
                <p className="text-base leading-7 text-[var(--color-text-secondary)] [text-align:justify]">{headingDesc}</p>
              ) : null}
            </div>
          </div>

          <div className="flex-1 grid content-start gap-4 sm:grid-cols-2">
            {cards.map((card) => (
              <a
                key={card.href}
                href={card.href}
                className="flex items-start gap-3 rounded-md bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-brand-primary)]/12 text-[var(--color-brand-primary)]">
                  <ContactIcon name={(card.icon as IconName) ?? "phone"} size="lg" />
                </span>
                <span className="space-y-1 text-sm text-[var(--color-text-secondary)]">
                  <strong className="block text-[var(--color-brand-secondary)]">{t(card.title)}</strong>
                  <span className="block text-base font-semibold text-[var(--color-brand-secondary)]">
                    {t(card.value)}
                  </span>
                  <span className="block text-xs leading-5 text-[var(--color-text-secondary)]">{t(card.helper)}</span>
                </span>
              </a>
            ))}
          </div>
        </div>

        {spotlight ? (
          <div className="relative h-full min-h-[320px] overflow-hidden rounded-lg shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
            <Image
              src={spotlight.image}
              alt={t(spotlight.title)}
              fill
              sizes="(min-width: 1200px) 40vw, 100vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/15 to-transparent" />
            <div className="absolute bottom-6 left-6 space-y-1 text-white">
              {t(spotlight.eyebrow)?.trim() ? (
                <p className="text-xs uppercase tracking-[0.35em] text-white/70">{t(spotlight.eyebrow)}</p>
              ) : null}
              {t(spotlight.title)?.trim() ? (
                <p className="text-lg font-semibold">{t(spotlight.title)}</p>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
