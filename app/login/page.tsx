import { redirect } from "next/navigation";

// Pass through any query string (e.g., ?next=/admin) to /admin/login
type SearchParams = { [key: string]: string | string[] | undefined };

function buildQuery(searchParams: SearchParams = {}) {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === "string") {
      if (value) qs.append(key, value);
    } else if (Array.isArray(value)) {
      for (const v of value) if (typeof v === "string" && v) qs.append(key, v);
    }
  }
  const s = qs.toString();
  return s ? `?${s}` : "";
}

export default function LoginAliasPage({ searchParams }: { searchParams?: SearchParams }) {
  const suffix = buildQuery(searchParams || {});
  redirect("/admin/login" + suffix);
}