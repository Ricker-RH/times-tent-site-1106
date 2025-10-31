"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { useFormState, useFormStatus } from "react-dom";

import { AboutCompanySection } from "@/components/about/AboutCompanySection";
import { AboutFactorySection } from "@/components/about/AboutFactorySection";
import { AboutHeroSection } from "@/components/about/AboutHeroSection";
import { AboutHonorsSection } from "@/components/about/AboutHonorsSection";
import { AboutTeamSection } from "@/components/about/AboutTeamSection";
import { AboutWhySection } from "@/components/about/AboutWhySection";
import type { AboutConfig } from "@/server/pageConfigs";

import type { UpdateSiteConfigActionState } from "../actions";
import { updateSiteConfigAction } from "../actions";
import { ConfigPreviewFrame } from "./ConfigPreviewFrame";
import { EditorDialog } from "./EditorDialog";
import { useToast } from "@/providers/ToastProvider";
import {
  DEFAULT_LOCALE,
  ensureArray,
  ensureLocalizedRecord,
  ensureString,
  getLocaleText,
  setLocaleText,
  ensureLocalizedNoFallback,
  serializeLocalizedAllowEmpty,
} from "./editorUtils";

const LOCALES = [
  { code: "zh-CN", label: "中文" },
  { code: "en", label: "English" },
  { code: "zh-TW", label: "繁體" },
] as const;

interface AboutHeroState {
  backgroundImage: string;
  eyebrow: Record<string, string>;
  title: Record<string, string>;
  description: Record<string, string>;
}

interface IntroStatState {
  label: Record<string, string>;
  value: string;
}

interface AboutIntroState {
  eyebrow: Record<string, string>;
  title: Record<string, string>;
  strapline: Record<string, string>;
  paragraph: Record<string, string>;
  stats: IntroStatState[];
  campusImage: string;
}

interface ManufacturingGalleryState {
  label: string;
  labelEn: string;
  image: string;
  description?: Record<string, string>;
  order?: number;
}

interface ManufacturingFeatureCardState {
  label: Record<string, string>;
  description: Record<string, string>;
  image: string;
  order?: number;
}

interface ManufacturingState {
  eyebrow: Record<string, string>;
  title: Record<string, string>;
  description: Record<string, string>;
  mainImage: string;
  gallery: ManufacturingGalleryState[];
  featureCards: ManufacturingFeatureCardState[];
  bulletPoints: Record<string, string>[];
}

interface TeamCompositionState {
  label: Record<string, string>;
  value: string;
  description: Record<string, string>;
}

interface TeamLeaderState {
  name: string;
  role: Record<string, string>;
  bio: Record<string, string>;
  image: string;
}

interface TeamState {
  eyebrow: Record<string, string>;
  title: Record<string, string>;
  description: Record<string, string>;
  composition: TeamCompositionState[];
  leadership: TeamLeaderState[];
}

interface HonorsItemState {
  name: Record<string, string>;
  image: string;
}

interface HonorsState {
  eyebrow: Record<string, string>;
  title: Record<string, string>;
  description: Record<string, string>;
  certificates: HonorsItemState[];
  patents: HonorsItemState[];
}

interface WhyHighlightState {
  icon: string;
  image: string;
  title: Record<string, string>;
  description: Record<string, string>;
}

interface WhyState {
  eyebrow: Record<string, string>;
  title: Record<string, string>;
  description: Record<string, string>;
  highlights: WhyHighlightState[];
}

interface AboutConfigState {
  hero: AboutHeroState;
  intro: AboutIntroState;
  manufacturing: ManufacturingState;
  team: TeamState;
  honors: HonorsState;
  why: WhyState;
  _meta?: Record<string, unknown>;
}

interface AboutConfigEditorProps {
  configKey: string;
  initialConfig: Record<string, unknown>;
}

type IntroEditingScope = "basic" | "stats" | "campusImage" | "full";
type ManufacturingEditingScope = "basic" | "gallery" | "featureCards" | "bulletPoints" | "full";
type TeamEditingScope = "basic" | "composition" | "leadership" | "full";
type HonorsEditingScope = "basic" | "certificates" | "patents" | "full";
type WhyEditingScope = "basic" | "highlights" | "full";

type EditingTarget =
  | { type: "hero" }
  | { type: "intro"; scope: IntroEditingScope }
  | { type: "manufacturing"; scope: ManufacturingEditingScope }
  | { type: "team"; scope: TeamEditingScope }
  | { type: "honors"; scope: HonorsEditingScope }
  | { type: "why"; scope: WhyEditingScope };

function arrayMove<T>(list: T[], from: number, to: number): T[] {
  if (from === to) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function ensureLocalized(value: unknown, fallback: string): Record<string, string> {
  // 保留空值：不注入 DEFAULT_LOCALE 回退文本
  return ensureLocalizedNoFallback(value);
}

function ensureLocalizedWithLegacy(
  value: unknown,
  fallback: string,
  extras: Array<[string, unknown]> = [],
): Record<string, string> {
  const record = ensureLocalizedNoFallback(value);
  for (const [locale, extra] of extras) {
    if (typeof extra === "string" && extra.trim().length) {
      record[locale] = extra.trim();
    }
  }
  return record;
}

function emptyLocalized(fallback: string): Record<string, string> {
  return ensureLocalizedNoFallback(undefined);
}

function normalizeAboutConfig(raw: Record<string, unknown>): AboutConfigState {
  const heroRaw = (raw.hero ?? {}) as Record<string, unknown>;
  const introRaw = (raw.introSection ?? {}) as Record<string, unknown>;
  const manufacturingRaw = (raw.manufacturingSection ?? {}) as Record<string, unknown>;
  const teamRaw = (raw.teamSection ?? {}) as Record<string, unknown>;
  const honorsRaw = (raw.honorsSection ?? {}) as Record<string, unknown>;
  const whyRaw = (raw.whyUsSection ?? {}) as Record<string, unknown>;

  const hero: AboutHeroState = {
    backgroundImage: ensureString(heroRaw.backgroundImage),
    eyebrow: ensureLocalized(heroRaw.eyebrow, "关于时代"),
    title: ensureLocalized(heroRaw.title, "设计制造一体化"),
    description: ensureLocalized(heroRaw.description, "时代篷房提供从方案到交付的全流程服务"),
  };

  const intro: AboutIntroState = {
    eyebrow: ensureLocalized(introRaw.eyebrow, "公司简介"),
    title: ensureLocalized(introRaw.title, "关于时代篷房"),
    strapline: ensureLocalized(introRaw.strapline, "模块化空间体系 · 设计制造交付一体"),
    paragraph: ensureLocalized(introRaw.paragraph, "时代篷房深耕模块化临建 15 年，自建 45,000㎡ 智能制造基地。"),
    stats: ensureArray<Record<string, unknown>>(introRaw.stats).map((item, index) => {
      const fallbackLabel = ensureString(item.label, `指标 ${index + 1}`);
      const legacyLabelTw =
        (item as Record<string, unknown>)["labelZhTw"] ?? (item as Record<string, unknown>)["labelTw"];
      const label = ensureLocalizedWithLegacy(item.label, fallbackLabel, [
        ["en", item.labelEn],
        ["zh-TW", legacyLabelTw],
      ]);
      return {
        label,
        value: ensureString(item.value, "0"),
      };
    }),
    campusImage: ensureString(introRaw.campusImage),
  };

  const manufacturing: ManufacturingState = {
    eyebrow: ensureLocalized(manufacturingRaw.eyebrow, "工厂实力"),
    title: ensureLocalized(manufacturingRaw.title, "一体化制造"),
    description: ensureLocalized(manufacturingRaw.description, "生产线覆盖铝型材挤压、膜材焊接、结构测试等关键工序。"),
    mainImage: ensureString(manufacturingRaw.mainImage),
    gallery: ensureArray<Record<string, unknown>>(manufacturingRaw.gallery).map((item, index) => ({
      label: ensureString(item.label, `图库 ${index + 1}`),
      labelEn: ensureString(item.labelEn),
      image: ensureString(item.image),
      description: item.description ? ensureLocalized(item.description, `图库描述 ${index + 1}`) : undefined,
      order: typeof item.order === "number" ? item.order : undefined,
    })),
    featureCards: ensureArray<Record<string, unknown>>(manufacturingRaw.featureCards).map((item, index) => ({
      label: ensureLocalizedWithLegacy(item.label, `卡片 ${index + 1}`, [["en", item.labelEn]]),
      image: ensureString(item.image),
      description: ensureLocalized(item.description, `卡片描述 ${index + 1}`),
      order: typeof item.order === "number" ? item.order : undefined,
    })),
    bulletPoints: ensureArray<Record<string, unknown>>(manufacturingRaw.bulletPoints).map((item, index) =>
      ensureLocalized(item, `制造亮点 ${index + 1}`),
    ),
  };

  const team: TeamState = {
    eyebrow: ensureLocalized(teamRaw.eyebrow, "团队介绍"),
    title: ensureLocalized(teamRaw.title, "跨学科团队"),
    description: ensureLocalized(teamRaw.description, "研发、销售顾问与施工交付组成三位一体团队。"),
    composition: ensureArray<Record<string, unknown>>(teamRaw.composition).map((item, index) => ({
      label: ensureLocalizedWithLegacy(item.label, `板块 ${index + 1}`, [["en", item.labelEn]]),
      value: ensureString(item.value, "0"),
      description: ensureLocalizedWithLegacy(
        item.description,
        ensureString(item.description, `板块描述 ${index + 1}`),
        [["en", item.descriptionEn]],
      ),
    })),
    leadership: ensureArray<Record<string, unknown>>(teamRaw.leadership).map((item, index) => ({
      name: ensureString(item.name, `成员 ${index + 1}`),
      role: ensureLocalized(item.role, "岗位角色"),
      bio: ensureLocalized(item.bio, "成员简介"),
      image: ensureString(item.image),
    })),
  };

  const honors: HonorsState = {
    eyebrow: ensureLocalized(honorsRaw.eyebrow, "荣誉资质"),
    title: ensureLocalized(honorsRaw.title, "行业认可"),
    description: ensureLocalized(honorsRaw.description, "坚持高标准质量与安全体系，持续获得行业资质与核心专利。"),
    certificates: ensureArray<Record<string, unknown>>(honorsRaw.certificates).map((item, index) => ({
      name: ensureLocalizedWithLegacy(item.name, `荣誉 ${index + 1}`, [["en", item.nameEn]]),
      image: ensureString(item.image),
    })),
    patents: ensureArray<Record<string, unknown>>(honorsRaw.patents).map((item, index) => ({
      name: ensureLocalizedWithLegacy(item.name, `专利 ${index + 1}`, [["en", item.nameEn]]),
      image: ensureString(item.image),
    })),
  };

  const why: WhyState = {
    eyebrow: ensureLocalized(whyRaw.eyebrow, "选择我们"),
    title: ensureLocalized(whyRaw.title, "合作理由"),
    description: ensureLocalized(whyRaw.description, "从设计力到制造力、供应链到服务力，我们打造模块化体验。"),
    highlights: ensureArray<Record<string, unknown>>(whyRaw.highlights).map((item, index) => ({
      icon: ensureString(item.icon, "sparkles"),
      image: ensureString(item.image),
      title: ensureLocalized(item.title, `亮点 ${index + 1}`),
      description: ensureLocalized(item.description, "亮点描述"),
    })),
  };

  return {
    hero,
    intro,
    manufacturing,
    team,
    honors,
    why,
    _meta: typeof raw._meta === "object" && raw._meta ? { ...(raw._meta as Record<string, unknown>) } : undefined,
  } satisfies AboutConfigState;
}

function serializeLocalized(record: Record<string, string>): Record<string, string> {
  return serializeLocalizedAllowEmpty(record);
}

function serializeAboutConfig(config: AboutConfigState): AboutConfig {
  return ({
    _meta: config._meta ? { ...config._meta } : undefined,
    hero: {
      backgroundImage: config.hero.backgroundImage.trim(),
      eyebrow: serializeLocalized(config.hero.eyebrow),
      title: serializeLocalized(config.hero.title),
      description: serializeLocalized(config.hero.description),
    },
    introSection: {
      eyebrow: serializeLocalized(config.intro.eyebrow),
      title: serializeLocalized(config.intro.title),
      strapline: serializeLocalized(config.intro.strapline),
      paragraph: serializeLocalized(config.intro.paragraph),
      stats: config.intro.stats.map((item) => ({
        label: serializeLocalized(item.label),
        value: item.value.trim(),
      })),
      campusImage: config.intro.campusImage.trim(),
    },
    manufacturingSection: {
      eyebrow: serializeLocalized(config.manufacturing.eyebrow),
      title: serializeLocalized(config.manufacturing.title),
      description: serializeLocalized(config.manufacturing.description),
      mainImage: config.manufacturing.mainImage.trim(),
      gallery: config.manufacturing.gallery.map((item) => ({
        label: item.label.trim(),
        labelEn: item.labelEn.trim(),
        image: item.image.trim(),
        description: item.description ? serializeLocalized(item.description) : undefined,
        order: item.order,
      })),
      featureCards: config.manufacturing.featureCards.map((item) => ({
        label: serializeLocalized(item.label),
        image: item.image.trim(),
        description: serializeLocalized(item.description),
        order: item.order,
      })),
      bulletPoints: config.manufacturing.bulletPoints.map((point) => serializeLocalized(point)),
    },
    teamSection: {
      eyebrow: serializeLocalized(config.team.eyebrow),
      title: serializeLocalized(config.team.title),
      description: serializeLocalized(config.team.description),
      composition: config.team.composition.map((item) => ({
        label: serializeLocalized(item.label),
        value: item.value.trim(),
        description: serializeLocalized(item.description),
      })),
      leadership: config.team.leadership.map((leader) => ({
        name: leader.name.trim(),
        role: serializeLocalized(leader.role),
        bio: serializeLocalized(leader.bio),
        image: leader.image.trim(),
      })),
    },
    honorsSection: {
      eyebrow: serializeLocalized(config.honors.eyebrow),
      title: serializeLocalized(config.honors.title),
      description: serializeLocalized(config.honors.description),
      certificates: config.honors.certificates.map((item) => ({
        name: serializeLocalized(item.name),
        image: item.image.trim(),
      })),
      patents: config.honors.patents.map((item) => ({
        name: serializeLocalized(item.name),
        image: item.image.trim(),
      })),
    },
    whyUsSection: {
      eyebrow: serializeLocalized(config.why.eyebrow),
      title: serializeLocalized(config.why.title),
      description: serializeLocalized(config.why.description),
      highlights: config.why.highlights.map((item) => ({
        icon: item.icon.trim(),
        image: item.image.trim(),
        title: serializeLocalized(item.title),
        description: serializeLocalized(item.description),
      })),
    },
  } as unknown) as AboutConfig;
}

function cloneState<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
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
  helperText,
}: {
  label: string;
  value: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
  multiline?: boolean;
  rows?: number;
  helperText?: string;
}) {
  const [activeLocale, setActiveLocale] = useState<string>(DEFAULT_LOCALE);
  const record = ensureLocalizedRecord(value);
  const currentValue = record[activeLocale] ?? "";

  const handleChange = (locale: string, nextValue: string) => {
    onChange(setLocaleText(record, nextValue, locale));
  };

  return (
    <div className="space-y-2 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium text-[var(--color-brand-secondary)]">{label}</span>
        <div className="flex items-center gap-1">
          {LOCALES.map((locale) => (
            <button
              key={locale.code}
              type="button"
              onClick={() => setActiveLocale(locale.code)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                activeLocale === locale.code
                  ? "border-[var(--color-brand-primary)] bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)]"
                  : "border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary)]"
              }`}
            >
              {locale.label}
            </button>
          ))}
        </div>
      </div>
      {multiline ? (
        <textarea
          value={currentValue}
          onChange={(event) => handleChange(activeLocale, event.target.value)}
          rows={rows}
          className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm leading-relaxed text-[var(--color-brand-secondary)] focus:border-[var(--color-brand-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/30"
        />
      ) : (
        <input
          value={currentValue}
          onChange={(event) => handleChange(activeLocale, event.target.value)}
          className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-brand-secondary)] focus:border-[var(--color-brand-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/30"
        />
      )}
      {helperText ? <p className="text-xs text-[var(--color-text-tertiary,#8690a3)]">{helperText}</p> : null}
    </div>
  );
}

function ImageInputField({
  label,
  value,
  onChange,
  placeholder,
  helper,
  uploadEndpoint = "/api/uploads",
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  helper?: string;
  uploadEndpoint?: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelectFile = () => fileInputRef.current?.click();

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("请选择图片文件");
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
      console.error("Image upload failed", err);
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
          placeholder={placeholder}
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

function HeroDialog({ value, onSave, onCancel }: { value: AboutHeroState; onSave: (next: AboutHeroState) => void; onCancel: () => void }) {
  const [draft, setDraft] = useState<AboutHeroState>(cloneState(value));

  useEffect(() => {
    setDraft(cloneState(value));
  }, [value]);

  return (
    <EditorDialog
      title="编辑英雄区"
      subtitle="更新背景图、标题与描述"
      onSave={() => onSave(cloneState(draft))}
      onCancel={onCancel}
    >
      <div className="space-y-6 text-sm">
        <ImageInputField
          label="背景图片"
          value={draft.backgroundImage}
          onChange={(next) => setDraft((prev) => ({ ...prev, backgroundImage: next }))}
          helper="最佳尺寸 1200×420"
        />
        <LocalizedTextField label="眉头" value={draft.eyebrow} onChange={(next) => setDraft((prev) => ({ ...prev, eyebrow: next }))} />
        <LocalizedTextField
          label="主标题"
          value={draft.title}
          onChange={(next) => setDraft((prev) => ({ ...prev, title: next }))}
          multiline
          rows={3}
        />
        <LocalizedTextField
          label="描述"
          value={draft.description}
          onChange={(next) => setDraft((prev) => ({ ...prev, description: next }))}
          multiline
          rows={4}
        />
      </div>
    </EditorDialog>
  );
}

function AboutPreview({ config, onEdit }: { config: AboutConfigState; onEdit: (target: EditingTarget) => void }) {
  const previewConfig = useMemo(() => serializeAboutConfig(config), [config]);

  const SectionWrapper = ({
    actions,
    children,
  }: {
    actions: { label: string; onClick: () => void }[];
    children: React.ReactNode;
  }) => (
    <div className="relative group">
      <div className="pointer-events-none absolute inset-0 rounded-3xl border-2 border-transparent transition group-hover:border-[var(--color-brand-primary)]/30 group-focus-within:border-[var(--color-brand-primary)]/30" />
      <div className="pointer-events-none absolute right-3 top-3 z-10 hidden h-12 w-12 rounded-full bg-white/50 blur group-hover:block group-focus-within:block" />
      <div className="pointer-events-auto absolute right-4 top-4 z-20 hidden flex-col gap-2 group-hover:flex group-focus-within:flex">
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={action.onClick}
            className="rounded-full border border-[var(--color-border)] bg-white/95 px-3 py-1 text-xs font-semibold text-[var(--color-brand-primary)] shadow-sm transition hover:border-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary)]/90"
          >
            {action.label}
          </button>
        ))}
      </div>
      {children}
    </div>
  );

  return (
    <ConfigPreviewFrame
      title="关于时代页面"
      description="所见即所得，悬停后可选择更细粒度的配置项"
      viewportWidth={1200}
      autoScale
      maxHeight={null}
    >
      <div className="bg-white space-y-2">
        <SectionWrapper
          actions={[
            { label: "编辑主视觉", onClick: () => onEdit({ type: "hero" }) },
          ]}
        >
          <AboutHeroSection hero={previewConfig.hero} />
        </SectionWrapper>
        <SectionWrapper
          actions={[
            { label: "基础信息", onClick: () => onEdit({ type: "intro", scope: "basic" }) },
            { label: "核心数据", onClick: () => onEdit({ type: "intro", scope: "stats" }) },
            { label: "园区图片", onClick: () => onEdit({ type: "intro", scope: "campusImage" }) },
            { label: "全部字段", onClick: () => onEdit({ type: "intro", scope: "full" }) },
          ]}
        >
          <AboutCompanySection introSection={previewConfig.introSection} />
        </SectionWrapper>
        <SectionWrapper
          actions={[
            { label: "基础信息", onClick: () => onEdit({ type: "manufacturing", scope: "basic" }) },
            { label: "生产图库", onClick: () => onEdit({ type: "manufacturing", scope: "gallery" }) },
            { label: "亮点卡片", onClick: () => onEdit({ type: "manufacturing", scope: "featureCards" }) },
            { label: "要点列表", onClick: () => onEdit({ type: "manufacturing", scope: "bulletPoints" }) },
            { label: "全部字段", onClick: () => onEdit({ type: "manufacturing", scope: "full" }) },
          ]}
        >
          <AboutFactorySection manufacturingSection={previewConfig.manufacturingSection} />
        </SectionWrapper>
        <SectionWrapper
          actions={[
            { label: "基础信息", onClick: () => onEdit({ type: "team", scope: "basic" }) },
            { label: "团队构成", onClick: () => onEdit({ type: "team", scope: "composition" }) },
            { label: "核心团队", onClick: () => onEdit({ type: "team", scope: "leadership" }) },
            { label: "全部字段", onClick: () => onEdit({ type: "team", scope: "full" }) },
          ]}
        >
          <AboutTeamSection teamSection={previewConfig.teamSection} />
        </SectionWrapper>
        <SectionWrapper
          actions={[
            { label: "基础信息", onClick: () => onEdit({ type: "honors", scope: "basic" }) },
            { label: "荣誉列表", onClick: () => onEdit({ type: "honors", scope: "certificates" }) },
            { label: "专利列表", onClick: () => onEdit({ type: "honors", scope: "patents" }) },
            { label: "全部字段", onClick: () => onEdit({ type: "honors", scope: "full" }) },
          ]}
        >
          <AboutHonorsSection honorsSection={previewConfig.honorsSection} />
        </SectionWrapper>
        <SectionWrapper
          actions={[
            { label: "基础信息", onClick: () => onEdit({ type: "why", scope: "basic" }) },
            { label: "优势亮点", onClick: () => onEdit({ type: "why", scope: "highlights" }) },
            { label: "全部字段", onClick: () => onEdit({ type: "why", scope: "full" }) },
          ]}
        >
          <AboutWhySection whyUsSection={previewConfig.whyUsSection} />
        </SectionWrapper>
      </div>
    </ConfigPreviewFrame>
  );
}

function IntroDialog({
  value,
  scope,
  onSave,
  onCancel,
}: {
  value: AboutIntroState;
  scope: IntroEditingScope;
  onSave: (next: AboutIntroState) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<AboutIntroState>(cloneState(value));

  useEffect(() => {
    setDraft(cloneState(value));
  }, [value]);

  const updateStat = (index: number, updater: (stat: IntroStatState) => IntroStatState) => {
    setDraft((prev) => {
      const stats = [...prev.stats];
      stats[index] = updater(stats[index]);
      return { ...prev, stats };
    });
  };

  const showBasic = scope === "basic" || scope === "full";
  const showStats = scope === "stats" || scope === "full";
  const showImage = scope === "campusImage" || scope === "full";

  let dialogTitle = "编辑公司简介";
  let dialogSubtitle = "维护简介文案、核心指标与园区图片";

  switch (scope) {
    case "basic":
      dialogTitle = "编辑公司简介 - 基础信息";
      dialogSubtitle = "维护眉头、标题与段落文案";
      break;
    case "stats":
      dialogTitle = "编辑公司简介 - 核心数据";
      dialogSubtitle = "新增或维护核心指标数据";
      break;
    case "campusImage":
      dialogTitle = "编辑公司简介 - 园区图片";
      dialogSubtitle = "更新园区展示图片";
      break;
    default:
      dialogTitle = "编辑公司简介";
      dialogSubtitle = "维护简介文案、核心指标与园区图片";
  }

  return (
    <EditorDialog
      title={dialogTitle}
      subtitle={dialogSubtitle}
      onSave={() => onSave(cloneState(draft))}
      onCancel={onCancel}
    >
      <div className="space-y-6 text-sm">
        {showBasic ? (
          <div className="space-y-6">
            <LocalizedTextField label="眉头" value={draft.eyebrow} onChange={(next) => setDraft((prev) => ({ ...prev, eyebrow: next }))} />
            <LocalizedTextField label="主标题" value={draft.title} onChange={(next) => setDraft((prev) => ({ ...prev, title: next }))} />
            <LocalizedTextField label="副标题" value={draft.strapline} onChange={(next) => setDraft((prev) => ({ ...prev, strapline: next }))} />
            <LocalizedTextField
              label="段落描述"
              value={draft.paragraph}
              onChange={(next) => setDraft((prev) => ({ ...prev, paragraph: next }))}
              multiline
              rows={5}
            />
          </div>
        ) : null}

        {showStats ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium text-[var(--color-brand-secondary)]">核心数据</span>
              <button
                type="button"
                onClick={() =>
                  setDraft((prev) => ({
                    ...prev,
                    stats: [...prev.stats, { label: emptyLocalized("指标"), value: "0" }],
                  }))
                }
                className="rounded-full border border-dashed border-[var(--color-brand-primary)] px-3 py-1 text-xs font-semibold text-[var(--color-brand-primary)] transition hover:bg-[var(--color-brand-primary)]/10"
              >
                + 新增指标
              </button>
            </div>
            <div className="space-y-3">
              {draft.stats.map((stat, index) => (
                <div key={index} className="rounded-2xl border border-[var(--color-border)] bg-white/80 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--color-text-tertiary,#8690a3)]">
                    <span>指标 {index + 1}</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setDraft((prev) => ({
                            ...prev,
                            stats: arrayMove(prev.stats, index, index - 1),
                          }))
                        }
                        disabled={index === 0}
                        className="rounded-full border border-[var(--color-border)] px-3 py-1 transition hover:border-[var(--color-brand-primary)] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        上移
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setDraft((prev) => ({
                            ...prev,
                            stats: arrayMove(prev.stats, index, index + 1),
                          }))
                        }
                        disabled={index === draft.stats.length - 1}
                        className="rounded-full border border-[var(--color-border)] px-3 py-1 transition hover:border-[var(--color-brand-primary)] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        下移
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setDraft((prev) => ({
                            ...prev,
                            stats: prev.stats.filter((_, idx) => idx !== index),
                          }))
                        }
                        className="rounded-full border border-rose-200 px-3 py-1 text-rose-500 transition hover:bg-rose-50"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-3">
                    <div className="md:col-span-2">
                      <LocalizedTextField
                        label="指标标题"
                        value={stat.label}
                        onChange={(next) => updateStat(index, (prevStat) => ({ ...prevStat, label: next }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-text-tertiary,#8690a3)]">数值</span>
                      <input
                        value={stat.value}
                        onChange={(event) =>
                          updateStat(index, (prevStat) => ({ ...prevStat, value: event.target.value }))
                        }
                        className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                </div>
              ))}
              {!draft.stats.length ? (
                <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-white/60 p-4 text-center text-xs text-[var(--color-text-secondary)]">
                  暂无指标，请新增。
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {showImage ? (
          <ImageInputField
            label="园区图片"
            value={draft.campusImage}
            onChange={(next) => setDraft((prev) => ({ ...prev, campusImage: next }))}
            helper="最佳尺寸 1200×720"
          />
        ) : null}
      </div>
    </EditorDialog>
  );
}

function ManufacturingDialog({
  value,
  scope,
  onSave,
  onCancel,
}: {
  value: ManufacturingState;
  scope: ManufacturingEditingScope;
  onSave: (next: ManufacturingState) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<ManufacturingState>(cloneState(value));

  useEffect(() => {
    setDraft(cloneState(value));
  }, [value]);

  const updateGallery = (index: number, updater: (item: ManufacturingGalleryState) => ManufacturingGalleryState) => {
    setDraft((prev) => {
      const gallery = [...prev.gallery];
      gallery[index] = updater(gallery[index]);
      return { ...prev, gallery };
    });
  };

  const updateBullet = (index: number, next: Record<string, string>) => {
    setDraft((prev) => {
      const bulletPoints = [...prev.bulletPoints];
      bulletPoints[index] = next;
      return { ...prev, bulletPoints };
    });
  };

  const updateFeatureCard = (
    index: number,
    updater: (item: ManufacturingFeatureCardState) => ManufacturingFeatureCardState,
  ) => {
    setDraft((prev) => {
      const featureCards = [...prev.featureCards];
      featureCards[index] = updater(featureCards[index]);
      return { ...prev, featureCards };
    });
  };

  const showBasic = scope === "basic" || scope === "full";
  const showGallery = scope === "gallery" || scope === "full";
  const showFeatures = scope === "featureCards" || scope === "full";
  const showBullets = scope === "bulletPoints" || scope === "full";

  let dialogTitle = "编辑制造实力";
  let dialogSubtitle = "维护制造描述、图库与亮点";

  switch (scope) {
    case "basic":
      dialogTitle = "编辑制造实力 - 基础信息";
      dialogSubtitle = "维护眉头、标题、描述与主图";
      break;
    case "gallery":
      dialogTitle = "编辑制造实力 - 生产图库";
      dialogSubtitle = "新增或排序制造现场图片";
      break;
    case "featureCards":
      dialogTitle = "编辑制造实力 - 亮点卡片";
      dialogSubtitle = "维护制造优势卡片内容";
      break;
    case "bulletPoints":
      dialogTitle = "编辑制造实力 - 亮点要点";
      dialogSubtitle = "维护制造亮点列表";
      break;
    default:
      dialogTitle = "编辑制造实力";
      dialogSubtitle = "维护制造描述、图库与亮点";
  }

  return (
    <EditorDialog
      title={dialogTitle}
      subtitle={dialogSubtitle}
      onSave={() => onSave(cloneState(draft))}
      onCancel={onCancel}
    >
      <div className="space-y-6 text-sm">
        {showBasic ? (
          <div className="space-y-6">
            <LocalizedTextField label="眉头" value={draft.eyebrow} onChange={(next) => setDraft((prev) => ({ ...prev, eyebrow: next }))} />
            <LocalizedTextField label="主标题" value={draft.title} onChange={(next) => setDraft((prev) => ({ ...prev, title: next }))} />
            <LocalizedTextField
              label="描述"
              value={draft.description}
              onChange={(next) => setDraft((prev) => ({ ...prev, description: next }))}
              multiline
              rows={4}
            />
            <ImageInputField
              label="主图"
              value={draft.mainImage}
              onChange={(next) => setDraft((prev) => ({ ...prev, mainImage: next }))}
              helper="最佳尺寸 1200×720"
            />
          </div>
        ) : null}

        {showGallery ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium text-[var(--color-brand-secondary)]">图库</span>
              <button
                type="button"
                onClick={() =>
                  setDraft((prev) => ({
                    ...prev,
                    gallery: [...prev.gallery, { label: "图库标题", labelEn: "", image: "" }],
                  }))
                }
                className="rounded-full border border-dashed border-[var(--color-brand-primary)] px-3 py-1 text-xs font-semibold text-[var(--color-brand-primary)] transition hover:bg-[var(--color-brand-primary)]/10"
              >
                + 新增图片
              </button>
            </div>
            <div className="space-y-3">
              {draft.gallery.map((item, index) => (
                <div key={index} className="rounded-2xl border border-[var(--color-border)] bg-white/80 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--color-text-tertiary,#8690a3)]">
                    <span>图片 {index + 1}</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setDraft((prev) => ({
                            ...prev,
                            gallery: arrayMove(prev.gallery, index, index - 1),
                          }))
                        }
                        disabled={index === 0}
                        className="rounded-full border border-[var(--color-border)] px-3 py-1 transition hover:border-[var(--color-brand-primary)] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        上移
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setDraft((prev) => ({
                            ...prev,
                            gallery: arrayMove(prev.gallery, index, index + 1),
                          }))
                        }
                        disabled={index === draft.gallery.length - 1}
                        className="rounded-full border border-[var(--color-border)] px-3 py-1 transition hover:border-[var(--color-brand-primary)] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        下移
                      </button>
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
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-text-tertiary,#8690a3)]">标题 (中文)</span>
                      <input
                        value={item.label}
                        onChange={(event) =>
                          updateGallery(index, (prevItem) => ({ ...prevItem, label: event.target.value }))
                        }
                        className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-text-tertiary,#8690a3)]">标题 (English)</span>
                      <input
                        value={item.labelEn}
                        onChange={(event) =>
                          updateGallery(index, (prevItem) => ({ ...prevItem, labelEn: event.target.value }))
                        }
                        className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                    <div className="space-y-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-text-tertiary,#8690a3)]">排序 (可选)</span>
                      <input
                        value={item.order ?? ""}
                        onChange={(event) =>
                          updateGallery(index, (prevItem) => ({
                            ...prevItem,
                            order: event.target.value ? Number(event.target.value) : undefined,
                          }))
                        }
                        placeholder="数字"
                        className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                  <LocalizedTextField
                    label="描述"
                    value={item.description ?? emptyLocalized(`图库描述 ${index + 1}`)}
                    onChange={(next) => updateGallery(index, (prevItem) => ({ ...prevItem, description: next }))}
                    multiline
                    rows={3}
                  />
                  <ImageInputField
                    label="图片地址"
                    value={item.image}
                    onChange={(next) => updateGallery(index, (prevItem) => ({ ...prevItem, image: next }))}
                    helper="最佳尺寸 392×262"
                  />
                </div>
              ))}
              {!draft.gallery.length ? (
                <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-white/60 p-4 text-center text-xs text-[var(--color-text-secondary)]">
                  暂无图库，请新增。
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {showFeatures ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium text-[var(--color-brand-secondary)]">制造优势卡片</span>
              <button
                type="button"
                onClick={() =>
                  setDraft((prev) => ({
                    ...prev,
                    featureCards: [
                      ...prev.featureCards,
                      {
                        label: emptyLocalized("模块名称"),
                        description: emptyLocalized("模块描述"),
                        image: "",
                        order: prev.featureCards.length + 1,
                      },
                    ],
                  }))
                }
                className="rounded-full border border-dashed border-[var(--color-brand-primary)] px-3 py-1 text-xs font-semibold text-[var(--color-brand-primary)] transition hover:bg-[var(--color-brand-primary)]/10"
              >
                + 新增卡片
              </button>
            </div>
            <div className="space-y-3">
              {draft.featureCards.map((card, index) => (
                <div key={index} className="space-y-3 rounded-2xl border border-[var(--color-border)] bg-white/80 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--color-text-tertiary,#8690a3)]">
                    <span>卡片 {index + 1}</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setDraft((prev) => ({
                            ...prev,
                            featureCards: arrayMove(prev.featureCards, index, index - 1),
                          }))
                        }
                        disabled={index === 0}
                        className="rounded-full border border-[var(--color-border)] px-3 py-1 transition hover:border-[var(--color-brand-primary)] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        上移
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setDraft((prev) => ({
                            ...prev,
                            featureCards: arrayMove(prev.featureCards, index, index + 1),
                          }))
                        }
                        disabled={index === draft.featureCards.length - 1}
                        className="rounded-full border border-[var(--color-border)] px-3 py-1 transition hover:border-[var(--color-brand-primary)] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        下移
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setDraft((prev) => ({
                            ...prev,
                            featureCards: prev.featureCards.filter((_, idx) => idx !== index),
                          }))
                        }
                        className="rounded-full border border-rose-200 px-3 py-1 text-rose-500 transition hover:bg-rose-50"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                  <LocalizedTextField
                    label="标题"
                    value={card.label}
                    onChange={(next) => updateFeatureCard(index, (prevCard) => ({ ...prevCard, label: next }))}
                  />
                  <LocalizedTextField
                    label="描述"
                    value={card.description}
                    onChange={(next) => updateFeatureCard(index, (prevCard) => ({ ...prevCard, description: next }))}
                    multiline
                    rows={4}
                  />
                  <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
                    <ImageInputField
                      label="背景图片"
                      value={card.image}
                      onChange={(next) => updateFeatureCard(index, (prevCard) => ({ ...prevCard, image: next }))}
                      helper="最佳尺寸 388×520"
                    />
                    <div className="space-y-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-text-tertiary,#8690a3)]">排序 (可选)</span>
                      <input
                        value={card.order ?? ""}
                        onChange={(event) =>
                          updateFeatureCard(index, (prevCard) => ({
                            ...prevCard,
                            order: event.target.value ? Number(event.target.value) : undefined,
                          }))
                        }
                        placeholder="数字"
                        className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                </div>
              ))}
              {!draft.featureCards.length ? (
                <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-white/60 p-4 text-center text-xs text-[var(--color-text-secondary)]">
                  暂无卡片，请新增。
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {showBullets ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium text-[var(--color-brand-secondary)]">亮点要点</span>
              <button
                type="button"
                onClick={() =>
                  setDraft((prev) => ({
                    ...prev,
                    bulletPoints: [...prev.bulletPoints, emptyLocalized(`制造亮点 ${prev.bulletPoints.length + 1}`)],
                  }))
                }
                className="rounded-full border border-dashed border-[var(--color-brand-primary)] px-3 py-1 text-xs font-semibold text-[var(--color-brand-primary)] transition hover:bg-[var(--color-brand-primary)]/10"
              >
                + 新增亮点
              </button>
            </div>
            <div className="space-y-3">
              {draft.bulletPoints.map((point, index) => (
                <div key={index} className="rounded-2xl border border-[var(--color-border)] bg-white/80 p-4">
                  <div className="flex items-center justify-between text-xs text-[var(--color-text-tertiary,#8690a3)]">
                    <span>亮点 {index + 1}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setDraft((prev) => ({
                          ...prev,
                          bulletPoints: prev.bulletPoints.filter((_, idx) => idx !== index),
                        }))
                      }
                      className="rounded-full border border-rose-200 px-3 py-1 text-rose-500 transition hover:bg-rose-50"
                    >
                      删除
                    </button>
                  </div>
                  <LocalizedTextField
                    label="亮点内容"
                    value={point}
                    onChange={(next) => updateBullet(index, next)}
                    multiline
                    rows={3}
                  />
                </div>
              ))}
              {!draft.bulletPoints.length ? (
                <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-white/60 p-4 text-center text-xs text-[var(--color-text-secondary)]">
                  暂无亮点，请新增。
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </EditorDialog>
  );
}

function TeamDialog({
  value,
  scope,
  onSave,
  onCancel,
}: {
  value: TeamState;
  scope: TeamEditingScope;
  onSave: (next: TeamState) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<TeamState>(cloneState(value));

  useEffect(() => {
    setDraft(cloneState(value));
  }, [value]);

  const updateComposition = (
    index: number,
    updater: (item: TeamCompositionState) => TeamCompositionState,
  ) => {
    setDraft((prev) => {
      const composition = [...prev.composition];
      composition[index] = updater(composition[index]);
      return { ...prev, composition };
    });
  };

  const showBasic = scope === "basic" || scope === "full";
  const showComposition = scope === "composition" || scope === "full";
  const showLeadership = scope === "leadership" || scope === "full";

  let dialogTitle = "编辑团队介绍";
  let dialogSubtitle = "维护团队文案、能力构成与核心成员";

  switch (scope) {
    case "basic":
      dialogTitle = "编辑团队介绍 - 基础信息";
      dialogSubtitle = "更新眉头、标题与描述文案";
      break;
    case "composition":
      dialogTitle = "编辑团队介绍 - 能力构成";
      dialogSubtitle = "维护能力构成及说明";
      break;
    case "leadership":
      dialogTitle = "编辑团队介绍 - 核心成员";
      dialogSubtitle = "维护核心团队成员信息";
      break;
    default:
      dialogTitle = "编辑团队介绍";
      dialogSubtitle = "维护团队文案、能力构成与核心成员";
  }

  return (
    <EditorDialog
      title={dialogTitle}
      subtitle={dialogSubtitle}
      onSave={() => onSave(cloneState(draft))}
      onCancel={onCancel}
    >
      <div className="space-y-6 text-sm">
        {showBasic ? (
          <div className="space-y-6">
            <LocalizedTextField label="眉头" value={draft.eyebrow} onChange={(next) => setDraft((prev) => ({ ...prev, eyebrow: next }))} />
            <LocalizedTextField label="主标题" value={draft.title} onChange={(next) => setDraft((prev) => ({ ...prev, title: next }))} />
            <LocalizedTextField
              label="描述"
              value={draft.description}
              onChange={(next) => setDraft((prev) => ({ ...prev, description: next }))}
              multiline
              rows={4}
            />
          </div>
        ) : null}

        {showComposition ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium text-[var(--color-brand-secondary)]">能力构成</span>
              <button
                type="button"
                onClick={() =>
                  setDraft((prev) => ({
                    ...prev,
                    composition: [
                      ...prev.composition,
                      {
                        label: emptyLocalized("能力模块"),
                        value: "0",
                        description: emptyLocalized("模块说明"),
                      },
                    ],
                  }))
                }
                className="rounded-full border border-dashed border-[var(--color-brand-primary)] px-3 py-1 text-xs font-semibold text-[var(--color-brand-primary)] transition hover:bg-[var(--color-brand-primary)]/10"
              >
                + 新增模块
              </button>
            </div>
            <div className="space-y-3">
              {draft.composition.map((item, index) => (
                <div key={index} className="space-y-3 rounded-2xl border border-[var(--color-border)] bg-white/80 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--color-text-tertiary,#8690a3)]">
                    <span>模块 {index + 1}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setDraft((prev) => ({
                          ...prev,
                          composition: prev.composition.filter((_, idx) => idx !== index),
                        }))
                      }
                      className="rounded-full border border-rose-200 px-3 py-1 text-rose-500 transition hover:bg-rose-50"
                    >
                      删除
                    </button>
                  </div>
                  <LocalizedTextField
                    label="模块名称"
                    value={item.label}
                    onChange={(next) => updateComposition(index, (prevItem) => ({ ...prevItem, label: next }))}
                  />
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="space-y-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-text-tertiary,#8690a3)]">占比</span>
                      <input
                        value={item.value}
                        onChange={(event) =>
                          updateComposition(index, (prevItem) => ({ ...prevItem, value: event.target.value }))
                        }
                        className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <LocalizedTextField
                        label="说明"
                        value={item.description}
                        onChange={(next) => updateComposition(index, (prevItem) => ({ ...prevItem, description: next }))}
                        multiline
                        rows={3}
                      />
                    </div>
                  </div>
                </div>
              ))}
              {!draft.composition.length ? (
                <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-white/60 p-4 text-center text-xs text-[var(--color-text-secondary)]">
                  暂无模块，请新增。
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {showLeadership ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium text-[var(--color-brand-secondary)]">核心成员</span>
              <button
                type="button"
                onClick={() =>
                  setDraft((prev) => ({
                    ...prev,
                    leadership: [
                      ...prev.leadership,
                      { name: "姓名", role: emptyLocalized("岗位角色"), bio: emptyLocalized("成员简介"), image: "" },
                    ],
                  }))
                }
                className="rounded-full border border-dashed border-[var(--color-brand-primary)] px-3 py-1 text-xs font-semibold text-[var(--color-brand-primary)] transition hover:bg-[var(--color-brand-primary)]/10"
              >
                + 新增成员
              </button>
            </div>
            <div className="space-y-3">
              {draft.leadership.map((leader, index) => (
                <div key={index} className="space-y-3 rounded-2xl border border-[var(--color-border)] bg-white/80 p-4">
                  <div className="flex items-center justify-between text-xs text-[var(--color-text-tertiary,#8690a3)]">
                    <span>成员 {index + 1}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setDraft((prev) => ({
                          ...prev,
                          leadership: prev.leadership.filter((_, idx) => idx !== index),
                        }))
                      }
                      className="rounded-full border border-rose-200 px-3 py-1 text-rose-500 transition hover:bg-rose-50"
                    >
                      删除
                    </button>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-text-tertiary,#8690a3)]">姓名</span>
                      <input
                        value={leader.name}
                        onChange={(event) =>
                          setDraft((prev) => {
                            const leadership = [...prev.leadership];
                            leadership[index] = { ...leadership[index], name: event.target.value };
                            return { ...prev, leadership };
                          })
                        }
                        className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
                      />
                    </div>
                    <ImageInputField
                      label="头像"
                      value={leader.image}
                      onChange={(next) =>
                        setDraft((prev) => {
                          const leadership = [...prev.leadership];
                          leadership[index] = { ...leadership[index], image: next };
                          return { ...prev, leadership };
                        })
                      }
                      helper="最佳尺寸 384×256"
                    />
                  </div>
                  <LocalizedTextField
                    label="角色"
                    value={leader.role}
                    onChange={(next) =>
                      setDraft((prev) => {
                        const leadership = [...prev.leadership];
                        leadership[index] = { ...leadership[index], role: next };
                        return { ...prev, leadership };
                      })
                    }
                  />
                  <LocalizedTextField
                    label="简介"
                    value={leader.bio}
                    onChange={(next) =>
                      setDraft((prev) => {
                        const leadership = [...prev.leadership];
                        leadership[index] = { ...leadership[index], bio: next };
                        return { ...prev, leadership };
                      })
                    }
                    multiline
                    rows={4}
                  />
                </div>
              ))}
              {!draft.leadership.length ? (
                <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-white/60 p-4 text-center text-xs text-[var(--color-text-secondary)]">
                  暂无核心成员，请新增。
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </EditorDialog>
  );
}

function HonorsDialog({
  value,
  scope,
  onSave,
  onCancel,
}: {
  value: HonorsState;
  scope: HonorsEditingScope;
  onSave: (next: HonorsState) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<HonorsState>(cloneState(value));

  useEffect(() => {
    setDraft(cloneState(value));
  }, [value]);

  const renderItemList = (
    items: HonorsItemState[],
    onChange: (next: HonorsItemState[]) => void,
    label: string,
  ) => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-medium text-[var(--color-brand-secondary)]">{label}</span>
        <button
          type="button"
          onClick={() => onChange([...items, { name: emptyLocalized(`新${label}`), image: "" }])}
          className="rounded-full border border-dashed border-[var(--color-brand-primary)] px-3 py-1 text-xs font-semibold text-[var(--color-brand-primary)] transition hover:bg-[var(--color-brand-primary)]/10"
        >
          + 新增
        </button>
      </div>
      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={index} className="space-y-3 rounded-2xl border border-[var(--color-border)] bg-white/80 p-4">
            <div className="flex items-center justify-between text-xs text-[var(--color-text-tertiary,#8690a3)]">
              <span>{label} {index + 1}</span>
              <button
                type="button"
                onClick={() => onChange(items.filter((_, idx) => idx !== index))}
                className="rounded-full border border-rose-200 px-3 py-1 text-rose-500 transition hover:bg-rose-50"
              >
                删除
              </button>
            </div>
            <LocalizedTextField
              label={`${label} 名称`}
              value={item.name}
              onChange={(nextName) => {
                const next = [...items];
                next[index] = { ...next[index], name: nextName };
                onChange(next);
              }}
            />
            <ImageInputField
              label="图片"
              value={item.image}
              onChange={(nextImage) => {
                const next = [...items];
                next[index] = { ...next[index], image: nextImage };
                onChange(next);
              }}
              helper="最佳尺寸 220×150"
            />
          </div>
        ))}
        {!items.length ? (
          <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-white/60 p-4 text-center text-xs text-[var(--color-text-secondary)]">
            暂无内容，请新增。
          </div>
        ) : null}
      </div>
    </div>
  );

  const showBasic = scope === "basic" || scope === "full";
  const showCertificates = scope === "certificates" || scope === "full";
  const showPatents = scope === "patents" || scope === "full";

  let dialogTitle = "编辑荣誉资质";
  let dialogSubtitle = "维护荣誉、资质和专利信息";

  switch (scope) {
    case "basic":
      dialogTitle = "编辑荣誉资质 - 基础信息";
      dialogSubtitle = "更新眉头、标题与描述";
      break;
    case "certificates":
      dialogTitle = "编辑荣誉资质 - 荣誉列表";
      dialogSubtitle = "维护荣誉或资质图片";
      break;
    case "patents":
      dialogTitle = "编辑荣誉资质 - 专利列表";
      dialogSubtitle = "维护专利或证书图片";
      break;
    default:
      dialogTitle = "编辑荣誉资质";
      dialogSubtitle = "维护荣誉、资质和专利信息";
  }

  return (
    <EditorDialog
      title={dialogTitle}
      subtitle={dialogSubtitle}
      onSave={() => onSave(cloneState(draft))}
      onCancel={onCancel}
    >
      <div className="space-y-6 text-sm">
        {showBasic ? (
          <div className="space-y-6">
            <LocalizedTextField label="眉头" value={draft.eyebrow} onChange={(next) => setDraft((prev) => ({ ...prev, eyebrow: next }))} />
            <LocalizedTextField label="主标题" value={draft.title} onChange={(next) => setDraft((prev) => ({ ...prev, title: next }))} />
            <LocalizedTextField
              label="描述"
              value={draft.description}
              onChange={(next) => setDraft((prev) => ({ ...prev, description: next }))}
              multiline
              rows={4}
            />
          </div>
        ) : null}

        {showCertificates ? renderItemList(draft.certificates, (next) => setDraft((prev) => ({ ...prev, certificates: next })), "荣誉") : null}

        {showPatents ? renderItemList(draft.patents, (next) => setDraft((prev) => ({ ...prev, patents: next })), "专利") : null}
      </div>
    </EditorDialog>
  );
}

function WhyDialog({
  value,
  scope,
  onSave,
  onCancel,
}: {
  value: WhyState;
  scope: WhyEditingScope;
  onSave: (next: WhyState) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<WhyState>(cloneState(value));

  useEffect(() => {
    setDraft(cloneState(value));
  }, [value]);

  const showBasic = scope === "basic" || scope === "full";
  const showHighlights = scope === "highlights" || scope === "full";

  let dialogTitle = "编辑选择我们";
  let dialogSubtitle = "维护概述与亮点";

  switch (scope) {
    case "basic":
      dialogTitle = "编辑选择我们 - 基础信息";
      dialogSubtitle = "更新眉头、标题与描述";
      break;
    case "highlights":
      dialogTitle = "编辑选择我们 - 优势亮点";
      dialogSubtitle = "维护亮点卡片内容";
      break;
    default:
      dialogTitle = "编辑选择我们";
      dialogSubtitle = "维护概述与亮点";
  }

  return (
    <EditorDialog
      title={dialogTitle}
      subtitle={dialogSubtitle}
      onSave={() => onSave(cloneState(draft))}
      onCancel={onCancel}
    >
      <div className="space-y-6 text-sm">
        {showBasic ? (
          <div className="space-y-6">
            <LocalizedTextField label="眉头" value={draft.eyebrow} onChange={(next) => setDraft((prev) => ({ ...prev, eyebrow: next }))} />
            <LocalizedTextField label="主标题" value={draft.title} onChange={(next) => setDraft((prev) => ({ ...prev, title: next }))} />
            <LocalizedTextField
              label="描述"
              value={draft.description}
              onChange={(next) => setDraft((prev) => ({ ...prev, description: next }))}
              multiline
              rows={4}
            />
          </div>
        ) : null}

        {showHighlights ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium text-[var(--color-brand-secondary)]">亮点</span>
              <button
                type="button"
                onClick={() =>
                  setDraft((prev) => ({
                    ...prev,
                    highlights: [
                      ...prev.highlights,
                      { icon: "sparkles", image: "", title: emptyLocalized(`亮点标题 ${prev.highlights.length + 1}`), description: emptyLocalized("亮点描述") },
                    ],
                  }))
                }
                className="rounded-full border border-dashed border-[var(--color-brand-primary)] px-3 py-1 text-xs font-semibold text-[var(--color-brand-primary)] transition hover:bg-[var(--color-brand-primary)]/10"
              >
                + 新增亮点
              </button>
            </div>
            <div className="space-y-3">
              {draft.highlights.map((highlight, index) => (
                <div key={index} className="space-y-3 rounded-2xl border border-[var(--color-border)] bg-white/80 p-4">
                  <div className="flex items-center justify-between text-xs text-[var(--color-text-tertiary,#8690a3)]">
                    <span>亮点 {index + 1}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setDraft((prev) => ({
                          ...prev,
                          highlights: prev.highlights.filter((_, idx) => idx !== index),
                        }))
                      }
                      className="rounded-full border border-rose-200 px-3 py-1 text-rose-500 transition hover:bg-rose-50"
                    >
                      删除
                    </button>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-text-tertiary,#8690a3)]">图标</span>
                      <select
                        value={highlight.icon}
                        onChange={(event) =>
                          setDraft((prev) => {
                            const highlights = [...prev.highlights];
                            highlights[index] = { ...highlights[index], icon: event.target.value };
                            return { ...prev, highlights };
                          })
                        }
                        className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
                      >
                        <option value="sparkles">闪耀 sparkles</option>
                        <option value="shield-check">可信 shield-check</option>
                        <option value="clock-3">高效 clock-3</option>
                        <option value="globe-2">全球 globe-2</option>
                      </select>
                      <p className="text-xs text-[var(--color-text-tertiary,#8690a3)]">仅支持内置图标，图片请在右侧上传。</p>
                    </div>
                    <ImageInputField
                      label="图片"
                      value={highlight.image}
                      onChange={(nextImage) =>
                        setDraft((prev) => {
                          const highlights = [...prev.highlights];
                          highlights[index] = { ...highlights[index], image: nextImage };
                          return { ...prev, highlights };
                        })
                      }
                      helper="最佳尺寸 282×360"
                    />
                  </div>
                  <LocalizedTextField
                    label="标题"
                    value={highlight.title}
                    onChange={(next) =>
                      setDraft((prev) => {
                        const highlights = [...prev.highlights];
                        highlights[index] = { ...highlights[index], title: next };
                        return { ...prev, highlights };
                      })
                    }
                  />
                  <LocalizedTextField
                    label="描述"
                    value={highlight.description}
                    onChange={(next) =>
                      setDraft((prev) => {
                        const highlights = [...prev.highlights];
                        highlights[index] = { ...highlights[index], description: next };
                        return { ...prev, highlights };
                      })
                    }
                    multiline
                    rows={3}
                  />
                </div>
              ))}
              {!draft.highlights.length ? (
                <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-white/60 p-4 text-center text-xs text-[var(--color-text-secondary)]">
                  暂无亮点，请新增。
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </EditorDialog>
  );
}

export function AboutConfigEditor({ configKey, initialConfig }: AboutConfigEditorProps) {
  const [config, setConfig] = useState<AboutConfigState>(() => normalizeAboutConfig(initialConfig));
  const [baseline, setBaseline] = useState<AboutConfigState>(() => normalizeAboutConfig(initialConfig));
  const [editing, setEditing] = useState<EditingTarget | null>(null);
  const [formState, dispatch] = useFormState<UpdateSiteConfigActionState, FormData>(updateSiteConfigAction, {
    status: "idle",
  });
  const formRef = useRef<HTMLFormElement>(null);
  const latestConfigRef = useRef(config);
  const toast = useToast();

  useEffect(() => {
    const next = normalizeAboutConfig(initialConfig);
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
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [formState, toast]);

  const payload = useMemo(() => JSON.stringify(serializeAboutConfig(config)), [config]);
  const isDirty = useMemo(() => JSON.stringify(config) !== JSON.stringify(baseline), [config, baseline]);
  const dirtyLabel = isDirty ? "有未保存的更改" : "暂无未保存的更改";

  function startGlobalSave(nextConfig?: AboutConfigState) {
    const fd = new FormData();
    fd.set("key", configKey);
    try {
      const source = nextConfig ?? latestConfigRef.current;
      fd.set("payload", JSON.stringify(serializeAboutConfig(source)));
    } catch {
      fd.set("payload", payload);
    }
    dispatch(fd);
  }

  return (
    <div className="space-y-10">

      <AboutPreview config={config} onEdit={setEditing} />

      {editing?.type === "hero" ? (
        <HeroDialog
          value={config.hero}
          onCancel={() => setEditing(null)}
          onSave={(next) => {
            const nextConfig = { ...config, hero: next };
            setConfig(nextConfig);
            startGlobalSave(nextConfig);
            setEditing(null);
          }}
        />
      ) : null}

      {editing && editing.type === "intro" ? (
        <IntroDialog
          value={config.intro}
          scope={editing.scope}
          onCancel={() => setEditing(null)}
          onSave={(next) => {
            const nextConfig = { ...config, intro: next };
            setConfig(nextConfig);
            startGlobalSave(nextConfig);
            setEditing(null);
          }}
        />
      ) : null}

      {editing && editing.type === "manufacturing" ? (
        <ManufacturingDialog
          value={config.manufacturing}
          scope={editing.scope}
          onCancel={() => setEditing(null)}
          onSave={(next) => {
            const nextConfig = { ...config, manufacturing: next };
            setConfig(nextConfig);
            startGlobalSave(nextConfig);
            setEditing(null);
          }}
        />
      ) : null}

      {editing && editing.type === "team" ? (
        <TeamDialog
          value={config.team}
          scope={editing.scope}
          onCancel={() => setEditing(null)}
          onSave={(next) => {
            const nextConfig = { ...config, team: next };
            setConfig(nextConfig);
            startGlobalSave(nextConfig);
            setEditing(null);
          }}
        />
      ) : null}

      {editing && editing.type === "honors" ? (
        <HonorsDialog
          value={config.honors}
          scope={editing.scope}
          onCancel={() => setEditing(null)}
          onSave={(next) => {
            const nextConfig = { ...config, honors: next };
            setConfig(nextConfig);
            startGlobalSave(nextConfig);
            setEditing(null);
          }}
        />
      ) : null}

      {editing && editing.type === "why" ? (
        <WhyDialog
          value={config.why}
          scope={editing.scope}
          onCancel={() => setEditing(null)}
          onSave={(next) => {
            const nextConfig = { ...config, why: next };
            setConfig(nextConfig);
            startGlobalSave(nextConfig);
            setEditing(null);
          }}
        />
      ) : null}
    </div>
  );
}
