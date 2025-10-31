"use client";

import { useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useToast } from "@/providers/ToastProvider";

import type { CreateAdminUserActionState } from "./actions";
import { createAdminUserAction } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`inline-flex items-center rounded-full bg-[var(--color-brand-primary)] px-6 py-3 text-sm font-semibold text-white ${pending ? "opacity-70" : ""}`}
    >
      {pending ? "正在创建..." : "创建管理员"}
    </button>
  );
}

export default function AdminUserCreateForm() {
  const [state, formAction] = useFormState<CreateAdminUserActionState, FormData>(createAdminUserAction, { status: "idle" });
  const toast = useToast();

  useEffect(() => {
    if (state.status === "success") {
      const message = "message" in state && typeof state.message === "string" ? state.message : "创建成功";
      toast.success(message);
      // 重置表单
      const form = document.getElementById("admin-user-create-form") as HTMLFormElement | null;
      form?.reset();
    }
  }, [state, toast]);

  return (
    <form id="admin-user-create-form" action={formAction} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-xs text-[var(--color-text-secondary)]">用户名</span>
          <input
            type="text"
            name="username"
            required
            minLength={3}
            maxLength={50}
            placeholder="例如：alice"
            className="w-full rounded-xl border border-[var(--color-border)] bg-white/80 px-3 py-2 text-sm text-[var(--color-brand-secondary)] outline-none focus:border-[var(--color-brand-primary)]"
          />
        </label>
        <label className="space-y-2">
          <span className="text-xs text-[var(--color-text-secondary)]">密码</span>
          <input
            type="password"
            name="password"
            required
            minLength={6}
            maxLength={100}
            placeholder="至少 6 位字符"
            className="w-full rounded-xl border border-[var(--color-border)] bg-white/80 px-3 py-2 text-sm text-[var(--color-brand-secondary)] outline-none focus:border-[var(--color-brand-primary)]"
          />
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-xs text-[var(--color-text-secondary)]">角色</span>
          <select
            name="role"
            defaultValue="admin"
            className="w-full rounded-xl border border-[var(--color-border)] bg-white/80 px-3 py-2 text-sm text-[var(--color-brand-secondary)] outline-none focus:border-[var(--color-brand-primary)]"
          >
            <option value="admin">Admin（默认）</option>
            <option value="superadmin">Superadmin</option>
          </select>
        </label>
      </div>

      {state.status === "error" ? (
        <div className="rounded-xl border border-[var(--color-border)] bg-red-50 px-3 py-2 text-xs text-red-600">
          {state.message || "创建失败，请稍后再试"}
        </div>
      ) : null}

      <div className="pt-2">
        <SubmitButton />
      </div>
    </form>
  );
}
