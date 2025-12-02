"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/server/auth";
import { query } from "@/server/db";

export async function verifyHumanAction(formData: FormData) {
  const username = formData.get("username");
  const hash = formData.get("hash");
  const answer = formData.get("answer");
  if (typeof username !== "string") redirect("/admin/users");
  const hashed = typeof hash === "string" ? hash.trim() : "";
  const providedRaw = typeof answer === "string" ? answer : "";
  const provided = providedRaw.replace(/\s+/g, "").toUpperCase();
  if (!hashed || !provided) {
    redirect(`/admin/users/${encodeURIComponent(username)}`);
  }
  try {
    const ok = await bcrypt.compare(provided, hashed);
    if (ok) {
      const store = cookies();
      store.set("tt_admin_detail_verified", "1", { httpOnly: true, maxAge: 600, path: `/admin/users/${encodeURIComponent(username)}` });
      redirect(`/admin/users/${encodeURIComponent(username)}?verified=1`);
    }
  } catch {}
  redirect(`/admin/users/${encodeURIComponent(username)}`);
}

export async function resetAdminUserPassword(formData: FormData) {
  await requireAdmin({ role: "superadmin" });

  const username = typeof formData.get("username") === "string" ? String(formData.get("username")) : "";
  const password = typeof formData.get("password") === "string" ? String(formData.get("password")) : "";

  if (!username) {
    redirect("/admin/users");
  }
  if (!password || password.length < 6 || password.length > 100) {
    redirect(`/admin/users/${encodeURIComponent(username)}?error=invalid_password`);
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    await query(`UPDATE admin_users SET password = $2 WHERE username = $1`, [username, hash]);
    revalidatePath(`/admin/users/${encodeURIComponent(username)}`);
  } catch (error) {
    // ignore error detail; redirect back
  }
  redirect(`/admin/users/${encodeURIComponent(username)}?verified=1&ok=1`);
}

export async function setAdminUserActive(formData: FormData) {
  await requireAdmin({ role: "superadmin" });
  const username = typeof formData.get("username") === "string" ? String(formData.get("username")) : "";
  const activeRaw = typeof formData.get("active") === "string" ? String(formData.get("active")) : "";
  const active = activeRaw === "true";
  if (!username) {
    redirect("/admin/users");
  }
  try {
    await query(`UPDATE admin_users SET "isActive" = $2 WHERE username = $1`, [username, active]);
    revalidatePath(`/admin/users/${encodeURIComponent(username)}`);
  } catch {}
  redirect(`/admin/users/${encodeURIComponent(username)}?verified=1&ok=1`);
}

export async function renameAdminUser(formData: FormData) {
  await requireAdmin({ role: "superadmin" });
  const username = typeof formData.get("username") === "string" ? String(formData.get("username")) : "";
  const nextUsername = typeof formData.get("nextUsername") === "string" ? String(formData.get("nextUsername")) : "";
  if (!username || !nextUsername || nextUsername.length < 3 || nextUsername.length > 50) {
    redirect("/admin/users");
  }
  try {
    const exist = await query<{ username: string }>(`SELECT username FROM admin_users WHERE username = $1 LIMIT 1`, [nextUsername]);
    if (exist.rowCount && exist.rows[0]?.username) {
      redirect(`/admin/users/${encodeURIComponent(username)}?error=username_exists`);
    }
    await query(`UPDATE admin_users SET username = $2 WHERE username = $1`, [username, nextUsername]);
    await query(`UPDATE admin_session_locks SET username = $2 WHERE username = $1`, [username, nextUsername]);
    revalidatePath(`/admin/users/${encodeURIComponent(nextUsername)}`);
    redirect(`/admin/users/${encodeURIComponent(nextUsername)}?verified=1&ok=1`);
  } catch {
    redirect(`/admin/users/${encodeURIComponent(username)}?verified=1&error=rename_failed`);
  }
}
