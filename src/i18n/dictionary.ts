import { DEFAULT_LOCALE, LocaleKey } from "@/data";

export type UiKey =
  | "nav.language.zh-CN"
  | "nav.language.zh-TW"
  | "nav.language.en"
  | "nav.language.menuLabel"
  | "breadcrumb.home"
  | "breadcrumb.news"
  | "breadcrumb.cases"
  | "breadcrumb.more"
  | "news.moreToRead.heading"
  | "news.moreToRead.description"
  | "news.moreToRead.viewAll"
  | "news.readMore"
  | "news.publishedOn"
  | "news.category.events"
  | "news.category.hospitality"
  | "news.category.product"
  | "news.category.industry"
  | "news.category.company"
  | "news.hero.return"
  | "cases.sidebar.title"
  | "cases.gallery.empty"
  | "cases.cta.report.heading"
  | "cases.cta.report.description"
  | "cases.cta.report.button"
  | "cases.cta.custom.heading"
  | "cases.cta.custom.description"
  | "cases.cta.custom.tag.speed"
  | "cases.cta.custom.tag.companion"
  | "cases.cta.custom.submit"
  | "cases.cta.custom.call"
  | "cases.cta.consult.heading"
  | "cases.cta.consult.description"
  | "cases.cta.consult.tag.pack"
  | "cases.cta.consult.tag.visit"
  | "cases.cta.consult.tag.configure"
  | "cases.cta.consult.more"
  | "cases.cta.consult.email"
  | "cases.section.background"
  | "cases.section.highlights"
  | "cases.section.deliverables"
  | "cases.section.gallery"
  | "cases.breadcrumb.label"
  | "factory.section.title"
  | "factory.section.description"
  | "factory.blocks.quality.title"
  | "factory.blocks.quality.description"
  | "factory.blocks.traceability.title"
  | "factory.blocks.traceability.description"
  | "factory.blocks.delivery.title"
  | "factory.blocks.delivery.description"
  | "factory.cards.overview"
  | "factory.cards.overview.description"
  | "factory.cards.extrusion"
  | "factory.cards.extrusion.description"
  | "factory.cards.welding"
  | "factory.cards.welding.description"
  | "contact.form.name"
  | "contact.form.namePlaceholder"
  | "contact.form.company"
  | "contact.form.companyPlaceholder"
  | "contact.form.email"
  | "contact.form.phone"
  | "contact.form.phonePlaceholder"
  | "contact.form.scenario"
  | "contact.form.scenarioPlaceholder"
  | "contact.form.schedule"
  | "contact.form.schedulePlaceholder"
  | "contact.form.brief"
  | "contact.form.briefPlaceholder"
  | "contact.form.notice"
  | "contact.form.submit"
  | "contact.form.success"
  | "contact.form.fail"
  | "rightRail.phone"
  | "rightRail.phone.description"
  | "rightRail.mail"
  | "rightRail.mail.description"
  | "rightRail.visit"
  | "rightRail.visit.description"
  | "rightRail.chat.aria"
  | "rightRail.top"
  | "chat.title"
  | "chat.subtitle"
  | "chat.quick.case"
  | "chat.quick.suite"
  | "chat.quick.invite"
  | "chat.quick.tour"
  | "chat.quick.cases"
  | "chat.quick.products"
  | "chat.placeholder"
  | "chat.send"
  | "chat.shortcut";

const dictionary: Record<LocaleKey, Record<UiKey, string>> = {
  "zh-CN": {
    "nav.language.zh-CN": "简体中文",
    "nav.language.zh-TW": "繁體中文",
    "nav.language.en": "English",
    "nav.language.menuLabel": "选择语言",
    "breadcrumb.home": "首页",
    "breadcrumb.news": "新闻中心",
    "breadcrumb.cases": "案例展示",
    "breadcrumb.more": "了解更多",
    "news.moreToRead.heading": "更多阅读",
    "news.moreToRead.description": "精选相关报道与行业观察，继续探索模块化空间的最新动态。",
    "news.moreToRead.viewAll": "查看全部新闻",
    "news.readMore": "阅读更多",
    "news.publishedOn": "发布于",
    "news.category.events": "赛事合作",
    "news.category.hospitality": "文旅营地",
    "news.category.product": "产品动态",
    "news.category.industry": "行业洞察",
    "news.category.company": "公司新闻",
    "news.hero.return": "返回新闻中心",
    "cases.sidebar.title": "案例展示",
    "cases.gallery.empty": "图像内容整理中。",
    "cases.cta.report.heading": "获取定制化案例报告",
    "cases.cta.report.description": "联系我们获取更多案例资料与项目对接方案。",
    "cases.cta.report.button": "联系顾问",
    "cases.cta.custom.heading": "需要定制方案？",
    "cases.cta.custom.description": "留下关键诉求，顾问团队将在 24 小时内反馈设计路径、预算区间与排期建议，联动设计、制造与现场交付保持节奏一致。",
    "cases.cta.custom.tag.speed": "顾问快速响应",
    "cases.cta.custom.tag.companion": "设计至交付陪伴",
    "cases.cta.custom.submit": "提交项目信息",
    "cases.cta.custom.call": "致电 400-800-1234",
    "cases.cta.consult.heading": "更多案例咨询",
    "cases.cta.consult.description": "需要更多数据或想预约园区参观？我们提供案例拆解、技术资料、现场体验安排等支持，帮助团队快速评估可落地方案。",
    "cases.cta.consult.tag.pack": "资料打包",
    "cases.cta.consult.tag.visit": "园区参观",
    "cases.cta.consult.tag.configure": "模块配置建议",
    "cases.cta.consult.more": "浏览更多案例",
    "cases.cta.consult.email": "info@timestent.com",
    "cases.section.background": "项目背景",
    "cases.section.highlights": "解决方案亮点",
    "cases.section.deliverables": "交付成果",
    "cases.section.gallery": "项目影像集锦",
    "cases.breadcrumb.label": "案例展示",
    "factory.section.title": "一体化制造，兼顾效率与精度",
    "factory.section.description": "生产线覆盖铝型材挤压、膜材焊接、结构测试等关键工序，ISO9001 质量体系全流程管控。",
    "factory.blocks.quality.title": "质量环境双体系",
    "factory.blocks.quality.description": "ISO9001 / ISO14001 全流程覆盖 52 个关键节点，原材验收到出厂交付均有标准 SOP 与抽检机制。",
    "factory.blocks.traceability.title": "全链路数字溯源",
    "factory.blocks.traceability.description": "原材料、工装、工序与物流信息实时留痕，批次、载荷与运维数据同步上云，支撑跨项目复盘。",
    "factory.blocks.delivery.title": "敏捷交付节奏",
    "factory.blocks.delivery.description": "24 小时响应需求，4 小时开通加急加工通道，标准班组与应急班组无缝切换保障施工窗口。",
    "factory.cards.overview": "设备总览",
    "factory.cards.overview.description": "挤压、焊接、喷涂、检测一体化布局，关键工序参数实时采集",
    "factory.cards.extrusion": "铝型材生产线",
    "factory.cards.extrusion.description": "自动化挤压—校直—时效联动，型材精度稳定控制在 ±0.3mm",
    "factory.cards.welding": "膜材焊接车间",
    "factory.cards.welding.description": "高频熔接配合全幅拉伸测试，确保膜材耐候性与密封性能双达标",
    "contact.form.name": "联系人",
    "contact.form.namePlaceholder": "请输入姓名",
    "contact.form.company": "公司/机构",
    "contact.form.companyPlaceholder": "请输入公司名称",
    "contact.form.email": "邮箱",
    "contact.form.phone": "电话",
    "contact.form.phonePlaceholder": "联系电话",
    "contact.form.scenario": "应用场景",
    "contact.form.scenarioPlaceholder": "请选择应用场景",
    "contact.form.schedule": "预计档期",
    "contact.form.schedulePlaceholder": "例如 2025年11月",
    "contact.form.brief": "项目简介",
    "contact.form.briefPlaceholder": "请输入场地规模、预计人流或特殊需求。",
    "contact.form.notice": "提交后我们将在 1 个工作日内回复，提供下一步安排。",
    "contact.form.submit": "提交信息",
    "contact.form.success": "提交成功，我们将尽快与您联系。",
    "contact.form.fail": "提交失败，请稍后重试。",
    "rightRail.phone": "顾问热线",
    "rightRail.phone.description": "拨打 400-800-1234",
    "rightRail.mail": "项目邮箱",
    "rightRail.mail.description": "info@timestent.com",
    "rightRail.visit": "预约参观",
    "rightRail.visit.description": "浙江杭州 · TIMES 智造园",
    "rightRail.chat.aria": "打开客服",
    "rightRail.top": "返回顶部",
    "chat.title": "客服小 T",
    "chat.subtitle": "嗨，我是小 T，案例、产品或策划想法都能聊，我马上回复你。",
    "chat.quick.case": "体育案例",
    "chat.quick.suite": "体验套房",
    "chat.quick.invite": "拉顾问进来",
    "chat.quick.tour": "品牌巡展",
    "chat.quick.cases": "查看案例",
    "chat.quick.products": "了解产品",
    "chat.placeholder": "想聊案例、布局或进度都行",
    "chat.send": "发送",
    "chat.shortcut": "按 Shift + Enter 可以换行。",
  },
  "zh-TW": {
    "nav.language.zh-CN": "簡體中文",
    "nav.language.zh-TW": "繁體中文",
    "nav.language.en": "English",
    "nav.language.menuLabel": "選擇語言",
    "breadcrumb.home": "首頁",
    "breadcrumb.news": "新聞中心",
    "breadcrumb.cases": "案例展示",
    "breadcrumb.more": "了解更多",
    "news.moreToRead.heading": "更多閱讀",
    "news.moreToRead.description": "精選相關報導與產業觀察，持續探索模組化空間的最新動態。",
    "news.moreToRead.viewAll": "檢視全部新聞",
    "news.readMore": "閱讀更多",
    "news.publishedOn": "發布於",
    "news.category.events": "賽事合作",
    "news.category.hospitality": "文旅營地",
    "news.category.product": "產品動態",
    "news.category.industry": "產業洞察",
    "news.category.company": "公司新聞",
    "news.hero.return": "返回新聞中心",
    "cases.sidebar.title": "案例展示",
    "cases.gallery.empty": "影像內容整理中。",
    "cases.cta.report.heading": "取得客製化案例報告",
    "cases.cta.report.description": "聯絡我們索取更多案例資料與專案對接方案。",
    "cases.cta.report.button": "聯繫顧問",
    "cases.cta.custom.heading": "需要客製方案？",
    "cases.cta.custom.description": "留下關鍵訴求，顧問團隊將在 24 小時內回覆設計路徑、預算區間與排程建議，協同設計、製造與現場交付節奏。",
    "cases.cta.custom.tag.speed": "顧問快速回應",
    "cases.cta.custom.tag.companion": "設計到交付陪伴",
    "cases.cta.custom.submit": "提交專案資訊",
    "cases.cta.custom.call": "致電 400-800-1234",
    "cases.cta.consult.heading": "更多案例諮詢",
    "cases.cta.consult.description": "想取得更多數據或預約園區參觀？我們提供案例拆解、技術資料、現場體驗安排等支援，協助團隊快速評估可落地方案。",
    "cases.cta.consult.tag.pack": "資料打包",
    "cases.cta.consult.tag.visit": "園區參觀",
    "cases.cta.consult.tag.configure": "模組配置建議",
    "cases.cta.consult.more": "瀏覽更多案例",
    "cases.cta.consult.email": "info@timestent.com",
    "cases.section.background": "專案背景",
    "cases.section.highlights": "解決方案亮點",
    "cases.section.deliverables": "交付成果",
    "cases.section.gallery": "專案影像集錦",
    "cases.breadcrumb.label": "案例展示",
    "factory.section.title": "一體化製造，兼顧效率與精度",
    "factory.section.description": "產線涵蓋鋁型材擠壓、膜材焊接、結構測試等關鍵製程，ISO9001 品質體系全流程管控。",
    "factory.blocks.quality.title": "品質環境雙體系",
    "factory.blocks.quality.description": "ISO9001 / ISO14001 覆蓋 52 個關鍵節點，從原料驗收到出廠皆有標準 SOP 與抽檢機制。",
    "factory.blocks.traceability.title": "全流程數位溯源",
    "factory.blocks.traceability.description": "原材料、工裝、工序與物流資訊即時留痕，批次、載荷與運維資料同步上雲，支撐跨專案複盤。",
    "factory.blocks.delivery.title": "敏捷交付節奏",
    "factory.blocks.delivery.description": "24 小時響應需求，4 小時開啟加急加工通道，標準與應急班組無縫切換保障施工窗口。",
    "factory.cards.overview": "設備總覽",
    "factory.cards.overview.description": "擠壓、焊接、噴塗、檢測一體化佈局，關鍵製程參數即時蒐集",
    "factory.cards.extrusion": "鋁型材產線",
    "factory.cards.extrusion.description": "自動化擠壓－校直－時效聯動，型材精度穩定控制在 ±0.3mm",
    "factory.cards.welding": "膜材焊接車間",
    "factory.cards.welding.description": "高頻熔接搭配全幅拉伸測試，確保膜材耐候與密封雙達標",
    "contact.form.name": "聯絡人",
    "contact.form.namePlaceholder": "請輸入姓名",
    "contact.form.company": "公司/機構",
    "contact.form.companyPlaceholder": "請輸入公司名稱",
    "contact.form.email": "Email",
    "contact.form.phone": "電話",
    "contact.form.phonePlaceholder": "聯絡電話",
    "contact.form.scenario": "應用場景",
    "contact.form.scenarioPlaceholder": "請選擇應用場景",
    "contact.form.schedule": "預計檔期",
    "contact.form.schedulePlaceholder": "例如 2025 年 11 月",
    "contact.form.brief": "專案簡介",
    "contact.form.briefPlaceholder": "請輸入場地規模、預估人流或特殊需求。",
    "contact.form.notice": "提交後我們將於 1 個工作日內回覆，提供下一步安排。",
    "contact.form.submit": "提交資訊",
    "contact.form.success": "提交成功，我們會儘速與您聯繫。",
    "contact.form.fail": "提交失敗，請稍後再試。",
    "rightRail.phone": "顧問熱線",
    "rightRail.phone.description": "撥打 400-800-1234",
    "rightRail.mail": "專案信箱",
    "rightRail.mail.description": "info@timestent.com",
    "rightRail.visit": "預約參觀",
    "rightRail.visit.description": "浙江杭州 · TIMES 智造園",
    "rightRail.chat.aria": "開啟客服",
    "rightRail.top": "返回頂部",
    "chat.title": "客服小 T",
    "chat.subtitle": "嗨，我是小 T，案例、產品或策劃想法都能聊，我會立即回覆您。",
    "chat.quick.case": "體育案例",
    "chat.quick.suite": "體驗套房",
    "chat.quick.invite": "邀請顧問",
    "chat.quick.tour": "品牌巡展",
    "chat.quick.cases": "查看案例",
    "chat.quick.products": "了解產品",
    "chat.placeholder": "想聊案例、佈局或進度都可以",
    "chat.send": "送出",
    "chat.shortcut": "按 Shift + Enter 可換行。",
  },
  en: {
    "nav.language.zh-CN": "Simplified Chinese",
    "nav.language.zh-TW": "Traditional Chinese",
    "nav.language.en": "English",
    "nav.language.menuLabel": "Select language",
    "breadcrumb.home": "Home",
    "breadcrumb.news": "Newsroom",
    "breadcrumb.cases": "Case Studies",
    "breadcrumb.more": "Learn more",
    "news.moreToRead.heading": "More to read",
    "news.moreToRead.description": "Curated stories and insights to keep up with the latest in modular spaces.",
    "news.moreToRead.viewAll": "View all news",
    "news.readMore": "Read more",
    "news.publishedOn": "Published",
    "news.category.events": "Events",
    "news.category.hospitality": "Hospitality",
    "news.category.product": "Product",
    "news.category.industry": "Industry",
    "news.category.company": "Company",
    "news.hero.return": "Back to news",
    "cases.sidebar.title": "Case Studies",
    "cases.gallery.empty": "Gallery coming soon.",
    "cases.cta.report.heading": "Get a tailored case report",
    "cases.cta.report.description": "Contact us for additional case files and project onboarding kits.",
    "cases.cta.report.button": "Talk to a consultant",
    "cases.cta.custom.heading": "Need a custom plan?",
    "cases.cta.custom.description": "Share your key requirements and our consultants will respond within 24 hours with design paths, budget ranges, and scheduling guidance aligned across design, manufacturing, and on-site delivery.",
    "cases.cta.custom.tag.speed": "Fast consultant response",
    "cases.cta.custom.tag.companion": "Support from design to delivery",
    "cases.cta.custom.submit": "Submit project info",
    "cases.cta.custom.call": "Call 400-800-1234",
    "cases.cta.consult.heading": "More case support",
    "cases.cta.consult.description": "Need deeper data or a site visit? We provide case breakdowns, technical dossiers, and on-site walkthroughs to help teams validate deployment plans quickly.",
    "cases.cta.consult.tag.pack": "Documentation bundle",
    "cases.cta.consult.tag.visit": "Campus tour",
    "cases.cta.consult.tag.configure": "Module configuration tips",
    "cases.cta.consult.more": "Browse more cases",
    "cases.cta.consult.email": "info@timestent.com",
    "cases.section.background": "Project background",
    "cases.section.highlights": "Solution highlights",
    "cases.section.deliverables": "Deliverables",
    "cases.section.gallery": "Project gallery",
    "cases.breadcrumb.label": "Case Studies",
    "factory.section.title": "Integrated manufacturing with precision and speed",
    "factory.section.description": "Our lines cover aluminum extrusion, membrane welding, and structural testing with ISO9001 governance end to end.",
    "factory.blocks.quality.title": "Quality & environmental systems",
    "factory.blocks.quality.description": "ISO9001 / ISO14001 across 52 checkpoints with SOPs and sampling from incoming materials to outbound delivery.",
    "factory.blocks.traceability.title": "Digital traceability",
    "factory.blocks.traceability.description": "Materials, tooling, process, and logistics data are captured in real time, syncing batch loads and O&M records for cross-project reviews.",
    "factory.blocks.delivery.title": "Agile delivery cadence",
    "factory.blocks.delivery.description": "24-hour response, 4-hour fast-track fabrication window, and dedicated crew rotations to secure onsite schedules.",
    "factory.cards.overview": "Facility overview",
    "factory.cards.overview.description": "Extrusion, welding, coating, and testing in one loop with live process telemetry",
    "factory.cards.extrusion": "Aluminum extrusion line",
    "factory.cards.extrusion.description": "Automated extrusion → straightening → aging workflow keeps tolerances within ±0.3mm",
    "factory.cards.welding": "Membrane welding hall",
    "factory.cards.welding.description": "High-frequency welding plus full-span tensile testing to ensure durability and sealing",
    "contact.form.name": "Name",
    "contact.form.namePlaceholder": "Your name",
    "contact.form.company": "Company / organisation",
    "contact.form.companyPlaceholder": "Company name",
    "contact.form.email": "Email",
    "contact.form.phone": "Phone",
    "contact.form.phonePlaceholder": "Contact number",
    "contact.form.scenario": "Application scenario",
    "contact.form.scenarioPlaceholder": "Select a scenario",
    "contact.form.schedule": "Estimated schedule",
    "contact.form.schedulePlaceholder": "e.g. Nov 2025",
    "contact.form.brief": "Project brief",
    "contact.form.briefPlaceholder": "Share site size, expected visitors, or special requirements.",
    "contact.form.notice": "We will respond within one business day with next steps.",
    "contact.form.submit": "Submit details",
    "contact.form.success": "Submitted successfully—we’ll get back to you shortly.",
    "contact.form.fail": "Submission failed. Please try again later.",
    "rightRail.phone": "Consulting hotline",
    "rightRail.phone.description": "Call 400-800-1234",
    "rightRail.mail": "Project email",
    "rightRail.mail.description": "info@timestent.com",
    "rightRail.visit": "Schedule a visit",
    "rightRail.visit.description": "TIMES Campus · Hangzhou, China",
    "rightRail.chat.aria": "Open support chat",
    "rightRail.top": "Back to top",
    "chat.title": "TIMES support",
    "chat.subtitle": "Hi, I’m T. Happy to chat about cases, products, or activation plans—drop me a line and I’ll respond right away.",
    "chat.quick.case": "Sports cases",
    "chat.quick.suite": "Hospitality suites",
    "chat.quick.invite": "Loop in a consultant",
    "chat.quick.tour": "Brand tours",
    "chat.quick.cases": "View case studies",
    "chat.quick.products": "Explore products",
    "chat.placeholder": "Share project details, layouts, or timelines",
    "chat.send": "Send",
    "chat.shortcut": "Press Shift + Enter for a new line.",
  },
};

export function translateUi(locale: LocaleKey, key: UiKey, fallback?: string): string {
  const fromLocale = dictionary[locale]?.[key];
  if (fromLocale) return fromLocale;
  const fromDefault = dictionary[DEFAULT_LOCALE][key];
  if (fromDefault) return fromDefault;
  return fallback ?? key;
}

export const localeOptions: Record<LocaleKey, { label: string; shortLabel: string }> = {
  "zh-CN": { label: dictionary["zh-CN"]["nav.language.zh-CN"], shortLabel: "简体" },
  "zh-TW": { label: dictionary["zh-TW"]["nav.language.zh-TW"], shortLabel: "繁體" },
  en: { label: dictionary.en["nav.language.en"], shortLabel: "EN" },
};
