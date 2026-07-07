import React from "react";
import type { FileTabState } from "../../types";
import { getViewerRouteByPath } from "../../viewer-registry";
import { detectLanguage } from "../../utils/fileTypeDetector";
import ErrorBoundary from "../ErrorBoundary";
import JsonViewer from "./JsonViewer";
import ImageViewer from "./ImageViewer";
import SvgViewer from "./SvgViewer";
import CadAssistant from "./CadAssistant";
import OpenMeRouteCard from "./OpenMeRouteCard";

const CodeEditor = React.lazy(() => import("./CodeEditor"));
const MarkdownViewer = React.lazy(() => import("./MarkdownViewer"));
const CsvViewer = React.lazy(() => import("./CsvViewer"));
const PdfViewer = React.lazy(() => import("./PdfViewer"));
const OfficeViewer = React.lazy(() => import("./OfficeViewer"));
const ZipViewer = React.lazy(() => import("./ZipViewer"));
const CadViewer = React.lazy(() => import("./CadViewer"));
const MediaViewer = React.lazy(() => import("./MediaViewer"));
const FontViewer = React.lazy(() => import("./FontViewer"));
const EpubViewer = React.lazy(() => import("./EpubViewer"));
const DwgViewer = React.lazy(() => import("./DwgViewer"));

interface ViewerRouterProps {
  tab: FileTabState;
  onChange: (content: string) => void;
}

export default function ViewerRouter({ tab, onChange }: ViewerRouterProps) {
  const route = getViewerRouteByPath(tab.path);

  if (tab.error) {
    return <OpenMeRouteCard tab={tab} route={route} title="OpenMe 已打开文件，但预览失败" description={tab.error} />;
  }

  switch (tab.category) {
    case "code":
      return <ViewerShell><CodeEditor content={tab.content ?? ""} language={detectLanguage(tab.path)} onChange={onChange} /></ViewerShell>;
    case "markdown":
      return <ViewerShell><MarkdownViewer content={tab.content ?? ""} onChange={onChange} /></ViewerShell>;
    case "json":
      return <ViewerShell><JsonViewer content={tab.content ?? ""} onChange={onChange} /></ViewerShell>;
    case "csv":
      return <ViewerShell><CsvViewer content={tab.content ?? ""} /></ViewerShell>;
    case "image":
      return <ViewerShell>{tab.binaryData ? <ImageViewer base64Data={tab.binaryData} mimeType={tab.mimeType ?? "image/png"} /> : <OpenMeRouteCard tab={tab} route={route} title="图片已进入 OpenMe" description="OpenMe 已识别该图片格式，但当前解码器没有生成可预览数据。" />}</ViewerShell>;
    case "svg":
      return <ViewerShell>{tab.binaryData ? <SvgViewer base64Data={tab.binaryData} /> : <OpenMeRouteCard tab={tab} route={route} title="SVG 已进入 OpenMe" description="OpenMe 已识别 SVG，但当前没有可渲染数据。" />}</ViewerShell>;
    case "pdf":
      return <ViewerShell>{tab.binaryData ? <PdfViewer base64Data={tab.binaryData} /> : <OpenMeRouteCard tab={tab} route={route} title="PDF 已进入 OpenMe" description="OpenMe 已识别 PDF，但当前没有可预览数据。" />}</ViewerShell>;
    case "office":
      return <ViewerShell>{tab.officeData ? <OfficeViewer data={tab.officeData} /> : <OpenMeRouteCard tab={tab} route={route} title="Office 文件已进入 OpenMe" description="OpenMe 已识别 Office 文件。当前先显示本地安全卡片，后续继续补齐更完整的转换/预览适配器。" />}</ViewerShell>;
    case "archive":
      return route.canPreview ? <ViewerShell><ZipViewer zipPath={tab.path} /></ViewerShell> : <OpenMeRouteCard tab={tab} route={route} title="压缩包已进入 OpenMe" description="OpenMe 已识别该压缩格式。当前以安全卡片打开，避免不安全解包。" />;
    case "cad":
      return <ViewerShell>{tab.binaryData ? <CadViewer base64Data={tab.binaryData} filePath={tab.path} /> : <OpenMeRouteCard tab={tab} route={route} title="CAD / 3D 文件已进入 OpenMe" description="OpenMe 已识别该工程格式。当前显示语义卡片，不承诺源软件级高保真渲染。" />}</ViewerShell>;
    case "epub":
      return <ViewerShell><EpubViewer filePath={tab.path} /></ViewerShell>;
    case "audio":
    case "video":
      return <ViewerShell><MediaViewer filePath={tab.path} kind={tab.category} /></ViewerShell>;
    case "font":
      return <ViewerShell>{tab.binaryData ? <FontViewer base64Data={tab.binaryData} fileName={tab.name} /> : <OpenMeRouteCard tab={tab} route={route} title="字体文件已进入 OpenMe" description="OpenMe 已识别字体文件，但当前没有可预览数据。" />}</ViewerShell>;
    case "dwg":
      return <div className="cad-workspace"><div className="cad-stage"><ViewerBoundary><DwgViewer filePath={tab.path} fileName={tab.name} /></ViewerBoundary></div><CadAssistant filePath={tab.path} fileName={tab.name} /></div>;
    case "design":
      return <OpenMeRouteCard tab={tab} route={route} title="设计源文件已进入 OpenMe" description="OpenMe 已直接打开该设计源文件为本地安全卡片，显示身份、边界、风险和下一步。" />;
    case "package":
      return <OpenMeRouteCard tab={tab} route={route} title="应用包已进入 OpenMe" description="OpenMe 已直接打开该包文件为限制卡片，显示身份、边界、风险和下一步。" />;
    case "disk":
      return <OpenMeRouteCard tab={tab} route={route} title="镜像文件已进入 OpenMe" description="OpenMe 已直接打开该镜像为限制卡片，显示身份、边界、风险和下一步。" />;
    default:
      return <OpenMeRouteCard tab={tab} route={route} title="文件已进入 OpenMe" description="OpenMe 已直接打开该文件为本地安全卡片。" />;
  }
}

function ViewerShell({ children }: { children: React.ReactNode }) {
  return <div className="flex-1 min-h-0 p-4"><ViewerBoundary>{children}</ViewerBoundary></div>;
}

function ViewerBoundary({ children }: { children: React.ReactNode }) {
  return <ErrorBoundary><React.Suspense fallback={<LoadingState />}>{children}</React.Suspense></ErrorBoundary>;
}

function LoadingState() {
  return <div className="loading-state"><div className="loading-card"><div className="loading-dot-row"><div className="loading-dot" /><div className="loading-dot" /><div className="loading-dot" /></div><p>正在加载文件...</p></div></div>;
}
