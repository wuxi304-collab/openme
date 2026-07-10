import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "../../i18n";
import "./SvgViewer.css";

interface Props {
  base64Data: string;
}

const ZOOM_MIN = 0.1;
const ZOOM_MAX = 8;
const ZOOM_PRESETS = [25, 50, 75, 100, 150, 200, 400] as const;

function clampScale(value: number): number {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Number(value.toFixed(3))));
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

export default function SvgViewer({ base64Data }: Props) {
  const { t, tf } = useI18n();
  const [scale, setScale] = useState(1);
  const stageRef = useRef<HTMLDivElement>(null);

  const source = useMemo(
    () => `data:image/svg+xml;base64,${base64Data}`,
    [base64Data],
  );

  const zoomBy = useCallback((delta: number) => {
    setScale((value) => clampScale(value + delta));
  }, []);

  const setScalePreset = useCallback((percent: number) => {
    setScale(percent / 100);
  }, []);

  const resetView = useCallback(() => setScale(1), []);
  const actualSize = useCallback(() => setScale(1), []);

  const handleWheel = useCallback((event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const fine = event.ctrlKey || event.metaKey;
    const direction = event.deltaY < 0 ? 1 : -1;
    const delta = direction * (fine ? 0.05 : 0.1);
    zoomBy(delta);
  }, [zoomBy]);

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
        default:
          break;
      }
    };

    stage.addEventListener("keydown", handler);
    return () => stage.removeEventListener("keydown", handler);
  }, [zoomBy, resetView, actualSize]);

  const percent = Math.round(scale * 100);

  return (
    <div className="flex flex-col h-full overflow-hidden rounded-lg border" style={{ borderColor: "var(--border-default)", background: "var(--bg-base)" }}>
      <div className="flex items-center justify-between px-3 py-1.5 border-b" style={{ borderColor: "var(--border-muted)", background: "var(--bg-surface)" }}>
        <span className="viewer-label">{t("svgLabel")}</span>
        <div className="viewer-tools" aria-label={t("svgToolsAria")}>
          <details className="svg-zoom-menu">
            <summary className="svg-zoom-summary" aria-label={t("svgZoomMenuAria")}>
              <span>{percent}%</span>
            </summary>
            <ul className="svg-zoom-list" role="menu">
              {ZOOM_PRESETS.map((preset) => (
                <li key={preset} role="none">
                  <button
                    type="button"
                    role="menuitem"
                    className="svg-zoom-item"
                    onClick={() => setScalePreset(preset)}
                  >
                    {tf("svgZoomPreset", { percent: preset })}
                  </button>
                </li>
              ))}
            </ul>
          </details>
          <button type="button" aria-label={t("svgZoomOut")} onClick={() => zoomBy(-0.1)} title="−">
            <ZoomOutIcon />
          </button>
          <button type="button" onClick={resetView} title={t("svgReset")}>
            {t("svgFit")}
          </button>
          <button type="button" onClick={actualSize} aria-label={t("svgOneToOne")} title={t("svgOneToOne")}>
            1:1
          </button>
          <button type="button" aria-label={t("svgZoomIn")} onClick={() => zoomBy(0.1)} title="+">
            <ZoomInIcon />
          </button>
        </div>
      </div>
      <div
        ref={stageRef}
        className="flex-1 overflow-auto flex items-center justify-center p-4 checkerboard svg-stage"
        tabIndex={0}
        role="img"
        aria-label={t("svgAlt")}
        aria-describedby="svg-viewer-status"
        onWheel={handleWheel}
        onDoubleClick={resetView}
      >
        <img
          src={source}
          alt=""
          draggable={false}
          style={{
            maxWidth: "100%",
            maxHeight: "100%",
            transform: `scale(${scale})`,
            transformOrigin: "center",
            transition: "transform var(--dur-press) var(--ease-out)",
            userSelect: "none",
          }}
        />
      </div>
      <div id="svg-viewer-status" className="sr-only" role="status" aria-live="polite">
        {tf("svgZoomAnnounce", { percent })}
      </div>
    </div>
  );
}
