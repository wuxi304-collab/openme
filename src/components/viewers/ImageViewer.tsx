import { useRef, useState } from "react";
import { useI18n } from "../../i18n";

interface Props { base64Data: string; mimeType: string; }

export default function ImageViewer({ base64Data, mimeType }: Props) {
  const { t } = useI18n();
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [fit, setFit] = useState(true);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dimensions, setDimensions] = useState("");
  const lastPosition = useRef({ x: 0, y: 0 });
  const zoom = (delta: number) => { setFit(false); setScale((value) => Math.min(8, Math.max(0.1, Number((value + delta).toFixed(2))))); };
  const reset = () => { setFit(true); setScale(1); setRotation(0); setPosition({ x: 0, y: 0 }); };
  const actualSize = () => { setFit(false); setScale(1); setPosition({ x: 0, y: 0 }); };
  return (
    <div className="flex flex-col h-full overflow-hidden rounded-lg border" style={{ borderColor: "var(--border-default)", background: "var(--bg-base)" }}>
      <div className="flex items-center justify-between px-3 py-1.5 border-b" style={{ borderColor: "var(--border-muted)", background: "var(--bg-surface)" }}>
        <span className="viewer-label">{t("imageLabel")}{dimensions && <small className="viewer-meta">{dimensions}</small>}</span>
        <div className="viewer-tools" aria-label={t("imageToolsAria")}>
          <span className="viewer-zoom">{fit ? t("imageFit") : `${Math.round(scale * 100)}%`}</span>
          <button type="button" aria-label={t("imageRotateCcw")} onClick={() => setRotation((value) => value - 90)}>↺</button>
          <button type="button" aria-label={t("imageZoomOut")} onClick={() => zoom(-0.2)}>−</button>
          <button type="button" onClick={reset}>{t("imageFit")}</button>
          <button type="button" onClick={actualSize}>1:1</button>
          <button type="button" aria-label={t("imageZoomIn")} onClick={() => zoom(0.2)}>＋</button>
          <button type="button" aria-label={t("imageRotateCw")} onClick={() => setRotation((value) => value + 90)}>↻</button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden flex items-center justify-center checkerboard" onWheel={(event) => { event.preventDefault(); zoom(event.deltaY < 0 ? 0.1 : -0.1); }} onDoubleClick={reset} onMouseDown={(event) => { setDragging(true); lastPosition.current = { x: event.clientX, y: event.clientY }; }} onMouseMove={(event) => { if (!dragging) return; setPosition((current) => ({ x: current.x + event.clientX - lastPosition.current.x, y: current.y + event.clientY - lastPosition.current.y })); lastPosition.current = { x: event.clientX, y: event.clientY }; }} onMouseUp={() => setDragging(false)} onMouseLeave={() => setDragging(false)} style={{ cursor: dragging ? "grabbing" : "grab" }}>
        <img src={`data:${mimeType};base64,${base64Data}`} alt={t("imageAlt")} draggable={false} onLoad={(event) => setDimensions(`${event.currentTarget.naturalWidth} × ${event.currentTarget.naturalHeight}`)} style={{ maxWidth: fit ? "100%" : "none", maxHeight: fit ? "100%" : "none", transform: `translate(${position.x}px, ${position.y}px) rotate(${rotation}deg) scale(${scale})`, transformOrigin: "center", transition: dragging ? "none" : "transform var(--dur-press) var(--ease-out)", userSelect: "none" }} />
      </div>
    </div>
  );
}
