import { NextResponse } from "next/server";

import { AdminRedirectError, requireAdmin } from "@/server/auth";

export async function GET(): Promise<Response> {
  try {
    await requireAdmin();
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    if (error instanceof AdminRedirectError) {
      const url = new URL(error.location, "http://localhost");
      const reason = url.searchParams.get("reason");
      if (reason === "conflict") {
        return NextResponse.json({ ok: false, reason: "conflict" }, { status: 409 });
      }
      return NextResponse.json({ ok: false }, { status: 401 });
    }
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
