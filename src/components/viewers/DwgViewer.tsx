import { useEffect, useRef, useState } from "react";
import { AcApDocManager, AcEdOpenMode } from "@mlightcad/cad-simple-viewer";
import { useI18n } from "../../i18n";
import { describeIpcError, isIpcFailure } from "../../core/ipcError";

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
  const [nativeSvgUrl, setNativeSvgUrl] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"native" | "compat">("native");

  useEffect(() => {
    let cancelled = false;
    window.electronAPI.getCadEngineStatus().then((engine: any) => {
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
          window.electronAPI.inspectCadDocument(filePath).then((result: any) => {
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
    window.electronAPI.renderCadDocument(filePath).then((result: any) => {
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
      <div className="dwg-toolbar" aria-label={t("dwgToolbarAria")}>
        <span className="dwg-file-label" title={filePath}><i aria-hidden="true" />{fileName}<em className={fallbackEngine ? "is-fallback" : ""}>{engineName}{cadSummary ? ` · ${cadSummary}` : ""}</em></span>
        <div className="dwg-toolbar-group">
          {nativeSvgUrl && <button type="button" className="dwg-engine-switch" onClick={() => setViewMode(viewMode === "native" ? "compat" : "native")}>{viewMode === "native" ? t("dwgCompatCanvas") : t("dwgEngineeringPreview")}</button>}
          <button type="button" disabled={viewMode === "native" || !manager} onClick={() => run("zoom\ne")}>{t("dwgFitWindow")}</button>
          <button type="button" disabled={viewMode === "native" || !manager} onClick={() => run("pan")}>{t("dwgPan")}</button>
          <button type="button" disabled={viewMode === "native" || !manager} onClick={() => run("select")}>{t("dwgSelect")}</button>
          <span className="dwg-tool-separator" />
          <button type="button" disabled={viewMode === "native" || !manager} onClick={() => run("undo")}>{t("dwgUndo")}</button>
          <button type="button" disabled={viewMode === "native" || !manager} onClick={() => run("redo")}>{t("dwgRedo")}</button>
        </div>
      </div>
      <div ref={containerRef} className={`dwg-canvas-host ${viewMode === "native" ? "is-hidden" : ""}`} />
      {viewMode === "native" && nativeSvgUrl && <div className="dwg-native-canvas"><img src={nativeSvgUrl} alt={tf("dwgAcadSharpAlt", { name: fileName })} /></div>}
      {loading && viewMode === "compat" && <div className="dwg-overlay" role="status"><span className="dwg-loader" /><strong>{t("dwgParsingTitle")}</strong><small>{t("dwgParsingHint")}</small></div>}
      {error && <div className="dwg-overlay dwg-error" role="alert"><strong>{t("dwgErrorTitle")}</strong><p>{error}</p><button type="button" onClick={() => window.electronAPI.openInSystem(filePath)}>{t("dwgOpenInSystem")}</button></div>}
    </div>
  );
}
