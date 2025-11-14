"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { useFormState, useFormStatus } from "react-dom";

import type { InventoryConfig } from "@/server/pageConfigs";

import { ConfigPreviewFrame } from "./ConfigPreviewFrame";
import type { UpdateSiteConfigActionState } from "../actions";
import { updateSiteConfigAction } from "../actions";
import { useToast } from "@/providers/ToastProvider";
import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  ensureArray,
  ensureLocalizedRecord,
  ensureString,
  getLocaleText,
  mergeMeta,
} from "./editorUtils";
import { LocalizedTextField as SharedLocalizedTextField } from "./LocalizedTextField";
import type { LocaleKey } from "@/i18n/locales";
import { sanitizeImageSrc } from "@/utils/image";
import { useGlobalTranslationRegistrationForConfig } from "@/hooks/useGlobalTranslationManager";

type LocalizedValue = Record<LocaleKey, string>;

interface HeroBadgeState {
  label: LocalizedValue;
}

interface HeroState {
  backgroundImage: string;
  eyebrow: LocalizedValue;
  title: LocalizedValue;
  description: LocalizedValue;
  badges: HeroBadgeState[];
  overlayEnabled: boolean;
}

interface PosterState {
  image: string;
  title: LocalizedValue;
}

interface SectionState {
  id: string;
  title: LocalizedValue;
  summary: LocalizedValue;
  contact: LocalizedValue;
  mainPoster: PosterState;
  gallery: PosterState[];
}

interface InventoryConfigState {
  hero: HeroState;
  sections: SectionState[];
  _meta?: Record<string, unknown>;
}

type HeroEditingScope = "basic" | "badges" | "visual" | "full";
type SectionEditingScope = "basic" | "contact" | "mainPoster" | "gallery" | "full";

type EditingTarget =
  | { type: "hero"; scope: HeroEditingScope }
  | { type: "section"; index: number; scope: SectionEditingScope };

function isSectionEditingTarget(
  target: EditingTarget | null,
): target is { type: "section"; index: number; scope: SectionEditingScope } {
  if (!target) return false;
  return target.type === "section" && typeof target.index === "number";
}

function createEmptyLocalizedValue(defaultValue = ""): LocalizedValue {
  const result = {} as LocalizedValue;
  SUPPORTED_LOCALES.forEach((code) => {
    result[code] = defaultValue;
  });
  return result;
}

function normalizeLocalizedValue(value: unknown, fallback: string): LocalizedValue {
  const record = ensureLocalizedRecord(value);
  const completed: Partial<LocalizedValue> = {};
  const base = typeof record[DEFAULT_LOCALE] === "string" && record[DEFAULT_LOCALE]?.trim()
    ? (record[DEFAULT_LOCALE] as string)
    : fallback;
  SUPPORTED_LOCALES.forEach((locale) => {
    const raw = record[locale];
    completed[locale] = typeof raw === "string" && raw.trim() ? raw : base;
  });
  return completed as LocalizedValue;
}

function ensureLocalized(value: unknown, fallback?: string): LocalizedValue {
  return ensureLocalizedNoFallback(value);
}

function cleanLocalized(value: LocalizedValue, keepEmpty = false): LocalizedValue {
  const result = createEmptyLocalizedValue();
  for (const key of SUPPORTED_LOCALES) {
    const v = value[key];
    const str = typeof v === "string" ? v.trim() : "";
    if (!keepEmpty && !str) continue;
    result[key] = str;
  }
  return result;
}

// 新增：无回退的本地化规范化，保留空字符串但不填充默认文案
function ensureLocalizedNoFallback(value: unknown): LocalizedValue {
  const record = ensureLocalizedRecord(value) as LocalizedValue;
  const result = createEmptyLocalizedValue();
  for (const key of SUPPORTED_LOCALES) {
    const v = record[key];
    result[key] = typeof v === "string" ? v.trim() : "";
  }
  return result;
}

// 保留空值用于“显式清空”序列化（不丢弃键）
function serializeLocalizedAllowEmpty(record: LocalizedValue): LocalizedValue {
  const result = createEmptyLocalizedValue();
  SUPPORTED_LOCALES.forEach((code) => {
    const v = typeof record[code] === "string" ? (record[code] as string).trim() : "";
    // 即使为空字符串也保留键
    result[code] = v;
  });
  return result;
}

function cloneState<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function asPosterState(raw: unknown, index = 0, fallbackTitle = ""): PosterState {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {
      image: "",
      title: ensureLocalizedNoFallback(undefined),
    } satisfies PosterState;
  }
  const record = raw as Record<string, unknown>;
  return {
    image: ensureString(record.image),
    title: ensureLocalizedNoFallback(record.title),
  } satisfies PosterState;
}

function asHeroState(raw: unknown): HeroState {
  const hero = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  return {
    backgroundImage: ensureString(hero.backgroundImage),
    eyebrow: ensureLocalizedNoFallback(hero.eyebrow),
    title: ensureLocalizedNoFallback(hero.title),
    description: ensureLocalizedNoFallback(hero.description),
    badges: ensureArray<unknown>(hero.badges).map((badge) => ({
      label: ensureLocalizedNoFallback(badge),
    })),
    overlayEnabled: hero.overlayEnabled !== false,
  } satisfies HeroState;
}

function asSectionState(raw: unknown, index: number): SectionState {
  const section = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const mainPosterRaw = section.mainPoster ?? {};
  const galleryRaw = ensureArray(section.gallery);

  return {
    id: ensureString(section.id),
    title: ensureLocalizedNoFallback(section.title),
    summary: ensureLocalizedNoFallback(section.summary),
    contact: ensureLocalizedNoFallback(section.contact),
    mainPoster: asPosterState(mainPosterRaw),
    gallery: galleryRaw.map((poster) => asPosterState(poster)),
  } satisfies SectionState;
}

function normalizeConfig(raw: Record<string, unknown>): InventoryConfigState {
  const hero = asHeroState(raw.hero);
  const sections = ensureArray(raw.showcaseSections).map(asSectionState);
  const meta = raw._meta && typeof raw._meta === "object" ? (raw._meta as Record<string, unknown>) : undefined;
  return {
    hero,
    sections,
    _meta: meta ? { ...meta } : undefined,
  } satisfies InventoryConfigState;
}

function serializeConfig(config: InventoryConfigState): InventoryConfig {
  return mergeMeta(
    ({
      hero: {
        backgroundImage: config.hero.backgroundImage.trim(),
        eyebrow: serializeLocalizedAllowEmpty(config.hero.eyebrow),
        title: serializeLocalizedAllowEmpty(config.hero.title),
        description: serializeLocalizedAllowEmpty(config.hero.description),
        badges: config.hero.badges.map((badge) => serializeLocalizedAllowEmpty(badge.label)),
        overlayEnabled: config.hero.overlayEnabled !== false,
      },
      showcaseSections: config.sections.map((section) => {
        const gallery = section.gallery.map((poster) => ({
          image: poster.image.trim(),
          title: serializeLocalizedAllowEmpty(poster.title),
        }));

        return {
          id: section.id.trim() || undefined,
          title: serializeLocalizedAllowEmpty(section.title),
          summary: serializeLocalizedAllowEmpty(section.summary),
          contact: serializeLocalizedAllowEmpty(section.contact),
          mainPoster: {
            image: section.mainPoster.image.trim(),
            title: serializeLocalizedAllowEmpty(section.mainPoster.title),
          },
          gallery,
        };
      }),
    } as unknown as InventoryConfig),
    config._meta,
  );
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
  placeholder,
  translationContext,
}: {
  label: string;
  value: LocalizedValue;
  onChange: (next: LocalizedValue) => void;
  multiline?: boolean;
  rows?: number;
  placeholder?: string;
  translationContext?: string;
}) {
  const normalized = ensureLocalizedNoFallback(value);
  return (
    <SharedLocalizedTextField
      label={label}
      value={normalized}
      multiline={multiline}
      rows={rows}
      placeholder={placeholder}
      translationContext={translationContext}
      onChange={(next) => onChange(ensureLocalizedNoFallback(next))}
    />
  );
}

function TextField({
  label,
  value,
  onChange,
  helperText,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  helperText?: string;
}) {
  return (
    <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-text-tertiary,#8690a3)]">
      <span>{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-text-secondary)] focus:border-[var(--color-brand-primary)] focus:outline-none"
      />
      {helperText ? <span className="text-[10px] text-[var(--color-text-tertiary,#8690a3)]">{helperText}</span> : null}
    </label>
  );
}

function ImageInputField({
  label,
  value,
  onChange,
  helper,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  helper?: string;
}) {
  return (
    <div className="space-y-2">
      <span className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-text-tertiary,#8690a3)]">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="https://..."
        className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-text-secondary)] focus:border-[var(--color-brand-primary)] focus:outline-none"
      />
      {helper ? <span className="text-[10px] text-[var(--color-text-tertiary,#8690a3)]">{helper}</span> : null}
    </div>
  );
}

function ImageUploadField({
  label,
  value,
  onChange,
  helper,
  uploadEndpoint = "/api/uploads",
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  helper?: string;
  uploadEndpoint?: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelectFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("请上传图片文件");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("图片大小不能超过 5MB");
      event.target.value = "";
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch(uploadEndpoint, {
        method: "POST",
        body: formData,
      });
      const result = (await response.json().catch(() => null)) as { url?: string; error?: string } | null;
      if (!response.ok || !result?.url) {
        throw new Error(result?.error ?? "上传失败，请稍后重试");
      }
      onChange(result.url);
    } catch (err) {
      console.error("image upload failed", err);
      setError(err instanceof Error ? err.message : "上传失败，请稍后重试");
    } finally {
      setUploading(false);
      if (event.target) event.target.value = "";
    }
  };

  const handleClear = () => {
    onChange("");
    setError(null);
  };

  const trimmed = value?.trim() ?? "";
  const previewSrc = sanitizeImageSrc(trimmed);
  const hasValue = Boolean(trimmed);

  return (
    <div className="space-y-2 text-sm">
      <span className="font-medium text-[var(--color-brand-secondary)]">{label}</span>
      <div className="space-y-2 rounded-2xl border border-[var(--color-border)] bg-white/80 p-3">
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="https://"
          className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-brand-secondary)] focus:border-[var(--color-brand-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/30"
        />
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            type="button"
            onClick={handleSelectFile}
            className="rounded-full border border-[var(--color-brand-primary)] px-3 py-1 font-semibold text-[var(--color-brand-primary)] transition hover:bg-[var(--color-brand-primary)]/10"
            disabled={uploading}
          >
            {uploading ? "上传中..." : "本地上传"}
          </button>
          {hasValue ? (
            <button
              type="button"
              onClick={handleClear}
              className="rounded-full border border-[var(--color-border)] px-3 py-1 text-[var(--color-text-secondary)] transition hover:border-rose-200 hover:text-rose-500"
            >
              清空
            </button>
          ) : null}
          {error ? <span className="text-rose-500">{error}</span> : null}
        </div>
        {helper ? <p className="text-xs text-[var(--color-text-tertiary,#8690a3)]">{helper}</p> : null}
        {previewSrc ? (
          <div className="relative mt-2 h-32 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]">
            <Image src={previewSrc} alt="图片预览" fill sizes="100vw" className="object-cover" />
          </div>
        ) : hasValue ? (
          <p className="text-xs text-rose-500">图片地址无效，请输入以 http(s):// 或 / 开头的链接。</p>
        ) : null}
      </div>
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
    </div>
  );
}

function EditorDialog({
  title,
  subtitle,
  children,
  onSave,
  onCancel,
  onDelete,
  saveLabel = "保存并关闭",
  cancelLabel = "取消",
  deleteLabel = "删除",
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onSave: () => void;
  onCancel: () => void;
  onDelete?: () => void;
  saveLabel?: string;
  cancelLabel?: string;
  deleteLabel?: string;
}) {
  // 严格限制关闭方式：仅允许按钮触发关闭
  // 移除 ESC 关闭
  // 移除蒙层点击关闭

  return (
    <div
      role="dialog"
      aria-modal
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
    >
      <div className="flex w-full max-w-4xl max-h-[85vh] flex-col overflow-hidden rounded-3xl border border-[var(--color-border)] bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--color-border)] px-5 py-4">
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-[0.35em] text-[var(--color-text-tertiary,#8690a3)]">正在编辑</p>
            <h2 className="text-lg font-semibold text-[var(--color-brand-secondary)]">{title}</h2>
            {subtitle ? <p className="text-xs text-[var(--color-text-secondary)]">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-[var(--color-border)] px-3 py-1 text-xs text-[var(--color-text-secondary)] transition hover:border-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary)]"
            aria-label="关闭编辑弹窗"
          >
            ×
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-5 text-sm">{children}</div>
        <div className="flex items-center justify-between gap-2 border-t border-[var(--color-border)] bg-white px-5 py-3">
          {onDelete ? (
            <button
              type="button"
              onClick={onDelete}
              className="rounded-full border border-rose-200 px-4 py-2 text-xs font-semibold text-rose-500 transition hover:bg-rose-50"
            >
              {deleteLabel}
            </button>
          ) : <span />}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-full border border-[var(--color-border)] px-4 py-2 text-xs font-semibold text-[var(--color-text-secondary)] transition hover:border-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary)]"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onSave}
              className="rounded-full bg-[var(--color-brand-primary)] px-4 py-2 text-xs font-semibold text-white shadow transition hover:bg-[var(--color-brand-secondary)]"
            >
              {saveLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionWrapper({ actions, children }: { actions: { label: string; onClick: () => void }[]; children: React.ReactNode }) {
  return (
    <div className="relative group">
      <div className="pointer-events-none absolute inset-0 rounded-3xl border border-transparent transition group-hover:border-[var(--color-brand-primary)]/40" />
      <div className="pointer-events-auto absolute right-4 top-4 z-20 hidden flex-col gap-2 group-hover:flex">
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={action.onClick}
            className="rounded-full border border-[var(--color-border)] bg-white/95 px-3 py-1 text-xs font-semibold text-[var(--color-brand-primary)] shadow transition hover:border-[var(--color-brand-primary)]"
          >
            {action.label}
          </button>
        ))}
      </div>
      {children}
    </div>
  );
}

function HeroDialog({ value, scope, onSave, onCancel }: { value: HeroState; scope: HeroEditingScope; onSave: (next: HeroState) => void; onCancel: () => void }) {
  const [draft, setDraft] = useState<HeroState>(cloneState(value));

  useEffect(() => {
    setDraft(cloneState(value));
  }, [value]);

  const showBasic = scope === "basic" || scope === "full";
  const showBadges = scope === "badges" || scope === "full";
  const showVisual = scope === "visual" || scope === "full";

  let dialogTitle = "编辑英雄板块";
  let dialogSubtitle = "维护主视觉文案与关键优势";

  switch (scope) {
    case "basic":
      dialogTitle = "编辑英雄板块 - 基础文案";
      dialogSubtitle = "调整眉头、标题与描述";
      break;
    case "badges":
      dialogTitle = "编辑英雄板块 - 优势徽章";
      dialogSubtitle = "新增或整理顶部徽章";
      break;
    case "visual":
      dialogTitle = "编辑英雄板块 - 背景图片";
      dialogSubtitle = "更新背景图地址";
      break;
    default:
      break;
  }

  return (
    <EditorDialog title={dialogTitle} subtitle={dialogSubtitle} onSave={() => onSave(cloneState(draft))} onCancel={onCancel}>
      <div className="space-y-6 text-sm">
        {showBasic ? (
          <div className="space-y-6">
            <LocalizedTextField
              label="眉头"
              value={draft.eyebrow}
              translationContext="库存英雄眉头"
              onChange={(next) => setDraft((prev) => ({ ...prev, eyebrow: next }))}
            />
            <LocalizedTextField
              label="主标题"
              value={draft.title}
              translationContext="库存英雄标题"
              onChange={(next) => setDraft((prev) => ({ ...prev, title: next }))}
            />
            <LocalizedTextField
              label="描述"
              value={draft.description}
              translationContext="库存英雄描述"
              onChange={(next) => setDraft((prev) => ({ ...prev, description: next }))}
              multiline
              rows={4}
            />
          </div>
        ) : null}

        {showBadges ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium text-[var(--color-brand-secondary)]">优势徽章</span>
              <button
                type="button"
                onClick={() =>
                  setDraft((prev) => ({
                    ...prev,
                    badges: [...prev.badges, { label: ensureLocalizedNoFallback(undefined) }],
                  }))
                }
                className="rounded-full border border-dashed border-[var(--color-brand-primary)] px-3 py-1 text-xs font-semibold text-[var(--color-brand-primary)] transition hover:bg-[var(--color-brand-primary)]/10"
              >
                + 新增徽章
              </button>
            </div>
            <div className="space-y-3">
              {draft.badges.map((badge, index) => (
                <div key={index} className="space-y-3 rounded-2xl border border-[var(--color-border)] bg-white/80 p-4">
                  <div className="flex items-center justify-between text-xs text-[var(--color-text-tertiary,#8690a3)]">
                    <span>徽章 {index + 1}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setDraft((prev) => ({
                          ...prev,
                          badges: prev.badges.filter((_, idx) => idx !== index),
                        }))
                      }
                      className="rounded-full border border-rose-200 px-3 py-1 text-rose-500 transition hover:bg-rose-50"
                    >
                      删除
                    </button>
                  </div>
                  <LocalizedTextField
                    label="徽章文案"
                    value={badge.label}
                    translationContext={`库存英雄徽章 ${index + 1}`}
                    onChange={(next) => {
                      const badges = [...draft.badges];
                      badges[index] = { label: next };
                      setDraft((prev) => ({ ...prev, badges }));
                    }}
                  />
                </div>
              ))}
              {!draft.badges.length ? (
                <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-white/60 p-4 text-center text-xs text-[var(--color-text-secondary)]">
                  暂无徽章，请新增。
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {showVisual ? (
          <div className="space-y-4">
            <ImageUploadField
              label="背景图片"
              value={draft.backgroundImage}
              onChange={(next) => setDraft((prev) => ({ ...prev, backgroundImage: next }))}
              helper="最佳尺寸 1200×420"
            />
            <label className="flex items-center gap-2 text-xs font-semibold text-[var(--color-brand-secondary)]">
              <input
                type="checkbox"
                checked={draft.overlayEnabled !== false}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    overlayEnabled: event.target.checked,
                  }))
                }
                className="h-4 w-4 rounded border-[var(--color-border)] text-[var(--color-brand-primary)] focus:ring-[var(--color-brand-primary)]"
              />
              启用背景蒙版
            </label>
          </div>
        ) : null}
      </div>
    </EditorDialog>
  );
}

function SectionDialog({
  value,
  scope,
  onSave,
  onCancel,
  onDelete,
}: {
  value: SectionState;
  scope: SectionEditingScope;
  onSave: (next: SectionState) => void;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  const [draft, setDraft] = useState<SectionState>(cloneState(value));

  useEffect(() => {
    setDraft(cloneState(value));
  }, [value]);

  const showBasic = scope === "basic" || scope === "full";
  const showContact = scope === "contact" || scope === "full";
  const showMainPoster = scope === "mainPoster" || scope === "full";
  const showGallery = scope === "gallery" || scope === "full";

  let dialogTitle = "编辑展示板块";
  let dialogSubtitle = "维护板块文案与图片";

  switch (scope) {
    case "basic":
      dialogTitle = "编辑展示板块 - 基础信息";
      dialogSubtitle = "调整标识、标题与摘要";
      break;
    case "contact":
      dialogTitle = "编辑展示板块 - 联系文案";
      dialogSubtitle = "更新联系提示语";
      break;
    case "mainPoster":
      dialogTitle = "编辑展示板块 - 主海报";
      dialogSubtitle = "更新主海报图片";
      break;
    case "gallery":
      dialogTitle = "编辑展示板块 - 图库";
      dialogSubtitle = "新增或删除附加海报";
      break;
    default:
      break;
  }

  return (
    <EditorDialog
      title={dialogTitle}
      subtitle={dialogSubtitle}
      onSave={() => onSave(cloneState(draft))}
      onCancel={onCancel}
      onDelete={onDelete}
      deleteLabel="删除板块"
    >
      <div className="space-y-6 text-sm">
        {showBasic ? (
          <div className="space-y-6">
            <TextField label="板块 ID" value={draft.id} onChange={(next) => setDraft((prev) => ({ ...prev, id: next }))} helperText="用于锚点跳转，需唯一" />
            <LocalizedTextField label="板块标题" value={draft.title} onChange={(next) => setDraft((prev) => ({ ...prev, title: next }))} />
            <LocalizedTextField label="板块摘要" value={draft.summary} onChange={(next) => setDraft((prev) => ({ ...prev, summary: next }))} multiline rows={4} />
          </div>
        ) : null}

        {showContact ? (
          <LocalizedTextField label="联系文案" value={draft.contact} onChange={(next) => setDraft((prev) => ({ ...prev, contact: next }))} multiline rows={3} />
        ) : null}

        {showMainPoster ? (
          <div className="space-y-4">
            <ImageUploadField
              label="主海报图片"
              value={draft.mainPoster.image}
              onChange={(next) => setDraft((prev) => ({ ...prev, mainPoster: { ...prev.mainPoster, image: next } }))}
              helper="最佳尺寸 1200×675"
            />
            <LocalizedTextField
              label="主海标题"
              value={draft.mainPoster.title}
              onChange={(next) => setDraft((prev) => ({ ...prev, mainPoster: { ...prev.mainPoster, title: next } }))}
            />
         </div>
        ) : null}

        {showGallery ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium text-[var(--color-brand-secondary)]">图库海报</span>
              <button
                type="button"
                onClick={() =>
                  setDraft((prev) => ({
                    ...prev,
                    gallery: [
                      ...prev.gallery,
                      { image: "", title: ensureLocalizedNoFallback(undefined) },
                    ],
                  }))
                }
                className="rounded-full border border-dashed border-[var(--color-brand-primary)] px-3 py-1 text-xs font-semibold text-[var(--color-brand-primary)] transition hover:bg-[var(--color-brand-primary)]/10"
              >
                + 新增海报
              </button>
            </div>
            <div className="space-y-3">
              {draft.gallery.map((poster, index) => (
                <div key={index} className="space-y-3 rounded-2xl border border-[var(--color-border)] bg-white/80 p-4">
                  <div className="flex items-center justify-between text-xs text-[var(--color-text-tertiary,#8690a3)]">
                    <span>海报 {index + 1}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setDraft((prev) => ({
                          ...prev,
                          gallery: prev.gallery.filter((_, idx) => idx !== index),
                        }))
                      }
                      className="rounded-full border border-rose-200 px-3 py-1 text-rose-500 transition hover:bg-rose-50"
                    >
                      删除
                    </button>
                  </div>
                  <ImageUploadField
                    label="图库图片"
                    value={poster.image}
                    onChange={(next) =>
                      setDraft((prev) => ({
                        ...prev,
                        gallery: prev.gallery.map((item, idx) => (idx === index ? { ...item, image: next } : item)),
                      }))
                    }
                    helper="最佳尺寸 1200×675"
                  />
                  <LocalizedTextField
                    label="图片标题"
                    value={poster.title}
                    onChange={(next) =>
                      setDraft((prev) => ({
                        ...prev,
                        gallery: prev.gallery.map((item, idx) => (idx === index ? { ...item, title: next } : item)),
                      }))
                    }
                  />
                </div>
              ))}
              {!draft.gallery.length ? (
                <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-white/60 p-4 text-center text-xs text-[var(--color-text-secondary)]">
                  暂无海报，请新增。
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </EditorDialog>
  );
}

function InventoryPreview({ config, onEdit, onAddSection }: { config: InventoryConfigState; onEdit: (target: EditingTarget) => void; onAddSection: () => void }) {
  const previewConfig = useMemo(() => serializeConfig(config), [config]);
  const heroBackground = sanitizeImageSrc(previewConfig.hero?.backgroundImage);
  const overlayEnabled = previewConfig.hero?.overlayEnabled ?? true;

  return (
    <ConfigPreviewFrame
      title="现货库存页面"
      description="悬停板块可直接进入对应配置"
      viewportWidth={1100}
      autoScale
      maxHeight={null}
    >
      <div className="bg-white">
        <SectionWrapper
          actions={[
            { label: "基础文案", onClick: () => onEdit({ type: "hero", scope: "basic" }) },
            { label: "优势徽章", onClick: () => onEdit({ type: "hero", scope: "badges" }) },
            { label: "背景图片", onClick: () => onEdit({ type: "hero", scope: "visual" }) },
            { label: "全部字段", onClick: () => onEdit({ type: "hero", scope: "full" }) },
          ]}
        >
          <section className="relative overflow-hidden">
            <div className="absolute inset-0">
              {heroBackground ? (
                <Image
                  src={heroBackground}
                  alt={getLocaleText(previewConfig.hero.title)}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="h-full w-full bg-slate-200" />
              )}
              {overlayEnabled ? <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/45 to-black/25" /> : null}
            </div>
            <div className="relative z-10 mx-auto flex min-h-[360px] w-full max-w-[1100px] flex-col justify-center gap-4 px-6 py-14 text-white lg:px-10">
              <span
                className={`inline-flex w-fit items-center rounded-full px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] ${
                  overlayEnabled ? "bg-white/15" : "bg-black/35 backdrop-blur"
                }`}
              >
                {getLocaleText(previewConfig.hero?.eyebrow)}
              </span>
              <h1
                className={`text-3xl font-semibold md:text-4xl ${
                  overlayEnabled ? "" : "drop-shadow-[0_6px_20px_rgba(0,0,0,0.55)]"
                }`}
              >
                {getLocaleText(previewConfig.hero?.title)}
              </h1>
              <p
                className={`max-w-2xl text-sm md:text-base ${
                  overlayEnabled ? "text-white/80" : "text-white drop-shadow-[0_4px_18px_rgba(0,0,0,0.6)]"
                }`}
              >
                {getLocaleText(previewConfig.hero?.description)}
              </p>
              <div className="flex flex-wrap gap-2 text-xs text-white/80">
                {ensureArray(previewConfig.hero?.badges).map((badge, index) => (
                  <span
                    key={index}
                    className={`inline-flex items-center rounded-full px-3 py-1 ${
                      overlayEnabled ? "bg-white/15" : "bg-black/35 backdrop-blur"
                    }`}
                  >
                    {getLocaleText(badge as Record<string, unknown>)}
                  </span>
                ))}
              </div>
            </div>
          </section>
        </SectionWrapper>

        <div className="space-y-10 bg-white pb-10 pt-8">
          <div className="mx-auto flex w-full max-w-[1100px] justify-end px-6">
            <button
              type="button"
              onClick={onAddSection}
              className="rounded-full border border-dashed border-[var(--color-brand-primary)] px-4 py-1.5 text-xs font-semibold text-[var(--color-brand-primary)] transition hover:bg-[var(--color-brand-primary)]/10"
            >
              + 新增展示板块
            </button>
          </div>
          {config.sections.map((section, index) => (
            <SectionWrapper
              key={section.id || index}
              actions={[
                { label: "基础信息", onClick: () => onEdit({ type: "section", index, scope: "basic" }) },
                { label: "联系文案", onClick: () => onEdit({ type: "section", index, scope: "contact" }) },
                { label: "主海报", onClick: () => onEdit({ type: "section", index, scope: "mainPoster" }) },
                { label: "图库", onClick: () => onEdit({ type: "section", index, scope: "gallery" }) },
                { label: "全部字段", onClick: () => onEdit({ type: "section", index, scope: "full" }) },
              ]}
            >
              <section className={`${index % 2 === 1 ? "bg-[var(--color-surface-muted)]" : "bg-white"} scroll-mt-24 py-6`}>
                <div className="mx-auto w-full max-w-[1100px] space-y-6 px-6">
                  <div className="space-y-2">
                    <h2 className="text-2xl font-semibold text-[var(--color-brand-secondary)] md:text-3xl">{getLocaleText(section.title)}</h2>
                    <p className="text-sm text-[var(--color-text-secondary)] md:text-base">{getLocaleText(section.summary)}</p>
                    <p className="text-xs text-[var(--color-text-tertiary)] md:text-sm">{getLocaleText(section.contact)}</p>
                  </div>
                  <div className="space-y-6">
                    {[section.mainPoster, ...section.gallery].map((poster, posterIndex) => {
                      const posterImage = sanitizeImageSrc(poster.image);
                      return (
                        <figure key={`${poster.image}-${posterIndex}`} className="overflow-hidden rounded-lg">
                          <div className="relative aspect-[3/2] md:aspect-[16/9]">
                            {posterImage ? (
                              <Image
                                src={posterImage}
                                alt={getLocaleText(poster.title)}
                                fill
                                priority={posterIndex === 0}
                                sizes="(min-width: 1600px) 75vw, (min-width: 1024px) 90vw, 100vw"
                                className="object-cover"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center border border-dashed border-[var(--color-border)] bg-white/70 text-xs text-[var(--color-text-secondary)]">
                                暂无图片
                              </div>
                            )}
                          </div>
                        </figure>
                      );
                    })}
                  </div>
                </div>
              </section>
            </SectionWrapper>
          ))}

          {!config.sections.length ? (
            <div className="mx-auto w-full max-w-[1100px] rounded-2xl border border-dashed border-[var(--color-border)] bg-white/60 p-10 text-center text-sm text-[var(--color-text-secondary)]">
              暂无展示板块，请新增。
            </div>
          ) : null}
        </div>
      </div>
    </ConfigPreviewFrame>
  );
}

export function InventoryConfigEditor({ configKey, initialConfig }: { configKey: string; initialConfig: Record<string, unknown> }) {
  const [config, setConfig] = useState<InventoryConfigState>(() => normalizeConfig(initialConfig));
  useGlobalTranslationRegistrationForConfig({ config, setConfig, labelPrefix: configKey });
  const [baseline, setBaseline] = useState<InventoryConfigState>(() => normalizeConfig(initialConfig));
  const [editing, setEditing] = useState<EditingTarget | null>(null);
  const [formState, dispatch] = useFormState<UpdateSiteConfigActionState, FormData>(updateSiteConfigAction, { status: "idle" });
  const formRef = useRef<HTMLFormElement>(null);
  const latestConfigRef = useRef(config);
  const prevStatusRef = useRef(formState.status);
  const prevResultRef = useRef(formState);
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
      setBaseline(cloneState(latestConfigRef.current));
      toast.success("保存成功");
      window.dispatchEvent(new CustomEvent("site-config:save-success", { detail: { key: configKey } }));
      formRef.current?.classList.add("animate-pulse");
      const timer = window.setTimeout(() => formRef.current?.classList.remove("animate-pulse"), 400);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [formState, toast, configKey]);

  const payload = useMemo(() => JSON.stringify(serializeConfig(config)), [config]);
  const isDirty = useMemo(() => JSON.stringify(config) !== JSON.stringify(baseline), [config, baseline]);

  const handleAddSection = () => {
    setConfig((prev) => {
      const nextSections = [
        ...prev.sections,
        {
          id: "",
          title: ensureLocalizedNoFallback(undefined),
          summary: ensureLocalizedNoFallback(undefined),
          contact: ensureLocalizedNoFallback(undefined),
          mainPoster: { image: "", title: ensureLocalizedNoFallback(undefined) },
          gallery: [],
        },
      ];
      setEditing({ type: "section", index: nextSections.length - 1, scope: "full" });
      return { ...prev, sections: nextSections };
    });
  };

  const handleSectionSave = (index: number, next: SectionState | null) => {
    let nextSections: SectionState[];
    if (next === null) {
      nextSections = config.sections.filter((_, idx) => idx !== index);
    } else {
      nextSections = [...config.sections];
      nextSections[index] = next;
    }
    const nextConfig = { ...config, sections: nextSections };
    setConfig(nextConfig);
    startGlobalSave(nextConfig);
    setEditing(null);
  };

  const dirtyLabel = isDirty ? "有未保存的更改" : "暂无未保存的更改";

  // 全局保存覆盖层状态与方法（统一体验）
  const [globalSavePhase, setGlobalSavePhase] = useState<"idle" | "saving" | "confirm_cancel" | "restoring">("idle");
  const [progressStep, setProgressStep] = useState<number>(0);
  const PROGRESS_STEPS = ["准备保存", "提交中", "服务器处理", "完成"];

  function startGlobalSave(nextConfig?: InventoryConfigState) {
    setGlobalSavePhase("saving");
    setProgressStep(1);
    const fd = new FormData();
    fd.set("key", configKey);
    try {
      const source = nextConfig ?? latestConfigRef.current;
      fd.set("payload", JSON.stringify(serializeConfig(source)));
    } catch {
      fd.set("payload", payload);
    }
    setProgressStep(2);
    dispatch(fd);
  }

  useEffect(() => {
    const didStatusChange = prevStatusRef.current !== formState.status;
    if (didStatusChange) {
      prevStatusRef.current = formState.status;
    }

    if (globalSavePhase === "saving") {
      // 等待服务器处理阶段
      setProgressStep(3);
    }

    if (formState.status === "success" || formState.status === "error") {
      if (globalSavePhase === "saving" || globalSavePhase === "restoring") {
        setProgressStep(4);
        setGlobalSavePhase("idle");
      }
    }
  }, [formState, globalSavePhase]);

  // 刷新/关闭页面提示：在保存中或有未保存更改时提示确认
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (globalSavePhase === "saving" || isDirty) {
        e.preventDefault();
        e.returnValue = ""; // 触发浏览器默认提示
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [globalSavePhase, isDirty]);

  function handleCancelSaveRequest() {
    setGlobalSavePhase("confirm_cancel");
  }
  function handleCancelSaveConfirmExit() {
    setConfig(baseline);
    setGlobalSavePhase("restoring");
    setProgressStep(1);
    const fd = new FormData();
    fd.set("key", configKey);
    fd.set("payload", JSON.stringify(serializeConfig(baseline)));
    setProgressStep(2);
    dispatch(fd);
  }
  function handleCancelSaveContinue() {
    setGlobalSavePhase("saving");
  }

  return (
    <div className="space-y-10">

      <InventoryPreview config={config} onEdit={setEditing} onAddSection={handleAddSection} />

      {editing?.type === "hero" ? (
        <HeroDialog
          value={config.hero}
          scope={editing.scope}
          onCancel={() => setEditing(null)}
          onSave={(next) => {
            const nextConfig = { ...config, hero: next };
            setConfig(nextConfig);
            startGlobalSave(nextConfig);
            setEditing(null);
          }}
        />
      ) : null}

      {isSectionEditingTarget(editing) ? (
        <SectionDialog
          value={config.sections[editing.index]}
          scope={editing.scope}
          onCancel={() => setEditing(null)}
          onSave={(next) => handleSectionSave(editing.index, next)}
          onDelete={() => handleSectionSave(editing.index, null)}
        />
      ) : null}


    </div>
  );
}
