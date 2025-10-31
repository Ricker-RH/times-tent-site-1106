"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";

import { FALLBACK_RIGHT_RAIL_CONFIG } from "@/constants/siteFallbacks";
import { ConfigPreviewFrame } from "./ConfigPreviewFrame";
import { EditorDialog } from "./EditorDialog";
import { ensureArray, ensureString, mergeMeta } from "./editorUtils";
import type { UpdateSiteConfigActionState } from "../actions";
import { updateSiteConfigAction } from "../actions";
import { useFormState, useFormStatus } from "react-dom";
import { ContactIcon } from "@/components/contact/icons";
import { useToast } from "@/providers/ToastProvider";

interface LocalizedRecord {
  [locale: string]: string;
}

interface RightRailButtonState {
  id: string;
  icon: string;
  href: string;
  target: string;
  label: LocalizedRecord;
  description: LocalizedRecord;
}

interface RightRailConfigState {
  buttons: RightRailButtonState[];
  _meta?: Record<string, unknown>;
}

type EditingTarget = { type: "buttons" };

type AnchorMap = Record<string, HTMLElement | undefined>;

const EDIT_GROUPS: Array<{
  anchor: string;
  label: string;
  actions: Array<{ label: string; target: EditingTarget }>;
}> = [
  {
    anchor: "buttons",
    label: "右侧小按钮",
    actions: [{ label: "编辑按钮", target: { type: "buttons" } }],
  },
];

const LOCALES: Array<{ code: string; label: string }> = [
  { code: "zh-CN", label: "简体中文" },
  { code: "en", label: "English" },
  { code: "zh-TW", label: "繁體中文" },
];

export function RightRailConfigEditor({ configKey, initialConfig }: { configKey: string; initialConfig: Record<string, unknown> }) {
  const [config, setConfig] = useState<RightRailConfigState>(() => normalizeConfig(initialConfig));
  const [baseline, setBaseline] = useState<RightRailConfigState>(() => normalizeConfig(initialConfig));
  const [editing, setEditing] = useState<EditingTarget | null>(null);
  const [formState, dispatch] = useFormState<UpdateSiteConfigActionState, FormData>(updateSiteConfigAction, { status: "idle" });
  const formRef = useRef<HTMLFormElement>(null);
  const latestConfigRef = useRef(config);
  const toast = useToast();

  useEffect(() => {
    const next = normalizeConfig(initialConfig);
    setConfig(next);
    setBaseline(next);
  }, [initialConfig]);

  useEffect(() => {
    latestConfigRef.current = config;
  }, [config]);

  useEffect(() => {
    if (formState.status === "success") {
      setBaseline(deepClone(latestConfigRef.current));
      formRef.current?.classList.add("animate-pulse");
      const timer = window.setTimeout(() => formRef.current?.classList.remove("animate-pulse"), 400);
      toast.success("保存成功");
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [formState.status, toast]);

  const payload = useMemo(() => JSON.stringify(serializeConfig(config)), [config]);
  const isDirty = useMemo(() => JSON.stringify(config) !== JSON.stringify(baseline), [config, baseline]);

  return (
    <div className="space-y-10">

      <RightRailPreview config={config} onEdit={setEditing} />

      {editing ? (
        <ButtonsDialog
          value={config.buttons}
          onCancel={() => setEditing(null)}
          onSave={(next) => {
            setConfig((prev) => ({ ...prev, buttons: next }));
            setEditing(null);
          }}
        />
      ) : null}
    </div>
  );
}

function RightRailPreview({ config, onEdit }: { config: RightRailConfigState; onEdit: (target: EditingTarget) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const anchors = usePreviewAnchors(containerRef);

  return (
    <ConfigPreviewFrame
      title="右侧小按钮"
      description="预览与官网一致，可在按钮区域直接进入编辑"
      viewportWidth={420}
      autoScale
      maxHeight={null}
    >
      <div ref={containerRef} className="relative h-[420px] overflow-hidden rounded-2xl border border-[var(--color-border)] bg-gradient-to-br from-[#f0f4ff] via-white to-[#fff7f5]">
        <div className="absolute inset-0">
          <div className="pointer-events-none absolute right-6 top-10 z-10 flex flex-col items-end gap-3" data-preview-anchor="buttons">
            {config.buttons.map((button) => (
              <div key={button.id} className="flex items-center justify-end gap-3">
                <div className="rounded-md border border-[var(--color-border)] bg-white px-4 py-2 text-xs text-[var(--color-brand-secondary)] shadow-xl">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--color-text-tertiary,#8690a3)]">
                    {button.label["zh-CN"] || "提示"}
                  </p>
                  <p className="mt-2 flex items-center gap-2 text-sm">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)]">
                      <ContactIcon name={(button.icon as any) ?? "phone"} />
                    </span>
                    <span>{button.description["zh-CN"] || "描述"}</span>
                  </p>
                </div>
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-brand-primary)] text-white shadow-lg">
                  <ContactIcon name={(button.icon as any) ?? "phone"} />
                </span>
              </div>
            ))}
          </div>
        </div>
        <PreviewEditControls anchors={anchors} onEdit={onEdit} />
      </div>
    </ConfigPreviewFrame>
  );
}

function ButtonsDialog({ value, onSave, onCancel }: { value: RightRailConfigState["buttons"]; onSave: (next: RightRailConfigState["buttons"]) => void; onCancel: () => void }) {
  const [draft, setDraft] = useState<RightRailConfigState["buttons"]>(() => value.map(deepClone));

  useEffect(() => {
    setDraft(value.map(deepClone));
  }, [value]);

  const handleAdd = () => {
    setDraft((prev) => [
      ...prev,
      {
        id: createId("right-rail"),
        icon: "phone",
        href: "",
        target: "",
        label: { "zh-CN": "热线沟通" },
        description: { "zh-CN": "7×24 小时响应" },
      },
    ]);
  };

  const handleRemove = (id: string) => {
    setDraft((prev) => prev.filter((item) => item.id !== id));
  };

  const handleMove = (id: string, offset: -1 | 1) => {
    setDraft((prev) => {
      const index = prev.findIndex((item) => item.id === id);
      if (index === -1) return prev;
      const target = index + offset;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  return (
    <EditorDialog title="编辑右侧小按钮" subtitle="调整按钮的文字、链接与图标" onSave={() => onSave(draft.map(deepClone))} onCancel={onCancel}>
      <div className="space-y-5 text-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-text-tertiary,#8690a3)]">按钮列表</h3>
          <button
            type="button"
            onClick={handleAdd}
            className="rounded-full border border-[var(--color-brand-primary)] px-3 py-1 text-xs font-semibold text-[var(--color-brand-primary)]"
          >
            + 新增按钮
          </button>
        </div>
        {draft.length ? (
          <div className="space-y-4">
            {draft.map((button, index) => (
              <div key={button.id} className="space-y-4 rounded-2xl border border-[var(--color-border)] bg-white/80 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--color-text-tertiary,#8690a3)]">
                  <span>按钮 {index + 1}</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleMove(button.id, -1)}
                      disabled={index === 0}
                      className="rounded-full border border-[var(--color-border)] px-3 py-1 transition hover:border-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary)] disabled:opacity-50"
                    >
                      上移
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMove(button.id, 1)}
                      disabled={index === draft.length - 1}
                      className="rounded-full border border-[var(--color-border)] px-3 py-1 transition hover:border-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary)] disabled:opacity-50"
                    >
                      下移
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemove(button.id)}
                      className="rounded-full border border-rose-200 px-3 py-1 text-rose-500 transition hover:bg-rose-50"
                    >
                      删除
                    </button>
                  </div>
                </div>
                <TextField
                  label="图标 (Lucide 名称)"
                  value={button.icon}
                  onChange={(next) =>
                    setDraft((prev) => prev.map((item) => (item.id === button.id ? { ...item, icon: next } : item)))
                  }
                  placeholder="phone / mail / map-pin"
                />
                <TextField
                  label="链接地址"
                  value={button.href}
                  onChange={(next) =>
                    setDraft((prev) => prev.map((item) => (item.id === button.id ? { ...item, href: next } : item)))
                    }
                  placeholder="tel: / mailto: 或 https://"
                />
                <TextField
                  label="打开方式 (可选)"
                  value={button.target}
                  onChange={(next) =>
                    setDraft((prev) => prev.map((item) => (item.id === button.id ? { ...item, target: next } : item)))
                  }
                  placeholder="例如 _blank"
                />
                <LocalizedTextField
                  label="按钮标题"
                  value={button.label}
                  onChange={(next) =>
                    setDraft((prev) => prev.map((item) => (item.id === button.id ? { ...item, label: next } : item)))
                  }
                />
                <LocalizedTextField
                  label="按钮描述"
                  value={button.description}
                  onChange={(next) =>
                    setDraft((prev) => prev.map((item) => (item.id === button.id ? { ...item, description: next } : item)))
                  }
                  multiline
                  rows={3}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-white/60 px-4 py-6 text-xs text-[var(--color-text-tertiary,#8690a3)]">
            暂无按钮，点击右上角“新增按钮”开始配置。
          </div>
        )}
      </div>
    </EditorDialog>
  );
}

function PreviewEditControls({ anchors, onEdit }: { anchors: AnchorMap; onEdit: (target: EditingTarget) => void }) {
  return (
    <>
      {EDIT_GROUPS.map(({ anchor, actions, label }) => {
        const element = anchors[anchor];
        if (!element) return null;
        return createPortal(
          <div className="pointer-events-none absolute inset-0">
            <div className="pointer-events-auto absolute right-4 top-4 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-black/60 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-white/85 shadow">
                {label}
              </span>
              <div className="flex flex-wrap gap-2">
                {actions.map((action) => (
                  <button
                    key={action.label}
                    type="button"
                    onClick={() => onEdit(action.target)}
                    className="rounded-full bg-[var(--color-brand-primary)] px-3 py-1 text-xs font-semibold text-white shadow transition hover:bg-[#d82234]"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          </div>,
          element,
        );
      })}
    </>
  );
}

function usePreviewAnchors(containerRef: RefObject<HTMLElement>): AnchorMap {
  const [anchors, setAnchors] = useState<AnchorMap>({});

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const originalPositions = new Map<HTMLElement, string>();

    const updateAnchors = () => {
      const next: AnchorMap = {};
      for (const { anchor } of EDIT_GROUPS) {
        const element = container.querySelector<HTMLElement>(`[data-preview-anchor="${anchor}"]`);
        if (!element) continue;
        if (getComputedStyle(element).position === "static") {
          if (!originalPositions.has(element)) {
            originalPositions.set(element, element.style.position || "");
          }
          element.style.position = "relative";
        }
        next[anchor] = element;
      }
      setAnchors((prev) => {
        const prevKeys = Object.keys(prev);
        const nextKeys = Object.keys(next);
        if (prevKeys.length === nextKeys.length && nextKeys.every((key) => prev[key] === next[key])) {
          return prev;
        }
        return next;
      });
    };

    const observer = new MutationObserver(updateAnchors);
    observer.observe(container, { childList: true, subtree: true });
    updateAnchors();

    return () => {
      observer.disconnect();
      originalPositions.forEach((value, element) => {
        element.style.position = value;
      });
    };
  }, [containerRef]);

  return anchors;
}

function SubmitButton({ disabled, highlight }: { disabled: boolean; highlight?: boolean }) {
  const { pending } = useFormStatus();
  const shouldPulse = Boolean(highlight && !disabled && !pending);
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className={`inline-flex items-center justify-center rounded-full bg-[var(--color-brand-primary)] px-5 py-2 text-sm font-semibold text-white shadow transition hover:bg-[var(--color-brand-secondary)] disabled:cursor-not-allowed disabled:opacity-60 ${
        shouldPulse ? "animate-[pulse_0.6s_ease-in-out_infinite] ring-4 ring-offset-4 ring-offset-white ring-[var(--color-brand-primary)] shadow-[0_0_36px_rgba(216,34,52,0.45)]" : ""
      }`}
    >
      {pending ? "保存中..." : "保存配置"}
    </button>
  );
}

function LocalizedTextField({
  label,
  value,
  onChange,
  multiline = false,
  rows = 3,
}: {
  label: string;
  value: LocalizedRecord;
  onChange: (next: LocalizedRecord) => void;
  multiline?: boolean;
  rows?: number;
}) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-text-tertiary,#8690a3)]">{label}</p>
      {LOCALES.map((locale) => (
        <label
          key={locale.code}
          className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-text-tertiary,#8690a3)]"
        >
          <span>{locale.label}</span>
          {multiline ? (
            <textarea
              value={value[locale.code] ?? ""}
              onChange={(event) => onChange({ ...value, [locale.code]: event.target.value })}
              rows={rows}
              className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-text-secondary)] focus:border-[var(--color-brand-primary)] focus:outline-none"
            />
          ) : (
            <input
              value={value[locale.code] ?? ""}
              onChange={(event) => onChange({ ...value, [locale.code]: event.target.value })}
              className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-text-secondary)] focus:border-[var(--color-brand-primary)] focus:outline-none"
            />
          )}
        </label>
      ))}
    </div>
  );
}

function TextField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (next: string) => void; placeholder?: string }) {
  return (
    <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-text-tertiary,#8690a3)]">
      <span>{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-text-secondary)] focus:border-[var(--color-brand-primary)] focus:outline-none"
      />
    </label>
  );
}

function normalizeConfig(raw: Record<string, unknown>): RightRailConfigState {
  const record = ensureRecord(raw);
  const buttonsRaw = ensureArray<Record<string, unknown>>(record.buttons);
  const fallbackButtons = FALLBACK_RIGHT_RAIL_CONFIG.buttons ?? [];
  const buttons = (buttonsRaw.length ? buttonsRaw : fallbackButtons).map((button, index) => {
    const icon = ensureString(button.icon) || fallbackButtons[index]?.icon || "phone";
    const href = ensureString(button.href) || fallbackButtons[index]?.href || "";
    const target = ensureString(button.target) || fallbackButtons[index]?.target || "";
    const label = ensureLocalizedRecord(button.label);
    const description = ensureLocalizedRecord(button.description);
    if (!label["zh-CN"] && fallbackButtons[index]?.label) {
      Object.assign(label, fallbackButtons[index]?.label);
    }
    if (!description["zh-CN"] && fallbackButtons[index]?.description) {
      Object.assign(description, fallbackButtons[index]?.description);
    }
    return {
      id: ensureString(button.id) || createId("right-rail"),
      icon,
      href,
      target,
      label,
      description,
    } satisfies RightRailButtonState;
  });

  return {
    buttons,
    _meta: ensureRecord(record._meta),
  } satisfies RightRailConfigState;
}

function serializeConfig(config: RightRailConfigState): Record<string, unknown> {
  return mergeMeta(
    {
      buttons: config.buttons.map((button) => ({
        id: button.id,
        icon: button.icon.trim(),
        href: button.href.trim(),
        target: button.target.trim() || undefined,
        label: cleanLocalized(button.label),
        description: cleanLocalized(button.description),
      })),
    },
    config._meta,
  );
}

function ensureRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function ensureLocalizedRecord(value: unknown): LocalizedRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  const record = value as Record<string, unknown>;
  const result: LocalizedRecord = {};
  for (const [locale, text] of Object.entries(record)) {
    if (typeof text === "string") {
      result[locale] = text;
    }
  }
  return result;
}

function cleanLocalized(value: LocalizedRecord): LocalizedRecord {
  const result: LocalizedRecord = {};
  for (const [locale, text] of Object.entries(value)) {
    const trimmed = text.trim();
    if (trimmed) {
      result[locale] = trimmed;
    }
  }
  return result;
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value ?? null)) as T;
}

function createId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`;
}
