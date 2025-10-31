import type { JSX } from "react";

import { getPrivacyPolicyConfig } from "@/server/pageConfigs";
import { t } from "@/data";

export const metadata = {
  title: "隐私政策 | 时代篷房",
  description: "了解时代篷房如何收集、使用与保护您的个人信息。",
};

export default async function PrivacyPage(): Promise<JSX.Element> {
  const config = await getPrivacyPolicyConfig();
  const intro = config.intro ?? {};
  const sections = config.sections ?? [];
  const contact = config.contact ?? {};
  const resolveText = (value: unknown, fallback = ""): string => {
    if (!value) return fallback;
    if (typeof value === "string") return value;
    if (typeof value === "object") {
      const result = t(value as Record<string, string | undefined>);
      return result || fallback;
    }
    return fallback;
  };
  const title = resolveText(config.title, "时代篷房隐私政策");
  const introBody = resolveText(intro.body);

  return (
    <main className="flex-1 bg-white">
      <article className="mx-auto w-full max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <header className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-text-tertiary,#8690a3)]">
            隐私政策
          </p>
          <h1 className="text-3xl font-semibold text-[var(--color-brand-secondary)] sm:text-4xl">
            {title}
          </h1>
          {intro.lastUpdated ? (
            <p className="text-sm text-[var(--color-text-secondary)]">生效日期：{intro.lastUpdated}</p>
          ) : null}
          {introBody ? (
            <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">{introBody}</p>
          ) : null}
        </header>

        {sections.map((section) => (
          <section key={section.id ?? section.heading} className="mt-12 space-y-6">
            {section.heading ? (
              <h2 className="text-2xl font-semibold text-[var(--color-brand-secondary)]">{resolveText(section.heading)}</h2>
            ) : null}
            {section.paragraphs?.map((paragraph, index) => (
              <p key={`p-${index}`} className="text-sm leading-relaxed text-[var(--color-text-secondary)]">
                {paragraph}
              </p>
            ))}
            {section.items && section.items.length ? (
              <ul className="list-disc space-y-3 pl-6 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                {section.items.map((item, index) => (
                  <li key={`item-${index}`}>
                    {item.title ? (
                      <>
                        <span className="font-semibold text-[var(--color-brand-secondary)]">{resolveText(item.title)}：</span>
                        {item.body}
                      </>
                    ) : (
                      item.body
                    )}
                  </li>
                ))}
              </ul>
            ) : null}
            {section.paragraphsAfter?.map((paragraph, index) => (
              <p key={`after-${index}`} className="text-sm leading-relaxed text-[var(--color-text-secondary)]">
                {paragraph}
              </p>
            ))}
          </section>
        ))}

        <section className="mt-12 space-y-6">
          <h2 className="text-2xl font-semibold text-[var(--color-brand-secondary)]">
            {resolveText(contact.heading, "联系我们")}
          </h2>
          {resolveText(contact.paragraph) ? (
            <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">{resolveText(contact.paragraph)}</p>
          ) : null}
          <ul className="space-y-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
            {contact.company ? <li>公司名称：{contact.company}</li> : null}
            {contact.email ? (
              <li>
                邮箱：
                <a className="text-[var(--color-brand-primary)]" href={`mailto:${contact.email}`}>
                  {contact.email}
                </a>
              </li>
            ) : null}
            {contact.phone ? (
              <li>
                电话：
                <a className="text-[var(--color-brand-primary)]" href={`tel:${contact.phone.replace(/\s+/g, "")}`}>
                  {contact.phone}
                </a>
              </li>
            ) : null}
            {contact.address ? <li>地址：{contact.address}</li> : null}
          </ul>
        </section>
      </article>
    </main>
  );
}
