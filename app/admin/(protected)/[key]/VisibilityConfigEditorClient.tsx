"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { useFormState } from "react-dom";

import { VISIBILITY_PAGES, type VisibilityPageKey } from "@/constants/visibility";
import {
  normalizeVisibilityConfig,
  type VisibilityConfig,
} from "@/lib/visibilityConfig";

import type { UpdateSiteConfigActionState } from "../actions";
import { updateSiteConfigAction } from "../actions";
import { useToast } from "@/providers/ToastProvider";

interface VisibilityConfigEditorClientProps {
  configKey: string;
  initialConfig: Record<string, unknown>;
  isSuperAdmin: boolean;
  // fields dictionary keyed by admin config key (中文)，each with entries
  fieldsByPage?: Record<string, { path: string; type: string; section?: string; example?: unknown }[]>;
}

interface DraftVisibilityConfig extends VisibilityConfig {}

const VISIBILITY_PAGE_TO_CONFIG_KEY: Record<VisibilityPageKey, string> = {
  home: "首页",
  productsIndex: "产品中心",
  productDetail: "产品详情",
  newsIndex: "新闻中心",
  newsDetail: "新闻中心",
  about: "关于时代",
  contact: "联系方式",
  library: "资料库",
  downloads: "下载中心",
  faq: "常见问题",
  partners: "合作伙伴",
  privacy: "隐私政策",
  terms: "服务条款",
  inventory: "现货库存",
  videos: "视频库",
  casesIndex: "案例展示",
  casesCategory: "案例展示",
  casesDetail: "案例展示",
  careers: "招聘信息",
} as const;

// 分类小板块：文案、按钮、轮播、全部字段
type CategoryKey = "copy" | "button" | "carousel" | "all";
const CATEGORY_LABELS: Record<CategoryKey, string> = {
  copy: "文案",
  button: "按钮",
  carousel: "轮播",
  all: "全部字段",
};

function classifyCategory(path: string, type: string): Exclude<CategoryKey, "all"> | null {
  const p = String(path).toLowerCase();
  const t = String(type).toLowerCase();
  const isCopy =
    t === "string" ||
    p.includes("title") ||
    p.includes("description") ||
    p.includes("eyebrow") ||
    p.includes("summary") ||
    p.includes("copy") ||
    p.includes("label") ||
    p.includes("name") ||
    p.includes("highlight") ||
    p.includes("text");
  if (isCopy) return "copy";

  const isButton =
    p.includes("button") ||
    p.includes("cta") ||
    p.includes("link") ||
    p.includes("href") ||
    p.includes("action") ||
    p.includes("actions");
  if (isButton) return "button";

  const isCarousel =
    p.includes("carousel") ||
    p.includes("gallery") ||
    p.includes("slides") ||
    p.includes("images") ||
    p.includes("videos") ||
    p.includes("items") ||
    p.includes("cards") ||
    p.includes("[]") ||
    t === "array";
  if (isCarousel) return "carousel";

  return null;
}

// 将小版块key映射到类别（用于打开弹窗时选择分类）
function mapSubBlockKeyToCategoryKey(key: string): CategoryKey {
  const k = String(key).toLowerCase();
  if (k === "all") return "all";
  if (k.includes("cta") || k.includes("button") || k.includes("actions") || k.includes("action") || k.includes("link")) return "button";
  if (
    k.includes("slides") ||
    k.includes("gallery") ||
    k.includes("images") ||
    k.includes("videos") ||
    k.includes("items") ||
    k.includes("cards") ||
    k.includes("filters") ||
    k.includes("pagination") ||
    k.includes("members") ||
    k.includes("fields")
  ) return "carousel";
  if (k.includes("title") || k.includes("headline") || k.includes("desc") || k.includes("overview") || k.includes("group") || k.includes("copy") || k.includes("stats") || k.includes("meta") || k.includes("author") || k.includes("date") || k.includes("tags")) return "copy";
  return "all";
}

function getSectionCategoryPaths(
  pageKey: VisibilityPageKey,
  sectionKey: string,
  fieldsByPage: VisibilityConfigEditorClientProps["fieldsByPage"],
): Record<CategoryKey, string[]> {
  const result: Record<CategoryKey, string[]> = { copy: [], button: [], carousel: [], all: [] };
  const configKeyForPage = VISIBILITY_PAGE_TO_CONFIG_KEY[pageKey];
  const fields = (fieldsByPage && configKeyForPage ? fieldsByPage[configKeyForPage] ?? [] : []) as {
    path: string; type: string; section?: string; example?: unknown;
  }[];
  for (const f of fields) {
    if (String(f.section) !== sectionKey) continue;
    const cat = classifyCategory(String(f.path), String(f.type));
    if (cat) result[cat].push(String(f.path));
    result.all.push(String(f.path));
  }
  return result;
}

// 定义各板块的小版块集合（仅用于展示层级，不涉及字段）
type SubBlock = { key: string; label: string };
const SECTION_SUBBLOCKS: Partial<Record<VisibilityPageKey, Record<string, SubBlock[]>>> = {
  home: {
    hero: [
      { key: "copy", label: "文案" },
      { key: "cta", label: "按钮" },
      { key: "slides", label: "轮播" },
      { key: "all", label: "全部字段" },
    ],
    applications: [
      { key: "copy", label: "板块文案" },
      { key: "selection", label: "已选分类" },
      { key: "items", label: "卡片内容" },
      { key: "all", label: "全部字段" },
    ],
    product: [
      { key: "copy", label: "组标题" },
      { key: "selection", label: "精选产品" },
      { key: "cards", label: "卡片内容" },
      { key: "all", label: "全部字段" },
    ],
    company: [
      { key: "overview", label: "概览文案" },
      { key: "stats", label: "经营数据" },
      { key: "highlights", label: "服务亮点" },
      { key: "capabilities", label: "资质能力" },
      { key: "gallery", label: "图库" },
      { key: "all", label: "全部字段" },
    ],
    inventory: [
      { key: "copy", label: "文案" },
      { key: "ctas", label: "按钮" },
      { key: "all", label: "全部字段" },
    ],
    contactCta: [
      { key: "copy", label: "文案" },
      { key: "actions", label: "按钮" },
      { key: "all", label: "全部字段" },
    ],
  },
  productsIndex: {
    hero: [
      { key: "headline", label: "主视觉文案" },
      { key: "media", label: "背景媒体" },
      { key: "cta", label: "按钮/CTA" },
      { key: "all", label: "全部字段" },
    ],
    sidebar: [
      { key: "groups", label: "导航分组" },
      { key: "filters", label: "分类/标签" },
      { key: "all", label: "全部字段" },
    ],
    productList: [
      { key: "filters", label: "筛选条件" },
      { key: "cards", label: "产品卡片" },
      { key: "pagination", label: "分页/加载更多" },
      { key: "all", label: "全部字段" },
    ],
  },
  productDetail: {
    hero: [
      { key: "title", label: "标题文案" },
      { key: "tags", label: "关键标签" },
      { key: "cta", label: "按钮/CTA" },
      { key: "all", label: "全部字段" },
    ],
    overview: [
      { key: "copy", label: "概览文案" },
      { key: "features", label: "特性/参数段" },
      { key: "media", label: "图片/视频" },
      { key: "all", label: "全部字段" },
    ],
    highlights: [
      { key: "copy", label: "亮点文案" },
      { key: "items", label: "亮点列表" },
      { key: "all", label: "全部字段" },
    ],
    gallery: [
      { key: "images", label: "图片" },
      { key: "videos", label: "视频" },
      { key: "all", label: "全部字段" },
    ],
    extraSections: [
      { key: "modules", label: "附加模块" },
      { key: "moduleCopy", label: "模块文案" },
      { key: "moduleCards", label: "模块卡片" },
      { key: "all", label: "全部字段" },
    ],
    advisor: [
      { key: "copy", label: "CTA文案" },
      { key: "button", label: "按钮/链接" },
      { key: "all", label: "全部字段" },
    ],
  },
  casesIndex: {
    hero: [
      { key: "headline", label: "主视觉文案" },
      { key: "media", label: "背景媒体" },
      { key: "cta", label: "按钮/CTA" },
      { key: "all", label: "全部字段" },
    ],
    categories: [
      { key: "copy", label: "分类文案" },
      { key: "cards", label: "分类卡片" },
      { key: "filters", label: "筛选条件" },
      { key: "all", label: "全部字段" },
    ],
    cta: [
      { key: "copy", label: "CTA文案" },
      { key: "button", label: "按钮/链接" },
      { key: "all", label: "全部字段" },
    ],
  },
  casesCategory: {
    sidebar: [
      { key: "copy", label: "侧边文案" },
      { key: "nav", label: "分类导航项" },
      { key: "filters", label: "筛选条件" },
      { key: "all", label: "全部字段" },
    ],
    header: [
      { key: "copy", label: "分类标题文案" },
      { key: "stats", label: "统计信息" },
      { key: "tags", label: "标签/分类" },
      { key: "all", label: "全部字段" },
    ],
    caseGrid: [
      { key: "cards", label: "案例卡片" },
      { key: "pagination", label: "分页/加载更多" },
      { key: "sorting", label: "排序/筛选" },
      { key: "all", label: "全部字段" },
    ],
    cta: [
      { key: "copy", label: "CTA文案" },
      { key: "button", label: "按钮/链接" },
      { key: "all", label: "全部字段" },
    ],
  },
  casesDetail: {
    sidebar: [
      { key: "nav", label: "侧边导航项" },
      { key: "anchors", label: "锚点" },
      { key: "all", label: "全部字段" },
    ],
    hero: [
      { key: "title", label: "标题文案" },
      { key: "meta", label: "关键信息" },
      { key: "cta", label: "按钮/CTA" },
      { key: "all", label: "全部字段" },
    ],
    background: [
      { key: "copy", label: "背景文案" },
      { key: "facts", label: "项目档案信息" },
      { key: "all", label: "全部字段" },
    ],
    highlights: [
      { key: "copy", label: "亮点文案" },
      { key: "items", label: "亮点列表" },
      { key: "all", label: "全部字段" },
    ],
    deliverables: [
      { key: "copy", label: "交付文案" },
      { key: "items", label: "交付列表" },
      { key: "attachments", label: "下载/链接" },
      { key: "all", label: "全部字段" },
    ],
    gallery: [
      { key: "images", label: "图片" },
      { key: "videos", label: "视频" },
      { key: "all", label: "全部字段" },
    ],
    related: [
      { key: "copy", label: "推荐文案" },
      { key: "cards", label: "推荐卡片" },
      { key: "all", label: "全部字段" },
    ],
    advisor: [
      { key: "copy", label: "CTA文案" },
      { key: "button", label: "按钮/链接" },
      { key: "all", label: "全部字段" },
    ],
  },
  inventory: {
    hero: [
      { key: "headline", label: "标题文案" },
      { key: "desc", label: "说明文案" },
      { key: "cta", label: "按钮/CTA" },
      { key: "all", label: "全部字段" },
    ],
    sections: [
      { key: "groupTitle", label: "组标题" },
      { key: "cards", label: "卡片内容" },
      { key: "all", label: "全部字段" },
    ],
  },
  videos: {
    hero: [
      { key: "headline", label: "标题文案" },
      { key: "desc", label: "说明文案" },
      { key: "cta", label: "按钮/CTA" },
      { key: "all", label: "全部字段" },
    ],
    library: [
      { key: "filters", label: "筛选条件" },
      { key: "cards", label: "卡片内容" },
      { key: "all", label: "全部字段" },
    ],
  },
  newsIndex: {
    hero: [
      { key: "headline", label: "标题文案" },
      { key: "desc", label: "说明文案" },
      { key: "cta", label: "按钮/CTA" },
      { key: "all", label: "全部字段" },
    ],
    timeline: [
      { key: "copy", label: "列表文案" },
      { key: "cards", label: "新闻卡片" },
      { key: "pagination", label: "分页/加载更多" },
      { key: "all", label: "全部字段" },
    ],
  },
  newsDetail: {
    hero: [
      { key: "title", label: "标题文案" },
      { key: "subtitle", label: "副标题/作者" },
      { key: "media", label: "封面媒体" },
      { key: "all", label: "全部字段" },
    ],
    body: [
      { key: "content", label: "正文内容" },
      { key: "embedded", label: "内嵌媒体" },
      { key: "extras", label: "引用/列表" },
      { key: "all", label: "全部字段" },
    ],
    more: [
      { key: "copy", label: "推荐文案" },
      { key: "cards", label: "推荐卡片" },
      { key: "all", label: "全部字段" },
    ],
    meta: [
      { key: "date", label: "发布时间" },
      { key: "tags", label: "标签/分类" },
      { key: "author", label: "来源/作者" },
      { key: "all", label: "全部字段" },
    ],
  },
  about: {
    hero: [
      { key: "headline", label: "主视觉文案" },
      { key: "media", label: "背景媒体" },
      { key: "cta", label: "按钮/CTA" },
      { key: "all", label: "全部字段" },
    ],
    company: [
      { key: "copy", label: "公司简介文案" },
      { key: "stats", label: "数据点/里程碑" },
      { key: "media", label: "图片/图库" },
      { key: "all", label: "全部字段" },
    ],
    factory: [
      { key: "copy", label: "制造能力文案" },
      { key: "items", label: "能力列表" },
      { key: "media", label: "图片/视频" },
      { key: "all", label: "全部字段" },
    ],
    team: [
      { key: "copy", label: "团队文案" },
      { key: "members", label: "成员卡片" },
      { key: "all", label: "全部字段" },
    ],
    honors: [
      { key: "copy", label: "荣誉文案" },
      { key: "cards", label: "证书/奖项卡片" },
      { key: "all", label: "全部字段" },
    ],
    why: [
      { key: "copy", label: "优势文案" },
      { key: "items", label: "优势列表" },
      { key: "all", label: "全部字段" },
    ],
  },
  contact: {
    hero: [
      { key: "headline", label: "标题文案" },
      { key: "desc", label: "说明文案" },
      { key: "cta", label: "按钮/CTA" },
      { key: "all", label: "全部字段" },
    ],
    channels: [
      { key: "copy", label: "板块文案" },
      { key: "items", label: "渠道项" },
      { key: "all", label: "全部字段" },
    ],
    form: [
      { key: "copy", label: "板块文案" },
      { key: "fields", label: "表单字段" },
      { key: "all", label: "全部字段" },
    ],
    guarantee: [
      { key: "copy", label: "板块文案" },
      { key: "items", label: "保障项" },
      { key: "all", label: "全部字段" },
    ],
  },
};

function createDraft(initialConfig: Record<string, unknown>): DraftVisibilityConfig {
  const normalized = normalizeVisibilityConfig(initialConfig);
  return {
    pages: { ...normalized.pages },
    _meta: normalized._meta,
  } satisfies DraftVisibilityConfig;
}

function serializeDraft(config: DraftVisibilityConfig): string {
  return JSON.stringify({
    pages: config.pages,
  });
}

function isDraftDirty(initialDraft: DraftVisibilityConfig, draft: DraftVisibilityConfig): boolean {
  const initialSnapshot = JSON.stringify(initialDraft.pages);
  const currentSnapshot = JSON.stringify(draft.pages);
  return initialSnapshot !== currentSnapshot;
}

function getPageHidden(draft: DraftVisibilityConfig, pageKey: VisibilityPageKey): boolean {
  return Boolean(draft.pages?.[pageKey]?.hidden);
}

function togglePageHidden(draft: DraftVisibilityConfig, pageKey: VisibilityPageKey): DraftVisibilityConfig {
  const current = draft.pages?.[pageKey] ?? { hidden: false, sections: {}, fields: {} } as any;
  return {
    ...draft,
    pages: {
      ...draft.pages,
      [pageKey]: {
        hidden: !current.hidden,
        sections: { ...(current.sections ?? {}) },
        fields: { ...(current.fields ?? {}) },
      },
    },
  } satisfies DraftVisibilityConfig;
}

function toggleSectionHidden(
  draft: DraftVisibilityConfig,
  pageKey: VisibilityPageKey,
  sectionKey: string,
): DraftVisibilityConfig {
  const page = draft.pages?.[pageKey] ?? { hidden: false, sections: {} };
  const sections = { ...(page.sections ?? {}) };
  sections[sectionKey] = !sections[sectionKey];
  return {
    ...draft,
    pages: {
      ...draft.pages,
      [pageKey]: {
        hidden: page.hidden,
        sections,
      },
    },
  } satisfies DraftVisibilityConfig;
}

function toggleFieldHidden(
  draft: DraftVisibilityConfig,
  pageKey: VisibilityPageKey,
  fieldPath: string,
): DraftVisibilityConfig {
  const page = draft.pages?.[pageKey] ?? { hidden: false, sections: {}, fields: {} } as any;
  const fields: Record<string, boolean> = { ...(page.fields ?? {}) };
  fields[fieldPath] = !fields[fieldPath];
  return {
    ...draft,
    pages: {
      ...draft.pages,
      [pageKey]: {
        hidden: page.hidden,
        sections: { ...(page.sections ?? {}) },
        fields,
      },
    },
  } satisfies DraftVisibilityConfig;
}

function setFieldsVisibility(
  draft: DraftVisibilityConfig,
  pageKey: VisibilityPageKey,
  paths: string[],
  hidden: boolean,
): DraftVisibilityConfig {
  const page = draft.pages?.[pageKey] ?? { hidden: false, sections: {}, fields: {} } as any;
  const fields: Record<string, boolean> = { ...(page.fields ?? {}) };
  for (const p of paths) {
    fields[p] = hidden;
  }
  return {
    ...draft,
    pages: {
      ...draft.pages,
      [pageKey]: {
        hidden: page.hidden,
        sections: { ...(page.sections ?? {}) },
        fields,
      },
    },
  } satisfies DraftVisibilityConfig;
}

function setSectionsVisibility(
  draft: DraftVisibilityConfig,
  pageKey: VisibilityPageKey,
  sectionKeys: string[],
  hidden: boolean,
): DraftVisibilityConfig {
  const page = draft.pages?.[pageKey] ?? { hidden: false, sections: {} } as any;
  const sections: Record<string, boolean> = { ...(page.sections ?? {}) };
  for (const key of sectionKeys) {
    sections[key] = hidden;
  }
  return {
    ...draft,
    pages: {
      ...draft.pages,
      [pageKey]: {
        hidden: page.hidden,
        sections,
      },
    },
  } satisfies DraftVisibilityConfig;
}

export function VisibilityConfigEditorClient({ configKey, initialConfig, isSuperAdmin, fieldsByPage }: VisibilityConfigEditorClientProps) {
  const initialDraft = useMemo(() => createDraft(initialConfig), [initialConfig]);
  const [draft, setDraft] = useState<DraftVisibilityConfig>(initialDraft);
  const [formState, formAction] = useFormState<UpdateSiteConfigActionState, FormData>(updateSiteConfigAction, {
    status: "idle",
  });
  const toast = useToast();

  const isDirty = useMemo(() => isDraftDirty(initialDraft, draft), [initialDraft, draft]);
  const payload = useMemo(() => serializeDraft(draft), [draft]);

  const handleReset = () => {
    setDraft(initialDraft);
  };

  const handleTogglePage = (pageKey: VisibilityPageKey) => {
    setDraft((prev) => togglePageHidden(prev, pageKey));
  };

  const handleToggleSection = (pageKey: VisibilityPageKey, sectionKey: string) => {
    setDraft((prev) => toggleSectionHidden(prev, pageKey, sectionKey));
  };

  const handleToggleField = (pageKey: VisibilityPageKey, fieldPath: string) => {
    setDraft((prev) => toggleFieldHidden(prev, pageKey, fieldPath));
  };

  const toggleExpandPage = (pageKey: VisibilityPageKey) => {
    setExpandedPages((prev) => ({ ...prev, [pageKey]: !prev[pageKey] }));
  };

  const toggleExpandSection = (pageKey: VisibilityPageKey, sectionKey: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [pageKey]: {
        ...(prev[pageKey] ?? {}),
        [sectionKey]: !((prev[pageKey] ?? {})[sectionKey]),
      },
    }));
  };

  const disabled = !isSuperAdmin;
  const [openStatus, setOpenStatus] = useState<{ id: string; kind: "page" | "section" | "field" } | null>(null);
  // 移除配置弹窗状态（暂不涉及字段）
const [dialog, setDialog] = useState<{ pageKey: VisibilityPageKey; sectionKey: string; category: CategoryKey; subBlockKey?: string; subBlockLabel?: string } | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const toggleRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (!openStatus) return;
    const onDocClick = (e: MouseEvent) => {
      const menuEl = menuRef.current;
      const toggleEl = toggleRef.current;
      const target = e.target as Node;
      if (menuEl && menuEl.contains(target)) return;
      if (toggleEl && toggleEl.contains(target)) return;
      setOpenStatus(null);
    };
    const onKeydown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenStatus(null);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKeydown);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKeydown);
    };
  }, [openStatus]);

  useEffect(() => {
    if (formState.status === "success") {
      toast.success("保存成功");
    }
  }, [formState.status, toast]);

  // 仅树形视图模式所需的状态
  const [treeOnlyHidden, setTreeOnlyHidden] = useState<boolean>(false);
  const [expandedPages, setExpandedPages] = useState<Partial<Record<VisibilityPageKey, boolean>>>({});
  const [expandedSections, setExpandedSections] = useState<Partial<Record<VisibilityPageKey, Record<string, boolean>>>>({});

  type Row = {
    pageKey: VisibilityPageKey;
    pageLabel: string;
    route: string;
    sectionKey?: string;
    sectionLabel?: string;
    path: string;
    type: string;
    example?: unknown;
    pageHidden: boolean;
    sectionHidden?: boolean;
    fieldHidden: boolean;
    canToggleSection: boolean;
  };

  const allRows = useMemo(() => {
    const rows: Row[] = [];
    for (const page of VISIBILITY_PAGES) {
      const configKeyForPage = VISIBILITY_PAGE_TO_CONFIG_KEY[page.key];
      const fields = (fieldsByPage && configKeyForPage ? fieldsByPage[configKeyForPage] ?? [] : []) as {
        path: string; type: string; section?: string; example?: unknown;
      }[];
      const pageHidden = getPageHidden(draft, page.key);
      const sectionsHidden = getHiddenSections(draft, page.key);
      const hiddenFields = getHiddenFields(draft, page.key);
      for (const f of fields) {
        const sectionKey = f.section;
        const sectionLabel = sectionKey ? (page.sections?.find((s) => s.key === sectionKey)?.label ?? sectionKey) : undefined;
        const canToggleSection = sectionKey ? Object.prototype.hasOwnProperty.call(sectionsHidden, sectionKey) : false;
        rows.push({
          pageKey: page.key,
          pageLabel: page.label,
          route: page.route ?? page.routePrefix ?? "自定义",
          sectionKey,
          sectionLabel,
          path: f.path,
          type: String(f.type),
          example: f.example,
          pageHidden,
          sectionHidden: sectionKey ? sectionsHidden[sectionKey] === true : undefined,
          fieldHidden: hiddenFields[f.path] === true,
          canToggleSection,
        });
      }
    }
    return rows;
  }, [draft, fieldsByPage]);

  const [q, setQ] = useState("");
  const [pageFilter, setPageFilter] = useState<"all" | VisibilityPageKey>("all");
  const [onlyHidden, setOnlyHidden] = useState(false);

  const filteredRows = useMemo(() => {
    let rows = allRows;
    if (pageFilter !== "all") rows = rows.filter((r) => r.pageKey === pageFilter);
    if (q.trim()) {
      const s = q.trim().toLowerCase();
      rows = rows.filter(
        (r) =>
          r.path.toLowerCase().includes(s) ||
          (r.sectionLabel ?? "").toLowerCase().includes(s) ||
          r.pageLabel.toLowerCase().includes(s),
      );
    }
    if (onlyHidden) {
      rows = rows.filter((r) => r.fieldHidden || r.pageHidden || r.sectionHidden === true);
    }
    return rows;
  }, [allRows, pageFilter, q, onlyHidden]);

  const [pageSize, setPageSize] = useState<number>(20);
  const [currentPage, setCurrentPage] = useState<number>(1);
  useEffect(() => { setCurrentPage(1); }, [q, pageFilter, onlyHidden, pageSize]);
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const pageRows = filteredRows.slice(startIndex, startIndex + pageSize);

  return (
    <form action={formAction} className="space-y-8">
      <input type="hidden" name="key" value={configKey} readOnly />
      <input type="hidden" name="payload" value={payload} readOnly />

      <div className="space-y-6">
        <header className="space-y-2">
          <h2 className="text-2xl font-semibold text-[var(--color-brand-secondary)]">页面可见性（树形视图）</h2>
          <p className="text-sm text-[var(--color-text-secondary)]">
            配置页面及板块的显示/隐藏状态。
          </p>
          {!isSuperAdmin ? (
            <p className="rounded-xl border border-dashed border-[var(--color-border)] bg-white/70 px-4 py-3 text-xs text-[var(--color-text-tertiary,#8690a3)]">
              当前账号无权限修改，请使用 superadmin。仍可查看当前配置。
            </p>
          ) : null}
        </header>

        <div className="flex flex-wrap items-center gap-2">
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <label className="inline-flex items-center gap-1 text-xs text-[var(--color-text-secondary)]">
              <input
                type="checkbox"
                checked={treeOnlyHidden}
                onChange={(e) => setTreeOnlyHidden(e.target.checked)}
              />
              仅显示有隐藏项的页面
            </label>
          </div>
        </div>

        {/* 树形视图渲染 */}
        <div className="rounded-2xl border border-[var(--color-border)] bg-white/85 p-4 shadow-sm">
          <ul className="space-y-3">
            {VISIBILITY_PAGES.map((page) => {
              const pageHidden = getPageHidden(draft, page.key);
              const definitionSections = page.sections ?? [];
              const hiddenSections = getHiddenSections(draft, page.key);
              const totalSections = definitionSections.length;
              const hiddenSectionCount = definitionSections.filter((s) => hiddenSections[s.key] === true).length;
              const hasHidden = pageHidden || hiddenSectionCount > 0;
              if (treeOnlyHidden && !hasHidden) return null;
              return (
                <li key={page.key} className="rounded-xl border border-[var(--color-border)] bg-white p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-[var(--color-brand-secondary)]">{page.label}</span>
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${hiddenSectionCount > 0 ? "border-rose-200 bg-rose-50 text-rose-600" : "border-emerald-200 bg-emerald-50 text-emerald-600"}`}>板块：{hiddenSectionCount}/{totalSections}</span>
                      </div>
                      <div className="text-xs text-[var(--color-text-tertiary,#8690a3)]">{page.route ?? page.routePrefix ?? "自定义"}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleTogglePage(page.key)}
                      disabled={disabled}
                      className={`rounded-full border px-3 py-1 text-xs ${pageHidden ? "border-rose-200 bg-rose-50 text-rose-600" : "border-emerald-200 bg-emerald-50 text-emerald-600"} ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
                    >
                      {pageHidden ? "隐藏" : "显示"}
                    </button>
                  </div>
                
                  <div className="mt-3 space-y-2">
                    {definitionSections.length ? (
                      definitionSections.map((section) => {
                        const sectionHidden = hiddenSections[section.key] === true;
                        const subBlocks = SECTION_SUBBLOCKS[page.key]?.[section.key] ?? [{ key: "all", label: "全部字段" }];
                        return (
                          <div key={section.key} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-[var(--color-brand-secondary)]">{section.label}</span>
                              <button
                                type="button"
                                onClick={() => handleToggleSection(page.key, section.key)}
                                disabled={disabled}
                                className={`ml-auto rounded-full border px-2 py-0.5 text-[11px] ${sectionHidden ? "border-rose-200 bg-white text-rose-600" : "border-emerald-200 bg-white text-emerald-600"} ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
                              >
                                {sectionHidden ? "隐藏" : "显示"}
                              </button>
                            </div>

                            {/* 小版块列表（点击打开字段配置弹窗，可批量显示/隐藏） */}
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              {subBlocks.map((sb) => (
                                <button
                                  key={`${section.key}-${sb.key}`}
                                  type="button"
                                  title="点击配置显示/隐藏"
                                  disabled={disabled}
                                  onClick={() => setDialog({ pageKey: page.key, sectionKey: section.key, category: mapSubBlockKeyToCategoryKey(sb.key), subBlockKey: sb.key, subBlockLabel: sb.label })}
                                  className={`inline-flex items-center rounded-md border border-[var(--color-border)] bg-white px-2 py-1 text-[11px] text-[var(--color-brand-secondary)] hover:border-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary)] ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
                                >
                                  {sb.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-xs text-[var(--color-text-tertiary,#8690a3)]">该页面暂无可配置板块</div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {/* 去除字段配置弹窗 */}
        {/* 原弹窗逻辑已临时移除，后续接入字段配置时再恢复 */}

        {dialog ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
            <div className="w-[860px] max-w-[92vw] rounded-xl border border-[var(--color-border)] bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-[var(--color-border)] p-3">
                <div className="space-y-0.5">
                  <h3 className="text-sm font-semibold text-[var(--color-brand-secondary)]">
                    配置 {VISIBILITY_PAGES.find((p) => p.key === dialog?.pageKey)?.label} / {VISIBILITY_PAGES.find((p) => p.key === dialog?.pageKey)?.sections?.find((s) => s.key === dialog?.sectionKey)?.label || dialog?.sectionKey} / {dialog?.subBlockLabel ?? (dialog ? CATEGORY_LABELS[dialog.category] : "")}
                  </h3>
                  <p className="text-xs text-[var(--color-text-tertiary,#8690a3)]">勾选隐藏/显示具体字段；可批量操作。</p>
                </div>
                <button
                  type="button"
                  onClick={() => setDialog(null)}
                  className="rounded-md border border-[var(--color-border)] bg-white px-2 py-1 text-xs"
                >
                  关闭
                </button>
              </div>

              {dialog ? (
                <DialogCategoryBody
                  dialog={dialog!}
                  fieldsByPage={fieldsByPage}
                  draft={draft}
                  setDraft={setDraft}
                  disabled={disabled}
                />
              ) : null}
            </div>
          </div>
        ) : null}

        <footer className="flex items-center justify-between gap-3">
          <div className="text-xs text-[var(--color-text-tertiary,#8690a3)]">
            {isDirty ? "存在未保存的更改" : "配置未发生变化"}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="rounded-lg border border-[var(--color-border)] bg-white px-4 py-2 text-xs text-[var(--color-brand-secondary)] hover:border-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary)]"
            >
              重置
            </button>
            <button
              type="submit"
              disabled={!isDirty || disabled}
              className={`rounded-lg border px-4 py-2 text-xs ${!isDirty || disabled ? "cursor-not-allowed opacity-60" : "border-[var(--color-brand-primary)] bg-[var(--color-brand-primary)] text-white"}`}
            >
              保存更改
            </button>
          </div>
        </footer>
      </div>
    </form>
  );
}

function getHiddenSections(config: DraftVisibilityConfig, pageKey: VisibilityPageKey): Record<string, boolean> {
  const sections = (config.pages?.[pageKey]?.sections ?? {}) as Record<string, boolean>;
  const result: Record<string, boolean> = {};
  for (const [key, value] of Object.entries(sections)) {
    result[key] = value === true;
  }
  return result;
}

function getHiddenFields(config: DraftVisibilityConfig, pageKey: VisibilityPageKey): Record<string, boolean> {
  const fields = config.pages?.[pageKey]?.fields;
  if (!fields) return {};
  const result: Record<string, boolean> = {};
  for (const [key, value] of Object.entries(fields)) {
    result[key] = value === true;
  }
  return result;
}

interface DialogCategoryBodyProps {
  dialog: { pageKey: VisibilityPageKey; sectionKey: string; category: CategoryKey; subBlockKey?: string; subBlockLabel?: string };
  fieldsByPage: VisibilityConfigEditorClientProps["fieldsByPage"];
  draft: DraftVisibilityConfig;
  setDraft: (updater: (prev: DraftVisibilityConfig) => DraftVisibilityConfig) => void;
  disabled: boolean;
}

function DialogCategoryBody({ dialog, fieldsByPage, draft, setDraft, disabled }: DialogCategoryBodyProps) {
  const configKeyForPage = VISIBILITY_PAGE_TO_CONFIG_KEY[dialog.pageKey];
  const fields = (fieldsByPage && configKeyForPage ? fieldsByPage[configKeyForPage] ?? [] : []) as {
    path: string; type: string; section?: string; example?: unknown;
  }[];
  const categoryFields = fields.filter(
    (f) =>
      String(f.section) === dialog.sectionKey &&
      (dialog.category === "all" || classifyCategory(String(f.path), String(f.type)) === dialog.category) &&
      (!dialog.subBlockKey || pathMatchesSubBlock(dialog.subBlockKey, String(f.path))),
  );

  const hiddenMap = getHiddenFields(draft, dialog.pageKey);
  const hiddenCount = categoryFields.filter((f) => hiddenMap[String(f.path)] === true).length;
  const paths = categoryFields.map((f) => String(f.path));


function pathMatchesSubBlock(subKey: string, path: string): boolean {
  const k = String(subKey).toLowerCase();
  const p = String(path).toLowerCase();
  if (!k || k === "all") return true;
  if (k.includes("cta") || k.includes("button") || k.includes("actions") || k.includes("action") || k.includes("link")) {
    return p.includes("cta") || p.includes("button") || p.includes("link") || p.includes("action") || p.includes("href");
  }
  if (k.includes("slides") || k.includes("gallery") || k.includes("images") || k.includes("videos")) {
    return p.includes("slides") || p.includes("gallery") || p.includes("image") || p.includes("video");
  }
  if (k.includes("items") || k.includes("cards")) {
    return p.includes("items") || p.includes("cards") || p.includes("list");
  }
  if (k.includes("filters")) {
    return p.includes("filter") || p.includes("tags") || p.includes("category");
  }
  if (k.includes("pagination")) {
    return p.includes("pagination") || p.includes("page") || p.includes("load");
  }
  if (k.includes("members")) {
    return p.includes("member") || p.includes("team") || p.includes("lead");
  }
  if (k.includes("fields") || k.includes("form")) {
    return p.includes("field") || p.includes("form") || p.includes("input");
  }
  if (k.includes("group") || k.includes("headline") || k.includes("title")) {
    return p.includes("group") || p.includes("headline") || p.includes("title");
  }
  if (k.includes("nav") || k.includes("anchors")) {
    return p.includes("nav") || p.includes("anchor");
  }
  if (k.includes("tags")) {
    return p.includes("tags") || p.includes("category");
  }
  if (k.includes("stats") || k.includes("milestones")) {
    return p.includes("stats") || p.includes("milestones") || p.includes("numbers");
  }
  if (k.includes("modulecopy")) {
    return p.includes("module") && (p.includes("copy") || p.includes("text") || p.includes("title"));
  }
  if (k.includes("modulecards")) {
    return p.includes("module") && (p.includes("cards") || p.includes("items"));
  }
  return p.includes(k);
}

  return (
    <div className="p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs text-[var(--color-text-tertiary,#8690a3)]">隐藏：{hiddenCount}/{categoryFields.length}</div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={disabled || paths.length === 0}
            onClick={() => setDraft((prev) => setFieldsVisibility(prev, dialog.pageKey, paths, true))}
            className={`rounded-md border px-3 py-1 text-[11px] ${disabled || paths.length === 0 ? "cursor-not-allowed opacity-60" : "border-rose-200 bg-rose-50 text-rose-600"}`}
          >
            全部隐藏
          </button>
          <button
            type="button"
            disabled={disabled || paths.length === 0}
            onClick={() => setDraft((prev) => setFieldsVisibility(prev, dialog.pageKey, paths, false))}
            className={`rounded-md border px-3 py-1 text-[11px] ${disabled || paths.length === 0 ? "cursor-not-allowed opacity-60" : "border-emerald-200 bg-emerald-50 text-emerald-600"}`}
          >
            全部显示
          </button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2">
        {categoryFields.map((f) => {
          const p = String(f.path);
          const hidden = hiddenMap[p] === true;
          return (
            <div key={p} className="flex items-center justify-between rounded-md border border-[var(--color-border)] bg-white px-2 py-1">
              <div className="flex flex-col">
                <span className="text-[11px] text-[var(--color-brand-secondary)]">{p}</span>
                <span className="text-[10px] text-[var(--color-text-tertiary,#8690a3)]">{String(f.type)}</span>
              </div>
              <button
                type="button"
                disabled={disabled}
                onClick={() => setDraft((prev) => toggleFieldHidden(prev, dialog.pageKey, p))}
                className={`rounded-full border px-2 py-0.5 text-[11px] ${hidden ? "border-rose-200 bg-white text-rose-600" : "border-emerald-200 bg-white text-emerald-600"} ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
              >
                {hidden ? "隐藏" : "显示"}
              </button>
            </div>
          );
        })}
        {categoryFields.length === 0 ? (
          <div className="rounded-md border border-[var(--color-border)] bg-white px-2 py-1 text-[11px] text-[var(--color-text-tertiary,#8690a3)]">该类别暂无可配置字段</div>
        ) : null}
      </div>
    </div>
  );
}
