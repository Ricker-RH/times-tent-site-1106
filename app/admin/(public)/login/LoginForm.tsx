"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";

import type { LoginActionState } from "./actions";
import { loginAction } from "./actions";

const INITIAL_STATE: LoginActionState = { status: "idle" };

export function LoginForm({ next }: { next?: string }) {
  const [formState, formAction] = useFormState(loginAction, INITIAL_STATE);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberIdentifier, setRememberIdentifier] = useState(false);
  const [rememberPassword, setRememberPassword] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedRememberIdentifier = localStorage.getItem("timesTentRememberIdentifier");
    const storedRememberPassword = localStorage.getItem("timesTentRememberPassword");
    const shouldRememberIdentifier = storedRememberIdentifier === "true";
    const shouldRememberPassword = storedRememberPassword === "true";
    if (shouldRememberIdentifier) {
      const savedIdentifier = localStorage.getItem("timesTentAdminIdentifier") ?? "";
      setIdentifier(savedIdentifier);
      setRememberIdentifier(true);
    }
    if (shouldRememberPassword) {
      const savedPassword = localStorage.getItem("timesTentAdminPassword") ?? "";
      setPassword(savedPassword);
      setRememberPassword(true);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("timesTentRememberIdentifier", rememberIdentifier ? "true" : "false");
    if (rememberIdentifier) {
      localStorage.setItem("timesTentAdminIdentifier", identifier);
    } else {
      localStorage.removeItem("timesTentAdminIdentifier");
    }
  }, [identifier, rememberIdentifier]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("timesTentRememberPassword", rememberPassword ? "true" : "false");
    if (rememberPassword) {
      localStorage.setItem("timesTentAdminPassword", password);
    } else {
      localStorage.removeItem("timesTentAdminPassword");
    }
  }, [password, rememberPassword]);

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="next" value={next ?? ""} />
      <div className="space-y-2">
        <label className="block text-sm font-medium text-[var(--color-brand-secondary)]" htmlFor="identifier">
          账号
        </label>
        <input
          id="identifier"
          name="identifier"
          autoComplete="username"
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          disabled={false}
          required
          className="w-full rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-[var(--color-brand-secondary)] shadow-sm focus:border-[var(--color-brand-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/30"
          placeholder="邮箱或用户名"
        />
      </div>
      <div className="space-y-2">
        <label className="block text-sm font-medium text-[var(--color-brand-secondary)]" htmlFor="password">
          密码
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={false}
            required
            className="w-full rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 pr-16 text-sm text-[var(--color-brand-secondary)] shadow-sm focus:border-[var(--color-brand-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/30"
            placeholder="请输入密码"
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute inset-y-0 right-3 flex items-center text-[var(--color-brand-primary)] hover:text-[var(--color-brand-secondary)]"
            aria-label={showPassword ? "隐藏密码" : "显示密码"}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
            >
              {showPassword ? (
                <>
                  <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
                  <circle cx="12" cy="12" r="3" />
                  <line x1="4.22" y1="4.22" x2="19.78" y2="19.78" />
                </>
              ) : (
                <>
                  <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
                  <circle cx="12" cy="12" r="3" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>
      <div className="flex flex-col gap-2 text-xs text-[var(--color-text-tertiary,#8690a3)] sm:flex-row sm:items-center sm:justify-between">
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            name="rememberIdentifier"
            checked={rememberIdentifier}
            onChange={(event) => setRememberIdentifier(event.target.checked)}
            className="h-4 w-4 rounded border-[var(--color-border)] text-[var(--color-brand-primary)] focus:ring-[var(--color-brand-primary)]"
          />
          记住账号
        </label>
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            name="rememberPassword"
            checked={rememberPassword}
            onChange={(event) => setRememberPassword(event.target.checked)}
            className="h-4 w-4 rounded border-[var(--color-border)] text-[var(--color-brand-primary)] focus:ring-[var(--color-brand-primary)]"
          />
          记住密码
        </label>
      </div>
      {formState.status === "error" ? (
        <p className="text-sm text-rose-500">{formState.message}</p>
      ) : null}
      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-full bg-[var(--color-brand-primary)] px-5 py-3 text-sm font-semibold text-white shadow transition hover:bg-[#d82234] disabled:opacity-60"
    >
      {pending ? "正在登录..." : "登录"}
    </button>
  );
}
