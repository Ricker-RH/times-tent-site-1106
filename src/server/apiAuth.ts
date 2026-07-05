import "server-only";

import { NextResponse } from "next/server";

import { AdminRedirectError, requireAdmin } from "@/server/auth";

export async function ensureApiAdmin(): Promise<NextResponse | null> {
  try {
    await requireAdmin({ redirectTo: "/admin" });
    return null;
  } catch (error) {
    if (error instanceof AdminRedirectError) {
      return NextResponse.json({ error: "未登录或会话已过期" }, { status: 401 });
    }
    throw error;
  }
}
