"use client";

import { useEffect } from "react";
import { useToast } from "@/providers/ToastProvider";

export default function FeedbackToast({ ok, error, action, active, next }: { ok?: boolean; error?: string; action?: string; active?: string; next?: string }) {
  const toast = useToast();
  useEffect(() => {
    if (error) {
      let msg = "操作失败";
      if (error === "invalid_password") msg = "密码格式不正确";
      if (error === "username_exists") msg = "用户名已存在";
      if (error === "rename_failed") msg = "重命名失败";
      toast.error(msg);
    } else if (ok) {
      if (action === "password_reset") {
        toast.success("密码重置成功");
      } else if (action === "status_update") {
        const isActive = active === "true";
        toast.success(isActive ? "已启用该账户" : "已停用该账户");
      } else if (action === "rename") {
        const nextName = typeof next === "string" ? next : "";
        toast.success(nextName ? `用户名已修改为 ${nextName}` : "用户名修改成功");
      } else {
        toast.success("操作成功");
      }
    }
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("ok");
      url.searchParams.delete("error");
      url.searchParams.delete("action");
      url.searchParams.delete("active");
      url.searchParams.delete("prev");
      url.searchParams.delete("next");
      window.history.replaceState(null, "", `${url.pathname}${url.search}`);
    }
  }, [ok, error, action, active, next, toast]);
  return null;
}

