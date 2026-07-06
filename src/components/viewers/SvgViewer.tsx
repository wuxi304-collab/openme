import { useState, useMemo } from "react";

interface Props {
  base64Data: string;
}

function base64ToSvg(b64: string): string {
  try {
    const binary = atob(b64);
    let s = "";
    for (let i = 0; i < binary.length; i++) s += String.fromCharCode(binary.charCodeAt(i));
    return s;
  } catch {
    return "<p>无法解析 SVG</p>";
  }
}

export default function SvgViewer({ base64Data }: Props) {
  const [scale, setScale] = useState(1);
  const svgString = useMemo(() => base64ToSvg(base64Data), [base64Data]);

  return (
    <div className="flex flex-col h-full overflow-hidden rounded-lg border" style={{ borderColor: "var(--border-default)", background: "var(--bg-base)" }}>
      <div className="flex items-center justify-between px-3 py-1.5 border-b" style={{ borderColor: "var(--border-muted)", background: "var(--bg-surface)" }}>
        <span className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: "var(--text-muted)" }}>SVG</span>
        <div className="flex items-center gap-2">
          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{Math.round(scale * 100)}%</span>
          <button onClick={() => setScale((s) => Math.min(5, s + 0.2))} className="text-[11px] px-2 py-0.5 rounded" style={{ color: "var(--text-muted)", background: "var(--bg-elevated)" }}>+</button>
          <button onClick={() => setScale(1)} className="text-[11px] px-2 py-0.5 rounded" style={{ color: "var(--text-muted)", background: "var(--bg-elevated)" }}>重置</button>
          <button onClick={() => setScale((s) => Math.max(0.1, s - 0.2))} className="text-[11px] px-2 py-0.5 rounded" style={{ color: "var(--text-muted)", background: "var(--bg-elevated)" }}>-</button>
        </div>
      </div>
      <div className="flex-1 overflow-auto flex items-center justify-center p-4" onWheel={(e) => { e.preventDefault(); setScale((s) => Math.min(5, Math.max(0.1, s + (e.deltaY < 0 ? 0.1 : -0.1)))); }}>
        <div
          style={{ transform: `scale(${scale})`, transformOrigin: "center center", transition: "transform 0.1s" }}
          dangerouslySetInnerHTML={{ __html: svgString }}
        />
      </div>
    </div>
  );
}
