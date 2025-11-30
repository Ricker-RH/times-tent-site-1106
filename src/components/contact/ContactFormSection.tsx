"use client";

import { useMemo, useState } from "react";

import { t } from "@/data";
import type { ContactConfig } from "@/server/pageConfigs";

interface ContactScenarioOption {
  value: string;
  label: string;
}

interface ContactFormSectionProps {
  section: NonNullable<ContactConfig["connectSection"]>;
  scenarios?: ContactScenarioOption[];
}

const FALLBACK_SCENARIOS: ContactScenarioOption[] = [
  { value: "sports-events", label: "体育赛事" },
  { value: "sports-venues", label: "体育场馆" },
  { value: "hospitality", label: "文旅营地" },
  { value: "industrial", label: "工业仓储" },
  { value: "brand-events", label: "品牌活动" },
  { value: "other", label: "其他" },
];

export function ContactFormSection({ section, scenarios }: ContactFormSectionProps): JSX.Element {
  const { sectionHeading, highlights, serviceNetworkCopy, serviceHubs, formPanel } = section;
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const scenarioOptions = useMemo(() => {
    const normalized = (scenarios ?? []).filter((option) => option.value && option.label);
    if (normalized.length) {
      return normalized;
    }
    return FALLBACK_SCENARIOS;
  }, [scenarios]);

  const resolve = (value: unknown, fallback: string): string => {
    if (!value) return fallback;
    if (typeof value === "string") return value;
    try {
      const text = t(value as Record<string, string | undefined>);
      return text || fallback;
    } catch {
      return fallback;
    }
  };

  const nameLabel = resolve((formPanel as any)?.nameLabel, "联系人");
  const namePlaceholder = resolve((formPanel as any)?.namePlaceholder, "请输入姓名");
  const companyLabel = resolve((formPanel as any)?.companyLabel, "公司/机构");
  const companyPlaceholder = resolve((formPanel as any)?.companyPlaceholder, "请输入公司名称");
  const emailLabel = resolve((formPanel as any)?.emailLabel, "Email");
  const emailPlaceholder = resolve((formPanel as any)?.emailPlaceholder, "name@example.com");
  const phoneLabel = resolve((formPanel as any)?.phoneLabel, "电话");
  const phonePlaceholder = resolve((formPanel as any)?.phonePlaceholder, "联系电话");
  const scenarioLabel = resolve((formPanel as any)?.scenarioLabel, "应用场景");
  const scenarioPlaceholder = resolve((formPanel as any)?.scenarioPlaceholder, "请选择应用场景");
  const timelineLabel = resolve((formPanel as any)?.timelineLabel, "预计档期");
  const timelinePlaceholder = resolve((formPanel as any)?.timelinePlaceholder, "例如 2025年11月");
  const briefLabel = resolve((formPanel as any)?.briefLabel, "项目简介");
  const briefPlaceholder = resolve((formPanel as any)?.briefPlaceholder, "请输入场地规模、预计人流或特殊需求。");

  const submitLabel = resolve((formPanel as any)?.submitLabel, "提交需求");
  const submittingLabel = resolve((formPanel as any)?.submittingLabel, "提交中...");
  const successMessageDefault = resolve((formPanel as any)?.successMessage, "提交成功，我们会尽快与您联系");
  const errorMessageDefault = resolve((formPanel as any)?.errorMessage, "提交失败，请稍后再试");
  const submitNote = resolve((formPanel as any)?.submitNote, "提交后我们将在 1 个工作日内回复，提供下一步安排。");

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    const payload = Object.fromEntries(formData.entries()) as Record<string, FormDataEntryValue> & {
      sourcePath?: string;
      locale?: string;
      formType?: string;
      message?: string;
    };
    payload.sourcePath = typeof window !== "undefined" ? window.location.pathname + window.location.search : undefined;
    payload.locale = typeof navigator !== "undefined" ? navigator.language : "zh-CN";
    payload.formType = "contact";
    if (!payload.message && typeof payload.brief === "string") {
      payload.message = payload.brief;
    }

    setStatus("submitting");
    setStatusMessage("");

    try {
      const response = await fetch("/api/contact-submissions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const result = (await response.json().catch(() => null)) as { message?: string } | null;
        setStatus("error");
        setStatusMessage(result?.message ?? errorMessageDefault);
        return;
      }

      setStatus("success");
      setStatusMessage(successMessageDefault);
      form.reset();
    } catch (error) {
      console.error("Failed to submit contact form", error);
      setStatus("error");
      setStatusMessage(errorMessageDefault);
    }
  };

  return (
    <section className="bg-[var(--color-surface-muted)] py-16" id="form">
      <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 rounded-[6px] bg-white p-8 shadow-[0_30px_80px_rgba(15,23,42,0.12)] lg:grid-cols-[1.05fr,0.95fr] lg:gap-12 xl:p-12">
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-3 text-left md:flex-row md:items-end md:justify-between">
              <div className="max-w-3xl space-y-2">
                {t(sectionHeading.title)?.trim() ? (
                  <h2 className="text-2xl font-bold text-[var(--color-brand-secondary)] md:text-3xl">
                    {t(sectionHeading.title)}
                  </h2>
                ) : null}
                {t(sectionHeading.description)?.trim() ? (
                  <p className="text-base leading-7 text-[var(--color-text-secondary)] [text-align:justify]">
                    {t(sectionHeading.description)}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {(highlights ?? []).map((item) => (
                <div key={t(item.title)} className="rounded-md bg-[var(--color-surface-muted)] p-5 shadow-sm">
                  <p className="text-sm font-semibold text-[var(--color-brand-secondary)]">{t(item.title)}</p>
                  <p className="mt-1 text-xs leading-5 text-[var(--color-text-secondary)] [text-align:justify]">{t(item.description)}</p>
                </div>
              ))}
            </div>

            <div className="rounded-md border border-white/60 bg-[var(--color-surface-muted)] p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--color-text-tertiary)]">
                {t(serviceNetworkCopy.eyebrow)}
              </p>
              <p className="mt-2 text-xs leading-5 text-[var(--color-text-secondary)] [text-align:justify]">{t(serviceNetworkCopy.description)}</p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {(serviceHubs ?? []).map((hub) => (
                  <span
                    key={t(hub.name)}
                    className="inline-flex items-center gap-2 rounded-md bg-white px-3 py-1.5 text-xs font-medium text-[var(--color-brand-secondary)] shadow-sm"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-brand-primary)]" />
                    {t(hub.name)}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex h-full flex-col justify-between rounded-md border border-white/40 bg-[var(--color-surface-muted)] p-6 shadow-inner lg:p-8">
          <div className="space-y-1.5 text-sm leading-6 text-[var(--color-text-secondary)]">
            <p className="text-base font-semibold text-[var(--color-brand-secondary)]">{t(formPanel.title)}</p>
            <p className="leading-6 [text-align:justify]">{t(formPanel.responseNote)}</p>
          </div>

          <div className="mt-5 flex-1">
            <form className="space-y-3 text-[var(--color-brand-secondary)]" onSubmit={handleSubmit}>
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="space-y-2 text-xs font-semibold text-[var(--color-brand-secondary)]/80">
                    <span>{nameLabel}</span>
                    <input
                      className="h-12 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-4 text-sm outline-none focus:border-[var(--color-brand-primary)]"
                      name="name"
                      placeholder={namePlaceholder}
                      required
                      type="text"
                    />
                  </label>
                  <label className="space-y-2 text-xs font-semibold text-[var(--color-brand-secondary)]/80">
                    <span>{companyLabel}</span>
                    <input
                      className="h-12 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-4 text-sm outline-none focus:border-[var(--color-brand-primary)]"
                      name="company"
                      placeholder={companyPlaceholder}
                      type="text"
                    />
                  </label>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <label className="space-y-2 text-xs font-semibold text-[var(--color-brand-secondary)]/80">
                    <span>{emailLabel}</span>
                    <input
                      className="h-12 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-4 text-sm outline-none focus:border-[var(--color-brand-primary)]"
                      name="email"
                      placeholder={emailPlaceholder}
                      required
                      type="email"
                    />
                  </label>
                  <label className="space-y-2 text-xs font-semibold text-[var(--color-brand-secondary)]/80">
                    <span>{phoneLabel}</span>
                    <input
                      className="h-12 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-4 text-sm outline-none focus:border-[var(--color-brand-primary)]"
                      name="phone"
                      placeholder={phonePlaceholder}
                      type="tel"
                    />
                  </label>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <label className="space-y-2 text-xs font-semibold text-[var(--color-brand-secondary)]/80">
                    <span>{scenarioLabel}</span>
                    <select
                      className="h-12 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-4 text-sm outline-none focus:border-[var(--color-brand-primary)]"
                      name="scenario"
                      defaultValue=""
                    >
                      <option disabled value="">
                        {scenarioPlaceholder}
                      </option>
                      {scenarioOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-2 text-xs font-semibold text-[var(--color-brand-secondary)]/80">
                    <span>{timelineLabel}</span>
                    <input
                      className="h-12 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-4 text-sm outline-none focus:border-[var(--color-brand-primary)]"
                      name="timeline"
                      placeholder={timelinePlaceholder}
                      type="text"
                    />
                  </label>
                </div>

                <label className="space-y-1.5 text-xs font-semibold text-[var(--color-brand-secondary)]/80">
                  <span>{briefLabel}</span>
                  <textarea
                    className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-4 py-3 text-sm outline-none focus:border-[var(--color-brand-primary)]"
                    name="brief"
                    placeholder={briefPlaceholder}
                    rows={4}
                  />
                </label>

                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--color-text-secondary)]">
                  <span className="space-y-1">
                    <span className="block">{submitNote}</span>
                  </span>
                  <button
                    className="rounded-md bg-[var(--color-brand-primary)] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-70"
                    disabled={status === "submitting"}
                    type="submit"
                  >
                    {status === "submitting" ? submittingLabel : submitLabel}
                  </button>
                </div>
                {status !== "idle" && statusMessage ? (
                  <div
                    className={`rounded-md border px-3 py-2 text-xs ${
                      status === "success"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-rose-200 bg-rose-50 text-rose-600"
                    }`}
                  >
                    {statusMessage}
                  </div>
                ) : null}
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
