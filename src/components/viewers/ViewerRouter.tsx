import React from "react";
import type { FileTabState } from "../../types";
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
  if (tab.error) {
    return (
      <div className="viewer-error" role="alert">
        <strong>无法预览</strong>
        <p>{tab.error}</p>
        <button type="button" onClick={() => window.electronAPI.openInSystem(tab.path)}>用系统程序打开</button>
      </div>
    );
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
      return <ViewerShell>{tab.binaryData ? <ImageViewer base64Data={tab.binaryData} mimeType={tab.mimeType ?? "image/png"} /> : <EmptyViewerMessage>无法加载图片</EmptyViewerMessage>}</ViewerShell>;
    case "svg":
      return <ViewerShell>{tab.binaryData ? <SvgViewer base64Data={tab.binaryData} /> : <EmptyViewerMessage>无法加载 SVG</EmptyViewerMessage>}</ViewerShell>;
    case "pdf":
      return <ViewerShell>{tab.binaryData ? <PdfViewer base64Data={tab.binaryData} /> : <EmptyViewerMessage>无法加载 PDF</EmptyViewerMessage>}</ViewerShell>;
    case "office":
      return <ViewerShell>{tab.officeData ? <OfficeViewer data={tab.officeData} /> : <EmptyViewerMessage>正在转换 Office 文件...</EmptyViewerMessage>}</ViewerShell>;
    case "archive":
      return <ViewerShell><ZipViewer zipPath={tab.path} /></ViewerShell>;
    case "cad":
      return <ViewerShell>{tab.binaryData ? <CadViewer base64Data={tab.binaryData} filePath={tab.path} /> : <EmptyViewerMessage>无法加载 3D 模型</EmptyViewerMessage>}</ViewerShell>;
    case "epub":
      return <ViewerShell><EpubViewer filePath={tab.path} /></ViewerShell>;
    case "audio":
    case "video":
      return <ViewerShell><MediaViewer filePath={tab.path} kind={tab.category} /></ViewerShell>;
    case "font":
      return <ViewerShell>{tab.binaryData ? <FontViewer base64Data={tab.binaryData} fileName={tab.name} /> : <div className="viewer-error"><strong>字体无法加载</strong></div>}</ViewerShell>;
    case "dwg":
      return <div className="cad-workspace"><div className="cad-stage"><ViewerBoundary><DwgViewer filePath={tab.path} fileName={tab.name} /></ViewerBoundary></div><CadAssistant filePath={tab.path} fileName={tab.name} /></div>;
    case "design":
      return <SemanticRouteCard tab={tab} title="设计源文件" description="该文件已被识别为设计源文件。OpenMe 当前提供语义检查、风险边界和系统程序路由，不承诺源软件级高保真预览。" />;
    case "package":
      return <SemanticRouteCard tab={tab} title="安装包 / 应用包" description="该文件已被识别为安装包或应用包。OpenMe 不执行安装器、不运行未知二进制，只提供本地识别和外部打开。" />;
    case "disk":
      return <SemanticRouteCard tab={tab} title="磁盘镜像 / 虚拟机镜像" description="该文件已被识别为镜像文件。OpenMe 不自动挂载、不自动解包、不自动启动，仅提供识别和外部打开。" />;
    default:
      return <div className="flex-1 flex items-center justify-center p-6"><UnsupportedCard title="未知文件格式" subtitle={tab.name} description="该格式暂不支持内置预览，请使用系统程序打开。" onOpenInSystem={() => window.electronAPI.openInSystem(tab.path)} /></div>;
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

function EmptyViewerMessage({ children }: { children: React.ReactNode }) {
  return <div className="empty-viewer-message">{children}</div>;
}

function UnsupportedCard({ title, subtitle, description, onOpenInSystem }: { title: string; subtitle: string; description: string; onOpenInSystem: () => void }) {
  return <div className="unsupported-card"><div className="unsupported-icon" aria-hidden="true"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><circle cx="12" cy="15" r="1" /><path d="M12 12v1" /></svg></div><h3>{title}</h3><p className="unsupported-subtitle">{subtitle}</p><p>{description}</p><button type="button" onClick={onOpenInSystem}>用系统程序打开</button></div>;
}

function SemanticRouteCard({ tab, title, description }: { tab: FileTabState; title: string; description: string }) {
  return <div className="flex-1 flex items-center justify-center p-6"><UnsupportedCard title={title} subtitle={tab.name} description={description} onOpenInSystem={() => window.electronAPI.openInSystem(tab.path)} /></div>;
}
