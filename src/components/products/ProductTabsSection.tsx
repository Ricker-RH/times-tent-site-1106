"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

import type {
  ProductAccessoriesConfig,
  ProductDetailTabConfig,
  ProductDetailTabTarget,
  ProductIntroConfig,
  ProductSpecsConfig,
} from "@/types/productDetails";

interface ProductTabsSectionProps {
  tabs: ProductDetailTabConfig[];
  intro: ProductIntroConfig;
  specs: ProductSpecsConfig;
  accessories: ProductAccessoriesConfig;
  hiddenTargets?: Partial<Record<ProductDetailTabTarget, boolean>>;
}

export function ProductTabsSection({ tabs = [], intro, specs, accessories, hiddenTargets }: ProductTabsSectionProps) {
  const safeTabs = useMemo(() => (Array.isArray(tabs) ? tabs : []), [tabs]);
  const safeIntro = intro ?? { blocks: [] };
  const safeSpecs: ProductSpecsConfig = {
    columns: Array.isArray(specs?.columns) ? specs.columns : [],
    rows: Array.isArray(specs?.rows) ? specs.rows : [],
    caption: specs?.caption ?? "",
  };
  const safeAccessories: ProductAccessoriesConfig = {
    items: Array.isArray(accessories?.items) ? accessories.items : [],
  };
  const renderableTabs = useMemo(() => {
    return safeTabs.filter((tab) => {
      if (tab.visible === false) return false;
      if (hiddenTargets?.[tab.target]) return false;
      return true;
    });
  }, [safeTabs, hiddenTargets]);

  const [activeTabId, setActiveTabId] = useState<string>(() => renderableTabs[0]?.id ?? "");

  useEffect(() => {
    if (!renderableTabs.length) {
      setActiveTabId("");
      return;
    }
    if (!renderableTabs.some((tab) => tab.id === activeTabId)) {
      setActiveTabId(renderableTabs[0].id);
    }
  }, [renderableTabs, activeTabId]);

  if (!renderableTabs.length) {
    return null;
  }

  const activeTab = renderableTabs.find((tab) => tab.id === activeTabId) ?? renderableTabs[0];

  const renderIntro = () => {
    if (!safeIntro.blocks.length) {
      return <EmptyState message="暂无产品介绍内容" />;
    }
    const items = safeIntro.blocks
      .map((block) => {
        const hasContent = Boolean(block.title?.trim() || block.subtitle?.trim() || block.image?.trim());
        if (!hasContent) {
          return null;
        }
        return (
          <article
            key={block.id}
            className="rounded-2xl bg-white/80 p-4 sm:p-5"
          >
            {block.title ? <h3 className="text-lg font-semibold text-[var(--color-brand-secondary)]">{block.title}</h3> : null}
            {block.subtitle ? (
              <p className="mt-3 text-sm leading-[24px] text-[var(--color-text-secondary)]">{block.subtitle}</p>
            ) : null}
            {block.image ? (
              <div className="relative mt-4 aspect-video overflow-hidden rounded-xl bg-[var(--color-surface-muted)]">
                <Image src={block.image} alt={block.title || titleFallback(block.id)} fill className="object-cover" sizes="100vw" />
              </div>
            ) : null}
          </article>
        );
      })
      .filter(Boolean);
    if (!items.length) {
      return <EmptyState message="暂无产品介绍内容" />;
    }
    return <div className="space-y-2">{items}</div>;
  };

  const renderSpecs = () => {
    const hasRows = safeSpecs.rows.length > 0;
    const hasColumns = safeSpecs.columns.length > 0;
    if (!hasRows && !hasColumns) {
      return <EmptyState message="暂无产品参数" />;
    }
    return (
      <div className="space-y-4">
        <div className="overflow-x-auto rounded-2xl bg-white/80">
          <table className="min-w-full divide-y divide-[var(--color-border)] text-sm">
            {hasColumns ? (
              <thead>
                <tr className="bg-[var(--color-surface-muted)] text-left text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-brand-secondary)]">
                  {safeSpecs.columns.map((column, index) => (
                    <th key={`${column}-${index}`} className="px-4 py-3">
                      {column || `列 ${index + 1}`}
                    </th>
                  ))}
                </tr>
              </thead>
            ) : null}
            {hasRows ? (
              <tbody>
                {safeSpecs.rows.map((row, rowIndex) => (
                  <tr
                    key={`row-${rowIndex}`}
                    className={rowIndex % 2 === 0 ? "bg-white" : "bg-[var(--color-surface-muted)]/60"}
                  >
                    {row.map((cell, cellIndex) => (
                      <td key={`cell-${rowIndex}-${cellIndex}`} className="px-4 py-3 text-[var(--color-text-secondary)]">
                        {cell || "-"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            ) : null}
          </table>
        </div>
        {safeSpecs.caption ? (
          <p className="text-xs text-[var(--color-text-tertiary,#8690a3)]">{safeSpecs.caption}</p>
        ) : null}
      </div>
    );
  };

  const renderAccessories = () => {
    if (!safeAccessories.items.length) {
      return <EmptyState message="暂无可选配件" />;
    }
    const items = safeAccessories.items
      .map((item) => {
        const hasContent = Boolean(item.title?.trim() || item.description?.trim() || item.image?.trim());
        if (!hasContent) {
          return null;
        }
        return (
          <article key={item.id} className="flex flex-col items-center gap-3 text-center">
            {item.image ? (
              <div className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-[var(--color-surface-muted)] aspect-[16/9]">
                <Image src={item.image} alt={item.title || titleFallback(item.id)} fill className="object-cover" sizes="(min-width: 1024px) 20vw, 50vw" />
              </div>
            ) : null}
            {item.title ? <h3 className="text-sm font-semibold text-[var(--color-brand-secondary)]">{item.title}</h3> : null}
            {item.description ? (
              <p className="text-sm leading-[24px] text-[var(--color-text-secondary)]">{item.description}</p>
            ) : null}
          </article>
        );
      })
      .filter(Boolean);
    if (!items.length) {
      return <EmptyState message="暂无可选配件" />;
    }
    return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{items}</div>;
  };

  let content: JSX.Element | null = null;
  if (activeTab.target === "intro") {
    content = renderIntro();
  } else if (activeTab.target === "specs") {
    content = renderSpecs();
  } else if (activeTab.target === "accessories") {
    content = renderAccessories();
  }

  return (
    <section className="rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        {renderableTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTabId(tab.id)}
            className={`rounded-[6px] px-4 py-2 text-sm font-semibold transition ${
              tab.id === activeTab.id
                ? "bg-[var(--color-brand-primary)] text-white shadow"
                : "bg-[var(--color-surface-muted)] text-[var(--color-brand-secondary)] hover:bg-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="mt-4 h-px w-full bg-[var(--color-border)]"></div>
      <div className="mt-6">
        {content ?? <EmptyState message="暂无内容" />}
      </div>
    </section>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl bg-[var(--color-surface-muted)]/40 px-4 py-10 text-center text-sm text-[var(--color-text-tertiary,#8690a3)]">
      {message}
    </div>
  );
}

function titleFallback(id: string) {
  return id || "图片";
}
