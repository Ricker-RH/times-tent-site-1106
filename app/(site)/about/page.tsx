import type { JSX } from "react";
import { ensurePageVisible, getHiddenSections } from "@/server/visibility";

import { AboutHeroSection } from "@/components/about/AboutHeroSection";
import { AboutCompanySection } from "@/components/about/AboutCompanySection";
import { AboutFactorySection } from "@/components/about/AboutFactorySection";
import { AboutTeamSection } from "@/components/about/AboutTeamSection";
import { AboutHonorsSection } from "@/components/about/AboutHonorsSection";
import { AboutWhySection } from "@/components/about/AboutWhySection";
import { getAboutConfig } from "@/server/pageConfigs";

export const metadata = {
  title: "关于时代 | 时代篷房",
  description: "了解时代篷房的发展历程、团队与制造能力，探索模块化临建的设计与交付体系。",
};

export default async function Page(): Promise<JSX.Element> {
  const visibility = await ensurePageVisible("about");
  const hiddenSections = getHiddenSections(visibility, "about");
  const hideHero = hiddenSections.hero === true;
  const hideCompany = hiddenSections.company === true;
  const hideFactory = hiddenSections.factory === true;
  const hideTeam = hiddenSections.team === true;
  const hideHonors = hiddenSections.honors === true;
  const hideWhy = hiddenSections.why === true;
  const about = await getAboutConfig();

  return (
    <main className="flex-1">
      <div className="bg-white pb-20">
        {!hideHero ? <AboutHeroSection hero={about.hero} /> : null}
        {!hideCompany ? <AboutCompanySection introSection={about.introSection} /> : null}
        {!hideFactory ? <AboutFactorySection manufacturingSection={about.manufacturingSection} /> : null}
        {!hideTeam ? <AboutTeamSection teamSection={about.teamSection} /> : null}
        {!hideHonors ? <AboutHonorsSection honorsSection={about.honorsSection} /> : null}
        {!hideWhy ? <AboutWhySection whyUsSection={about.whyUsSection} /> : null}
      </div>
    </main>
  );
}
