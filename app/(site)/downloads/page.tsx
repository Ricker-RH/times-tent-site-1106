import { PlaceholderPage } from "@/components/PlaceholderPage";

import { ensurePageVisible } from "@/server/visibility";

export const metadata = {
  title: "下载中心 | 时代篷房",
  description: "下载中心正在恢复，暂时请联系顾问获取资料。",
};

export default function DownloadsPage() {
  return (
    <PlaceholderPage
      title="下载中心筹备中"
      description="若需高清图片、技术手册或项目案例，请通过联系方式索取。"
    >
      <p>我们将提供：</p>
      <ul className="mt-2 list-disc space-y-2 pl-5">
        <li>品牌识别与 LOGO 资产</li>
        <li>产品规格 PDF</li>
        <li>赛事与文旅项目影像素材</li>
      </ul>
    </PlaceholderPage>
  );
}
