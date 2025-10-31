"use client";

import type { ReactNode } from "react";
import { LocaleProvider } from "@/providers/LocaleProvider";
import { ToastProvider } from "@/providers/ToastProvider";

export default function AdminLocaleRoot({ children }: { children: ReactNode }) {
  return <LocaleProvider><ToastProvider>{children}</ToastProvider></LocaleProvider>;
}