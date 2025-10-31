import { PlaceholderPage } from "@/components/PlaceholderPage";

import { ensurePageVisible } from "@/server/visibility";

export const metadata = {
  title: "常见问题 | 时代篷房",
  description: "常见问题正在整理，暂可联系顾问获取详细解答。",
};

export default function FAQPage() {
  return (
    <PlaceholderPage
      title="常见问题正在更新"
      description="关于交付周期、结构安全、租赁流程等问题，我们的顾问将提供一对一解答。"
    />
  );
}
