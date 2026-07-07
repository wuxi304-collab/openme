import React from "react";
import type { FileTabState } from "../../types";
import { getViewerRouteByPath } from "../../viewer-registry";
import type { ViewerRoute } from "../../viewer-registry";
import { detectLanguage } from "../../utils/fileTypeDetector";
import ErrorBoundary from "../ErrorBoundary";
import JsonViewer from "./JsonViewer";
import ImageViewer from "./ImageViewer";
import SvgViewer from "./SvgViewer";
import CadAssistant from "./CadAssistant";

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
      return <OpenMeRouteCard tab={tab} route={route} title="安装包 / 应用包已进入 OpenMe" description="OpenMe 已直接打开该包文件为限制卡片。不会执行、安装或运行未知二进制。" />;
    case "disk":
      return <OpenMeRouteCard tab={tab} route={route} title="磁盘镜像 / 虚拟机镜像已进入 OpenMe" description="OpenMe 已直接打开该镜像为限制卡片。不会自动挂载、恢复、导入或启动。" />;
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

function OpenMeRouteCard({ tab, route, title, description }: { tab: FileTabState; route: ViewerRoute; title: string; description: string }) {
  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="unsupported-card">
        <div className="unsupported-icon" aria-hidden="true">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <circle cx="12" cy="15" r="1" />
            <path d="M12 12v1" />
          </svg>
        </div>
        <h3>{title}</h3>
        <p className="unsupported-subtitle">{tab.name}</p>
        <p>{description}</p>
        <div className="summary-chip-list" aria-label="OpenMe 打开路径">
          <span className="summary-chip">{route.surface}</span>
          <span className="summary-chip">{route.mode}</span>
          <span className="summary-chip">{route.label}</span>
        </div>
        <p>{route.reason}</p>
        <p>{route.boundary}</p>
        {route.hasExternalFallback && <button type="button" onClick={() => window.electronAPI.openInSystem(tab.path)}>用系统程序兜底打开</button>}
      </div>
    </div>
  );
}
