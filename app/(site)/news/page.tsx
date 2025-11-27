import Image from "next/image";
import Link from "next/link";
import { ensurePageVisible, getHiddenSections } from "@/server/visibility";

import { t, getCurrentLocale, setCurrentLocale } from "@/data";
import { getNewsConfig } from "@/server/pageConfigs";
import type { LocalizedField, LocaleKey } from "@/i18n/locales";
import { getRequestLocale } from "@/server/locale";

// 使用统一的文本解析工具，支持字符串与多语言对象
type LocalizedOrString = string | LocalizedField | Record<string, string | undefined>;
function resolveText(value: LocalizedOrString | undefined, fallback = ""): string {
  if (!value) return fallback;
  if (typeof value === "string") return value;
  return t(value) || fallback;
}

const HERO_FALLBACK_IMAGE = "https://images.unsplash.com/photo-1549923746-c502d488b3ea?auto=format&w=2000&q=80";
const ARTICLE_IMAGE_FALLBACK = HERO_FALLBACK_IMAGE;

const CATEGORY_LABELS: Record<string, LocalizedField> = {
  events: {
    "zh-CN": "赛事合作",
    "zh-TW": "賽事合作",
    en: "Events",
  },
  hospitality: {
    "zh-CN": "文旅营地",
    "zh-TW": "文旅營地",
    en: "Hospitality",
  },
  product: {
    "zh-CN": "产品动态",
    "zh-TW": "產品動態",
    en: "Products",
  },
  industry: {
    "zh-CN": "行业洞察",
    "zh-TW": "行業洞察",
    en: "Industry",
  },
  company: {
    "zh-CN": "公司新闻",
    "zh-TW": "公司新聞",
    en: "Company",
  },
};

export const metadata = {
  title: "朋友圈动态 | 时代篷房",
  description: "浏览时代篷房近期的项目花絮、团队瞬间与合作动态，了解我们的最新足迹。",
};

export default async function NewsPage() {
  const visibility = await ensurePageVisible("newsIndex");
  const hiddenSections = getHiddenSections(visibility, "newsIndex");
  const hideHero = hiddenSections.hero === true;
  const hideTimeline = hiddenSections.timeline === true;
  const news = await getNewsConfig();
  const hero = news.hero ?? {};
  const heading = news.sectionHeading ?? {};
  const rawArticles = Array.isArray(news.articles) ? news.articles : [];
  const articles: NewsArticle[] = rawArticles
    .map((item, index) => normalizeArticle(item, index))
    .sort((a, b) => getTime(b.date) - getTime(a.date));

  const locale = getRequestLocale();
  setCurrentLocale(locale);

  return (
    <div className="bg-white pb-20">
      {!hideHero ? (
        <section className="relative overflow-hidden">
          <div className="absolute inset-0">
            <Image
              src={resolveImageSrc(hero.backgroundImage, HERO_FALLBACK_IMAGE)}
              alt="News hero"
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-black/50 to-black/30" />
          </div>
          <div className="relative z-10 mx-auto flex min-h-[420px] w-full max-w-[1200px] flex-col justify-center gap-6 px-4 py-16 text-white sm:px-6 md:py-24 lg:px-8">
            {hero.eyebrow ? (
              <span className="inline-flex w-fit items-center rounded-full bg-white/15 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em]">
                {resolveText(hero.eyebrow)}
              </span>
            ) : null}
            <h1 className="max-w-3xl text-3xl font-semibold md:text-4xl">{resolveText(hero.title, "最新动态")}</h1>
            <p className="max-w-2xl text-sm text-white/80 md:text-base">{resolveText(hero.description)}</p>
          </div>
        </section>
      ) : null}
      {!hideTimeline ? (
        <section className="bg-white pt-8">
          <div className="mx-auto w-full max-w-[1200px] space-y-6 px-4 pb-16 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-3 text-left md:flex-row md:items-end md:justify-between">
              <div className="max-w-3xl space-y-2">
                <h2 className="text-2xl font-bold text-[var(--color-brand-secondary)] md:text-3xl">
                  {resolveText(heading.title, "时代动态")}
                </h2>
                <p className="text-base text-[var(--color-text-secondary)]">{resolveText(heading.description)}</p>
              </div>
            </div>
            <NewsTimeline articles={articles} />
          </div>
        </section>
      ) : null}
    </div>
  );
}

interface NewsArticle {
  slug: string;
  title: string | LocalizedField;
  excerpt?: string | LocalizedField;
  category?: string;
  date?: string;
  image?: string;
  tags?: LocalizedField[];
}

type RawNewsArticle = {
  slug?: unknown;
  title?: unknown;
  excerpt?: unknown;
  category?: unknown;
  date?: unknown;
  image?: unknown;
  tags?: unknown;
};

function NewsTimeline({ articles }: { articles: NewsArticle[] }) {
  if (!articles.length) {
    return null;
  }

  const locale = getCurrentLocale();

  return (
    <div className="space-y-6">
      <ol className="space-y-6 list-none md:space-y-8">
        {articles.map((article) => (
          <li key={article.slug}>
            <article className="group rounded-3xl border border-[var(--color-border)] bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl">
              <div className="flex flex-col gap-6 p-6 md:flex-row md:items-stretch md:gap-8 md:p-8">
                <div className="flex-1 space-y-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.25em] text-[var(--color-text-tertiary)]">
                    <span>{formatDate(article.date)}</span>
                    <span className="inline-flex items-center gap-2 rounded-full bg-[var(--color-brand-secondary)]/10 px-2.5 py-1 text-[var(--color-brand-secondary)]">
                      {getCategoryLabel(article.category)}
                    </span>
                  </div>
                  <h3 className="text-xl font-semibold text-[var(--color-brand-secondary)]">{resolveText(article.title)}</h3>
                  <p className="text-sm leading-[24px] text-[var(--color-text-secondary)]">{resolveText(article.excerpt)}</p>
                  {article.tags?.length ? (
                    <div className="flex flex-wrap gap-2 text-xs text-[var(--color-brand-secondary)]">
                      {article.tags.slice(0, 3).map((tag, index) => (
                        <span key={`${article.slug}-${index}`} className="rounded-full bg-white/60 px-3 py-1">
                          {resolveText(tag)}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <Link
                      href={`/news/${article.slug}`}
                      className="inline-flex items-center gap-2 rounded-full border border-[var(--color-brand-primary)] px-3 py-1.5 text-[var(--color-brand-primary)] transition hover:bg-[var(--color-brand-primary)] hover:text-white"
                    >
                      {locale === "en" ? "Open moment" : "查看全文"}
                      <span aria-hidden>→</span>
                    </Link>
                    <span className="text-xs uppercase tracking-[0.3em] text-[var(--color-text-tertiary)]">
                      {locale === "en" ? "Shared by TIMES" : "TIMES 分享"}
                    </span>
                  </div>
                </div>
                <figure className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-black/5 md:w-72 md:flex-none">
                  <Image
                    src={resolveImageSrc(article.image, ARTICLE_IMAGE_FALLBACK)}
                    alt={resolveText(article.title)}
                    fill
                    sizes="(min-width: 1280px) 320px, (min-width: 768px) 280px, 100vw"
                    className="object-cover transition duration-500 group-hover:scale-105"
                  />
                </figure>
              </div>
            </article>
          </li>
        ))}
      </ol>
    </div>
  );
}

function normalizeArticle(article: RawNewsArticle, index: number): NewsArticle {
  const slug = typeof article.slug === "string" && article.slug.trim() ? article.slug : `news-${index}`;

  // 规范化标题与摘要为 LocalizedField；若为空则使用 slug 作为标题
  const normalizedTitle = normalizeToLocalizedField(article.title);
  const title = Object.keys(normalizedTitle).length ? normalizedTitle : slug;

  const normalizedExcerpt = normalizeToLocalizedField(article.excerpt);
  const excerpt = Object.keys(normalizedExcerpt).length ? normalizedExcerpt : undefined;

  const category = typeof article.category === "string" ? article.category : undefined;
  const date = typeof article.date === "string" ? article.date : undefined;
  const image = typeof article.image === "string" ? article.image : undefined;
  const tagsArray = Array.isArray(article.tags) ? article.tags : [];
  const tags: LocalizedField[] = tagsArray
    .map((tag) => normalizeToLocalizedField(tag))
    .filter((tag) => Object.keys(tag).length > 0);

  return {
    slug,
    title,
    excerpt,
    category,
    date,
    image,
    tags,
  };
}

// 将未知输入转换为 LocalizedField（支持字符串和对象）
function normalizeToLocalizedField(value: unknown): LocalizedField {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? { [getCurrentLocale()]: trimmed } : {};
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  const entries = Object.entries(value as Record<string, unknown>);
  const result: LocalizedField = {};
  for (const [key, raw] of entries) {
    if (typeof raw !== "string") continue;
    const trimmed = raw.trim();
    if (!trimmed) continue;
    result[key as LocaleKey] = trimmed;
  }
  return result;
}

function formatDate(value: string | undefined): string {
  const timestamp = getTime(value);
  const locale = getCurrentLocale();
  if (!timestamp) {
    if (locale === "en") return "Date TBD";
    return locale === "zh-TW" ? "待定" : "待定";
  }

  const formatter = new Intl.DateTimeFormat(getLocaleTag(locale), {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return formatter.format(new Date(timestamp));
}

function getCategoryLabel(category: string | undefined): string {
  const locale = getCurrentLocale();
  if (!category) {
    return locale === "en" ? "Updates" : locale === "zh-TW" ? "最新動態" : "最新动态";
  }

  const labels = CATEGORY_LABELS[category];
  if (!labels) {
    return locale === "en" ? "Updates" : locale === "zh-TW" ? "最新動態" : "最新动态";
  }

  return resolveText(labels, locale === "en" ? "Updates" : locale === "zh-TW" ? "最新動態" : "最新动态");
}

function resolveImageSrc(image: string | undefined, fallback: string): string {
  if (!image) return fallback;
  const trimmed = image.trim();
  if (!trimmed) return fallback;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  if (trimmed.startsWith("/")) return trimmed;
  return fallback;
}

function getTime(value: string | undefined): number {
  if (!value) return 0;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function getLocaleTag(locale: LocaleKey): string {
  switch (locale) {
    case "en":
      return "en-US";
    case "zh-TW":
      return "zh-TW";
    default:
      return "zh-CN";
  }
}
