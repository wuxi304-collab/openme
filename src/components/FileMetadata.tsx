import { FileInfo } from "../types";
import { formatFileSize, formatDate, getFileTypeLabel } from "../utils/fileUtils";

interface Props {
  file: FileInfo;
  onOpenSystem: () => void;
}

export default function FileMetadata({ file, onOpenSystem }: Props) {
  const rows = [
    { label: "文件名", value: file.name },
    { label: "类型", value: getFileTypeLabel(file.file_type) },
    { label: "大小", value: formatFileSize(file.size) },
    { label: "修改时间", value: formatDate(file.modified_at) },
    { label: "路径", value: file.path, mono: true },
  ];

  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}>
      <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: "var(--border-muted)" }}>
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.8">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>文件信息</span>
        </div>
        <span className="text-[11px] px-2 py-0.5 rounded" style={{ background: "var(--bg-elevated)", color: "var(--text-muted)" }}>
          {file.extension.toUpperCase().replace(".", "") || "FILE"}
        </span>
      </div>

      <div className="px-4 py-3 space-y-2">
        {rows.map(({ label, value, mono }) => (
          <div key={label} className="flex items-start gap-3">
            <span className="text-[11px] w-16 flex-shrink-0 pt-0.5" style={{ color: "var(--text-muted)" }}>
              {label}
            </span>
            <span
              className={`text-[12px] flex-1 leading-snug ${mono ? "font-mono" : ""}`}
              style={{ color: "var(--text-secondary)", wordBreak: "break-all" }}
              title={value}
            >
              {value}
            </span>
          </div>
        ))}
      </div>

      <div className="px-4 py-3 border-t" style={{ borderColor: "var(--border-muted)" }}>
        <button
          onClick={onOpenSystem}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-[12px] font-medium transition-all duration-200"
          style={{
            background: "var(--accent-dim)",
            color: "var(--accent)",
            border: "1px solid var(--border-accent)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = "var(--accent-glow)";
            (e.currentTarget as HTMLElement).style.boxShadow = "0 0 12px var(--accent-dim)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "var(--accent-dim)";
            (e.currentTarget as HTMLElement).style.boxShadow = "none";
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
          用系统默认程序打开
        </button>
      </div>
    </div>
  );
}
