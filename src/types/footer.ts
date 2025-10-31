import type { LocalizedField } from "./i18n";

export interface FooterContactLink {
  href: string;
  label: string;
}

export interface FooterContact {
  address: LocalizedField;
  /**
   * Primary contact numbers. Render up to three entries in the footer.
   */
  phones: FooterContactLink[];
  /**
   * @deprecated Legacy single phone field kept for backwards compatibility during serialization.
   */
  phone?: FooterContactLink;
  email: FooterContactLink;
}

export interface FooterBrand {
  logo: string;
  name: LocalizedField;
  tagline?: LocalizedField;
}

export interface FooterLegalLink {
  href: string;
  label: LocalizedField;
}

export interface FooterLegal {
  icp?: LocalizedField;
  terms: FooterLegalLink;
  privacy: FooterLegalLink;
  copyright: LocalizedField;
}

export interface FooterQuickLink {
  href: string;
  label: LocalizedField;
}

export interface FooterSocialLink {
  platform: string;
  label: string;
  href?: string;
  qrImage?: string;
}

export interface FooterConfigMeta {
  schema?: string;
  adminPath?: string;
  updatedAt?: string;
}

export interface FooterConfig {
  brand: FooterBrand;
  contact: FooterContact;
  legal: FooterLegal;
  quickLinks?: FooterQuickLink[];
  socialLinks?: FooterSocialLink[];
  navigationGroups?: Array<{
    title: LocalizedField;
    links: FooterQuickLink[];
  }>;
  _meta?: FooterConfigMeta;
}
