export type VisibilityPageKey =
  | "home"
  | "about"
  | "casesIndex"
  | "casesCategory"
  | "casesDetail"
  | "contact"
  | "downloads"
  | "faq"
  | "inventory"
  | "library"
  | "newsIndex"
  | "newsDetail"
  | "partners"
  | "privacy"
  | "productsIndex"
  | "productDetail"
  | "terms"
  | "videos"
  | "careers";

export interface VisibilitySectionDefinition {
  key: string;
  label: string;
  description?: string;
}

export interface VisibilityPageDefinition {
  key: VisibilityPageKey;
  label: string;
  route?: string;
  routePrefix?: string;
  segmentDepth?: number;
  sections?: VisibilitySectionDefinition[];
  description?: string;
}

export const VISIBILITY_CONFIG_KEY = "页面可见性";
export const VISIBILITY_SCHEMA_ID = "visibility.v1";

export const VISIBILITY_PAGES: VisibilityPageDefinition[] = [
  {
    key: "home",
    label: "首页",
    route: "/",
    sections: [
      { key: "hero", label: "首页 – 英雄区" },
      { key: "applications", label: "首页 – 应用场景" },
      { key: "product", label: "首页 – 产品矩阵" },
      { key: "company", label: "首页 – 公司概览" },
      { key: "inventory", label: "首页 – 现货库存" },
      { key: "contactCta", label: "首页 – 联系 CTA" },
    ],
  },
  {
    key: "productsIndex",
    label: "产品中心",
    route: "/products",
    segmentDepth: 1,
    sections: [
      { key: "hero", label: "产品中心 – 英雄区" },
      { key: "sidebar", label: "产品中心 – 侧边导航" },
      { key: "productList", label: "产品中心 – 产品列表" },
    ],
  },
  {
    key: "productDetail",
    label: "产品详情页",
    routePrefix: "/products/",
    segmentDepth: 2,
    sections: [
      { key: "hero", label: "产品详情 – 顶部英雄区" },
      { key: "overview", label: "产品详情 – 概览介绍" },
      { key: "highlights", label: "产品详情 – 亮点板块" },
      { key: "gallery", label: "产品详情 – 图库" },
      { key: "extraSections", label: "产品详情 – 其他内容" },
      { key: "advisor", label: "产品详情 – 顾问 CTA" },
    ],
  },
  {
    key: "casesIndex",
    label: "案例列表",
    route: "/cases",
    segmentDepth: 1,
    sections: [
      { key: "hero", label: "案例列表 – 英雄区" },
      { key: "categories", label: "案例列表 – 分类卡片" },
      { key: "cta", label: "案例列表 – 底部引导" },
    ],
  },
  {
    key: "casesCategory",
    label: "案例分类页",
    routePrefix: "/cases/",
    segmentDepth: 2,
    sections: [
      { key: "sidebar", label: "案例分类 – 侧边导航" },
      { key: "header", label: "案例分类 – 顶部信息" },
      { key: "caseGrid", label: "案例分类 – 案例列表" },
      { key: "cta", label: "案例分类 – 顾问 CTA" },
    ],
  },
  {
    key: "casesDetail",
    label: "案例详情页",
    routePrefix: "/cases/",
    segmentDepth: 3,
    sections: [
      { key: "sidebar", label: "案例详情 – 侧边导航" },
      { key: "hero", label: "案例详情 – 顶部英雄区" },
      { key: "background", label: "案例详情 – 项目背景" },
      { key: "highlights", label: "案例详情 – 解决方案亮点" },
      { key: "deliverables", label: "案例详情 – 交付成果" },
      { key: "gallery", label: "案例详情 – 图库" },
      { key: "related", label: "案例详情 – 相关推荐" },
      { key: "advisor", label: "案例详情 – 顾问 CTA" },
    ],
  },
  {
    key: "inventory",
    label: "现货库存",
    route: "/inventory",
    sections: [
      { key: "hero", label: "现货库存 – 英雄区" },
      { key: "sections", label: "现货库存 – 展示板块" },
    ],
  },
  {
    key: "videos",
    label: "视频库",
    route: "/videos",
    sections: [
      { key: "hero", label: "视频库 – 英雄区" },
      { key: "library", label: "视频库 – 视频列表" },
    ],
  },
  {
    key: "newsIndex",
    label: "新闻中心",
    route: "/news",
    sections: [
      { key: "hero", label: "新闻中心 – 英雄区" },
      { key: "timeline", label: "新闻中心 – 动态列表" },
    ],
  },
  {
    key: "newsDetail",
    label: "新闻详情页",
    routePrefix: "/news/",
    segmentDepth: 2,
    sections: [
      { key: "hero", label: "新闻详情 – 顶部英雄区" },
      { key: "body", label: "新闻详情 – 正文内容" },
      { key: "more", label: "新闻详情 – 更多推荐" },
      { key: "meta", label: "新闻详情 – 发布信息" },
    ],
  },
  {
    key: "about",
    label: "关于我们",
    route: "/about",
    sections: [
      { key: "hero", label: "关于我们 – 英雄区" },
      { key: "company", label: "关于我们 – 公司简介" },
      { key: "factory", label: "关于我们 – 制造能力" },
      { key: "team", label: "关于我们 – 团队介绍" },
      { key: "honors", label: "关于我们 – 荣誉资质" },
      { key: "why", label: "关于我们 – 为什么选择我们" },
    ],
  },
  {
    key: "contact",
    label: "联系方式",
    route: "/contact",
    sections: [
      { key: "hero", label: "联系方式 – 英雄区" },
      { key: "channels", label: "联系方式 – 联系渠道" },
      { key: "form", label: "联系方式 – 留资表单" },
      { key: "guarantee", label: "联系方式 – 服务保障" },
    ],
  },
  {
    key: "library",
    label: "资料库",
    route: "/library",
  },
  {
    key: "downloads",
    label: "下载中心",
    route: "/downloads",
  },
  {
    key: "faq",
    label: "常见问题",
    route: "/faq",
  },
  {
    key: "partners",
    label: "合作伙伴",
    route: "/partners",
  },
  {
    key: "careers",
    label: "招聘信息",
    route: "/careers",
  },
  {
    key: "privacy",
    label: "隐私政策",
    route: "/privacy",
  },
  {
    key: "terms",
    label: "用户条款",
    route: "/terms",
  },
];

export const VISIBILITY_PAGE_KEY_SET = new Set<VisibilityPageKey>(VISIBILITY_PAGES.map((page) => page.key));
