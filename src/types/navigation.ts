import type { LocalizedField } from "./i18n";

export interface NavigationLink {
  href: string;
  slug?: string;
  label: LocalizedField;
  children?: NavigationLink[];
}

export interface NavigationGroup {
  key?: string;
  title?: LocalizedField;
  links: NavigationLink[];
}

export interface NavigationConfigMeta {
  schema?: string;
  adminPath?: string;
  updatedAt?: string;
}

export interface NavigationConfig {
  groups: NavigationGroup[];
  navigationGroups?: NavigationGroup[];
  _meta?: NavigationConfigMeta;
}
