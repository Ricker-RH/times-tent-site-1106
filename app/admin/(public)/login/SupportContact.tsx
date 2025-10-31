"use client";

import { useState } from "react";

export function SupportContact(): JSX.Element {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative mx-auto max-w-xs text-center text-xs text-[var(--color-text-tertiary,#8690a3)]">
      <span>如需开通权限，请联系 </span>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="font-semibold text-[var(--color-brand-primary)] hover:underline"
        aria-expanded={open}
      >
        超级管理员
      </button>
      <span>。</span>
      {open ? (
        <div className="absolute left-1/2 top-[115%] z-50 w-56 -translate-x-1/2 space-y-1 rounded-2xl border border-[var(--color-border)] bg-white/95 px-4 py-3 text-left text-[var(--color-brand-secondary)] shadow-lg">
          <p>
            电话：
            <a className="font-semibold text-[var(--color-brand-primary)]" href="tel:+8615841542170">
              +86 158 4154 2170
            </a>
          </p>
          <p>
            微信：
            <span className="font-semibold text-[var(--color-brand-primary)]">2632604095</span>
          </p>
        </div>
      ) : null}
    </div>
  );
}
