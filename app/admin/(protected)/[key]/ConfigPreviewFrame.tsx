"use client";

import { useEffect, useRef, useState } from "react";

import { useLocale } from "@/providers/LocaleProvider";

interface ConfigPreviewFrameProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  maxHeight?: number | null;
  scale?: number;
  viewportWidth?: number;
  autoScale?: boolean;
}

export function ConfigPreviewFrame({
  title,
  description,
  children,
  maxHeight = 560,
  scale = 0.75,
  viewportWidth = 1100,
  autoScale = false,
}: ConfigPreviewFrameProps) {
  const clampedScale = Math.min(Math.max(scale, 0.4), 1.6);
  const [measuredScale, setMeasuredScale] = useState(clampedScale);
  const containerRef = useRef<HTMLDivElement>(null);
  const { locale } = useLocale();

  useEffect(() => {
    if (!autoScale) {
      setMeasuredScale(clampedScale);
      return;
    }

    const element = containerRef.current;
    if (!element || typeof ResizeObserver === "undefined") return;

    const updateScale = () => {
      const width = element.clientWidth;
      if (!width) return;
      const next = width / viewportWidth;
      setMeasuredScale(Math.min(Math.max(next, 0.5), 1.6));
    };

    updateScale();

    const observer = new ResizeObserver(updateScale);
    observer.observe(element);
    return () => observer.disconnect();
  }, [autoScale, viewportWidth, clampedScale]);

  const effectiveScale = autoScale ? measuredScale : clampedScale;
  const scaledWidth = viewportWidth * effectiveScale;

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-[var(--color-brand-secondary)]">{title}</h3>
        {description ? (
          <p className="text-xs text-[var(--color-text-secondary)]">{description}</p>
        ) : null}
      </div>
      <div ref={containerRef} className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white/95 shadow-sm">
        <div className="bg-[var(--color-surface-muted)] p-4 text-[10px] uppercase tracking-[0.35em] text-[var(--color-text-tertiary,#8690a3)]">
          实时渲染预览
        </div>
        <div
          className="overflow-auto bg-white"
          style={typeof maxHeight === "number" ? { maxHeight } : undefined}
        >
          <div style={{ width: scaledWidth }}>
            <div
              key={locale}
              style={{
                width: viewportWidth,
                transform: `scale(${effectiveScale})`,
                transformOrigin: "top left",
              }}
            >
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
