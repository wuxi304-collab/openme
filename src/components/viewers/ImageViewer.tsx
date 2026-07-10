import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "../../i18n";
import "./ImageViewer.css";

interface Props {
  base64Data: string;
  mimeType: string;
}

const ZOOM_MIN = 0.1;
const ZOOM_MAX = 8;
const ZOOM_PRESETS = [25, 50, 75, 100, 150, 200, 400] as const;
const PAN_STEP = 16;

function clampScale(value: number): number {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Number(value.toFixed(3))));
}

function normalizeRotation(rotation: number): number {
  // Wrap to [-180, 180] so the transform string stays small and 0deg means up.
  const wrapped = ((rotation % 360) + 540) % 360 - 180;
  return wrapped;
}

function ZoomInIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true">
      <circle cx="7" cy="7" r="5" />
      <line x1="10.6" y1="10.6" x2="14" y2="14" />
      <line x1="5" y1="7" x2="9" y2="7" />
      <line x1="7" y1="5" x2="7" y2="9" />
    </svg>
  );
}

function ZoomOutIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true">
      <circle cx="7" cy="7" r="5" />
      <line x1="10.6" y1="10.6" x2="14" y2="14" />
      <line x1="5" y1="7" x2="9" y2="7" />
    </svg>
  );
}

function RotateCcwIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 8a5 5 0 1 0 1.46-3.54" />
      <polyline points="3 3 3 6 6 6" />
    </svg>
  );
}

function RotateCwIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M13 8a5 5 0 1 1-1.46-3.54" />
      <polyline points="13 3 13 6 10 6" />
    </svg>
  );
}

export default function ImageViewer({ base64Data, mimeType }: Props) {
  const { t, tf } = useI18n();
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [fit, setFit] = useState(true);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const lastPosition = useRef({ x: 0, y: 0 });

  const dataUri = useMemo(
    () => `data:${mimeType};base64,${base64Data}`,
    [base64Data, mimeType],
  );

  const zoomBy = useCallback((delta: number) => {
    setFit(false);
    setScale((value) => clampScale(value + delta));
  }, []);

  const setScalePreset = useCallback((percent: number) => {
    setFit(false);
    setScale(percent / 100);
  }, []);

  const resetView = useCallback(() => {
    setFit(true);
    setScale(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  }, []);

  const actualSize = useCallback(() => {
    setFit(false);
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  const rotateBy = useCallback((delta: number) => {
    setRotation((value) => normalizeRotation(value + delta));
  }, []);

  const panBy = useCallback((dx: number, dy: number) => {
    setFit(false);
    setPosition((current) => ({ x: current.x + dx, y: current.y + dy }));
  }, []);

  const handleMouseDown = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    setDragging(true);
    lastPosition.current = { x: event.clientX, y: event.clientY };
  }, []);

  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!dragging) return;
    const dx = event.clientX - lastPosition.current.x;
    const dy = event.clientY - lastPosition.current.y;
    setPosition((current) => ({ x: current.x + dx, y: current.y + dy }));
    lastPosition.current = { x: event.clientX, y: event.clientY };
  }, [dragging]);

  const stopDragging = useCallback(() => setDragging(false), []);

  const handleWheel = useCallback((event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const fine = event.ctrlKey || event.metaKey;
    const direction = event.deltaY < 0 ? 1 : -1;
    const delta = direction * (fine ? 0.05 : 0.1) * Math.max(0.5, scale);
    zoomBy(delta);
  }, [scale, zoomBy]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return undefined;

    const handler = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      switch (event.key) {
        case "+":
        case "=":
          event.preventDefault();
          zoomBy(0.1);
          break;
        case "-":
        case "_":
          event.preventDefault();
          zoomBy(-0.1);
          break;
        case "0":
          event.preventDefault();
          resetView();
          break;
        case "1":
          event.preventDefault();
          actualSize();
          break;
        case "r":
        case "R":
          event.preventDefault();
          rotateBy(event.shiftKey ? -90 : 90);
          break;
        case "f":
        case "F":
          event.preventDefault();
          if (fit) actualSize();
          else resetView();
          break;
        case "ArrowUp":
          event.preventDefault();
          panBy(0, event.shiftKey ? -PAN_STEP * 4 : -PAN_STEP);
          break;
        case "ArrowDown":
          event.preventDefault();
          panBy(0, event.shiftKey ? PAN_STEP * 4 : PAN_STEP);
          break;
        case "ArrowLeft":
          event.preventDefault();
          panBy(event.shiftKey ? -PAN_STEP * 4 : -PAN_STEP, 0);
          break;
        case "ArrowRight":
          event.preventDefault();
          panBy(event.shiftKey ? PAN_STEP * 4 : PAN_STEP, 0);
          break;
        default:
          break;
      }
    };

    stage.addEventListener("keydown", handler);
    return () => stage.removeEventListener("keydown", handler);
  }, [zoomBy, resetView, actualSize, rotateBy, panBy, fit]);

  const percent = Math.round(scale * 100);
  const dimensionsLabel = naturalSize
    ? `${naturalSize.width} × ${naturalSize.height}`
    : "";

  return (
    <div className="flex flex-col h-full overflow-hidden rounded-lg border" style={{ borderColor: "var(--border-default)", background: "var(--bg-base)" }}>
      <div className="flex items-center justify-between px-3 py-1.5 border-b" style={{ borderColor: "var(--border-muted)", background: "var(--bg-surface)" }}>
        <span className="viewer-label">
          {t("imageLabel")}
          {dimensionsLabel && <small className="viewer-meta">{dimensionsLabel}</small>}
          {fit && <small className="viewer-fit-badge">{t("imageFitStateBadge")}</small>}
        </span>
        <div className="viewer-tools" aria-label={t("imageToolsAria")}>
          <details className="image-zoom-menu">
            <summary className="image-zoom-summary" aria-label={t("imageZoomMenuAria")}>
              <span>{fit ? t("imageFit") : `${percent}%`}</span>
            </summary>
            <ul className="image-zoom-list" role="menu">
              {ZOOM_PRESETS.map((preset) => (
                <li key={preset} role="none">
                  <button
                    type="button"
                    role="menuitem"
                    className="image-zoom-item"
                    onClick={() => setScalePreset(preset)}
                  >
                    {tf("imageZoomPreset", { percent: preset })}
                  </button>
                </li>
              ))}
            </ul>
          </details>
          <button type="button" aria-label={t("imageRotateCcw")} onClick={() => rotateBy(-90)} title="R">
            <RotateCcwIcon />
          </button>
          <button type="button" aria-label={t("imageZoomOut")} onClick={() => zoomBy(-0.1)} title="−">
            <ZoomOutIcon />
          </button>
          <button type="button" onClick={resetView} title={t("imageReset")}>
            {t("imageFit")}
          </button>
          <button type="button" onClick={actualSize} aria-label={t("imageOneToOne")} title={t("imageOneToOne")}>
            1:1
          </button>
          <button type="button" aria-label={t("imageZoomIn")} onClick={() => zoomBy(0.1)} title="+">
            <ZoomInIcon />
          </button>
          <button type="button" aria-label={t("imageRotateCw")} onClick={() => rotateBy(90)} title="R">
            <RotateCwIcon />
          </button>
        </div>
      </div>
      <div
        ref={stageRef}
        className="flex-1 overflow-hidden flex items-center justify-center checkerboard image-stage"
        tabIndex={0}
        role="img"
        aria-label={t("imageAlt")}
        aria-describedby="image-viewer-status"
        onWheel={handleWheel}
        onDoubleClick={resetView}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={stopDragging}
        onMouseLeave={stopDragging}
        style={{ cursor: dragging ? "grabbing" : "grab", outline: "none" }}
      >
        <img
          src={dataUri}
          alt=""
          draggable={false}
          onLoad={(event) => setNaturalSize({
            width: event.currentTarget.naturalWidth,
            height: event.currentTarget.naturalHeight,
          })}
          style={{
            maxWidth: fit ? "100%" : "none",
            maxHeight: fit ? "100%" : "none",
            transform: `translate(${position.x}px, ${position.y}px) rotate(${rotation}deg) scale(${scale})`,
            transformOrigin: "center",
            transition: dragging ? "none" : "transform var(--dur-press) var(--ease-out)",
            userSelect: "none",
          }}
        />
      </div>
      <div id="image-viewer-status" className="image-status sr-only" role="status" aria-live="polite">
        {tf("imageZoomAnnounce", { percent, fit: fit ? t("imageZoomAnnounceFit") : t("imageZoomAnnounceActual") })}
      </div>
    </div>
  );
}
