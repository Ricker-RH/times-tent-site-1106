import "server-only";

import { listSiteConfigSummaries, getSiteConfigRaw } from "./siteConfigs";

export type FieldType = "string" | "number" | "boolean" | "array" | "object" | "null" | "unknown";

export interface VisibilityFieldEntry {
  path: string; // e.g. hero.title, items[].name
  type: FieldType;
  section?: string; // top-level module key
  example?: string | number | boolean | null;
}

export type VisibilityFieldDictionary = Record<string, VisibilityFieldEntry[]>; // key -> fields

function detectType(value: unknown): FieldType {
  if (value === null) return "null";
  const t = typeof value;
  switch (t) {
    case "string":
      return "string";
    case "number":
      return "number";
    case "boolean":
      return "boolean";
    case "object":
      return Array.isArray(value) ? "array" : "object";
    default:
      return "unknown";
  }
}

function toArray<T>(val: T | T[] | null | undefined): T[] {
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function flattenArray(
  result: VisibilityFieldEntry[],
  arr: unknown[],
  prefix: string,
  section?: string,
) {
  // If array of primitives, record [] entry
  if (!arr.length) {
    result.push({ path: `${prefix}[]`, type: "array", section });
    return;
  }
  const first = arr[0];
  const firstType = detectType(first);
  if (firstType !== "object" && firstType !== "array") {
    result.push({ path: `${prefix}[]`, type: firstType, section, example: (typeof first === "string" || typeof first === "number" || typeof first === "boolean") ? first : undefined });
    return;
  }
  // Array of objects or arrays
  if (isPlainObject(first)) {
    flattenObject(result, first as Record<string, unknown>, `${prefix}[]`, section);
    return;
  }
  if (Array.isArray(first)) {
    flattenArray(result, first as unknown[], `${prefix}[]`, section);
    return;
  }
}

function flattenObject(
  result: VisibilityFieldEntry[],
  obj: Record<string, unknown>,
  prefix: string,
  section?: string,
) {
  for (const [key, value] of Object.entries(obj)) {
    if (key === "_meta") continue; // skip metadata blobs
    const nextPath = prefix ? `${prefix}.${key}` : key;
    const type = detectType(value);
    if (type === "object") {
      flattenObject(result, (value as Record<string, unknown>), nextPath, section ?? (prefix ? prefix.split(".")[0] : key));
    } else if (type === "array") {
      flattenArray(result, toArray(value as unknown[]), nextPath, section ?? (prefix ? prefix.split(".")[0] : key));
    } else {
      result.push({
        path: nextPath,
        type,
        section: section ?? (prefix ? prefix.split(".")[0] : key),
        example: (typeof value === "string" || typeof value === "number" || typeof value === "boolean") ? (value as any) : undefined,
      });
    }
  }
}

export async function buildVisibilityFieldDictionary(): Promise<VisibilityFieldDictionary> {
  const summaries = await listSiteConfigSummaries();
  const dict: VisibilityFieldDictionary = {};

  for (const summary of summaries) {
    const key = summary.key;
    if (!key || key === "页面可见性") continue; // skip visibility itself

    const raw = await getSiteConfigRaw(key);
    if (!raw || typeof raw !== "object") {
      // If no stored config, skip silently; super admin可见页面仍可显示但无字段
      continue;
    }

    const fields: VisibilityFieldEntry[] = [];
    flattenObject(fields, raw as Record<string, unknown>, "");

    // natural sort by section then path
    fields.sort((a, b) => {
      const sa = a.section ?? "";
      const sb = b.section ?? "";
      if (sa !== sb) return sa.localeCompare(sb);
      return a.path.localeCompare(b.path);
    });

    dict[key] = fields;
  }

  return dict;
}
