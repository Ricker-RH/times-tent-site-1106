import "server-only";

import { cookies, headers } from "next/headers";
import { unstable_noStore as noStore } from "next/cache";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { timingSafeEqual } from "crypto";

import { query } from "@/server/db";

export type AdminRole = "admin" | "superadmin";

interface AdminUserRow {
  id: string;
  username: string | null;
  email: string | null;
  password_hash: string | null;
  role: string | null;
  is_active?: boolean | null;
}

export interface AdminSession {
  id: string;
  username: string | null;
  email: string | null;
  role: AdminRole;
}

export const SESSION_COOKIE_NAME = "tt_admin_session";
const JWT_ISSUER = "times-tent-admin";
const JWT_AUDIENCE = "times-tent-admin-users";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days
export const SESSION_COOKIE_DOMAIN = process.env.ADMIN_COOKIE_DOMAIN;

function getJwtSecret(): Uint8Array {
  const secret = process.env.ADMIN_JWT_SECRET;
  if (!secret) {
    throw new Error("Missing ADMIN_JWT_SECRET environment variable");
  }
  return new TextEncoder().encode(secret);
}

function normaliseIdentifier(identifier: string): string {
  return identifier.trim();
}

async function fetchAdminUser(identifier: string): Promise<AdminUserRow | null> {
  const normalized = normaliseIdentifier(identifier);
  if (!normalized) return null;

  const result = await query<AdminUserRow>(
    `SELECT
        username AS id,
        username,
        NULL::text AS email,
        password AS password_hash,
        role,
        "isActive" AS is_active
     FROM admin_users
     WHERE username = $1
     LIMIT 1`,
    [normalized],
  );

  if (!result.rowCount) {
    return null;
  }

  const [user] = result.rows;
  if (user && user.is_active === false) {
    return null;
  }
  return user;
}

function coerceRole(value: string | null | undefined): AdminRole {
  if (value === "superadmin") return "superadmin";
  return "admin";
}

function constantTimeEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

export async function verifyCredentials(identifier: string, password: string): Promise<AdminSession | null> {
  const user = await fetchAdminUser(identifier);
  if (!user || !user.password_hash) {
    return null;
  }

  const storedHash = user.password_hash;
  let isValid = false;
  if (storedHash.startsWith("$2")) {
    isValid = await bcrypt.compare(password, storedHash);
  } else {
    isValid = constantTimeEquals(storedHash, password);
  }

  if (!isValid) {
    return null;
  }

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: coerceRole(user.role),
  };
}

export async function createAdminSession(user: AdminSession): Promise<void> {
  const token = await new SignJWT({
    role: user.role,
    username: user.username,
    email: user.email,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setSubject(user.id)
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(getJwtSecret());

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
    ...(SESSION_COOKIE_DOMAIN ? { domain: SESSION_COOKIE_DOMAIN } : {}),
  };

  cookies().set(SESSION_COOKIE_NAME, token, cookieOptions);
}

export function clearAdminSession(): void {
  const baseOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 0,
    expires: new Date(0),
  };

  cookies().delete(SESSION_COOKIE_NAME);

  const paths = ["/", "/admin", "/admin/", "/admin/login"] as const;
  const domains: Array<string | undefined> = [undefined, "localhost", SESSION_COOKIE_DOMAIN].filter(
    (value): value is string | undefined => value !== null,
  );

  paths.forEach((path) => {
    domains.forEach((domain) => {
      const options = domain ? { ...baseOptions, path, domain } : { ...baseOptions, path };
      cookies().set(SESSION_COOKIE_NAME, "", options);
      cookies().delete({ name: SESSION_COOKIE_NAME, path, ...(domain ? { domain } : {}) });
    });
  });
}

async function parseSessionFromCookie(): Promise<AdminSession | null> {
  const cookie = cookies().get(SESSION_COOKIE_NAME);
  if (!cookie?.value) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(cookie.value, getJwtSecret(), {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });

    const id = typeof payload.sub === "string" ? payload.sub : null;
    if (!id) return null;

    const role = coerceRole(typeof payload.role === "string" ? payload.role : null);

    return {
      id,
      role,
      username: typeof payload.username === "string" ? payload.username : null,
      email: typeof payload.email === "string" ? payload.email : null,
    };
  } catch (error) {
    console.error("Failed to verify admin session", error);
    return null;
  }
}

export async function getCurrentAdmin(): Promise<AdminSession | null> {
  noStore();
  return parseSessionFromCookie();
}

function buildLoginRedirect(target?: string | null): string {
  const safeTarget = (() => {
    if (!target || typeof target !== "string") {
      return "/admin";
    }
    if (!target.startsWith("/")) {
      return "/admin";
    }
    if (target.startsWith("/admin/login")) {
      return "/admin";
    }
    return target;
  })();

  if (safeTarget === "/admin") {
    return "/admin/login";
  }

  const search = new URLSearchParams({ next: safeTarget }).toString();
  return `/admin/login?${search}`;
}

export class AdminRedirectError extends Error {
  constructor(readonly location: string) {
    super(`Redirecting to ${location}`);
    this.name = "AdminRedirectError";
  }
}

export async function requireAdmin(options?: {
  role?: AdminRole;
  redirectTo?: string;
  skipRedirect?: boolean;
}): Promise<AdminSession> {
  noStore();
  const session = await getCurrentAdmin();
  if (!session) {
    const headerUrl = headers().get("x-invoke-path") ?? headers().get("x-forwarded-path") ?? options?.redirectTo;
    const location = buildLoginRedirect(headerUrl);
    throw new AdminRedirectError(location);
  }

  if (options?.role === "superadmin" && session.role !== "superadmin") {
    redirect("/admin?error=forbidden");
  }

  return session;
}
