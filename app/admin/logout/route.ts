import { NextResponse } from "next/server";

import { SESSION_COOKIE_DOMAIN, SESSION_COOKIE_NAME } from "@/server/auth";

function appendExpiredCookie(response: NextResponse, path: string, domain?: string): void {
  const attributes = [
    `${SESSION_COOKIE_NAME}=`,
    `Path=${path}`,
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
    "Max-Age=0",
    "HttpOnly",
    "SameSite=Lax",
  ];

  if (domain) {
    attributes.push(`Domain=${domain}`);
  }

  if (process.env.NODE_ENV === "production") {
    attributes.push("Secure");
  }

  response.headers.append("Set-Cookie", attributes.join("; "));
}

function buildLogoutResponse(request: Request): NextResponse {
  const redirectUrl = new URL("/admin/login", request.url);
  const response = NextResponse.redirect(redirectUrl, { status: 303 });
  response.headers.set("Cache-Control", "no-store, must-revalidate");

  const paths = ["/", "/admin", "/admin/", "/admin/login"] as const;
  const domains = ["localhost", SESSION_COOKIE_DOMAIN].filter((value): value is string => Boolean(value));

  paths.forEach((path) => {
    appendExpiredCookie(response, path);
  });

  domains.forEach((domain) => {
    paths.forEach((path) => {
      appendExpiredCookie(response, path, domain);
    });
  });

  return response;
}

export async function POST(request: Request): Promise<Response> {
  return buildLogoutResponse(request);
}

export async function GET(request: Request): Promise<Response> {
  return buildLogoutResponse(request);
}
