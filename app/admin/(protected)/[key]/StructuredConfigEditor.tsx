"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";

import type { UpdateSiteConfigActionState } from "../actions";
import { updateSiteConfigAction } from "../actions";
import { EditorDialog } from "./EditorDialog";
import { DEFAULT_LOCALE, getLocaleText } from "./editorUtils";
import { useToast } from "@/providers/ToastProvider";

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export type StructuredConfigObject = { [key: string]: JsonValue };
type JsonObject = StructuredConfigObject;

type NodeType = "string" | "number" | "boolean" | "null" | "object" | "array";

type PrimitiveType = Extract<NodeType, "string" | "number" | "boolean" | "null">;

const SUPPORTED_LOCALES = [
  { code: "zh-CN", label: "简体中文" },
  { code: "zh-TW", label: "繁體中文" },
  { code: "en", label: "English" },
] as const;

type LocaleCode = (typeof SUPPORTED_LOCALES)[number]["code"];
const SUPPORTED_LOCALE_CODES = SUPPORTED_LOCALES.map((item) => item.code);

export interface StructuredConfigEditorProps {
  configKey: string;
  initialConfig: Record<string, unknown>;
  schemaName?: string;
  defaultMeta?: Record<string, unknown>;
  renderPreview?: (config: JsonObject) => JSX.Element;
}

function isJsonObject(value: JsonValue | undefined): value is JsonObject {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isJsonArray(value: JsonValue | undefined): value is JsonValue[] {
  return Array.isArray(value);
}

function isLocalizedStringObject(value: JsonObject | undefined): value is Record<LocaleCode, string> {
  if (!value || typeof value !== "object") return false;
  return Object.entries(value).every(([key, val]) =>
    SUPPORTED_LOCALE_CODES.includes(key as LocaleCode)
    && (typeof val === "string" || typeof val === "undefined" || val === null),
  );
}

function cloneJsonObject<T extends Record<string, unknown>>(value: T): JsonObject {
  return JSON.parse(JSON.stringify(value ?? {})) as JsonObject;
}

function cloneJsonValue<T extends JsonValue>(value: T): T {
  return JSON.parse(JSON.stringify(value ?? null)) as T;
}

function describeJsonValue(value: JsonValue): { typeLabel: string; summary: string } {
  if (Array.isArray(value)) {
    return {
      typeLabel: `数组 (${value.length})`,
      summary: value.length ? `包含 ${value.length} 项` : "当前为空",
    };
  }
  if (value && typeof value === "object") {
    if (isLocalizedStringObject(value)) {
      return {
        typeLabel: "多语言文本",
        summary: getLocaleText(value, undefined, "未填写"),
      };
    }
    const keys = Object.keys(value as JsonObject);
    return {
      typeLabel: `对象 (${keys.length})`,
      summary: keys.length ? `字段：${keys.slice(0, 3).join("、")}${keys.length > 3 ? "…" : ""}` : "当前为空",
    };
  }
  if (typeof value === "string") {
    const text = value.trim();
    return {
      typeLabel: "字符串",
      summary: text.length > 48 ? `${text.slice(0, 48)}…` : text || "未填写",
    };
  }
  if (typeof value === "number") {
    return { typeLabel: "数值", summary: value.toString() };
  }
  if (typeof value === "boolean") {
    return { typeLabel: "布尔", summary: value ? "true" : "false" };
  }
  return { typeLabel: "Null", summary: "当前值为 null" };
}

function normalizeInitialConfig(value: Record<string, unknown>): JsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return cloneJsonObject(value);
}

function createDefaultValue(type: NodeType): JsonValue {
  switch (type) {
    case "string":
      return "";
    case "number":
      return 0;
    case "boolean":
      return false;
    case "null":
      return null;
    case "array":
      return [];
    case "object":
    default:
      return {};
  }
}

function detectPrimitiveType(value: JsonPrimitive): PrimitiveType {
  if (value === null) return "null";
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "number") return "number";
  return "string";
}

interface JsonPrimitiveEditorProps {
  value: JsonPrimitive;
  onChange: (next: JsonPrimitive) => void;
}

function JsonPrimitiveEditor({ value, onChange }: JsonPrimitiveEditorProps) {
  const currentType = detectPrimitiveType(value);

  const handleTypeChange = (nextType: PrimitiveType) => {
    if (nextType === currentType) return;
    switch (nextType) {
      case "string":
        onChange("");
        break;
      case "number":
        onChange(0);
        break;
      case "boolean":
        onChange(false);
        break;
      case "null":
      default:
        onChange(null);
        break;
    }
  };

  if (currentType === "string") {
    const stringValue = typeof value === "string" ? value : "";
    const isMultiline = stringValue.includes("\n") || stringValue.length > 120;
    return (
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2">
          <span className="font-medium text-[var(--color-brand-secondary)]">文本</span>
          <select
            value={currentType}
            onChange={(event) => handleTypeChange(event.target.value as PrimitiveType)}
            className="rounded-full border border-[var(--color-border)] bg-white px-3 py-1 text-xs"
          >
            <option value="string">字符串</option>
            <option value="number">数值</option>
            <option value="boolean">布尔</option>
            <option value="null">Null</option>
          </select>
        </div>
        {isMultiline ? (
          <textarea
            value={stringValue}
            onChange={(event) => onChange(event.target.value)}
            rows={Math.min(Math.max(stringValue.split("\n").length, 3), 10)}
            className="w-full rounded-xl border border-[var(--color-border)] bg-white/80 px-3 py-2 text-sm leading-relaxed text-[var(--color-brand-secondary)] focus:border-[var(--color-brand-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/30"
          />
        ) : (
          <input
            value={stringValue}
            onChange={(event) => onChange(event.target.value)}
            className="w-full rounded-xl border border-[var(--color-border)] bg-white/80 px-3 py-2 text-sm text-[var(--color-brand-secondary)] focus:border-[var(--color-brand-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/30"
          />
        )}
      </div>
    );
  }

  if (currentType === "number") {
    const numericValue = typeof value === "number" && !Number.isNaN(value) ? value : 0;
    return (
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2">
          <span className="font-medium text-[var(--color-brand-secondary)]">数值</span>
          <select
            value={currentType}
            onChange={(event) => handleTypeChange(event.target.value as PrimitiveType)}
            className="rounded-full border border-[var(--color-border)] bg-white px-3 py-1 text-xs"
          >
            <option value="number">数值</option>
            <option value="string">字符串</option>
            <option value="boolean">布尔</option>
            <option value="null">Null</option>
          </select>
        </div>
        <input
          type="number"
          value={numericValue}
          onChange={(event) => onChange(event.target.value === "" ? 0 : Number(event.target.value))}
          className="w-full rounded-xl border border-[var(--color-border)] bg-white/80 px-3 py-2 text-sm text-[var(--color-brand-secondary)] focus:border-[var(--color-brand-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/30"
        />
      </div>
    );
  }

  if (currentType === "boolean") {
    const booleanValue = Boolean(value);
    return (
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2">
          <span className="font-medium text-[var(--color-brand-secondary)]">布尔值</span>
          <select
            value={currentType}
            onChange={(event) => handleTypeChange(event.target.value as PrimitiveType)}
            className="rounded-full border border-[var(--color-border)] bg-white px-3 py-1 text-xs"
          >
            <option value="boolean">布尔</option>
            <option value="string">字符串</option>
            <option value="number">数值</option>
            <option value="null">Null</option>
          </select>
        </div>
        <select
          value={booleanValue ? "true" : "false"}
          onChange={(event) => onChange(event.target.value === "true")}
          className="w-full rounded-xl border border-[var(--color-border)] bg-white/80 px-3 py-2 text-sm text-[var(--color-brand-secondary)] focus:border-[var(--color-brand-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/30"
        >
          <option value="true">true</option>
          <option value="false">false</option>
        </select>
      </div>
    );
  }

  return (
    <div className="space-y-2 text-sm">
      <div className="flex items-center gap-2">
        <span className="font-medium text-[var(--color-brand-secondary)]">Null</span>
        <select
          value={currentType}
          onChange={(event) => handleTypeChange(event.target.value as PrimitiveType)}
          className="rounded-full border border-[var(--color-border)] bg-white px-3 py-1 text-xs"
        >
          <option value="null">Null</option>
          <option value="string">字符串</option>
          <option value="number">数值</option>
          <option value="boolean">布尔</option>
        </select>
      </div>
      <p className="text-xs text-[var(--color-text-tertiary,#8690a3)]">当前值为 null</p>
    </div>
  );
}

function LocalizedStringEditor({ value, onChange }: { value: JsonObject; onChange: (next: JsonObject) => void }) {
  const handleLocaleChange = (locale: LocaleCode, nextValue: string) => {
    const trimmed = nextValue.trim();
    const draft = { ...value } as JsonObject;
    if (!trimmed) {
      delete draft[locale];
    } else {
      draft[locale] = nextValue;
    }
    onChange(draft);
  };

  return (
    <div className="space-y-4">
      {SUPPORTED_LOCALES.map(({ code, label }) => {
        const currentValue = typeof value[code] === "string" ? (value[code] as string) : "";
        const isMultiline = currentValue.includes("\n") || currentValue.length > 120;
        return (
          <div key={code} className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-[var(--color-brand-secondary)]">{label}</span>
              <span className="rounded-full border border-[var(--color-border)] px-2 py-0.5 text-[10px] text-[var(--color-text-tertiary,#8690a3)]">{code}</span>
              {!currentValue ? (
                <span className="text-xs text-[var(--color-text-tertiary,#8690a3)]">未填写</span>
              ) : null}
            </div>
            {isMultiline ? (
              <textarea
                value={currentValue}
                onChange={(event) => handleLocaleChange(code, event.target.value)}
                rows={Math.min(Math.max(currentValue.split("\n").length, 3), 10)}
                className="w-full rounded-xl border border-[var(--color-border)] bg-white/80 px-3 py-2 text-sm leading-relaxed text-[var(--color-brand-secondary)] focus:border-[var(--color-brand-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/30"
              />
            ) : (
              <input
                value={currentValue}
                onChange={(event) => handleLocaleChange(code, event.target.value)}
                placeholder={`填写 ${label}`}
                className="w-full rounded-xl border border-[var(--color-border)] bg-white/80 px-3 py-2 text-sm text-[var(--color-brand-secondary)] focus:border-[var(--color-brand-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/30"
              />
            )}
            <div className="flex justify-end text-xs text-[var(--color-text-tertiary,#8690a3)]">
              <button
                type="button"
                onClick={() => handleLocaleChange(code, "")}
                className="rounded-full border border-[var(--color-border)] px-3 py-1 transition hover:border-rose-200 hover:text-rose-500"
              >
                清空
              </button>
            </div>
          </div>
        );
      })}
      <p className="text-[10px] text-[var(--color-text-tertiary,#8690a3)]">未填写的语言将在保存时移除。</p>
    </div>
  );
}

interface JsonArrayEditorProps {
  value: JsonValue[];
  onChange: (next: JsonValue[]) => void;
  depth: number;
}

function JsonArrayEditor({ value, onChange, depth }: JsonArrayEditorProps) {
  const handleItemChange = (index: number, nextValue: JsonValue) => {
    const next = value.slice();
    next[index] = nextValue;
    onChange(next);
  };

  const handleRemove = (index: number) => {
    onChange(value.filter((_, idx) => idx !== index));
  };

  const handleAdd = (type: NodeType) => {
    onChange([...value, createDefaultValue(type)]);
  };

  return (
    <div className="space-y-4 rounded-2xl border border-[var(--color-border)] bg-white/70 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold text-[var(--color-brand-secondary)]">数组（{value.length} 项）</span>
        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => handleAdd("string")}
            className="rounded-full border border-[var(--color-border)] px-3 py-1 text-[var(--color-brand-primary)] transition hover:border-[var(--color-brand-primary)] hover:bg-[var(--color-brand-primary)]/10"
          >
            添加字符串
          </button>
          <button
            type="button"
            onClick={() => handleAdd("object")}
            className="rounded-full border border-[var(--color-border)] px-3 py-1 text-[var(--color-brand-secondary)] transition hover:border-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary)]"
          >
            添加对象
          </button>
        </div>
      </div>
      {value.length ? (
        <div className="space-y-3">
          {value.map((item, index) => (
            <div key={index} className="space-y-3 rounded-2xl border border-[var(--color-border)] bg-white p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[var(--color-brand-secondary)]">索引 {index}</span>
                <button
                  type="button"
                  onClick={() => handleRemove(index)}
                  className="rounded-full border border-[var(--color-border)] px-3 py-1 text-[var(--color-text-secondary)] transition hover:border-rose-200 hover:text-rose-500"
                >
                  删除
                </button>
              </div>
              <JsonEditorNode value={item} onChange={(next) => handleItemChange(index, next)} depth={depth + 1} />
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-white/50 px-4 py-6 text-center text-xs text-[var(--color-text-secondary)]">
          当前数组为空，点击上方按钮新增元素。
        </div>
      )}
    </div>
  );
}

interface JsonObjectEditorProps {
  value: JsonObject;
  onChange: (next: JsonObject) => void;
  depth: number;
}

function JsonObjectEditor({ value, onChange, depth }: JsonObjectEditorProps) {
  const entries = Object.entries(value ?? {});
  const [newKey, setNewKey] = useState("");
  const [newValueType, setNewValueType] = useState<NodeType>("string");
  const [error, setError] = useState<string | null>(null);

  const handleValueChange = (key: string, nextValue: JsonValue) => {
    onChange({ ...value, [key]: nextValue });
  };

  const handleKeyRename = (oldKey: string, nextKey: string) => {
    const trimmed = nextKey.trim();
    if (!trimmed || trimmed === oldKey) return;
    if (Object.prototype.hasOwnProperty.call(value, trimmed)) {
      setError(`字段 “${trimmed}” 已存在`);
      return;
    }
    const next: JsonObject = {};
    for (const [key, val] of Object.entries(value)) {
      next[key === oldKey ? trimmed : key] = val;
    }
    onChange(next);
    setError(null);
  };

  const handleRemove = (key: string) => {
    const next = { ...value };
    delete next[key];
    onChange(next);
  };

  const handleAddProperty = () => {
    const trimmed = newKey.trim();
    if (!trimmed) {
      setError("字段名称不能为空");
      return;
    }
    if (Object.prototype.hasOwnProperty.call(value, trimmed)) {
      setError("字段已存在");
      return;
    }
    onChange({ ...value, [trimmed]: createDefaultValue(newValueType) });
    setNewKey("");
    setError(null);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[var(--color-border)] bg-white/70 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <input
            value={newKey}
            onChange={(event) => setNewKey(event.target.value)}
            placeholder="字段名称"
            className="w-40 rounded-xl border border-[var(--color-border)] bg-white/80 px-3 py-2 text-sm text-[var(--color-brand-secondary)] focus:border-[var(--color-brand-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/30"
          />
          <select
            value={newValueType}
            onChange={(event) => setNewValueType(event.target.value as NodeType)}
            className="rounded-full border border-[var(--color-border)] bg-white px-3 py-1 text-xs"
          >
            <option value="string">字符串</option>
            <option value="number">数值</option>
            <option value="boolean">布尔</option>
            <option value="null">Null</option>
            <option value="object">对象</option>
            <option value="array">数组</option>
          </select>
          <button
            type="button"
            onClick={handleAddProperty}
            className="rounded-full border border-[var(--color-border)] px-4 py-1.5 text-xs font-semibold text-[var(--color-brand-primary)] transition hover:border-[var(--color-brand-primary)] hover:bg-[var(--color-brand-primary)]/10"
          >
            添加字段
          </button>
        </div>
        {error ? <p className="mt-2 text-xs text-rose-500">{error}</p> : null}
      </div>

      {entries.length ? (
        <div className="space-y-4">
          {entries.map(([key, childValue]) => (
            <div key={key} className="space-y-3 rounded-2xl border border-[var(--color-border)] bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <input
                  value={key}
                  onChange={(event) => handleKeyRename(key, event.target.value)}
                  className="flex-1 rounded-xl border border-[var(--color-border)] bg-white/80 px-3 py-2 text-sm text-[var(--color-brand-secondary)] focus:border-[var(--color-brand-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/30"
                />
                <button
                  type="button"
                  onClick={() => handleRemove(key)}
                  className="rounded-full border border-[var(--color-border)] px-3 py-1 text-xs text-[var(--color-text-secondary)] transition hover:border-rose-200 hover:text-rose-500"
                >
                  删除
                </button>
              </div>
              <JsonEditorNode value={childValue} onChange={(next) => handleValueChange(key, next)} depth={depth + 1} />
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-white/50 px-4 py-6 text-center text-xs text-[var(--color-text-secondary)]">
          当前对象暂无字段，使用上方表单新增。
        </div>
      )}
    </div>
  );
}

interface JsonEditorNodeProps {
  value: JsonValue;
  onChange: (next: JsonValue) => void;
  depth: number;
}

function JsonEditorNode({ value, onChange, depth }: JsonEditorNodeProps) {
  if (isJsonArray(value)) {
    return <JsonArrayEditor value={value} onChange={onChange} depth={depth} />;
  }
  if (isJsonObject(value)) {
    if (isLocalizedStringObject(value)) {
      return <LocalizedStringEditor value={value} onChange={(next) => onChange(next)} />;
    }
    return <JsonObjectEditor value={value} onChange={(next) => onChange(next)} depth={depth} />;
  }
  return <JsonPrimitiveEditor value={(value ?? "") as JsonPrimitive} onChange={(next) => onChange(next)} />;
}

function prettifyJson(value: JsonObject): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch (error) {
    return "{}";
  }
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

export function StructuredConfigEditor({
  configKey,
  initialConfig,
  schemaName,
  defaultMeta,
  renderPreview,
}: StructuredConfigEditorProps) {
  const normalized = useMemo(() => normalizeInitialConfig(initialConfig), [initialConfig]);
  const [config, setConfig] = useState<JsonObject>(normalized);
  const [initialSnapshot, setInitialSnapshot] = useState<JsonObject>(normalized);
  const [activeField, setActiveField] = useState<string | null>(null);
  const [fieldDraft, setFieldDraft] = useState<JsonValue | null>(null);
  const [newFieldKey, setNewFieldKey] = useState("");
  const [newFieldType, setNewFieldType] = useState<NodeType>("object");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const payloadInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const lastSubmittedRef = useRef<JsonObject>(normalized);
  const [state, formAction] = useFormState<UpdateSiteConfigActionState, FormData>(updateSiteConfigAction, {
    status: "idle",
  });
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const editorBackupRef = useRef<JsonObject | null>(null);

  useEffect(() => {
    setConfig(normalized);
    setInitialSnapshot(normalized);
    setActiveField(null);
    setFieldDraft(null);
  }, [normalized]);

  useEffect(() => {
    if (state.status === "success") {
      setInitialSnapshot(lastSubmittedRef.current);
      setConfig(lastSubmittedRef.current);
      toast.success("保存成功");
    }
  }, [state.status, toast]);

  const isDirty = useMemo(() => JSON.stringify(config) !== JSON.stringify(initialSnapshot), [config, initialSnapshot]);
  const formattedPreview = useMemo(() => prettifyJson(config), [config]);
  const entries = useMemo(() => Object.entries(config), [config]);

  const handleAddField = () => {
    const trimmed = newFieldKey.trim();
    if (!trimmed) {
      setFieldError("字段名称不能为空");
      return;
    }
    if (Object.prototype.hasOwnProperty.call(config, trimmed)) {
      setFieldError("字段已存在");
      return;
    }
    setConfig((prev) => ({
      ...prev,
      [trimmed]: createDefaultValue(newFieldType),
    }));
    setNewFieldKey("");
    setFieldError(null);
  };

  const handleRenameField = (oldKey: string, nextKey: string) => {
    const trimmed = nextKey.trim();
    if (!trimmed || trimmed === oldKey) return;
    if (Object.prototype.hasOwnProperty.call(config, trimmed)) {
      setFieldError(`字段 “${trimmed}” 已存在`);
      return;
    }
    setConfig((prev) => {
      const draft: JsonObject = {};
      for (const [key, value] of Object.entries(prev)) {
        draft[key === oldKey ? trimmed : key] = value;
      }
      return draft;
    });
    if (activeField === oldKey) {
      setActiveField(trimmed);
    }
    setFieldError(null);
  };

  const handleRemoveField = (key: string) => {
    setConfig((prev) => {
      const draft = { ...prev };
      delete draft[key];
      return draft;
    });
    if (activeField === key) {
      setActiveField(null);
      setFieldDraft(null);
    }
    setFieldError(null);
  };

  const openFieldDialog = (key: string) => {
    const current = (config as Record<string, JsonValue | undefined>)[key];
    setActiveField(key);
    setFieldDraft(cloneJsonValue(current ?? createDefaultValue("object")));
  };

  const closeFieldDialog = () => {
    setActiveField(null);
    setFieldDraft(null);
  };

  const saveFieldDialog = () => {
    if (!activeField) return;
    setConfig((prev) => ({
      ...prev,
      [activeField]: fieldDraft ?? null,
    }));
    closeFieldDialog();
  };

  const handleSubmit = () => {
    const nextPayload = cloneJsonObject(config) as JsonObject & { _meta?: unknown };
    const currentMeta = nextPayload._meta;
    const resolvedMeta = isJsonObject(currentMeta as JsonValue)
      ? { ...(currentMeta as Record<string, unknown>) }
      : {};
    resolvedMeta.updatedAt = new Date().toISOString();
    if (schemaName) {
      if (typeof resolvedMeta.schema !== "string" || !resolvedMeta.schema.trim()) {
        resolvedMeta.schema = schemaName;
      }
    } else if (typeof resolvedMeta.schema !== "string" || !resolvedMeta.schema.trim()) {
      resolvedMeta.schema = `${configKey}.v1`;
    }
    if (defaultMeta) {
      for (const [metaKey, metaValue] of Object.entries(defaultMeta)) {
        if (typeof (resolvedMeta as Record<string, unknown>)[metaKey] === "undefined") {
          (resolvedMeta as Record<string, unknown>)[metaKey] = metaValue;
        }
      }
    }
    nextPayload._meta = resolvedMeta as JsonValue;
    lastSubmittedRef.current = cloneJsonObject(nextPayload as Record<string, unknown>);
    if (payloadInputRef.current) {
      payloadInputRef.current.value = JSON.stringify(nextPayload);
    }
  };

  const handleReset = () => {
    setConfig(initialSnapshot);
  };

  const openEditor = () => {
    editorBackupRef.current = cloneJsonObject(config);
    setIsEditorOpen(true);
  };

  const closeEditor = () => {
    editorBackupRef.current = null;
    setIsEditorOpen(false);
  };

  const cancelEditor = () => {
    if (editorBackupRef.current) {
      setConfig(editorBackupRef.current);
    }
    editorBackupRef.current = null;
    setIsEditorOpen(false);
  };

  const previewNode = renderPreview ? renderPreview(config) : null;

  const editorContent = (
    <div className="space-y-6">
      <div className="rounded-3xl border border-[var(--color-border)] bg-white/80 p-6 shadow-sm">
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-[var(--color-brand-secondary)]">配置概览</h2>
          <div className="grid grid-cols-2 gap-3 text-xs text-[var(--color-text-tertiary,#8690a3)]">
            <div className="rounded-2xl border border-[var(--color-border)] bg-white/70 px-3 py-2 text-center">
              <span className="block text-base font-semibold text-[var(--color-brand-primary)]">{Object.keys(config).length}</span>
              字段数量
            </div>
            <div className="rounded-2xl border border-[var(--color-border)] bg-white/70 px-3 py-2 text-center">
              <span className="block text-base font-semibold text-[var(--color-brand-primary)]">
                {JSON.stringify(config).length}
              </span>
              字符总数
            </div>
          </div>
          <details className="rounded-2xl border border-[var(--color-border)] bg-white/60">
            <summary className="cursor-pointer px-4 py-3 text-xs font-semibold text-[var(--color-brand-secondary)]">查看 JSON 预览</summary>
            <pre className="max-h-[360px] overflow-auto bg-black/90 p-4 text-xs leading-relaxed text-white">
              <code>{formattedPreview}</code>
            </pre>
          </details>
          {state.status === "success" ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-700">
              {state.message}
            </div>
          ) : null}
          {state.status === "error" ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-600">
              {state.message}
            </div>
          ) : null}
          <p className="text-[10px] text-[var(--color-text-tertiary,#8690a3)]">
            提示：在弹窗中调整配置后，需点击上方“保存配置”按钮写入数据库。
          </p>
        </div>
      </div>

      <div className="rounded-3xl border border-[var(--color-border)] bg-white/80 p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-[var(--color-brand-secondary)]">配置结构</h2>
          <div className="flex items-center gap-2 text-xs text-[var(--color-text-tertiary,#8690a3)]">
            {isDirty ? "有未保存的更改" : "暂无未保存的更改"}
          </div>
        </div>
        <div className="mt-6 space-y-4">
          <JsonEditorNode value={config} onChange={(next) => { if (isJsonObject(next)) setConfig(next); }} depth={0} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <SubmitButton disabled={!isDirty} highlight={isDirty} />
        <button
          type="button"
          onClick={handleReset}
          disabled={!isDirty}
          className="rounded-full border border-[var(--color-border)] px-5 py-2 text-sm text-[var(--color-text-secondary)] transition hover:border-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          恢复初始值
        </button>
      </div>
    </div>
  );

  return (
    <form action={formAction} onSubmit={handleSubmit} className="space-y-6">
      <input type="hidden" name="key" value={configKey} />
      <input ref={payloadInputRef} type="hidden" name="payload" value={JSON.stringify(config)} readOnly />


      <div className="rounded-3xl border border-[var(--color-border)] bg-white shadow-sm">
        {previewNode ?? (
          <div className="p-6 text-sm text-[var(--color-text-secondary)]">当前配置不支持可视化预览。</div>
        )}
      </div>

      <div className="space-y-4 rounded-3xl border border-[var(--color-border)] bg-white/90 p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-[var(--color-brand-secondary)]">配置字段</h2>
            <p className="text-xs text-[var(--color-text-tertiary,#8690a3)]">点击卡片可编辑对应板块，支持新增、重命名或删除字段。</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <input
              value={newFieldKey}
              onChange={(event) => {
                setNewFieldKey(event.target.value);
                if (fieldError) setFieldError(null);
              }}
              placeholder="新增字段名称"
              className="w-32 rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-brand-secondary)] focus:border-[var(--color-brand-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/30"
            />
            <select
              value={newFieldType}
              onChange={(event) => setNewFieldType(event.target.value as NodeType)}
              className="rounded-full border border-[var(--color-border)] bg-white px-3 py-1 text-xs"
            >
              <option value="object">对象</option>
              <option value="array">数组</option>
              <option value="string">字符串</option>
              <option value="number">数值</option>
              <option value="boolean">布尔</option>
              <option value="null">Null</option>
            </select>
            <button
              type="button"
              onClick={handleAddField}
              className="rounded-full border border-[var(--color-border)] px-4 py-2 text-xs font-semibold text-[var(--color-brand-primary)] transition hover:border-[var(--color-brand-primary)] hover:bg-[var(--color-brand-primary)]/10"
            >
              新增字段
            </button>
          </div>
        </div>
        {fieldError ? <p className="text-xs text-rose-500">{fieldError}</p> : null}
        {entries.length ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {entries.map(([key, value]) => {
              const { typeLabel, summary } = describeJsonValue(value as JsonValue);
              return (
                <div key={key} className="space-y-3 rounded-2xl border border-[var(--color-border)] bg-white/85 p-4 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <input
                      key={`field-${key}`}
                      defaultValue={key}
                      onBlur={(event) => handleRenameField(key, event.target.value)}
                      className="flex-1 rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm font-semibold text-[var(--color-brand-secondary)] focus:border-[var(--color-brand-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/30"
                    />
                    <div className="flex items-center gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => openFieldDialog(key)}
                        className="rounded-full border border-[var(--color-border)] px-3 py-1 font-semibold text-[var(--color-brand-primary)] transition hover:border-[var(--color-brand-primary)] hover:bg-[var(--color-brand-primary)]/10"
                      >
                        编辑
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveField(key)}
                        className="rounded-full border border-rose-200 px-3 py-1 text-rose-500 transition hover:bg-rose-50"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                  <div className="grid gap-3 text-xs text-[var(--color-text-tertiary,#8690a3)] md:grid-cols-2">
                    <div className="rounded-2xl border border-[var(--color-border)] bg-white/70 px-3 py-2">
                      <span className="block text-[10px] uppercase tracking-[0.3em]">类型</span>
                      <span className="text-[var(--color-brand-secondary)]">{typeLabel}</span>
                    </div>
                    <div className="rounded-2xl border border-[var(--color-border)] bg-white/70 px-3 py-2 md:col-span-1 md:justify-self-stretch">
                      <span className="block text-[10px] uppercase tracking-[0.3em]">摘要</span>
                      <span className="line-clamp-2 text-[var(--color-brand-secondary)]">{summary}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-white/60 px-4 py-6 text-center text-sm text-[var(--color-text-secondary)]">
            还没有任何字段，请先新增字段。
          </div>
        )}
      </div>

      {isEditorOpen ? (
        <EditorDialog
          title="配置结构"
          subtitle="在弹窗内修改字段，完成后点击保存配置"
          onSave={closeEditor}
          onCancel={cancelEditor}
          saveLabel="完成"
        >
          {editorContent}
        </EditorDialog>
      ) : null}

      {activeField ? (
        <EditorDialog
          title={`编辑字段：${activeField}`}
          subtitle="修改字段结构，保存后同步到页面"
          onSave={saveFieldDialog}
          onCancel={closeFieldDialog}
          saveLabel="保存字段"
        >
          <div className="space-y-4">
            <p className="text-xs text-[var(--color-text-tertiary,#8690a3)]">
              支持嵌套对象、数组及多语言文本，修改后记得在主界面保存配置。
            </p>
            {fieldDraft !== null ? (
              <JsonEditorNode value={fieldDraft} onChange={(next) => setFieldDraft(next)} depth={0} />
            ) : null}
          </div>
        </EditorDialog>
      ) : null}
    </form>
  );
}
