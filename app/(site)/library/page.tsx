import { PlaceholderPage } from "@/components/PlaceholderPage";

import { ensurePageVisible } from "@/server/visibility";

export const metadata = {
  title: "资料库 | 时代篷房",
  description: "文档下载与媒体素材正在整理中，您可以通过联系方式索取最新版本。",
};

export default function LibraryPage() {
  return (
    <PlaceholderPage
      title="资料库建设中"
      description="资料下载、媒体素材与技术白皮书将很快回归，暂可联系顾问获取。"
    >
      <ul className="list-disc space-y-2 pl-5">
        <li>企业宣传册（中英文对照）</li>
        <li>核心产品规格手册</li>
        <li>赛事与文旅解决方案白皮书</li>
        <li>结构与安全合规资料</li>
      </ul>
    </PlaceholderPage>
  );
}
