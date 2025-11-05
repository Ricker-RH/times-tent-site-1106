import "server-only";

const LIBRE_ENDPOINT = resolveLibreEndpoint();
const LIBRE_API_KEY = process.env.LIBRE_TRANSLATE_API_KEY?.trim();
const REQUEST_TIMEOUT_MS = 45_000;
const DEFAULT_SERVICE = process.env.TRANSLATION_SERVICE?.trim().toLowerCase() ?? (LIBRE_ENDPOINT ? "libre" : "google");

export interface TranslateEntry {
  id: string;
  text: string;
  context?: string | null;
}

export interface TranslateRequest {
  sourceLocale: string;
  targetLocales: string[];
  entries: TranslateEntry[];
  tone?: "formal" | "neutral" | "marketing";
}

export interface TranslateResult {
  id: string;
  translations: Record<string, string>;
}

export interface TranslateResponse {
  results: TranslateResult[];
}

export class TranslationError extends Error {
  constructor(
    message: string,
    public readonly status: number = 500,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "TranslationError";
  }
}

export function assertCanTranslate(): void {
  if (DEFAULT_SERVICE === "libre" && !LIBRE_ENDPOINT) {
    throw new TranslationError("未配置可用的翻译服务地址。", 503);
  }
}

export async function translateEntries(request: TranslateRequest): Promise<TranslateResponse> {
  if (!request.entries.length) {
    return { results: [] };
  }

  if (DEFAULT_SERVICE === "libre") {
    assertCanTranslate();
    return translateViaLibre(request);
  }

  return translateViaGoogle(request);
}

async function translateViaLibre(request: TranslateRequest): Promise<TranslateResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const results: TranslateResult[] = [];

    for (const entry of request.entries) {
      const translations: Record<string, string> = {};

      for (const target of request.targetLocales) {
        if (target === request.sourceLocale) continue;

        const response = await fetch(LIBRE_ENDPOINT!, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            q: entry.text,
            source: mapLocale(request.sourceLocale),
            target: mapLocale(target),
            format: "text",
            api_key: LIBRE_API_KEY || undefined,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errorText = await response.text().catch(() => "");
          throw new TranslationError("翻译接口调用失败", response.status, errorText);
        }

        const data = (await response.json()) as { translatedText?: string };
        translations[target] = data.translatedText?.trim() ?? "";
      }

      results.push({ id: entry.id, translations });
    }

    return { results };
  } catch (error) {
    if (error instanceof TranslationError) {
      throw error;
    }
    if ((error as Error).name === "AbortError") {
      throw new TranslationError("翻译请求超时", 504);
    }
    throw new TranslationError("翻译过程发生异常", 500, error);
  } finally {
    clearTimeout(timeout);
  }
}

async function translateViaGoogle(request: TranslateRequest): Promise<TranslateResponse> {
  const results: TranslateResult[] = [];

  for (const entry of request.entries) {
    const translations: Record<string, string> = {};

    for (const target of request.targetLocales) {
      if (target === request.sourceLocale) continue;

      const url = buildGoogleUrl(request.sourceLocale, target, entry.text);
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; SiteConfigTranslator/1.0)",
        },
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        throw new TranslationError("翻译接口调用失败", response.status, errorText);
      }

      const data = (await response.json()) as GoogleTranslateResponse;
      const translated = extractTranslatedText(data);
      translations[target] = translated;
    }

    results.push({ id: entry.id, translations });
  }

  return { results };
}

function resolveLibreEndpoint(): string | null {
  const envUrl = process.env.LIBRE_TRANSLATE_URL?.trim();
  if (!envUrl) return null;
  const normalized = envUrl.endsWith("/translate") ? envUrl : `${envUrl.replace(/\/$/, "")}/translate`;
  return normalized;
}

function mapLocale(raw: string): string {
  const value = raw?.toLowerCase() ?? "";
  if (!value) return "auto";

  if (value.startsWith("zh")) return "zh";
  if (value.startsWith("en")) return "en";
  if (value.startsWith("ja")) return "ja";
  if (value.startsWith("ko")) return "ko";
  if (value.startsWith("de")) return "de";
  if (value.startsWith("fr")) return "fr";
  if (value.startsWith("es")) return "es";
  if (value.startsWith("ru")) return "ru";
  if (value.startsWith("ar")) return "ar";

  const segments = value.split(/[\-_]/);
  return segments[0] || "auto";
}

function buildGoogleUrl(source: string, target: string, text: string): string {
  const base = "https://translate.googleapis.com/translate_a/single";
  const params = new URLSearchParams({
    client: "gtx",
    sl: mapLocale(source),
    tl: mapLocale(target),
    dt: "t",
    q: text,
  });
  return `${base}?${params.toString()}`;
}

type GoogleTranslateResponse = [
  Array<Array<[string, string, string, string]>>,
  unknown,
  string?,
  unknown?,
  unknown?,
  unknown?,
  unknown?,
  unknown?,
];

function extractTranslatedText(payload: GoogleTranslateResponse): string {
  const segments = payload?.[0] ?? [];
  const buffer: string[] = [];

  for (const segment of segments as unknown[]) {
    const text = resolveSegmentText(segment);
    if (text) {
      buffer.push(text);
    }
  }

  return buffer.join("").trim();
}

function resolveSegmentText(segment: unknown): string | null {
  if (!segment) return null;

  if (typeof segment === "string") {
    return segment;
  }

  if (Array.isArray(segment)) {
    // Google Translate may return nested arrays; the first string element is the translated chunk.
    const [first] = segment;
    if (typeof first === "string") {
      return first;
    }
    if (Array.isArray(first) && typeof first[0] === "string") {
      return first[0];
    }
  }

  return null;
}
