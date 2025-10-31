import { getProductCenterConfig } from "@/server/pageConfigs";
import { t, DEFAULT_LOCALE } from "@/data";

import { ProductDetailConfigEditor } from "./ProductDetailConfigEditor";
import type { ProductDetailSeed } from "@/types/productDetails";

interface WrapperProps {
  configKey: string;
  initialConfig: Record<string, unknown>;
}

export async function ProductDetailConfigEditorWrapper({ configKey, initialConfig }: WrapperProps) {
  const productCenter = await getProductCenterConfig();
  const seeds = productCenter.products.reduce<Record<string, ProductDetailSeed>>(
    (acc, product) => {
      if (!product.slug) return acc;
      const resolve = (value: unknown): string => {
        if (!value) return "";
        if (typeof value === "string") return value;
        if (typeof value === "object") {
          const result = t(value as Record<string, string | undefined>, DEFAULT_LOCALE);
          return result || "";
        }
        return "";
      };
      const hasOwn = (target: unknown, key: string): boolean =>
        target !== null && typeof target === "object" && Object.prototype.hasOwnProperty.call(target, key);
      const summaryHasOwn = hasOwn(product, "summary") || hasOwn(product, "summaryEn");
      const summaryText = resolve(product.summary);
      const summaryLegacy = hasOwn(product, "summaryEn")
        ? resolve((product as unknown as Record<string, unknown>).summaryEn)
        : "";
      const taglineText = resolve(product.tagline);
      let summary = summaryText || summaryLegacy;
      if (summaryHasOwn && summary.trim().length === 0) {
        summary = "";
      }
      if (!summaryHasOwn && summary.trim().length === 0) {
        summary = taglineText;
      }
      acc[product.slug] = {
        title: resolve(product.name) || product.slug,
        summary,
        tagline: taglineText,
      };
      return acc;
    },
    {},
  );
  const productOrder = productCenter.products
    .map((product) => product.slug || "")
    .filter((slug): slug is string => Boolean(slug));

  return (
    <ProductDetailConfigEditor
      configKey={configKey}
      initialConfig={initialConfig}
      productSeeds={seeds}
      productOrder={productOrder}
      // 新增：传入完整产品中心配置以便详情页删除时同步移除并保存
      productCenter={productCenter as unknown as Record<string, unknown>}
    />
  );
}
