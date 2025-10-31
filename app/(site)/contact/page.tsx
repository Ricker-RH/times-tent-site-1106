import type { JSX } from "react";
import { ensurePageVisible, getHiddenSections } from "@/server/visibility";

import { ContactHeroSection } from "@/components/contact/ContactHeroSection";
import { ContactChannelsSection } from "@/components/contact/ContactChannelsSection";
import { ContactFormSection } from "@/components/contact/ContactFormSection";
import { ContactGuaranteeSection } from "@/components/contact/ContactGuaranteeSection";
import { getCasesConfig, getContactConfig, type CaseCategory } from "@/server/pageConfigs";

export const metadata = {
  title: "联系方式 | 时代篷房",
  description: "联系时代篷房，获取赛事、文旅、工业等模块化篷房解决方案，支持方案咨询、现场勘察与全国化服务。",
};

export default async function Page(): Promise<JSX.Element> {
  const visibility = await ensurePageVisible("contact");
  const hiddenSections = getHiddenSections(visibility, "contact");
  const hideHero = hiddenSections.hero === true;
  const hideChannels = hiddenSections.channels === true;
  const hideForm = hiddenSections.form === true;
  const hideGuarantee = hiddenSections.guarantee === true;
  const [config, casesConfig] = await Promise.all([getContactConfig(), getCasesConfig()]);
  const hero = config.hero;
  const contactSection = config.contactSection;
  const connectSection = config.connectSection;
  const guaranteeSection = config.guaranteeSection;
  const categories: CaseCategory[] = Array.isArray(casesConfig.categories)
    ? (casesConfig.categories as CaseCategory[])
    : [];
  const scenarioOptions = categories
    .map((category) => {
      const slug = typeof category.slug === "string" ? category.slug : "";
      const name = typeof category.name === "string" ? category.name : "";
      return {
        value: slug,
        label: name || slug,
      };
    })
    .filter((option) => option.value);

  return (
    <main className="flex-1">
      <div className="relative bg-white pb-20">
        {!hideHero && hero ? <ContactHeroSection hero={hero} /> : null}
        {!hideChannels && contactSection ? <ContactChannelsSection section={contactSection} /> : null}
        {!hideForm && connectSection ? (
          <ContactFormSection section={connectSection} scenarios={scenarioOptions} />
        ) : null}
        {!hideGuarantee && guaranteeSection ? <ContactGuaranteeSection section={guaranteeSection} /> : null}
      </div>
    </main>
  );
}
