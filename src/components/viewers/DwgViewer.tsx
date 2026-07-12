import { useCallback, useEffect, useRef, useState } from "react";
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
  const nativeCanvasRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [manager, setManager] = useState<AcApDocManager | null>(null);
  const [engineName, setEngineName] = useState(t("dwgEngineDetecting"));
  const [fallbackEngine, setFallbackEngine] = useState(false);
  const [cadSummary, setCadSummary] = useState<string | null>(null);
  const [nativeSvgUrl, setNativeSvgUrl] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"native" | "compat">("native");

  // ---- Interactive SVG (native-mode) state ----
  // Pan + zoom is implemented by setting a CSS `transform: translate() scale()`
  // on the SVG's <img>. Mouse drag updates `viewPan`, wheel adjusts
  // `viewZoom`. We compute `viewTransform` so the UI can show "120%" / etc.
  // The `fitToWindow` button resets both to a layout-aware default.
  const [viewZoom, setViewZoom] = useState(1);
  const [viewPan, setViewPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const svgDragOriginRef = useRef<{ startX: number; startY: number; startPanX: number; startPanY: number } | null>(null);

  // Reset pan/zoom when a new file opens (URL change) so a smaller file
  // doesn't inherit the previous file's camera offset.
  useEffect(() => {
    setViewZoom(1);
    setViewPan({ x: 0, y: 0 });
  }, [nativeSvgUrl]);

  const beginSvgPan = useCallback((clientX: number, clientY: number) => {
    svgDragOriginRef.current = {
      startX: clientX,
      startY: clientY,
      startPanX: viewPan.x,
      startPanY: viewPan.y,
    };
    setIsPanning(true);
  }, [viewPan]);

  const continueSvgPan = useCallback((clientX: number, clientY: number) => {
    const origin = svgDragOriginRef.current;
    if (!origin) return;
    setViewPan({ x: origin.startPanX + (clientX - origin.startX), y: origin.startPanY + (clientY - origin.startY) });
  }, []);

  const endSvgPan = useCallback(() => {
    if (!isPanning) return;
    svgDragOriginRef.current = null;
    setIsPanning(false);
  }, [isPanning]);

  // Track pan drag on window so it survives the cursor leaving the canvas.
  useEffect(() => {
    if (!isPanning) return undefined;
    const onMove = (e: PointerEvent) => continueSvgPan(e.clientX, e.clientY);
    const onUp = () => endSvgPan();
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [isPanning, continueSvgPan, endSvgPan]);

  const fitToWindow = useCallback(() => {
    const host = nativeCanvasRef.current;
    if (!host) return;
    // Measure the host pane, then center the SVG inside it at the largest
    // scale that still keeps the entire image visible.
    const rect = host.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      // Container not laid out yet — defer to next frame.
      requestAnimationFrame(fitToWindow);
      return;
    }
    const img = host.querySelector("img") as HTMLImageElement | null;
    if (img && img.naturalWidth > 0 && img.naturalHeight > 0) {
      const ratio = Math.min(rect.width / img.naturalWidth, rect.height / img.naturalHeight);
      const nextZoom = Math.max(0.1, Math.min(8, ratio));
      setViewZoom(nextZoom);
      setViewPan({ x: 0, y: 0 });
      return;
    }
    // Image metadata not loaded yet — fall back to identity.
    setViewZoom(1);
    setViewPan({ x: 0, y: 0 });
  }, []);

  const setZoomClamped = useCallback((next: number) => {
    setViewZoom(Math.max(0.1, Math.min(8, next)));
  }, []);

  const zoomByStep = useCallback((direction: 1 | -1) => {
    setZoomClamped(viewZoom * (direction > 0 ? 1.2 : 1 / 1.2));
  }, [viewZoom, setZoomClamped]);

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
    let objectUrl: string | null = null;
    window.electronAPI.renderCadDocument(filePath).then((result) => {
      if (disposed) return;
      if (!result.success || !result.svg) { setViewMode("compat"); return; }
      objectUrl = URL.createObjectURL(new Blob([result.svg], { type: "image/svg+xml" }));
      setNativeSvgUrl(objectUrl);
    }).catch(() => { if (!disposed) setViewMode("compat"); });
    return () => { disposed = true; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [filePath]);

  useEffect(() => {
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
  }, [filePath, fileName, t]);

  const run = (command: string) => {
    try { manager?.sendStringToExecute(command); }
    catch (reason) { setError(reason instanceof Error ? reason.message : t("dwgCommandFailed")); }
  };

  return (
    <div className="dwg-viewer">
      <div className="dwg-toolbar" role="toolbar" aria-label={t("dwgToolbarAria")}>
        <span className="dwg-file-label" title={filePath}><i aria-hidden="true" />{fileName}<em className={fallbackEngine ? "is-fallback" : ""}>{engineName}{cadSummary ? ` · ${cadSummary}` : ""}</em></span>
        <div className="dwg-toolbar-group">
          {nativeSvgUrl && <button type="button" className="dwg-engine-switch" onClick={() => setViewMode(viewMode === "native" ? "compat" : "native")}>{viewMode === "native" ? t("dwgCompatCanvas") : t("dwgEngineeringPreview")}</button>}
          {/* Native SVG controls — pan/zoom/fit work on the static SVG image. */}
          {viewMode === "native" && nativeSvgUrl ? (
            <>
              <button type="button" onClick={fitToWindow} aria-label={t("dwgFitSvgAria")}>{t("dwgFitWindow")}</button>
              <button type="button" onClick={() => zoomByStep(-1)} aria-label={t("dwgZoomOutAria")}>−</button>
              <button type="button" onClick={() => zoomByStep(1)} aria-label={t("dwgZoomInAria")}>+</button>
              <button type="button" onClick={() => { setViewZoom(1); setViewPan({ x: 0, y: 0 }); }} aria-label={t("dwgResetViewAria")}>{Math.round(viewZoom * 100)}%</button>
            </>
          ) : null}
                    {/* Compat-mode LibreDWG canvas — buttons dispatch to the engine.
                        Shown whenever the native SVG preview is unavailable so users
                        see a consistent toolbar shape while the engine boots. */}
                    {viewMode !== "native" || !nativeSvgUrl ? (
                      <>
                        <button type="button" disabled={!manager} onClick={() => run("zoom\ne")}>{t("dwgFitWindow")}</button>
                        <button type="button" disabled={!manager} onClick={() => run("pan")}>{t("dwgPan")}</button>
                        <button type="button" disabled={!manager} onClick={() => run("select")}>{t("dwgSelect")}</button>
                        <span className="dwg-tool-separator" aria-hidden="true" />
                        <button type="button" disabled={!manager} onClick={() => run("undo")}>{t("dwgUndo")}</button>
                        <button type="button" disabled={!manager} onClick={() => run("redo")}>{t("dwgRedo")}</button>
                      </>
                    ) : null}
        </div>
      </div>
      <div
        ref={containerRef}
        className={`dwg-canvas-host ${viewMode === "native" ? "is-hidden" : ""}`}
        role="img"
        aria-label={t("dwgCanvasAria")}
        aria-busy={loading && viewMode !== "native"}
      />
      {viewMode === "native" && nativeSvgUrl ? (
        <div
          ref={nativeCanvasRef}
          className={`dwg-native-canvas${isPanning ? " is-panning" : ""}`}
          aria-label={t("dwgNativeCanvasAria")}
          role="application"
          tabIndex={0}
          onPointerDown={(e) => {
            if (e.button !== 0) return;
            beginSvgPan(e.clientX, e.clientY);
          }}
          onWheel={(e) => {
            // Wheel zoom: ctrl/cmd = fine; otherwise 1.1 step. We preventDefault
            // to suppress page scroll on mouse-wheel over the canvas.
            e.preventDefault();
            const direction = e.deltaY < 0 ? 1 : -1;
            const factor = e.ctrlKey || e.metaKey ? 1.05 : 1.1;
            setZoomClamped(viewZoom * (direction > 0 ? factor : 1 / factor));
          }}
        >
          <img
            src={nativeSvgUrl}
            alt={tf("dwgAcadSharpAlt", { name: fileName })}
            style={{ transform: `translate(${viewPan.x}px, ${viewPan.y}px) scale(${viewZoom})`, transformOrigin: "0 0" }}
            draggable={false}
          />
        </div>
      ) : null}
      {loading && viewMode === "compat" && <div className="dwg-overlay" role="status" aria-live="polite" aria-label={t("dwgParsingOverlayAria")}><span className="dwg-loader" /><strong>{t("dwgParsingTitle")}</strong><small>{t("dwgParsingHint")}</small></div>}
      {error && <ViewerError title={t("dwgErrorTitle")} message={error} action={{ label: t("dwgOpenInSystem"), onClick: () => window.electronAPI.openInSystem(filePath) }} />}
    </div>
  );
}
