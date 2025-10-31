import type { LocalizedField } from "./i18n";

export interface VideosHero {
  title: LocalizedField;
  eyebrow?: LocalizedField;
  description?: LocalizedField;
  backgroundImage: string;
}

export interface VideosSectionHeading {
  eyebrow?: LocalizedField;
  title: LocalizedField;
  description?: LocalizedField;
}

export type VideoTag = {
  [locale: string]: string | undefined;
  "zh-CN"?: string;
  "zh-TW"?: string;
  en?: string;
};

export interface VideoItem {
  slug: string;
  title: LocalizedField;
  description?: LocalizedField;
  category: string;
  duration?: string;
  thumbnail: string;
  bvid?: string;
  tags?: VideoTag[];
}

export interface VideosConfigMeta {
  schema?: string;
  adminPath?: string;
  updatedAt?: string;
}

export interface VideosConfig {
  hero: VideosHero;
  sectionHeading: VideosSectionHeading;
  filters?: Array<{ slug: string; label: LocalizedField }>;
  items: VideoItem[];
  _meta?: VideosConfigMeta;
}
