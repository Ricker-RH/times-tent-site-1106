"use client";

import { createContext, useContext, useMemo, useRef, useState, useEffect } from "react";

type ToastKind = "success" | "error" | "info";

export type ToastOptions = {
  id?: string;
  kind?: ToastKind;
  title?: string;
  description?: string;
  durationMs?: number; // default 2400ms
};

type ToastItem = Required<Omit<ToastOptions, "durationMs">> & { durationMs: number };

type ToastAPI = {
  show: (opts?: ToastOptions) => string;
  success: (title?: string, description?: string) => string;
  error: (title?: string, description?: string) => string;
  info: (title?: string, description?: string) => string;
  dismiss: (id: string) => void;
};

const ToastContext = createContext<ToastAPI | null>(null);

export function useToast(): ToastAPI {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Fallback no-op to avoid crashes if provider missing
    return {
      show: () => "",
      success: () => "",
      error: () => "",
      info: () => "",
      dismiss: () => {},
    };
  }
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef<Record<string, number>>({});
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const api: ToastAPI = useMemo(() => {
    const genId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const show = (opts?: ToastOptions) => {
      const id = opts?.id ?? genId();
      const kind: ToastKind = opts?.kind ?? "info";
      const title = opts?.title ?? (kind === "success" ? "保存成功" : kind === "error" ? "操作失败" : "提示");
      const description = opts?.description ?? "";
      const durationMs = opts?.durationMs ?? 2400;
      const item: ToastItem = { id, kind, title, description, durationMs };
      setToasts((prev) => [...prev, item]);
      // auto dismiss
      const timer = window.setTimeout(() => dismiss(id), durationMs);
      timersRef.current[id] = timer;
      return id;
    };

    const success = (title?: string, description?: string) => show({ kind: "success", title: title ?? "保存成功", description });
    const error = (title?: string, description?: string) => show({ kind: "error", title: title ?? "操作失败", description });
    const info = (title?: string, description?: string) => show({ kind: "info", title: title ?? "提示", description });

    const dismiss = (id: string) => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      const timer = timersRef.current[id];
      if (timer) {
        window.clearTimeout(timer);
        delete timersRef.current[id];
      }
    };

    return { show, success, error, info, dismiss };
  }, []);

  return (
    <ToastContext.Provider value={api}>
      {children}
      {/* Portal container */}
      {mounted ? (
        <div className="pointer-events-none fixed top-16 right-6 z-[1000] flex w-[360px] max-w-[90vw] flex-col gap-3">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start gap-3 rounded-2xl border p-4 shadow-lg transition-all ${
                t.kind === "success"
                  ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                  : t.kind === "error"
                  ? "border-red-300 bg-red-50 text-red-900"
                  : "border-slate-300 bg-white text-slate-900"
              }`}
            >
              <div className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                t.kind === "success" ? "bg-emerald-500 text-white" : t.kind === "error" ? "bg-red-500 text-white" : "bg-slate-600 text-white"
              }`}>
                {t.kind === "success" ? "✓" : t.kind === "error" ? "!" : "i"}
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold">{t.title}</div>
                {t.description ? <div className="mt-1 text-xs text-[var(--color-text-tertiary,#8690a3)]">{t.description}</div> : null}
              </div>
              <button
                type="button"
                onClick={() => api.dismiss(t.id)}
                className="ml-2 inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-300 text-xs text-slate-600 hover:bg-slate-100"
                aria-label="关闭"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </ToastContext.Provider>
  );
}
