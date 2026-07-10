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
import HexViewer from "./HexViewer";
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
  /**
   * Retry callback for transient open failures. When provided, the route
   * card surfaces a Retry button so the user can re-attempt without
   * closing and re-opening the tab. Pass `undefined` for tabs that have
   * no source file (e.g. transient state) to hide the button.
   */
  onRetry?: () => void;
}

export default function ViewerRouter({ tab, onChange, onRetry }: ViewerRouterProps) {
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
    return <OpenMeRouteCard tab={tab} route={route} title={t("routeErrorTitle")} description={tab.error} onRetry={onRetry} />;
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
          return <ViewerShell>{tab.binaryData ? <ImageViewer base64Data={tab.binaryData} mimeType={tab.mimeType ?? "image/png"} /> : <OpenMeRouteCard tab={tab} route={route} title={t("routeImageNoData")} description={t("routeImageNoDataDesc")} onRetry={onRetry} />}</ViewerShell>;
        case "svg":
          return <ViewerShell>{tab.binaryData ? <SvgViewer base64Data={tab.binaryData} /> : <OpenMeRouteCard tab={tab} route={route} title={t("routeSvgNoData")} description={t("routeSvgNoDataDesc")} onRetry={onRetry} />}</ViewerShell>;
        case "pdf":
          return <ViewerShell>{tab.binaryData ? <PdfViewer base64Data={tab.binaryData} /> : <OpenMeRouteCard tab={tab} route={route} title={t("routePdfNoData")} description={t("routePdfNoDataDesc")} onRetry={onRetry} />}</ViewerShell>;
        case "office":
          return <ViewerShell>{tab.officeData ? <OfficeViewer data={tab.officeData} /> : <OpenMeRouteCard tab={tab} route={route} title={t("routeOfficeNoData")} description={t("routeOfficeNoDataDesc")} onRetry={onRetry} />}</ViewerShell>;
        case "archive":
          return route.canPreview ? <ViewerShell><ZipViewer zipPath={tab.path} /></ViewerShell> : <OpenMeRouteCard tab={tab} route={route} title={t("routeArchiveNoData")} description={t("routeArchiveNoDataDesc")} onRetry={onRetry} />;
        case "cad":
          return <ViewerShell>{tab.binaryData ? <CadViewer base64Data={tab.binaryData} filePath={tab.path} /> : <OpenMeRouteCard tab={tab} route={route} title={t("routeCadNoData")} description={t("routeCadNoDataDesc")} onRetry={onRetry} />}</ViewerShell>;
        case "epub":
          return <ViewerShell><EpubViewer filePath={tab.path} /></ViewerShell>;
        case "audio":
        case "video":
          return <ViewerShell><MediaViewer filePath={tab.path} kind={tab.category} /></ViewerShell>;
        case "font":
          return <ViewerShell>{tab.binaryData ? <FontViewer base64Data={tab.binaryData} fileName={tab.name} /> : <OpenMeRouteCard tab={tab} route={route} title={t("routeFontNoData")} description={t("routeFontNoDataDesc")} onRetry={onRetry} />}</ViewerShell>;
        case "dwg":
          return <div className="cad-workspace"><div className="cad-stage"><ViewerBoundary><DwgViewer filePath={tab.path} fileName={tab.name} /></ViewerBoundary></div><CadAssistant filePath={tab.path} fileName={tab.name} /></div>;
                case "other":
                  // Unknown / unregistered binary files get a hex dump so users can
                  // at least inspect the raw bytes instead of staring at a "we don't
                  // know this format" card. Falls back to the generic route card
                  // when there's no binary data (e.g. open failed before read).
                  return <ViewerShell>{tab.binaryData ? <HexViewer base64Data={tab.binaryData} fileName={tab.name} /> : <OpenMeRouteCard tab={tab} route={route} title={t("routeGenericTitle")} description={t("routeGenericDesc")} onRetry={onRetry} />}</ViewerShell>;
                case "design":
          return <OpenMeRouteCard tab={tab} route={route} title={t("routeDesignTitle")} description={t("routeDesignDesc")} onRetry={onRetry} />;
        case "package":
          return <OpenMeRouteCard tab={tab} route={route} title={t("routePackageTitle")} description={t("routePackageDesc")} onRetry={onRetry} />;
        case "disk":
          return <OpenMeRouteCard tab={tab} route={route} title={t("routeDiskTitle")} description={t("routeDiskDesc")} onRetry={onRetry} />;
        default:
          return <OpenMeRouteCard tab={tab} route={route} title={t("routeGenericTitle")} description={t("routeGenericDesc")} onRetry={onRetry} />;
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
