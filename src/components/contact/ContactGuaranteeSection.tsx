"use client";

import { t } from "@/data";
import type { ContactConfig } from "@/server/pageConfigs";

import { ContactIcon, type IconName } from "./icons";

interface ContactGuaranteeSectionProps {
  section: NonNullable<ContactConfig["guaranteeSection"]>;
}

export function ContactGuaranteeSection({ section }: ContactGuaranteeSectionProps): JSX.Element {
  const { sectionHeading, guarantees } = section;
  const headingTitle = t(sectionHeading.title).trim();
  const headingDesc = t(sectionHeading.description).trim();

  return (
    <section className="bg-white py-16">
      <div className="mx-auto w-full max-w-[1200px] space-y-8 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 text-left md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl space-y-2">
            {headingTitle ? (
              <h2 className="text-2xl font-bold text-[var(--color-brand-secondary)] md:text-3xl">{headingTitle}</h2>
            ) : null}
            {headingDesc ? (
              <p className="text-base text-[var(--color-text-secondary)]">{headingDesc}</p>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {(guarantees ?? []).map((item) => (
            <div
              key={t(item.title)}
              className="flex items-start gap-3 rounded-md bg-[var(--color-surface-muted)] p-5 shadow-sm"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[var(--color-brand-primary)] shadow">
                <ContactIcon name={(item.icon as IconName) ?? "service"} />
              </span>
              <span className="space-y-1 text-sm text-[var(--color-text-secondary)]">
                <strong className="block text-[var(--color-brand-secondary)]">{t(item.title)}</strong>
                <span className="block">{t(item.description)}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
