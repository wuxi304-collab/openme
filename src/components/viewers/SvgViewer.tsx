import { useMemo, useState } from "react";
import { useI18n } from "../../i18n";

interface Props { base64Data: string; }

export default function SvgViewer({ base64Data }: Props) {
  const { t } = useI18n();
  const [scale, setScale] = useState(1);
  const source = useMemo(() => `data:image/svg+xml;base64,${base64Data}`, [base64Data]);
  const zoom = (delta: number) => setScale((value) => Math.min(5, Math.max(0.1, value + delta)));

  return (
    <div className="flex flex-col h-full overflow-hidden rounded-lg border" style={{ borderColor: "var(--border-default)", background: "var(--bg-base)" }}>
      <div className="flex items-center justify-between px-3 py-1.5 border-b" style={{ borderColor: "var(--border-muted)", background: "var(--bg-surface)" }}>
        <span className="viewer-label">{t("svgLabel")}</span>
        <div className="viewer-tools" aria-label={t("svgToolsAria")}>
          <span className="viewer-zoom">{Math.round(scale * 100)}%</span>
          <button type="button" aria-label={t("svgZoomOut")} onClick={() => zoom(-0.2)}>−</button>
          <button type="button" onClick={() => setScale(1)}>{t("svgFit")}</button>
          <button type="button" aria-label={t("svgZoomIn")} onClick={() => zoom(0.2)}>＋</button>
        </div>
      </div>
      <div className="flex-1 overflow-auto flex items-center justify-center p-4 checkerboard" onWheel={(event) => { event.preventDefault(); zoom(event.deltaY < 0 ? 0.1 : -0.1); }}>
        <img src={source} alt={t("svgAlt")} draggable={false} style={{ maxWidth: "100%", maxHeight: "100%", transform: `scale(${scale})`, transformOrigin: "center", transition: "transform var(--dur-press) var(--ease-out)" }} />
      </div>
    </div>
  );
}
