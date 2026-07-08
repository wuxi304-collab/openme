import { useEffect, useRef, useState } from "react";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { useI18n } from "../../i18n";
import ViewerError from "../ViewerError";
import "../ViewerError.css";

interface Props { base64Data: string; }
type SearchResult = { page: number; count: number; snippet: string };
const ZOOM_LEVELS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3];

export default function PdfViewer({ base64Data }: Props) {
  const { t, tf } = useI18n();
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
      } catch (reason) { if (!disposed) { setError(reason instanceof Error ? reason.message : t("pdfLoadFailed")); setLoading(false); } }
    })();
    return () => { disposed = true; task?.destroy(); };
  }, [base64Data, t]);

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
        if (!context) throw new Error(t("pdfCanvasInitFailed"));
        canvas.width = Math.floor(viewport.width); canvas.height = Math.floor(viewport.height);
        canvas.style.width = `${viewport.width / pixelRatio}px`; canvas.style.height = `${viewport.height / pixelRatio}px`;
        renderTask = pdfPage.render({ canvasContext: context, viewport }); await renderTask.promise;
      } catch (reason: any) {
        if (!disposed && reason?.name !== "RenderingCancelledException") {
          setError(reason?.message ?? t("pdfRenderFailed"));
        }
      }
      finally { if (!disposed) setRendering(false); }
    })();
    return () => { disposed = true; renderTask?.cancel(); };
  }, [pdfDocument, page, zoom, rotation, t]);

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
    } catch (reason) { setError(reason instanceof Error ? reason.message : t("pdfSearchFailed")); }
    finally { setSearching(false); }
  };

  const totalMatches = results.reduce((sum, result) => sum + result.count, 0);

  return (
    <div className="pdf-viewer-shell">
      <div className="pdf-toolbar">
        <span className="viewer-label">{t("pdfLabel")}</span>
        <form className="pdf-search" onSubmit={(event) => { event.preventDefault(); search(); }}>
          <label>
            <span className="sr-only">{t("pdfSearchAria")}</span>
            <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder={t("pdfSearchPlaceholder")} />
          </label>
          <button type="submit" disabled={searching}>{searching ? t("pdfSearchBusy") : t("pdfSearchSubmit")}</button>
        </form>
        <div className="viewer-tools">
          <button type="button" onClick={() => goTo(page - 1)} disabled={page <= 1}>{t("pdfPrevPage")}</button>
          <label className="pdf-page-field">
            <span className="sr-only">{t("pdfPageAria")}</span>
            <input type="number" min={1} max={totalPages} value={page} onChange={(event) => goTo(Number(event.target.value) || 1)} /> / {totalPages}
          </label>
          <button type="button" onClick={() => goTo(page + 1)} disabled={page >= totalPages}>{t("pdfNextPage")}</button>
          <button type="button" aria-label={t("pdfRotateCwAria")} onClick={() => setRotation((value) => (value + 90) % 360)}>↻</button>
          <select aria-label={t("pdfZoomAria")} value={zoom} onChange={(event) => setZoom(Number(event.target.value))}>
            {ZOOM_LEVELS.map((level) => <option key={level} value={level}>{Math.round(level * 100)}%</option>)}
          </select>
        </div>
      </div>
      {searchQuery.trim() && !searching && (
        <div className="pdf-results" role="status">
          <span>{tf("pdfMatchCount", { count: totalMatches })}</span>
          {results.slice(0, 30).map((result) => (
            <button type="button" key={result.page} title={result.snippet} onClick={() => goTo(result.page)}>
              {tf("pdfMatchPage", { n: result.page })} <i>{result.count}</i>
            </button>
          ))}
        </div>
      )}
      <div className="pdf-stage">
        <canvas ref={canvasRef} className="pdf-page-canvas" />
        {(loading || rendering) && !error && (
          <div className="viewer-busy" role="status">
            <span className="dwg-loader" />
            {loading ? t("pdfOpening") : t("pdfRenderingPage")}
          </div>
        )}
        {error && (
                  <ViewerError title={t("pdfErrorTitle")} message={error} />
                )}
      </div>
    </div>
  );
}
