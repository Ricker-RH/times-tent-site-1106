import { promises as fs } from "fs";
import path from "path";
import { Client } from "pg";

type AdminUserSummary = {
  username: string;
  role: string | null;
  is_active: boolean | null;
};

async function exportAdminUsers(): Promise<AdminUserSummary[]> {
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) throw new Error("Missing DATABASE_URL");
  const client = new Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    const res = await client.query<AdminUserSummary>(
      `SELECT username, role, "isActive" AS is_active FROM admin_users ORDER BY role DESC, username ASC`
    );
    return res.rows;
  } finally {
    await client.end();
  }
}

async function updateDoc(users: AdminUserSummary[]) {
  const docPath = path.join(process.cwd(), "系统网址清单.txt");
  let content = "";
  try {
    content = await fs.readFile(docPath, "utf8");
  } catch {
    // If doc missing, create a minimal header
    content = "系统网址清单\n\n";
  }

  const header = "管理员账户清单（不含明文密码）";
  const startMarker = "\n" + header + "\n";
  const sectionLines = [
    header,
    ...users.map((u) => `- 用户名：${u.username}，角色：${u.role ?? "admin"}，状态：${u.is_active === false ? "已停用" : "启用"}`),
    "密码：为安全起见不记录明文。如需重置请在“管理员账号管理”页面操作。",
    "",
  ];
  const section = sectionLines.join("\n");

  // Append new section at end; if existing header present, replace it
  const existingIndex = content.lastIndexOf(header);
  let nextContent: string;
  if (existingIndex >= 0) {
    // Replace from header to end of that block
    const before = content.slice(0, existingIndex);
    nextContent = before + section;
  } else {
    nextContent = content.trimEnd() + "\n\n" + section;
  }

  await fs.writeFile(docPath, nextContent, "utf8");
}

async function main() {
  try {
    const users = await exportAdminUsers();
    await updateDoc(users);
    console.log(`Exported ${users.length} admin user(s) to 系统网址清单.txt`);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Failed to export admin users:", msg);
    console.error("Hint: Ensure DATABASE_URL is set and accessible from this environment.");
    process.exit(1);
  }
}

main();
