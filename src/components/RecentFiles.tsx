import { FileInfo } from "../types";
import { detectCategory } from "../utils/fileTypeDetector";
import { formatFileSize, formatDate } from "../utils/fileUtils";
import FileTypeIcon from "./FileTypeIcon";

interface Props {
  files: FileInfo[];
  selectedPath: string | null;
  onSelect: (file: FileInfo) => void;
}

export default function RecentFiles({ files, selectedPath, onSelect }: Props) {
  return (
    <div className="flex flex-col h-full">
      {files.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 gap-3 px-6 text-center">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.2" opacity="0.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>暂无最近文件</p>
          <p className="text-[11px]" style={{ color: "var(--text-muted)", opacity: 0.6 }}>拖拽文件到右侧区域开始</p>
        </div>
      ) : (
        <ul className="flex flex-col divide-y" style={{ "--divide-y": "1px solid var(--border-muted)" } as React.CSSProperties}>
          {files.map((file) => {
            const isSelected = selectedPath === file.path;
            return (
              <li key={file.id}>
                <button
                  onClick={() => onSelect(file)}
                  className="w-full text-left px-3 py-2.5 flex items-center gap-3 group transition-all duration-150"
                  style={{
                    background: isSelected ? "var(--accent-glow)" : "transparent",
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) (e.currentTarget as HTMLElement).style.background = "transparent";
                  }}
                >
                  <FileTypeIcon type={detectCategory(file.path)} size={32} />
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-[12px] truncate font-medium leading-snug"
                      style={{ color: isSelected ? "var(--text-primary)" : "var(--text-secondary)" }}
                    >
                      {file.name}
                    </p>
                    <p className="text-[11px] truncate mt-0.5" style={{ color: "var(--text-muted)" }}>
                      <span>{formatFileSize(file.size)}</span>
                      <span className="mx-1.5 opacity-40">/</span>
                      <span>{formatDate(file.modified_at)}</span>
                    </p>
                  </div>
                  {isSelected && (
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "var(--accent)" }} />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
