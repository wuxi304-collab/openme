import { useEffect, useRef, useState } from "react";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

interface Props { base64Data: string; }
type SearchResult = { page: number; count: number; snippet: string };
const ZOOM_LEVELS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3];

export default function PdfViewer({ base64Data }: Props) {
  const [pdfDocument, setPdfDocument] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [loading, setLoading] = useState(true);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let disposed = false; let task: any;
    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
        task = pdfjs.getDocument({ data: Uint8Array.from(atob(base64Data), (character) => character.charCodeAt(0)) });
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
        const pixelRatio = Math.max(1, window.devicePixelRatio);
        const viewport = pdfPage.getViewport({ scale: zoom * pixelRatio, rotation });
        const canvas = canvasRef.current!; const context = canvas.getContext("2d");
        if (!context) throw new Error("无法初始化 PDF 画布");
        canvas.width = Math.floor(viewport.width); canvas.height = Math.floor(viewport.height);
        canvas.style.width = `${viewport.width / pixelRatio}px`; canvas.style.height = `${viewport.height / pixelRatio}px`;
        renderTask = pdfPage.render({ canvasContext: context, viewport }); await renderTask.promise;
      } catch (reason: any) { if (!disposed && reason?.name !== "RenderingCancelledException") setError(reason?.message ?? "页面渲染失败"); }
      finally { if (!disposed) setRendering(false); }
    })();
    return () => { disposed = true; renderTask?.cancel(); };
  }, [pdfDocument, page, zoom, rotation]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) return;
      if (event.key === "PageUp") { event.preventDefault(); setPage((value) => Math.max(1, value - 1)); }
      if (event.key === "PageDown") { event.preventDefault(); setPage((value) => Math.min(totalPages, value + 1)); }
    };
    window.addEventListener("keydown", handler); return () => window.removeEventListener("keydown", handler);
  }, [totalPages]);

  const goTo = (value: number) => setPage(Math.min(totalPages || 1, Math.max(1, value)));
  const search = async () => {
    const needle = searchQuery.trim().toLocaleLowerCase();
    if (!pdfDocument || !needle) { setResults([]); return; }
    setSearching(true); setResults([]);
    try {
      const matches: SearchResult[] = [];
      for (let start = 1; start <= totalPages; start += 8) {
        const pages = Array.from({ length: Math.min(8, totalPages - start + 1) }, (_, index) => start + index);
        const batch = await Promise.all(pages.map(async (pageNumber) => {
          const pdfPage = await pdfDocument.getPage(pageNumber); const content = await pdfPage.getTextContent();
          const text = content.items.map((item: any) => item.str ?? "").join(" "); const lower = text.toLocaleLowerCase();
          let count = 0; let cursor = 0; while ((cursor = lower.indexOf(needle, cursor)) !== -1) { count += 1; cursor += needle.length; }
          const first = lower.indexOf(needle); return count ? { page: pageNumber, count, snippet: text.slice(Math.max(0, first - 35), first + needle.length + 55) } : null;
        }));
        matches.push(...batch.filter((item): item is SearchResult => item !== null));
      }
      setResults(matches);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "PDF 搜索失败"); }
    finally { setSearching(false); }
  };

  return (
    <div className="pdf-viewer-shell">
      <div className="pdf-toolbar"><span className="viewer-label">PDF</span><form className="pdf-search" onSubmit={(event) => { event.preventDefault(); search(); }}><label><span className="sr-only">全文搜索</span><input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="全文搜索…" /></label><button type="submit" disabled={searching}>{searching ? "搜索中…" : "搜索"}</button></form><div className="viewer-tools"><button type="button" onClick={() => goTo(page - 1)} disabled={page <= 1}>上一页</button><label className="pdf-page-field"><span className="sr-only">页码</span><input type="number" min={1} max={totalPages} value={page} onChange={(event) => goTo(Number(event.target.value) || 1)} /> / {totalPages}</label><button type="button" onClick={() => goTo(page + 1)} disabled={page >= totalPages}>下一页</button><button type="button" aria-label="顺时针旋转" onClick={() => setRotation((value) => (value + 90) % 360)}>↻</button><select aria-label="缩放比例" value={zoom} onChange={(event) => setZoom(Number(event.target.value))}>{ZOOM_LEVELS.map((level) => <option key={level} value={level}>{Math.round(level * 100)}%</option>)}</select></div></div>
      {searchQuery.trim() && !searching && <div className="pdf-results" role="status"><span>{results.reduce((sum, result) => sum + result.count, 0)} 处匹配</span>{results.slice(0, 30).map((result) => <button type="button" key={result.page} title={result.snippet} onClick={() => goTo(result.page)}>第 {result.page} 页 <i>{result.count}</i></button>)}</div>}
      <div className="pdf-stage"><canvas ref={canvasRef} className="pdf-page-canvas" />{(loading || rendering) && !error && <div className="viewer-busy" role="status"><span className="dwg-loader" />{loading ? "正在打开 PDF…" : "正在绘制页面…"}</div>}{error && <div className="viewer-error" role="alert"><strong>PDF 无法预览</strong><p>{error}</p></div>}</div>
    </div>
  );
}
