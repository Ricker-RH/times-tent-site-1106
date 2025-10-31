const SEGMENT_LABELS: Record<string, string> = {
  hero: "英雄区",
  sections: "板块",
  cards: "卡片",
  title: "标题",
  description: "描述",
  eyebrow: "副标题",
  image: "图片",
  links: "链接",
  groups: "分组",
  categories: "分类",
  products: "产品",
  items: "内容项",
  metrics: "指标",
  studies: "案例",
  gallery: "图片库",
  breadcrumb: "面包屑",
  sidebar: "侧边栏",
  heroButtons: "按钮",
  footer: "页脚",
  content: "内容",
  sectionsMeta: "板块信息",
  navigationGroups: "导航分组",
  main: "主分组",
  utility: "快捷分组",
  label: "标签",
  value: "数值",
  slug: "标识",
  name: "名称",
  intro: "简介",
  summary: "摘要",
  background: "背景信息",
  highlights: "亮点",
  deliverables: "交付内容",
  metricsLabel: "指标名称",
  metricsValue: "指标数值",
  updatedAt: "最近更新",
  adminPath: "管理路径",
  schema: "数据结构",
};

function decodePointerSegment(segment: string): string {
  return segment.replace(/~1/g, "/").replace(/~0/g, "~");
}

function formatArrayIndex(segment: string): string | null {
  if (!/^\d+$/.test(segment)) {
    return null;
  }
  const index = Number(segment);
  if (Number.isNaN(index)) {
    return null;
  }
  return `第 ${index + 1} 项`;
}

export function buildReadablePath(configKey: string, pointer: string): string {
  if (!pointer || pointer === "/") {
    return `${configKey} 整体`;
  }

  const segments = pointer.split("/").slice(1).map((segment) => decodePointerSegment(segment));
  if (!segments.length) {
    return `${configKey} 整体`;
  }

  const readableSegments = segments.map((segment) => {
    const arrayLabel = formatArrayIndex(segment);
    if (arrayLabel) {
      return arrayLabel;
    }
    return SEGMENT_LABELS[segment] ?? segment;
  });

  return [configKey, ...readableSegments].join(" › ");
}

export function describeDiff(
  configKey: string,
  op: "add" | "remove" | "replace",
  path: string,
  beforeValue: unknown,
  afterValue: unknown,
): string {
  const location = buildReadablePath(configKey, path);
  const formatValue = (value: unknown): string => {
    if (value === undefined) return "未设置";
    if (typeof value === "string") {
      return value.length > 120 ? `${value.slice(0, 117)}…` : value || "空字符串";
    }
    if (value === null) return "空";
    return JSON.stringify(value, null, 0);
  };

  if (op === "add") {
    return `在「${location}」新增内容：${formatValue(afterValue)}`;
  }
  if (op === "remove") {
    return `在「${location}」删除内容，原值为：${formatValue(beforeValue)}`;
  }
  return `在「${location}」从「${formatValue(beforeValue)}」修改为「${formatValue(afterValue)}」`;
}
