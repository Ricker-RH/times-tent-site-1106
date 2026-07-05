import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getNewsArticle, getNewsList, setCurrentLocale, t } from "@/data";
import { NewsDetailClient } from "./NewsDetailClient";

import { ensurePageVisible, getHiddenSections } from "@/server/visibility";
import { getRequestLocale } from "@/server/locale";
import { translateUi } from "@/i18n/dictionary";
import {
  absoluteUrl,
  articleJsonLd,
  breadcrumbJsonLd,
  buildMetadata,
  imageObjectJsonLd,
  jsonLdGraph,
  jsonLdScriptProps,
  webPageJsonLd,
} from "@/lib/seo";

interface NewsDetailProps {
  params: { slug: string };
}

export function generateStaticParams() {
  return getNewsList().map((article) => ({ slug: article.slug }));
}

export function generateMetadata({ params }: NewsDetailProps): Metadata {
  const locale = getRequestLocale();
  setCurrentLocale(locale);
  const article = getNewsArticle(params.slug);
  if (!article) {
    return buildMetadata({
      title: `${translateUi(locale, "breadcrumb.news")} | 时代篷房`,
      path: "/news",
    });
  }
  return buildMetadata({
    title: `${t(article.title)} | ${translateUi(locale, "breadcrumb.news")} | 时代篷房`,
    description: t(article.excerpt),
    path: `/news/${article.slug}`,
    image: article.image,
    type: "article",
  });
}

export default async function NewsDetailPage({ params }: NewsDetailProps) {
  const locale = getRequestLocale();
  setCurrentLocale(locale);
  const visibility = await ensurePageVisible("newsDetail");
  const hiddenSections = getHiddenSections(visibility, "newsDetail");
  const article = getNewsArticle(params.slug);
  if (!article) {
    notFound();
  }

  const moreArticles = getNewsList()
    .filter((item) => item.slug !== article.slug)
    .slice(0, 3);
  const articleTitle = t(article.title);
  const articleExcerpt = t(article.excerpt);
  const articlePath = `/news/${article.slug}`;
  const breadcrumbId = `${absoluteUrl(articlePath)}#breadcrumb`;
  const newsBreadcrumbList = breadcrumbJsonLd(
    [
      { name: translateUi(locale, "breadcrumb.home"), url: "/" },
      { name: translateUi(locale, "breadcrumb.news"), url: "/news" },
      { name: articleTitle, url: articlePath },
    ],
    breadcrumbId,
  );
  const newsArticle = articleJsonLd({
    path: articlePath,
    headline: articleTitle,
    description: articleExcerpt,
    image: article.image,
    datePublished: article.date,
    dateModified: article.date,
  });
  const newsDetailJsonLd = jsonLdGraph([
    newsArticle,
    webPageJsonLd({
      path: articlePath,
      name: `${articleTitle} | ${translateUi(locale, "breadcrumb.news")}`,
      description: articleExcerpt,
      image: article.image,
      breadcrumbId,
    }),
    imageObjectJsonLd({
      id: `${absoluteUrl(articlePath)}#primaryimage`,
      url: article.image,
      caption: articleTitle,
    }),
    newsBreadcrumbList,
  ]);

  return (
    <>
      <script {...jsonLdScriptProps(newsDetailJsonLd)} />
      <NewsDetailClient article={article} moreArticles={moreArticles} hiddenSections={hiddenSections} />
    </>
  );
}
