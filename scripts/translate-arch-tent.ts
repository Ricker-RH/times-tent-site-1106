import fs from 'fs';
import path from 'path';
import { Client } from 'pg';

const CONFIG_KEY = '产品详情';
const TARGET_SLUG = 'arch-tent';

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
  const found = dict[zh];
  if (!found) {
    return toLocalized(zh);
  }
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
};

const LIST_MAP: Record<string, { en: string; tw: string }> = {
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
  // Arch Tent 概览列表
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
  // 新增：英雄区场景 tagline
  '酒店文旅 · 展览活动': {
    en: 'Hospitality · Exhibitions',
    tw: '酒店文旅 · 展覽活動',
  },
};

// 段落翻译映射：针对产品概览中的中文句子
const PARAGRAPH_MAP: Record<string, { en: string; tw: string }> = {
  '弧形篷房采用曲线梁架设计，配合透明或半透明膜材，营造高端且具识别度的空间氛围，常用于品牌发布、文旅市集等场景。': {
    en: 'Arch Tent features a curved beam structure paired with transparent or semi-transparent membranes, creating a premium and distinctive spatial presence, commonly used for brand launches and cultural tourism marketplaces.',
    tw: '弧形篷房採用曲線梁架設計，搭配透明或半透明膜材，營造高端且具識別度的空間氛圍，常用於品牌發佈、旅遊市集等場景。',
  },
  // 典型场景与亮点段落
  '流线型弧面提升品牌曝光度，满足展览与发布会的视觉诉求。': {
    en: 'Streamlined curved profile enhances brand visibility, meeting visual demands for exhibitions and launches.',
    tw: '流線型弧面提升品牌曝光度，滿足展覽與發佈會的視覺訴求。',
  },
  '耐候性强，搭配空调与保温系统后可长期运营于文旅营地。': {
    en: 'Strong weather resistance; with HVAC and insulation, supports long-term operation in cultural‑tourism camps.',
    tw: '耐候性強，搭配空調與保溫系統後可長期於旅遊營地運營。',
  },
  // 新增：英雄区描述
  '流线型外观提升视觉辨识度，常用于文旅和品牌活动。': {
    en: 'Streamlined silhouette improves visual recognition; widely used in hospitality and brand events.',
    tw: '流線型外觀提升視覺辨識度，常用於文旅與品牌活動。',
  },
};

const CTA_MAP: Record<string, { en: string; tw: string }> = {
  '提交项目信息': { en: 'Submit Project Info', tw: '提交專案資訊' },
  '致电': { en: 'Call', tw: '致電' },
  '需要定制方案？': { en: 'Need a custom plan?', tw: '需要客製化方案？' },
};

// 新增：CTA 描述翻译映射
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
    // assume product name
    if (zh === productTitleCN) {
      return toLocalized(zh, productTitleEN, productTitleTW);
    }
    // default fallback
    return toLocalized(zh);
  });
}

const VALUE_MAP: Record<string, { en: string; tw: string }> = {
  '弧形膜结构': { en: 'Arch membrane roofing', tw: '弧形膜結構' },
  '全景透明、灯光系统': { en: 'Panoramic glazing, lighting rig', tw: '全景透明、燈光系統' },
};

const ARCH_OVERVIEW_PAIRS_SEED: Array<Array<{ label: string; value: string }>> = [
  [
    { label: '结构跨度', value: '15-40m' },
    { label: '屋面形式', value: '弧形膜结构' },
    { label: '檐高', value: '4-8m' },
    { label: '可选配置', value: '全景透明、灯光系统' },
  ],
];

function localizeSections(sections: any[]) {
  return sections.map((sec) => {
    const headingZh = getZhCN(sec?.heading);
    let heading = mapText(headingZh, HEADINGS_MAP);

    const modMatch = headingZh.match(/^内容模块\s*(\d+)/);
    if (modMatch) {
      const n = modMatch[1];
      heading = toLocalized(headingZh, `Module ${n}`, `內容模塊 ${n}`);
    }

    // paragraphs（使用映射提供英/繁翻译）
    const paragraphs = Array.isArray(sec?.paragraphs)
      ? sec.paragraphs.map((p: any) => mapText(getZhCN(p), PARAGRAPH_MAP))
      : sec?.paragraphs;

    // lists：保持二维结构
    const lists = Array.isArray(sec?.lists)
      ? sec.lists.map((group: any) =>
          Array.isArray(group)
            ? group.map((item: any) => mapText(getZhCN(item), LIST_MAP))
            : group,
        )
      : sec?.lists;

    // pairs：保持二维结构；修复概览区被破坏的结构
    let pairs = sec?.pairs;
    const isOverview = headingZh === '产品概览' || (sec?.heading && sec.heading.en === 'Product Overview');
    if (Array.isArray(sec?.pairs)) {
      const first = sec.pairs[0];
      const looksBrokenSingle = !Array.isArray(first) && typeof first === 'object' && first && isEmptyLocalized(first.label) && isEmptyLocalized(first.value);
      if (Array.isArray(first)) {
        pairs = sec.pairs.map((group: any[]) =>
          group.map((item: any) => ({
            label: mapText(getZhCN(item?.label), LABEL_MAP),
            value: mapText(getZhCN(item?.value), VALUE_MAP),
          })),
        );
      } else if (looksBrokenSingle && isOverview) {
        // 使用种子重建矩阵结构
        pairs = ARCH_OVERVIEW_PAIRS_SEED.map((group) =>
          group.map((item) => ({
            label: mapText(item.label, LABEL_MAP),
            value: mapText(item.value, VALUE_MAP),
          })),
        );
      } else {
        // 一维数组情形
        pairs = sec.pairs.map((item: any) => ({
          label: mapText(getZhCN(item?.label), LABEL_MAP),
          value: mapText(getZhCN(item?.value), VALUE_MAP),
        }));
      }
    } else if (isOverview) {
      // 概览区没有 pairs 或结构不对，直接填充默认矩阵
      pairs = ARCH_OVERVIEW_PAIRS_SEED.map((group) =>
        group.map((item) => ({
          label: mapText(item.label, LABEL_MAP),
          value: mapText(item.value, VALUE_MAP),
        })),
      );
    }

    return { ...sec, heading, paragraphs, lists, pairs };
  });
}

function localizeHero(hero: any, productTitleCN: string) {
  const titleEN = 'Arch Tent';
  const titleTW = '弧形篷房';
  const badgeZh = getZhCN(hero?.badge) || '产品';
  const badge = toLocalized(badgeZh, 'PRODUCT', '產品');
  const title = toLocalized(hero?.title ?? productTitleCN, titleEN, titleTW);
  // 英雄区描述：使用段落映射生成英/繁，多语言完整填充
  const description = mapText(getZhCN(hero?.description), PARAGRAPH_MAP);
  // 英雄区场景：支持数组与单字符串都进行映射
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

async function main() {
  const DATABASE_URL = readDatabaseUrl();
  if (!DATABASE_URL) throw new Error('Missing DATABASE_URL in .env.local or process env');
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  try {
    const res = await client.query('SELECT key, value FROM site_configs WHERE key = $1', [CONFIG_KEY]);
    if (!res.rows.length) throw new Error(`Config '${CONFIG_KEY}' not found`);
    const value = res.rows[0].value || {};

    if (!value[TARGET_SLUG]) throw new Error(`Slug '${TARGET_SLUG}' not found in value`);
    const detail = value[TARGET_SLUG];

    const productTitleCN = getZhCN(detail?.title) || '弧形篷房';
    const productTitleEN = 'Arch Tent';
    const productTitleTW = '弧形篷房';

    // title
    detail.title = toLocalized(detail?.title, productTitleEN, productTitleTW);

    // breadcrumb
    if (Array.isArray(detail?.breadcrumb)) {
      detail.breadcrumb = localizeBreadcrumb(detail.breadcrumb, productTitleCN, productTitleEN, productTitleTW);
    }

    // hero
    if (detail?.hero) {
      detail.hero = localizeHero(detail.hero, productTitleCN);
    }

    // sections
    if (Array.isArray(detail?.sections)) {
      detail.sections = localizeSections(detail.sections);
    }

    // gallery.alt
    if (detail?.gallery?.alt) {
      detail.gallery.alt = toLocalized(detail.gallery.alt, productTitleEN, productTitleTW);
    }

    // cta：无论是否存在都进行本地化（缺失时写入带映射的默认值）
    detail.cta = localizeCTA(detail.cta);

    value[TARGET_SLUG] = detail;

    await client.query('UPDATE site_configs SET value = $2 WHERE key = $1', [CONFIG_KEY, value]);

    console.log(`[Updated] ${TARGET_SLUG}.title`);
    console.log('Before zh-CN:', productTitleCN);
    console.log('After:', JSON.stringify(detail.title, null, 2));
    console.log('Breadcrumb[0..2]:', JSON.stringify(detail.breadcrumb?.slice(0, 3), null, 2));
    console.log('Hero.badge/title:', JSON.stringify({ badge: detail.hero?.badge, title: detail.hero?.title }, null, 2));
    const overview = Array.isArray(detail.sections)
      ? detail.sections.find((s: any) => getZhCN(s.heading) === '产品概览' || (s.heading?.en === 'Product Overview'))
      : undefined;
    if (overview && overview.pairs) {
      console.log('Overview pairs sample:', JSON.stringify(overview.pairs, null, 2));
    }
    const highlights = Array.isArray(detail.sections)
      ? detail.sections.find((s: any) => getZhCN(s.heading) === '典型场景与亮点' || (s.heading?.en === 'Typical Scenarios & Highlights'))
      : undefined;
    if (highlights && highlights.paragraphs) {
      console.log('Highlights paragraphs:', JSON.stringify(highlights.paragraphs, null, 2));
    }
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

function isEmptyLocalized(obj: any): boolean {
  if (!obj || typeof obj !== 'object') return !obj;
  const values = Object.values(obj);
  if (!values.length) return true;
  return values.every((v) => !v || (typeof v === 'string' && v.trim().length === 0));
}