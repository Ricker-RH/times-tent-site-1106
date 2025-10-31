import { PlaceholderPage } from "@/components/PlaceholderPage";

import { ensurePageVisible } from "@/server/visibility";

export const metadata = {
  title: "加入我们 | 时代篷房",
  description: "加入时代篷房，参与模块化空间的设计与交付。",
};

export default function CareersPage() {
  return (
    <PlaceholderPage
      title="招聘信息即将发布"
      description="我们正在完善招聘系统，如需投递简历，请发送至 Winnk@timestent.com。"
    />
  );
}
