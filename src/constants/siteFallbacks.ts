import { products_cards } from "@/data/configs";
import { VISIBILITY_CONFIG_KEY, VISIBILITY_SCHEMA_ID } from "@/constants/visibility";
import { createDefaultVisibilityConfig } from "@/lib/visibilityConfig";
import type {
  HomeConfig,
  ProductCenterConfig,
  PrivacyPolicyConfig,
  TermsConfig,
  RightRailConfig,
} from "@/server/pageConfigs";

export const FALLBACK_HOME_CONFIG: HomeConfig = {
  hero: {
    badge: {
      "zh-CN": "模块化临建 · 极速交付",
      "zh-TW": "模組化臨建 · 極速交付",
      "en": "Modular Pavilions · Rapid Delivery",
    },
    title: {
      "zh-CN": "时代篷房",
      "zh-TW": "時代篷房",
      "en": "TIMES TENT",
    },
    description: {
      "zh-CN": "撑起每个重要时刻 — 专业铝合金篷房设计 · 制造 · 方案交付。",
      "zh-TW": "撐起每個重要時刻 — 專業鋁合金篷房設計・製造・方案交付。",
      "en": "Powering every headline moment with engineered aluminium structures and end-to-end delivery.",
    },
    overlayEnabled: true,
    ctaPrimary: {
      "zh-CN": "查看详情",
      "zh-TW": "查看詳情",
      "en": "View Details",
    },
    ctaSecondary: {
      "zh-CN": "更多案例",
      "zh-TW": "更多案例",
      "en": "More Case Studies",
    },
    slides: [
      { caseRef: { slug: "hangzhou-asian-games-2023", category: "sports-events" } },
      { caseRef: { slug: "guangzhou-high-school-arena", category: "sports-venues" } },
      { caseRef: { slug: "dali-lake-camp", category: "hospitality" } },
      { caseRef: { slug: "hefai-master-kong", category: "industrial" } },
      { caseRef: { slug: "zhuhai-airshow", category: "brand-events" } },
    ],
  },
  companyOverview: {
    title: {
      "zh-CN": "关于时代",
      "zh-TW": "關於時代",
      en: "About Times Tent",
    },
    capabilityHeading: {
      "zh-CN": "核心能力与资质",
      "zh-TW": "核心能力與資質",
      en: "Core Capabilities & Certifications",
    },
    hero: {
      title: {
        "zh-CN": "45,000㎡ 智能制造园区，支撑 600+ 模块化交付",
        "zh-TW": "45,000㎡ 智慧製造園區，支撐 600+ 模組化交付",
        en: "45,000 sqm intelligent manufacturing campus enabling 600+ modular deliveries",
      },
      secondary: {
        "zh-CN": "设计 · 制造 · 交付一体化",
        "zh-TW": "設計・製造・交付一體化",
        en: "Integrated design · manufacturing · delivery",
      },
      description: {
        "zh-CN":
          "生产线覆盖铝型材挤压、膜材焊接、结构测试等关键工序，ISO9001 质量体系全流程管控；设计、结构工程、供应链与现场交付联动为一体，用敏捷节奏完成具备建筑品质的临建空间。",
        "zh-TW":
          "生產線覆蓋鋁型材擠壓、膜材焊接、結構測試等關鍵工序，ISO9001 品質體系全流程管控；設計、結構工程、供應鏈與現場交付聯動為一體，用敏捷節奏完成具備建築品質的臨建空間。",
        en:
          "Production lines cover critical processes such as aluminum extrusions, membrane welding, and structural testing, under ISO9001 quality management; design, structural engineering, supply chain, and on-site delivery work together to deliver agile temporary spaces with architectural quality.",
      },
      image: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&w=1600&q=80",
    },
    stats: [
      {
        label: {
          "zh-CN": "自有工厂",
          "zh-TW": "自有工廠",
          en: "In-house manufacturing base",
        },
        value: "45,000㎡",
      },
      {
        label: {
          "zh-CN": "行业经验",
          "zh-TW": "產業經驗",
          en: "Industry experience",
        },
        value: "15+ years",
      },
      {
        label: {
          "zh-CN": "项目交付",
          "zh-TW": "專案交付",
          en: "Projects delivered",
        },
        value: "600+",
      },
      {
        label: {
          "zh-CN": "客户满意度",
          "zh-TW": "客戶滿意度",
          en: "Client satisfaction",
        },
        value: "98%",
      },
    ],
    serviceHighlights: [
      {
        title: {
          "zh-CN": "方案直连交付",
          "zh-TW": "方案直連交付",
          en: "Integrated solution delivery",
        },
        description: {
          "zh-CN": "自研方案、结构算例与体验设计同步推进。",
          "zh-TW": "自研方案、結構算例與體驗設計同步推進。",
          en: "In-house concepting, structural analysis, and experience design progress in lockstep.",
        },
      },
      {
        title: {
          "zh-CN": "精度级制造",
          "zh-TW": "精度級製造",
          en: "Precision manufacturing",
        },
        description: {
          "zh-CN": "铝型材与膜材全程追溯，控制在微米级误差。",
          "zh-TW": "鋁型材與膜材全程追溯，誤差控制在微米級。",
          en: "Full traceability for aluminium and membrane fabrication keeps tolerances within microns.",
        },
      },
      {
        title: {
          "zh-CN": "48 小时落地",
          "zh-TW": "48 小時落地",
          en: "48-hour deployment",
        },
        description: {
          "zh-CN": "标准化班组与物流节奏，实现快装快拆。",
          "zh-TW": "標準化班組與物流節奏，實現快裝快拆。",
          en: "Standardised crews and logistics rhythms enable rapid install and dismantle.",
        },
      },
    ],
    capabilities: [
      {
        title: {
          "zh-CN": "ISO9001 质量体系",
          "zh-TW": "ISO9001 品质體系",
          en: "ISO9001 quality system",
        },
        subtitle: {
          "zh-CN": "质量管理",
          "zh-TW": "品質管理",
          en: "Quality management",
        },
        description: {
          "zh-CN": "覆盖原材料、加工、装配与交付的全流程质控。",
          "zh-TW": "覆蓋原材料、加工、裝配與交付的全流程質控。",
          en: "Quality control spans raw materials, machining, assembly, and delivery.",
        },
        image: "https://images.unsplash.com/photo-1580894897391-88e9afdcadd3?auto=format&w=1600&q=80",
      },
      {
        title: {
          "zh-CN": "ISO14001 环境认证",
          "zh-TW": "ISO14001 環境認證",
          en: "ISO14001 environmental certification",
        },
        subtitle: {
          "zh-CN": "环境管理",
          "zh-TW": "環境管理",
          en: "Environmental stewardship",
        },
        description: {
          "zh-CN": "绿色制造工艺与节能设备，降低生产碳足迹。",
          "zh-TW": "綠色製造工藝與節能設備，降低生產碳足跡。",
          en: "Green processes and energy-efficient equipment cut manufacturing emissions.",
        },
        image: "https://images.unsplash.com/photo-1573497491765-dccce02b29df?auto=format&w=1600&q=80",
      },
      {
        title: {
          "zh-CN": "12 级抗风结构验证",
          "zh-TW": "12 級抗風結構驗證",
          en: "Force-12 wind resistance",
        },
        subtitle: {
          "zh-CN": "极端工况",
          "zh-TW": "極端工況",
          en: "Extreme conditions",
        },
        description: {
          "zh-CN": "通过多维受力实验验证，以应对沿海及高风地区。",
          "zh-TW": "通過多維受力實驗驗證，應對沿海及高風地區。",
          en: "Multi-axis load testing verifies performance for coastal and high-wind zones.",
        },
        image: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&w=1600&q=80",
      },
      {
        title: {
          "zh-CN": "B1 级防火膜材",
          "zh-TW": "B1 級防火膜材",
          en: "B1-grade fire-retardant membranes",
        },
        subtitle: {
          "zh-CN": "消防安全",
          "zh-TW": "消防安全",
          en: "Fire safety",
        },
        description: {
          "zh-CN": "核心围护材料达 B1 级防火标准，并配合阻燃内衬。",
          "zh-TW": "核心圍護材料達 B1 級防火標準，並配合阻燃內襯。",
          en: "Primary envelope materials meet B1 fire ratings with coordinated flame-retardant liners.",
        },
        image: "https://images.unsplash.com/photo-1523419409543-0c1df022bdd9?auto=format&w=1600&q=80",
      },
      {
        title: {
          "zh-CN": "48 小时交付 SOP",
          "zh-TW": "48 小時交付 SOP",
          en: "48-hour delivery SOP",
        },
        subtitle: {
          "zh-CN": "快速部署",
          "zh-TW": "快速部署",
          en: "Rapid deployment",
        },
        description: {
          "zh-CN": "标准化排产与装配工序，支持赛事与活动的快速响应。",
          "zh-TW": "標準化排產與裝配工序，支援賽事與活動的快速響應。",
          en: "Standardised scheduling and assembly keep events and activations on tight timelines.",
        },
        image: "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&w=1600&q=80",
      },
      {
        title: {
          "zh-CN": "10+ 实用新型专利",
          "zh-TW": "10+ 實用新型專利",
          en: "10+ utility model patents",
        },
        subtitle: {
          "zh-CN": "技术创新",
          "zh-TW": "技術創新",
          en: "Innovation",
        },
        description: {
          "zh-CN": "多项模块连接与快速装配专利，优化搭建体验。",
          "zh-TW": "多項模組連結與快速裝配專利，優化搭建體驗。",
          en: "Patented connectors and rapid-assembly systems streamline on-site builds.",
        },
        image: "https://images.unsplash.com/photo-1454165205744-3b78555e5572?auto=format&w=1600&q=80",
      },
    ],
    gallery: [
      {
        image: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&w=1600&q=80",
        label: {
          "zh-CN": "设备总览",
          "zh-TW": "設備總覽",
          en: "Facility overview",
        },
      },
      {
        image: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&w=1600&q=80",
        label: {
          "zh-CN": "铝型材生产线",
          "zh-TW": "鋁型材產線",
          en: "Aluminium extrusion line",
        },
      },
      {
        image: "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&w=1600&q=80",
        label: {
          "zh-CN": "膜材焊接车间",
          "zh-TW": "膜材焊接車間",
          en: "Membrane welding workshop",
        },
      },
    ],
  },
  productShowcase: {
    heading: {
      "zh-CN": "核心篷房产品矩阵",
      "zh-TW": "核心篷房產品矩陣",
      "en": "Core Tent Portfolio",
    },
    description: {
      "zh-CN": "精选核心产品，适配赛事、展会、文旅等多场景。",
      "zh-TW": "精選核心產品，適配賽事、展會、旅遊等多場景。",
      "en": "Curated flagship tents for events, exhibitions, and hospitality.",
    },
    cardCtaLabel: {
      "zh-CN": "查看详情",
      "zh-TW": "查看詳情",
      "en": "Explore",
    },
    selectedProductSlugs: [
      "gable-tent",
      "arch-tent",
      "curved-beam-tent",
      "cone-tent",
      "double-deck-tent",
    ],
    cards: [
      {
        productSlug: "gable-tent",
        nameOverride: "人字形篷房",
        imageOverride: "https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&w=1600&q=80",
        summaryOverride: "经典大跨度结构，适用于赛事运营、仓储及展览活动。",
      },
      {
        productSlug: "arch-tent",
        nameOverride: "弧形篷房",
        imageOverride: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&w=1600&q=80",
        summaryOverride: "流线型外观提升视觉辨识度，常用于文旅和品牌活动。",
      },
      {
        productSlug: "curved-beam-tent",
        nameOverride: "弯柱篷房",
        imageOverride: "https://images.unsplash.com/photo-1529429617124-aee0a8712b4e?auto=format&w=1600&q=80",
        summaryOverride: "高度灵活的结构形式，满足不同场地的造型需求。",
      },
      {
        productSlug: "cone-tent",
        nameOverride: "锥顶篷房",
        imageOverride: "https://images.unsplash.com/photo-1470246973918-29a93221c455?auto=format&w=1600&q=80",
        summaryOverride: "模块化组合，适配市集、展销与临时票务等应用。",
      },
      {
        productSlug: "double-deck-tent",
        nameOverride: "双层篷房",
        imageOverride: "https://images.unsplash.com/photo-1529429617124-aee0a8712b4e?auto=format&w=1600&q=80",
        summaryOverride: "纵向拓展空间，实现 VIP 接待、观赛看台等高端体验。",
      },
    ],
  },
  applicationAreas: {
    heading: {
      "zh-CN": "五大核心应用场景",
      "zh-TW": "五大核心應用場景",
      "en": "Five Core Applications",
    },
    description: {
      "zh-CN": "结合场地条件与运营需求，配置结构、围护、内装、机电系统，快速搭建可持续运营的高品质空间。",
      "zh-TW": "結合場地條件與營運需求，配置結構、圍護、內裝、機電系統，快速搭建可持續營運的高品質空間。",
      "en": "Align structures, envelopes, interiors, and MEP systems to deliver high-performance modular spaces at speed.",
    },
    actionLabel: {
      "zh-CN": "查看详情",
      "zh-TW": "查看詳情",
      "en": "View More",
    },
    overlayEnabled: true,
    selectedCategorySlugs: [
      "sports-events",
      "sports-venues",
      "hospitality",
      "industrial",
      "brand-events",
    ],
    items: [
      { areaKey: "sports-events" },
      { areaKey: "sports-venues" },
      { areaKey: "hospitality" },
      { areaKey: "industrial" },
      { areaKey: "brand-events" },
    ],
  },
  inventoryHighlight: {
    heading: {
      "zh-CN": "现货库存",
      "zh-TW": "現貨庫存",
      "en": "Ready Stock",
    },
    description: {
      "zh-CN": "多规格模块随时待命，覆盖赛事、文旅、工业核心场景，支持快速调拨与驻场技术团队护航。",
      "zh-TW": "多規格模組隨時待命，覆蓋賽事、旅遊、工業核心場景，支援快速調撥與駐場技術團隊護航。",
      "en": "Multi-format modules are staged across hubs for events, hospitality, and industrial deployments with on-site technical teams.",
    },
    heroImage: "https://images.unsplash.com/photo-1542626991-cbc4e32524cc?auto=format&w=2000&q=80",
    ctas: [
      {
        href: "/inventory#in-stock",
        label: {
          "zh-CN": "现货库存",
          "zh-TW": "現貨庫存",
          en: "Ready Stock",
        },
      },
      {
        href: "/inventory#rental",
        label: {
          "zh-CN": "租赁业务",
          "zh-TW": "租賃業務",
          en: "Rental Services",
        },
      },
    ],
  },
  contactCta: {
    eyebrow: {
      "zh-CN": "联系团队",
      "zh-TW": "聯絡團隊",
      en: "Talk to our team",
    },
    title: {
      "zh-CN": "需要快速响应的模块化空间方案？",
      "zh-TW": "需要快速響應的模組化空間方案？",
      en: "Need a rapidly deployable modular space?",
    },
    description: {
      "zh-CN":
        "顾问团队覆盖全国，提供从方案设计、预算测算到现场交付的一站式支持。留下需求，24 小时内即可获得初步回应与定制建议。",
      "zh-TW":
        "顧問團隊覆蓋全國，提供從方案設計、預算測算到現場交付的一站式支援。留下需求，24 小時內即可獲得初步回應與客製化建議。",
      en: "Consultants across China provide one-stop support from design and budgeting to on-site delivery. Share your brief and receive tailored feedback within 24 hours.",
    },
    primary: {
      href: "/contact#form",
      label: {
        "zh-CN": "预约项目沟通",
        "zh-TW": "預約專案溝通",
        en: "Book a project call",
      },
    },
    secondary: {
      href: "/contact",
      label: {
        "zh-CN": "查看联系方式",
        "zh-TW": "查看聯絡方式",
        en: "View contact info",
      },
    },
  },
};

export const FALLBACK_PRODUCT_CENTER_CONFIG: ProductCenterConfig = {
  hero: {
    image: "https://images.unsplash.com/photo-1542626991-cbc4e32524cc?auto=format&w=2000&q=80",
    title: {
      "zh-CN": "模块化产品矩阵",
      "zh-TW": "模組化產品矩陣",
      "en": "Modular Product Matrix",
    },
    description: {
      "zh-CN": "从赛事运营到文旅营地，覆盖人字形、弧形、弯柱、锥顶及双层篷房等多种结构，快速响应场景搭建与长期运营需求。",
      "zh-TW": "從賽事營運到旅遊營地，涵蓋人字形、弧形、彎柱、錐頂與雙層篷房等多種結構，快速回應搭建與長期營運需求。",
      "en": "From global events to destination resorts, the lineup spans gable, arch, curved beam, cone, and double-deck tents for rapid deployment and long-term operations.",
    },
    overlayEnabled: true,
  },

  products: products_cards.map((product) => ({
    slug: product.href.split("/").pop() ?? "",
    name: product.title,
    summary: product.description,
    tagline: product.tagline,
  })),
  breadcrumb: [
    { href: "/", label: { "zh-CN": "首页", "en": "Home", "zh-TW": "首頁" } },
    { href: "/products", label: { "zh-CN": "产品", "en": "Products", "zh-TW": "產品" } },
  ],
  sidebarTitle: "产品",
  productCardCtaLabel: "查看详情",
};

export const FALLBACK_PRIVACY_POLICY_CONFIG: PrivacyPolicyConfig = {
  title: {
    "zh-CN": "时代篷房隐私政策",
    "zh-TW": "時代篷房隱私政策",
    "en": "TIMES TENT Privacy Policy",
  },
  intro: {
    lastUpdated: "2025 年 10 月 18 日",
    body:
      "广州时代篷房有限公司（以下简称“时代篷房”或“我们”）高度重视您的隐私与个人信息保护。本政策适用于我们在提供官网展示、项目咨询、售前沟通及相关服务期间对个人信息的收集、使用、存储与共享行为。使用我们的服务即表示您已阅读并同意本政策的全部内容。",
  },
  sections: [
    {
      id: "collection",
      heading: "一、我们收集的信息",
      paragraphs: [
        "根据您与时代篷房的互动场景，我们可能收集以下类别的信息：",
      ],
      items: [
        {
          title: "您主动提供的信息",
          body: "提交项目咨询、下载资料、报名活动或与客服沟通时填写的姓名、职位、公司、联系方式、项目需求、预算及附件资料等。",
        },
        {
          title: "自动收集的信息",
          body: "包括访问日志、浏览器与设备信息、IP 地址、访问日期时间、访问来源、浏览行为及站内搜索内容，用于统计分析和安全审计。",
        },
        {
          title: "第三方来源的信息",
          body: "在您授权的情况下，我们可能从合作平台或服务商处获取与项目相关的联系人信息或业务需求。",
        },
      ],
    },
    {
      id: "usage",
      heading: "二、我们如何使用信息",
      paragraphs: [
        "我们以合法、正当、必要的原则使用您的个人信息，用途包括：",
      ],
      items: [
        { body: "响应您的项目咨询，提供方案建议、报价、技术参数及交付计划。" },
        { body: "履行合同或订单，例如方案对接、物流安排、售后支持与费用结算。" },
        { body: "改进产品与服务体验，包括市场分析、网站优化、功能升级等。" },
        { body: "保障平台与客户信息安全，防范欺诈、攻击与违规操作。" },
        { body: "在获得明示同意的情况下，向您发送展会、案例分享、产品更新等营销信息。" },
        { body: "履行法律法规要求或监管机关的合规审查。" },
      ],
    },
    {
      id: "cookies",
      heading: "三、Cookie 及同类技术",
      paragraphs: [
        "我们可能使用 Cookie、像素标签或本地存储记录您的偏好设置、统计访问流量或协助排查故障。您可通过浏览器设置禁用相关技术，但可能无法获得最佳浏览体验。",
      ],
    },
    {
      id: "sharing",
      heading: "四、我们如何共享信息",
      paragraphs: [
        "我们不会向无关第三方出售个人信息，但在以下情形下可能进行共享或披露：",
      ],
      items: [
        { body: "为完成项目交付，与经授权的供应商、物流商、安装团队或合作伙伴共享必要信息。" },
        { body: "为完成支付、财务或审计需求，与金融机构、税务机关或专业顾问共享必要信息。" },
        { body: "法律法规或监管机关的合法要求。" },
        { body: "征得您或您的授权代表明示同意的其他情形。" },
      ],
      paragraphsAfter: [
        "我们会与合作方签订数据保护协议，要求其按照本政策使用信息并落实相应的保密与安全措施。",
      ],
    },
    {
      id: "security",
      heading: "五、数据存储与安全",
      items: [
        { body: "我们将个人信息保存在中国境内受控设施中，并采用合理技术和组织措施防止信息遭受未授权访问、泄露、篡改或毁损。" },
        { body: "我们仅在实现目的所需期限内保存个人信息，超过期限后将进行匿名化或删除。" },
        { body: "如发生安全事件，我们会依法启动应急预案、告知处理进展并向监管机关报告。" },
      ],
    },
    {
      id: "rights",
      heading: "六、您的权利",
      paragraphs: [
        "您可以通过页面底部的联系方式与我们取得联系，依法行使查询、获取副本、纠正、撤回同意或删除个人信息等权利。",
      ],
    },
    {
      id: "minors",
      heading: "七、未成年人信息保护",
      paragraphs: [
        "我们的产品与服务面向企业客户，不以未成年人为目标受众。若在未获监护人同意的情况下收集到未成年人信息，我们将在确认后尽快删除或进行脱敏处理。",
      ],
    },
    {
      id: "updates",
      heading: "八、本政策的更新",
      paragraphs: [
        "我们可能根据业务变化或法律要求对本政策进行更新，更新后的版本将在官网显著位置发布并注明生效日期。如变更导致您的权利受到重大影响，我们将通过邮件、弹窗等方式另行通知。",
      ],
    },
  ],
  contact: {
    heading: "九、联系我们",
    paragraph: "如对本政策或个人信息保护有任何问题、意见或投诉，请联系：",
    company: "广州时代篷房有限公司",
    email: "Winnk@timestent.com",
    phone: "+86 20 6265 1300",
    address: "广东省广州市荔湾区珠江钢琴创梦园",
  },
};

export const FALLBACK_TERMS_CONFIG: TermsConfig = {
  title: {
    "zh-CN": "时代篷房服务条款",
    "zh-TW": "時代篷房服務條款",
    "en": "TIMES TENT Terms of Service",
  },
  intro: {
    lastUpdated: "2025 年 10 月 18 日",
    body:
      "本条款适用于您访问时代篷房官网、咨询服务、签订项目以及使用我们提供的任何线上或线下支持。通过访问或使用我们的服务，即表示您已阅读、理解并接受本条款的全部内容。",
  },
  sections: [
    {
      id: "account",
      heading: "一、账号与身份",
      items: [
        "时代篷房主要面向企业与机构客户，您需保证提交咨询或签订合同时所提供的信息真实、准确、完整并及时更新。",
        "若您代表公司或组织使用本服务，应确保已取得充分授权，并由授权人对本条款负责。",
        "我们保留基于业务考量拒绝或终止向特定主体提供服务的权利。",
      ],
    },
    {
      id: "scope",
      heading: "二、服务范围",
      paragraphs: [
        "我们提供的服务包括但不限于篷房产品咨询、项目方案设计、生产制造、运输搭建、售后维护以及相关增值支持。具体服务内容、交付标准、时间安排与费用以双方确认的书面合同、报价或订单为准。",
      ],
    },
    {
      id: "payment",
      heading: "三、报价与付款",
      items: [
        "官网展示的产品参数、案例与宣传信息仅供参考，并不构成对任何服务的直接要约。",
        "所有报价会结合项目需求、材料规格、施工条件等因素单独核算。报价单及合同经双方确认后生效。",
        "除非双方另有约定，您应按照合同约定的付款节点及时支付费用。逾期付款将产生滞纳责任并可能影响项目排期。",
      ],
    },
    {
      id: "obligations",
      heading: "四、客户义务",
      items: [
        "按照合同约定提供必要的现场信息、施工许可、电力与基础设施条件，确保施工环境安全。",
        "按时支付相关费用并配合完成验收、保修登记及其他后续流程。",
        "未经我们书面同意，不得擅自拆改、翻制、出租或转售我们的产品与方案文档。",
      ],
    },
    {
      id: "ip",
      heading: "五、知识产权",
      paragraphs: [
        "官网内展示的图片、视频、设计、文案、图纸及其他资料的知识产权归时代篷房或相关权利方所有。未经授权，任何组织或个人不得复制、转载、改编、展示或用于商业用途。双方开展合作时另行约定知识产权归属的，以书面约定为准。",
      ],
    },
    {
      id: "confidentiality",
      heading: "六、保密与数据安全",
      paragraphs: [
        "在商务沟通、方案制定与实施过程中，双方可能接触对方的商业秘密或专有信息。双方均应采取合理措施予以保密，除依法披露或经对方书面同意外，不得向任何第三方披露。数据安全义务以《隐私政策》及双方签署的补充协议为准。",
      ],
    },
    {
      id: "prohibited",
      heading: "七、禁止行为",
      items: [
        "使用网站进行任何违法、侵权、欺诈或损害他人合法权益的活动；",
        "未经许可抓取、复制或批量收集网站数据及用户信息；",
        "干扰、破坏或试图未经授权访问网站系统、服务器或网络链接。",
      ],
    },
    {
      id: "liability",
      heading: "八、责任限制",
      paragraphs: [
        "在法律允许的最大范围内，时代篷房对因您使用官网资讯或第三方链接造成的直接或间接损失不承担责任。对于已签订合同的项目，我们仅在合同约定范围内承担违约责任。不可抗力事件导致服务无法履行时，双方可协商延期或终止，互不承担额外赔偿责任。",
      ],
    },
    {
      id: "changes",
      heading: "九、条款的修改与终止",
      items: [
        "我们可能根据业务或法律法规变化适时更新本条款，更新后的版本将在官网发布并注明生效日期；",
        "若您不同意修改内容，可停止使用相关服务；继续使用视为接受更新后的条款；",
        "如您严重违反本条款或相关法律法规，我们有权在合理通知后暂停或终止服务。",
      ],
    },
    {
      id: "law",
      heading: "十、适用法律与争议解决",
      paragraphs: [
        "本条款适用中华人民共和国法律。双方因本条款或相关服务产生争议，应先友好协商解决；协商不成的，任何一方可向时代篷房所在地人民法院提起诉讼。",
      ],
    },
  ],
  contact: {
    heading: "十一、联系我们",
    paragraph: "如对本条款有疑问或需进一步咨询，请联系：",
    company: "广州时代篷房有限公司",
    email: "Winnk@timestent.com",
    phone: "+86 20 6265 1300",
    address: "广东省广州市荔湾区珠江钢琴创梦园",
  },
};

export const FALLBACK_RIGHT_RAIL_CONFIG: RightRailConfig = {
  buttons: [
    {
      id: "phone",
      icon: "phone",
      href: "tel:400-800-1234",
      label: {
        "zh-CN": "热线沟通",
        "zh-TW": "熱線溝通",
        "en": "Call Us",
      },
      description: {
        "zh-CN": "7×24 小时响应",
        "zh-TW": "7×24 小時響應",
        "en": "24/7 support",
      },
    },
    {
      id: "mail",
      icon: "mail",
      href: "mailto:business@timestent.com",
      label: {
        "zh-CN": "邮件咨询",
        "zh-TW": "郵件諮詢",
        "en": "Email",
      },
      description: {
        "zh-CN": "发送项目资料",
        "zh-TW": "發送專案資料",
        "en": "Share project brief",
      },
    },
    {
      id: "visit",
      icon: "map-pin",
      href: "https://uri.amap.com/marker?position=120.2088,30.2653&name=TIMES%20TENT&src=times-tent&callnative=1",
      target: "_blank",
      label: {
        "zh-CN": "预约来访",
        "zh-TW": "預約來訪",
        "en": "Visit Us",
      },
      description: {
        "zh-CN": "查看导航路线",
        "zh-TW": "查看導航路線",
        "en": "Get directions",
      },
    },
  ],
};

const defaultVisibilityConfig = createDefaultVisibilityConfig();

defaultVisibilityConfig._meta = {
  ...(defaultVisibilityConfig._meta ?? {}),
  schema: VISIBILITY_SCHEMA_ID,
  adminPath: `/admin/${VISIBILITY_CONFIG_KEY}`,
  updatedAt: new Date(0).toISOString(),
};

export const FALLBACK_VISIBILITY_CONFIG = defaultVisibilityConfig;
