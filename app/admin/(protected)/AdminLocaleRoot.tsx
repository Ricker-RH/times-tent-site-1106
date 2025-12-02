"use client";

import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import { LocaleProvider } from "@/providers/LocaleProvider";
import { ToastProvider, useToast } from "@/providers/ToastProvider";

function SessionGuard() {
  const toast = useToast();
  const timerRef = useRef<number | null>(null);
  const hasRedirectedRef = useRef(false);
  const mountedAtRef = useRef<number>(Date.now());
  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch("/admin/session/check", { method: "GET", headers: { "cache-control": "no-store" } });
        if (res.status === 409) {
          toast.info("提示", "账号已在另一设备登录，本设备将退出");
          if (hasRedirectedRef.current) return;
          // 避免刚登录时的瞬时状态抖动，延迟触发一次重定向
          const elapsed = Date.now() - (mountedAtRef.current || Date.now());
          const doRedirect = () => {
            hasRedirectedRef.current = true;
            const currentPath = typeof window !== "undefined" ? window.location.pathname : "/admin";
            const next = encodeURIComponent(currentPath.startsWith("/") ? currentPath : "/admin");
            window.location.href = `/admin/session/conflict?next=${next}`;
          };
          if (elapsed < 1200) {
            window.setTimeout(doRedirect, 800);
          } else {
            doRedirect();
          }
        }
      } catch {}
    };
    const onFocus = () => check();
    window.addEventListener("focus", onFocus);
    // 首次检查延迟，避免登录后立即触发抖动
    timerRef.current = window.setInterval(check, 5000);
    const first = window.setTimeout(check, 1000);
    return () => {
      window.removeEventListener("focus", onFocus);
      if (timerRef.current) window.clearInterval(timerRef.current);
      window.clearTimeout(first);
    };
  }, [toast]);
  return null;
}

export default function AdminLocaleRoot({ children }: { children: ReactNode }) {
  return (
    <LocaleProvider>
      <ToastProvider>
        <SessionGuard />
        {children}
      </ToastProvider>
    </LocaleProvider>
  );
}
