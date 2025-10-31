"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Props = { isSuperadmin?: boolean };

export default function AdminWatermarkToggle({ isSuperadmin = false }: Props) {
  const [enabled, setEnabled] = useState<boolean>(false);
  const router = useRouter();

  useEffect(() => {
    try {
      const match = document.cookie.split("; ").find((row) => row.startsWith("ADMIN_WATERMARK_OVERRIDE="));
      if (match) {
        const value = match.split("=")[1];
        setEnabled(value === "true");
      }
    } catch {}
  }, []);

  const toggle = () => {
    const next = !enabled;
    setEnabled(next);
    const maxAge = 60 * 60 * 24 * 365; // 1 year
    document.cookie = `ADMIN_WATERMARK_OVERRIDE=${next ? "true" : "false"}; Max-Age=${maxAge}; Path=/; SameSite=Lax`;
    try {
      router.refresh();
    } catch {}
  };

  if (!isSuperadmin) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      className={`ml-2 rounded-full border px-3 py-1 text-xs font-semibold transition ${
        enabled
          ? "border-[var(--color-brand-primary)] text-[var(--color-brand-primary)]"
          : "border-[var(--color-border)] text-[var(--color-text-secondary)]"
      }`}
      title={enabled ? "水印已开启（仅本机）" : "水印已关闭"}
    >
      水印：{enabled ? "开" : "关"}
    </button>
  );
}
