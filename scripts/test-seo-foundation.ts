import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const fromRoot = (filePath: string) => path.join(root, filePath);
const read = (filePath: string) => readFileSync(fromRoot(filePath), "utf8");

const requiredFiles = [
  "src/lib/seo.ts",
  "app/robots.ts",
  "app/sitemap.ts",
  "app/(site)/page.tsx",
  "app/(site)/products/page.tsx",
  "app/(site)/products/[slug]/page.tsx",
  "app/(site)/cases/[category]/page.tsx",
  "app/(site)/cases/[category]/[slug]/page.tsx",
  "app/(site)/news/[slug]/page.tsx",
];

for (const filePath of requiredFiles) {
  assert.ok(existsSync(fromRoot(filePath)), `${filePath} should exist`);
}

const seoHelpers = read("src/lib/seo.ts");
assert.match(seoHelpers, /SITE_URL/, "SEO helpers should expose the canonical site origin");
assert.match(seoHelpers, /absoluteUrl/, "SEO helpers should build absolute URLs");
assert.match(seoHelpers, /jsonLdScriptProps/, "SEO helpers should escape and render JSON-LD safely");
assert.match(seoHelpers, /buildMetadata/, "SEO helpers should centralize page metadata");
assert.match(seoHelpers, /max-image-preview/, "SEO helpers should allow large image previews");

const rootLayout = read("app/layout.tsx");
assert.match(rootLayout, /metadataBase/, "Root metadata should define metadataBase");
assert.match(rootLayout, /defaultRobots/, "Root metadata should reuse default robots rules");

const homePage = read("app/(site)/page.tsx");
assert.match(homePage, /Organization/, "Home page should expose Organization JSON-LD");
assert.match(homePage, /WebSite/, "Home page should expose WebSite JSON-LD");

const productsPage = read("app/(site)/products/page.tsx");
assert.match(productsPage, /CollectionPage/, "Products page should expose CollectionPage JSON-LD");
assert.match(productsPage, /ItemList/, "Products page should expose ItemList JSON-LD");

const productDetailPage = read("app/(site)/products/[slug]/page.tsx");
assert.match(productDetailPage, /Product/, "Product detail pages should expose Product JSON-LD");
assert.match(productDetailPage, /BreadcrumbList/, "Product detail pages should expose BreadcrumbList JSON-LD");

const caseCategoryPage = read("app/(site)/cases/[category]/page.tsx");
assert.match(caseCategoryPage, /CollectionPage/, "Case category pages should expose CollectionPage JSON-LD");
assert.match(caseCategoryPage, /ItemList/, "Case category pages should expose ItemList JSON-LD");

const caseDetailPage = read("app/(site)/cases/[category]/[slug]/page.tsx");
assert.match(caseDetailPage, /CreativeWork/, "Case detail pages should expose CreativeWork JSON-LD");
assert.match(caseDetailPage, /BreadcrumbList/, "Case detail pages should expose BreadcrumbList JSON-LD");

const newsDetailPage = read("app/(site)/news/[slug]/page.tsx");
assert.match(newsDetailPage, /Article/, "News detail pages should expose Article JSON-LD");
assert.match(newsDetailPage, /BreadcrumbList/, "News detail pages should expose BreadcrumbList JSON-LD");

console.log("SEO foundation checks passed");
