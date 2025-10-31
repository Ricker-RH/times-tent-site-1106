import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "时代篷房 TIMES TENT",
  description: "模块化篷房解决方案 · 赛事、文旅、工业、品牌活动全场景覆盖",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="bg-[var(--color-background)] text-[var(--color-foreground)] antialiased">
        {children}
      </body>
    </html>
  );
}
