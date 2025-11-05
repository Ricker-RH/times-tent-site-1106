import { NextResponse } from "next/server";

import {
  TranslationError,
  assertCanTranslate,
  translateEntries,
  type TranslateEntry,
  type TranslateRequest,
} from "@/server/translation";

interface ApiRequestBody {
  sourceLocale?: string;
  targetLocales?: string[];
  entries?: Array<TranslateEntry & { skipLocales?: string[] }>;
  tone?: "formal" | "neutral" | "marketing";
}

const MAX_ENTRIES = 50;
const MAX_TEXT_LENGTH = 5000; // per entry

export async function POST(request: Request) {
  try {
    assertCanTranslate();

    const body = (await request.json().catch(() => ({}))) as ApiRequestBody;

    const sourceLocale = (body.sourceLocale ?? "zh-CN").trim();
    const targetLocales = Array.isArray(body.targetLocales) ? body.targetLocales.map((item) => item.trim()).filter(Boolean) : [];
    const tone = body.tone;

    if (!targetLocales.length) {
      return NextResponse.json({ error: "缺少目标语言" }, { status: 400 });
    }

    const rawEntries = Array.isArray(body.entries) ? body.entries : [];
    if (!rawEntries.length) {
      return NextResponse.json({ error: "缺少翻译内容" }, { status: 400 });
    }

    if (rawEntries.length > MAX_ENTRIES) {
      return NextResponse.json({ error: `单次最多支持 ${MAX_ENTRIES} 条内容` }, { status: 400 });
    }

    const entries: TranslateEntry[] = rawEntries.map((entry, index) => {
      const id = entry.id?.trim() || `item-${index}`;
      const text = entry.text ?? "";
      const context = entry.context ?? null;
      if (typeof text !== "string" || !text.trim().length) {
        throw new TranslationError(`第 ${index + 1} 条内容为空`, 400);
      }
      if (text.length > MAX_TEXT_LENGTH) {
        throw new TranslationError(`第 ${index + 1} 条内容超过长度限制`, 400);
      }
      return {
        id,
        text: text.trim(),
        context,
      } satisfies TranslateEntry;
    });

    const dedupedTargets = Array.from(new Set(targetLocales));

    const translateRequest: TranslateRequest = {
      sourceLocale,
      targetLocales: dedupedTargets,
      entries,
      tone,
    };

    const result = await translateEntries(translateRequest);

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof TranslationError) {
      return NextResponse.json({ error: error.message, details: error.details ?? null }, { status: error.status });
    }
    console.error("Translation API error", error);
    return NextResponse.json({ error: "自动翻译失败" }, { status: 500 });
  }
}
