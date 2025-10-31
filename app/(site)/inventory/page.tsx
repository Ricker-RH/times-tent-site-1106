import { ensurePageVisible, getHiddenSections } from "@/server/visibility";

import { getInventoryConfig } from "@/server/pageConfigs";

import InventoryClient, { type InventoryClientProps } from "./InventoryClient";

export const metadata = {
  title: "现货图库 | 时代篷房",
  description: "以海报形式浏览时代篷房现货模块，快速了解可用规格与所在仓储节点。",
};

export default async function InventoryPage() {
  const visibility = await ensurePageVisible("inventory");
  const hiddenSections = getHiddenSections(visibility, "inventory");
  const hideHero = hiddenSections.hero === true;
  const hideShowcase = hiddenSections.sections === true;
  const inventory = await getInventoryConfig();
  const sections = Array.isArray(inventory.showcaseSections)
    ? (inventory.showcaseSections as InventoryClientProps["sections"])
    : [];

  return (
    <InventoryClient
      hero={inventory.hero ?? null}
      sections={sections}
      hiddenSections={{ hero: hideHero, sections: hideShowcase }}
    />
  );
}
