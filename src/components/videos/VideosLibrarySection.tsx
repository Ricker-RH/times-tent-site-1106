"use client";

"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";

import { t } from "@/data";
import type { VideoItem, VideosSectionHeading } from "@/types/videos";

type FilterSlug = string;

const DEFAULT_FILTERS: Array<{ slug: FilterSlug; label: Record<string, string> }> = [
  {
    slug: "all",
    label: { "zh-CN": "全部视频", "zh-TW": "全部影片", en: "All Videos" },
  },
  {
    slug: "events",
    label: { "zh-CN": "体育赛事", "zh-TW": "體育賽事", en: "Sports Events" },
  },
  {
    slug: "venues",
    label: { "zh-CN": "体育场馆", "zh-TW": "體育場館", en: "Sports Venues" },
  },
  {
    slug: "hospitality",
    label: { "zh-CN": "酒店文旅", "zh-TW": "酒店文旅", en: "Hospitality" },
  },
  {
    slug: "industrial",
    label: { "zh-CN": "工业仓储", "zh-TW": "工業倉儲", en: "Industrial" },
  },
  {
    slug: "brand",
    label: { "zh-CN": "品牌活动", "zh-TW": "品牌活動", en: "Brand Events" },
  },
];

const buildVideoUrl = (video: VideoItem) =>
  video.bvid ? `https://player.bilibili.com/player.html?bvid=${video.bvid}&page=1&high_quality=1&as_wide=1` : "";

interface VideosLibrarySectionProps {
  sectionHeading: VideosSectionHeading;
  videos: VideoItem[];
  filters?: Array<{ slug: FilterSlug; label?: Record<string, string | undefined> | string }>;
}

export function VideosLibrarySection({ sectionHeading, videos, filters }: VideosLibrarySectionProps): JSX.Element {
  const normalizedFilters = useMemo(() => {
    if (filters?.length) {
      return filters.map((filter) => ({
        slug: filter.slug || "",
        label: filter.label ?? { "zh-CN": filter.slug, "zh-TW": filter.slug, en: filter.slug },
      }));
    }
    return DEFAULT_FILTERS;
  }, [filters]);

  const [activeVideo, setActiveVideo] = useState<VideoItem | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterSlug>(() => normalizedFilters[0]?.slug ?? "all");

  const filteredVideos = useMemo(() => {
    if (activeFilter === "all") {
      return videos;
    }
    return videos.filter((video) => video.category === activeFilter);
  }, [activeFilter, videos]);

  const closeVideo = useCallback(() => {
    setActiveVideo(null);
  }, []);

  useEffect(() => {
    if (!activeVideo) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeVideo();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeVideo, closeVideo]);

  useEffect(() => {
    if (!activeVideo) return;
    const originalStyle = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, [activeVideo]);

  const handleOpenVideo = useCallback((video: VideoItem) => {
    if (!video.bvid) {
      return;
    }
    setActiveVideo(video);
  }, []);

  return (
    <section className="bg-white pt-8">
      <div className="mx-auto w-full max-w-[1200px] space-y-6 px-4 pb-16 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 text-left md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl space-y-2">
            <h2 className="text-2xl font-bold text-[var(--color-brand-secondary)] md:text-3xl">
              {t(sectionHeading.title)}
            </h2>
            <p className="text-base text-[var(--color-text-secondary)]">
              {t(sectionHeading.description)}
            </p>
          </div>
        </div>

        <div className="space-y-8">
          <div className="flex flex-wrap gap-2">
            {normalizedFilters.map((filter) => (
              <button
                key={filter.slug}
                type="button"
                onClick={() => setActiveFilter(filter.slug)}
                className={`rounded-md border px-4 py-2 text-xs font-semibold transition ${
                  filter.slug === activeFilter
                    ? 'border-[var(--color-brand-primary)] bg-[var(--color-brand-primary)] text-white shadow'
                    : 'border-[var(--color-border)] bg-white text-[var(--color-brand-secondary)] hover:border-[var(--color-brand-primary)]/70'
                }`}
              >
                {resolveLabel(filter.label)}
              </button>
            ))}
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filteredVideos.map((video) => {
              const categoryLabel = resolveCategoryLabel(video.category, normalizedFilters);
              const tags = video.tags?.map((tag) => t(tag)) ?? [];

              return (
                <article
                  key={video.slug}
                  className="group overflow-hidden rounded-lg border border-[var(--color-border)] bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                >
                  <div className="relative h-56 overflow-hidden">
                    <Image
                      src={video.thumbnail}
                      alt={t(video.title)}
                      fill
                      sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
                      className="object-cover transition duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-b from-black/65 via-black/20 to-black/70 p-4 text-white">
                      <div className="flex justify-center pb-4">
                        <button
                          type="button"
                          onClick={() => handleOpenVideo(video)}
                          className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-white/85 text-[var(--color-brand-secondary)] shadow-lg transition hover:bg-white"
                          aria-label={`播放视频：${t(video.title)}`}
                        >
                          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden="true">
                            <path d="M8.5 6.75v10.5l8.25-5.25-8.25-5.25z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 p-6">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-brand-primary)]/80">
                        {categoryLabel}
                      </p>
                      <h3 className="text-lg font-semibold text-[var(--color-brand-secondary)]">
                        {t(video.title)}
                      </h3>
                    </div>
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      {t(video.description)}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-md bg-[var(--color-surface-muted)] px-3 py-1 text-xs font-medium text-[var(--color-brand-secondary)]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>

      {activeVideo ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-4 py-8"
          role="dialog"
          aria-modal="true"
          aria-labelledby="active-video-title"
          onClick={closeVideo}
        >
          <button
            type="button"
            onClick={closeVideo}
            className="absolute right-6 top-6 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-[var(--color-brand-secondary)] shadow-lg transition hover:bg-white"
            aria-label="关闭视频"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
              <path d="M6.225 4.811 4.81 6.225 10.586 12l-5.775 5.775 1.414 1.414L12 13.414l5.775 5.775 1.414-1.414L13.414 12l5.775-5.775-1.414-1.414L12 10.586 6.225 4.811Z" />
            </svg>
          </button>

          <div
            className="w-full max-w-4xl space-y-4"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black shadow-2xl">
              <iframe
                key={activeVideo.bvid}
                src={buildVideoUrl(activeVideo)}
                allow="autoplay; fullscreen"
                allowFullScreen
                title={t(activeVideo.title)}
                className="h-full w-full"
              />
            </div>
            <div className="space-y-2 text-center text-white">
              <h3 id="active-video-title" className="text-xl font-semibold">
                {t(activeVideo.title)}
              </h3>
              <p className="text-sm text-white/80">{t(activeVideo.description)}</p>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function resolveLabel(label: Record<string, string | undefined> | string | undefined): string {
  if (!label) return "";
  if (typeof label === "string") return label;
  return t(label);
}

function resolveCategoryLabel(slug: string, filters: Array<{ slug: string; label?: Record<string, string | undefined> | string }>): string {
  const match = filters.find((item) => item.slug === slug);
  if (!match) return slug;
  return resolveLabel(match.label) || slug;
}
