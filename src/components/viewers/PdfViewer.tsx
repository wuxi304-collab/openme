import { useEffect, useState, useRef } from "react";

interface Props {
  base64Data: string;
}

const ZOOM_LEVELS = [0.5, 0.75, 1.0, 1.5, 2.0];

export default function PdfViewer({ base64Data }: Props) {
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [zoom, setZoom] = useState(1.0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";
        const data = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
        const doc = await pdfjsLib.getDocument({ data }).promise;
        if (!cancelled) {
          setPdfDoc(doc);
          setTotalPages(doc.numPages);
          setLoading(false);
        }
      } catch (e: any) {
        if (!cancelled) { setError(e.message); setLoading(false); }
      }
    })();
    return () => { cancelled = true; };
  }, [base64Data]);

  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;
    (async () => {
      try {
        const p = await pdfDoc.getPage(page);
        const vp = p.getViewport({ scale: zoom * 1.5 });
        const canvas = canvasRef.current!;
        const ctx = canvas.getContext("2d")!;
        canvas.height = vp.height;
        canvas.width = vp.width;
        await p.render({ canvasContext: ctx, viewport: vp }).promise;
      } catch { /* render cancelled */ }
    })();
  }, [pdfDoc, page, zoom]);

  const goTo = (n: number) => setPage(Math.min(totalPages, Math.max(1, n)));

  return (
    <div className="flex flex-col h-full overflow-hidden rounded-lg border" style={{ borderColor: "var(--border-default)", background: "var(--bg-base)" }}>
      <div className="flex items-center justify-between px-3 py-1.5 border-b" style={{ borderColor: "var(--border-muted)", background: "var(--bg-surface)" }}>
        <span className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: "var(--text-muted)" }}>PDF</span>
        <div className="flex items-center gap-3">
          <button onClick={() => goTo(page - 1)} disabled={page <= 1}
            className="text-[11px] px-2 py-0.5 rounded disabled:opacity-40" style={{ color: "var(--text-muted)", background: "var(--bg-elevated)" }}>上一页</button>
          <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
            <input type="number" min={1} max={totalPages} value={page}
              onChange={(e) => goTo(parseInt(e.target.value) || 1)}
              className="w-12 text-center outline-none rounded px-1 py-0.5"
              style={{ background: "var(--bg-elevated)", color: "var(--text-primary)", fontSize: "11px" }} />
            / {totalPages}
          </span>
          <button onClick={() => goTo(page + 1)} disabled={page >= totalPages}
            className="text-[11px] px-2 py-0.5 rounded disabled:opacity-40" style={{ color: "var(--text-muted)", background: "var(--bg-elevated)" }}>下一页</button>
          <select value={zoom} onChange={(e) => setZoom(parseFloat(e.target.value))}
            className="text-[11px] rounded px-2 py-0.5 outline-none"
            style={{ background: "var(--bg-elevated)", color: "var(--text-muted)" }}>
            {ZOOM_LEVELS.map((z) => <option key={z} value={z}>{Math.round(z * 100)}%</option>)}
          </select>
        </div>
      </div>
      <div className="flex-1 overflow-auto flex items-start justify-center p-4">
        {loading && (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="w-8 h-8 rounded-full border-2" style={{ borderColor: "var(--accent)", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
            <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>正在加载 PDF...</p>
          </div>
        )}
        {error && <p style={{ color: "var(--error)", fontSize: "12px" }}>加载失败: {error}</p>}
        {!loading && !error && <canvas ref={canvasRef} className="shadow-lg" style={{ maxWidth: "100%", height: "auto" }} />}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
