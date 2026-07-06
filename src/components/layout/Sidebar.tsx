import { FileInfo } from "../../types";
import { detectCategory } from "../../utils/fileTypeDetector";
import FileTypeIcon from "../FileTypeIcon";

interface Props { files: FileInfo[]; selectedPath: string | null; onSelect: (file: FileInfo) => void; searchQuery?: string; onOpenDialog?: () => void; searchValue?: string; onSearchChange?: (value: string) => void; }

export default function Sidebar({ files, selectedPath, onSelect, onOpenDialog, searchValue, onSearchChange }: Props) {
  return (
    <aside className="workspace-sidebar">
      <div className="sidebar-actions">
        <button type="button" onClick={onOpenDialog} className="open-file-button"><span className="button-brick" aria-hidden="true">+</span><span>打开文件</span><kbd>Ctrl O</kbd></button>
        <label className="file-search"><svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7"/><path d="m16.2 16.2 4 4"/></svg><span className="sr-only">搜索最近文件</span><input value={searchValue} onChange={(event) => onSearchChange?.(event.target.value)} placeholder="搜索最近文件…" autoComplete="off" /></label>
      </div>
      <div className="sidebar-section-heading"><span>最近打开</span><span className="coin-count"><i aria-hidden="true" />{files.length}</span></div>
      <div className="recent-list">
        {files.length === 0 ? <div className="sidebar-empty"><span className="mini-question-block" aria-hidden="true">?</span><strong>还没有文件</strong><span>打开一个文件，它会留在这里</span></div> : files.map((file) => {
          const active = selectedPath === file.path;
          return <button type="button" key={file.id} className={`recent-file ${active ? "is-active" : ""}`} onClick={() => onSelect(file)} title={file.path}><FileTypeIcon type={detectCategory(file.path)} size={38} /><span className="recent-file-copy"><strong>{file.name}</strong><small>{file.extension || "文件"}</small></span>{active && <span className="active-flag" aria-label="当前文件">●</span>}</button>;
        })}
      </div>
      <div className="sidebar-footer"><span className="pipe-status" aria-hidden="true" /><span>本地模式</span><span className="sidebar-footer-spacer" /><span>v1.0</span></div>
    </aside>
  );
}

