"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { useFormState, useFormStatus } from "react-dom";

import { ConfigPreviewFrame } from "./ConfigPreviewFrame";
import { EditorDialog } from "./EditorDialog";
import { LocalizedTextField as SharedLocalizedTextField } from "./LocalizedTextField";

import type { UpdateSiteConfigActionState } from "../actions";
import { updateSiteConfigAction } from "../actions";
import { resolveImageSrc, sanitizeImageSrc } from "@/utils/image";
import { SUPPORTED_LOCALES, DEFAULT_LOCALE } from "@/i18n/locales";
import { getCurrentLocale } from "@/data";
import { useToast } from "@/providers/ToastProvider";
import { useGlobalTranslationRegistrationForConfig } from "@/hooks/useGlobalTranslationManager";

const PRIMARY_LOCALE = "zh-CN";

const HERO_FALLBACK_IMAGE = "https://images.unsplash.com/photo-1549923746-c502d488b3ea?auto=format&w=2000&q=80";
const ARTICLE_FALLBACK_IMAGE = HERO_FALLBACK_IMAGE;

type LocalizedMap = Record<string, string>;

type NewsDetailSection = {
  slug?: string;
  title?: LocalizedMap;
  description?: LocalizedMap;
  bullets?: LocalizedMap[];
  quote?: LocalizedMap;
};

type NewsTag = LocalizedMap;

type NewsArticle = {
  slug: string;
  title?: LocalizedMap;
  excerpt?: LocalizedMap;
  category?: string;
  date?: string;
  image?: string;
  body?: string | LocalizedMap;
  highlight?: boolean;
  tags?: NewsTag[];
  detailSections?: NewsDetailSection[];
};

type NewsConfig = {
  hero: {
    backgroundImage?: string;
    eyebrow?: LocalizedMap;
    title?: LocalizedMap;
    description?: LocalizedMap;
  };
  sectionHeading: {
    eyebrow?: LocalizedMap;
    title?: LocalizedMap;
    description?: LocalizedMap;
  };
  articles: NewsArticle[];
  _meta?: Record<string, unknown>;
};

type EditingTarget =
  | { type: "hero" }
  | { type: "sectionHeading" }
  | { type: "article"; index: number };

type PreviewRoute =
  | { type: "list" }
  | { type: "detail"; articleIndex: number };

interface NewsConfigEditorProps {
  configKey: string;
  initialConfig: Record<string, unknown>;
}


function ensureLocalized(value: unknown): LocalizedMap {
  if (!value) return {};
  if (typeof value === "string") {
    return { [PRIMARY_LOCALE]: value };
  }
  if (typeof value === "object" && !Array.isArray(value)) {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => typeof v === "string") as Array<[string, string]>;
    return Object.fromEntries(entries);
  }
  return {};
}

function readLocalized(value: LocalizedMap | string | undefined, locale?: string): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  const active = locale ?? getCurrentLocale?.() ?? PRIMARY_LOCALE;
  return (value as LocalizedMap)[active] ?? (value as LocalizedMap)[PRIMARY_LOCALE] ?? Object.values(value as LocalizedMap)[0] ?? "";
}

function normalizeArticle(raw: unknown): NewsArticle {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {
      slug: "",
      title: {},
      excerpt: {},
      body: "",
      tags: [],
      detailSections: [],
    };
  }
  const record = raw as Record<string, unknown>;
  const detailSections = Array.isArray(record.detailSections)
    ? record.detailSections.map((item) => {
        if (!item || typeof item !== "object" || Array.isArray(item)) {
          return {} as NewsDetailSection;
        }
        const section = item as Record<string, unknown>;
        return {
          slug: typeof section.slug === "string" ? section.slug : undefined,
          title: ensureLocalized(section.title),
          description: ensureLocalized(section.description),
          bullets: Array.isArray(section.bullets)
            ? section.bullets.map((bullet) => ensureLocalized(bullet))
            : undefined,
          quote: ensureLocalized(section.quote),
        } satisfies NewsDetailSection;
      })
    : [];

  return {
    slug: typeof record.slug === "string" ? record.slug : "",
    title: ensureLocalized(record.title),
    excerpt: ensureLocalized(record.excerpt),
    category: typeof record.category === "string" ? record.category : undefined,
    date: typeof record.date === "string" ? record.date : undefined,
    image: typeof record.image === "string" ? record.image : undefined,
    highlight: Boolean(record.highlight),
    body:
      typeof record.body === "string"
        ? record.body
        : (() => {
            const localized = ensureLocalized(record.body);
            return Object.keys(localized).length ? localized : undefined;
          })(),
    tags: Array.isArray(record.tags)
      ? record.tags.map((tag) => ensureLocalized(tag))
      : [],
    detailSections,
  } satisfies NewsArticle;
}

function normalizeConfig(raw: Record<string, unknown>): NewsConfig {
  const heroRaw = (raw.hero ?? {}) as Record<string, unknown>;
  const sectionHeadingRaw = (raw.sectionHeading ?? {}) as Record<string, unknown>;
  const articlesRaw = Array.isArray(raw.articles) ? raw.articles : [];

  return {
    hero: {
      backgroundImage: typeof heroRaw.backgroundImage === "string" ? heroRaw.backgroundImage : "",
      eyebrow: ensureLocalized(heroRaw.eyebrow),
      title: ensureLocalized(heroRaw.title),
      description: ensureLocalized(heroRaw.description),
    },
    sectionHeading: {
      eyebrow: ensureLocalized(sectionHeadingRaw.eyebrow),
      title: ensureLocalized(sectionHeadingRaw.title),
      description: ensureLocalized(sectionHeadingRaw.description),
    },
    articles: articlesRaw.map((item) => normalizeArticle(item)),
    _meta: typeof raw._meta === "object" && raw._meta !== null ? (raw._meta as Record<string, unknown>) : undefined,
  } satisfies NewsConfig;
}

function restoreLocalized(map: LocalizedMap | undefined): Record<string, string> | undefined {
  if (!map) return undefined;
  const entries = Object.entries(map).filter(([, value]) => value && value.length);
  if (!entries.length) return undefined;
  return Object.fromEntries(entries);
}

function serializeArticle(article: NewsArticle): Record<string, unknown> {
  const result: Record<string, unknown> = {
    slug: article.slug,
    category: article.category,
    date: article.date,
    image: article.image,
    highlight: Boolean(article.highlight),
  };

  const title = restoreLocalized(article.title);
  if (title) result.title = title;
  const excerpt = restoreLocalized(article.excerpt);
  if (excerpt) result.excerpt = excerpt;

  if (typeof article.body === "string" && article.body.trim()) {
    result.body = article.body;
  } else if (article.body && typeof article.body === "object") {
    result.body = article.body;
  }

  if (article.tags && article.tags.length) {
    result.tags = article.tags.map((tag) => restoreLocalized(tag)).filter(Boolean);
  }

  if (article.detailSections && article.detailSections.length) {
    result.detailSections = article.detailSections.map((section) => {
      const serialized: Record<string, unknown> = {
        slug: section.slug,
      };
      const sectionTitle = restoreLocalized(section.title);
      if (sectionTitle) serialized.title = sectionTitle;
      const sectionDescription = restoreLocalized(section.description);
      if (sectionDescription) serialized.description = sectionDescription;
      if (section.quote) {
        const quote = restoreLocalized(section.quote);
        if (quote) serialized.quote = quote;
      }
      if (section.bullets && section.bullets.length) {
        serialized.bullets = section.bullets.map((bullet) => restoreLocalized(bullet)).filter(Boolean);
      }
      return serialized;
    });
  }

  return result;
}

function serializeConfig(config: NewsConfig): Record<string, unknown> {
  const hero: Record<string, unknown> = {
    backgroundImage: config.hero.backgroundImage,
  };
  const heroEyebrow = restoreLocalized(config.hero.eyebrow);
  if (heroEyebrow) hero.eyebrow = heroEyebrow;
  const heroTitle = restoreLocalized(config.hero.title);
  if (heroTitle) hero.title = heroTitle;
  const heroDescription = restoreLocalized(config.hero.description);
  if (heroDescription) hero.description = heroDescription;

  const sectionHeading: Record<string, unknown> = {};
  const headingEyebrow = restoreLocalized(config.sectionHeading.eyebrow);
  if (headingEyebrow) sectionHeading.eyebrow = headingEyebrow;
  const headingTitle = restoreLocalized(config.sectionHeading.title);
  if (headingTitle) sectionHeading.title = headingTitle;
  const headingDescription = restoreLocalized(config.sectionHeading.description);
  if (headingDescription) sectionHeading.description = headingDescription;

  const articles = config.articles.map((article) => serializeArticle(article));

  const result: Record<string, unknown> = {
    hero,
    sectionHeading,
    articles,
  };

  if (config._meta) {
    result._meta = { ...config._meta };
  }

  return result;
}


function cloneConfig(value: NewsConfig): NewsConfig {
  return JSON.parse(JSON.stringify(value)) as NewsConfig;
}


function formatDate(value?: string): string {
  if (!value) return "";
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return value;
  }
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(timestamp));
}

function SubmitButton({ disabled, highlight }: { disabled: boolean; highlight?: boolean }) {
  const { pending } = useFormStatus();
  const shouldPulse = Boolean(highlight && !disabled && !pending);
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className={`inline-flex items-center justify-center rounded-full bg-[var(--color-brand-primary)] px-5 py-2 text-sm font-semibold text-white shadow transition hover:bg-[var(--color-brand-secondary)] disabled:cursor-not-allowed disabled:opacity-60 ${
        shouldPulse ? "animate-[pulse_0.6s_ease-in-out_infinite] ring-4 ring-offset-4 ring-offset-white ring-[var(--color-brand-primary)] shadow-[0_0_36px_rgba(216,34,52,0.45)]" : ""
      }`}
    >
      {pending ? "保存中..." : "保存配置"}
    </button>
  );
}

interface NewsPreviewSurfaceProps {
  config: NewsConfig;
  previewRoute: PreviewRoute;
  selectedArticleIndex: number;
  onEditHero: () => void;
  onEditSectionHeading: () => void;
  onEditArticle: (index: number) => void;
  onPreviewArticle: (index: number) => void;
  onReturnToList: () => void;
  onAddArticle: () => void;
  onRemoveArticle: (index: number) => void;
}

function NewsPreviewSurface({
  config,
  previewRoute,
  selectedArticleIndex,
  onEditHero,
  onEditSectionHeading,
  onEditArticle,
  onPreviewArticle,
  onReturnToList,
  onAddArticle,
  onRemoveArticle,
}: NewsPreviewSurfaceProps) {
  const hero = config.hero ?? { backgroundImage: "", title: {}, description: {}, eyebrow: {} };
  const sectionHeading = config.sectionHeading ?? { title: {}, description: {}, eyebrow: {} };
  const articles = config.articles ?? [];

  const resolvePreviewImage = (value?: string, fallback?: string) => {
    if (!value) return fallback ?? "";
    const trimmed = value.trim();
    if (!trimmed) return fallback ?? "";
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
    if (trimmed.startsWith('//')) return `https:${trimmed}`;
    if (trimmed.startsWith('/')) return trimmed;
    return trimmed;
  };

  const heroImage = resolvePreviewImage(hero.backgroundImage, HERO_FALLBACK_IMAGE);
  const activeArticleIndex = previewRoute.type === 'detail' ? previewRoute.articleIndex : selectedArticleIndex;
  const activeArticle =
    activeArticleIndex >= 0 && activeArticleIndex < articles.length ? articles[activeArticleIndex] : null;

  if (previewRoute.type === 'detail' && activeArticle) {
    const detailTitle = readLocalized(activeArticle.title) || `文章 ${activeArticleIndex + 1}`;
    const detailExcerpt = readLocalized(activeArticle.excerpt);
    const detailCategory = activeArticle.category;
    const detailDate = activeArticle.date ? formatDate(activeArticle.date) : null;
    const detailImage = resolvePreviewImage(activeArticle.image, ARTICLE_FALLBACK_IMAGE);
    const detailBody =
      typeof activeArticle.body === 'string'
        ? activeArticle.body
        : readLocalized(activeArticle.body as LocalizedMap);
    const detailSections = activeArticle.detailSections ?? [];
    const detailTags = activeArticle.tags ?? [];

    return (
      <div className="space-y-8 pb-10">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <button
            type="button"
            onClick={onReturnToList}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] px-4 py-2 font-semibold text-[var(--color-brand-secondary)] transition hover:border-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary)]"
          >
            ← 返回新闻列表
          </button>
          <span className="text-[var(--color-text-tertiary,#8690a3)]">当前预览：{detailTitle}</span>
        </div>

        <section className="relative overflow-hidden rounded-[32px] border border-[var(--color-border)] bg-black text-white shadow-lg">
          <div className="absolute inset-0">
            <Image
              src={resolveImageSrc(detailImage, ARTICLE_FALLBACK_IMAGE)}
              alt={detailTitle}
              fill
              className="object-cover"
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-black/45 to-black/25" />
          </div>
          <div className="relative flex flex-col gap-4 px-8 py-12 md:px-12 md:py-16">
            <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.35em] text-white/80">
              {detailDate ? <span>{detailDate}</span> : null}
              {detailCategory ? (
                <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-1">{detailCategory}</span>
              ) : null}
              {detailTags.map((tag, tagIndex) => (
                <span key={tagIndex} className="inline-flex items-center rounded-full bg-white/10 px-3 py-1">
                  {readLocalized(tag)}
                </span>
              ))}
            </div>
            <h1 className="text-3xl font-semibold md:text-4xl">{detailTitle}</h1>
            <p className="max-w-3xl text-sm text-white/80 md:text-base">
              {detailExcerpt || '这里将展示文章摘要，可在浮窗中编辑。'}
            </p>
            <div className="flex flex-wrap gap-3 text-xs text-white/80">
              {activeArticle.highlight ? (
                <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-1">重点推荐</span>
              ) : null}
              <button
                type="button"
                onClick={() => onEditArticle(activeArticleIndex)}
                className="rounded-full bg-white/15 px-4 py-1 font-semibold transition hover:bg-white/25"
              >
                编辑这篇文章
              </button>
            </div>
          </div>
        </section>

        <section className="space-y-6 rounded-[28px] border border-[var(--color-border)] bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-[var(--color-brand-secondary)] md:text-3xl">文章详情内容</h2>
              <p className="text-sm text-[var(--color-text-secondary)]">
                预览正文与段落，点击右侧按钮即可在浮窗内增删改内容。
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => onEditArticle(activeArticleIndex)}
                className="rounded-full border border-[var(--color-border)] px-4 py-2 text-xs font-semibold text-[var(--color-brand-primary)] transition hover:border-[var(--color-brand-primary)] hover:bg-[var(--color-brand-primary)]/10"
              >
                编辑文章字段
              </button>
            </div>
          </div>

          {detailBody ? (
            <div className="space-y-3 rounded-2xl border border-[var(--color-border)] bg-white/85 p-6">
              <p className="text-sm leading-relaxed text-[var(--color-text-secondary)] whitespace-pre-line">
                {detailBody}
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-white/60 px-5 py-10 text-center text-sm text-[var(--color-text-secondary)]">
              暂未填写正文内容，点击“编辑文章字段”补充详细介绍。
            </div>
          )}

          {detailSections.length ? (
            <div className="space-y-4">
              {detailSections.map((section, sectionIndex) => {
                const sectionTitle = readLocalized(section.title) || `段落 ${sectionIndex + 1}`;
                const sectionDescription = readLocalized(section.description);
                const sectionQuote = readLocalized(section.quote);
                const bullets = section.bullets ?? [];

                return (
                  <article
                    key={section.slug || sectionIndex}
                    className="space-y-4 rounded-2xl border border-[var(--color-border)] bg-white/90 p-6 shadow-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-2">
                        <h3 className="text-lg font-semibold text-[var(--color-brand-secondary)]">{sectionTitle}</h3>
                        {sectionDescription ? (
                          <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">{sectionDescription}</p>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        onClick={() => onEditArticle(activeArticleIndex)}
                        className="rounded-full border border-[var(--color-border)] px-3 py-1 text-xs font-semibold text-[var(--color-brand-primary)] transition hover:border-[var(--color-brand-primary)] hover:bg-[var(--color-brand-primary)]/10"
                      >
                        在浮窗中编辑
                      </button>
                    </div>
                    {bullets.length ? (
                      <ul className="space-y-2 text-sm text-[var(--color-text-secondary)]">
                        {bullets.map((bullet, bulletIndex) => (
                          <li key={bulletIndex} className="flex items-start gap-2">
                            <span className="mt-1 h-2 w-2 flex-none rounded-full bg-[var(--color-brand-primary)]" />
                            <span className="leading-relaxed">{readLocalized(bullet)}</span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    {sectionQuote ? (
                      <blockquote className="rounded-2xl border-l-4 border-[var(--color-brand-primary)] bg-[var(--color-brand-primary)]/5 px-4 py-3 text-sm italic text-[var(--color-brand-secondary)]">
                        {sectionQuote}
                      </blockquote>
                    ) : null}
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-white/60 px-5 py-10 text-center text-sm text-[var(--color-text-secondary)]">
              暂无详情段落，可点击上方“编辑文章字段”在浮窗中新增。
            </div>
          )}
        </section>
      </div>
    );
  }

  const highlightedIndex = activeArticleIndex >= 0 ? activeArticleIndex : -1;

  return (
    <div className="space-y-8 pb-8">
      <section className="relative overflow-hidden rounded-[32px] border border-[var(--color-border)] bg-black text-white shadow-lg">
        <div className="absolute inset-0">
          <Image
            src={resolveImageSrc(heroImage, HERO_FALLBACK_IMAGE)}
            alt="新闻中心"
            fill
            className="object-cover"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-black/45 to-black/25" />
        </div>
        <div className="relative flex flex-col gap-4 px-8 py-12 md:px-12 md:py-16">
          {readLocalized(hero.eyebrow) ? (
            <span className="inline-flex w-fit items-center rounded-full bg-white/15 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em]">
              {readLocalized(hero.eyebrow)}
            </span>
          ) : null}
          <h1 className="text-3xl font-semibold md:text-4xl">{readLocalized(hero.title) || "新闻中心"}</h1>
          <p className="max-w-3xl text-sm text-white/80 md:text-base">{readLocalized(hero.description) || "在此展示英雄区域的描述文案。"}</p>
          <div className="flex flex-wrap gap-3 text-xs text-white/80">
            <button
              type="button"
              onClick={onEditHero}
              className="rounded-full bg-white/15 px-4 py-1 font-semibold transition hover:bg-white/25"
            >
              编辑英雄区
            </button>
          </div>
        </div>
      </section>

      <section className="relative space-y-6 rounded-[28px] border border-[var(--color-border)] bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            {readLocalized(sectionHeading.eyebrow) ? (
              <span className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-brand-primary)]">
                {readLocalized(sectionHeading.eyebrow)}
              </span>
            ) : null}
            <h2 className="text-2xl font-semibold text-[var(--color-brand-secondary)] md:text-3xl">
              {readLocalized(sectionHeading.title) || "频道导语标题"}
            </h2>
            <p className="text-sm text-[var(--color-text-secondary)]">
              {readLocalized(sectionHeading.description) || "在此展示频道简介文案，支持在编辑面板中修改。"}
            </p>
          </div>
          <button
            type="button"
            onClick={onEditSectionHeading}
            className="rounded-full border border-[var(--color-border)] px-4 py-2 text-xs font-semibold text-[var(--color-brand-secondary)] transition hover:border-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary)]"
          >
            编辑频道导语
          </button>
        </div>

        <div className="space-y-4">
          {articles.map((article, index) => {
            const title = readLocalized(article.title);
            const excerpt = readLocalized(article.excerpt);
            const tag = article.tags?.[0] ? readLocalized(article.tags[0]) : undefined;
            const image = resolvePreviewImage(article.image, ARTICLE_FALLBACK_IMAGE);
            const isActive = index === highlightedIndex;

            return (
              <article
                key={article.slug || title || index}
                className={`relative overflow-hidden rounded-2xl border p-5 shadow-sm transition ${
                  isActive
                    ? 'border-[var(--color-brand-primary)] bg-[var(--color-brand-primary)]/5 shadow-lg'
                    : 'border-[var(--color-border)] bg-white hover:border-[var(--color-brand-primary)]'
                }`}
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-stretch md:gap-6">
                  <div className="flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.3em] text-[var(--color-text-tertiary,#8690a3)]">
                      {article.date ? <span>{formatDate(article.date)}</span> : null}
                      {article.category ? (
                        <span className="inline-flex items-center rounded-full bg-[var(--color-brand-primary)]/10 px-3 py-1 text-[var(--color-brand-primary)]">
                          {article.category}
                        </span>
                      ) : null}
                      {tag ? (
                        <span className="inline-flex items-center rounded-full bg-[var(--color-brand-secondary)]/10 px-3 py-1 text-[var(--color-brand-secondary)]">
                          {tag}
                        </span>
                      ) : null}
                    </div>
                    <h3 className="text-lg font-semibold text-[var(--color-brand-secondary)]">{title || `文章 ${index + 1}`}</h3>
                    <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">
                      {excerpt || "文章摘要展示区域，可直接在浮窗中编辑。"}
                    </p>
                  </div>
                  <div className="relative h-40 w-full overflow-hidden rounded-2xl md:h-auto md:w-64">
                    <Image
                      src={resolveImageSrc(image, ARTICLE_FALLBACK_IMAGE)}
                      alt={title || '文章缩略图'}
                      fill
                      className="object-cover"
                      sizes="(min-width: 768px) 256px, 100vw"
                    />
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onEditArticle(index)}
                    className="rounded-full border border-[var(--color-border)] px-3 py-1 text-xs font-semibold text-[var(--color-brand-primary)] transition hover:border-[var(--color-brand-primary)] hover:bg-[var(--color-brand-primary)]/10"
                  >
                    编辑文章
                  </button>
                  <button
                    type="button"
                    onClick={() => onPreviewArticle(index)}
                    className="rounded-full border border-[var(--color-border)] px-3 py-1 text-xs font-semibold text-[var(--color-brand-secondary)] transition hover:border-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary)]"
                  >
                    预览详情
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemoveArticle(index)}
                    className="rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-500 transition hover:bg-rose-50"
                  >
                    删除
                  </button>
                </div>
              </article>
            );
          })}
          {!articles.length ? (
            <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-white/60 p-6 text-center text-sm text-[var(--color-text-secondary)]">
              暂无文章，请点击下方按钮新增。
            </div>
          ) : null}
          <button
            type="button"
            onClick={onAddArticle}
            className="inline-flex items-center justify-center rounded-full border border-[var(--color-brand-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-brand-primary)] transition hover:bg-[var(--color-brand-primary)]/10"
          >
            + 新增文章
          </button>
        </div>
      </section>
    </div>
  );
}


function ImageInput({
  label,
  value,
  onChange,
  placeholder,
  helper,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  helper?: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelectFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("请选择图片文件");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("图片大小不能超过 5MB");
      event.target.value = "";
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/uploads", {
        method: "POST",
        body: formData,
      });
      const result = (await response.json().catch(() => null)) as { url?: string; error?: string } | null;
      if (!response.ok || !result?.url) {
        throw new Error(result?.error ?? "上传失败，请稍后重试");
      }
      onChange(result.url);
    } catch (err) {
      console.error("Image upload failed", err);
      setError(err instanceof Error ? err.message : "上传失败，请稍后重试");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const handleClear = () => {
    onChange("");
    setError(null);
  };

  const trimmed = value?.trim() ?? "";
  const previewSrc = sanitizeImageSrc(trimmed);
  const hasValue = Boolean(trimmed);

  return (
    <div className="space-y-2 text-sm">
      <span className="font-medium text-[var(--color-brand-secondary)]">{label}</span>
      <div className="space-y-2 rounded-2xl border border-[var(--color-border)] bg-white/80 p-3">
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-brand-secondary)] focus:border-[var(--color-brand-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/30"
        />
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            type="button"
            onClick={handleSelectFile}
            className="rounded-full border border-[var(--color-brand-primary)] px-3 py-1 font-semibold text-[var(--color-brand-primary)] transition hover:bg-[var(--color-brand-primary)]/10"
            disabled={uploading}
          >
            {uploading ? "上传中..." : "本地上传"}
          </button>
          {hasValue ? (
            <button
              type="button"
              onClick={handleClear}
              className="rounded-full border border-[var(--color-border)] px-3 py-1 text-[var(--color-text-secondary)] transition hover:border-rose-200 hover:text-rose-500"
            >
              清空
            </button>
          ) : null}
          {error ? <span className="text-rose-500">{error}</span> : null}
        </div>
        {helper ? <p className="text-xs text-[var(--color-text-tertiary,#8690a3)]">{helper}</p> : null}
        {previewSrc ? (
          <div className="relative mt-2 h-32 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]">
            <Image src={previewSrc} alt="图片预览" fill sizes="100vw" className="object-cover" />
          </div>
        ) : hasValue ? (
          <p className="text-xs text-rose-500">图片地址无效，请输入以 http(s):// 或 / 开头的链接。</p>
        ) : null}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}

function TextInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-[var(--color-brand-secondary)]">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-[var(--color-border)] bg-white/80 px-3 py-2 text-sm text-[var(--color-brand-secondary)] focus:border-[var(--color-brand-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/30"
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  rows = 4,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-[var(--color-brand-secondary)]">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="w-full rounded-xl border border-[var(--color-border)] bg-white/80 px-3 py-2 text-sm text-[var(--color-brand-secondary)] focus:border-[var(--color-brand-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/30"
      />
    </label>
  );
}

function updateLocalizedMap(value: LocalizedMap | undefined, locale: string, nextValue: string): LocalizedMap {
  const next = { ...(value ?? {}) };
  next[locale] = nextValue;
  const base = typeof next[DEFAULT_LOCALE] === "string" && next[DEFAULT_LOCALE]?.trim()
    ? (next[DEFAULT_LOCALE] as string)
    : nextValue;
  SUPPORTED_LOCALES.forEach((code) => {
    const raw = next[code];
    if (typeof raw !== "string" || !raw.trim()) {
      next[code] = base;
    }
  });
  return next;
}

function LocalizedTextField({
  label,
  value,
  onChange,
  multiline = false,
  rows = 3,
  placeholder,
  translationContext,
}: {
  label: string;
  value: LocalizedMap;
  onChange: (next: LocalizedMap) => void;
  multiline?: boolean;
  rows?: number;
  placeholder?: string;
  translationContext?: string;
}) {
  const normalizedValue = normalizeLocalizedField(value);
  return (
    <SharedLocalizedTextField
      label={label}
      value={normalizedValue}
      multiline={multiline}
      rows={rows}
      placeholder={placeholder}
      translationContext={translationContext}
      onChange={(next) => onChange(normalizeLocalizedField(next))}
    />
  );
}

function normalizeLocalizedField(value: LocalizedMap | undefined): LocalizedMap {
  const base = ensureLocalized(value);
  const result: LocalizedMap = {};
  for (const locale of SUPPORTED_LOCALES) {
    const raw = base[locale];
    result[locale] = typeof raw === "string" ? raw : "";
  }
  return result;
}

function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (next: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-[var(--color-border)] text-[var(--color-brand-primary)] focus:ring-[var(--color-brand-primary)]"
      />
      <span>{label}</span>
    </label>
  );
}




export function NewsConfigEditor({ configKey, initialConfig }: NewsConfigEditorProps) {
  const normalized = useMemo(() => normalizeConfig(initialConfig), [initialConfig]);
  const [config, setConfig] = useState<NewsConfig>(normalized);
  useGlobalTranslationRegistrationForConfig({ config, setConfig, labelPrefix: configKey });
  const [initialSnapshot, setInitialSnapshot] = useState<NewsConfig>(normalized);
  const lastSubmittedRef = useRef<NewsConfig>(normalized);
  const editingBackupRef = useRef<NewsConfig | null>(null);
  const [state, formAction] = useFormState<UpdateSiteConfigActionState, FormData>(updateSiteConfigAction, {
    status: "idle",
  });
  const [editingTarget, setEditingTarget] = useState<EditingTarget | null>(null);
  const [selectedArticleIndex, setSelectedArticleIndex] = useState(() => -1);
  const [previewRoute, setPreviewRoute] = useState<PreviewRoute>({ type: "list" });
  const previewScale: 'auto' | number = 'auto';
  const formRef = useRef<HTMLFormElement>(null);
  const payloadInputRef = useRef<HTMLInputElement>(null);
  const latestConfigRef = useRef(config);
  const toast = useToast();

  const cloneDetailSections = (sections: NewsDetailSection[] | undefined): NewsDetailSection[] =>
    (sections ?? []).map((section) => ({
      slug: section.slug,
      title: section.title ? { ...section.title } : undefined,
      description: section.description ? { ...section.description } : undefined,
      bullets: section.bullets ? section.bullets.map((bullet) => ({ ...bullet })) : undefined,
      quote: section.quote ? { ...section.quote } : undefined,
    }));

  useEffect(() => {
    setConfig(normalized);
    setInitialSnapshot(normalized);
  }, [normalized]);

  useEffect(() => {
    latestConfigRef.current = config;
  }, [config]);

  useEffect(() => {
    if (state.status === "success") {
      setInitialSnapshot(lastSubmittedRef.current);
      setConfig(lastSubmittedRef.current);
      toast.success("保存成功");
      window.dispatchEvent(new CustomEvent("site-config:save-success", { detail: { key: configKey } }));
      formRef.current?.classList.add("animate-pulse");
      const timer = window.setTimeout(() => formRef.current?.classList.remove("animate-pulse"), 400);
      return () => window.clearTimeout(timer);
    }
  }, [state.status, toast, configKey]);

  useEffect(() => {
    if (!config.articles.length) {
      setSelectedArticleIndex(-1);
      setEditingTarget((prev) => {
        if (prev && prev.type === "article") {
          return null;
        }
        return prev;
      });
      setPreviewRoute({ type: "list" });
      return;
    }
    setSelectedArticleIndex((prev) => {
      if (prev < 0 || prev >= config.articles.length) {
        if (editingTarget && editingTarget.type === "article") {
          return Math.min(editingTarget.index, config.articles.length - 1);
        }
        return -1;
      }
      return prev;
    });
    setPreviewRoute((prev) => {
      if (prev.type === "detail" && prev.articleIndex >= config.articles.length) {
        return { type: "detail", articleIndex: Math.max(config.articles.length - 1, 0) };
      }
      return prev;
    });
  }, [config.articles.length, editingTarget]);

  useEffect(() => {
    if (!editingTarget || editingTarget.type !== "article") {
      return;
    }
    const idx = editingTarget.index;
    if (idx < 0 || idx >= config.articles.length) {
      if (config.articles.length) {
        setEditingTarget({ type: "article", index: 0 });
      } else {
        setEditingTarget(null);
      }
    }
  }, [editingTarget, config.articles.length]);

  useEffect(() => {
    if (editingTarget && editingTarget.type === "article") {
      setSelectedArticleIndex(editingTarget.index);
    }
  }, [editingTarget]);

  const isDirty = useMemo(() => {
    return JSON.stringify(config) !== JSON.stringify(initialSnapshot);
  }, [config, initialSnapshot]);

  const payloadObject = useMemo(() => {
    const nextPayload = serializeConfig(config);
    const meta = nextPayload._meta as Record<string, unknown> | undefined;
    const now = new Date().toISOString();
    nextPayload._meta = {
      ...(meta ?? {}),
      schema: typeof meta?.schema === "string" ? meta.schema : "news-page.v1",
      updatedAt: now,
      adminPath: typeof meta?.adminPath === "string" ? meta.adminPath : "/admin_TT/news",
    };
    return nextPayload;
  }, [config]);

  const payload = useMemo(() => JSON.stringify(payloadObject), [payloadObject]);

  function startGlobalSave(next?: NewsConfig) {
    const fd = new FormData();
    fd.set("key", configKey);
    try {
      const source = next ?? latestConfigRef.current;
      const obj = serializeConfig(source);
      const meta = obj._meta as Record<string, unknown> | undefined;
      const now = new Date().toISOString();
      obj._meta = {
        ...(meta ?? {}),
        schema: typeof meta?.schema === "string" ? meta.schema : "news-page.v1",
        updatedAt: now,
        adminPath: typeof meta?.adminPath === "string" ? meta.adminPath : "/admin_TT/news",
      };
      lastSubmittedRef.current = normalizeConfig(obj as Record<string, unknown>);
      fd.set("payload", JSON.stringify(obj));
    } catch {
      fd.set("payload", payload);
    }
    formAction(fd);
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    const nextPayload = serializeConfig(config);
    const meta = nextPayload._meta as Record<string, unknown> | undefined;
    const now = new Date().toISOString();
    nextPayload._meta = {
      ...(meta ?? {}),
      schema: typeof meta?.schema === "string" ? meta.schema : "news-page.v1",
      updatedAt: now,
      adminPath: typeof meta?.adminPath === "string" ? meta.adminPath : "/admin_TT/news",
    };
    lastSubmittedRef.current = normalizeConfig(nextPayload as Record<string, unknown>);
    if (payloadInputRef.current) {
      payloadInputRef.current.value = JSON.stringify(nextPayload);
    }
  };

  const addArticle = () => {
    const snapshot = cloneConfig(config);
    const newArticle: NewsArticle = {
      slug: `article-${config.articles.length + 1}`,
      title: { [PRIMARY_LOCALE]: "新文章标题" },
      excerpt: { [PRIMARY_LOCALE]: "这里是文章摘要，请编辑。" },
      category: "company",
      date: new Date().toISOString().slice(0, 10),
      highlight: false,
      body: "",
      tags: [{ [PRIMARY_LOCALE]: "标签" }],
      detailSections: [],
    };

    setConfig((prev) => ({
      ...prev,
      articles: [...prev.articles, newArticle],
    }));

    const newIndex = config.articles.length;
    editingBackupRef.current = snapshot;
    setPreviewRoute({ type: "detail", articleIndex: newIndex });
    openEditor({ type: "article", index: newIndex }, { preserveBackup: true });
  };

  const removeArticle = (index: number) => {
    const nextLength = Math.max(config.articles.length - 1, 0);
    setConfig((prev) => ({
      ...prev,
      articles: prev.articles.filter((_, idx) => idx !== index),
    }));
    setPreviewRoute((prev) => {
      if (prev.type !== "detail") {
        return prev;
      }
      if (nextLength <= 0) {
        return { type: "list" };
      }
      if (prev.articleIndex === index) {
        const nextIndex = Math.max(Math.min(index, nextLength - 1), 0);
        return { type: "detail", articleIndex: nextIndex };
      }
      if (prev.articleIndex > index) {
        return { type: "detail", articleIndex: prev.articleIndex - 1 };
      }
      return prev;
    });
    setEditingTarget((prev) => {
      if (!prev || prev.type !== "article") {
        return prev;
      }
      if (nextLength <= 0) {
        return null;
      }
      if (prev.index === index) {
        const nextIndex = Math.max(Math.min(index, nextLength - 1), 0);
        return { type: "article", index: nextIndex };
      }
      if (prev.index > index) {
        return { type: "article", index: prev.index - 1 };
      }
      return prev;
    });
    setSelectedArticleIndex((prevIdx) => {
      if (prevIdx === -1) return prevIdx;
      if (prevIdx === index) {
        if (nextLength <= 0) return -1;
        return Math.max(Math.min(index, nextLength - 1), 0);
      }
      if (prevIdx > index) {
        return prevIdx - 1;
      }
      return prevIdx;
    });
  };

  const updateDetailSection = (articleIndex: number, sectionIndex: number, updater: (section: NewsDetailSection) => NewsDetailSection) => {
    updateArticle(articleIndex, (prev) => {
      const detailSections = cloneDetailSections(prev.detailSections);
      const current = detailSections[sectionIndex] ?? {};
      detailSections[sectionIndex] = updater(current);
      return { ...prev, detailSections };
    });
  };

  const addDetailSection = (articleIndex: number) => {
    updateArticle(articleIndex, (prev) => {
      const detailSections = cloneDetailSections(prev.detailSections);
      detailSections.push({
        slug: `section-${detailSections.length + 1}`,
        title: updateLocalizedMap(undefined, DEFAULT_LOCALE, "段落标题"),
        description: updateLocalizedMap(undefined, DEFAULT_LOCALE, "这里填写段落描述"),
        bullets: [updateLocalizedMap(undefined, DEFAULT_LOCALE, "关键要点")],
      });
      return { ...prev, detailSections };
    });
  };

  const removeDetailSection = (articleIndex: number, sectionIndex: number) => {
    updateArticle(articleIndex, (prev) => ({
      ...prev,
      detailSections: cloneDetailSections(prev.detailSections).filter((_, idx) => idx !== sectionIndex),
    }));
  };

  const addDetailSectionBullet = (articleIndex: number, sectionIndex: number) => {
    updateDetailSection(articleIndex, sectionIndex, (section) => {
      const bullets = (section.bullets ?? []).slice();
      bullets.push(updateLocalizedMap(undefined, DEFAULT_LOCALE, "新增要点"));
      return { ...section, bullets };
    });
  };

  const updateDetailSectionBullet = (articleIndex: number, sectionIndex: number, bulletIndex: number, value: string) => {
    updateDetailSection(articleIndex, sectionIndex, (section) => {
      const bullets = (section.bullets ?? []).slice();
      bullets[bulletIndex] = updateLocalizedMap(bullets[bulletIndex], DEFAULT_LOCALE, value);
      return { ...section, bullets };
    });
  };

  const removeDetailSectionBullet = (articleIndex: number, sectionIndex: number, bulletIndex: number) => {
    updateDetailSection(articleIndex, sectionIndex, (section) => {
      const bullets = (section.bullets ?? []).filter((_, idx) => idx !== bulletIndex);
      return { ...section, bullets: bullets.length ? bullets : undefined };
    });
  };

  const updateArticle = (index: number, updater: (prev: NewsArticle) => NewsArticle) => {
    setConfig((prev) => {
      const articles = prev.articles.slice();
      articles[index] = updater(articles[index]);
      return { ...prev, articles };
    });
  };

  const openEditor = (target: EditingTarget, options?: { preserveBackup?: boolean }) => {
    if (!options?.preserveBackup) {
      editingBackupRef.current = cloneConfig(config);
    }
    setEditingTarget(target);
    if (target.type === "article") {
      setSelectedArticleIndex(target.index);
    }
  };

  const closeEditor = () => {
    if (editingTarget && editingTarget.type === "article") {
      setSelectedArticleIndex(-1);
    }
    editingBackupRef.current = null;
    setEditingTarget(null);
  };

  const cancelEditor = () => {
    if (editingBackupRef.current) {
      setConfig(editingBackupRef.current);
    }
    if (editingTarget && editingTarget.type === "article") {
      setSelectedArticleIndex(-1);
    }
    editingBackupRef.current = null;
    setEditingTarget(null);
  };

  const editingArticle =
    editingTarget && editingTarget.type === "article"
      ? config.articles[editingTarget.index] ?? null
      : null;
  const editingArticleIndex =
    editingTarget && editingTarget.type === "article"
      ? editingTarget.index
      : selectedArticleIndex;
  const editingArticleDisplayIndex = editingArticleIndex >= 0 ? editingArticleIndex + 1 : 0;
  const editingLabel = editingTarget
    ? editingTarget.type === "hero"
      ? "英雄区"
      : editingTarget.type === "sectionHeading"
        ? "频道导语"
        : `文章 ${editingArticleIndex + 1}`
    : null;
  const editorSubtitle =
    editingTarget && editingTarget.type === "article" && editingArticle
      ? readLocalized(editingArticle.title) || editingArticle.slug || `文章 ${editingArticleIndex + 1}`
      : editingTarget && editingTarget.type === "sectionHeading"
        ? "配置模块说明、标题与描述"
        : editingTarget && editingTarget.type === "hero"
          ? "调整页面顶部的英雄区域"
          : undefined;

  const articleCount = config.articles.length;

  const handleSelectHero = () => {
    setPreviewRoute({ type: "list" });
    openEditor({ type: "hero" });
  };

  const handleSelectHeading = () => {
    setPreviewRoute({ type: "list" });
    openEditor({ type: "sectionHeading" });
  };

  const handleSelectArticle = (index: number) => {
    setPreviewRoute({ type: "detail", articleIndex: index });
    openEditor({ type: "article", index });
  };

  const handlePreviewArticle = (index: number) => {
    if (index < 0 || index >= config.articles.length) return;
    setPreviewRoute({ type: "detail", articleIndex: index });
    setSelectedArticleIndex(index);
  };

  const handleReturnToList = () => {
    if (previewRoute.type === "detail") {
      setSelectedArticleIndex(previewRoute.articleIndex);
    }
    setPreviewRoute({ type: "list" });
  };

  const heroEditor = (
    <section className="space-y-4">
      <h3 className="text-sm font-semibold text-[var(--color-brand-secondary)]">英雄区</h3>
      <ImageInput
        label="背景图"
        value={config.hero.backgroundImage ?? ""}
        onChange={(next) =>
          setConfig((prev) => ({
            ...prev,
            hero: { ...prev.hero, backgroundImage: next },
          }))
        }
        placeholder="https://或/uploads/..."
        helper="最佳尺寸 1200×420"
      />
      <LocalizedTextField
        label="眉标"
        value={config.hero.eyebrow ?? {}}
        translationContext="新闻英雄区眉标"
        onChange={(next) =>
          setConfig((prev) => ({
            ...prev,
            hero: { ...prev.hero, eyebrow: next },
          }))
        }
      />
      <LocalizedTextField
        label="主标题"
        value={config.hero.title ?? {}}
        translationContext="新闻英雄区主标题"
        onChange={(next) =>
          setConfig((prev) => ({
            ...prev,
            hero: { ...prev.hero, title: next },
          }))
        }
      />
      <LocalizedTextField
        label="描述"
        value={config.hero.description ?? {}}
        translationContext="新闻英雄区描述"
        onChange={(next) =>
          setConfig((prev) => ({
            ...prev,
            hero: { ...prev.hero, description: next },
          }))
        }
        multiline
        rows={4}
      />
    </section>
  );

  const sectionHeadingEditor = (
    <section className="space-y-4">
      <h3 className="text-sm font-semibold text-[var(--color-brand-secondary)]">频道导语</h3>
      <LocalizedTextField
        label="眉标"
        value={config.sectionHeading.eyebrow ?? {}}
        translationContext="新闻导语眉标"
        onChange={(next) =>
          setConfig((prev) => ({
            ...prev,
            sectionHeading: { ...prev.sectionHeading, eyebrow: next },
          }))
        }
      />
      <LocalizedTextField
        label="标题"
        value={config.sectionHeading.title ?? {}}
        translationContext="新闻导语标题"
        onChange={(next) =>
          setConfig((prev) => ({
            ...prev,
            sectionHeading: { ...prev.sectionHeading, title: next },
          }))
        }
      />
      <LocalizedTextField
        label="描述"
        value={config.sectionHeading.description ?? {}}
        translationContext="新闻导语描述"
        onChange={(next) =>
          setConfig((prev) => ({
            ...prev,
            sectionHeading: { ...prev.sectionHeading, description: next },
          }))
        }
        multiline
        rows={3}
      />
    </section>
  );

  const renderArticleEditor = () => {
    if (!editingArticle || editingArticleIndex < 0) {
      return (
        <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-white/60 p-6 text-center text-xs text-[var(--color-text-secondary)]">
          当前暂无文章，请先在左侧点击“新增文章”。
        </div>
      );
    }

    const sections = editingArticle.detailSections ?? [];
    const articleContextBase = editingArticleDisplayIndex
      ? `新闻文章${editingArticleDisplayIndex}`
      : "新闻文章";

    return (
      <section className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-[var(--color-brand-secondary)]">文章 {editingArticleIndex + 1}</h3>
            <p className="text-xs text-[var(--color-text-secondary)]">
              {readLocalized(editingArticle.title) || editingArticle.slug || "设置文章标题、摘要、标签与详情段落"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => removeArticle(editingArticleIndex)}
              className="rounded-full border border-rose-200 px-3 py-1 text-xs text-rose-500 transition hover:bg-rose-50"
            >
              删除文章
            </button>
            {articleCount > 1 ? (
              <div className="flex gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => handleSelectArticle(Math.max(editingArticleIndex - 1, 0))}
                  className="rounded-full border border-[var(--color-border)] px-3 py-1 transition hover:border-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary)]"
                  disabled={editingArticleIndex === 0}
                >
                  上一篇
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectArticle(Math.min(editingArticleIndex + 1, articleCount - 1))}
                  className="rounded-full border border-[var(--color-border)] px-3 py-1 transition hover:border-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary)]"
                  disabled={editingArticleIndex === articleCount - 1}
                >
                  下一篇
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <TextInput
          label="文章 Slug"
          value={editingArticle.slug}
          onChange={(next) =>
            updateArticle(editingArticleIndex, (prev) => ({
              ...prev,
              slug: next,
            }))
          }
        />
        <TextInput
          label="分类"
          value={editingArticle.category ?? ""}
          onChange={(next) =>
            updateArticle(editingArticleIndex, (prev) => ({
              ...prev,
              category: next,
            }))
          }
        />
        <TextInput
          label="发布日期"
          value={editingArticle.date ?? ""}
        onChange={(next) =>
          updateArticle(editingArticleIndex, (prev) => ({
            ...prev,
            date: next,
          }))
        }
        placeholder="2025-10-16"
      />
        <ImageInput
          label="封面图"
          value={editingArticle.image ?? ""}
          onChange={(next) =>
            updateArticle(editingArticleIndex, (prev) => ({
              ...prev,
              image: next,
            }))
          }
          placeholder="https://或/uploads/..."
          helper="最佳尺寸 288×216"
        />
        <Checkbox
          label="重点文章"
          checked={Boolean(editingArticle.highlight)}
          onChange={(next) =>
            updateArticle(editingArticleIndex, (prev) => ({
              ...prev,
              highlight: next,
            }))
          }
        />
        <LocalizedTextField
          label="标题"
          value={editingArticle.title ?? {}}
          translationContext={`${articleContextBase}标题`}
          onChange={(next) =>
            updateArticle(editingArticleIndex, (prev) => ({
              ...prev,
              title: next,
            }))
          }
        />
        <LocalizedTextField
          label="摘要"
          value={editingArticle.excerpt ?? {}}
          translationContext={`${articleContextBase}摘要`}
          onChange={(next) =>
            updateArticle(editingArticleIndex, (prev) => ({
              ...prev,
              excerpt: next,
            }))
          }
          multiline
          rows={3}
        />
        <LocalizedTextField
          label="正文补充文本 (可选)"
          value={typeof editingArticle.body === "string" ? { [DEFAULT_LOCALE]: editingArticle.body } : ((editingArticle.body as LocalizedMap) ?? {})}
          translationContext={`${articleContextBase}正文补充内容`}
          onChange={(next) =>
            updateArticle(editingArticleIndex, (prev) => ({
              ...prev,
              body: next,
            }))
          }
          multiline
          rows={4}
        />

        <div className="space-y-2">
          <span className="text-sm font-medium text-[var(--color-brand-secondary)]">标签</span>
          <div className="space-y-2">
            {(editingArticle.tags ?? []).map((tag, tagIndex) => (
              <div key={tagIndex} className="space-y-2 rounded-xl border border-[var(--color-border)] bg-white/60 p-3">
                <LocalizedTextField
                  label={`标签 ${tagIndex + 1}`}
                  value={tag ?? {}}
                  translationContext={`${articleContextBase}标签${tagIndex + 1}`}
                  onChange={(next) =>
                    updateArticle(editingArticleIndex, (prev) => {
                      const tags = (prev.tags ?? []).slice();
                      tags[tagIndex] = next;
                      return { ...prev, tags };
                    })
                  }
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() =>
                      updateArticle(editingArticleIndex, (prev) => ({
                        ...prev,
                        tags: (prev.tags ?? []).filter((_, idx) => idx !== tagIndex),
                      }))
                    }
                    className="rounded-full border border-[var(--color-border)] px-3 py-1 text-xs text-[var(--color-text-secondary)] transition hover:border-rose-200 hover:text-rose-500"
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                updateArticle(editingArticleIndex, (prev) => ({
                  ...prev,
                  tags: [...(prev.tags ?? []), updateLocalizedMap(undefined, DEFAULT_LOCALE, "新标签")],
                }))
              }
              className="rounded-full border border-[var(--color-border)] px-3 py-1 text-xs text-[var(--color-brand-primary)] transition hover:border-[var(--color-brand-primary)] hover:bg-[var(--color-brand-primary)]/10"
            >
              添加标签
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-[var(--color-brand-secondary)]">详情段落</span>
            <button
              type="button"
              onClick={() => addDetailSection(editingArticleIndex)}
              className="rounded-full border border-[var(--color-border)] px-3 py-1 text-xs text-[var(--color-brand-primary)] transition hover:border-[var(--color-brand-primary)] hover:bg-[var(--color-brand-primary)]/10"
            >
              新增段落
            </button>
          </div>
          <div className="space-y-2">
            {sections.map((section, sectionIndex) => {
              const sectionTitle = readLocalized(section.title);
              const sectionDescription = readLocalized(section.description);
              const sectionQuote = readLocalized(section.quote);
              const bullets = section.bullets ?? [];
              const sectionContextBase = `${articleContextBase}段落${sectionIndex + 1}`;

              return (
                <details key={section.slug || sectionIndex} className="group rounded-2xl border border-[var(--color-border)] bg-white/60 p-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-xs font-semibold text-[var(--color-brand-secondary)]">
                    <span>{sectionTitle || `段落 ${sectionIndex + 1}`}</span>
                    <span className="text-[var(--color-text-tertiary,#8690a3)]">展开编辑</span>
                  </summary>
                  <div className="mt-3 flex flex-col gap-3 text-xs">
                    <TextInput
                      label="段落标识 (slug)"
                      value={section.slug ?? ""}
                      onChange={(next) =>
                        updateDetailSection(editingArticleIndex, sectionIndex, (current) => ({
                          ...current,
                          slug: next,
                        }))
                      }
                    />
                    <LocalizedTextField
                      label="段落标题"
                      value={section.title ?? {}}
                      translationContext={`${sectionContextBase}标题`}
                      onChange={(next) =>
                        updateDetailSection(editingArticleIndex, sectionIndex, (current) => ({
                          ...current,
                          title: next,
                        }))
                      }
                    />
                    <LocalizedTextField
                      label="段落描述"
                      value={section.description ?? {}}
                      translationContext={`${sectionContextBase}描述`}
                      onChange={(next) =>
                        updateDetailSection(editingArticleIndex, sectionIndex, (current) => ({
                          ...current,
                          description: next,
                        }))
                      }
                      multiline
                      rows={3}
                    />
                    <div className="space-y-2">
                      <span className="text-xs font-medium text-[var(--color-brand-secondary)]">要点列表</span>
                      <div className="space-y-2">
                        {bullets.map((bullet, bulletIndex) => (
                          <div key={bulletIndex} className="space-y-2 rounded-xl border border-[var(--color-border)] bg-white/60 p-3">
                            <LocalizedTextField
                              label={`要点 ${bulletIndex + 1}`}
                              value={bullet ?? {}}
                              translationContext={`${sectionContextBase}要点${bulletIndex + 1}`}
                              onChange={(next) =>
                                updateDetailSection(editingArticleIndex, sectionIndex, (current) => {
                                  const nextBullets = (current.bullets ?? []).slice();
                                  nextBullets[bulletIndex] = next;
                                  return { ...current, bullets: nextBullets };
                                })
                              }
                            />
                            <div className="flex justify-end">
                              <button
                                type="button"
                                onClick={() => removeDetailSectionBullet(editingArticleIndex, sectionIndex, bulletIndex)}
                                className="rounded-full border border-[var(--color-border)] px-3 py-1 text-[var(--color-text-secondary)] transition hover:border-rose-200 hover:text-rose-500"
                              >
                                删除
                              </button>
                            </div>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => addDetailSectionBullet(editingArticleIndex, sectionIndex)}
                          className="rounded-full border border-[var(--color-border)] px-3 py-1 text-[var(--color-brand-primary)] transition hover:border-[var(--color-brand-primary)] hover:bg-[var(--color-brand-primary)]/10"
                        >
                          添加要点
                        </button>
                      </div>
                    </div>
                    <LocalizedTextField
                      label="引用 (可选)"
                      value={section.quote ?? {}}
                      translationContext={`${sectionContextBase}引用`}
                      onChange={(next) =>
                        updateDetailSection(editingArticleIndex, sectionIndex, (current) => ({
                          ...current,
                          quote: next,
                        }))
                      }
                      multiline
                      rows={2}
                    />
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => removeDetailSection(editingArticleIndex, sectionIndex)}
                        className="rounded-full border border-rose-200 px-3 py-1 text-[var(--color-text-secondary)] transition hover:bg-rose-50"
                      >
                        删除段落
                      </button>
                    </div>
                  </div>
                </details>
              );
            })}
            {!sections.length ? (
              <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-white/60 px-4 py-6 text-center text-xs text-[var(--color-text-secondary)]">
                暂无详情段落，点击“新增段落”添加。
              </div>
            ) : null}
          </div>
        </div>
      </section>
    );
  };

  const renderEditorPanel = () => {
    if (!editingTarget) {
      return null;
    }
    if (editingTarget.type === 'hero') {
      return heroEditor;
    }
    if (editingTarget.type === 'sectionHeading') {
      return sectionHeadingEditor;
    }
    return renderArticleEditor();
  };

  const successMessage = state.status === 'success' ? state.message : null;
  const errorMessage = state.status === 'error' ? state.message : null;
  
  return (
    <div className="space-y-6">
      <div className="relative">
        <ConfigPreviewFrame
          title="新闻中心页面"
          description="画布与前台完全一致，点击想编辑的区域即可打开浮窗。"
          viewportWidth={1200}
          scale={1}
          autoScale
          maxHeight={null}
        >
          <NewsPreviewSurface
            config={config}
            previewRoute={previewRoute}
            selectedArticleIndex={selectedArticleIndex}
            onEditHero={handleSelectHero}
            onEditSectionHeading={handleSelectHeading}
            onEditArticle={handleSelectArticle}
            onPreviewArticle={handlePreviewArticle}
            onReturnToList={handleReturnToList}
            onAddArticle={addArticle}
            onRemoveArticle={removeArticle}
          />
        </ConfigPreviewFrame>
      </div>

      {editingTarget ? (
        <EditorDialog
          title={editingLabel ?? '选择区域'}
          subtitle={editorSubtitle}
          onSave={() => { startGlobalSave(); closeEditor(); }}
          onCancel={cancelEditor}
        >
          {renderEditorPanel()}
        </EditorDialog>
      ) : null}


    </div>
  );
}
