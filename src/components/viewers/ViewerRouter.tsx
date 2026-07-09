import React, { useEffect } from "react";
import type { FileTabState } from "../../types";
import { getViewerRouteByPath } from "../../viewer-registry";
import { detectLanguage } from "../../utils/fileTypeDetector";
import { useI18n } from "../../i18n";
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
  const { t } = useI18n();
  const route = getViewerRouteByPath(tab.path);

  // Prime the browser's HTTP cache for the @mlightcad/cad-simple-viewer chunk
  // (2.28 MB / 638 kB gzip) the moment a DWG tab becomes active. By the time
  // DwgViewer's own useEffect runs the same dynamic import, the chunk is
  // already (mostly) in cache and the first-open wait collapses to just the
  // parse time. Subsequent calls are no-ops because import() is cached.
  useEffect(() => {
    if (tab.category !== "dwg") return;
    void import("@mlightcad/cad-simple-viewer");
  }, [tab.category]);

  if (tab.error) {
    return <OpenMeRouteCard tab={tab} route={route} title={t("routeErrorTitle")} description={tab.error} />;
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
      return <ViewerShell>{tab.binaryData ? <ImageViewer base64Data={tab.binaryData} mimeType={tab.mimeType ?? "image/png"} /> : <OpenMeRouteCard tab={tab} route={route} title={t("routeImageNoData")} description={t("routeImageNoDataDesc")} />}</ViewerShell>;
    case "svg":
      return <ViewerShell>{tab.binaryData ? <SvgViewer base64Data={tab.binaryData} /> : <OpenMeRouteCard tab={tab} route={route} title={t("routeSvgNoData")} description={t("routeSvgNoDataDesc")} />}</ViewerShell>;
    case "pdf":
      return <ViewerShell>{tab.binaryData ? <PdfViewer base64Data={tab.binaryData} /> : <OpenMeRouteCard tab={tab} route={route} title={t("routePdfNoData")} description={t("routePdfNoDataDesc")} />}</ViewerShell>;
    case "office":
      return <ViewerShell>{tab.officeData ? <OfficeViewer data={tab.officeData} /> : <OpenMeRouteCard tab={tab} route={route} title={t("routeOfficeNoData")} description={t("routeOfficeNoDataDesc")} />}</ViewerShell>;
    case "archive":
      return route.canPreview ? <ViewerShell><ZipViewer zipPath={tab.path} /></ViewerShell> : <OpenMeRouteCard tab={tab} route={route} title={t("routeArchiveNoData")} description={t("routeArchiveNoDataDesc")} />;
    case "cad":
      return <ViewerShell>{tab.binaryData ? <CadViewer base64Data={tab.binaryData} filePath={tab.path} /> : <OpenMeRouteCard tab={tab} route={route} title={t("routeCadNoData")} description={t("routeCadNoDataDesc")} />}</ViewerShell>;
    case "epub":
      return <ViewerShell><EpubViewer filePath={tab.path} /></ViewerShell>;
    case "audio":
    case "video":
      return <ViewerShell><MediaViewer filePath={tab.path} kind={tab.category} /></ViewerShell>;
    case "font":
      return <ViewerShell>{tab.binaryData ? <FontViewer base64Data={tab.binaryData} fileName={tab.name} /> : <OpenMeRouteCard tab={tab} route={route} title={t("routeFontNoData")} description={t("routeFontNoDataDesc")} />}</ViewerShell>;
    case "dwg":
      return <div className="cad-workspace"><div className="cad-stage"><ViewerBoundary><DwgViewer filePath={tab.path} fileName={tab.name} /></ViewerBoundary></div><CadAssistant filePath={tab.path} fileName={tab.name} /></div>;
    case "design":
      return <OpenMeRouteCard tab={tab} route={route} title={t("routeDesignTitle")} description={t("routeDesignDesc")} />;
    case "package":
      return <OpenMeRouteCard tab={tab} route={route} title={t("routePackageTitle")} description={t("routePackageDesc")} />;
    case "disk":
      return <OpenMeRouteCard tab={tab} route={route} title={t("routeDiskTitle")} description={t("routeDiskDesc")} />;
    default:
      return <OpenMeRouteCard tab={tab} route={route} title={t("routeGenericTitle")} description={t("routeGenericDesc")} />;
  }
}

function ViewerShell({ children }: { children: React.ReactNode }) {
  return <div className="flex-1 min-h-0 p-4"><ViewerBoundary>{children}</ViewerBoundary></div>;
}

function ViewerBoundary({ children }: { children: React.ReactNode }) {
  return <ErrorBoundary showSaveLog><React.Suspense fallback={<LoadingState />}>{children}</React.Suspense></ErrorBoundary>;
}

function LoadingState() {
  const { t } = useI18n();
  return <div className="loading-state"><div className="loading-card"><div className="loading-dot-row"><div className="loading-dot" /><div className="loading-dot" /><div className="loading-dot" /></div><p>{t("viewerRouterLoading")}</p></div></div>;
}
