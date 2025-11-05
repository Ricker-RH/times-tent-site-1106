"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useId,
  type Dispatch,
  type SetStateAction,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type LocaleKey } from "@/i18n/locales";

interface GlobalTranslationField {
  id: string;
  label: string;
  sourceLocale: LocaleKey;
  targetLocales: LocaleKey[];
  context?: string;
  getValue: () => Record<string, string>;
  setValue: (next: Record<string, string>) => void;
}

interface SummarySuccessEntry {
  id: string;
  label: string;
  locales: LocaleKey[];
}

interface SummaryFailureEntry {
  id: string;
  label: string;
  reason: string;
}

interface GlobalTranslationSummary {
  successes: SummarySuccessEntry[];
  failures: SummaryFailureEntry[];
}

interface GlobalTranslationContextValue {
  registerField: (field: GlobalTranslationField) => () => void;
  translateAll: () => Promise<void>;
  undoLast: () => void;
  canUndo: boolean;
  isTranslating: boolean;
  fieldCount: number;
}

const GlobalTranslationContext = createContext<GlobalTranslationContextValue | null>(null);

function cloneLocalizedValue(value: Record<string, string>): Record<string, string> {
  const clone: Record<string, string> = {};
  for (const locale of SUPPORTED_LOCALES) {
    const text = value[locale];
    if (typeof text === "string") {
      clone[locale] = text;
    }
  }
  for (const [locale, text] of Object.entries(value)) {
    if (!(locale in clone) && typeof text === "string") {
      clone[locale] = text;
    }
  }
  return clone;
}

export function GlobalTranslationProvider({ children }: { children: ReactNode }): JSX.Element {
  const fieldsRef = useRef(new Map<string, GlobalTranslationField>());
  const [, setFieldRevision] = useState(0);
  const [fieldCountState, setFieldCountState] = useState(0);
  const lastSnapshotRef = useRef<Map<string, Record<string, string>> | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [summary, setSummary] = useState<GlobalTranslationSummary | null>(null);
  const [showSummary, setShowSummary] = useState(false);

  const registerField = useCallback((field: GlobalTranslationField) => {
    fieldsRef.current.set(field.id, field);
    setFieldRevision((revision) => revision + 1);
    setFieldCountState(fieldsRef.current.size);
    return () => {
      const current = fieldsRef.current.get(field.id);
      if (current === field) {
        fieldsRef.current.delete(field.id);
        setFieldRevision((revision) => revision + 1);
        setFieldCountState(fieldsRef.current.size);
      }
    };
  }, []);

  const translateAll = useCallback(async () => {
    if (isTranslating) return;

    let fields = Array.from(fieldsRef.current.values());
    if (!fields.length) {
      await new Promise((resolve) => setTimeout(resolve, 0));
      fields = Array.from(fieldsRef.current.values());
    }
    if (!fields.length) {
      setSummary({
        successes: [],
        failures: [
          {
            id: "no-fields",
            label: "",
            reason: "当前配置没有可自动翻译的字段。",
          },
        ],
      });
      setShowSummary(true);
      return;
    }

    setIsTranslating(true);

    const snapshot = new Map<string, Record<string, string>>();
    const successes: SummarySuccessEntry[] = [];
    const failures: SummaryFailureEntry[] = [];

    for (const field of fields) {
      const originalValue = cloneLocalizedValue(field.getValue());
      const workingValue = cloneLocalizedValue(originalValue);
      const sourceText = workingValue[field.sourceLocale]?.trim() ?? "";
      const targets = field.targetLocales.filter((locale) => locale !== field.sourceLocale);

      if (!targets.length) {
        failures.push({ id: field.id, label: field.label, reason: "没有需要翻译的目标语言" });
        continue;
      }

      if (!sourceText) {
        failures.push({ id: field.id, label: field.label, reason: "缺少源语言内容，已跳过" });
        continue;
      }

      try {
        const response = await fetch("/api/translations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sourceLocale: field.sourceLocale,
            targetLocales: targets,
            entries: [
              {
                id: field.id,
                text: sourceText,
                context: field.context ?? field.label,
              },
            ],
          }),
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(payload.error || "翻译接口调用失败");
        }

        const data = (await response.json()) as {
          results?: Array<{ id: string; translations: Record<string, string> }>;
        };

        const translations = data.results?.[0]?.translations ?? {};
        const appliedLocales: LocaleKey[] = [];
        const missingLocales: LocaleKey[] = [];

        targets.forEach((locale) => {
          const translated = translations[locale]?.trim();
          if (translated) {
            workingValue[locale] = translated;
            appliedLocales.push(locale as LocaleKey);
          } else {
            missingLocales.push(locale as LocaleKey);
          }
        });

        if (appliedLocales.length) {
          snapshot.set(field.id, originalValue);
          field.setValue(cloneLocalizedValue(workingValue));
          successes.push({ id: field.id, label: field.label, locales: appliedLocales });
        }

        if (missingLocales.length) {
          failures.push({
            id: `${field.id}-missing`,
            label: field.label,
            reason: `以下语言未返回结果：${missingLocales.join(", ")}`,
          });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "翻译失败";
        failures.push({ id: field.id, label: field.label, reason: message });
      }
    }

    if (snapshot.size > 0) {
      lastSnapshotRef.current = snapshot;
      setCanUndo(true);
    } else {
      lastSnapshotRef.current = null;
      setCanUndo(false);
    }

    setSummary({ successes, failures });
    setShowSummary(true);
    setIsTranslating(false);
  }, [isTranslating]);

  const undoLast = useCallback(() => {
    const snapshot = lastSnapshotRef.current;
    if (!snapshot || snapshot.size === 0) {
      return;
    }

    snapshot.forEach((value, id) => {
      const field = fieldsRef.current.get(id);
      if (field) {
        field.setValue(cloneLocalizedValue(value));
      }
    });

    lastSnapshotRef.current = null;
    setCanUndo(false);
  }, []);

  const closeSummary = useCallback(() => {
    setShowSummary(false);
  }, []);

  useEffect(() => {
    if (!showSummary) return;
    if (typeof document === "undefined") return;

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeSummary();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [closeSummary, showSummary]);

  const contextValue = useMemo<GlobalTranslationContextValue>(() => ({
    registerField,
    translateAll,
    undoLast,
    canUndo,
    isTranslating,
    fieldCount: fieldCountState,
  }), [registerField, translateAll, undoLast, canUndo, isTranslating, fieldCountState]);

  return (
    <GlobalTranslationContext.Provider value={contextValue}>
      {children}
      {showSummary && summary ? createPortal(
        <div className="fixed inset-0 z-[1300] bg-black/40 backdrop-blur-sm">
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-[420px] max-w-[92vw] max-h-[80vh] overflow-y-auto space-y-4 rounded-2xl bg-white p-6 text-sm text-[var(--color-text-secondary)] shadow-2xl">
              <h3 className="text-lg font-semibold text-[var(--color-brand-secondary)]">全局自动翻译结果</h3>
              {summary.successes.length ? (
                <div className="space-y-2">
                  <p className="text-sm text-emerald-600">已更新 {summary.successes.length} 个字段：</p>
                  <ul className="grid gap-1 text-xs text-[var(--color-text-secondary)]">
                    {summary.successes.map((item) => (
                      <li key={item.id} className="rounded-md bg-emerald-50 px-3 py-2 text-emerald-700">
                        <span className="font-semibold">{item.label}</span>
                        <span className="ml-2 text-[11px] uppercase tracking-[0.2em] text-emerald-500">
                          {item.locales.join(", ")}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {summary.failures.length ? (
                <div className="space-y-2">
                  <p className="text-sm text-rose-600">以下字段处理失败或被跳过：</p>
                  <ul className="grid gap-1 text-xs text-rose-600">
                    {summary.failures.map((item) => (
                      <li key={item.id} className="rounded-md bg-rose-50 px-3 py-2">
                        <span className="font-semibold">{item.label || "-"}</span>
                        <span className="ml-2 text-[var(--color-text-secondary)]">{item.reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {!summary.successes.length && !summary.failures.length ? (
                <p>没有可翻译的字段。</p>
              ) : null}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={closeSummary}
                  className="rounded-full bg-[var(--color-brand-primary)] px-4 py-2 text-xs font-semibold text-white shadow transition hover:bg-[var(--color-brand-secondary)]"
                >
                  知道了
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      ) : null}
    </GlobalTranslationContext.Provider>
  );
}

export function useGlobalTranslation(): GlobalTranslationContextValue | null {
  return useContext(GlobalTranslationContext);
}

interface GlobalRegistrationOptions {
  label: string;
  value: Record<string, string>;
  sourceLocale: LocaleKey;
  targetLocales: LocaleKey[];
  context?: string;
  autoTranslateDisabled?: boolean;
  onApply: (next: Record<string, string>) => void;
}

export function useGlobalTranslationRegistration({
  label,
  value,
  sourceLocale,
  targetLocales,
  context,
  autoTranslateDisabled,
  onApply,
}: GlobalRegistrationOptions): void {
  const manager = useGlobalTranslation();
  const fieldId = useId();
  const valueRef = useRef(cloneLocalizedValue(value));

  useEffect(() => {
    valueRef.current = cloneLocalizedValue(value);
  }, [value]);

  useEffect(() => {
    if (!manager || autoTranslateDisabled) {
      return;
    }

    const normalizedTargets = targetLocales.filter((locale) => locale !== sourceLocale);
    if (!normalizedTargets.length) {
      return;
    }

    const registrationId = `${label}-${fieldId}`;


    return manager.registerField({
      id: registrationId,
      label,
      sourceLocale,
      targetLocales: normalizedTargets,
      context: context ?? label,
      getValue: () => cloneLocalizedValue(valueRef.current),
      setValue: (next) => {
        const nextValue = cloneLocalizedValue(next);
        valueRef.current = nextValue;
        onApply(nextValue);
      },
    });
  }, [manager, autoTranslateDisabled, targetLocales, sourceLocale, label, fieldId, context, onApply]);
}

type PathSegment = string | number;

interface LocalizedFieldDescriptor {
  path: PathSegment[];
  label: string;
  locales: LocaleKey[];
}

function isSupportedLocaleKey(key: string): key is LocaleKey {
  return (SUPPORTED_LOCALES as readonly string[]).includes(key);
}

function isLocalizedRecord(value: unknown): value is Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const entries = Object.entries(value as Record<string, unknown>);
  if (!entries.length) return false;
  return entries.every(([key, item]) => isSupportedLocaleKey(key) && typeof item === "string");
}

function cloneStructure<T>(value: T): T {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

function getValueAtPath(root: unknown, path: PathSegment[]): unknown {
  let current = root as any;
  for (const segment of path) {
    if (current == null) return undefined;
    current = current[segment as keyof typeof current];
  }
  return current;
}

function setValueAtPathMutable(root: unknown, path: PathSegment[], nextValue: unknown): void {
  if (!path.length) return;
  let current = root as any;
  for (let index = 0; index < path.length - 1; index += 1) {
    const segment = path[index];
    let next = current?.[segment as keyof typeof current];
    if (next == null) {
      const upcoming = path[index + 1];
      next = typeof upcoming === "number" ? [] : {};
      current[segment as keyof typeof current] = next;
    }
    current = current[segment as keyof typeof current];
  }
  const finalKey = path[path.length - 1];
  current[finalKey as keyof typeof current] = nextValue;
}

function collectLocalizedDescriptors(
  node: unknown,
  path: PathSegment[],
  labelParts: string[],
  out: LocalizedFieldDescriptor[],
): void {
  if (!node) return;

  if (isLocalizedRecord(node)) {
    const locales = Object.keys(node)
      .filter((key): key is LocaleKey => isSupportedLocaleKey(key))
      .sort();
    if (!locales.length) return;
    const labelSegments = [...labelParts];
    if (!labelSegments.length && path.length) {
      labelSegments.push(path[path.length - 1]?.toString() ?? "");
    }
    const label = labelSegments.filter(Boolean).join(" / ");
    out.push({ path, label, locales });
    return;
  }

  if (Array.isArray(node)) {
    node.forEach((item, index) => {
      collectLocalizedDescriptors(item, [...path, index], [...labelParts, `[${index + 1}]`], out);
    });
    return;
  }

  if (typeof node === "object") {
    Object.entries(node as Record<string, unknown>).forEach(([key, value]) => {
      collectLocalizedDescriptors(value, [...path, key], [...labelParts, key], out);
    });
  }
}

interface ConfigRegistrationOptions<T> {
  config: T;
  setConfig: Dispatch<SetStateAction<T>>;
  labelPrefix?: string;
  sourceLocale?: LocaleKey;
  targetLocales?: LocaleKey[];
  enabled?: boolean;
}

export function useGlobalTranslationRegistrationForConfig<T>({
  config,
  setConfig,
  labelPrefix = "",
  sourceLocale = DEFAULT_LOCALE,
  targetLocales,
  enabled = true,
}: ConfigRegistrationOptions<T>): void {
  const manager = useGlobalTranslation();
  const configRef = useRef(config);

  useEffect(() => {
    configRef.current = config;
  }, [config]);

  useEffect(() => {
    if (!manager || !enabled) {
      return;
    }

    const descriptors: LocalizedFieldDescriptor[] = [];
    collectLocalizedDescriptors(config, [], labelPrefix ? [labelPrefix] : [], descriptors);

    if (!descriptors.length) {
      return;
    }

    const baseTargets = targetLocales?.length ? targetLocales : SUPPORTED_LOCALES;
    const normalizedTargets = baseTargets.filter((locale) => locale !== sourceLocale);
    if (!normalizedTargets.length) {
      return;
    }

    const unregisters = descriptors.map(({ path, label }) => {
      const fieldId = `${label || "field"}-${path.join(".")}`;
      return manager.registerField({
        id: fieldId,
        label: label || path.join(" / "),
        sourceLocale,
        targetLocales: normalizedTargets,
        context: label || (path[path.length - 1]?.toString() ?? ""),
        getValue: () => cloneLocalizedValue((getValueAtPath(configRef.current, path) as Record<string, string>) ?? {}),
        setValue: (next) => {
          const cloned = cloneStructure(configRef.current);
          setValueAtPathMutable(cloned, path, cloneLocalizedValue(next));
          setConfig(cloned);
        },
      });
    });

    return () => {
      unregisters.forEach((fn) => fn());
    };
  }, [manager, config, setConfig, labelPrefix, sourceLocale, targetLocales, enabled]);
}
