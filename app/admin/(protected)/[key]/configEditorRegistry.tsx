import type { ComponentType } from "react";

import { StructuredConfigEditor } from "./StructuredConfigEditor";
import { NewsConfigEditor } from "./NewsConfigEditor";
import { CasesConfigEditor } from "./CasesConfigEditor";
import { ContactConfigEditor } from "./ContactConfigEditor";
import { VideosConfigEditor } from "./VideosConfigEditor";
import { FooterConfigEditor } from "./FooterConfigEditor";
import { AboutConfigEditor } from "./AboutConfigEditor";
import { InventoryConfigEditor } from "./InventoryConfigEditor";
import { NavigationConfigEditor } from "./NavigationConfigEditor";
import { HomeConfigEditor } from "./HomeConfigEditor";
import { ProductCenterConfigEditor } from "./ProductCenterConfigEditor";
import { ProductDetailConfigEditorWrapper } from "./ProductDetailConfigEditorWrapper";
import { VisibilityConfigEditor } from "./VisibilityConfigEditor";
import { PrivacyPolicyConfigEditor } from "./PrivacyPolicyConfigEditor";
import { TermsConfigEditor } from "./TermsConfigEditor";
import { RightRailConfigEditor } from "./RightRailConfigEditor";
import { VISIBILITY_CONFIG_KEY } from "@/constants/visibility";

export interface AdminConfigEditorProps {
  configKey: string;
  initialConfig: Record<string, unknown>;
  relatedData?: Record<string, unknown>;
}

const CONFIG_EDITOR_REGISTRY: Record<string, ComponentType<AdminConfigEditorProps>> = {
  "首页": HomeConfigEditor,
  "案例展示": CasesConfigEditor,
  "现货库存": InventoryConfigEditor,
  "新闻中心": NewsConfigEditor,
  "关于时代": AboutConfigEditor,
  "联系方式": ContactConfigEditor,
  "视频库": VideosConfigEditor,
  "尾页": FooterConfigEditor,
  "导航栏": NavigationConfigEditor,
  "产品中心": ProductCenterConfigEditor,
  "模块化产品矩阵123": ProductCenterConfigEditor,
  "产品详情": ProductDetailConfigEditorWrapper,
  "隐私政策": PrivacyPolicyConfigEditor,
  "服务条款": TermsConfigEditor,
  "右侧小按钮": RightRailConfigEditor,
  [VISIBILITY_CONFIG_KEY]: VisibilityConfigEditor,
};

export function getConfigEditorComponent(configKey: string): ComponentType<AdminConfigEditorProps> {
  return CONFIG_EDITOR_REGISTRY[configKey] ?? StructuredConfigEditor;
}
