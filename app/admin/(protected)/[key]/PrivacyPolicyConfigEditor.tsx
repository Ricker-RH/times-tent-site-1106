"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";

import { FALLBACK_PRIVACY_POLICY_CONFIG } from "@/constants/siteFallbacks";
import type { PolicySection } from "@/server/pageConfigs";
import { ConfigPreviewFrame } from "./ConfigPreviewFrame";
import { EditorDialog } from "./EditorDialog";
import { LocalizedTextField as SharedLocalizedTextField, type LocalizedValue } from "./LocalizedTextField";
import { ensureArray, ensureString, ensureLocalizedRecord, getLocaleText, mergeMeta, ensureLocalizedNoFallback, serializeLocalizedAllowEmpty } from "./editorUtils";
import type { UpdateSiteConfigActionState } from "../actions";
import { updateSiteConfigAction } from "../actions";
import { useFormState, useFormStatus } from "react-dom";
import { useToast } from "@/providers/ToastProvider";
import { useGlobalTranslationRegistrationForConfig } from "@/hooks/useGlobalTranslationManager";

interface PolicySectionItemState {
  id: string;
  hasTitle: boolean;
  title: string;
  body: string;
}

interface PolicySectionState {
  id: string;
  heading: string;
  paragraphs: string[];
  items: PolicySectionItemState[];
  paragraphsAfter: string[];
}

interface PrivacyPolicyConfigState {
  title: LocalizedValue;
  intro: {
    lastUpdated: string;
    body: string;
  };
  sections: PolicySectionState[];
  contact: {
    heading: string;
    paragraph: string;
    company: string;
    email: string;
    phone: string;
    address: string;
  };
  _meta?: Record<string, unknown>;
}

type EditingTarget = { type: "intro" } | { type: "sections" } | { type: "contact" };

type AnchorMap = Record<string, HTMLElement | undefined>;

const EDIT_GROUPS: Array<{
  anchor: string;
  label: string;
  actions: Array<{ label: string; target: EditingTarget }>;
}> = [
  {
    anchor: "intro",
    label: "导语",
    actions: [{ label: "编辑导语", target: { type: "intro" } }],
  },
  {
    anchor: "sections",
    label: "正文章节",
    actions: [{ label: "编辑章节", target: { type: "sections" } }],
  },
  {
    anchor: "contact",
    label: "联系信息",
    actions: [{ label: "编辑联系信息", target: { type: "contact" } }],
  },
];

export function PrivacyPolicyConfigEditor({ configKey, initialConfig }: { configKey: string; initialConfig: Record<string, unknown> }) {
  const [config, setConfig] = useState<PrivacyPolicyConfigState>(() => normalizeConfig(initialConfig));
  useGlobalTranslationRegistrationForConfig({ config, setConfig, labelPrefix: configKey });
  const [baseline, setBaseline] = useState<PrivacyPolicyConfigState>(() => normalizeConfig(initialConfig));
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

      <PrivacyPolicyPreview config={config} onEdit={setEditing} />

      {editing?.type === "intro" ? (
        <IntroDialog
          value={config}
          onCancel={() => setEditing(null)}
          onSave={(next) => {
            setConfig((prev) => ({ ...prev, title: next.title, intro: next.intro }));
            setEditing(null);
          }}
        />
      ) : null}

      {editing?.type === "sections" ? (
        <SectionsDialog
          value={config.sections}
          onCancel={() => setEditing(null)}
          onSave={(next) => {
            setConfig((prev) => ({ ...prev, sections: next }));
            setEditing(null);
          }}
        />
      ) : null}

      {editing?.type === "contact" ? (
        <ContactDialog
          value={config.contact}
          onCancel={() => setEditing(null)}
          onSave={(next) => {
            setConfig((prev) => ({ ...prev, contact: next }));
            setEditing(null);
          }}
        />
      ) : null}
    </div>
  );
}

function PrivacyPolicyPreview({ config, onEdit }: { config: PrivacyPolicyConfigState; onEdit: (target: EditingTarget) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const anchors = usePreviewAnchors(containerRef);

  return (
    <ConfigPreviewFrame
      title="隐私政策预览"
      description="预览与官网一致，在对应区域点击编辑按钮调整内容。"
      viewportWidth={960}
      autoScale
      maxHeight={null}
    >
      <div ref={containerRef} className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white">
        <article className="mx-auto w-full max-w-3xl px-6 py-12" data-preview-anchor="intro">
          <header className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-text-tertiary,#8690a3)]">隐私政策</p>
            <h1 className="text-3xl font-semibold text-[var(--color-brand-secondary)]">{getLocaleText(config.title) || "时代篷房隐私政策"}</h1>
            {config.intro.lastUpdated ? (
              <p className="text-sm text-[var(--color-text-secondary)]">生效日期：{config.intro.lastUpdated}</p>
            ) : null}
            {config.intro.body ? (
              <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">{config.intro.body}</p>
            ) : null}
          </header>
          <div className="mt-10 space-y-10" data-preview-anchor="sections">
            {config.sections.map((section) => (
              <section key={section.id} className="space-y-4">
                {section.heading ? (
                  <h2 className="text-xl font-semibold text-[var(--color-brand-secondary)]">{section.heading}</h2>
                ) : null}
                {section.paragraphs.map((paragraph, index) => (
                  <p key={`p-${index}`} className="text-sm leading-relaxed text-[var(--color-text-secondary)]">
                    {paragraph}
                  </p>
                ))}
                {section.items.length ? (
                  <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                    {section.items.map((item) => (
                      <li key={item.id}>
                        {item.hasTitle && item.title ? (
                          <>
                            <span className="font-semibold text-[var(--color-brand-secondary)]">{item.title}：</span>
                            {item.body}
                          </>
                        ) : (
                          item.body
                        )}
                      </li>
                    ))}
                  </ul>
                ) : null}
                {section.paragraphsAfter.map((paragraph, index) => (
                  <p key={`after-${index}`} className="text-sm leading-relaxed text-[var(--color-text-secondary)]">
                    {paragraph}
                  </p>
                ))}
              </section>
            ))}
          </div>
          <section className="mt-12 space-y-3" data-preview-anchor="contact">
            <h2 className="text-xl font-semibold text-[var(--color-brand-secondary)]">{config.contact.heading || "联系我们"}</h2>
            {config.contact.paragraph ? (
              <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">{config.contact.paragraph}</p>
            ) : null}
            <ul className="space-y-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
              {config.contact.company ? <li>公司名称：{config.contact.company}</li> : null}
              {config.contact.email ? <li>邮箱：{config.contact.email}</li> : null}
              {config.contact.phone ? <li>电话：{config.contact.phone}</li> : null}
              {config.contact.address ? <li>地址：{config.contact.address}</li> : null}
            </ul>
          </section>
        </article>
        <PreviewEditControls anchors={anchors} onEdit={onEdit} />
      </div>
    </ConfigPreviewFrame>
  );
}

function IntroDialog({ value, onSave, onCancel }: { value: PrivacyPolicyConfigState; onSave: (next: Pick<PrivacyPolicyConfigState, "title" | "intro">) => void; onCancel: () => void }) {
  const [draft, setDraft] = useState(() => ({
    title: value.title,
    intro: { ...value.intro },
  }));

  useEffect(() => {
    setDraft({ title: value.title, intro: { ...value.intro } });
  }, [value]);

  return (
    <EditorDialog title="编辑导语" subtitle="设置页面标题与生效时间" onSave={() => onSave({ title: draft.title, intro: { lastUpdated: draft.intro.lastUpdated.trim(), body: draft.intro.body.trim() } })} onCancel={onCancel}>
      <div className="space-y-4 text-sm">
        <LocalizedTextField
          label="页面标题"
          translationContext="隐私政策页面标题"
          value={draft.title}
          onChange={(next) => setDraft((prev) => ({ ...prev, title: next }))}
        />
        <TextField label="生效日期" value={draft.intro.lastUpdated} onChange={(next) => setDraft((prev) => ({ ...prev, intro: { ...prev.intro, lastUpdated: next } }))} placeholder="例如：2025 年 10 月 18 日" />
        <TextAreaField
          label="导语正文"
          value={draft.intro.body}
          onChange={(next) => setDraft((prev) => ({ ...prev, intro: { ...prev.intro, body: next } }))}
          rows={6}
        />
      </div>
    </EditorDialog>
  );
}

function SectionsDialog({ value, onSave, onCancel }: { value: PolicySectionState[]; onSave: (next: PolicySectionState[]) => void; onCancel: () => void }) {
  const [draft, setDraft] = useState<PolicySectionState[]>(() => value.map(cloneSection));

  useEffect(() => {
    setDraft(value.map(cloneSection));
  }, [value]);

  const handleAddSection = () => {
    setDraft((prev) => [
      ...prev,
      {
        id: createId("policy-section"),
        heading: "新章节",
        paragraphs: [],
        items: [],
        paragraphsAfter: [],
      },
    ]);
  };

  const handleRemoveSection = (id: string) => {
    setDraft((prev) => prev.filter((section) => section.id !== id));
  };

  const handleMoveSection = (id: string, offset: -1 | 1) => {
    setDraft((prev) => {
      const index = prev.findIndex((section) => section.id === id);
      if (index === -1) return prev;
      const target = index + offset;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const handleAddItem = (sectionId: string) => {
    setDraft((prev) =>
      prev.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              items: [...section.items, { id: createId("policy-item"), hasTitle: false, title: "", body: "" }],
            }
          : section,
      ),
    );
  };

  const handleRemoveItem = (sectionId: string, itemId: string) => {
    setDraft((prev) =>
      prev.map((section) =>
        section.id === sectionId
          ? { ...section, items: section.items.filter((item) => item.id !== itemId) }
          : section,
      ),
    );
  };

  const handleMoveItem = (sectionId: string, itemId: string, offset: -1 | 1) => {
    setDraft((prev) =>
      prev.map((section) => {
        if (section.id !== sectionId) return section;
        const index = section.items.findIndex((item) => item.id === itemId);
        if (index === -1) return section;
        const target = index + offset;
        if (target < 0 || target >= section.items.length) return section;
        const nextItems = [...section.items];
        [nextItems[index], nextItems[target]] = [nextItems[target], nextItems[index]];
        return { ...section, items: nextItems };
      }),
    );
  };

  return (
    <EditorDialog
      title="编辑正文章节"
      subtitle="调整章节标题、正文与条目"
      onSave={() => onSave(draft.map(cloneSection))}
      onCancel={onCancel}
    >
      <div className="space-y-6 text-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-text-tertiary,#8690a3)]">章节</h3>
          <button
            type="button"
            onClick={handleAddSection}
            className="rounded-full border border-[var(--color-brand-primary)] px-3 py-1 text-xs font-semibold text-[var(--color-brand-primary)]"
          >
            + 新增章节
          </button>
        </div>
        {draft.length ? (
          <div className="space-y-4">
            {draft.map((section, index) => (
              <div key={section.id} className="space-y-4 rounded-2xl border border-[var(--color-border)] bg-white/80 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--color-text-tertiary,#8690a3)]">
                  <span>章节 {index + 1}</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleMoveSection(section.id, -1)}
                      disabled={index === 0}
                      className="rounded-full border border-[var(--color-border)] px-3 py-1 transition hover:border-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary)] disabled:opacity-50"
                    >
                      上移
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveSection(section.id, 1)}
                      disabled={index === draft.length - 1}
                      className="rounded-full border border-[var(--color-border)] px-3 py-1 transition hover:border-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary)] disabled:opacity-50"
                    >
                      下移
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveSection(section.id)}
                      className="rounded-full border border-rose-200 px-3 py-1 text-rose-500 transition hover:bg-rose-50"
                    >
                      删除
                    </button>
                  </div>
                </div>
                <TextField
                  label="章节标题"
                  value={section.heading}
                  onChange={(next) =>
                    setDraft((prev) =>
                      prev.map((item) => (item.id === section.id ? { ...item, heading: next } : item)),
                    )
                  }
                />
                <TextAreaField
                  label="段落（每行一个段落）"
                  value={section.paragraphs.join("\n")}
                  rows={4}
                  onChange={(next) =>
                    setDraft((prev) =>
                      prev.map((item) =>
                        item.id === section.id
                          ? { ...item, paragraphs: splitLines(next) }
                          : item,
                      ),
                    )
                  }
                />
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-text-tertiary,#8690a3)]">条目</h4>
                    <button
                      type="button"
                      onClick={() => handleAddItem(section.id)}
                      className="rounded-full border border-[var(--color-border)] px-3 py-1 text-xs font-semibold text-[var(--color-brand-secondary)] transition hover:border-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary)]"
                    >
                      + 新增条目
                    </button>
                  </div>
                  {section.items.length ? (
                    <div className="space-y-3">
                      {section.items.map((item, itemIndex) => (
                        <div key={item.id} className="space-y-3 rounded-2xl border border-[var(--color-border)] bg-white/70 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--color-text-tertiary,#8690a3)]">
                            <span>条目 {itemIndex + 1}</span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleMoveItem(section.id, item.id, -1)}
                                disabled={itemIndex === 0}
                                className="rounded-full border border-[var(--color-border)] px-3 py-1 transition hover:border-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary)] disabled:opacity-50"
                              >
                                上移
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMoveItem(section.id, item.id, 1)}
                                disabled={itemIndex === section.items.length - 1}
                                className="rounded-full border border-[var(--color-border)] px-3 py-1 transition hover:border-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary)] disabled:opacity-50"
                              >
                                下移
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(section.id, item.id)}
                                className="rounded-full border border-rose-200 px-3 py-1 text-rose-500 transition hover:bg-rose-50"
                              >
                                删除
                              </button>
                            </div>
                          </div>
                          <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-text-tertiary,#8690a3)]">
                            <input
                              type="checkbox"
                              checked={item.hasTitle}
                              onChange={(event) =>
                                setDraft((prev) =>
                                  prev.map((sectionState) =>
                                    sectionState.id === section.id
                                      ? {
                                          ...sectionState,
                                          items: sectionState.items.map((entry) =>
                                            entry.id === item.id
                                              ? { ...entry, hasTitle: event.target.checked }
                                              : entry,
                                          ),
                                        }
                                      : sectionState,
                                  ),
                                )
                              }
                              className="h-3.5 w-3.5 rounded border-[var(--color-border)]"
                            />
                            条目包含标题
                          </label>
                          {item.hasTitle ? (
                            <TextField
                              label="条目标题"
                              value={item.title}
                              onChange={(next) =>
                                setDraft((prev) =>
                                  prev.map((sectionState) =>
                                    sectionState.id === section.id
                                      ? {
                                          ...sectionState,
                                          items: sectionState.items.map((entry) =>
                                            entry.id === item.id ? { ...entry, title: next } : entry,
                                          ),
                                        }
                                      : sectionState,
                                  ),
                                )
                              }
                            />
                          ) : null}
                          <TextAreaField
                            label="条目内容"
                            value={item.body}
                            rows={3}
                            onChange={(next) =>
                              setDraft((prev) =>
                                prev.map((sectionState) =>
                                  sectionState.id === section.id
                                    ? {
                                        ...sectionState,
                                        items: sectionState.items.map((entry) =>
                                          entry.id === item.id ? { ...entry, body: next } : entry,
                                        ),
                                      }
                                    : sectionState,
                                ),
                              )
                            }
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-white/50 px-4 py-3 text-xs text-[var(--color-text-tertiary,#8690a3)]">
                      暂无条目，点击“新增条目”添加要点或说明。
                    </div>
                  )}
                </div>
                <TextAreaField
                  label="补充段落（每行一个段落）"
                  value={section.paragraphsAfter.join("\n")}
                  rows={3}
                  onChange={(next) =>
                    setDraft((prev) =>
                      prev.map((item) =>
                        item.id === section.id
                          ? { ...item, paragraphsAfter: splitLines(next) }
                          : item,
                      ),
                    )
                  }
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-white/60 px-4 py-6 text-xs text-[var(--color-text-tertiary,#8690a3)]">
            暂无章节，点击右上角“新增章节”开始配置。
          </div>
        )}
      </div>
    </EditorDialog>
  );
}

function ContactDialog({ value, onSave, onCancel }: { value: PrivacyPolicyConfigState["contact"]; onSave: (next: PrivacyPolicyConfigState["contact"]) => void; onCancel: () => void }) {
  const [draft, setDraft] = useState(() => ({ ...value }));

  useEffect(() => {
    setDraft({ ...value });
  }, [value]);

  return (
    <EditorDialog title="编辑联系信息" subtitle="更新尾部联系方式" onSave={() => onSave({ ...draft })} onCancel={onCancel}>
      <div className="space-y-4 text-sm">
        <TextField label="区块标题" value={draft.heading} onChange={(next) => setDraft((prev) => ({ ...prev, heading: next }))} />
        <TextAreaField
          label="引导文本"
          value={draft.paragraph}
          rows={3}
          onChange={(next) => setDraft((prev) => ({ ...prev, paragraph: next }))}
        />
        <TextField label="公司名称" value={draft.company} onChange={(next) => setDraft((prev) => ({ ...prev, company: next }))} />
        <TextField label="邮箱" value={draft.email} onChange={(next) => setDraft((prev) => ({ ...prev, email: next }))} />
        <TextField label="联系电话" value={draft.phone} onChange={(next) => setDraft((prev) => ({ ...prev, phone: next }))} />
        <TextField label="办公地址" value={draft.address} onChange={(next) => setDraft((prev) => ({ ...prev, address: next }))} />
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
        const alignment = anchor === "intro" ? "left-4 top-4" : anchor === "contact" ? "right-4 bottom-4" : "right-4 top-4";
        return createPortal(
          <div className="pointer-events-none absolute inset-0">
            <div className={`pointer-events-auto absolute ${alignment} flex flex-wrap items-center gap-2`}>
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

function TextField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (next: string) => void; placeholder?: string }) {
  return (
    <div className="space-y-2 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-text-tertiary,#8690a3)]">
      <label className="block">{label}</label>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-text-secondary)] focus:border-[var(--color-brand-primary)] focus:outline-none"
      />
    </div>
  );
}

function TextAreaField({ label, value, onChange, rows = 4 }: { label: string; value: string; onChange: (next: string) => void; rows?: number }) {
  return (
    <div className="space-y-2 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-text-tertiary,#8690a3)]">
      <label className="block">{label}</label>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm leading-relaxed text-[var(--color-text-secondary)] focus:border-[var(--color-brand-primary)] focus:outline-none"
      />
    </div>
  );
}

function LocalizedTextField({
  label,
  value,
  onChange,
  multiline = false,
  rows = 4,
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
  const normalized = ensureLocalizedRecord(value);
  return (
    <SharedLocalizedTextField
      label={label}
      value={normalized}
      multiline={multiline}
      rows={rows}
      placeholder={placeholder}
      translationContext={translationContext}
      onChange={(next) => onChange(ensureLocalizedRecord(next))}
    />
  );
}

function normalizeConfig(raw: Record<string, unknown>): PrivacyPolicyConfigState {
  const record = ensureRecord(raw);
  const fallback = FALLBACK_PRIVACY_POLICY_CONFIG;
  const introRecord = ensureRecord(record.intro);
  const contactRecord = ensureRecord(record.contact);
  const sectionsRaw = ensureArray(record.sections);

  return {
    title: ensureLocalizedTitle(record.title, ensureString(fallback.title)),
    intro: {
      lastUpdated: ensureString(introRecord.lastUpdated) || ensureString(fallback.intro?.lastUpdated),
      body: ensureString(introRecord.body) || ensureString(fallback.intro?.body),
    },
    sections: sectionsRaw.length ? sectionsRaw.map(normalizeSection) : (fallback.sections ?? []).map(normalizeFallbackSection),
    contact: {
      heading: ensureString(contactRecord.heading) || ensureString(fallback.contact?.heading),
      paragraph: ensureString(contactRecord.paragraph) || ensureString(fallback.contact?.paragraph),
      company: ensureString(contactRecord.company) || ensureString(fallback.contact?.company),
      email: ensureString(contactRecord.email) || ensureString(fallback.contact?.email),
      phone: ensureString(contactRecord.phone) || ensureString(fallback.contact?.phone),
      address: ensureString(contactRecord.address) || ensureString(fallback.contact?.address),
    },
    _meta: ensureRecord(record._meta),
  };
}

function normalizeSection(raw: unknown, index?: number): PolicySectionState {
  const record = ensureRecord(raw);
  const paragraphs = ensureArray<string>(record.paragraphs).map((item) => ensureString(item)).filter(Boolean);
  const paragraphsAfter = ensureArray<string>(record.paragraphsAfter).map((item) => ensureString(item)).filter(Boolean);
  const itemsRaw = ensureArray(record.items);
  const items: PolicySectionItemState[] = itemsRaw.map((item, itemIndex) => {
    if (typeof item === "string") {
      return {
        id: makeStableId("policy-item", item, itemIndex),
        hasTitle: false,
        title: "",
        body: item,
      };
    }
    const itemRecord = ensureRecord(item);
    const title = ensureString(itemRecord.title);
    const body = ensureString(itemRecord.body);
    return {
      id: makeStableId("policy-item", title || body, itemIndex),
      hasTitle: Boolean(title && title.trim().length > 0),
      title,
      body,
    };
  });
  return {
    id: ensureString(record.id) || makeStableId("policy-section", ensureString(record.heading), index ?? 0),
    heading: ensureString(record.heading),
    paragraphs,
    items,
    paragraphsAfter,
  };
}

function normalizeFallbackSection(section: PolicySection, index: number): PolicySectionState {
  return normalizeSection(section, index);
}

function ensureLocalizedTitle(value: unknown, fallback: string): LocalizedValue {
  // Respect empty values per-locale without injecting fallbacks
  return ensureLocalizedNoFallback(value) as LocalizedValue;
}

function serializeLocalized(record: LocalizedValue): Record<string, string> {
  // Preserve empty keys to keep explicit clears stable across reloads
  return serializeLocalizedAllowEmpty(record);
}

function serializeConfig(config: PrivacyPolicyConfigState): Record<string, unknown> {
  const sections = config.sections.map((section, index) => ({
    id: section.id || `section-${index}`,
    heading: section.heading.trim(),
    paragraphs: section.paragraphs.map((paragraph) => paragraph.trim()).filter(Boolean),
    items: section.items.map((item) => {
      const body = item.body.trim();
      const title = item.title.trim();
      if (item.hasTitle && title) {
        return { title, body };
      }
      return body;
    }),
    paragraphsAfter: section.paragraphsAfter.map((paragraph) => paragraph.trim()).filter(Boolean),
  }));

  return mergeMeta(
    {
      title: serializeLocalized(config.title),
      intro: {
        lastUpdated: config.intro.lastUpdated.trim(),
        body: config.intro.body.trim(),
      },
      sections,
      contact: {
        heading: config.contact.heading.trim(),
        paragraph: config.contact.paragraph.trim(),
        company: config.contact.company.trim(),
        email: config.contact.email.trim(),
        phone: config.contact.phone.trim(),
        address: config.contact.address.trim(),
      },
    },
    config._meta,
  );
}

function cloneSection(section: PolicySectionState): PolicySectionState {
  return {
    id: section.id,
    heading: section.heading,
    paragraphs: [...section.paragraphs],
    items: section.items.map((item) => ({ ...item })),
    paragraphsAfter: [...section.paragraphsAfter],
  };
}

function ensureRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function splitLines(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function createId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`;
}

function makeStableId(prefix: string, seed: string, index: number): string {
  const base = (seed || "")
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${prefix}-${base || index}`;
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value ?? null)) as T;
}
