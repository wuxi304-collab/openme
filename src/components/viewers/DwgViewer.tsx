import { useEffect, useRef, useState } from "react";
import { AcApDocManager, AcEdOpenMode } from "@mlightcad/cad-simple-viewer";

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

export default function DwgViewer({ filePath, fileName }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [manager, setManager] = useState<AcApDocManager | null>(null);
  const [engineName, setEngineName] = useState("正在检测引擎");
  const [fallbackEngine, setFallbackEngine] = useState(false);
  const [cadSummary, setCadSummary] = useState<string | null>(null);
  const [nativeSvgUrl, setNativeSvgUrl] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"native" | "compat">("native");

  useEffect(() => {
    window.electronAPI.getCadEngineStatus().then((engine) => {
      setEngineName(engine.name);
      setFallbackEngine(engine.fallback);
      if (engine.kind === "acadsharp") {
        window.electronAPI.inspectCadDocument(filePath).then((result) => {
          const info = result.document?.document;
          if (result.success && info) setCadSummary(`${info.entityCount ?? 0} 实体 · ${info.layerCount ?? 0} 图层`);
        }).catch(() => undefined);
      }
    }).catch(() => {
      setEngineName("LibreDWG Web 兼容预览");
      setFallbackEngine(true);
    });
  }, [filePath]);

  useEffect(() => {
    let disposed = false;
    let objectUrl: string | null = null;
    window.electronAPI.renderCadDocument(filePath).then((result) => {
      if (disposed) return;
      if (!result.success || !result.svg) { setViewMode("compat"); return; }
      objectUrl = URL.createObjectURL(new Blob([result.svg], { type: "image/svg+xml" }));
      setNativeSvgUrl(objectUrl);
    }).catch(() => setViewMode("compat"));
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
        if (!currentManager) throw new Error("无法初始化 CAD 画布");
        const response = await window.electronAPI.readBinary(filePath, 100 * 1024 * 1024);
        if (!response.success || !response.data) throw new Error(response.message ?? "无法读取 DWG 文件");
        const opened = await currentManager.openDocument(fileName, decodeBase64(response.data), {
          mode: AcEdOpenMode.Write,
          progressiveRendering: true,
        });
        if (!opened) throw new Error("DWG 解析失败；该图纸可能包含暂不支持的实体或版本");
        if (!cancelled) setManager(currentManager);
      } catch (reason) {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "DWG 加载失败");
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
  }, [filePath, fileName]);

  const run = (command: string) => {
    try { manager?.sendStringToExecute(command); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "命令执行失败"); }
  };

  return (
    <div className="dwg-viewer">
      <div className="dwg-toolbar" aria-label="CAD 工具栏">
        <span className="dwg-file-label" title={filePath}><i aria-hidden="true" />{fileName}<em className={fallbackEngine ? "is-fallback" : ""}>{engineName}{cadSummary ? ` · ${cadSummary}` : ""}</em></span>
        <div className="dwg-toolbar-group">
          {nativeSvgUrl && <button type="button" className="dwg-engine-switch" onClick={() => setViewMode(viewMode === "native" ? "compat" : "native")}>{viewMode === "native" ? "兼容画布" : "工程预览"}</button>}
          <button type="button" disabled={viewMode === "native" || !manager} onClick={() => run("zoom\ne")}>适应窗口</button>
          <button type="button" disabled={viewMode === "native" || !manager} onClick={() => run("pan")}>平移</button>
          <button type="button" disabled={viewMode === "native" || !manager} onClick={() => run("select")}>选择</button>
          <span className="dwg-tool-separator" />
          <button type="button" disabled={viewMode === "native" || !manager} onClick={() => run("undo")}>撤销</button>
          <button type="button" disabled={viewMode === "native" || !manager} onClick={() => run("redo")}>重做</button>
        </div>
      </div>
      <div ref={containerRef} className={`dwg-canvas-host ${viewMode === "native" ? "is-hidden" : ""}`} />
      {viewMode === "native" && nativeSvgUrl && <div className="dwg-native-canvas"><img src={nativeSvgUrl} alt={`${fileName} ACadSharp 工程预览`} /></div>}
      {loading && viewMode === "compat" && <div className="dwg-overlay" role="status"><span className="dwg-loader" /><strong>正在解析 DWG</strong><small>大型图纸可能需要一些时间</small></div>}
      {error && <div className="dwg-overlay dwg-error" role="alert"><strong>图纸打开失败</strong><p>{error}</p><button type="button" onClick={() => window.electronAPI.openInSystem(filePath)}>用系统程序打开</button></div>}
    </div>
  );
}




