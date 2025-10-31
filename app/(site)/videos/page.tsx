import type { JSX } from "react";
import { notFound } from "next/navigation";
import { ensurePageVisible, getHiddenSections } from "@/server/visibility";

import { VideosHeroSection } from "@/components/videos/VideosHeroSection";
import { VideosLibrarySection } from "@/components/videos/VideosLibrarySection";
import { getVideosConfig } from "@/server/siteConfigs";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "视频库 | 时代篷房",
  description: "通过精选视频了解时代篷房在赛事、文旅、工业、品牌活动中的真实场景与交付能力。",
};

export default async function Page(): Promise<JSX.Element> {
  const visibility = await ensurePageVisible("videos");
  const hiddenSections = getHiddenSections(visibility, "videos");
  const hideHero = hiddenSections.hero === true;
  const hideLibrary = hiddenSections.library === true;
  const config = await getVideosConfig();

  if (!config || !config.hero || !config.sectionHeading) {
    notFound();
  }

  return (
    <main className="flex-1">
      <div className="bg-white pb-20">
        {!hideHero ? <VideosHeroSection hero={config.hero} /> : null}
        {!hideLibrary ? (
          <VideosLibrarySection
            sectionHeading={config.sectionHeading}
            filters={config.filters}
            videos={config.items ?? []}
          />
        ) : null}
      </div>
    </main>
  );
}
