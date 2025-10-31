import fs from 'fs';
import path from 'path';
import { Client } from 'pg';
import { products_cards, product_details } from '../src/data/configs';

const CONFIG_KEY = '产品详情';

function readDatabaseUrl(): string {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const raw = fs.readFileSync(envPath, 'utf8');
    const m = raw.match(/^DATABASE_URL=(.+)$/m);
    if (m) {
      let url = m[1].trim();
      if ((url.startsWith('"') && url.endsWith('"')) || (url.startsWith('\'') && url.endsWith('\''))) {
        url = url.slice(1, -1);
      }
      return url;
    }
  }
  return process.env.DATABASE_URL || '';
}

function getZhCN(input: unknown): string {
  if (typeof input === 'string') return input;
  if (input && typeof input === 'object' && 'zh-CN' in (input as any)) {
    return String((input as any)['zh-CN'] ?? '');
  }
  return '';
}

function toLocalized(base: unknown, en?: string, tw?: string) {
  const zh = getZhCN(base);
  return {
    'zh-CN': zh,
    'en': en ?? zh,
    'zh-TW': tw ?? zh,
  };
}

function mapText(zh: string, dict: Record<string, { en: string; tw: string }>) {
  // 规范化键：去掉前导数字/项目符号及空白，提升字典命中率
  const key = (zh || "").trim()
    .replace(/^[0-9]+[．\.\s]*/, "") // 去掉开头的数字及点号/空格
    .replace(/^[•·\-]\s*/, ""); // 去掉项目符号
  const found = dict[key] ?? dict[zh];
  if (!found) return toLocalized(zh);
  return toLocalized(zh, found.en, found.tw);
}

const HEADINGS_MAP: Record<string, { en: string; tw: string }> = {
  '产品概览': { en: 'Product Overview', tw: '產品概覽' },
  '典型场景与亮点': { en: 'Typical Scenarios & Highlights', tw: '典型場景與亮點' },
  '项目实景图库': { en: 'Project Gallery', tw: '項目實景圖庫' },
};

const BREADCRUMB_MAP: Record<string, { en: string; tw: string }> = {
  '首页': { en: 'Home', tw: '首頁' },
  '产品': { en: 'Products', tw: '產品' },
};

const LABEL_MAP: Record<string, { en: string; tw: string }> = {
  '单层层高': { en: 'Single-floor height', tw: '單層層高' },
  '结构跨度': { en: 'Structural span', tw: '結構跨度' },
  '檐高': { en: 'Eave height', tw: '簷高' },
  '承重能力': { en: 'Load capacity', tw: '承重能力' },
  '可选系统': { en: 'Optional systems', tw: '可選系統' },
  '屋面形式': { en: 'Roof type', tw: '屋面形式' },
  '可选配置': { en: 'Optional configurations', tw: '可選配置' },
  '抗风等级': { en: 'Wind rating', tw: '抗風等級' },
  '标准模块': { en: 'Standard module', tw: '標準模組' },
  '外饰面': { en: 'Exterior finish', tw: '外飾面' },
};

const VALUE_MAP: Record<string, { en: string; tw: string }> = {
  '弧形膜结构': { en: 'Arch membrane roofing', tw: '弧形膜結構' },
  '全景透明、灯光系统': { en: 'Panoramic glazing, lighting rig', tw: '全景透明、燈光系統' },
  '膜结构/铝塑板': { en: 'Membrane / aluminium composite panels', tw: '膜結構／鋁塑板' },
  '观景露台、玻璃幕墙、扶梯': { en: 'Viewing terrace, glass curtain wall, escalator', tw: '觀景露台、玻璃幕牆、扶梯' },
};

const LIST_MAP: Record<string, { en: string; tw: string }> = {
  // Double-deck highlights (already used)
  '上下功能分层，满足观赛与接待双重需求': {
    en: 'Functional split across levels for viewing and hospitality',
    tw: '上下功能分層，滿足觀賽與接待雙重需求',
  },
  '可配置室外观景平台提升体验': {
    en: 'Optional outdoor viewing deck to enhance experience',
    tw: '可配置室外觀景平台提升體驗',
  },
  '结构满足长期使用与动态荷载要求': {
    en: 'Structure meets long-term use and dynamic load requirements',
    tw: '結構滿足長期使用與動態荷載要求',
  },
  // Arch overview
  '立面造型柔和，营造沉浸式灯光效果': {
    en: 'Streamlined facade enables immersive lighting effects',
    tw: '立面造型柔和，營造沉浸式燈光效果',
  },
  '膜材可选 PVDF、ETFE、透明 PC 板等多种组合': {
    en: 'Membranes include PVDF, ETFE, transparent PC combinations',
    tw: '膜材可選 PVDF、ETFE、透明 PC 板等多種組合',
  },
  '兼容室内隔断、舞台、空调等系统，打造高端体验': {
    en: 'Supports partitions, staging, HVAC for premium experiences',
    tw: '兼容室內隔斷、舞台、空調等系統，打造高端體驗',
  },
  // Gable overview
  '模块化梁柱连接，满足快建快拆需求': {
    en: 'Modular beam-column joints for rapid build and tear-down',
    tw: '模組化梁柱連接，滿足快建快拆需求',
  },
  '可选玻璃幕墙、ABS 硬体墙、双开门等围护系统': {
    en: 'Optional: glass curtain walls, ABS hard panels, double doors',
    tw: '可選玻璃幕牆、ABS 硬體牆、雙開門等圍護系統',
  },
  '支持吊装灯光、舞美与暖通设备的荷载要求': {
    en: 'Supports loads for lighting rigs, staging, and HVAC',
    tw: '支援吊裝燈光、舞美與暖通設備的荷載要求',
  },
  // Curved-beam overview
  '可根据场地调整曲线角度，提升空间利用率': {
    en: 'Adjustable curvature adapts to site constraints, boosting efficiency',
    tw: '可依場地調整曲線角度，提升空間利用率',
  },
  '可挂载灯光音响等设备，满足赛事与演艺需求': {
    en: 'Supports lighting and audio rigs for events and performances',
    tw: '可掛載燈光音響等設備，滿足賽事與演藝需求',
  },
  '支持组合看台、卫生间、办公室等功能模块': {
    en: 'Supports modular grandstands, restrooms, and office modules',
    tw: '支援組合看台、衛生間、辦公室等功能模組',
  },
  // Hero scenarios
  '酒店文旅 · 展览活动': { en: 'Hospitality · Exhibitions', tw: '酒店文旅 · 展覽活動' },
  '体育赛事 · 工业仓储 · 展览活动': { en: 'Sports · Industrial · Exhibitions', tw: '體育賽事 · 工業倉儲 · 展覽活動' },
  '展览活动 · 文旅集市': { en: 'Exhibitions · Pop-up Market', tw: '展覽活動 · 旅遊市集' },
  '体育赛事 · 高端活动': { en: 'Sports · Premium Events', tw: '體育賽事 · 高端活動' },
  '体育场馆 · 文化活动': { en: 'Sports Venues · Cultural Events', tw: '體育場館 · 文化活動' },
};

const PARAGRAPH_MAP: Record<string, { en: string; tw: string }> = {
  // Arch
  '弧形篷房采用曲线梁架设计，配合透明或半透明膜材，营造高端且具识别度的空间氛围，常用于品牌发布、文旅市集等场景。': {
    en: 'Arch Tent features a curved beam structure with transparent or semi‑transparent membranes, creating a premium, distinctive presence for brand launches and cultural markets.',
    tw: '弧形篷房採用曲線梁架設計，搭配透明或半透明膜材，營造高端且具識別度的空間氛圍，常用於品牌發佈、旅遊市集等場景。',
  },
  '流线型弧面提升品牌曝光度，满足展览与发布会的视觉诉求。': {
    en: 'Streamlined curves enhance brand visibility, meeting visual demands for exhibitions and launches.',
    tw: '流線型弧面提升品牌曝光度，滿足展覽與發佈會的視覺訴求。',
  },
  '耐候性强，搭配空调与保温系统后可长期运营于文旅营地。': {
    en: 'Strong weather resistance; with HVAC and insulation, supports long‑term operation in cultural‑tourism camps.',
    tw: '耐候性強，搭配空調與保溫系統後可長期於旅遊營地運營。',
  },
  '流线型外观提升视觉辨识度，常用于文旅和品牌活动。': {
    en: 'Streamlined silhouette improves visual recognition; widely used in hospitality and brand events.',
    tw: '流線型外觀提升視覺辨識度，常用於旅遊與品牌活動。',
  },
  // Gable
  '经典大跨度结构，适用于赛事运营、仓储及展览活动。': {
    en: 'Classic large‑span structure for events operations, warehousing, and exhibitions.',
    tw: '經典大跨度結構，適用於賽事運營、倉儲及展覽活動。',
  },
  '人字形篷房采用高强度铝合金梁柱与模块化围护系统，可快速部署在不同地坪条件下，并支持二次扩展与长期运营。': {
    en: 'High‑strength aluminium frames and modular cladding enable rapid deployment on varied surfaces, with expansion for long‑term operations.',
    tw: '人字形篷房採用高強度鋁合金梁柱與模組化圍護系統，可快速部署於不同地坪，並支援二次擴充與長期營運。',
  },
  '在体育赛事、工业仓储、展览活动中积累 300+ 项交付经验，可快速输出标准化方案。': {
    en: '300+ deliveries across sports, industrial storage, and exhibitions; rapid standard solutions.',
    tw: '在體育賽事、工業倉儲、展覽活動中累積 300+ 項交付經驗，可快速輸出標準化方案。',
  },
  '提供勘察、结构设计、制造、搭建与运维一体化服务，保障项目时效与安全。': {
    en: 'End‑to‑end services—survey, structural design, fabrication, build, and O&M—ensure schedule and safety.',
    tw: '提供勘察、結構設計、製造、搭建與運維一體化服務，保障專案時效與安全。',
  },
  // Curved-beam
  '高度灵活的结构形式，满足不同场地的造型需求。': {
    en: 'Highly flexible structural form that adapts to diverse site geometries.',
    tw: '高度靈活的結構形式，滿足不同場地的造型需求。',
  },
  '弯柱篷房通过可调节曲线梁柱实现多角度排布，适配复杂地形与特殊造型需求，为体育场馆与文化活动提供多功能空间。': {
    en: 'Curved‑beam tents use adjustable curved members for multi‑angle layouts, fitting complex terrains and special shapes, delivering multi‑purpose spaces for venues and cultural events.',
    tw: '彎柱篷房透過可調節曲線梁柱實現多角度排布，適配複雜地形與特殊造型需求，為體育場館與文化活動提供多功能空間。',
  },
  '适配学校、社区及多功能场馆的复杂动线，快速形成完整室内空间。': {
    en: 'Fits complex flow in schools, communities, and multipurpose venues, rapidly forming complete indoor spaces.',
    tw: '適配學校、社區及多功能場館的複雜動線，快速形成完整室內空間。',
  },
  '高强度铝合金与钢构节点组合，兼顾安全性与耐久性。': {
    en: 'High‑strength aluminium combined with steel nodes balances safety and durability.',
    tw: '高強度鋁合金與鋼構節點組合，兼顧安全性與耐久性。',
  },
  // Cone
  '模块化组合，适配市集、展销与临时票务等应用。': {
    en: 'Modular assemblies suit markets, trade fairs, and temporary ticketing.',
    tw: '模組化組合，適配市集、展銷與臨時票務等應用。',
  },
  '锥顶篷房采用标准化 5m/10m 模块，可快速排布为多样的市集、展销、票务或接待空间，具备极高的搭建效率。': {
    en: 'Standard 5 m / 10 m modules rapidly form markets, ticketing halls, or reception spaces with outstanding deployment efficiency.',
    tw: '錐頂篷房採用標準化 5m/10m 模組，可快速排布為多樣市集、展銷、票務或接待空間，具備極高的搭建效率。',
  },
  // Double-deck
  '纵向拓展空间，实现 VIP 接待、观赛看台等高端体验。': {
    en: 'Vertical expansion enables VIP hospitality and viewing stands for premium experiences.',
    tw: '縱向拓展空間，實現 VIP 接待、觀賽看台等高端體驗。',
  },
  '双层篷房以模块化钢铝复合结构实现上下双层空间，可用于赛事观赛、贵宾接待、品牌展陈等高端场景，充分利用有限场地。': {
    en: 'Modular steel‑aluminium composite structure creates two levels for viewing, VIP hospitality, and brand showcases, maximising compact sites.',
    tw: '雙層篷房以模組化鋼鋁複合結構實現上下雙層空間，可用於賽事觀賽、貴賓接待、品牌展陳等高端場景，充分利用有限場地。',
  },
  '广泛服务于国际赛事与品牌活动，提供高规格待客空间。': {
    en: 'Serves international sports and brand events with high‑spec hospitality spaces.',
    tw: '廣泛服務於國際賽事與品牌活動，提供高規格待客空間。',
  },
};

const CTA_MAP: Record<string, { en: string; tw: string }> = {
  '提交项目信息': { en: 'Submit Project Info', tw: '提交專案資訊' },
  '致电': { en: 'Call', tw: '致電' },
  '需要定制方案？': { en: 'Need a custom plan?', tw: '需要客製化方案？' },
};

const CTA_DESC_MAP: Record<string, { en: string; tw: string }> = {
  '留下项目信息，24 小时内由行业顾问回电，为您提供方案设计、预算测算与现场勘查。': {
    en: 'Share your project details and an industry advisor will call back within 24 hours with design proposals, budget estimates, and on‑site assessment.',
    tw: '留下專案資訊，24 小時內由行業顧問回電，提供方案設計、預算測算與現場勘查。',
  },
};

function localizeBreadcrumb(items: any[], productTitleCN: string, productTitleEN: string, productTitleTW: string) {
  return items.map((it) => {
    const zh = getZhCN(it);
    if (BREADCRUMB_MAP[zh]) {
      const { en, tw } = BREADCRUMB_MAP[zh];
      return toLocalized(zh, en, tw);
    }
    if (zh === productTitleCN) {
      return toLocalized(zh, productTitleEN, productTitleTW);
    }
    return toLocalized(zh);
  });
}

function localizeSections(sections: any[]) {
  return sections.map((sec) => {
    const headingZh = getZhCN(sec?.heading);
    let heading = mapText(headingZh, HEADINGS_MAP);

    const modMatch = headingZh?.match(/^内容模块\s*(\d+)/);
    if (modMatch) {
      const n = modMatch[1];
      heading = toLocalized(headingZh, `Module ${n}`, `內容模塊 ${n}`);
    }

    const paragraphs = Array.isArray(sec?.paragraphs)
      ? sec.paragraphs.map((p: any) => mapText(getZhCN(p), PARAGRAPH_MAP))
      : sec?.paragraphs;

    const lists = Array.isArray(sec?.lists)
      ? sec.lists.map((group: any) => (Array.isArray(group) ? group.map((item: any) => mapText(getZhCN(item), LIST_MAP)) : group))
      : sec?.lists;

    let pairs = sec?.pairs;
    const isOverview = headingZh === '产品概览' || (sec?.heading && sec.heading.en === 'Product Overview');
    if (Array.isArray(sec?.pairs)) {
      const first = sec.pairs[0];
      const looksBrokenSingle = !Array.isArray(first) && typeof first === 'object' && first && isEmptyLocalized(first.label) && isEmptyLocalized(first.value);
      if (Array.isArray(first)) {
        pairs = sec.pairs.map((group: any[]) => group.map((item: any) => ({ label: mapText(getZhCN(item?.label), LABEL_MAP), value: mapText(getZhCN(item?.value), VALUE_MAP) })));
      } else if (looksBrokenSingle && isOverview) {
        pairs = [];
      } else {
        pairs = sec.pairs.map((item: any) => ({ label: mapText(getZhCN(item?.label), LABEL_MAP), value: mapText(getZhCN(item?.value), VALUE_MAP) }));
      }
    }

    return { ...sec, heading, paragraphs, lists, pairs };
  });
}

function localizeHeroGeneric(hero: any, productTitleCN: string, productTitleEN: string, productTitleTW: string) {
  const badgeZh = getZhCN(hero?.badge) || '产品';
  const badge = toLocalized(badgeZh, 'PRODUCT', '產品');
  const title = toLocalized(hero?.title ?? productTitleCN, productTitleEN, productTitleTW);
  const description = mapText(getZhCN(hero?.description), PARAGRAPH_MAP);
  const scenarios = Array.isArray(hero?.scenarios)
    ? hero.scenarios.map((s: any) => mapText(getZhCN(s), LIST_MAP))
    : mapText(getZhCN(hero?.scenarios), LIST_MAP);
  return { ...hero, badge, title, description, scenarios };
}

function localizeCTA(cta: any) {
  const fallbackCta = {
    title: '需要定制方案？',
    description:
      '留下项目信息，24 小时内由行业顾问回电，为您提供方案设计、预算测算与现场勘查。',
    primaryLabel: '提交项目信息',
    primaryHref: '/contact',
    phoneLabel: '致电',
    phoneNumber: '400-800-1234',
  };
  const raw = cta ?? fallbackCta;
  const title = raw?.title ? mapText(getZhCN(raw.title), CTA_MAP) : mapText(fallbackCta.title, CTA_MAP);
  const description = raw?.description ? mapText(getZhCN(raw.description), CTA_DESC_MAP) : mapText(fallbackCta.description, CTA_DESC_MAP);
  const primaryLabel = raw?.primaryLabel ? mapText(getZhCN(raw.primaryLabel), CTA_MAP) : mapText(fallbackCta.primaryLabel, CTA_MAP);
  const phoneLabel = raw?.phoneLabel ? mapText(getZhCN(raw.phoneLabel), CTA_MAP) : mapText(fallbackCta.phoneLabel, CTA_MAP);
  const primaryHref = raw?.primaryHref ?? fallbackCta.primaryHref;
  const phoneNumber = raw?.phoneNumber ?? fallbackCta.phoneNumber;
  return { ...raw, title, description, primaryLabel, primaryHref, phoneLabel, phoneNumber };
}

function isEmptyLocalized(obj: any): boolean {
  if (!obj || typeof obj !== 'object') return !obj;
  const values = Object.values(obj);
  if (!values.length) return true;
  return values.every((v) => !v || (typeof v === 'string' && v.trim().length === 0));
}

function buildTitleMap() {
  const map: Record<string, { cn: string; en: string; tw: string }> = {};
  // from data fallbacks
  Object.entries(product_details).forEach(([slug, detail]) => {
    map[slug] = { cn: (detail as any).title, en: '', tw: '' };
  });
  // from products cards (href ends with slug)
  products_cards.forEach((p: any) => {
    const href: string = (p as any).href;
    const slug = href.split('/').pop()!;
    if (!map[slug]) map[slug] = { cn: '', en: '', tw: '' };
    map[slug].en = p.title?.en ?? map[slug].en;
    map[slug].tw = p.title?.['zh-TW'] ?? map[slug].tw;
    if (!map[slug].cn) map[slug].cn = p.title?.['zh-CN'] ?? map[slug].cn;
  });
  return map;
}

async function main() {
  const DATABASE_URL = readDatabaseUrl();
  if (!DATABASE_URL) throw new Error('Missing DATABASE_URL in .env.local or process env');
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  try {
    const res = await client.query('SELECT key, value FROM site_configs WHERE key = $1', [CONFIG_KEY]);
    if (!res.rows.length) throw new Error(`Config '${CONFIG_KEY}' not found`);
    const value = res.rows[0].value || {};

    const titleMap = buildTitleMap();
    const slugs = Object.keys(value);

    for (const slug of slugs) {
      const detail = value[slug];
      const tm = titleMap[slug] ?? { cn: getZhCN(detail?.title) || slug, en: slug, tw: getZhCN(detail?.title) || slug };

      // title
      detail.title = toLocalized(detail?.title ?? tm.cn, tm.en || tm.cn, tm.tw || tm.cn);

      // breadcrumb
      if (Array.isArray(detail?.breadcrumb)) {
        detail.breadcrumb = localizeBreadcrumb(detail.breadcrumb, tm.cn, tm.en || tm.cn, tm.tw || tm.cn);
      }

      // hero
      if (detail?.hero) {
        detail.hero = localizeHeroGeneric(detail.hero, tm.cn, tm.en || tm.cn, tm.tw || tm.cn);
      }

      // sections
      if (Array.isArray(detail?.sections)) {
        detail.sections = localizeSections(detail.sections);
      }

      // gallery.alt
      if (detail?.gallery?.alt) {
        detail.gallery.alt = toLocalized(detail.gallery.alt, tm.en || tm.cn, tm.tw || tm.cn);
      }

      // cta
      detail.cta = localizeCTA(detail.cta);

      value[slug] = detail;
      console.log(`[Updated] ${slug}`);
    }

    await client.query('UPDATE site_configs SET value = $2 WHERE key = $1', [CONFIG_KEY, value]);
    console.log(`All product details localized: ${slugs.join(', ')}`);
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});