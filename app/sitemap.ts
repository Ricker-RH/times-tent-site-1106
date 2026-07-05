import type { MetadataRoute } from "next";
import type { VisibilityPageKey } from "@/constants/visibility";
import { getNewsList } from "@/data";
import { absoluteUrl } from "@/lib/seo";
import { fetchCaseCategories } from "@/server/cases";
import { getProductCenterConfig } from "@/server/pageConfigs";
import { getVisibilityConfig, isPageHidden } from "@/server/visibility";

export const dynamic = "force-dynamic";

type SitemapEntry = MetadataRoute.Sitemap[number];
type ChangeFrequency = NonNullable<SitemapEntry["changeFrequency"]>;

const PUBLIC_STATIC_PAGES: Array<{
  key: VisibilityPageKey;
  path: string;
  priority: number;
  changeFrequency: ChangeFrequency;
}> = [
  { key: "home", path: "/", priority: 1, changeFrequency: "weekly" },
  { key: "productsIndex", path: "/products", priority: 0.95, changeFrequency: "weekly" },
  { key: "casesIndex", path: "/cases", priority: 0.9, changeFrequency: "weekly" },
  { key: "inventory", path: "/inventory", priority: 0.85, changeFrequency: "weekly" },
  { key: "about", path: "/about", priority: 0.8, changeFrequency: "monthly" },
  { key: "contact", path: "/contact", priority: 0.8, changeFrequency: "monthly" },
  { key: "newsIndex", path: "/news", priority: 0.75, changeFrequency: "weekly" },
  { key: "videos", path: "/videos", priority: 0.65, changeFrequency: "monthly" },
  { key: "library", path: "/library", priority: 0.55, changeFrequency: "monthly" },
  { key: "downloads", path: "/downloads", priority: 0.55, changeFrequency: "monthly" },
  { key: "faq", path: "/faq", priority: 0.55, changeFrequency: "monthly" },
  { key: "partners", path: "/partners", priority: 0.45, changeFrequency: "monthly" },
  { key: "careers", path: "/careers", priority: 0.35, changeFrequency: "monthly" },
  { key: "privacy", path: "/privacy", priority: 0.2, changeFrequency: "yearly" },
  { key: "terms", path: "/terms", priority: 0.2, changeFrequency: "yearly" },
];

function sitemapEntry(path: string, priority: number, changeFrequency: ChangeFrequency): SitemapEntry {
  return {
    url: absoluteUrl(path),
    lastModified: new Date(),
    changeFrequency,
    priority,
  };
}

function uniqueEntries(entries: SitemapEntry[]): SitemapEntry[] {
  const seen = new Set<string>();
  return entries.filter((entry) => {
    if (seen.has(entry.url)) return false;
    seen.add(entry.url);
    return true;
  });
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const visibility = await getVisibilityConfig();
  const entries: SitemapEntry[] = PUBLIC_STATIC_PAGES
    .filter((page) => !isPageHidden(visibility, page.key))
    .map((page) => sitemapEntry(page.path, page.priority, page.changeFrequency));

  if (!isPageHidden(visibility, "productDetail")) {
    const productConfig = await getProductCenterConfig();
    for (const product of productConfig.products) {
      entries.push(sitemapEntry(`/products/${product.slug}`, 0.9, "weekly"));
    }
  }

  const categories = await fetchCaseCategories();

  if (!isPageHidden(visibility, "casesCategory")) {
    for (const category of categories) {
      entries.push(sitemapEntry(`/cases/${category.slug}`, 0.8, "weekly"));
    }
  }

  if (!isPageHidden(visibility, "casesDetail")) {
    for (const category of categories) {
      for (const study of category.studies) {
        entries.push(sitemapEntry(`/cases/${category.slug}/${study.slug}`, 0.75, "monthly"));
      }
    }
  }

  if (!isPageHidden(visibility, "newsDetail")) {
    for (const article of getNewsList()) {
      entries.push(sitemapEntry(`/news/${article.slug}`, 0.65, "monthly"));
    }
  }

  return uniqueEntries(entries);
}
