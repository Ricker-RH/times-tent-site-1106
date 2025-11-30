"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { useFormState, useFormStatus } from "react-dom";

import { ContactChannelsSection } from "@/components/contact/ContactChannelsSection";
import { ContactFormSection } from "@/components/contact/ContactFormSection";
import { ContactGuaranteeSection } from "@/components/contact/ContactGuaranteeSection";
import { ContactHeroSection } from "@/components/contact/ContactHeroSection";
import type { ContactConfig } from "@/server/pageConfigs";

import type { UpdateSiteConfigActionState } from "../actions";
import { updateSiteConfigAction } from "../actions";
import { useToast } from "@/providers/ToastProvider";
import { ConfigPreviewFrame } from "./ConfigPreviewFrame";
import { EditorDialog } from "./EditorDialog";
import { LocalizedTextField } from "./LocalizedTextField";
import {
  DEFAULT_LOCALE,
  ensureArray,
  ensureLocalizedRecord,
  ensureString,
  mergeMeta,
  SUPPORTED_LOCALES,
  ensureLocalizedNoFallback,
  serializeLocalizedAllowEmpty,
} from "./editorUtils";
import { useGlobalTranslationRegistrationForConfig } from "@/hooks/useGlobalTranslationManager";

interface LocalizedValue extends Record<string, string> {}

interface MetricState {
  value: string;
  label: LocalizedValue;
}

interface SectionHeadingState {
  eyebrow: LocalizedValue;
  title: LocalizedValue;
  description: LocalizedValue;
}

interface ContactCardState {
  icon: string;
  title: LocalizedValue;
  value: LocalizedValue;
  helper: LocalizedValue;
  href: string;
}

interface SpotlightState {
  image: string;
  eyebrow: LocalizedValue;
  title: LocalizedValue;
}

interface HighlightState {
  title: LocalizedValue;
  description: LocalizedValue;
}

interface ServiceHubState {
  name: LocalizedValue;
}

interface ServiceCopyState {
  eyebrow: LocalizedValue;
  description: LocalizedValue;
}

interface FormPanelState {
  title: LocalizedValue;
  responseNote: LocalizedValue;
  nameLabel: LocalizedValue;
  namePlaceholder: LocalizedValue;
  companyLabel: LocalizedValue;
  companyPlaceholder: LocalizedValue;
  emailLabel: LocalizedValue;
  emailPlaceholder: LocalizedValue;
  phoneLabel: LocalizedValue;
  phonePlaceholder: LocalizedValue;
  scenarioLabel: LocalizedValue;
  scenarioPlaceholder: LocalizedValue;
  timelineLabel: LocalizedValue;
  timelinePlaceholder: LocalizedValue;
  briefLabel: LocalizedValue;
  briefPlaceholder: LocalizedValue;
  submitLabel: LocalizedValue;
  submittingLabel: LocalizedValue;
  successMessage: LocalizedValue;
  errorMessage: LocalizedValue;
  submitNote: LocalizedValue;
  scenarioOptions: Array<{ value: string; label: LocalizedValue }>;
}

interface GuaranteeState {
  icon: string;
  title: LocalizedValue;
  description: LocalizedValue;
}

interface HeroState {
  backgroundImage: string;
  eyebrow: LocalizedValue;
  title: LocalizedValue;
  description: LocalizedValue;
  metrics: MetricState[];
  overlayEnabled: boolean;
}

interface ContactSectionState {
  sectionHeading: SectionHeadingState;
  cards: ContactCardState[];
  spotlight: SpotlightState;
}

interface ConnectSectionState {
  sectionHeading: SectionHeadingState;
  highlights: HighlightState[];
  serviceNetworkCopy: ServiceCopyState;
  serviceHubs: ServiceHubState[];
  formPanel: FormPanelState;
}

interface GuaranteeSectionState {
  sectionHeading: SectionHeadingState;
  guarantees: GuaranteeState[];
}

interface ContactConfigState {
  hero: HeroState;
  contactSection: ContactSectionState;
  connectSection: ConnectSectionState;
  guaranteeSection: GuaranteeSectionState;
  _meta?: Record<string, unknown>;
}

type HeroEditingScope = "basic" | "visual" | "metrics" | "full";
type ContactSectionScope = "copy" | "cards" | "spotlight" | "full";
type ConnectSectionScope = "copy" | "highlights" | "network" | "form" | "full";
type GuaranteeSectionScope = "copy" | "items" | "full";

type EditingTarget =
  | { type: "hero"; scope: HeroEditingScope }
  | { type: "contactSection"; scope: ContactSectionScope }
  | { type: "connectSection"; scope: ConnectSectionScope }
  | { type: "guaranteeSection"; scope: GuaranteeSectionScope };

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function ensureLocalized(value: unknown, fallback: string): LocalizedValue {
  // 保留空值，不注入默认文案
  return ensureLocalizedNoFallback(value) as LocalizedValue;
}

function cleanLocalized(record: LocalizedValue): LocalizedValue {
  // 允许空值序列化，确保置空后不被回填
  return serializeLocalizedAllowEmpty(record) as LocalizedValue;
}

function cloneState<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function normalizeHero(raw: unknown): HeroState {
  const hero = asRecord(raw);
  const metricsRaw = ensureArray<Record<string, unknown>>(hero.metrics);
  const metrics = metricsRaw.map((metric, index) => ({
    value: ensureString(metric.value),
    label: ensureLocalized(metric.label, `优势 ${index + 1}`),
  }));


  return {
    backgroundImage: ensureString(hero.backgroundImage),
    eyebrow: ensureLocalized(hero.eyebrow, "联系我们"),
    title: ensureLocalized(hero.title, "与模块化团队直接沟通"),
    description: ensureLocalized(hero.description, "留下项目要素，我们将在 24 小时内响应。"),
    metrics,
    overlayEnabled: hero.overlayEnabled !== false,
  } satisfies HeroState;
}

function normalizeSectionHeading(raw: unknown, fallbackTitle: string): SectionHeadingState {
  const heading = asRecord(raw);
  return {
    eyebrow: ensureLocalized(heading.eyebrow, "频道"),
    title: ensureLocalized(heading.title, fallbackTitle),
    description: ensureLocalized(heading.description, "补充描述"),
  } satisfies SectionHeadingState;
}

function normalizeContactSection(raw: unknown): ContactSectionState {
  const section = asRecord(raw);
  const heading = normalizeSectionHeading(section.sectionHeading, "告诉我们您的需求");
  const cards = ensureArray<Record<string, unknown>>(section.cards).map((card, index) => ({
    icon: ensureString(card.icon, index === 0 ? "phone" : "mail"),
    title: ensureLocalized(card.title, `联系方式 ${index + 1}`),
    value: ensureLocalized(card.value, ""),
    helper: ensureLocalized(card.helper, ""),
    href: ensureString(card.href),
  }));

  if (!cards.length) {
    cards.push({
      icon: "phone",
      title: ensureLocalized(undefined, "全国热线"),
      value: ensureLocalized(undefined, "400-000-0000"),
      helper: ensureLocalized(undefined, "7×24 小时支持"),
      href: "tel:400-000-0000",
    });
  }

  const spotlight = asRecord(section.spotlight);

  return {
    sectionHeading: heading,
    cards,
    spotlight: {
      image: ensureString(spotlight.image),
      eyebrow: ensureLocalized(spotlight.eyebrow, "重点服务"),
      title: ensureLocalized(spotlight.title, "原型验证 · 结构检测"),
    },
  } satisfies ContactSectionState;
}

function normalizeConnectSection(raw: unknown): ConnectSectionState {
  const section = asRecord(raw);
  const highlightsRaw = ensureArray<Record<string, unknown>>(section.highlights);
  const serviceHubsRaw = ensureArray<Record<string, unknown>>(section.serviceHubs);

  const highlights = highlightsRaw.map((highlight, index) => ({
    title: ensureLocalized(highlight.title, `亮点 ${index + 1}`),
    description: ensureLocalized(highlight.description, "补充亮点描述"),
  }));

  if (!highlights.length) {
    highlights.push({
      title: ensureLocalized(undefined, "1 小时响应"),
      description: ensureLocalized(undefined, "专属顾问将快速联络。"),
    });
  }

  const serviceHubs = serviceHubsRaw.map((hub, index) => ({
    name: ensureLocalized(hub.name, `服务枢纽 ${index + 1}`),
  }));

  if (!serviceHubs.length) {
    serviceHubs.push({ name: ensureLocalized(undefined, "杭州 · 总部") });
  }

  return {
    sectionHeading: normalizeSectionHeading(section.sectionHeading, "一份表单直连项目团队"),
    highlights,
    serviceNetworkCopy: {
      eyebrow: ensureLocalized(section.serviceNetworkCopy && asRecord(section.serviceNetworkCopy).eyebrow, "覆盖枢纽"),
      description: ensureLocalized(section.serviceNetworkCopy && asRecord(section.serviceNetworkCopy).description, "就近团队接力响应"),
    },
    serviceHubs,
    formPanel: {
      title: ensureLocalized(section.formPanel && asRecord(section.formPanel).title, "填写项目要素"),
      responseNote: ensureLocalized(section.formPanel && asRecord(section.formPanel).responseNote, "顾问将在 1 小时内联系您。"),
      nameLabel: ensureLocalized(section.formPanel && asRecord(section.formPanel).nameLabel, "联系人"),
      namePlaceholder: ensureLocalized(section.formPanel && asRecord(section.formPanel).namePlaceholder, "请输入姓名"),
      companyLabel: ensureLocalized(section.formPanel && asRecord(section.formPanel).companyLabel, "公司/机构"),
      companyPlaceholder: ensureLocalized(section.formPanel && asRecord(section.formPanel).companyPlaceholder, "请输入公司名称"),
      emailLabel: ensureLocalized(section.formPanel && asRecord(section.formPanel).emailLabel, "Email"),
      emailPlaceholder: ensureLocalized(section.formPanel && asRecord(section.formPanel).emailPlaceholder, "name@example.com"),
      phoneLabel: ensureLocalized(section.formPanel && asRecord(section.formPanel).phoneLabel, "电话"),
      phonePlaceholder: ensureLocalized(section.formPanel && asRecord(section.formPanel).phonePlaceholder, "联系电话"),
      scenarioLabel: ensureLocalized(section.formPanel && asRecord(section.formPanel).scenarioLabel, "应用场景"),
      scenarioPlaceholder: ensureLocalized(section.formPanel && asRecord(section.formPanel).scenarioPlaceholder, "请选择应用场景"),
      timelineLabel: ensureLocalized(section.formPanel && asRecord(section.formPanel).timelineLabel, "预计档期"),
      timelinePlaceholder: ensureLocalized(section.formPanel && asRecord(section.formPanel).timelinePlaceholder, "例如 2025年11月"),
      briefLabel: ensureLocalized(section.formPanel && asRecord(section.formPanel).briefLabel, "项目简介"),
      briefPlaceholder: ensureLocalized(section.formPanel && asRecord(section.formPanel).briefPlaceholder, "请输入场地规模、预计人流或特殊需求。"),
      submitLabel: ensureLocalized(section.formPanel && asRecord(section.formPanel).submitLabel, "提交需求"),
      submittingLabel: ensureLocalized(section.formPanel && asRecord(section.formPanel).submittingLabel, "提交中..."),
      successMessage: ensureLocalized(section.formPanel && asRecord(section.formPanel).successMessage, "提交成功，我们会尽快与您联系"),
      errorMessage: ensureLocalized(section.formPanel && asRecord(section.formPanel).errorMessage, "提交失败，请稍后再试"),
      submitNote: ensureLocalized(section.formPanel && asRecord(section.formPanel).submitNote, "提交后我们将在 1 个工作日内回复，提供下一步安排。"),
      scenarioOptions: ensureArray<Record<string, unknown>>(section.formPanel && asRecord(section.formPanel).scenarioOptions).map((opt, index) => ({
        value: ensureString(opt.value) || `option-${index + 1}`,
        label: ensureLocalized(opt.label, `选项 ${index + 1}`),
      })),
    },
  } satisfies ConnectSectionState;
}

function normalizeGuaranteeSection(raw: unknown): GuaranteeSectionState {
  const section = asRecord(raw);
  const guaranteesRaw = ensureArray<Record<string, unknown>>(section.guarantees);
  const guarantees = guaranteesRaw.map((item, index) => ({
    icon: ensureString(item.icon, "shield-check"),
    title: ensureLocalized(item.title, `服务承诺 ${index + 1}`),
    description: ensureLocalized(item.description, "补充承诺描述"),
  }));

  if (!guarantees.length) {
    guarantees.push({
      icon: "shield-check",
      title: ensureLocalized(undefined, "合规与认证"),
      description: ensureLocalized(undefined, "提供完整质量追溯文档。"),
    });
  }

  return {
    sectionHeading: normalizeSectionHeading(section.sectionHeading, "交付全程高触达服务"),
    guarantees,
  } satisfies GuaranteeSectionState;
}

function normalizeConfig(raw: Record<string, unknown>): ContactConfigState {
  const hero = normalizeHero(raw.hero);
  const contactSection = normalizeContactSection(raw.contactSection);
  const connectSection = normalizeConnectSection(raw.connectSection);
  const guaranteeSection = normalizeGuaranteeSection(raw.guaranteeSection);
  const meta = raw._meta && typeof raw._meta === "object" ? (raw._meta as Record<string, unknown>) : undefined;
  return {
    hero,
    contactSection,
    connectSection,
    guaranteeSection,
    _meta: meta ? { ...meta } : undefined,
  } satisfies ContactConfigState;
}

function serializeConfig(config: ContactConfigState): ContactConfig {
  const heroMetrics = config.hero.metrics
    .map((metric) => ({
      value: metric.value.trim(),
      label: cleanLocalized(metric.label),
    }))
    .filter((metric) => metric.value || SUPPORTED_LOCALES.some((locale) => metric.label[locale]?.trim()));

  const cards = config.contactSection.cards
    .map((card) => ({
      icon: card.icon.trim() || undefined,
      title: cleanLocalized(card.title),
      value: cleanLocalized(card.value),
      helper: cleanLocalized(card.helper),
      href: card.href.trim() || undefined,
    }))
    .filter((card) => card.icon || card.href || Object.keys(card.title).length || Object.keys(card.value).length);

  const highlights = config.connectSection.highlights
    .map((item) => ({
      title: cleanLocalized(item.title),
      description: cleanLocalized(item.description),
    }))
    .filter((item) => Object.keys(item.title).length || Object.keys(item.description).length);

  const serviceHubs = config.connectSection.serviceHubs
    .map((hub) => ({ name: cleanLocalized(hub.name) }))
    .filter((hub) => Object.keys(hub.name).length);

  const guarantees = config.guaranteeSection.guarantees
    .map((item) => ({
      icon: item.icon.trim() || undefined,
      title: cleanLocalized(item.title),
      description: cleanLocalized(item.description),
    }))
    .filter((item) => item.icon || Object.keys(item.title).length || Object.keys(item.description).length);

  return mergeMeta<ContactConfig>(
    {
      hero: {
        backgroundImage: config.hero.backgroundImage.trim(),
        eyebrow: cleanLocalized(config.hero.eyebrow),
        title: cleanLocalized(config.hero.title),
        description: cleanLocalized(config.hero.description),
        overlayEnabled: config.hero.overlayEnabled !== false,
        metrics: heroMetrics,
      },
      contactSection: {
        sectionHeading: {
          eyebrow: cleanLocalized(config.contactSection.sectionHeading.eyebrow),
          title: cleanLocalized(config.contactSection.sectionHeading.title),
          description: cleanLocalized(config.contactSection.sectionHeading.description),
        },
        cards,
        spotlight: {
          image: config.contactSection.spotlight.image.trim(),
          eyebrow: cleanLocalized(config.contactSection.spotlight.eyebrow),
          title: cleanLocalized(config.contactSection.spotlight.title),
        },
      },
      connectSection: {
        sectionHeading: {
          eyebrow: cleanLocalized(config.connectSection.sectionHeading.eyebrow),
          title: cleanLocalized(config.connectSection.sectionHeading.title),
          description: cleanLocalized(config.connectSection.sectionHeading.description),
        },
        highlights,
        serviceNetworkCopy: {
          eyebrow: cleanLocalized(config.connectSection.serviceNetworkCopy.eyebrow),
          description: cleanLocalized(config.connectSection.serviceNetworkCopy.description),
        },
        serviceHubs,
        formPanel: {
          title: cleanLocalized(config.connectSection.formPanel.title),
          responseNote: cleanLocalized(config.connectSection.formPanel.responseNote),
          nameLabel: cleanLocalized(config.connectSection.formPanel.nameLabel),
          namePlaceholder: cleanLocalized(config.connectSection.formPanel.namePlaceholder),
          companyLabel: cleanLocalized(config.connectSection.formPanel.companyLabel),
          companyPlaceholder: cleanLocalized(config.connectSection.formPanel.companyPlaceholder),
          emailLabel: cleanLocalized(config.connectSection.formPanel.emailLabel),
          emailPlaceholder: cleanLocalized(config.connectSection.formPanel.emailPlaceholder),
          phoneLabel: cleanLocalized(config.connectSection.formPanel.phoneLabel),
          phonePlaceholder: cleanLocalized(config.connectSection.formPanel.phonePlaceholder),
          scenarioLabel: cleanLocalized(config.connectSection.formPanel.scenarioLabel),
          scenarioPlaceholder: cleanLocalized(config.connectSection.formPanel.scenarioPlaceholder),
          timelineLabel: cleanLocalized(config.connectSection.formPanel.timelineLabel),
          timelinePlaceholder: cleanLocalized(config.connectSection.formPanel.timelinePlaceholder),
          briefLabel: cleanLocalized(config.connectSection.formPanel.briefLabel),
          briefPlaceholder: cleanLocalized(config.connectSection.formPanel.briefPlaceholder),
          submitLabel: cleanLocalized(config.connectSection.formPanel.submitLabel),
          submittingLabel: cleanLocalized(config.connectSection.formPanel.submittingLabel),
          successMessage: cleanLocalized(config.connectSection.formPanel.successMessage),
          errorMessage: cleanLocalized(config.connectSection.formPanel.errorMessage),
          submitNote: cleanLocalized(config.connectSection.formPanel.submitNote),
          scenarioOptions: config.connectSection.formPanel.scenarioOptions
            .map((opt) => ({ value: opt.value.trim() || undefined, label: cleanLocalized(opt.label) }))
            .filter((opt) => opt.value || Object.keys(opt.label).length),
        },
      },
      guaranteeSection: {
        sectionHeading: {
          eyebrow: cleanLocalized(config.guaranteeSection.sectionHeading.eyebrow),
          title: cleanLocalized(config.guaranteeSection.sectionHeading.title),
          description: cleanLocalized(config.guaranteeSection.sectionHeading.description),
        },
        guarantees,
      },
    } as unknown as ContactConfig,
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

  useEffect(() => {
    setDraft(cloneState(value));
  }, [value, scope]);

  const showBasic = scope === "basic" || scope === "full";
  const showMetrics = scope === "metrics" || scope === "full";
  const showVisual = scope === "visual" || scope === "full";

  let title = "编辑英雄板块";
  let subtitle = "维护主视觉文案与指标";
  if (scope === "basic") {
    title = "编辑英雄板块 - 文案";
    subtitle = "调整眉头、标题与描述";
  } else if (scope === "metrics") {
    title = "编辑英雄板块 - 右侧小按钮";
    subtitle = "新增或修改英雄区右侧的小按钮内容";
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
          value={draft.eyebrow}
          translationContext="联系我们英雄眉头"
          onChange={(next) => setDraft((prev) => ({ ...prev, eyebrow: ensureLocalizedNoFallback(next) }))}
        />
        <LocalizedTextField
          label="标题"
          value={draft.title}
          translationContext="联系我们英雄标题"
          onChange={(next) => setDraft((prev) => ({ ...prev, title: ensureLocalizedNoFallback(next) }))}
        />
            <LocalizedTextField
              label="描述"
              value={draft.description}
              translationContext="联系我们英雄描述"
              onChange={(next) => setDraft((prev) => ({ ...prev, description: ensureLocalizedNoFallback(next) }))}
              multiline
              rows={4}
            />
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

        {showMetrics ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-text-tertiary,#8690a3)]">关键指标</h3>
              <button
                type="button"
                onClick={() =>
                  setDraft((prev) => ({
                    ...prev,
                    metrics: [...prev.metrics, { value: "", label: ensureLocalized(undefined, `优势 ${prev.metrics.length + 1}`) }],
                  }))
                }
                className="rounded-full border border-[var(--color-brand-primary)] px-3 py-1 text-xs font-semibold text-[var(--color-brand-primary)]"
              >
                + 新增指标
              </button>
            </div>
            <div className="space-y-3">
              {draft.metrics.map((metric, index) => (
                <div key={index} className="space-y-3 rounded-2xl border border-[var(--color-border)] bg-white/80 p-4">
                  <div className="flex items-center justify-between text-xs text-[var(--color-text-tertiary,#8690a3)]">
                    <span>指标 {index + 1}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setDraft((prev) => ({
                          ...prev,
                          metrics: prev.metrics.filter((_, idx) => idx !== index),
                        }))
                      }
                      className="rounded-full border border-rose-200 px-3 py-1 text-rose-500 transition hover:bg-rose-50"
                    >
                      删除
                    </button>
                  </div>
                  <TextField label="数值" value={metric.value} onChange={(next) =>
                    setDraft((prev) => ({
                      ...prev,
                      metrics: prev.metrics.map((item, idx) => (idx === index ? { ...item, value: next } : item)),
                    }))
                  } />
                  <LocalizedTextField
                    label="标签"
                    value={metric.label}
                    translationContext={`联系我们指标标签 ${index + 1}`}
                    onChange={(next) =>
                      setDraft((prev) => ({
                        ...prev,
                        metrics: prev.metrics.map((item, idx) =>
                          idx === index
                            ? { ...item, label: ensureLocalizedNoFallback(next) }
                            : item,
                        ),
                      }))
                    }
                  />
                </div>
              ))}
              {!draft.metrics.length ? (
                <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-white/60 p-4 text-center text-xs text-[var(--color-text-secondary)]">
                  暂无指标，请新增。
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </EditorDialog>
  );
}

function ContactSectionDialog({
  value,
  scope,
  onSave,
  onCancel,
}: {
  value: ContactSectionState;
  scope: ContactSectionScope;
  onSave: (next: ContactSectionState) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<ContactSectionState>(cloneState(value));

  useEffect(() => {
    setDraft(cloneState(value));
  }, [value, scope]);

  const showHeading = scope === "copy" || scope === "full";
  const showCards = scope === "cards" || scope === "full";
  const showSpotlight = scope === "spotlight" || scope === "full";

  let title = "编辑联系方式板块";
  let subtitle = "维护文字、卡片与重点展示";
  if (scope === "copy") {
    title = "编辑联系方式板块 - 文案";
    subtitle = "调整眉头、标题与描述";
  } else if (scope === "cards") {
    title = "编辑联系方式板块 - 卡片";
    subtitle = "新增或整理联系方式卡片";
  } else if (scope === "spotlight") {
    title = "编辑联系方式板块 - 焦点";
    subtitle = "更新右侧图与文字";
  }

  return (
    <EditorDialog title={title} subtitle={subtitle} onSave={() => onSave(cloneState(draft))} onCancel={onCancel}>
      <div className="space-y-6 text-sm">
        {showHeading ? (
          <div className="space-y-4">
            <LocalizedTextField
              label="眉头"
              value={draft.sectionHeading.eyebrow}
              translationContext="联系我们-联系方式-眉头"
              onChange={(next) =>
                setDraft((prev) => ({
                  ...prev,
                  sectionHeading: {
                    ...prev.sectionHeading,
                    eyebrow: ensureLocalizedNoFallback(next),
                  },
                }))
              }
            />
            <LocalizedTextField
              label="标题"
              value={draft.sectionHeading.title}
              translationContext="联系我们-联系方式-标题"
              onChange={(next) =>
                setDraft((prev) => ({
                  ...prev,
                  sectionHeading: {
                    ...prev.sectionHeading,
                    title: ensureLocalizedNoFallback(next),
                  },
                }))
              }
            />
            <LocalizedTextField
              label="描述"
              value={draft.sectionHeading.description}
              translationContext="联系我们-联系方式-描述"
              onChange={(next) =>
                setDraft((prev) => ({
                  ...prev,
                  sectionHeading: {
                    ...prev.sectionHeading,
                    description: ensureLocalizedNoFallback(next),
                  },
                }))
              }
              multiline
              rows={4}
            />
          </div>
        ) : null}

        {showCards ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-text-tertiary,#8690a3)]">联系方式卡片</h3>
              <button
                type="button"
                onClick={() =>
                  setDraft((prev) => ({
                    ...prev,
                    cards: [
                      ...prev.cards,
                      {
                        icon: "phone",
                        title: ensureLocalized(undefined, `联系渠道 ${prev.cards.length + 1}`),
                        value: ensureLocalized(undefined, ""),
                        helper: ensureLocalized(undefined, ""),
                        href: "",
                      },
                    ],
                  }))
                }
                className="rounded-full border border-[var(--color-brand-primary)] px-3 py-1 text-xs font-semibold text-[var(--color-brand-primary)]"
              >
                + 新增卡片
              </button>
            </div>
            <div className="space-y-3">
              {draft.cards.map((card, index) => (
                <div key={index} className="space-y-3 rounded-2xl border border-[var(--color-border)] bg-white/80 p-4">
                  <div className="flex items-center justify-between text-xs text-[var(--color-text-tertiary,#8690a3)]">
                    <span>卡片 {index + 1}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setDraft((prev) => ({
                          ...prev,
                          cards: prev.cards.filter((_, idx) => idx !== index),
                        }))
                      }
                      className="rounded-full border border-rose-200 px-3 py-1 text-rose-500 transition hover:bg-rose-50"
                    >
                      删除
                    </button>
                  </div>
                  <TextField
                    label="图标 (Lucide 名称)"
                    value={card.icon}
                    onChange={(next) =>
                      setDraft((prev) => ({
                        ...prev,
                        cards: prev.cards.map((item, idx) => (idx === index ? { ...item, icon: next } : item)),
                      }))
                    }
                    placeholder="phone"
                  />
                  <LocalizedTextField
                    label="主标题"
                    value={card.title}
                    translationContext={`联系我们-联系方式卡片标题 ${index + 1}`}
                    onChange={(next) =>
                      setDraft((prev) => ({
                        ...prev,
                        cards: prev.cards.map((item, idx) =>
                          idx === index ? { ...item, title: ensureLocalizedNoFallback(next) } : item,
                        ),
                      }))
                    }
                  />
                  <LocalizedTextField
                    label="显示内容"
                    value={card.value}
                    translationContext={`联系我们-联系方式卡片内容 ${index + 1}`}
                    onChange={(next) =>
                      setDraft((prev) => ({
                        ...prev,
                        cards: prev.cards.map((item, idx) =>
                          idx === index ? { ...item, value: ensureLocalizedNoFallback(next) } : item,
                        ),
                      }))
                    }
                  />
                  <LocalizedTextField
                    label="辅助说明"
                    value={card.helper}
                    translationContext={`联系我们-联系方式卡片说明 ${index + 1}`}
                    onChange={(next) =>
                      setDraft((prev) => ({
                        ...prev,
                        cards: prev.cards.map((item, idx) =>
                          idx === index ? { ...item, helper: ensureLocalizedNoFallback(next) } : item,
                        ),
                      }))
                    }
                  />
                  <TextField
                    label="链接"
                    value={card.href}
                    onChange={(next) =>
                      setDraft((prev) => ({
                        ...prev,
                        cards: prev.cards.map((item, idx) => (idx === index ? { ...item, href: next } : item)),
                      }))
                    }
                    placeholder="tel: / mailto:"
                  />
                </div>
              ))}
              {!draft.cards.length ? (
                <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-white/60 p-4 text-center text-xs text-[var(--color-text-secondary)]">
                  暂无卡片，请新增。
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {showSpotlight ? (
          <div className="space-y-4">
            <ImageUploadField
              label="焦点图片"
              value={draft.spotlight.image}
              onChange={(next) => setDraft((prev) => ({ ...prev, spotlight: { ...prev.spotlight, image: next } }))}
              helper="最佳尺寸 520×320"
            />
            <LocalizedTextField
              label="焦点眉头"
              value={draft.spotlight.eyebrow}
              translationContext="联系我们-焦点眉头"
              onChange={(next) =>
                setDraft((prev) => ({
                  ...prev,
                  spotlight: { ...prev.spotlight, eyebrow: ensureLocalizedNoFallback(next) },
                }))
              }
            />
            <LocalizedTextField
              label="焦点标题"
              value={draft.spotlight.title}
              translationContext="联系我们-焦点标题"
              onChange={(next) =>
                setDraft((prev) => ({
                  ...prev,
                  spotlight: { ...prev.spotlight, title: ensureLocalizedNoFallback(next) },
                }))
              }
            />
          </div>
        ) : null}
      </div>
    </EditorDialog>
  );
}

function ConnectSectionDialog({
  value,
  scope,
  onSave,
  onCancel,
}: {
  value: ConnectSectionState;
  scope: ConnectSectionScope;
  onSave: (next: ConnectSectionState) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<ConnectSectionState>(cloneState(value));

  useEffect(() => {
    setDraft(cloneState(value));
  }, [value, scope]);

  const showHeading = scope === "copy" || scope === "full";
  const showHighlights = scope === "highlights" || scope === "full";
  const showNetwork = scope === "network" || scope === "full";
  const showForm = scope === "form" || scope === "full";

  let title = "编辑项目沟通板块";
  let subtitle = "维护表单说明、亮点与服务网络";
  if (scope === "copy") {
    title = "编辑项目沟通板块 - 文案";
    subtitle = "调整眉头、标题与描述";
  } else if (scope === "highlights") {
    title = "编辑项目沟通板块 - 服务亮点";
    subtitle = "新增或整理亮点";
  } else if (scope === "network") {
    title = "编辑项目沟通板块 - 服务网络";
    subtitle = "维护枢纽描述与列表";
  } else if (scope === "form") {
    title = "编辑项目沟通板块 - 表单提示";
    subtitle = "调整表单标题和反馈说明";
  }

  return (
    <EditorDialog title={title} subtitle={subtitle} onSave={() => onSave(cloneState(draft))} onCancel={onCancel}>
      <div className="space-y-6 text-sm">
        {showHeading ? (
          <div className="space-y-4">
            <LocalizedTextField
              label="眉头"
              value={draft.sectionHeading.eyebrow}
              translationContext="联系我们-沟通-眉头"
              onChange={(next) =>
                setDraft((prev) => ({
                  ...prev,
                  sectionHeading: {
                    ...prev.sectionHeading,
                    eyebrow: ensureLocalizedNoFallback(next),
                  },
                }))
              }
            />
            <LocalizedTextField
              label="标题"
              value={draft.sectionHeading.title}
              translationContext="联系我们-沟通-标题"
              onChange={(next) =>
                setDraft((prev) => ({
                  ...prev,
                  sectionHeading: {
                    ...prev.sectionHeading,
                    title: ensureLocalizedNoFallback(next),
                  },
                }))
              }
            />
            <LocalizedTextField
              label="描述"
              value={draft.sectionHeading.description}
              translationContext="联系我们-沟通-描述"
              onChange={(next) =>
                setDraft((prev) => ({
                  ...prev,
                  sectionHeading: {
                    ...prev.sectionHeading,
                    description: ensureLocalizedNoFallback(next),
                  },
                }))
              }
              multiline
              rows={4}
            />
          </div>
        ) : null}

        {showHighlights ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-text-tertiary,#8690a3)]">服务亮点</h3>
              <button
                type="button"
                onClick={() =>
                  setDraft((prev) => ({
                    ...prev,
                    highlights: [
                      ...prev.highlights,
                      {
                        title: ensureLocalized(undefined, `亮点 ${prev.highlights.length + 1}`),
                        description: ensureLocalized(undefined, "补充亮点描述"),
                      },
                    ],
                  }))
                }
                className="rounded-full border border-[var(--color-brand-primary)] px-3 py-1 text-xs font-semibold text-[var(--color-brand-primary)]"
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
                 <LocalizedTextField
                   label="标题"
                   value={highlight.title}
                    translationContext={`联系我们-服务亮点标题 ${index + 1}`}
                    onChange={(next) =>
                      setDraft((prev) => ({
                        ...prev,
                        highlights: prev.highlights.map((item, idx) =>
                          idx === index ? { ...item, title: ensureLocalizedNoFallback(next) } : item,
                        ),
                      }))
                    }
                  />
                  <LocalizedTextField
                    label="描述"
                    value={highlight.description}
                    translationContext={`联系我们-服务亮点描述 ${index + 1}`}
                    onChange={(next) =>
                      setDraft((prev) => ({
                        ...prev,
                        highlights: prev.highlights.map((item, idx) =>
                          idx === index ? { ...item, description: ensureLocalizedNoFallback(next) } : item,
                        ),
                      }))
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

        {showNetwork ? (
          <div className="space-y-4">
           <LocalizedTextField
             label="服务网络眉头"
             value={draft.serviceNetworkCopy.eyebrow}
              translationContext="联系我们-服务网络-眉头"
              onChange={(next) =>
                setDraft((prev) => ({
                  ...prev,
                  serviceNetworkCopy: {
                    ...prev.serviceNetworkCopy,
                    eyebrow: ensureLocalizedNoFallback(next),
                  },
                }))
              }
            />
            <LocalizedTextField
              label="服务网络描述"
              value={draft.serviceNetworkCopy.description}
              translationContext="联系我们-服务网络-描述"
              onChange={(next) =>
                setDraft((prev) => ({
                  ...prev,
                  serviceNetworkCopy: {
                    ...prev.serviceNetworkCopy,
                    description: ensureLocalizedNoFallback(next),
                  },
                }))
              }
              multiline
              rows={3}
            />
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-text-tertiary,#8690a3)]">服务枢纽</h3>
              <button
                type="button"
                onClick={() =>
                  setDraft((prev) => ({
                    ...prev,
                    serviceHubs: [...prev.serviceHubs, { name: ensureLocalized(undefined, `枢纽 ${prev.serviceHubs.length + 1}`) }],
                  }))
                }
                className="rounded-full border border-[var(--color-brand-primary)] px-3 py-1 text-xs font-semibold text-[var(--color-brand-primary)]"
              >
                + 新增枢纽
              </button>
            </div>
            <div className="space-y-3">
              {draft.serviceHubs.map((hub, index) => (
                <div key={index} className="space-y-3 rounded-2xl border border-[var(--color-border)] bg-white/80 p-4">
                  <div className="flex items-center justify-between text-xs text-[var(--color-text-tertiary,#8690a3)]">
                    <span>枢纽 {index + 1}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setDraft((prev) => ({
                          ...prev,
                          serviceHubs: prev.serviceHubs.filter((_, idx) => idx !== index),
                        }))
                      }
                      className="rounded-full border border-rose-200 px-3 py-1 text-rose-500 transition hover:bg-rose-50"
                    >
                      删除
                    </button>
                  </div>
                 <LocalizedTextField
                   label="名称"
                   value={hub.name}
                    translationContext={`联系我们-服务枢纽名称 ${index + 1}`}
                    onChange={(next) =>
                      setDraft((prev) => ({
                        ...prev,
                        serviceHubs: prev.serviceHubs.map((item, idx) =>
                          idx === index ? { ...item, name: ensureLocalizedNoFallback(next) } : item,
                        ),
                      }))
                    }
                 />
                </div>
              ))}
              {!draft.serviceHubs.length ? (
                <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-white/60 p-4 text-center text-xs text-[var(--color-text-secondary)]">
                  暂无枢纽，请新增。
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {showForm ? (
          <div className="space-y-4">
           <LocalizedTextField
             label="表单标题"
             value={draft.formPanel.title}
              translationContext="联系我们-表单标题"
              onChange={(next) =>
                setDraft((prev) => ({
                  ...prev,
                  formPanel: { ...prev.formPanel, title: ensureLocalizedNoFallback(next) },
                }))
              }
            />
            <LocalizedTextField
              label="响应说明"
              value={draft.formPanel.responseNote}
              translationContext="联系我们-表单响应说明"
              onChange={(next) =>
                setDraft((prev) => ({
                  ...prev,
                  formPanel: { ...prev.formPanel, responseNote: ensureLocalizedNoFallback(next) },
                }))
              }
              multiline
              rows={3}
            />
            <div className="grid gap-3 md:grid-cols-2">
              <LocalizedTextField
                label="联系人-标签"
                value={draft.formPanel.nameLabel}
                translationContext="联系我们-表单-联系人-标签"
                onChange={(next) =>
                  setDraft((prev) => ({
                    ...prev,
                    formPanel: { ...prev.formPanel, nameLabel: ensureLocalizedNoFallback(next) },
                  }))
                }
              />
              <LocalizedTextField
                label="联系人-占位"
                value={draft.formPanel.namePlaceholder}
                translationContext="联系我们-表单-联系人-占位"
                onChange={(next) =>
                  setDraft((prev) => ({
                    ...prev,
                    formPanel: { ...prev.formPanel, namePlaceholder: ensureLocalizedNoFallback(next) },
                  }))
                }
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <LocalizedTextField
                label="公司-标签"
                value={draft.formPanel.companyLabel}
                translationContext="联系我们-表单-公司-标签"
                onChange={(next) =>
                  setDraft((prev) => ({
                    ...prev,
                    formPanel: { ...prev.formPanel, companyLabel: ensureLocalizedNoFallback(next) },
                  }))
                }
              />
              <LocalizedTextField
                label="公司-占位"
                value={draft.formPanel.companyPlaceholder}
                translationContext="联系我们-表单-公司-占位"
                onChange={(next) =>
                  setDraft((prev) => ({
                    ...prev,
                    formPanel: { ...prev.formPanel, companyPlaceholder: ensureLocalizedNoFallback(next) },
                  }))
                }
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <LocalizedTextField
                label="Email-标签"
                value={draft.formPanel.emailLabel}
                translationContext="联系我们-表单-Email-标签"
                onChange={(next) =>
                  setDraft((prev) => ({
                    ...prev,
                    formPanel: { ...prev.formPanel, emailLabel: ensureLocalizedNoFallback(next) },
                  }))
                }
              />
              <LocalizedTextField
                label="Email-占位"
                value={draft.formPanel.emailPlaceholder}
                translationContext="联系我们-表单-Email-占位"
                onChange={(next) =>
                  setDraft((prev) => ({
                    ...prev,
                    formPanel: { ...prev.formPanel, emailPlaceholder: ensureLocalizedNoFallback(next) },
                  }))
                }
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <LocalizedTextField
                label="电话-标签"
                value={draft.formPanel.phoneLabel}
                translationContext="联系我们-表单-电话-标签"
                onChange={(next) =>
                  setDraft((prev) => ({
                    ...prev,
                    formPanel: { ...prev.formPanel, phoneLabel: ensureLocalizedNoFallback(next) },
                  }))
                }
              />
              <LocalizedTextField
                label="电话-占位"
                value={draft.formPanel.phonePlaceholder}
                translationContext="联系我们-表单-电话-占位"
                onChange={(next) =>
                  setDraft((prev) => ({
                    ...prev,
                    formPanel: { ...prev.formPanel, phonePlaceholder: ensureLocalizedNoFallback(next) },
                  }))
                }
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <LocalizedTextField
                label="应用场景-标签"
                value={draft.formPanel.scenarioLabel}
                translationContext="联系我们-表单-应用场景-标签"
                onChange={(next) =>
                  setDraft((prev) => ({
                    ...prev,
                    formPanel: { ...prev.formPanel, scenarioLabel: ensureLocalizedNoFallback(next) },
                  }))
                }
              />
              <LocalizedTextField
                label="应用场景-占位"
                value={draft.formPanel.scenarioPlaceholder}
                translationContext="联系我们-表单-应用场景-占位"
                onChange={(next) =>
                  setDraft((prev) => ({
                    ...prev,
                    formPanel: { ...prev.formPanel, scenarioPlaceholder: ensureLocalizedNoFallback(next) },
                  }))
                }
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <LocalizedTextField
                label="预计档期-标签"
                value={draft.formPanel.timelineLabel}
                translationContext="联系我们-表单-预计档期-标签"
                onChange={(next) =>
                  setDraft((prev) => ({
                    ...prev,
                    formPanel: { ...prev.formPanel, timelineLabel: ensureLocalizedNoFallback(next) },
                  }))
                }
              />
              <LocalizedTextField
                label="预计档期-占位"
                value={draft.formPanel.timelinePlaceholder}
                translationContext="联系我们-表单-预计档期-占位"
                onChange={(next) =>
                  setDraft((prev) => ({
                    ...prev,
                    formPanel: { ...prev.formPanel, timelinePlaceholder: ensureLocalizedNoFallback(next) },
                  }))
                }
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <LocalizedTextField
                label="项目简介-标签"
                value={draft.formPanel.briefLabel}
                translationContext="联系我们-表单-项目简介-标签"
                onChange={(next) =>
                  setDraft((prev) => ({
                    ...prev,
                    formPanel: { ...prev.formPanel, briefLabel: ensureLocalizedNoFallback(next) },
                  }))
                }
              />
              <LocalizedTextField
                label="项目简介-占位"
                value={draft.formPanel.briefPlaceholder}
                translationContext="联系我们-表单-项目简介-占位"
                onChange={(next) =>
                  setDraft((prev) => ({
                    ...prev,
                    formPanel: { ...prev.formPanel, briefPlaceholder: ensureLocalizedNoFallback(next) },
                  }))
                }
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <LocalizedTextField
                label="提交按钮文案"
                value={draft.formPanel.submitLabel}
                translationContext="联系我们-表单-提交按钮文案"
                onChange={(next) =>
                  setDraft((prev) => ({
                    ...prev,
                    formPanel: { ...prev.formPanel, submitLabel: ensureLocalizedNoFallback(next) },
                  }))
                }
              />
              <LocalizedTextField
                label="提交中状态文案"
                value={draft.formPanel.submittingLabel}
                translationContext="联系我们-表单-提交中状态文案"
                onChange={(next) =>
                  setDraft((prev) => ({
                    ...prev,
                    formPanel: { ...prev.formPanel, submittingLabel: ensureLocalizedNoFallback(next) },
                  }))
                }
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <LocalizedTextField
                label="提交成功提示"
                value={draft.formPanel.successMessage}
                translationContext="联系我们-表单-提交成功提示"
                onChange={(next) =>
                  setDraft((prev) => ({
                    ...prev,
                    formPanel: { ...prev.formPanel, successMessage: ensureLocalizedNoFallback(next) },
                  }))
                }
              />
              <LocalizedTextField
                label="提交失败提示"
                value={draft.formPanel.errorMessage}
                translationContext="联系我们-表单-提交失败提示"
                onChange={(next) =>
                  setDraft((prev) => ({
                    ...prev,
                    formPanel: { ...prev.formPanel, errorMessage: ensureLocalizedNoFallback(next) },
                  }))
                }
              />
            </div>
            <LocalizedTextField
              label="提交说明"
              value={draft.formPanel.submitNote}
              translationContext="联系我们-表单-提交说明"
              onChange={(next) =>
                setDraft((prev) => ({
                  ...prev,
                  formPanel: { ...prev.formPanel, submitNote: ensureLocalizedNoFallback(next) },
                }))
              }
              multiline
              rows={3}
            />

            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-[var(--color-brand-secondary)]">应用场景选项集</h4>
              <p className="text-xs text-[var(--color-text-secondary)]">在此维护下拉选项；为空时将自动使用“案例展示”的分类。</p>
              <div className="space-y-3">
                {draft.formPanel.scenarioOptions.map((opt, idx) => (
                  <div key={idx} className="grid gap-3 md:grid-cols-[1fr,1.5fr,auto] md:items-end">
                    <TextField
                      label={`选项值 (slug)`}
                      value={opt.value}
                      onChange={(next) =>
                        setDraft((prev) => {
                          const nextOptions = [...prev.formPanel.scenarioOptions];
                          nextOptions[idx] = { ...nextOptions[idx], value: next };
                          return { ...prev, formPanel: { ...prev.formPanel, scenarioOptions: nextOptions } };
                        })
                      }
                    />
                    <LocalizedTextField
                      label={`选项标签`}
                      value={opt.label}
                      translationContext={`联系我们-表单-应用场景-选项-${idx + 1}`}
                      onChange={(next) =>
                        setDraft((prev) => {
                          const nextOptions = [...prev.formPanel.scenarioOptions];
                          nextOptions[idx] = { ...nextOptions[idx], label: ensureLocalizedNoFallback(next) } as any;
                          return { ...prev, formPanel: { ...prev.formPanel, scenarioOptions: nextOptions } };
                        })
                      }
                    />
                    <button
                      type="button"
                      className="h-10 rounded-md border border-[var(--color-border)] px-3 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)]"
                      onClick={() =>
                        setDraft((prev) => {
                          const nextOptions = prev.formPanel.scenarioOptions.filter((_, i) => i !== idx);
                          return { ...prev, formPanel: { ...prev.formPanel, scenarioOptions: nextOptions } };
                        })
                      }
                    >移除</button>
                  </div>
                ))}
                <div>
                  <button
                    type="button"
                    className="rounded-md border border-[var(--color-border)] px-3 py-2 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)]"
                    onClick={() =>
                      setDraft((prev) => ({
                        ...prev,
                        formPanel: {
                          ...prev.formPanel,
                          scenarioOptions: [
                            ...prev.formPanel.scenarioOptions,
                            { value: "", label: {} as any },
                          ],
                        },
                      }))
                    }
                  >新增选项</button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </EditorDialog>
  );
}

function GuaranteeSectionDialog({
  value,
  scope,
  onSave,
  onCancel,
}: {
  value: GuaranteeSectionState;
  scope: GuaranteeSectionScope;
  onSave: (next: GuaranteeSectionState) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<GuaranteeSectionState>(cloneState(value));

  useEffect(() => {
    setDraft(cloneState(value));
  }, [value, scope]);

  const showHeading = scope === "copy" || scope === "full";
  const showItems = scope === "items" || scope === "full";

  let title = "编辑服务承诺板块";
  let subtitle = "维护文案与承诺列表";
  if (scope === "copy") {
    title = "编辑服务承诺板块 - 文案";
    subtitle = "调整眉头、标题与描述";
  } else if (scope === "items") {
    title = "编辑服务承诺板块 - 列表";
    subtitle = "新增或整理承诺";
  }

  return (
    <EditorDialog title={title} subtitle={subtitle} onSave={() => onSave(cloneState(draft))} onCancel={onCancel}>
      <div className="space-y-6 text-sm">
        {showHeading ? (
          <div className="space-y-4">
           <LocalizedTextField
             label="眉头"
             value={draft.sectionHeading.eyebrow}
              translationContext="联系我们-承诺-眉头"
              onChange={(next) =>
                setDraft((prev) => ({
                  ...prev,
                  sectionHeading: {
                    ...prev.sectionHeading,
                    eyebrow: ensureLocalizedNoFallback(next),
                  },
                }))
              }
            />
            <LocalizedTextField
              label="标题"
              value={draft.sectionHeading.title}
              translationContext="联系我们-承诺-标题"
              onChange={(next) =>
                setDraft((prev) => ({
                  ...prev,
                  sectionHeading: {
                    ...prev.sectionHeading,
                    title: ensureLocalizedNoFallback(next),
                  },
                }))
              }
            />
            <LocalizedTextField
              label="描述"
              value={draft.sectionHeading.description}
              translationContext="联系我们-承诺-描述"
              onChange={(next) =>
                setDraft((prev) => ({
                  ...prev,
                  sectionHeading: {
                    ...prev.sectionHeading,
                    description: ensureLocalizedNoFallback(next),
                  },
                }))
              }
              multiline
              rows={4}
            />
          </div>
        ) : null}

        {showItems ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-text-tertiary,#8690a3)]">服务承诺</h3>
              <button
                type="button"
                onClick={() =>
                  setDraft((prev) => ({
                    ...prev,
                    guarantees: [
                      ...prev.guarantees,
                      {
                        icon: "shield-check",
                        title: ensureLocalized(undefined, `承诺 ${prev.guarantees.length + 1}`),
                        description: ensureLocalized(undefined, "补充承诺描述"),
                      },
                    ],
                  }))
                }
                className="rounded-full border border-[var(--color-brand-primary)] px-3 py-1 text-xs font-semibold text-[var(--color-brand-primary)]"
              >
                + 新增承诺
              </button>
            </div>
            <div className="space-y-3">
              {draft.guarantees.map((item, index) => (
                <div key={index} className="space-y-3 rounded-2xl border border-[var(--color-border)] bg-white/80 p-4">
                  <div className="flex items-center justify-between text-xs text-[var(--color-text-tertiary,#8690a3)]">
                    <span>承诺 {index + 1}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setDraft((prev) => ({
                          ...prev,
                          guarantees: prev.guarantees.filter((_, idx) => idx !== index),
                        }))
                      }
                      className="rounded-full border border-rose-200 px-3 py-1 text-rose-500 transition hover:bg-rose-50"
                    >
                      删除
                    </button>
                  </div>
                  <TextField
                    label="图标 (Lucide 名称)"
                    value={item.icon}
                    onChange={(next) =>
                      setDraft((prev) => ({
                        ...prev,
                        guarantees: prev.guarantees.map((guarantee, idx) => (idx === index ? { ...guarantee, icon: next } : guarantee)),
                      }))
                    }
                    placeholder="shield-check"
                  />
                 <LocalizedTextField
                   label="标题"
                   value={item.title}
                    translationContext={`联系我们-承诺标题 ${index + 1}`}
                    onChange={(next) =>
                      setDraft((prev) => ({
                        ...prev,
                        guarantees: prev.guarantees.map((guarantee, idx) =>
                          idx === index ? { ...guarantee, title: ensureLocalizedNoFallback(next) } : guarantee,
                        ),
                      }))
                    }
                  />
                  <LocalizedTextField
                    label="描述"
                    value={item.description}
                    translationContext={`联系我们-承诺描述 ${index + 1}`}
                    onChange={(next) =>
                      setDraft((prev) => ({
                        ...prev,
                        guarantees: prev.guarantees.map((guarantee, idx) =>
                          idx === index ? { ...guarantee, description: ensureLocalizedNoFallback(next) } : guarantee,
                        ),
                      }))
                    }
                    multiline
                    rows={3}
                  />
                </div>
              ))}
              {!draft.guarantees.length ? (
                <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-white/60 p-4 text-center text-xs text-[var(--color-text-secondary)]">
                  暂无承诺，请新增。
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </EditorDialog>
  );
}

function ContactPreview({ config, onEdit }: { config: ContactConfigState; onEdit: (target: EditingTarget) => void }) {
  const previewConfig = useMemo(() => serializeConfig(config), [config]);

  return (
    <ConfigPreviewFrame
      title="联系方式页面"
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
            { label: "关键指标", onClick: () => onEdit({ type: "hero", scope: "metrics" }) },
            { label: "全部字段", onClick: () => onEdit({ type: "hero", scope: "full" }) },
          ]}
        >
          {previewConfig.hero ? <ContactHeroSection hero={previewConfig.hero} /> : null}
        </SectionWrapper>

        <SectionWrapper
          actions={[
            { label: "文案", onClick: () => onEdit({ type: "contactSection", scope: "copy" }) },
            { label: "卡片", onClick: () => onEdit({ type: "contactSection", scope: "cards" }) },
            { label: "焦点展示", onClick: () => onEdit({ type: "contactSection", scope: "spotlight" }) },
            { label: "全部字段", onClick: () => onEdit({ type: "contactSection", scope: "full" }) },
          ]}
        >
          {previewConfig.contactSection ? <ContactChannelsSection section={previewConfig.contactSection} /> : null}
        </SectionWrapper>

        <SectionWrapper
          actions={[
            { label: "文案", onClick: () => onEdit({ type: "connectSection", scope: "copy" }) },
            { label: "服务亮点", onClick: () => onEdit({ type: "connectSection", scope: "highlights" }) },
            { label: "服务网络", onClick: () => onEdit({ type: "connectSection", scope: "network" }) },
            { label: "表单提示", onClick: () => onEdit({ type: "connectSection", scope: "form" }) },
            { label: "全部字段", onClick: () => onEdit({ type: "connectSection", scope: "full" }) },
          ]}
        >
          {previewConfig.connectSection ? <ContactFormSection section={previewConfig.connectSection} /> : null}
        </SectionWrapper>

        <SectionWrapper
          actions={[
            { label: "文案", onClick: () => onEdit({ type: "guaranteeSection", scope: "copy" }) },
            { label: "服务承诺", onClick: () => onEdit({ type: "guaranteeSection", scope: "items" }) },
            { label: "全部字段", onClick: () => onEdit({ type: "guaranteeSection", scope: "full" }) },
          ]}
        >
          {previewConfig.guaranteeSection ? <ContactGuaranteeSection section={previewConfig.guaranteeSection} /> : null}
        </SectionWrapper>
      </div>
    </ConfigPreviewFrame>
  );
}

export function ContactConfigEditor({ configKey, initialConfig }: { configKey: string; initialConfig: Record<string, unknown> }) {
  const [config, setConfig] = useState<ContactConfigState>(() => normalizeConfig(initialConfig));
  useGlobalTranslationRegistrationForConfig({ config, setConfig, labelPrefix: configKey });
  const [baseline, setBaseline] = useState<ContactConfigState>(() => normalizeConfig(initialConfig));
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
      formRef.current?.classList.add("animate-pulse");
      const timer = window.setTimeout(() => formRef.current?.classList.remove("animate-pulse"), 400);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [formState, toast]);

  const payload = useMemo(() => JSON.stringify(serializeConfig(config)), [config]);
  const isDirty = useMemo(() => JSON.stringify(config) !== JSON.stringify(baseline), [config, baseline]);
  const dirtyLabel = isDirty ? "有未保存的更改" : "暂无未保存的更改";

  // 全局保存覆盖层状态与方法（统一体验）
  const [globalSavePhase, setGlobalSavePhase] = useState<"idle" | "saving" | "confirm_cancel" | "restoring">("idle");
  const [progressStep, setProgressStep] = useState<number>(0);
  const PROGRESS_STEPS = ["准备保存", "提交中", "服务器处理", "完成"];

  function startGlobalSave(nextConfig?: ContactConfigState) {
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

      <ContactPreview config={config} onEdit={setEditing} />

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

      {editing?.type === "contactSection" ? (
        <ContactSectionDialog
          value={config.contactSection}
          scope={editing.scope}
          onCancel={() => setEditing(null)}
          onSave={(next) => {
            const nextConfig = { ...config, contactSection: next };
            setConfig(nextConfig);
            startGlobalSave(nextConfig);
            setEditing(null);
          }}
        />
      ) : null}

      {editing?.type === "connectSection" ? (
        <ConnectSectionDialog
          value={config.connectSection}
          scope={editing.scope}
          onCancel={() => setEditing(null)}
          onSave={(next) => {
            const nextConfig = { ...config, connectSection: next };
            setConfig(nextConfig);
            startGlobalSave(nextConfig);
            setEditing(null);
          }}
        />
      ) : null}

      {editing?.type === "guaranteeSection" ? (
        <GuaranteeSectionDialog
          value={config.guaranteeSection}
          scope={editing.scope}
          onCancel={() => setEditing(null)}
          onSave={(next) => {
            const nextConfig = { ...config, guaranteeSection: next };
            setConfig(nextConfig);
            startGlobalSave(nextConfig);
            setEditing(null);
          }}
        />
      ) : null}

      
    </div>
  );
}
