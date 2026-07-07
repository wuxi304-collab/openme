import { FileInfo } from "../../types";
import { detectCategory } from "../../utils/fileTypeDetector";
import { getDomainPack, type PackSuggestion } from "../../packs";
import FileTypeIcon from "../FileTypeIcon";

interface Props {
  files: FileInfo[];
  selectedPath: string | null;
  onSelect: (file: FileInfo) => void;
  onRemove: (file: FileInfo) => void;
  onOpenDialog?: () => void;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  packSuggestions?: PackSuggestion[];
}

export default function Sidebar({ files, selectedPath, onSelect, onRemove, onOpenDialog, searchValue, onSearchChange, packSuggestions = [] }: Props) {
  return (
    <aside className="workspace-sidebar">
      <div className="sidebar-actions">
        <button type="button" onClick={onOpenDialog} className="open-file-button"><span className="button-brick" aria-hidden="true">+</span><span>打开文件</span><kbd>Ctrl O</kbd></button>
        <label className="file-search"><svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7"/><path d="m16.2 16.2 4 4"/></svg><span className="sr-only">搜索最近文件</span><input value={searchValue} onChange={(event) => onSearchChange?.(event.target.value)} placeholder="搜索最近文件…" autoComplete="off" /></label>
      </div>

      <div className="sidebar-section-heading"><span>最近打开</span><span className="coin-count"><i aria-hidden="true" />{files.length}</span></div>
      <div className="recent-list">{files.length === 0 ? <div className="sidebar-empty"><span className="mini-question-block" aria-hidden="true">?</span><strong>还没有文件</strong><span>打开一个文件，它会留在这里</span></div> : files.map((file) => { const active = selectedPath === file.path; return <div className={`recent-row ${active ? "is-active" : ""}`} key={file.id}><button type="button" className="recent-file" onClick={() => onSelect(file)} title={file.path}><FileTypeIcon type={detectCategory(file.path)} size={38} /><span className="recent-file-copy"><strong>{file.name}</strong><small>{file.extension || "文件"}</small></span>{active && <span className="active-flag" aria-label="当前文件">●</span>}</button><button type="button" className="recent-remove" aria-label={`从最近文件移除 ${file.name}`} title="从列表移除" onClick={() => onRemove(file)}>×</button></div>; })}</div>

      <PackSuggestionPanel suggestions={packSuggestions} />

      <div className="sidebar-footer"><span className="pipe-status" aria-hidden="true" /><span>本地模式</span><span className="sidebar-footer-spacer" /><span>v1.0</span></div>
    </aside>
  );
}

function PackSuggestionPanel({ suggestions }: { suggestions: PackSuggestion[] }) {
  const visible = suggestions.slice(0, 3).map((suggestion) => ({ suggestion, pack: getDomainPack(suggestion.packId) })).filter((item) => item.pack);

  return (
    <section
      aria-label="可能适用的能力包"
      style={{
        margin: "12px 12px 0",
        padding: 12,
        borderRadius: 16,
        background: "rgba(255,255,255,0.72)",
        border: "1px solid rgba(255,255,255,0.72)",
        boxShadow: "0 8px 24px rgba(15,23,42,0.08)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 10 }}>
        <strong style={{ fontSize: 12, color: "#263238", letterSpacing: "0.02em" }}>能力包建议</strong>
        <span style={{ fontSize: 11, color: "#607D8B", fontWeight: 700 }}>{visible.length ? "本地判断" : "待打开文件"}</span>
      </div>

      {visible.length === 0 ? (
        <p style={{ margin: 0, fontSize: 12, color: "#607D8B", lineHeight: 1.55 }}>打开文件后，OpenMe 会根据格式和文件名给出可用能力包建议。</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {visible.map(({ suggestion, pack }) => (
            <div key={suggestion.packId} style={{ padding: "9px 10px", borderRadius: 12, background: "rgba(248,250,252,0.86)", border: "1px solid rgba(148,163,184,0.2)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                <strong style={{ fontSize: 12, color: "#111827" }}>{pack!.zhName}</strong>
                <span style={{ fontSize: 10, color: "#475569", fontWeight: 800 }}>{Math.round(suggestion.confidence * 100)}%</span>
              </div>
              <p style={{ margin: "3px 0 0", fontSize: 11, color: "#64748B", lineHeight: 1.45 }}>{pack!.tagline}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
