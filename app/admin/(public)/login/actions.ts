"use server";

import { redirect } from "next/navigation";

import { createAdminSession, verifyCredentials } from "@/server/auth";

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
    redirect(resolveNextPath(next));
  } catch (error) {
    console.error("loginAction failed", error);
    return { status: "error", message: "登录失败，请稍后再试" };
  }
}
