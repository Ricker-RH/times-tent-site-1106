import "server-only";

import { getCasesConfig, type CaseCategory, type CaseStudy } from "./pageConfigs";

export async function fetchCasesConfig() {
  return getCasesConfig();
}

export async function fetchCaseCategories(): Promise<ReadonlyArray<CaseCategory>> {
  const config = await getCasesConfig();
  return config.categories;
}

export async function fetchCaseCategoryBySlug(slug: string): Promise<CaseCategory | null> {
  const config = await getCasesConfig();
  return config.categories.find((category) => category.slug === slug) ?? null;
}

export async function fetchCaseStudyBySlug(slug: string): Promise<{ category: CaseCategory; study: CaseStudy } | null> {
  const config = await getCasesConfig();
  for (const category of config.categories) {
    const study = category.studies.find((item) => item.slug === slug);
    if (study) {
      return { category, study };
    }
  }
  return null;
}

export async function fetchCaseStudy(categorySlug: string, studySlug: string): Promise<{ category: CaseCategory; study: CaseStudy } | null> {
  const config = await getCasesConfig();
  const category = config.categories.find((item) => item.slug === categorySlug);
  if (!category) {
    return null;
  }
  const study = category.studies.find((item) => item.slug === studySlug);
  if (!study) {
    return null;
  }
  return { category, study };
}
