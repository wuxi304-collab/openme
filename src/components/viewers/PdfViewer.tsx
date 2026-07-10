import { useCallback, useEffect, useRef, useState } from "react";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { useI18n } from "../../i18n";
import ViewerError from "../ViewerError";
import "../ViewerError.css";
import "./PdfViewer.css";

interface Props { base64Data: string; }
type SearchResult = { page: number; count: number; snippet: string };
const ZOOM_LEVELS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4];

export default function PdfViewer({ base64Data }: Props) {
  const { t, tf } = useI18n();
  const [pdfDocument, setPdfDocument] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [fitWidth, setFitWidth] = useState(false);
  const [loading, setLoading] = useState(true);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [matchCursor, setMatchCursor] = useState(0);
  const stageRef = useRef<HTMLDivElement>(null);
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
          let effectiveZoom = zoom;
          if (fitWidth && stageRef.current) {
            const stageWidth = stageRef.current.clientWidth - 32;
            const baseViewport = pdfPage.getViewport({ scale: 1, rotation });
            effectiveZoom = Math.max(0.25, Math.min(8, stageWidth / baseViewport.width));
          }
          const viewport = pdfPage.getViewport({ scale: effectiveZoom * pixelRatio, rotation });
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
    }, [pdfDocument, page, zoom, rotation, fitWidth, t]);

    useEffect(() => {
      const handler = (event: KeyboardEvent) => {
        if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) return;
        if (event.key === "PageUp") { event.preventDefault(); setPage((value) => Math.max(1, value - 1)); }
        else if (event.key === "PageDown") { event.preventDefault(); setPage((value) => Math.min(totalPages, value + 1)); }
        else if (event.key === "Home") { event.preventDefault(); setPage(1); }
        else if (event.key === "End") { event.preventDefault(); setPage(totalPages || 1); }
        else if ((event.metaKey || event.ctrlKey) && (event.key === "=" || event.key === "+")) { event.preventDefault(); setZoom((value) => Math.min(8, value + 0.25)); }
        else if ((event.metaKey || event.ctrlKey) && event.key === "-") { event.preventDefault(); setZoom((value) => Math.max(0.25, value - 0.25)); }
        else if ((event.metaKey || event.ctrlKey) && event.key === "0") { event.preventDefault(); setZoom(1); setFitWidth(false); }
      };
      window.addEventListener("keydown", handler); return () => window.removeEventListener("keydown", handler);
    }, [totalPages]);

  const goTo = useCallback((value: number) => setPage(Math.min(totalPages || 1, Math.max(1, value))), [totalPages]);
  const search = useCallback(async () => {
    const needle = searchQuery.trim().toLocaleLowerCase();
    if (!pdfDocument || !needle) { setResults([]); setMatchCursor(0); return; }
    setSearching(true); setResults([]); setMatchCursor(0);
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
      if (matches.length > 0) goTo(matches[0].page);
    } catch (reason) { setError(reason instanceof Error ? reason.message : t("pdfSearchFailed")); }
    finally { setSearching(false); }
  }, [pdfDocument, searchQuery, totalPages, goTo, t]);

  const goToNextMatch = useCallback(() => {
    if (results.length === 0) return;
    setMatchCursor((cursor) => (cursor + 1) % results.length);
    goTo(results[(matchCursor + 1) % results.length].page);
  }, [results, matchCursor, goTo]);
  const goToPrevMatch = useCallback(() => {
    if (results.length === 0) return;
    setMatchCursor((cursor) => (cursor - 1 + results.length) % results.length);
    goTo(results[(matchCursor - 1 + results.length) % results.length].page);
  }, [results, matchCursor, goTo]);

  const totalMatches = results.reduce((sum, result) => sum + result.count, 0);
  const zoomIn = () => { setFitWidth(false); setZoom((value) => Math.min(8, value + 0.25)); };
  const zoomOut = () => { setFitWidth(false); setZoom((value) => Math.max(0.25, value - 0.25)); };
  const resetZoom = () => { setFitWidth(false); setZoom(1); };

    return (
      <div className="pdf-viewer-shell">
        <div className="pdf-toolbar">
          <span className="viewer-label">{t("pdfLabel")}</span>
          {totalPages > 0 && (
            <span className="pdf-page-count" aria-hidden="true">
              {tf("pdfPageCount", { count: totalPages })}
            </span>
          )}
          <form className="pdf-search" onSubmit={(event) => { event.preventDefault(); search(); }}>
            <label>
              <span className="sr-only">{t("pdfSearchAria")}</span>
              <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder={t("pdfSearchPlaceholder")} />
            </label>
            <button type="submit" disabled={searching || !searchQuery.trim()} aria-busy={searching}>
              {searching ? t("pdfSearchBusy") : t("pdfSearchSubmit")}
            </button>
            {results.length > 0 && (
              <>
                <button type="button" onClick={goToPrevMatch} aria-label={t("pdfSearchPrevAria")} title={t("pdfSearchPrevAria")}>‹</button>
                <span className="pdf-match-cursor" aria-live="polite">
                  {tf("pdfMatchCursor", { current: matchCursor + 1, total: results.length })}
                </span>
                <button type="button" onClick={goToNextMatch} aria-label={t("pdfSearchNextAria")} title={t("pdfSearchNextAria")}>›</button>
              </>
            )}
          </form>
          <div className="viewer-tools">
            <button type="button" onClick={() => goTo(page - 1)} disabled={page <= 1} aria-label={t("pdfPrevPage")}>‹</button>
            <label className="pdf-page-field">
              <span className="sr-only">{t("pdfPageAria")}</span>
              <input type="number" min={1} max={totalPages} value={page} onChange={(event) => goTo(Number(event.target.value) || 1)} />
              <span className="pdf-page-of" aria-hidden="true">/ {totalPages || 1}</span>
            </label>
            <button type="button" onClick={() => goTo(page + 1)} disabled={page >= totalPages} aria-label={t("pdfNextPage")}>›</button>
            <button type="button" aria-label={t("pdfRotateCwAria")} onClick={() => setRotation((value) => (value + 90) % 360)} title={t("pdfRotateCwAria")}>↻</button>
            <button
              type="button"
              aria-label={t("pdfFitWidthAria")}
              aria-pressed={fitWidth}
              onClick={() => setFitWidth((value) => !value)}
              title={t("pdfFitWidthAria")}
              className={fitWidth ? "is-active" : ""}
            >
              ⤢
            </button>
            <button type="button" onClick={zoomOut} aria-label={t("pdfZoomOutAria")} disabled={zoom <= 0.25}>−</button>
            <select aria-label={t("pdfZoomAria")} value={zoom} onChange={(event) => { setFitWidth(false); setZoom(Number(event.target.value)); }}>
              {ZOOM_LEVELS.map((level) => <option key={level} value={level}>{Math.round(level * 100)}%</option>)}
            </select>
            <button type="button" onClick={zoomIn} aria-label={t("pdfZoomInAria")} disabled={zoom >= 8}>+</button>
            <button type="button" onClick={resetZoom} aria-label={t("pdfResetZoomAria")} disabled={zoom === 1 && !fitWidth}>⊙</button>
          </div>
        </div>
        {searchQuery.trim() && !searching && (
          <div className="pdf-results" role="status">
            <span>{tf("pdfMatchCount", { count: totalMatches })}</span>
            {results.slice(0, 30).map((result) => (
              <button
                type="button"
                key={result.page}
                title={result.snippet}
                onClick={() => { goTo(result.page); setMatchCursor(results.findIndex((entry) => entry.page === result.page)); }}
                className={result.page === page ? "is-active" : ""}
              >
                {tf("pdfMatchPage", { n: result.page })} <i>{result.count}</i>
              </button>
            ))}
          </div>
        )}
        <div className="pdf-stage" ref={stageRef} tabIndex={0} aria-label={t("pdfStageAria")}>
          <canvas ref={canvasRef} className="pdf-page-canvas" />
          {(loading || rendering) && !error && (
            <div className="viewer-busy" role="status" aria-live="polite">
              <span className="dwg-loader" />
              {loading
                ? t("pdfOpening")
                : tf("pdfRenderingPageWithNumber", { current: page, total: totalPages })}
            </div>
          )}
          {error && <ViewerError title={t("pdfErrorTitle")} message={error} />}
        </div>
        <div className="pdf-statusbar" role="status" aria-live="polite">
          {tf("pdfStatusBar", { current: page, total: totalPages, percent: Math.round(zoom * 100) })}
        </div>
      </div>
    );
  }