"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import { DEFAULT_LOCALE, LocaleKey, t as translateData } from "@/data";
import { useI18n } from "@/i18n/useI18n";
import { translateUi } from "@/i18n/dictionary";

const BODY_IMAGE_FALLBACK = "https://images.unsplash.com/photo-1509223197845-458d87318791?auto=format&w=1600&q=80";

const NEWS_CATEGORY_KEYS = {
  events: "news.category.events",
  hospitality: "news.category.hospitality",
  product: "news.category.product",
  industry: "news.category.industry",
  company: "news.category.company",
} as const;

type NewsCategoryKeyMap = typeof NEWS_CATEGORY_KEYS;
type NewsCategorySlug = keyof NewsCategoryKeyMap;

const getCategoryKey = (category: unknown) => {
  if (typeof category !== "string") {
    return null;
  }
  if ((category as NewsCategorySlug) in NEWS_CATEGORY_KEYS) {
    return NEWS_CATEGORY_KEYS[category as NewsCategorySlug];
  }
  return null;
};

interface NewsDetailClientProps {
  article: any;
  moreArticles: any[];
  hiddenSections?: Record<string, boolean>;
}

export function NewsDetailClient({ article, moreArticles, hiddenSections }: NewsDetailClientProps) {
  const { locale, t: tUi } = useI18n();
  const activeLocale = locale as LocaleKey;
  const heroImage = article.image ?? "https://images.unsplash.com/photo-1542626991-cbc4e32524cc?auto=format&w=2000&q=80";
  const excerpt = translateData(article.excerpt, activeLocale);
  const body = translateData(article.body, activeLocale) || translateData(article.body, DEFAULT_LOCALE);
  const formattedDate = formatDate(article.date, activeLocale);
  const tags = article.tags ?? [];
  const hideHero = hiddenSections?.hero === true;
  const hideBody = hiddenSections?.body === true;
  const hideMore = hiddenSections?.more === true;
  const hideMeta = hiddenSections?.meta === true;

  const categoryLabel = useMemo(() => {
    const key = getCategoryKey(article.category);
    if (!key) {
      return article.category ?? "";
    }
    return translateUi(activeLocale, key, article.category);
  }, [article.category, activeLocale]);

  const moreItems = useMemo(() => {
    return moreArticles.map((item) => ({
      slug: item.slug,
      title: translateData(item.title, activeLocale),
      excerpt: translateData(item.excerpt, activeLocale),
      date: item.date,
      category: (() => {
        const key = getCategoryKey(item.category);
        return key ? translateUi(activeLocale, key, item.category) : item.category;
      })(),
      image: item.image ?? BODY_IMAGE_FALLBACK,
    }));
  }, [activeLocale, moreArticles]);

  return (
    <div className="bg-[#f6f8fb] text-[var(--color-text-secondary)]">
      {!hideHero ? (
        <section className="relative isolate overflow-hidden bg-black text-white">
          <Image
            src={heroImage}
            alt={translateData(article.title, activeLocale)}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/85 via-black/65 to-black/30" />

          <div className="relative mx-auto flex min-h-[460px] w-full max-w-5xl flex-col justify-end gap-6 px-4 pb-16 pt-24 sm:px-6 md:pb-24 lg:px-8">
            <nav aria-label={tUi("breadcrumb.more") ?? undefined} className="flex items-center gap-2 text-xs text-white/70">
              <Link href="/" className="transition hover:text-white">
                {tUi("breadcrumb.home")}
              </Link>
              <span>·</span>
              <Link href="/news" className="transition hover:text-white">
                {tUi("breadcrumb.news")}
              </Link>
            </nav>

            <div className="space-y-5">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-white/90">
                {categoryLabel}
              </span>
              <h1 className="max-w-3xl text-3xl font-semibold leading-tight text-white md:text-4xl lg:text-5xl">
                {translateData(article.title, activeLocale)}
              </h1>
              {excerpt ? <p className="max-w-2xl text-sm leading-relaxed text-white/80 md:text-base">{excerpt}</p> : null}
              <div className="flex flex-wrap items-center gap-3 text-xs text-white/70">
                <span>{formattedDate}</span>
                {tags.length ? <span>·</span> : null}
                {tags.map((tag: any) => (
                  <span
                    key={tag.en ?? tag["zh-CN"]}
                    className="inline-flex items-center rounded-full border border-white/40 px-3 py-1 text-white/90"
                  >
                    {translateData(tag, activeLocale)}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section className="relative z-10 mx-auto w-full max-w-5xl px-4 pb-12 sm:px-6 lg:px-8">
        {!hideBody ? (
          <div className="mt-12 space-y-8 text-[16px] leading-8 text-[var(--color-text-secondary)] sm:mt-16">
            {renderMarkdown(body, activeLocale, heroImage)}
          </div>
        ) : null}

        {!hideMore && moreItems.length > 0 ? (
          <div className="mt-14 border-t border-[var(--color-border)] pt-10">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div className="space-y-1">
                <h2 className="text-xl font-semibold text-[var(--color-brand-secondary)] md:text-2xl">{tUi("news.moreToRead.heading")}</h2>
                <p className="max-w-2xl text-sm text-[var(--color-text-secondary)]">{tUi("news.moreToRead.description")}</p>
              </div>
              <Link
                href="/news"
                className="text-xs uppercase tracking-[0.3em] text-[var(--color-brand-primary)] transition hover:text-[var(--color-brand-secondary)]"
              >
                {tUi("news.moreToRead.viewAll")}
              </Link>
            </div>

            <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {moreItems.map((item) => (
                <article
                  key={item.slug}
                  className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white/70 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="relative h-40 overflow-hidden">
                    <Image
                      src={item.image}
                      alt={item.title}
                      fill
                      sizes="(min-width: 1280px) 26vw, (min-width: 768px) 42vw, 100vw"
                      className="object-cover transition duration-500 group-hover:scale-105"
                    />
                  </div>
                  <div className="flex flex-1 flex-col gap-3 p-5">
                    <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.25em] text-[var(--color-text-tertiary,#8690a3)]">
                      <span>{formatDate(item.date, activeLocale)}</span>
                      <span>·</span>
                      <span className="text-[var(--color-brand-primary)]">{item.category}</span>
                    </div>
                    <h3 className="text-base font-semibold text-[var(--color-brand-secondary)] group-hover:text-[var(--color-brand-primary)]">{item.title}</h3>
                    {item.excerpt ? <p className="text-sm text-[var(--color-text-secondary)]">{item.excerpt}</p> : null}
                    <Link
                      href={`/news/${item.slug}`}
                      className="mt-auto inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-brand-primary)] transition hover:text-[var(--color-brand-secondary)]"
                    >
                      {tUi("news.readMore")}
                      <span aria-hidden>→</span>
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </div>
        ) : null}

        {!hideMeta ? (
          <div className="mt-12 text-sm text-[var(--color-text-tertiary,#8690a3)]">
            {tUi("news.publishedOn")} {formattedDate}
          </div>
        ) : null}
      </section>
    </div>
  );
}
function formatDate(value: string | undefined, locale: LocaleKey) {
  if (!value) return "";
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) {
    return value;
  }
  const formatter = new Intl.DateTimeFormat(locale === "zh-TW" ? "zh-TW" : locale === "en" ? "en-US" : "zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  return formatter.format(timestamp);
}

function renderMarkdown(markdown: string, locale: LocaleKey, fallbackImage?: string) {
  const lines = markdown.split(/\r?\n/);
  const elements: JSX.Element[] = [];
  let listBuffer: string[] = [];

  const flushList = () => {
    if (listBuffer.length === 0) return;
    elements.push(
      <ul key={`list-${elements.length}`} className="list-disc space-y-2 pl-5">
        {listBuffer.map((item, index) => (
          <li key={index}>{formatInline(item)}</li>
        ))}
      </ul>,
    );
    listBuffer = [];
  };

  lines.forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line) {
      flushList();
      return;
    }
    if (line.startsWith("## ")) {
      flushList();
      elements.push(
        <h2
          key={`h2-${elements.length}`}
          className="border-l-4 border-[var(--color-brand-primary)] pl-3 text-xl font-semibold text-[var(--color-brand-secondary)]"
        >
          {formatInline(line.replace(/^##\s+/, ""))}
        </h2>,
      );
      return;
    }
    if (line.startsWith("- ")) {
      listBuffer.push(line.replace(/^-\s+/, ""));
      return;
    }

    if (line.startsWith("!")) {
      const altEnd = line.indexOf("](");
      const closeParen = line.lastIndexOf(")");
      if (altEnd !== -1 && closeParen !== -1 && closeParen > altEnd + 2) {
        flushList();
        const altText = line.slice(2, altEnd);
        const linkContent = line.slice(altEnd + 2, closeParen).trim();
        let src = linkContent;
        let caption = "";
        const firstQuote = linkContent.indexOf('"');
        const lastQuote = linkContent.lastIndexOf('"');
        if (firstQuote !== -1 && lastQuote > firstQuote) {
          src = linkContent.slice(0, firstQuote).trim();
          caption = linkContent.slice(firstQuote + 1, lastQuote).trim();
        }
        const safeSrc = src || fallbackImage || BODY_IMAGE_FALLBACK;
        elements.push(
          <figure key={`img-${elements.length}`} className="space-y-3">
            <div className="relative aspect-[16/9] w-full overflow-hidden rounded-3xl bg-black/5">
              <Image
                src={safeSrc}
                alt={altText || caption || translateUi(locale, "news.hero.return", "Article image")}
                fill
                sizes="(min-width: 1280px) 60vw, (min-width: 768px) 70vw, 100vw"
                className="object-cover"
              />
            </div>
            {(caption || altText) && (
              <figcaption className="text-sm text-[var(--color-text-tertiary,#8690a3)]">
                {caption || altText}
              </figcaption>
            )}
          </figure>,
        );
        return;
      }
    }

    flushList();
    elements.push(
      <p key={`p-${elements.length}`}>{formatInline(line)}</p>,
    );
  });

  flushList();
  return elements;
}

function formatInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="text-[var(--color-brand-secondary)]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={index}>{part}</span>;
  });
}
