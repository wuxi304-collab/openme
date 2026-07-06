import { useState, useRef } from "react";

interface Props {
  base64Data: string;
  mimeType: string;
}

export default function ImageViewer({ base64Data, mimeType }: Props) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const imgRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  const zoom = (delta: number) => setScale((s) => Math.min(5, Math.max(0.1, s + delta)));
  const reset = () => { setScale(1); setPosition({ x: 0, y: 0 }); };

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    zoom(e.deltaY < 0 ? 0.1 : -0.1);
  };

  const onMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    setPosition((p) => ({ x: p.x + e.clientX - lastPos.current.x, y: p.y + e.clientY - lastPos.current.y }));
    lastPos.current = { x: e.clientX, y: e.clientY };
  };
  const onMouseUp = () => { isDragging.current = false; };

  return (
    <div className="flex flex-col h-full overflow-hidden rounded-lg border" style={{ borderColor: "var(--border-default)", background: "var(--bg-base)" }}>
      <div className="flex items-center justify-between px-3 py-1.5 border-b" style={{ borderColor: "var(--border-muted)", background: "var(--bg-surface)" }}>
        <span className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: "var(--text-muted)" }}>图片预览</span>
        <div className="flex items-center gap-2">
          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{Math.round(scale * 100)}%</span>
          <button onClick={() => zoom(-0.2)} className="text-[11px] px-2 py-0.5 rounded" style={{ color: "var(--text-muted)", background: "var(--bg-elevated)" }}>-</button>
          <button onClick={reset} className="text-[11px] px-2 py-0.5 rounded" style={{ color: "var(--text-muted)", background: "var(--bg-elevated)" }}>重置</button>
          <button onClick={() => zoom(0.2)} className="text-[11px] px-2 py-0.5 rounded" style={{ color: "var(--text-muted)", background: "var(--bg-elevated)" }}>+</button>
        </div>
      </div>
      <div
        ref={imgRef}
        className="flex-1 overflow-hidden flex items-center justify-center cursor-grab"
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        style={{ cursor: isDragging.current ? "grabbing" : "grab" }}
      >
        <img
          src={`data:${mimeType};base64,${base64Data}`}
          alt="preview"
          draggable={false}
          style={{ maxWidth: "100%", maxHeight: "100%", transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`, transition: isDragging.current ? "none" : "transform 0.1s" }}
        />
      </div>
    </div>
  );
}
