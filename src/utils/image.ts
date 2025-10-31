const ABSOLUTE_PATTERN = /^(https?:\/\/|data:image\/|blob:)/i;
const RELATIVE_ALLOWED_PATTERN = /^[\w\-./]+$/;

function normalizeLeadingSlash(value: string): string {
  return `/${value.replace(/^\/+/u, "")}`;
}

/**
 * Sanitizes a user-provided image source. Returns `null` when the input cannot be safely used.
 */
export function sanitizeImageSrc(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("//")) {
    return `https:${trimmed}`;
  }

  if (ABSOLUTE_PATTERN.test(trimmed)) {
    return trimmed;
  }

  if (trimmed.startsWith("/")) {
    return normalizeLeadingSlash(trimmed);
  }

  if (RELATIVE_ALLOWED_PATTERN.test(trimmed) && trimmed.includes(".")) {
    return normalizeLeadingSlash(trimmed);
  }

  return null;
}

/**
 * Resolves a user-provided image source to a safe string, or falls back to the provided default.
 */
export function resolveImageSrc(value: unknown, fallback: string): string {
  return sanitizeImageSrc(value) ?? fallback;
}
