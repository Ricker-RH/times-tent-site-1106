"use server";

import { redirect } from "next/navigation";

import { createAdminSession, verifyCredentials } from "@/server/auth";
import { headers } from "next/headers";
import { recordAdminLogin } from "@/server/adminActivity";

export type LoginActionState =
  | { status: "idle" }
  | { status: "error"; message: string };

function resolveNextPath(next: unknown): string {
  if (typeof next === "string" && next.startsWith("/")) {
    return next;
  }
  return "/admin";
}

export async function loginAction(_prevState: LoginActionState, formData: FormData): Promise<LoginActionState> {
  const identifier = formData.get("identifier");
  const password = formData.get("password");
  const next = formData.get("next");

  if (typeof identifier !== "string" || !identifier.trim() || typeof password !== "string" || !password) {
    return { status: "error", message: "请输入账号和密码" };
  }

  try {
    const session = await verifyCredentials(identifier, password);
    if (!session) {
      return { status: "error", message: "账号或密码错误" };
    }

    await createAdminSession(session);
    try {
      const h = headers();
      const ip = h.get("x-forwarded-for") || h.get("x-real-ip") || null;
      const ua = h.get("user-agent") || null;
      if (session.username) {
        await recordAdminLogin(session.username, ip, ua);
      }
    } catch {}
    redirect(resolveNextPath(next));
  } catch (error) {
    console.error("loginAction failed", error);
    return { status: "error", message: "登录失败，请稍后再试" };
  }
}
