import type { Metadata } from "next";

export const SITE_URL = normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "https://www.timestent.com");
export const SITE_NAME = "时代篷房 TIMES TENT";
export const COMPANY_NAME = "广州时代篷房有限公司";
export const BRAND_NAME = "TIMES TENT";
export const DEFAULT_DESCRIPTION = "时代篷房提供模块化篷房、赛事临建、文旅酒店、工业仓储与展览活动空间解决方案，支持快速交付与定制搭建。";
export const DEFAULT_IMAGE = "/favicon.png";

type JsonLdValue = Record<string, unknown> | Array<Record<string, unknown>>;

interface BuildMetadataOptions {
  title: string;
  description?: string | null;
  path: string;
  image?: string | null;
  type?: "website" | "article";
}

interface BreadcrumbItem {
  name: string;
  url?: string;
}

interface WebPageJsonLdOptions {
  path: string;
  name: string;
  description?: string | null;
  image?: string | null;
  breadcrumbId?: string;
}

interface ImageObjectJsonLdOptions {
  id: string;
  url: string;
  caption?: string | null;
}

interface ProductJsonLdOptions {
  path: string;
  name: string;
  description?: string | null;
  images?: string[];
  category?: string;
}

interface CreativeWorkJsonLdOptions {
  path: string;
  name: string;
  description?: string | null;
  image?: string | null;
  datePublished?: string | number | null;
  location?: string | null;
}

interface ArticleJsonLdOptions {
  path: string;
  headline: string;
  description?: string | null;
  image?: string | null;
  datePublished?: string | null;
  dateModified?: string | null;
}

export function normalizeSiteUrl(url: string): string {
  const trimmed = (url || "https://www.timestent.com").trim();
  return trimmed.replace(/\/+$/, "");
}

export function absoluteUrl(pathOrUrl?: string | null): string {
  if (!pathOrUrl) return SITE_URL;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const normalizedPath = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${SITE_URL}${normalizedPath}`;
}

export function cleanText(value?: string | number | null): string {
  if (typeof value === "number") return String(value);
  return (value || "").replace(/\s+/g, " ").trim();
}

export function cleanDescription(value?: string | null, fallback = DEFAULT_DESCRIPTION, maxLength = 160): string {
  const text = cleanText(value) || fallback;
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trimEnd()}…`;
}

export const defaultRobots = {
  index: true,
  follow: true,
  googleBot: {
    index: true,
    follow: true,
    "max-image-preview": "large",
    "max-snippet": -1,
    "max-video-preview": -1,
  },
} satisfies Metadata["robots"];

export function buildMetadata({
  title,
  description,
  path,
  image,
  type = "website",
}: BuildMetadataOptions): Metadata {
  const safeDescription = cleanDescription(description);
  const canonical = absoluteUrl(path);
  const imageUrl = absoluteUrl(image || DEFAULT_IMAGE);

  return {
    title,
    description: safeDescription,
    alternates: {
      canonical,
    },
    robots: defaultRobots,
    openGraph: {
      title,
      description: safeDescription,
      url: canonical,
      siteName: SITE_NAME,
      locale: "zh_CN",
      type,
      images: [
        {
          url: imageUrl,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: safeDescription,
      images: [imageUrl],
    },
  };
}

export function jsonLdScriptProps(data: JsonLdValue) {
  return {
    type: "application/ld+json",
    dangerouslySetInnerHTML: {
      __html: JSON.stringify(data).replace(/</g, "\\u003c"),
    },
  };
}

export function organizationJsonLd() {
  return {
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: COMPANY_NAME,
    alternateName: SITE_NAME,
    url: SITE_URL,
    logo: absoluteUrl("/favicon.png"),
    email: "business@timestent.com",
    telephone: "+86 20 6265 1300",
    address: {
      "@type": "PostalAddress",
      addressLocality: "广州",
      addressRegion: "广东省",
      addressCountry: "CN",
    },
    contactPoint: [
      {
        "@type": "ContactPoint",
        telephone: "+86 20 6265 1300",
        contactType: "sales",
        availableLanguage: ["zh-CN", "zh-TW", "en"],
      },
    ],
  };
}

export function webSiteJsonLd() {
  return {
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    name: SITE_NAME,
    url: SITE_URL,
    inLanguage: "zh-CN",
    publisher: {
      "@id": `${SITE_URL}/#organization`,
    },
  };
}

export function breadcrumbJsonLd(items: BreadcrumbItem[], id?: string) {
  const normalizedItems = items
    .filter((item) => cleanText(item.name))
    .map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: cleanText(item.name),
      item: item.url ? absoluteUrl(item.url) : undefined,
    }));

  return {
    "@type": "BreadcrumbList",
    ...(id ? { "@id": id } : {}),
    itemListElement: normalizedItems,
  };
}

export function webPageJsonLd({ path, name, description, image, breadcrumbId }: WebPageJsonLdOptions) {
  const pageUrl = absoluteUrl(path);
  return {
    "@type": "WebPage",
    "@id": `${pageUrl}#webpage`,
    url: pageUrl,
    name: cleanText(name),
    description: cleanDescription(description),
    inLanguage: "zh-CN",
    isPartOf: {
      "@id": `${SITE_URL}/#website`,
    },
    publisher: {
      "@id": `${SITE_URL}/#organization`,
    },
    ...(image ? { primaryImageOfPage: { "@id": `${pageUrl}#primaryimage` } } : {}),
    ...(breadcrumbId ? { breadcrumb: { "@id": breadcrumbId } } : {}),
  };
}

export function imageObjectJsonLd({ id, url, caption }: ImageObjectJsonLdOptions) {
  return {
    "@type": "ImageObject",
    "@id": id,
    url: absoluteUrl(url),
    contentUrl: absoluteUrl(url),
    caption: cleanText(caption),
    inLanguage: "zh-CN",
  };
}

export function productJsonLd({ path, name, description, images = [], category = "篷房" }: ProductJsonLdOptions) {
  return {
    "@type": "Product",
    "@id": `${absoluteUrl(path)}#product`,
    name: cleanText(name),
    description: cleanDescription(description),
    image: images.filter(Boolean).map((image) => absoluteUrl(image)),
    brand: {
      "@type": "Brand",
      name: BRAND_NAME,
    },
    manufacturer: {
      "@id": `${SITE_URL}/#organization`,
    },
    category,
  };
}

export function creativeWorkJsonLd({
  path,
  name,
  description,
  image,
  datePublished,
  location,
}: CreativeWorkJsonLdOptions) {
  return {
    "@type": "CreativeWork",
    "@id": `${absoluteUrl(path)}#creativework`,
    name: cleanText(name),
    headline: cleanText(name),
    description: cleanDescription(description),
    url: absoluteUrl(path),
    ...(image ? { image: [absoluteUrl(image)] } : {}),
    ...(datePublished ? { datePublished: String(datePublished) } : {}),
    ...(location ? { contentLocation: { "@type": "Place", name: cleanText(location) } } : {}),
    publisher: {
      "@id": `${SITE_URL}/#organization`,
    },
  };
}

export function articleJsonLd({
  path,
  headline,
  description,
  image,
  datePublished,
  dateModified,
}: ArticleJsonLdOptions) {
  return {
    "@type": "Article",
    "@id": `${absoluteUrl(path)}#article`,
    headline: cleanText(headline),
    description: cleanDescription(description),
    url: absoluteUrl(path),
    inLanguage: "zh-CN",
    ...(image ? { image: [absoluteUrl(image)] } : {}),
    ...(datePublished ? { datePublished } : {}),
    ...(dateModified || datePublished ? { dateModified: dateModified || datePublished } : {}),
    author: {
      "@id": `${SITE_URL}/#organization`,
    },
    publisher: {
      "@id": `${SITE_URL}/#organization`,
    },
  };
}

export function jsonLdGraph(nodes: Array<Record<string, unknown>>) {
  return {
    "@context": "https://schema.org",
    "@graph": nodes,
  };
}
