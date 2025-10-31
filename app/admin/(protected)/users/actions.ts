"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { AdminRedirectError, requireAdmin } from "@/server/auth";
import { query } from "@/server/db";

export type CreateAdminUserActionState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

function normalizeUsername(input: unknown): string {
  if (typeof input !== "string") return "";
  return input.trim();
}

function normalizePassword(input: unknown): string {
  if (typeof input !== "string") return "";
  return input;
}

function normalizeRole(input: unknown): "admin" | "superadmin" {
  const value = typeof input === "string" ? input.trim() : "admin";
  return value === "superadmin" ? "superadmin" : "admin";
}

async function ensureSuperAdmin() {
  try {
    return await requireAdmin({ role: "superadmin" });
  } catch (error) {
    if (error instanceof AdminRedirectError) {
      redirect(error.location);
    }
    throw error;
  }
}

export async function createAdminUserAction(_prev: CreateAdminUserActionState, formData: FormData): Promise<CreateAdminUserActionState> {
  await ensureSuperAdmin();

  const username = normalizeUsername(formData.get("username"));
  const password = normalizePassword(formData.get("password"));
  const role = normalizeRole(formData.get("role"));

  if (!username || username.length < 3 || username.length > 50) {
    return { status: "error", message: "用户名长度需在 3–50 之间" };
  }
  if (!password || password.length < 6 || password.length > 100) {
    return { status: "error", message: "密码长度需在 6–100 之间" };
  }

  try {
    // 检查是否已存在
    const existRes = await query<{ username: string }>(
      `SELECT username FROM admin_users WHERE username = $1 LIMIT 1`,
      [username]
    );
    if (existRes.rowCount && existRes.rows[0]?.username) {
      return { status: "error", message: "用户名已存在" };
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes("relation") && msg.includes("does not exist")) {
      return { status: "error", message: "缺少 admin_users 表，请在数据库中创建后重试" };
    }
    console.error("Failed to check existing admin user", error);
    return { status: "error", message: "创建失败，请稍后再试" };
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    await query(
      `INSERT INTO admin_users (username, password, role, "isActive") VALUES ($1, $2, $3, TRUE)`,
      [username, hash, role]
    );
    revalidatePath("/admin/users");
    return { status: "success", message: "创建成功" };
  } catch (error) {
    console.error("Failed to create admin user", error);
    return { status: "error", message: "创建失败，请稍后再试" };
  }
}
