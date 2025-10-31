import { NextResponse } from "next/server";

import { createContactSubmission } from "@/server/contactSubmissions";

function sanitizeString(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > maxLength) {
    return trimmed.slice(0, maxLength);
  }
  return trimmed;
}

function sanitizeScenario(value: unknown): string | null {
  const allowed = new Set(["sports", "hospitality", "industrial", "brand", "other"]);
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  if (allowed.has(normalized)) return normalized;
  return "other";
}

export async function POST(request: Request) {
  try {
    const data = await request.json().catch(() => null);
    if (!data || typeof data !== "object") {
      return NextResponse.json({ message: "请求格式无效" }, { status: 400 });
    }

    const name = sanitizeString((data as Record<string, unknown>).name, 120);
    const emailRaw = sanitizeString((data as Record<string, unknown>).email, 200);

    if (!name) {
      return NextResponse.json({ message: "请填写联系人" }, { status: 400 });
    }
    if (!emailRaw) {
      return NextResponse.json({ message: "请填写邮箱" }, { status: 400 });
    }

    const email = emailRaw.toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ message: "邮箱格式不正确" }, { status: 400 });
    }

    const company = sanitizeString((data as Record<string, unknown>).company, 200);
    const phone = sanitizeString((data as Record<string, unknown>).phone, 60);
    const scenario = sanitizeScenario((data as Record<string, unknown>).scenario ?? null);
    const timeline = sanitizeString((data as Record<string, unknown>).timeline, 160);
    const brief = sanitizeString((data as Record<string, unknown>).brief, 2000);

    const headers = request.headers;
    const userAgent = headers.get("user-agent");
    const ipAddress = headers.get("x-forwarded-for")?.split(",").shift()?.trim() ?? null;
    const sourcePath = sanitizeString((data as Record<string, unknown>).sourcePath, 255) ?? headers.get("referer");

    await createContactSubmission({
      name,
      company,
      email,
      phone,
      scenario,
      timeline,
      brief,
      payload: data as Record<string, unknown>,
      sourcePath,
      userAgent,
      ipAddress,
    });

    return NextResponse.json({ message: "提交成功" });
  } catch (error) {
    console.error("Failed to create contact submission", error);
    const message = error instanceof Error ? error.message : "提交失败，请稍后再试";
    return NextResponse.json({ message }, { status: 500 });
  }
}
