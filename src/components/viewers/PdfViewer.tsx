import { useEffect, useRef, useState } from "react";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

interface Props { base64Data: string; }
const ZOOM_LEVELS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3];

export default function PdfViewer({ base64Data }: Props) {
  const [pdfDocument, setPdfDocument] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [loading, setLoading] = useState(true);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let disposed = false; let task: any;
    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
        const data = Uint8Array.from(atob(base64Data), (character) => character.charCodeAt(0));
        task = pdfjs.getDocument({ data });
        const document = await task.promise;
        if (!disposed) { setPdfDocument(document); setTotalPages(document.numPages); setPage(1); setLoading(false); }
      } catch (reason) { if (!disposed) { setError(reason instanceof Error ? reason.message : "PDF 加载失败"); setLoading(false); } }
    })();
    return () => { disposed = true; task?.destroy(); };
  }, [base64Data]);

  useEffect(() => {
    if (!pdfDocument || !canvasRef.current) return;
    let disposed = false; let renderTask: any;
    (async () => {
      try {
        setRendering(true);
        const pdfPage = await pdfDocument.getPage(page);
        if (disposed) return;
        const viewport = pdfPage.getViewport({ scale: zoom * Math.max(1, window.devicePixelRatio) });
        const canvas = canvasRef.current!; const context = canvas.getContext("2d");
        if (!context) throw new Error("无法初始化 PDF 画布");
        canvas.width = Math.floor(viewport.width); canvas.height = Math.floor(viewport.height);
        canvas.style.width = `${viewport.width / Math.max(1, window.devicePixelRatio)}px`;
        canvas.style.height = `${viewport.height / Math.max(1, window.devicePixelRatio)}px`;
        renderTask = pdfPage.render({ canvasContext: context, viewport });
        await renderTask.promise;
      } catch (reason: any) { if (!disposed && reason?.name !== "RenderingCancelledException") setError(reason?.message ?? "页面渲染失败"); }
      finally { if (!disposed) setRendering(false); }
    })();
    return () => { disposed = true; renderTask?.cancel(); };
  }, [pdfDocument, page, zoom]);

  const goTo = (value: number) => setPage(Math.min(totalPages || 1, Math.max(1, value)));
  return (
    <div className="flex flex-col h-full overflow-hidden rounded-lg border" style={{ borderColor: "var(--border-default)", background: "var(--bg-base)" }}>
      <div className="flex items-center justify-between px-3 py-1.5 border-b" style={{ borderColor: "var(--border-muted)", background: "var(--bg-surface)" }}>
        <span className="viewer-label">PDF</span>
        <div className="viewer-tools"><button type="button" onClick={() => goTo(page - 1)} disabled={page <= 1}>上一页</button><label className="pdf-page-field"><span className="sr-only">页码</span><input type="number" min={1} max={totalPages} value={page} onChange={(event) => goTo(Number(event.target.value) || 1)} /> / {totalPages}</label><button type="button" onClick={() => goTo(page + 1)} disabled={page >= totalPages}>下一页</button><select aria-label="缩放比例" value={zoom} onChange={(event) => setZoom(Number(event.target.value))}>{ZOOM_LEVELS.map((level) => <option key={level} value={level}>{Math.round(level * 100)}%</option>)}</select></div>
      </div>
      <div className="pdf-stage"><canvas ref={canvasRef} className="pdf-page-canvas" />{(loading || rendering) && !error && <div className="viewer-busy" role="status"><span className="dwg-loader" />{loading ? "正在打开 PDF…" : "正在绘制页面…"}</div>}{error && <div className="viewer-error" role="alert"><strong>PDF 无法预览</strong><p>{error}</p></div>}</div>
    </div>
  );
}
