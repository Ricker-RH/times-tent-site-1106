import { notFound } from "next/navigation";
import { getNewsArticle, getNewsList, t } from "@/data";
import { NewsDetailClient } from "./NewsDetailClient";

import { ensurePageVisible, getHiddenSections } from "@/server/visibility";

interface NewsDetailProps {
  params: { slug: string };
}

export function generateStaticParams() {
  return getNewsList().map((article) => ({ slug: article.slug }));
}

export function generateMetadata({ params }: NewsDetailProps) {
  const article = getNewsArticle(params.slug);
  if (!article) {
    return { title: "新闻详情" };
  }
  return {
    title: `${t(article.title)} | 新闻中心`,
    description: t(article.excerpt),
  };
}

export default async function NewsDetailPage({ params }: NewsDetailProps) {
  const visibility = await ensurePageVisible("newsDetail");
  const hiddenSections = getHiddenSections(visibility, "newsDetail");
  const article = getNewsArticle(params.slug);
  if (!article) {
    notFound();
  }

  const moreArticles = getNewsList()
    .filter((item) => item.slug !== article.slug)
    .slice(0, 3);

  return <NewsDetailClient article={article} moreArticles={moreArticles} hiddenSections={hiddenSections} />;
}
