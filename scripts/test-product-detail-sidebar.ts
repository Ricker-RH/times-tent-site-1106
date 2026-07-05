import assert from "assert";
import { readFileSync } from "fs";

const productDetailPage = readFileSync("app/(site)/products/[slug]/page.tsx", "utf8");
const adminProductDetailEditor = readFileSync("app/admin/(protected)/[key]/ProductDetailConfigEditor.tsx", "utf8");

assert.match(
  productDetailPage,
  /md:sticky md:top-24 md:max-h-\[560px\] md:overflow-hidden/,
  "Product detail sidebar should match the product index sticky capped container.",
);

assert.match(
  productDetailPage,
  /md:max-h-\[496px\] md:overflow-y-auto md:pr-1 md:overscroll-contain/,
  "Product detail sidebar list should scroll internally like the product index page.",
);

assert.match(
  adminProductDetailEditor,
  /lg:max-h-\[560px\] lg:overflow-hidden/,
  "Admin product detail preview sidebar should cap height.",
);

assert.match(
  adminProductDetailEditor,
  /lg:max-h-\[480px\] lg:overflow-y-auto lg:pr-1 lg:overscroll-contain/,
  "Admin product detail preview sidebar list should scroll internally.",
);
