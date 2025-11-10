"use client";

import { useMemo, useState, useEffect, Fragment } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { LocaleKey, t } from "@/data";
import { LocaleProvider } from "@/providers/LocaleProvider";
import { useI18n } from "@/i18n/useI18n";
import { localeOptions } from "@/i18n/dictionary";
import type { NavigationConfig, NavigationLink } from "@/types/navigation";
import type { FooterConfig } from "@/types/footer";
import type { RightRailConfig } from "@/server/pageConfigs";

const cn = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

const PHONE_ICON_COMPONENTS = [IconPhone, IconPhoneMobile, IconPhoneClassic] as const;

// Add a resilient resolver to handle either string or localized record labels
function resolveLabel(value: unknown, fallback = ""): string {
  if (!value) return fallback;
  if (typeof value === "string") return value;
  try {
    return t(value as Record<string, string | undefined>) || fallback;
  } catch {
    return fallback;
  }
}

function getFooterContactPhones(contact: FooterConfig["contact"]): FooterConfig["contact"]["phones"] {
  const phonesArray = Array.isArray(contact.phones) ? contact.phones : [];
  if (phonesArray.length > 0) {
    return phonesArray
      .filter((phone) => {
        const label = (phone?.label ?? "").trim();
        const href = (phone?.href ?? "").trim();
        return Boolean(label || href);
      })
      .slice(0, 3);
  }
  if (contact.phone) {
    const label = (contact.phone.label ?? "").trim();
    const href = (contact.phone.href ?? "").trim();
    if (label || href) {
      return [{ label, href }];
    }
  }
  return [];
}

// Provide a safe pathname hook that falls back gracefully when Next.js context is unavailable
function useSafePathname(): string {
  try {
    const p = usePathname();
    if (p) return p;
  } catch {
    // ignore and fall back below
  }
  if (typeof window !== "undefined") {
    return window.location?.pathname || "/";
  }
  return "/";
}

type FooterLink = {
  href: string;
  label: string;
};

type FooterLinkGroup = {
  title: string;
  links: FooterLink[];
  slug?: string;
};

interface SiteLayoutClientProps {
  navigation: NavigationConfig;
  footer: FooterConfig;
  rightRail: RightRailConfig;
  children: React.ReactNode;
}

export function SiteLayoutClient({ navigation, footer, rightRail, children }: SiteLayoutClientProps) {
  const mainGroup = useMemo(
    () => navigation.groups?.find((group) => group.key === "main") ?? navigation.groups?.[0],
    [navigation],
  );
  const mainLinks = useMemo(() => mainGroup?.links ?? [], [mainGroup]);
  const pathname = useSafePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <LocaleProvider>
      <div className="flex min-h-screen flex-col">
        <Header
          links={mainLinks}
          currentPath={pathname}
          mobileOpen={mobileOpen}
          onToggleMobile={() => setMobileOpen((open) => !open)}
          onCloseMobile={() => setMobileOpen(false)}
        />
        <main className="flex-1">{children}</main>
        <Footer footer={footer} navigation={navigation} mainLinks={mainLinks} />
        <RightRail config={rightRail} footer={footer} />
      </div>
    </LocaleProvider>
  );
}

interface HeaderProps {
  links: NavigationLink[];
  currentPath: string;
  mobileOpen: boolean;
  onToggleMobile: () => void;
  onCloseMobile: () => void;
}

function Header({ links, currentPath, mobileOpen, onToggleMobile, onCloseMobile }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-20 w-full max-w-[1200px] items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          aria-label="时代篷房首页"
          className="flex items-center gap-3"
          onClick={onCloseMobile}
        >
          <Image src="/logo-horizontal.png" alt="TIMES TENT 时代篷房" width={160} height={48} className="h-11 w-auto lg:h-12" priority />
        </Link>
        <nav className="hidden flex-1 items-center justify-end gap-6 pr-6 lg:flex">
          {links.map((link) => (
            <DesktopNavItem key={link.slug ?? link.href} link={link} isActive={isLinkActive(link, currentPath)} />
          ))}
        </nav>
        <div className="hidden items-center gap-3 lg:flex">
          <LanguageButton />
        </div>
        <button
          type="button"
          aria-label="切换菜单"
          onClick={onToggleMobile}
          className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-[var(--color-border)] text-[var(--color-brand-secondary)] lg:hidden"
        >
          <IconMenu className="h-5 w-5" />
        </button>
      </div>
      {mobileOpen ? (
        <div className="lg:hidden">
          <nav className="space-y-6 border-t border-[var(--color-border)] bg-white px-4 py-6">
            <div className="space-y-2">
              {links.map((link) => (
                <MobileLink
                  key={link.slug ?? link.href}
                  link={link}
                  currentPath={currentPath}
                  onNavigate={onCloseMobile}
                />
              ))}
            </div>
            <LanguageButton variant="mobile" />
          </nav>
        </div>
      ) : null}
    </header>
  );
}

function DesktopNavItem({ link, isActive }: { link: NavigationLink; isActive?: boolean }) {
  const { locale } = useI18n();
  const hasChildren = Boolean(link.children?.length);
  return (
    <div className="relative group">
      <Link
        href={link.href}
        className={cn(
          "text-sm font-medium transition-colors hover:text-[var(--color-brand-primary)]",
          isActive ? "text-[var(--color-brand-primary)]" : "text-[var(--color-text-secondary)]",
        )}
      >
        {t(link.label, locale as LocaleKey)}
      </Link>
      {hasChildren ? (
        <div className="invisible absolute left-0 top-10 min-w-[200px] rounded-xl border border-[var(--color-border)] bg-white p-3  opacity-0 transition-all duration-150 group-hover:visible group-hover:opacity-100">
          <div className="flex flex-col gap-2">
            {link.children?.map((child) => (
              <Link
                key={child.slug ?? child.href}
                href={child.href}
                className="rounded-lg px-3 py-2 text-sm text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-brand-primary)]"
              >
                {t(child.label, locale as LocaleKey)}
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MobileLink({ link, currentPath, onNavigate }: { link: NavigationLink; currentPath: string; onNavigate: () => void }) {
  const { locale } = useI18n();
  const hasChildren = Boolean(link.children?.length);
  const [open, setOpen] = useState(false);
  const active = isLinkActive(link, currentPath);

  return (
    <div className="rounded-md border border-[var(--color-border)]">
      <button
        type="button"
        onClick={() => (hasChildren ? setOpen((prev) => !prev) : onNavigate())}
        className={cn(
          "flex w-full items-center justify-between px-4 py-3 text-sm font-semibold",
          active ? "bg-[var(--color-brand-primary)] text-white" : "text-[var(--color-brand-secondary)]",
        )}
      >
        <span>{t(link.label, locale as LocaleKey)}</span>
        {hasChildren ? <span>{open ? "▴" : "▾"}</span> : null}
      </button>
      {hasChildren ? (
        <div className={cn("border-t border-[var(--color-border)] bg-[var(--color-surface-muted)]", open ? "block" : "hidden")}
        >
          {link.children?.map((child) => (
            <Link
              key={child.slug ?? child.href}
              href={child.href}
              className="block px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-white"
              onClick={onNavigate}
            >
              {t(child.label, locale as LocaleKey)}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}

interface LanguageButtonProps {
  variant?: "desktop" | "mobile";
}

function LanguageButton({ variant = "desktop" }: LanguageButtonProps) {
  const { locale, setLocale, availableLocales, t: tUi } = useI18n();
  const [open, setOpen] = useState(false);

  const buttonClasses = cn(
    "inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] px-4 py-2 text-sm font-medium transition",
    variant === "desktop"
      ? "text-[var(--color-text-secondary)] hover:border-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary)]"
      : "w-full justify-between text-[var(--color-brand-secondary)]",
  );

  const handleSelect = (code: LocaleKey) => {
    setLocale(code);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button type="button" className={buttonClasses} onClick={() => setOpen((prev) => !prev)}>
        <span className="flex items-center gap-2">
          <IconGlobe className="h-4 w-4" />
          {localeOptions[locale]?.label ?? tUi("nav.language.zh-CN")}
        </span>
        <IconChevronDown className="h-3 w-3" />
      </button>
      {open ? (
        <ul
          className={cn(
            "absolute right-0 z-50 mt-2 min-w-[200px] rounded-xl border border-[var(--color-border)] bg-white p-2 ",
            variant === "mobile" ? "left-0 right-auto" : "",
          )}
        >
          {availableLocales.map((code) => (
            <li key={code}>
              <button
                type="button"
                onClick={() => handleSelect(code)}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition hover:bg-[var(--color-surface-muted)]",
                  code === locale ? "text-[var(--color-brand-primary)]" : "text-[var(--color-text-secondary)]",
                )}
              >
                <span>{localeOptions[code]?.label}</span>
                {code === locale ? <IconCheck className="h-4 w-4" /> : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function isLinkActive(link: NavigationLink, pathname: string): boolean {
  if (!link?.href) return false;

  const normalize = (value: string) => (value.endsWith("/") && value !== "/" ? value.slice(0, -1) : value);
  const current = normalize(pathname || "/");
  const target = normalize(link.href);

  if (target === "/") {
    return current === "/";
  }

  if (current === target || current.startsWith(`${target}/`)) {
    return true;
  }

  if (Array.isArray(link.children) && link.children.length) {
    return link.children.some((child) => isLinkActive(child, current));
  }

  return false;
}

interface FooterProps {
  footer: FooterConfig;
  navigation: NavigationConfig;
  mainLinks: NavigationLink[];
}

function Footer({ footer, navigation, mainLinks }: FooterProps) {
  const columnLinks: FooterLinkGroup[] = mainLinks
    .map((link) => {
      const children = Array.isArray(link.children) ? link.children : [];
      if (!children.length) {
        return null;
      }

      const links: FooterLink[] = children
        .filter((child): child is NavigationLink => typeof child?.href === "string")
        .map((child) => ({ href: child.href, label: t(child.label) }));

      if (!links.length) {
        return null;
      }

      const group: FooterLinkGroup = {
        title: t(link.label),
        links,
        slug: link.slug,
      };

      return group;
    })
    .filter((group): group is FooterLinkGroup => Boolean(group));

  const fallbackSource = footer.navigationGroups ?? navigation.navigationGroups ?? [];

  const fallbackColumns: FooterLinkGroup[] = fallbackSource.map((group) => {
    const links = (group.links ?? []).map((item) => ({
      href: item.href,
      label: t(item.label),
    }));

    return {
      title: t(group.title),
      links,
    } satisfies FooterLinkGroup;
  });

  const columns: FooterLinkGroup[] = columnLinks.length ? columnLinks : fallbackColumns;

  const orderedColumns: FooterLinkGroup[] = (() => {
    const arr = [...columns];
    const idx = arr.findIndex(
      (g) => g.slug === "about" || g.title === "关于时代" || g.title === "About" || g.title === "About TIMES TENT",
    );
    if (idx >= 0) {
      const [aboutGroup] = arr.splice(idx, 1);
      arr.push(aboutGroup);
    }
    return arr;
  })();

  const quickOrder = ["home", "videos", "news", "contact"] as const;
  const quickLinks: FooterLink[] = quickOrder
    .map((slug) => mainLinks.find((link) => link.slug === slug))
    .filter((link): link is NavigationLink => Boolean(link))
    .map((link) => ({ href: link.href, label: t(link.label) }));

  const fallbackQuickLinks: FooterLink[] = [
    { href: "/", label: "首页" },
    { href: "/videos", label: "视频库" },
    { href: "/news", label: "新闻中心" },
    { href: "/contact", label: "联系方式" },
  ];

  const shortcuts: FooterLink[] = quickLinks.length ? quickLinks : fallbackQuickLinks;
  const brandNameZh = t(footer.brand.name);
  const brandNameEn =
    typeof footer.brand.name === "object" && footer.brand.name
      ? footer.brand.name["en"] ?? brandNameZh
      : brandNameZh;
  const contactPhones = getFooterContactPhones(footer.contact);

  return (
    <footer className="relative mt-0 overflow-hidden bg-[var(--color-brand-secondary)] text-white">
      <div className="mx-auto w-full max-w-[1200px] space-y-12 px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[minmax(280px,320px)_minmax(0,1fr)] lg:items-start lg:gap-16">
          <div className="space-y-6">
            <Image src={footer.brand.logo} alt={brandNameZh} width={240} height={60} className="h-10 w-auto md:h-12" />
            <div className="space-y-1 text-white">
              <p className="whitespace-nowrap text-2xl font-semibold tracking-[0.08em]">{brandNameZh}</p>
              <p className="whitespace-nowrap text-[0.95rem] font-medium tracking-[0.09em] text-white/80">{brandNameEn}</p>
            </div>
            <div className="grid grid-cols-[0.8rem,1fr] items-start gap-x-1 gap-y-2 text-sm text-white/80">
              <span className="relative -top-[2px] flex items-start justify-center text-white/80">
                <IconMapPin className="h-5 w-5" />
              </span>
              <p className="font-medium leading-snug">{t(footer.contact.address)}</p>
              {contactPhones.map((phone, index) => {
                const trimmedLabel = resolveLabel(phone.label, "电话");
                const trimmedHref = (phone.href ?? "").trim();
                const fallbackHref = trimmedLabel ? `tel:${trimmedLabel.replace(/\s+/g, "")}` : "#";
                const IconComponent = PHONE_ICON_COMPONENTS[index] ?? IconPhoneClassic;
                const iconSizeClass = index === 0 ? "h-[14px] w-[14px]" : "h-4 w-4";
                return (
                  <Fragment key={`footer-phone-${index}`}>
                    <span className="flex items-start justify-center pt-[2px] text-white/75">
                      <IconComponent className={iconSizeClass} />
                    </span>
                    <a href={trimmedHref || fallbackHref} className="transition hover:text-white">
                      {trimmedLabel}
                    </a>
                  </Fragment>
                );
              })}
              <span className="flex items-start justify-center pt-[2px] text-white/80">
                <IconMail className="h-4 w-4" />
              </span>
              <a href={footer.contact.email.href} className="transition hover:text-white">
                {resolveLabel(footer.contact.email.label, "邮箱")}
              </a>
            </div>
          </div>
          <nav className="ml-auto flex w-full flex-wrap items-start justify-end gap-8 sm:gap-10 lg:gap-14 text-sm text-white/75">
            {orderedColumns.map((group) => (
              <div key={group.title} className="w-fit space-y-3 text-center">
                <p className="text-base font-bold tracking-wide text-[var(--color-brand-primary)]">{group.title}</p>
                <ul className="space-y-2 text-center">
                  {group.links.map((item) => (
                    <li key={item.href}>
                      <Link href={item.href} className="transition hover:text-white">
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>
        <div className="flex flex-wrap gap-4 border-t border-white/10 pt-6 text-xs text-white/60">
          {shortcuts.map((item) => (
            <Link key={item.href} href={item.href} className="transition hover:text-white">
              {item.label}
            </Link>
          ))}
        </div>
        <div className="flex flex-col gap-2 border-t border-white/10 pt-6 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between">
          <p>{t(footer.legal.copyright)}</p>
          <div className="flex flex-wrap gap-3">
            <Link href={footer.legal.privacy.href} className="transition hover:text-white">
              {t(footer.legal.privacy.label)}
            </Link>
            <Link href={footer.legal.terms.href} className="transition hover:text-white">
              {t(footer.legal.terms.label)}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}


function RightRail({ config, footer }: { config: RightRailConfig; footer: FooterConfig }) {
  const [chatOpen, setChatOpen] = useState(false);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const { t: tUi } = useI18n();
  const buttons = (config.buttons ?? []).slice(0, 3);
  const contactPhones = getFooterContactPhones(footer.contact);
  const [showTop, setShowTop] = useState(false);
  useEffect(() => {
    const handleScroll = () => setShowTop(window.scrollY > 20);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  return (
    <div className="pointer-events-none fixed bottom-6 right-3 z-40 flex flex-col items-end gap-3 sm:right-5">
      {buttons.map((button, index) => {
        const iconName = button.icon ?? "phone";
        const fallbackKey = index === 0 ? "phone" : index === 1 ? "mail" : "visit";
        const tooltipKey = button.id ?? fallbackKey;
        const labelText = t(button.label ?? {}) || tUi(`rightRail.${fallbackKey}`);
        // 强制从页脚读取描述与链接，确保统一性
        let descriptionText = "";
        let hrefText = "#";

        if (fallbackKey === "phone") {
          const primaryPhone = contactPhones[0];
          if (primaryPhone) {
            const primaryLabel = resolveLabel(primaryPhone.label, tUi("rightRail.phone.description"));
            const rawHref = primaryPhone.href?.trim();
            hrefText = rawHref || (primaryLabel ? `tel:${primaryLabel.replace(/\s+/g, "")}` : button.href ?? "#");
            descriptionText = primaryLabel;
          } else {
            hrefText = button.href ?? "#";
            descriptionText = tUi("rightRail.phone.description");
          }
        } else if (fallbackKey === "mail") {
          hrefText = footer?.contact?.email?.href ?? button.href ?? "#";
          descriptionText = resolveLabel(footer?.contact?.email?.label, tUi("rightRail.mail.description"));
        } else {
          const addressI18n = footer?.contact?.address ? t(footer.contact.address) : "";
          descriptionText = addressI18n || tUi("rightRail.visit.description");
          hrefText = button.href ?? "#";
        }

        const variant = fallbackKey === "phone" || fallbackKey === "mail" ? "flat" : "default";

        return (
          <RailButton
            key={button.id ?? button.href ?? index}
            label={labelText}
            description={descriptionText}
            href={hrefText}
            target={button.target}
            icon={renderRailIcon(iconName)}
            iconLarge={renderRailIcon(iconName, "large")}
            active={activeTooltip === tooltipKey}
            onHover={(state) => setActiveTooltip(state ? tooltipKey : null)}
            variant={variant}
          />
        );
      })}
      <div className="pointer-events-auto relative">
        <ChatPanel open={chatOpen} />
        <button
          type="button"
          aria-label={tUi("rightRail.chat.aria")}
          onClick={() => setChatOpen((open) => !open)}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-brand-secondary)] text-white  transition hover:scale-105"
        >
          <CustomerIcon className="h-6 w-6" />
        </button>
      </div>
      <button
        type="button"
        aria-label={tUi("rightRail.top")}
        aria-hidden={!showTop}
        tabIndex={showTop ? 0 : -1}
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className={`flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-brand-secondary)] text-white  transition duration-200 hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${showTop ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
      >
        <IconArrowUp className="h-4 w-4" />
      </button>
    </div>
  );
}

interface RailButtonProps {
  label: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  iconLarge: React.ReactNode;
  target?: string;
  active: boolean;
  onHover: (open: boolean) => void;
  variant?: "default" | "flat";
}

function RailButton({ label, description, href, icon, iconLarge, target, active, onHover, variant = "default" }: RailButtonProps) {
  const isFlat = variant === "flat";
  const showTooltip = description.trim().length > 0;

  const handleHover = (state: boolean) => {
    if (!showTooltip) return;
    onHover(state);
  };

  const buttonClass = isFlat
    ? "flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-brand-primary)] text-white transition-colors duration-200 hover:bg-[var(--color-brand-primary)]/90"
    : "flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-brand-primary)] text-white shadow-lg transition-transform duration-200 hover:scale-105";

  return (
    <div
      className="pointer-events-auto relative flex items-center justify-end gap-3"
      onMouseEnter={() => handleHover(true)}
      onMouseLeave={() => handleHover(false)}
    >
      {showTooltip ? (
        <div
          className={cn(
            "pointer-events-none absolute right-14 top-1/2 -translate-y-1/2 transform transition duration-200",
            active ? "translate-x-0 opacity-100" : "translate-x-1 opacity-0",
          )}
        >
          <div className="relative rounded-md border border-[var(--color-border)] bg-white px-4 py-3 text-xs text-[var(--color-brand-secondary)] shadow-2xl">
            <span className="absolute right-[-7px] top-1/2 h-4 w-4 -translate-y-1/2 rotate-45 rounded-sm border border-[var(--color-border)] bg-white" />
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--color-text-secondary)]">{label}</p>
            <div className="mt-2 flex items-center gap-2 whitespace-nowrap text-sm">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)]">
                {icon}
              </span>
              <span className="font-medium">{description}</span>
            </div>
          </div>
        </div>
      ) : null}
      <Link
        href={href}
        target={target}
        rel={target === "_blank" ? "noopener noreferrer" : undefined}
        className={buttonClass}
      >
        {iconLarge}
      </Link>
    </div>
  );
}

function ChatPanel({ open }: { open: boolean }) {
  if (!open) return null;
  return (
    <div className="pointer-events-auto mb-2 w-[300px] overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white ">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full  text-[var(--color-brand-primary)]">
            <IconMessage className="h-4 w-4" />
          </span>
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-text-secondary)]">Chat</span>
        </div>
        <div className="text-xs text-[var(--color-text-tertiary)]">Beta</div>
      </div>
      <div className="p-3">
        <div className="space-y-2 text-sm">
          <p>我们的Advisor将通过微信为您提供产品咨询与方案定制服务。</p>
          <p>稍后我们会在右下角为您打开对话窗口。</p>
          <div className="mt-3">
            <QuickChip>产品选型</QuickChip>
            <QuickChip>场景设计</QuickChip>
            <QuickChip>预算报价</QuickChip>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="mr-2 inline-flex items-center rounded-full bg-[var(--color-brand-secondary)]/5 px-2.5 py-1 text-xs font-medium text-[var(--color-brand-secondary)]">
      {children}
    </span>
  );
}

function renderRailIcon(name: string, size: "small" | "large" = "small"): React.ReactNode {
  const smallCls = "h-4 w-4";
  const largeCls = name === "phone" ? "h-5 w-5" : "h-6 w-6";
  const cls = size === "large" ? largeCls : smallCls;
  switch (name) {
    case "phone":
      return <IconPhone className={cls} />;
    case "mail":
      return <IconMail className={cls} />;
    case "map-pin":
      return <IconMapPin className={cls} />;
    case "visit":
      // 访问/地址统一使用地图定位图标
      return <IconMapPin className={cls} />;
    default:
      return <IconPhone className={cls} />;
  }
}

function IconGlobe(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <circle cx={12} cy={12} r={9} stroke="currentColor" strokeWidth={1.5} />
      <path d="M12 3c-2.4 2.4-3.75 5.7-3.75 9s1.35 6.6 3.75 9c2.4-2.4 3.75-5.7 3.75-9s-1.35-6.6-3.75-9Z" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5.5 8a17 17 0 0 0 13 0" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
      <path d="M5.5 16a17 17 0 0 1 13 0" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
    </svg>
  );
}

function IconChevronDown(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconCheck(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path d="M5 12l4 4 10-10" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconMenu(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
    </svg>
  );
}


function IconPhoneClassic(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <rect x={7} y={3} width={10} height={18} rx={1.5} stroke="currentColor" strokeWidth={1.5} />
      <path d="M10 6h4" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
      <circle cx={12} cy={18} r={0.9} fill="currentColor" />
    </svg>
  );
}

function IconPhoneDesk(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path
        d="M6 11h12a1.1 1.1 0 011.1 1.1v4.6A1.1 1.1 0 0118 17.8H6a1.1 1.1 0 01-1.1-1.1v-4.6A1.1 1.1 0 016 11z"
        stroke="currentColor"
        strokeWidth={1.5}
      />
      <path
        d="M8.3 9c0-2.12 1.72-3.85 3.7-3.85s3.7 1.73 3.7 3.85"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      <path d="M10.3 15h3.4" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
    </svg>
  );
}

function IconPhoneMobile(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <rect x={6} y={2} width={12} height={20} rx={2.5} stroke="currentColor" strokeWidth={1.5} />
      <path d="M9 6h6" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
      <rect x={8.75} y={8.75} width={6.5} height={8.5} rx={1.2} stroke="currentColor" strokeWidth={1.3} />
      <circle cx={12} cy={17.8} r={0.9} fill="currentColor" />
    </svg>
  );
}

function IconMapPin(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path d="M12 21s-6-5.686-6-10a6 6 0 1112 0c0 4.314-6 10-6 10z" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={12} cy={11} r={3} stroke="currentColor" strokeWidth={1.5} />
    </svg>
  );
}

function IconPhone(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path
        d="M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconMail(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path d="M4 7h16v10H4V7zm0 0l8 6 8-6" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconSparkles(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path d="M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5z" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconMessage(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719" />
    </svg>
  );
}

function IconArrowUp(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M8 3.2 2.8 8.4l1.44 1.44L7.2 6.88V14h1.6V6.88l2.96 2.96 1.44-1.44L8 3.2Z" fill="currentColor" />
    </svg>
  );
}

function CustomerIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <circle cx={12} cy={12} r={10} fill="#FBD5D5" />
      <path d="M7.4 13.4c0 2.4 2.1 4.4 4.6 4.4s4.6-2 4.6-4.4" stroke="#7A2E2E" strokeWidth={1.3} strokeLinecap="round" />
      <path d="M8.5 9.6c0-2.1 1.7-3.9 3.5-3.9s3.5 1.8 3.5 3.9" stroke="#7A2E2E" strokeWidth={1.3} strokeLinecap="round" />
      <circle cx={10.4} cy={11.4} r={0.8} fill="#7A2E2E" />
      <circle cx={13.6} cy={11.4} r={0.8} fill="#7A2E2E" />
      <path d="M11.1 13.6h1.8" stroke="#7A2E2E" strokeWidth={1.1} strokeLinecap="round" />
      <path d="M5.8 11.8c-.7 0-1.2.6-1.2 1.3s.5 1.3 1.2 1.3" stroke="#7A2E2E" strokeWidth={1.2} strokeLinecap="round" />
      <path d="M18.2 11.8c.7 0 1.2.6 1.2 1.3s-.5 1.3-1.2 1.3" stroke="#7A2E2E" strokeWidth={1.2} strokeLinecap="round" />
      <path d="M10 17.6v1c0 .6.5 1.1 1.1 1.1h1.8c.6 0 1.1-.5 1.1-1.1v-1" stroke="#7A2E2E" strokeWidth={1.2} strokeLinecap="round" />
      <path d="M9 8.3c1.2 0 2.1-1 2.1-2.2" stroke="#7A2E2E" strokeWidth={1.2} strokeLinecap="round" />
      <path d="M15 8.3c-1.2 0-2.1-1-2.1-2.2" stroke="#7A2E2E" strokeWidth={1.2} strokeLinecap="round" />
    </svg>
  );
}
