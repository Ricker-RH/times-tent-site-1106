"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, InputHTMLAttributes, SelectHTMLAttributes } from "react";
import { useFormState, useFormStatus } from "react-dom";

import { VideosHeroSection } from "@/components/videos/VideosHeroSection";
import { VideosLibrarySection } from "@/components/videos/VideosLibrarySection";
import type { VideosConfig } from "@/types/videos";
import { cases_config } from "@/data/configs";

import type { UpdateSiteConfigActionState } from "../actions";
import { updateSiteConfigAction } from "../actions";
import { ConfigPreviewFrame } from "./ConfigPreviewFrame";
import { EditorDialog } from "./EditorDialog";
import { useToast } from "@/providers/ToastProvider";
import { LocalizedTextField as SharedLocalizedTextField } from "./LocalizedTextField";
import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  ensureArray,
  ensureLocalizedRecord,
  ensureString,
  mergeMeta,
  ensureLocalizedNoFallback,
  serializeLocalizedAllowEmpty,
} from "./editorUtils";
import type { LocaleKey } from "@/i18n/locales";
import { useGlobalTranslationRegistrationForConfig } from "@/hooks/useGlobalTranslationManager";

type LocalizedValue = Record<LocaleKey, string>;

interface HeroState {
  backgroundImage: string;
  eyebrow: LocalizedValue;
  title: LocalizedValue;
  description: LocalizedValue;
}

interface SectionHeadingState {
  eyebrow: LocalizedValue;
  title: LocalizedValue;
  description: LocalizedValue;
}

interface VideoItemState {
  slug: string;
  title: LocalizedValue;
  description: LocalizedValue;
  category: string;
  duration: string;
  thumbnail: string;
  bvid: string;
  tags: LocalizedValue[];
  internalId: string;
}

interface FilterState {
  slug: string;
  label: LocalizedValue;
  internalId: string;
}

interface VideosConfigState {
  hero: HeroState;
  sectionHeading: SectionHeadingState;
  filters: FilterState[];
  items: VideoItemState[];
  _meta?: Record<string, unknown>;
}

type HeroEditingScope = "basic" | "visual" | "full";
type SectionHeadingScope = "copy" | "full";

type EditingTarget =
  | { type: "hero"; scope: HeroEditingScope }
  | { type: "sectionHeading"; scope: SectionHeadingScope }
  | { type: "filters" }
  | { type: "items" };

const CASE_CATEGORY_TO_VIDEO_VALUE: Record<string, string> = {
  "sports-events": "events",
  "sports-venues": "venues",
  hospitality: "hospitality",
  industrial: "industrial",
  "brand-events": "brand",
};

interface VideoCategoryOption {
  value: string;
  label: string;
}

const VIDEO_CATEGORY_OPTIONS: VideoCategoryOption[] = (() => {
  const mapped = (cases_config?.categories ?? [])
    .map((category) => {
      const value = CASE_CATEGORY_TO_VIDEO_VALUE[category.slug];
      if (!value) return null;
      return { value, label: category.name };
    })
    .filter(Boolean) as VideoCategoryOption[];

  const unique = new Map<string, VideoCategoryOption>();
  for (const option of mapped) {
    if (!unique.has(option.value)) {
      unique.set(option.value, option);
    }
  }

  const defaults: VideoCategoryOption[] = [
    { value: "events", label: "体育赛事" },
    { value: "venues", label: "体育场馆" },
    { value: "hospitality", label: "酒店文旅" },
    { value: "industrial", label: "工业仓储" },
    { value: "brand", label: "品牌活动" },
  ];

  for (const option of defaults) {
    if (!unique.has(option.value)) {
      unique.set(option.value, option);
    }
  }

  return Array.from(unique.values());
})();

const VIDEO_CATEGORY_VALUE_SET = new Set(VIDEO_CATEGORY_OPTIONS.map((item) => item.value));
const DEFAULT_VIDEO_CATEGORY = VIDEO_CATEGORY_OPTIONS[0]?.value ?? "events";

const DEFAULT_FILTERS: Array<{ slug: string; label: LocalizedValue }> = [
  {
    slug: "all",
    label: normalizeLocalizedValue({ "zh-CN": "全部视频", "zh-TW": "全部影片", en: "All Videos" }, "全部视频"),
  },
  {
    slug: "events",
    label: normalizeLocalizedValue({ "zh-CN": "体育赛事", "zh-TW": "體育賽事", en: "Sports Events" }, "体育赛事"),
  },
  {
    slug: "venues",
    label: normalizeLocalizedValue({ "zh-CN": "体育场馆", "zh-TW": "體育場館", en: "Sports Venues" }, "体育场馆"),
  },
  {
    slug: "hospitality",
    label: normalizeLocalizedValue({ "zh-CN": "酒店文旅", "zh-TW": "酒店文旅", en: "Hospitality" }, "酒店文旅"),
  },
  {
    slug: "industrial",
    label: normalizeLocalizedValue({ "zh-CN": "工业仓储", "zh-TW": "工業倉儲", en: "Industrial" }, "工业仓储"),
  },
  {
    slug: "brand",
    label: normalizeLocalizedValue({ "zh-CN": "品牌活动", "zh-TW": "品牌活動", en: "Brand Events" }, "品牌活动"),
  },
];

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function normalizeLocalizedValue(value: unknown, fallback: string): LocalizedValue {
  // 无回退：保留各语言的空值，不注入默认或 base 文案
  return ensureLocalizedNoFallback(value) as LocalizedValue;
}

function ensureLocalized(value: unknown, fallback: string): LocalizedValue {
  // 无回退：忽略 fallback，按原始值保留空字符串
  return ensureLocalizedNoFallback(value) as LocalizedValue;
}

function cleanLocalized(record: LocalizedValue): LocalizedValue {
  // 允许空值序列化，保留显式空字符串键以确保回显
  return serializeLocalizedAllowEmpty(record) as LocalizedValue;
}

function cloneState<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function createInternalId(seed?: string): string {
  return `${seed ?? "item"}-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`;
}

function normalizeHero(raw: unknown): HeroState {
  const hero = asRecord(raw);
  return {
    backgroundImage: ensureString(hero.backgroundImage),
    eyebrow: ensureLocalized(hero.eyebrow, ""),
    title: ensureLocalized(hero.title, ""),
    description: ensureLocalized(hero.description, ""),
  } satisfies HeroState;
}

function normalizeSectionHeading(raw: unknown): SectionHeadingState {
  const heading = asRecord(raw);
  return {
    eyebrow: ensureLocalized(heading.eyebrow, ""),
    title: ensureLocalized(heading.title, ""),
    description: ensureLocalized(heading.description, ""),
  } satisfies SectionHeadingState;
}

function normalizeFilters(raw: unknown): FilterState[] {
  const entries = ensureArray<Record<string, unknown>>(raw);
  return entries.map((entry, index) => {
    const record = entry as Record<string, unknown>;
    const slug = ensureString(record.slug);
    return {
      slug,
      label: ensureLocalized(record.label, ""),
      internalId: createInternalId(slug || `filter-${index}`),
    } satisfies FilterState;
  });
}

function normalizeVideoItems(raw: unknown): VideoItemState[] {
  const items = ensureArray<Record<string, unknown>>(raw).map((item, index) => {
    const tagsRaw = ensureArray<Record<string, unknown>>(item.tags);
    const tags = tagsRaw.map((tag) => ensureLocalized(tag, ""));
    const slug = ensureString(item.slug);
    const category = ensureString(item.category);
    return {
      slug,
      title: ensureLocalized(item.title, ""),
      description: ensureLocalized(item.description, ""),
      category,
      duration: ensureString(item.duration),
      thumbnail: ensureString(item.thumbnail),
      bvid: ensureString(item.bvid),
      tags,
      internalId: createInternalId(slug || `video-${index + 1}`),
    } satisfies VideoItemState;
  });

  return items;
}

function normalizeConfig(raw: Record<string, unknown>): VideosConfigState {
  const meta = raw._meta && typeof raw._meta === "object" ? (raw._meta as Record<string, unknown>) : undefined;
  return {
    hero: normalizeHero(raw.hero),
    sectionHeading: normalizeSectionHeading(raw.sectionHeading),
    filters: normalizeFilters(raw.filters),
    items: normalizeVideoItems(raw.items),
    _meta: meta ? { ...meta } : undefined,
  } satisfies VideosConfigState;
}

function serializeConfig(config: VideosConfigState): VideosConfig {
  const items = config.items
    .map(({ internalId: _internalId, tags, ...item }) => {
      const categoryValue = item.category.trim();
      const category = VIDEO_CATEGORY_VALUE_SET.has(categoryValue) ? categoryValue : DEFAULT_VIDEO_CATEGORY;
      return {
        slug: item.slug.trim() || undefined,
        title: cleanLocalized(item.title),
        description: cleanLocalized(item.description),
        category,
        duration: item.duration.trim() || undefined,
        thumbnail: item.thumbnail.trim(),
        bvid: item.bvid.trim() || undefined,
        tags: tags
          .map((tag) => cleanLocalized(tag))
          .filter((tag) => Object.keys(tag).length),
      };
    })
    .filter((item) =>
      (item.slug && item.thumbnail) || Object.keys(item.title).length || Object.keys(item.description).length,
    );

  return mergeMeta(
    {
      hero: {
        backgroundImage: config.hero.backgroundImage.trim(),
        eyebrow: cleanLocalized(config.hero.eyebrow),
        title: cleanLocalized(config.hero.title),
        description: cleanLocalized(config.hero.description),
      },
      sectionHeading: {
        eyebrow: cleanLocalized(config.sectionHeading.eyebrow),
        title: cleanLocalized(config.sectionHeading.title),
        description: cleanLocalized(config.sectionHeading.description),
      },
      filters: config.filters.map((filter) => ({
        slug: filter.slug.trim(),
        label: cleanLocalized(filter.label),
      })),
      items,
    } as VideosConfig,
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
  helper,
}: {
  label: string;
  value: LocalizedValue;
  onChange: (next: LocalizedValue) => void;
  multiline?: boolean;
  rows?: number;
  placeholder?: string;
  translationContext?: string;
  helper?: string;
}) {
  const normalized = ensureLocalizedNoFallback(value) as LocalizedValue;
  return (
    <SharedLocalizedTextField
      label={label}
      value={normalized}
      multiline={multiline}
      rows={rows}
      placeholder={placeholder}
      translationContext={translationContext}
      helper={helper}
      onChange={(next) => onChange(ensureLocalizedNoFallback(next) as LocalizedValue)}
    />
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  inputProps,
  helperText,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  inputProps?: InputHTMLAttributes<HTMLInputElement> & Record<string, unknown>;
  helperText?: string;
}) {
  return (
    <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-text-tertiary,#8690a3)]">
      <span>{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-text-secondary)] focus:border-[var(--color-brand-primary)] focus:outline-none"
        {...inputProps}
      />
      {helperText ? <span className="text-[10px] normal-case tracking-normal text-[var(--color-text-tertiary,#8690a3)]">{helperText}</span> : null}
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  selectProps,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  options: VideoCategoryOption[];
  selectProps?: SelectHTMLAttributes<HTMLSelectElement>;
}) {
  return (
    <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-text-tertiary,#8690a3)]">
      <span>{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-text-secondary)] focus:border-[var(--color-brand-primary)] focus:outline-none"
        {...selectProps}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
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

  const hasValue = Boolean(value?.trim());

  return (
    <div className="space-y-2 text-sm">
      <span className="font-medium text-[var(--color-brand-secondary)]">{label}</span>
      <div className="space-y-2 rounded-2xl border border-[var(--color-border)] bg-white/80 p-3">
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="https://..."
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
        {hasValue ? (
          <div className="relative mt-2 h-32 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]">
            <Image src={value} alt="图片预览" fill sizes="100vw" className="object-cover" />
          </div>
        ) : null}
      </div>
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
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
  const heroContextBase = "视频库英雄区";

  useEffect(() => {
    setDraft(cloneState(value));
  }, [value, scope]);

  const showBasic = scope === "basic" || scope === "full";
  const showVisual = scope === "visual" || scope === "full";

  let title = "编辑英雄板块";
  let subtitle = "维护主视觉文案与背景";
  if (scope === "basic") {
    title = "编辑英雄板块 - 文案";
    subtitle = "调整眉头、标题与描述";
  } else if (scope === "visual") {
    title = "编辑英雄板块 - 背景";
    subtitle = "更新背景图片地址";
  }

  return (
    <EditorDialog title={title} subtitle={subtitle} onSave={() => onSave(cloneState(draft))} onCancel={onCancel}>
      <div className="space-y-6 text-sm">
        {showBasic ? (
          <div className="space-y-6">
            <LocalizedTextField
              label="眉头"
              translationContext={`${heroContextBase}眉头`}
              value={draft.eyebrow}
              onChange={(next) => setDraft((prev) => ({ ...prev, eyebrow: next }))}
            />
            <LocalizedTextField
              label="标题"
              translationContext={`${heroContextBase}标题`}
              value={draft.title}
              onChange={(next) => setDraft((prev) => ({ ...prev, title: next }))}
            />
            <LocalizedTextField
              label="描述"
              translationContext={`${heroContextBase}描述`}
              value={draft.description}
              onChange={(next) => setDraft((prev) => ({ ...prev, description: next }))}
              multiline
              rows={4}
            />
          </div>
        ) : null}

        {showVisual ? (
          <ImageUploadField
            label="背景图片"
            value={draft.backgroundImage}
            onChange={(next) => setDraft((prev) => ({ ...prev, backgroundImage: next }))}
            helper="最佳尺寸 1200×420"
          />
        ) : null}
      </div>
    </EditorDialog>
  );
}

function SectionHeadingDialog({
  value,
  onSave,
  onCancel,
}: {
  value: SectionHeadingState;
  onSave: (next: SectionHeadingState) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<SectionHeadingState>(cloneState(value));
  const sectionHeadingContextBase = "视频库精选影像板块";

  useEffect(() => {
    setDraft(cloneState(value));
  }, [value]);

  return (
    <EditorDialog title="编辑精选影像文案" subtitle="调整眉头、标题与描述" onSave={() => onSave(cloneState(draft))} onCancel={onCancel}>
      <div className="space-y-6 text-sm">
        <LocalizedTextField
          label="眉头"
          translationContext={`${sectionHeadingContextBase}眉头`}
          value={draft.eyebrow}
          onChange={(next) => setDraft((prev) => ({ ...prev, eyebrow: next }))}
        />
        <LocalizedTextField
          label="标题"
          translationContext={`${sectionHeadingContextBase}标题`}
          value={draft.title}
          onChange={(next) => setDraft((prev) => ({ ...prev, title: next }))}
        />
        <LocalizedTextField
          label="描述"
          translationContext={`${sectionHeadingContextBase}描述`}
          value={draft.description}
          onChange={(next) => setDraft((prev) => ({ ...prev, description: next }))}
          multiline
          rows={4}
        />
      </div>
    </EditorDialog>
  );
}

function VideosItemsDialog({ value, onSave, onCancel }: { value: VideoItemState[]; onSave: (next: VideoItemState[]) => void; onCancel: () => void }) {
  const [draft, setDraft] = useState<VideoItemState[]>(cloneState(value));
  const itemRefs = useRef(new Map<string, HTMLDivElement>());
  const [pendingFocusId, setPendingFocusId] = useState<string | null>(null);

  useEffect(() => {
    itemRefs.current.clear();
    setDraft(cloneState(value));
  }, [value]);

  useEffect(() => {
    if (!pendingFocusId) return;
    const frame = requestAnimationFrame(() => {
      const node = itemRefs.current.get(pendingFocusId);
      if (node) {
        node.scrollIntoView({ behavior: "smooth", block: "center" });
        const focusTarget = node.querySelector<HTMLElement>("input[data-focus-target='slug']");
        if (focusTarget instanceof HTMLInputElement || focusTarget instanceof HTMLTextAreaElement) {
          focusTarget.focus();
          if (focusTarget instanceof HTMLInputElement) {
            focusTarget.select();
          }
        } else {
          const fallback = node.querySelector<HTMLElement>("input, textarea, button, select");
          fallback?.focus();
        }
      }
      setPendingFocusId(null);
    });
    return () => cancelAnimationFrame(frame);
  }, [pendingFocusId, draft]);

  const handleMove = (index: number, direction: -1 | 1) => {
    setDraft((prev) => {
      const next = [...prev];
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= next.length) return prev;
      const temp = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = temp;
      return next;
    });
  };

  return (
    <EditorDialog
      title="管理视频列表"
      subtitle="新增、排序或编辑视频卡片"
      onSave={() => onSave(cloneState(draft))}
      onCancel={onCancel}
      saveLabel="保存视频列表"
    >
      <div className="space-y-6 text-sm">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() =>
              setDraft((prev) => {
                const nextIndex = prev.length + 1;
                const slug = `video-${nextIndex}`;
                const newItem: VideoItemState = {
                  slug,
                  title: ensureLocalized(undefined, `视频 ${nextIndex}`),
                  description: ensureLocalized(undefined, "补充视频描述"),
                  category: DEFAULT_VIDEO_CATEGORY,
                  duration: "",
                  thumbnail: "",
                  bvid: "",
                  tags: [ensureLocalized(undefined, "模块化")],
                  internalId: createInternalId(slug),
                };
                setPendingFocusId(newItem.internalId);
                return [...prev, newItem];
              })
            }
            className="rounded-full border border-[var(--color-brand-primary)] px-4 py-2 text-xs font-semibold text-[var(--color-brand-primary)]"
          >
            + 新增视频
          </button>
        </div>
        <div className="space-y-4">
          {draft.map((item, index) => {
            const cardContextBase = `视频库视频卡片(${item.slug || index + 1})`;
            return (
              <div
                key={item.internalId}
                ref={(node) => {
                  if (node) {
                    itemRefs.current.set(item.internalId, node);
                  } else {
                    itemRefs.current.delete(item.internalId);
                  }
                }}
                className="space-y-4 rounded-2xl border border-[var(--color-border)] bg-white/80 p-4"
              >
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--color-text-tertiary,#8690a3)]">
                <span>视频 {index + 1}</span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleMove(index, -1)}
                    className="rounded-full border border-[var(--color-border)] px-3 py-1 transition hover:border-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary)]"
                    disabled={index === 0}
                  >
                    上移
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMove(index, 1)}
                    className="rounded-full border border-[var(--color-border)] px-3 py-1 transition hover:border-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary)]"
                    disabled={index === draft.length - 1}
                  >
                    下移
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setDraft((prev) => prev.filter((_, idx) => idx !== index))
                    }
                    className="rounded-full border border-rose-200 px-3 py-1 text-rose-500 transition hover:bg-rose-50"
                  >
                    删除
                  </button>
                </div>
              </div>
              <TextField
                label="Slug"
                value={item.slug}
                onChange={(next) =>
                  setDraft((prev) =>
                    prev.map((video, idx) => (idx === index ? { ...video, slug: next } : video)),
                  )
                }
                placeholder="video-key"
                inputProps={{ "data-focus-target": "slug" }}
              />
                <LocalizedTextField
                  label="标题"
                  translationContext={`${cardContextBase}标题`}
                  value={item.title}
                  onChange={(next) =>
                    setDraft((prev) =>
                      prev.map((video, idx) => (idx === index ? { ...video, title: next } : video)),
                    )
                  }
                />
                <LocalizedTextField
                  label="描述"
                  translationContext={`${cardContextBase}描述`}
                  value={item.description}
                  onChange={(next) =>
                    setDraft((prev) =>
                      prev.map((video, idx) => (idx === index ? { ...video, description: next } : video)),
                    )
                  }
                  multiline
                  rows={3}
                />
              <div className="grid gap-4 md:grid-cols-2">
                <SelectField
                  label="分类"
                  value={item.category}
                  onChange={(next) =>
                    setDraft((prev) =>
                      prev.map((video, idx) => {
                        const category = VIDEO_CATEGORY_VALUE_SET.has(next) ? next : DEFAULT_VIDEO_CATEGORY;
                        return idx === index ? { ...video, category } : video;
                      }),
                    )
                  }
                  options={VIDEO_CATEGORY_OPTIONS}
                />
                <TextField
                  label="时长"
                  value={item.duration}
                  onChange={(next) =>
                    setDraft((prev) =>
                      prev.map((video, idx) => (idx === index ? { ...video, duration: next } : video)),
                    )
                  }
                  placeholder="03:12"
                />
              </div>
              <ImageUploadField
                label="封面图"
                value={item.thumbnail}
                onChange={(next) =>
                  setDraft((prev) =>
                    prev.map((video, idx) => (idx === index ? { ...video, thumbnail: next } : video)),
                  )
                }
                helper="最佳尺寸 384×224"
              />
              <TextField
                label="B 站视频编号 (可选)"
                value={item.bvid}
                onChange={(next) =>
                  setDraft((prev) =>
                    prev.map((video, idx) => (idx === index ? { ...video, bvid: next } : video)),
                  )
                }
                placeholder="BVxxxxxxxx"
              />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-text-tertiary,#8690a3)]">标签</h4>
                  <button
                    type="button"
                    onClick={() =>
                      setDraft((prev) =>
                        prev.map((video, idx) =>
                          idx === index
                            ? { ...video, tags: [...video.tags, ensureLocalized(undefined, `标签 ${video.tags.length + 1}`)] }
                            : video,
                        ),
                      )
                    }
                    className="rounded-full border border-[var(--color-brand-primary)] px-3 py-1 text-xs font-semibold text-[var(--color-brand-primary)]"
                  >
                    + 新增标签
                  </button>
                </div>
                <div className="space-y-3">
                  {item.tags.map((tag, tagIndex) => (
                    <div key={tagIndex} className="space-y-2 rounded-2xl border border-[var(--color-border)] bg-white/70 p-3">
                      <div className="flex items-center justify-between text-xs text-[var(--color-text-tertiary,#8690a3)]">
                        <span>标签 {tagIndex + 1}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setDraft((prev) =>
                              prev.map((video, idx) =>
                                idx === index
                                  ? {
                                      ...video,
                                      tags: video.tags.filter((_, idx2) => idx2 !== tagIndex),
                                    }
                                  : video,
                              ),
                            )
                          }
                          className="rounded-full border border-rose-200 px-3 py-1 text-rose-500 transition hover:bg-rose-50"
                        >
                          删除
                        </button>
                      </div>
                      <LocalizedTextField
                        label="标签文案"
                        translationContext={`${cardContextBase}标签${tagIndex + 1}`}
                        value={tag}
                        onChange={(next) =>
                          setDraft((prev) =>
                            prev.map((video, idx) =>
                              idx === index
                                ? {
                                    ...video,
                                    tags: video.tags.map((itemTag, idx2) => (idx2 === tagIndex ? next : itemTag)),
                                  }
                                : video,
                            ),
                          )
                        }
                      />
                    </div>
                  ))}
                  {!item.tags.length ? (
                    <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-white/60 p-3 text-center text-xs text-[var(--color-text-secondary)]">
                      暂无标签，请新增。
                    </div>
                  ) : null}
                </div>
              </div>
              </div>
            );
          })}
          {!draft.length ? (
            <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-white/60 p-6 text-center text-xs text-[var(--color-text-secondary)]">
              暂无视频，请新增。
            </div>
          ) : null}
        </div>
      </div>
    </EditorDialog>
  );
}

function FiltersDialog({ value, onSave, onCancel }: { value: FilterState[]; onSave: (next: FilterState[]) => void; onCancel: () => void }) {
  const [draft, setDraft] = useState<FilterState[]>(cloneState(value));
  const filtersContextBase = "视频库筛选标签";

  useEffect(() => {
    setDraft(cloneState(value));
  }, [value]);

  const handleAdd = () => {
    setDraft((prev) => {
      const nextIndex = prev.length;
      const fallback = DEFAULT_FILTERS[nextIndex % DEFAULT_FILTERS.length];
      const baseLabel = fallback?.label ?? ensureLocalized(undefined, `筛选 ${nextIndex + 1}`);
      const slugBase = fallback?.slug ?? `filter-${nextIndex + 1}`;
      const slug = prev.some((item) => item.slug === slugBase) ? `${slugBase}-${Date.now().toString(36)}` : slugBase;
      return [
        ...prev,
        {
          slug,
          label: cloneState(baseLabel),
          internalId: createInternalId(slug),
        },
      ];
    });
  };

  return (
    <EditorDialog title="编辑筛选标签" subtitle="调整视频分类筛选的显示名称" onSave={() => onSave(cloneState(draft))} onCancel={onCancel}>
      <div className="space-y-4 text-sm">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleAdd}
            className="rounded-full border border-[var(--color-brand-primary)] px-4 py-2 text-xs font-semibold text-[var(--color-brand-primary)]"
          >
            + 新增标签
          </button>
        </div>

        {draft.map((filter, index) => (
          <div key={filter.internalId} className="space-y-3 rounded-2xl border border-[var(--color-border)] bg-white/80 p-4">
            <div className="flex items-center justify-between text-xs text-[var(--color-text-tertiary,#8690a3)]">
              <span>标签 {index + 1}</span>
              <button
                type="button"
                onClick={() => setDraft((prev) => prev.filter((_, idx) => idx !== index))}
                className="rounded-full border border-rose-200 px-3 py-1 text-rose-500 transition hover:bg-rose-50"
                disabled={filter.slug === "all"}
              >
                删除
              </button>
            </div>
            <TextField
              label="Slug"
              value={filter.slug}
              onChange={(next) =>
                setDraft((prev) =>
                  prev.map((item, idx) => (idx === index ? { ...item, slug: next.trim() || item.slug } : item)),
                )
              }
              helperText={filter.slug === "all" ? "全部视频的 slug 固定为 all" : undefined}
            />
            <LocalizedTextField
              label="标签名称"
              translationContext={`${filtersContextBase}${index + 1}`}
              value={filter.label}
              onChange={(next) =>
                setDraft((prev) =>
                  prev.map((item, idx) => (idx === index ? { ...item, label: next } : item)),
                )
              }
            />
          </div>
        ))}

        {!draft.length ? (
          <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-white/60 p-6 text-center text-xs text-[var(--color-text-secondary)]">
            暂无筛选标签，请新增。
          </div>
        ) : null}
      </div>
    </EditorDialog>
  );
}

function VideosPreview({ config, onEdit }: { config: VideosConfigState; onEdit: (target: EditingTarget) => void }) {
  const previewConfig = useMemo(() => serializeConfig(config), [config]);

  return (
    <ConfigPreviewFrame
      title="视频库页面"
      description="悬停板块可直达对应配置"
      viewportWidth={1080}
      autoScale
      maxHeight={null}
    >
      <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white">
        <SectionWrapper
          actions={[
            { label: "基础文案", onClick: () => onEdit({ type: "hero", scope: "basic" }) },
            { label: "背景图", onClick: () => onEdit({ type: "hero", scope: "visual" }) },
            { label: "全部字段", onClick: () => onEdit({ type: "hero", scope: "full" }) },
          ]}
        >
          {previewConfig.hero ? <VideosHeroSection hero={previewConfig.hero} /> : null}
        </SectionWrapper>

        <SectionWrapper
          actions={[
            { label: "板块文案", onClick: () => onEdit({ type: "sectionHeading", scope: "copy" }) },
            { label: "筛选标签", onClick: () => onEdit({ type: "filters" }) },
            { label: "视频列表", onClick: () => onEdit({ type: "items" }) },
          ]}
        >
          <VideosLibrarySection
            sectionHeading={previewConfig.sectionHeading}
            filters={previewConfig.filters}
            videos={previewConfig.items}
          />
        </SectionWrapper>
      </div>
    </ConfigPreviewFrame>
  );
}

export function VideosConfigEditor({ configKey, initialConfig }: { configKey: string; initialConfig: Record<string, unknown> }) {
  const [config, setConfig] = useState<VideosConfigState>(() => normalizeConfig(initialConfig));
  useGlobalTranslationRegistrationForConfig({ config, setConfig, labelPrefix: configKey });
  const [baseline, setBaseline] = useState<VideosConfigState>(() => normalizeConfig(initialConfig));
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
      setBaseline(cloneState(latestConfigRef.current));
      formRef.current?.classList.add("animate-pulse");
      const timer = window.setTimeout(() => formRef.current?.classList.remove("animate-pulse"), 400);
      toast.success("保存成功");
      window.dispatchEvent(new CustomEvent("site-config:save-success", { detail: { key: configKey } }));
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [formState.status, toast, configKey]);

  const payload = useMemo(() => JSON.stringify(serializeConfig(config)), [config]);
  const isDirty = useMemo(() => JSON.stringify(config) !== JSON.stringify(baseline), [config, baseline]);
  
  function startGlobalSave(nextConfig?: VideosConfigState) {
    const fd = new FormData();
    fd.set("key", configKey);
    try {
      const source = nextConfig ?? latestConfigRef.current;
      fd.set("payload", JSON.stringify(serializeConfig(source)));
    } catch {
      fd.set("payload", payload);
    }
    dispatch(fd);
  }
  
  return (
    <div className="space-y-10">

      <VideosPreview config={config} onEdit={(target) => setEditing(target)} />

      {editing?.type === "hero" ? (
        <HeroDialog
          value={config.hero}
          scope={editing.scope}
          onCancel={() => setEditing(null)}
          onSave={(next) => {
            const updated = { ...config, hero: next };
            setConfig(updated);
            startGlobalSave(updated);
            setEditing(null);
          }}
        />
      ) : null}

      {editing?.type === "sectionHeading" ? (
        <SectionHeadingDialog
          value={config.sectionHeading}
          onCancel={() => setEditing(null)}
          onSave={(next) => {
            const updated = { ...config, sectionHeading: next };
            setConfig(updated);
            startGlobalSave(updated);
            setEditing(null);
          }}
        />
      ) : null}

      {editing?.type === "filters" ? (
        <FiltersDialog
          value={config.filters}
          onCancel={() => setEditing(null)}
          onSave={(next) => {
            const updated = { ...config, filters: next };
            setConfig(updated);
            startGlobalSave(updated);
            setEditing(null);
          }}
        />
      ) : null}

      {editing?.type === "items" ? (
        <VideosItemsDialog
          value={config.items}
          onCancel={() => setEditing(null)}
          onSave={(next) => {
            const updated = { ...config, items: next };
            setConfig(updated);
            startGlobalSave(updated);
            setEditing(null);
          }}
        />
      ) : null}
    </div>
  );
}
