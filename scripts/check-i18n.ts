import { products_cards } from "@/data/configs";
import {
  FALLBACK_HOME_CONFIG,
  FALLBACK_PRODUCT_CENTER_CONFIG,
  FALLBACK_PRIVACY_POLICY_CONFIG,
  FALLBACK_TERMS_CONFIG,
} from "@/constants/siteFallbacks";
import { createMissingLocaleRecord, formatMissingLocaleRecord } from "@/i18n/validation";
import { SUPPORTED_LOCALES } from "@/i18n/locales";

interface Issue {
  message: string;
  category: "data" | "fallback";
}

const issues: Issue[] = [];

function auditLocalizedField(value: unknown, path: string, category: Issue["category"]): void {
  if (typeof value === "string") {
    issues.push({
      category,
      message: `${path}: 仅检测到单一语言字符串（需改为 { zh-CN, zh-TW, en } 结构）`,
    });
    return;
  }

  const record = createMissingLocaleRecord(value, path, SUPPORTED_LOCALES);
  if (record) {
    issues.push({ category, message: formatMissingLocaleRecord(record) });
  }
}

products_cards.forEach((product, index) => {
  ["title", "tagline", "description"].forEach((key) => {
    const value = (product as Record<string, unknown>)[key];
    if (value !== undefined) {
      auditLocalizedField(value, `products_cards[${index}].${key}`, "data");
    }
  });
});

const fallbackHome = FALLBACK_HOME_CONFIG;
if (fallbackHome.hero) {
  ["badge", "title", "description", "ctaPrimary", "ctaSecondary"].forEach((key) => {
    const value = (fallbackHome.hero as Record<string, unknown>)[key];
    if (value !== undefined) {
      auditLocalizedField(value, `FALLBACK_HOME_CONFIG.hero.${key}`, "fallback");
    }
  });
}

auditLocalizedField(fallbackHome.productShowcase?.heading, "FALLBACK_HOME_CONFIG.productShowcase.heading", "fallback");
auditLocalizedField(fallbackHome.inventoryHighlight?.heading, "FALLBACK_HOME_CONFIG.inventoryHighlight.heading", "fallback");
auditLocalizedField(fallbackHome.applicationAreas?.heading, "FALLBACK_HOME_CONFIG.applicationAreas.heading", "fallback");
auditLocalizedField(
  (fallbackHome.productShowcase as Record<string, unknown>)?.viewAllLabel,
  "FALLBACK_HOME_CONFIG.productShowcase.viewAllLabel",
  "fallback",
);

auditLocalizedField(
  FALLBACK_PRODUCT_CENTER_CONFIG.hero?.title,
  "FALLBACK_PRODUCT_CENTER_CONFIG.hero.title",
  "fallback",
);
auditLocalizedField(
  FALLBACK_PRODUCT_CENTER_CONFIG.hero?.description,
  "FALLBACK_PRODUCT_CENTER_CONFIG.hero.description",
  "fallback",
);

auditLocalizedField(FALLBACK_PRIVACY_POLICY_CONFIG.title, "FALLBACK_PRIVACY_POLICY_CONFIG.title", "fallback");
auditLocalizedField(FALLBACK_TERMS_CONFIG.title, "FALLBACK_TERMS_CONFIG.title", "fallback");

const hasIssues = issues.length > 0;

if (hasIssues) {
  console.log("\u274c 国际化检查发现以下问题：\n");
  issues.forEach((issue) => {
    console.log(`- [${issue.category}] ${issue.message}`);
  });
  process.exitCode = 1;
} else {
  console.log("\u2705 所选内容已覆盖所有支持语言。");
}
