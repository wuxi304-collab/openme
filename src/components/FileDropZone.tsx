import { useCallback, useState } from "react";

interface Props {
  onFileDrop: (paths: string[]) => void;
}

export default function FileDropZone({ onFileDrop }: Props) {
  const [dragging, setDragging] = useState(false);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
      setDragging(false);
    }
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const items = Array.from(e.dataTransfer.files);
      const paths = items
        .map((f) => (f as File & { path?: string }).path ?? f.name)
        .filter(Boolean);
      if (paths.length > 0) onFileDrop(paths);
    },
    [onFileDrop]
  );

  const accent = "var(--accent)";
  const muted = "var(--text-muted)";
  const color = dragging ? accent : muted;

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className="flex flex-col items-center justify-center flex-1 rounded-xl border-2 border-dashed transition-all duration-200 select-none"
      style={{
        borderColor: dragging ? "var(--accent)" : "var(--border-default)",
        background: dragging ? "var(--accent-glow)" : "transparent",
      }}
    >
      <div
        className="flex flex-col items-center gap-5 text-center px-8"
      >
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-300"
          style={{
            background: dragging ? "var(--accent-dim)" : "var(--bg-surface)",
            border: `1px solid ${dragging ? "var(--accent)" : "var(--border-default)"}`,
            transform: dragging ? "scale(1.08)" : "scale(1)",
          }}
        >
          <svg
            width="36"
            height="36"
            viewBox="0 0 24 24"
            fill="none"
            stroke={color}
            strokeWidth="1.5"
            className="transition-colors duration-200"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="12" y1="18" x2="12" y2="12" />
            <polyline points="9 15 12 12 15 15" />
          </svg>
        </div>

        <div className="space-y-1">
          <p
            className="text-[15px] font-semibold transition-colors duration-200"
            style={{ color }}
          >
            {dragging ? "松开以打开" : "将文件拖入此处"}
          </p>
          <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>
            支持 PDF、图片、文档、代码等所有常见格式
          </p>
        </div>

        <div className="flex items-center gap-4 pt-2">
          {[
            { label: "PDF", color: "#f85149" },
            { label: "图片", color: "#a371f7" },
            { label: "文本", color: "#3fb950" },
            { label: "代码", color: "#58a6ff" },
          ].map(({ label, color }) => (
            <span
              key={label}
              className="px-2 py-0.5 rounded text-[10px] font-medium"
              style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}
            >
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
