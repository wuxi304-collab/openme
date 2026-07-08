import { useEffect, useState } from "react";
import { useI18n } from "../../i18n";
import { describeIpcError, isIpcFailure } from "../../core/ipcError";

interface ZipEntry {
  name: string;
  isDir: boolean;
  size: number;
  safe?: boolean;
}

interface Props {
  zipPath: string;
}

function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

function getFileName(path: string): string {
  const parts = path.split(/[/\\]/);
  return parts[parts.length - 1];
}

function getFileExt(name: string): string {
  const lastDot = name.lastIndexOf(".");
  if (lastDot <= 0) return "";
  return name.slice(lastDot + 1).toLowerCase();
}

const PREVIEWABLE = new Set(["txt", "md", "json", "js", "ts", "html", "css", "xml", "yml", "yaml", "ini", "log", "py", "rs", "go", "java", "c", "cpp", "h", "sql", "sh", "bat", "ps1", "env", "toml", "cfg", "conf", "properties"]);

export default function ZipViewer({ zipPath }: Props) {
  const { t, tf } = useI18n();
  const [entries, setEntries] = useState<ZipEntry[]>([]);
  const [directoryCount, setDirectoryCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<string | null>(null);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [unzipping, setUnzipping] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    window.electronAPI.listZipContents(zipPath)
      .then((res: any) => {
        if (res.success) {
          const archiveEntries = res.entries as ZipEntry[];
          setDirectoryCount(archiveEntries.filter((entry) => entry.isDir).length);
          setEntries(archiveEntries.filter((entry) => !entry.isDir).sort((a, b) => a.name.localeCompare(b.name)));
          setLoading(false);
              } else if (isIpcFailure(res)) {
                setError(describeIpcError(t, res));
          setLoading(false);
              } else {
                setError(res.message ?? t("zipLoadError"));
                setLoading(false);
              }
            })
      .catch((e: any) => { setError(e.message); setLoading(false); });
  }, [zipPath, t]);

  const handleSelectEntry = async (entryName: string) => {
    setSelectedEntry(entryName);
    const ext = getFileExt(entryName);
    if (!PREVIEWABLE.has(ext)) { setPreviewContent(null); return; }
    setPreviewLoading(true);
    try {
      const res: any = await window.electronAPI.readZipEntry(zipPath, entryName);
      if (res.success) {
        const binary = atob(res.data);
        setPreviewContent(binary);
            } else if (isIpcFailure(res)) {
              setPreviewContent(tf("zipReadError", { message: describeIpcError(t, res) }));
            } else {
              setPreviewContent(tf("zipReadError", { message: res.message ?? "" }));
            }
    } catch {
      setPreviewContent(t("zipReadErrorShort"));
    }
    finally { setPreviewLoading(false); }
  };

  const handleUnzip = async () => {
    setUnzipping(true);
    setActionError(null);
    try {
      const targetDir = await window.electronAPI.selectFolderDialog();
      if (!targetDir) { setUnzipping(false); return; }
      const res: any = await window.electronAPI.unzipFile(zipPath, targetDir);
      if (res.success) {
        const folderName = getFileName(zipPath).replace(/\.[^.]+$/, "");
        const finalDir = targetDir + (targetDir.endsWith("\\") || targetDir.endsWith("/") ? "" : "\\") + folderName;
        await window.electronAPI.openInSystem(finalDir);
            } else if (isIpcFailure(res)) {
              setActionError(tf("zipActionError", { message: describeIpcError(t, res) }));
            } else {
              setActionError(tf("zipActionError", { message: res.message ?? "" }));
            }
    } catch (e: any) {
      setActionError(tf("zipActionError", { message: e?.message ?? "" }));
    }
    finally { setUnzipping(false); }
  };

  const dirCount = directoryCount;
  const fileCount = entries.length;

  if (loading) {
    return (
      <div className="flex flex-col h-full rounded-lg border" style={{ borderColor: "var(--border-default)", background: "var(--bg-base)" }}>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "#56d4dd", borderTopColor: "transparent" }} />
            <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>{t("zipLoading")}</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-full rounded-lg border" style={{ borderColor: "var(--border-default)", background: "var(--bg-base)" }}>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-[12px]" style={{ color: "var(--error)" }}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full rounded-lg border overflow-hidden" style={{ borderColor: "var(--border-default)", background: "var(--bg-base)" }}>
      <div className="flex items-center justify-between px-3 py-1.5 border-b flex-shrink-0" style={{ borderColor: "var(--border-muted)", background: "var(--bg-surface)" }}>
        <div className="flex items-center gap-3">
          <span className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: "var(--text-muted)" }}>ZIP</span>
          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{tf("zipCount", { files: fileCount, dirs: dirCount })}</span>
        </div>
        <button
          onClick={handleUnzip}
          disabled={unzipping}
          className="flex items-center gap-1.5 px-3 py-1 rounded text-[11px] font-medium transition-opacity disabled:opacity-50"
          style={{ background: "#56d4dd", color: "#fff" }}
        >
          {unzipping ? t("zipUnzipping") : t("zipUnzip")}
        </button>
      </div>

      {actionError && (
        <div className="archive-action-error" role="alert">
          <span>{actionError}</span>
          <button type="button" aria-label={t("zipCloseErrorAria")} onClick={() => setActionError(null)}>×</button>
        </div>
      )}
      <div className="flex flex-1 min-h-0">
        {/* File list */}
        <div className="flex-1 overflow-auto border-r" style={{ borderColor: "var(--border-muted)" }}>
          {entries.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>{t("zipEmpty")}</p>
            </div>
          ) : (
            <ul>
              {entries.map((entry) => {
                const isSelected = selectedEntry === entry.name;
                const ext = getFileExt(entry.name);
                const isPreviewable = PREVIEWABLE.has(ext);
                return (
                  <li key={entry.name}>
                    <button
                      onClick={() => handleSelectEntry(entry.name)}
                      className="w-full text-left px-3 py-2 flex items-center gap-2 transition-colors"
                      style={{
                        background: isSelected ? "var(--accent-glow)" : "transparent",
                      }}
                      onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)"; }}
                      onMouseLeave={(e) => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={isPreviewable ? "#58a6ff" : "#6e7681"} strokeWidth="1.5">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] truncate" style={{ color: isSelected ? "var(--text-primary)" : "var(--text-secondary)" }}>{getFileName(entry.name) || entry.name}</p>
                        <p className="text-[10px] truncate" style={{ color: "var(--text-muted)" }}>{entry.name}</p>
                      </div>
                      {entry.size > 0 && (
                        <span className="text-[10px] flex-shrink-0" style={{ color: "var(--text-muted)" }}>{formatSize(entry.size)}</span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Preview panel */}
        <div className="flex-1 flex flex-col min-w-0">
          {selectedEntry ? (
            previewLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
              </div>
            ) : previewContent !== null ? (
              <div className="flex flex-col h-full">
                <div className="px-3 py-1.5 border-b flex-shrink-0" style={{ borderColor: "var(--border-muted)", background: "var(--bg-surface)" }}>
                  <span className="text-[10px] uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>{tf("zipPreviewHeader", { name: getFileName(selectedEntry) })}</span>
                </div>
                <pre
                  className="flex-1 overflow-auto p-3 text-[11px] leading-relaxed"
                  style={{
                    fontFamily: "var(--font-mono)",
                    color: "var(--text-secondary)",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-all",
                  }}
                >
                  {previewContent.slice(0, 50000)}
                </pre>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-2">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>{t("zipPreviewUnsupported")}</p>
              </div>
            )
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-2">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.2" opacity="0.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>{t("zipPreviewPrompt")}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
