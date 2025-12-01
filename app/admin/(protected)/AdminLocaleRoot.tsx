"use client";

import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import { LocaleProvider } from "@/providers/LocaleProvider";
import { ToastProvider, useToast } from "@/providers/ToastProvider";

function SessionGuard() {
  const toast = useToast();
  const timerRef = useRef<number | null>(null);
  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch("/admin/session/check", { method: "GET", headers: { "cache-control": "no-store" } });
        if (res.status === 409) {
          toast.info("提示", "账号已在另一设备登录，本设备将退出");
          window.location.href = "/admin/login?reason=conflict";
        }
      } catch {}
    };
    const onFocus = () => check();
    window.addEventListener("focus", onFocus);
    timerRef.current = window.setInterval(check, 5000);
    check();
    return () => {
      window.removeEventListener("focus", onFocus);
      if (timerRef.current) window.clearInterval(timerRef.current);
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
