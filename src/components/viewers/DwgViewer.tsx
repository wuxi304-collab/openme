import { useEffect, useRef, useState } from "react";
// Type-only import: the runtime values AcApDocManager / AcEdOpenMode are pulled
// in via a dynamic import() inside the open-drawing effect so the ~2 MB
// @mlightcad/cad-simple-viewer bundle (and its lodash-es dependency) is loaded
// lazily the first time a user actually opens a DWG. Cold-start of the main
// bundle no longer pays the cost.
import type { AcApDocManager } from "@mlightcad/cad-simple-viewer";
import { useI18n } from "../../i18n";
import { describeIpcError, isIpcFailure } from "../../core/ipcError";
import ViewerError from "../ViewerError";
import "../ViewerError.css";
import "./DwgViewer.css";
import CadSvgCanvas from "./CadSvgCanvas";

interface Props { filePath: string; fileName: string; }

function decodeBase64(value: string): ArrayBuffer {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes.buffer;
}

function resourceUrl(fileName: string): string {
  return new URL(`./workers/${fileName}`, window.location.href).href;
}

// Resolve a CAD engine descriptor coming from the main process. Prefer the
// stable i18n code so the toolbar text follows the user's language; fall
// back to the bundled Chinese name/message for engines we don't have keys
// for yet (e.g. an external sidecar).
function localizeEngineField(
  t: (key: string, params?: Record<string, string | number>) => string,
  tf: (key: string, params?: Record<string, string | number>) => string,
  field: { code?: string; params?: Record<string, string | number>; fallback?: string },
): string {
  if (field.code) {
    const localized = t(field.code, field.params);
    if (localized !== field.code) return field.params ? tf(field.code, field.params) : localized;
  }
  return field.fallback ?? "";
}

export default function DwgViewer({ filePath, fileName }: Props) {
  const { t, tf } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [manager, setManager] = useState<AcApDocManager | null>(null);
  const [engineName, setEngineName] = useState(t("dwgEngineDetecting"));
  const [fallbackEngine, setFallbackEngine] = useState(false);
  const [cadSummary, setCadSummary] = useState<string | null>(null);
  // Raw SVG *text*, not a blob URL. CadSvgCanvas parses the markup to build the
  // label inventory and owns the paper sheet / pan / zoom rendering, so handing it
  // an <img> src would throw away the thing it exists to show.
  const [nativeSvg, setNativeSvg] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"native" | "compat">("native");

  useEffect(() => {
    let cancelled = false;
    window.electronAPI.getCadEngineStatus().then((engine) => {
      if (cancelled) return;
      const resolved = localizeEngineField(t, tf, {
        code: engine.nameCode,
        params: engine.nameParams,
        fallback: engine.name,
      });
      setEngineName(resolved || t("dwgEngineDetecting"));
      setFallbackEngine(!!engine.fallback);
      const engineNote = localizeEngineField(t, tf, {
        code: engine.messageCode,
        params: engine.messageParams,
        fallback: engine.message,
      });
      if (engine.kind === "acadsharp") {
        window.electronAPI.inspectCadDocument(filePath).then((result) => {
          if (cancelled) return;
          const info = result.document?.document;
          if (result.success && info) {
            const summary = tf("dwgEntityLayerSummary", {
              entities: info.entityCount ?? 0,
              layers: info.layerCount ?? 0,
            });
            setCadSummary(engineNote ? `${engineNote} · ${summary}` : summary);
          }
        }).catch(() => undefined);
      } else if (engineNote) setCadSummary(engineNote);
      else setCadSummary(null);
    }).catch(() => {
      if (cancelled) return;
      setEngineName(t("dwgEngineLibreDwg"));
      setFallbackEngine(true);
    });
    return () => { cancelled = true; };
  }, [filePath, t, tf]);

  useEffect(() => {
    let disposed = false;
    window.electronAPI.renderCadDocument(filePath).then((result) => {
      if (disposed) return;
      if (!result.success || !result.svg) { setViewMode("compat"); return; }
      setNativeSvg(result.svg);
    }).catch(() => { if (!disposed) setViewMode("compat"); });
    return () => { disposed = true; };
  }, [filePath]);

  // Keep the loading and error overlays scoped to compat mode. Native mode owns
  // its own state (CadSvgCanvas renders directly), so showing stale compat errors
  // there just blanks the canvas — a real footgun once the user starts toggling.
  useEffect(() => {
    setError(null);
    setLoading(false);
  }, [viewMode]);

  // Belt-and-suspenders: as soon as the native render succeeds, clear any
  // compat-mode error/loading that might still be lingering from a previous
  // failed attempt or HMR-preserved state. This guarantees the canvas shows
  // up the moment ACadSharp returns SVG text.
  useEffect(() => {
    if (nativeSvg) {
      setError(null);
      setLoading(false);
    }
  }, [nativeSvg]);

  useEffect(() => {
    // LibreDWG WASM is expensive to spin up and parses the whole drawing on
    // the main thread. Only initialise it when the user actually opens the
    // fallback canvas, so opening in 工程预览 mode is a single parse instead
    // of two, and big drawings don't pay the fallback cost upfront.
    if (viewMode !== "compat") return;
    let cancelled = false;
    let currentManager: AcApDocManager | undefined;

    const openDrawing = async () => {
      if (!containerRef.current) return;
      setLoading(true); setError(null);
      try {
        // Load @mlightcad on demand so the heavy CAD runtime (~2 MB) is not in
        // the cold-start bundle. Vite emits this as its own chunk.
        const mlightcad = await import("@mlightcad/cad-simple-viewer");
        const { AcApDocManager, AcEdOpenMode } = mlightcad;
        currentManager = AcApDocManager.createInstance({
          container: containerRef.current,
          autoResize: true,
          useMainThreadDraw: true,
          notLoadDefaultFonts: true,
          builtinOpenFileDialog: false,
          webworkerFileUrls: {
            dxfParser: resourceUrl("dxf-parser-worker.js"),
            dwgParser: resourceUrl("libredwg-parser-worker.js"),
            mtextRender: resourceUrl("mtext-renderer-worker.js"),
          },
        });
        if (!currentManager) throw new Error(t("dwgInitFailed"));
        const response = await window.electronAPI.readBinary(filePath, 100 * 1024 * 1024);
        if (!response.success || !response.data) throw new Error(isIpcFailure(response) ? describeIpcError(t, response) : response.message ?? t("dwgReadFailed"));
        const opened = await currentManager.openDocument(fileName, decodeBase64(response.data), {
          mode: AcEdOpenMode.Write,
          progressiveRendering: true,
        });
        if (!opened) throw new Error(t("dwgParseFailed"));
        if (!cancelled) setManager(currentManager);
      } catch (reason) {
        if (!cancelled) setError(reason instanceof Error ? reason.message : t("dwgLoadFailed"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    openDrawing();
    return () => {
      cancelled = true;
      setManager(null);
      currentManager?.destroy().catch(console.error);
    };
  }, [filePath, fileName, viewMode, t]);

  const run = (command: string) => {
    try { manager?.sendStringToExecute(command); }
    catch (reason) { setError(reason instanceof Error ? reason.message : t("dwgCommandFailed")); }
  };

  return (
    <div className="dwg-viewer">
      <div className="dwg-toolbar" role="toolbar" aria-label={t("dwgToolbarAria")}>
        <span className="dwg-file-label" title={filePath}><i aria-hidden="true" />{fileName}<em className={fallbackEngine ? "is-fallback" : ""}>{engineName}{cadSummary ? ` · ${cadSummary}` : ""}</em></span>
        <div className="dwg-toolbar-group">
          {nativeSvg && <button type="button" className="dwg-engine-switch" onClick={() => setViewMode(viewMode === "native" ? "compat" : "native")}>{viewMode === "native" ? t("dwgCompatCanvas") : t("dwgEngineeringPreview")}</button>}
          {/* Compat-mode LibreDWG canvas — buttons dispatch to the engine. Pan /
              zoom / fit for the native preview live inside CadSvgCanvas, next to
              the sheet it applies to, so they are not repeated here. */}
          {viewMode === "compat" && (
            <>
              <button type="button" disabled={!manager} onClick={() => run("zoom\ne")}>{t("dwgFitWindow")}</button>
              <button type="button" disabled={!manager} onClick={() => run("pan")}>{t("dwgPan")}</button>
              <button type="button" disabled={!manager} onClick={() => run("select")}>{t("dwgSelect")}</button>
              <span className="dwg-tool-separator" aria-hidden="true" />
              <button type="button" disabled={!manager} onClick={() => run("undo")}>{t("dwgUndo")}</button>
              <button type="button" disabled={!manager} onClick={() => run("redo")}>{t("dwgRedo")}</button>
            </>
          )}
        </div>
      </div>
      <div
        ref={containerRef}
        className={`dwg-canvas-host ${viewMode === "native" ? "is-hidden" : ""}`}
        role="img"
        aria-label={t("dwgCanvasAria")}
        aria-busy={loading && viewMode !== "native"}
      />
      {viewMode === "native" && nativeSvg && (
        <CadSvgCanvas
          svgText={nativeSvg}
          fileName={fileName}
          cadSummary={cadSummary}
          engineLabel={engineName}
          isFallback={fallbackEngine}
          onOpenInSystem={() => window.electronAPI.openInSystem(filePath)}
        />
      )}
      {loading && viewMode === "compat" && <div className="dwg-overlay" role="status" aria-live="polite" aria-label={t("dwgParsingOverlayAria")}><span className="dwg-loader" /><strong>{t("dwgParsingTitle")}</strong><small>{t("dwgParsingHint")}</small></div>}
      {error && viewMode === "compat" && <ViewerError title={t("dwgErrorTitle")} message={error} action={{ label: t("dwgOpenInSystem"), onClick: () => window.electronAPI.openInSystem(filePath) }} />}
    </div>
  );
}
