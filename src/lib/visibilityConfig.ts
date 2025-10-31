import { VISIBILITY_CONFIG_KEY, VISIBILITY_PAGES, type VisibilityPageDefinition, type VisibilityPageKey } from "@/constants/visibility";

export interface VisibilityPageState {
  hidden?: boolean;
  sections?: Record<string, boolean>;
  fields?: Record<string, boolean>;
}

export interface VisibilityConfig {
  pages: Record<string, VisibilityPageState>;
  _meta?: Record<string, unknown>;
}

function createPageState(definition: VisibilityPageDefinition): VisibilityPageState {
  const sections: Record<string, boolean> = {};
  definition.sections?.forEach((section) => {
    sections[section.key] = false;
  });
  return {
    hidden: false,
    sections,
    fields: {},
  } satisfies VisibilityPageState;
}

export function createDefaultVisibilityConfig(): VisibilityConfig {
  const pages: Record<string, VisibilityPageState> = {};
  VISIBILITY_PAGES.forEach((definition) => {
    pages[definition.key] = createPageState(definition);
  });
  return {
    pages,
    _meta: {
      schema: "visibility.v1",
      updatedAt: new Date(0).toISOString(),
      adminPath: `/admin/${VISIBILITY_CONFIG_KEY}`,
    },
  } satisfies VisibilityConfig;
}

export function normalizeVisibilityConfig(value: unknown): VisibilityConfig {
  const fallback = createDefaultVisibilityConfig();
  if (!value || typeof value !== "object") {
    return fallback;
  }

  const record = value as Record<string, unknown>;
  const pagesRaw = record.pages;
  const normalizedPages: Record<string, VisibilityPageState> = {};
  if (pagesRaw && typeof pagesRaw === "object") {
    for (const definition of VISIBILITY_PAGES) {
      const rawPage = (pagesRaw as Record<string, unknown>)[definition.key];
      if (!rawPage || typeof rawPage !== "object") {
        normalizedPages[definition.key] = createPageState(definition);
        continue;
      }
      const pageRecord = rawPage as Record<string, unknown>;
      const sections: Record<string, boolean> = {};
      definition.sections?.forEach((section) => {
        const flag = pageRecord.sections && typeof pageRecord.sections === "object"
          ? (pageRecord.sections as Record<string, unknown>)[section.key]
          : undefined;
        sections[section.key] = flag === true;
      });
      const fieldsRaw = pageRecord.fields && typeof pageRecord.fields === "object"
        ? (pageRecord.fields as Record<string, unknown>)
        : undefined;
      const fields: Record<string, boolean> = {};
      if (fieldsRaw) {
        for (const [key, val] of Object.entries(fieldsRaw)) {
          fields[key] = val === true;
        }
      }
      normalizedPages[definition.key] = {
        hidden: pageRecord.hidden === true,
        sections,
        fields,
      } satisfies VisibilityPageState;
    }
  } else {
    for (const definition of VISIBILITY_PAGES) {
      normalizedPages[definition.key] = createPageState(definition);
    }
  }

  const metaRaw = record._meta;
  const meta = metaRaw && typeof metaRaw === "object" ? (metaRaw as Record<string, unknown>) : undefined;

  return {
    pages: normalizedPages,
    _meta: meta,
  } satisfies VisibilityConfig;
}

export function mergeWithDefaultVisibility(config: VisibilityConfig): VisibilityConfig {
  const fallback = createDefaultVisibilityConfig();
  const pages: Record<string, VisibilityPageState> = { ...fallback.pages };
  for (const definition of VISIBILITY_PAGES) {
    const nextPage = config.pages?.[definition.key];
    if (!nextPage) continue;
    const baseSections = fallback.pages[definition.key]?.sections ?? {};
    const mergedSections: Record<string, boolean> = { ...baseSections };
    const nextSections = nextPage.sections ?? {};
    for (const key of Object.keys(baseSections)) {
      if (typeof nextSections[key] === "boolean") {
        mergedSections[key] = nextSections[key] as boolean;
      }
    }
    const baseFields = fallback.pages[definition.key]?.fields ?? {};
    const mergedFields: Record<string, boolean> = { ...baseFields };
    const nextFields = nextPage.fields ?? {};
    for (const key of Object.keys(nextFields)) {
      if (typeof nextFields[key] === "boolean") {
        mergedFields[key] = nextFields[key] as boolean;
      }
    }
    pages[definition.key] = {
      hidden: nextPage.hidden === true,
      sections: mergedSections,
      fields: mergedFields,
    } satisfies VisibilityPageState;
  }
  const mergedMeta = {
    ...fallback._meta,
    ...config._meta,
  } as Record<string, unknown> | undefined;
  return {
    pages,
    _meta: mergedMeta,
  } satisfies VisibilityConfig;
}

export function isPageHidden(config: VisibilityConfig, key: VisibilityPageKey): boolean {
  return Boolean(config.pages?.[key]?.hidden);
}

export function isSectionHidden(config: VisibilityConfig, pageKey: VisibilityPageKey, sectionKey: string): boolean {
  const sections = config.pages?.[pageKey]?.sections;
  if (!sections) return false;
  return sections[sectionKey] === true;
}

export function isFieldHidden(config: VisibilityConfig, pageKey: VisibilityPageKey, fieldPath: string): boolean {
  const fields = config.pages?.[pageKey]?.fields;
  if (!fields) return false;
  return fields[fieldPath] === true;
}

export function getHiddenSections(config: VisibilityConfig, pageKey: VisibilityPageKey): Record<string, boolean> {
  const sections = config.pages?.[pageKey]?.sections;
  if (!sections) {
    return {};
  }
  const result: Record<string, boolean> = {};
  for (const [key, value] of Object.entries(sections)) {
    result[key] = value === true;
  }
  return result;
}

export function getHiddenFields(config: VisibilityConfig, pageKey: VisibilityPageKey): Record<string, boolean> {
  const fields = config.pages?.[pageKey]?.fields;
  if (!fields) return {};
  const result: Record<string, boolean> = {};
  for (const [key, value] of Object.entries(fields)) {
    result[key] = value === true;
  }
  return result;
}

export function listHiddenPageKeys(config: VisibilityConfig): VisibilityPageKey[] {
  const keys: VisibilityPageKey[] = [];
  for (const definition of VISIBILITY_PAGES) {
    if (isPageHidden(config, definition.key)) {
      keys.push(definition.key);
    }
  }
  return keys;
}

function normalizePath(pathname: string): string {
  try {
    const url = new URL(pathname, "http://placeholder.local");
    return url.pathname;
  } catch {
    return pathname;
  }
}

export function resolvePageKeyFromPath(pathname: string): VisibilityPageKey | null {
  const normalized = normalizePath(pathname);
  const segments = normalized.split('/').filter(Boolean).length;
  for (const definition of VISIBILITY_PAGES) {
    if (definition.routePrefix) {
      if (!normalized.startsWith(definition.routePrefix) || normalized === definition.routePrefix) {
        continue;
      }
      if (typeof definition.segmentDepth === "number" && segments !== definition.segmentDepth) {
        continue;
      }
      return definition.key;
    }
  }
  for (const definition of VISIBILITY_PAGES) {
    if (!definition.route) {
      continue;
    }
    if (normalized === definition.route) {
      if (typeof definition.segmentDepth === "number" && segments !== definition.segmentDepth) {
        continue;
      }
      return definition.key;
    }
  }
  return null;
}

export { VISIBILITY_CONFIG_KEY };
