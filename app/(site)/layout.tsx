import type { ReactNode } from "react";

import { siteData } from "@/data";
import { getFooterConfig, getNavigationConfig } from "@/server/siteConfigs";
import { getRightRailConfig } from "@/server/pageConfigs";
import { getVisibilityConfig, isPageHidden, resolveVisibilityPageKeyFromPath } from "@/server/visibility";
import type { FooterConfig } from "@/types/footer";
import type { NavigationConfig, NavigationLink } from "@/types/navigation";

import { SiteLayoutClient } from "./SiteLayoutClient";

export const dynamic = "force-dynamic";

export default async function SiteLayout({ children }: { children: ReactNode }) {
  const [navigationConfig, footerConfig, visibility, rightRailConfig] = await Promise.all([
    getNavigationConfig(),
    getFooterConfig(),
    getVisibilityConfig(),
    getRightRailConfig(),
  ]);

  const navigation = (navigationConfig ?? (siteData.navigation as unknown as NavigationConfig));
  const footer = (footerConfig ?? (siteData.footer as unknown as FooterConfig));
  const filteredNavigation = filterNavigationByVisibility(navigation, visibility);
  const filteredFooter = filterFooterByVisibility(footer, visibility);

  return (
    <SiteLayoutClient navigation={filteredNavigation} footer={filteredFooter} rightRail={rightRailConfig}>
      {children}
    </SiteLayoutClient>
  );
}

function filterNavigationByVisibility(navigation: NavigationConfig, visibility: Awaited<ReturnType<typeof getVisibilityConfig>>): NavigationConfig {
  const clone: NavigationConfig = structuredClone(navigation);
  const groups = clone.groups ?? [];
  clone.groups = groups
    .map((group) => ({
      ...group,
      links: filterNavigationLinks(group.links ?? [], visibility),
    }))
    .filter((group) => group.links && group.links.length > 0);
  return clone;
}

function filterNavigationLinks(links: NavigationLink[] = [], visibility: Awaited<ReturnType<typeof getVisibilityConfig>>): NavigationLink[] {
  return (links ?? [])
    .map((link) => {
      const hidden = shouldHideLink(link.href, visibility);
      const children = link.children ? filterNavigationLinks(link.children, visibility) : undefined;
      if (hidden && (!children || children.length === 0)) {
        return null;
      }
      return {
        ...structuredClone(link),
        children,
      };
    })
    .filter((link): link is NonNullable<typeof link> => Boolean(link));
}

function shouldHideLink(href: string, visibility: Awaited<ReturnType<typeof getVisibilityConfig>>): boolean {
  const pageKey = resolveVisibilityPageKeyFromPath(href);
  if (!pageKey) {
    return false;
  }
  return isPageHidden(visibility, pageKey);
}

function filterFooterByVisibility(footer: FooterConfig, visibility: Awaited<ReturnType<typeof getVisibilityConfig>>): FooterConfig {
  const clone: FooterConfig = structuredClone(footer);
  const groups = clone.navigationGroups ?? [];
  clone.navigationGroups = groups
    .map((group) => ({
      ...group,
      links: (group.links ?? []).filter((link) => {
        const key = resolveVisibilityPageKeyFromPath(link.href ?? "");
        if (!key) return true;
        return !isPageHidden(visibility, key);
      }),
    }))
    .filter((group) => group.links && group.links.length > 0);
  return clone;
}
