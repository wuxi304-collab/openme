import { useCallback, useEffect, useMemo, useState } from "react";
import { useI18n } from "../../i18n";
import { describeIpcError, isIpcFailure } from "../../core/ipcError";
import ViewerError from "../ViewerError";
import "../ViewerError.css";
import "./ZipViewer.css";

interface ZipEntry {
  name: string;
  isDir: boolean;
  size: number;
  safe?: boolean;
}

interface Props {
  zipPath: string;
}

const PREVIEWABLE = new Set([
  "txt", "md", "json", "js", "ts", "html", "css", "xml", "yml", "yaml",
  "ini", "log", "py", "rs", "go", "java", "c", "cpp", "h", "sql",
  "sh", "bat", "ps1", "env", "toml", "cfg", "conf", "properties",
]);

function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

function getFileName(path: string): string {
  const parts = path.split(/[/\\]/);
  return parts[parts.length - 1] || path;
}

function getFileExt(name: string): string {
  const lastDot = name.lastIndexOf(".");
  if (lastDot <= 0) return "";
  return name.slice(lastDot + 1).toLowerCase();
}

function Spinner({ ariaLabel }: { ariaLabel: string }) {
  return (
    <div
      className="zip-spinner"
      role="status"
      aria-label={ariaLabel}
      aria-live="polite"
    >
      <span className="zip-spinner-ring" aria-hidden="true" />
    </div>
  );
}

interface ZipHeaderProps {
  fileCount: number;
  dirCount: number;
  unzipping: boolean;
  onUnzip: () => void;
  t: (k: string) => string;
  tf: (k: string, p?: Record<string, string | number>) => string;
}

function ZipHeader({ fileCount, dirCount, unzipping, onUnzip, t, tf }: ZipHeaderProps) {
  return (
    <div className="zip-header" role="toolbar" aria-label={t("zipToolbarAria")}>
      <div className="zip-header-meta">
        <span className="zip-header-badge">ZIP</span>
        <span className="zip-header-count">
          {tf("zipCount", { files: fileCount, dirs: dirCount })}
        </span>
      </div>
      <button
        type="button"
        className="zip-unzip-button"
        onClick={onUnzip}
        disabled={unzipping}
      >
        {unzipping ? t("zipUnzipping") : t("zipUnzip")}
      </button>
    </div>
  );
}

interface EntryListProps {
  entries: ZipEntry[];
  selectedEntry: string | null;
  onSelect: (name: string) => void;
  t: (k: string) => string;
  tf: (k: string, p?: Record<string, string | number>) => string;
}

function EntryList({ entries, selectedEntry, onSelect, t, tf }: EntryListProps) {
  if (entries.length === 0) {
    return (
      <div className="zip-empty">
        <p>{t("zipEmpty")}</p>
      </div>
    );
  }
  return (
    <ul
      className="zip-entry-list"
      role="listbox"
      aria-label={t("zipEntryListAria")}
      aria-activedescendant={selectedEntry ?? undefined}
    >
      {entries.map((entry) => {
        const isSelected = selectedEntry === entry.name;
        const ext = getFileExt(entry.name);
        const isPreviewable = PREVIEWABLE.has(ext);
        return (
          <li key={entry.name} role="presentation">
            <button
              id={`zip-entry-${entry.name}`}
              type="button"
              role="option"
              aria-selected={isSelected}
              className={`zip-entry-button${isSelected ? " is-selected" : ""}`}
              onClick={() => onSelect(entry.name)}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke={isPreviewable ? "var(--accent)" : "var(--text-muted)"}
                strokeWidth="1.5"
                aria-hidden="true"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <div className="zip-entry-text">
                <p className="zip-entry-name">{getFileName(entry.name) || entry.name}</p>
                <p className="zip-entry-path">{entry.name}</p>
              </div>
              {entry.size > 0 && (
                <span
                  className="zip-entry-size"
                  aria-label={tf("zipEntrySizeAria", { size: entry.size })}
                >
                  {formatSize(entry.size)}
                </span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

interface PreviewPanelProps {
  selectedEntry: string | null;
  previewContent: string | null;
  previewLoading: boolean;
  t: (k: string) => string;
  tf: (k: string, p?: Record<string, string | number>) => string;
}

function PreviewPanel({
  selectedEntry,
  previewContent,
  previewLoading,
  t,
  tf,
}: PreviewPanelProps) {
  if (!selectedEntry) {
    return (
      <div className="zip-preview-prompt" role="region" aria-label={t("zipPreviewRegionAria")}>
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--text-muted)"
          strokeWidth="1.2"
          opacity="0.5"
          aria-hidden="true"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
        <p>{t("zipPreviewPrompt")}</p>
      </div>
    );
  }

  if (previewLoading) {
    return (
      <div
        className="zip-preview-loading"
        role="region"
        aria-label={t("zipPreviewRegionAria")}
        aria-busy="true"
      >
        <Spinner ariaLabel={tf("zipPreviewLoadingAria", { name: getFileName(selectedEntry) })} />
      </div>
    );
  }

  if (previewContent === null) {
    return (
      <div className="zip-preview-unsupported" role="region" aria-label={t("zipPreviewRegionAria")}>
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--text-muted)"
          strokeWidth="1.5"
          aria-hidden="true"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
        <p>{t("zipPreviewUnsupported")}</p>
      </div>
    );
  }

  return (
    <div className="zip-preview-region" role="region" aria-label={t("zipPreviewRegionAria")}>
      <div className="zip-preview-header">
        <span>{tf("zipPreviewHeader", { name: getFileName(selectedEntry) })}</span>
      </div>
      <pre className="zip-preview-content">{previewContent.slice(0, 50000)}</pre>
    </div>
  );
}

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
      .then((res) => {
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
      .catch((e) => {
        setError(e instanceof Error ? e.message : String(e));
        setLoading(false);
      });
  }, [zipPath, t]);

  const handleSelectEntry = useCallback(
    async (entryName: string) => {
      setSelectedEntry(entryName);
      const ext = getFileExt(entryName);
      if (!PREVIEWABLE.has(ext)) {
        setPreviewContent(null);
        return;
      }
      setPreviewLoading(true);
      try {
        const res = await window.electronAPI.readZipEntry(zipPath, entryName);
        if (res.success) {
          const binary = atob(res.data ?? "");
          setPreviewContent(binary);
        } else if (isIpcFailure(res)) {
          setPreviewContent(tf("zipReadError", { message: describeIpcError(t, res) }));
        } else {
          setPreviewContent(tf("zipReadError", { message: res.message ?? "" }));
        }
      } catch {
        setPreviewContent(t("zipReadErrorShort"));
      } finally {
        setPreviewLoading(false);
      }
    },
    [zipPath, t, tf]
  );

  const handleUnzip = useCallback(async () => {
    setUnzipping(true);
    setActionError(null);
    try {
      const targetDir = await window.electronAPI.selectFolderDialog();
      if (!targetDir) {
        setUnzipping(false);
        return;
      }
      const res = await window.electronAPI.unzipFile(zipPath, targetDir);
      if (res.success) {
        const folderName = getFileName(zipPath).replace(/\.[^.]+$/, "");
        const finalDir = targetDir + (targetDir.endsWith("\\") || targetDir.endsWith("/") ? "" : "\\") + folderName;
        await window.electronAPI.openInSystem(finalDir);
      } else if (isIpcFailure(res)) {
        setActionError(tf("zipActionError", { message: describeIpcError(t, res) }));
      } else {
        setActionError(tf("zipActionError", { message: res.message ?? "" }));
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "";
      setActionError(tf("zipActionError", { message }));
    } finally {
      setUnzipping(false);
    }
  }, [zipPath, t, tf]);

  const fileCount = entries.length;
  const dirCount = directoryCount;

  const list = useMemo(
    () => ({ entries, selectedEntry, onSelect: handleSelectEntry }),
    [entries, selectedEntry, handleSelectEntry]
  );

  if (loading) {
    return (
      <div className="zip-viewer zip-viewer-loading">
        <Spinner ariaLabel={t("zipLoading")} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="zip-viewer zip-viewer-error">
        <ViewerError title={t("zipLoadError")} message={error} />
      </div>
    );
  }

  return (
    <div className="zip-viewer">
      <ZipHeader
        fileCount={fileCount}
        dirCount={dirCount}
        unzipping={unzipping}
        onUnzip={handleUnzip}
        t={t}
        tf={tf}
      />
      {actionError && (
        <ViewerError
          variant="inline"
          title={t("zipActionErrorShort")}
          message={actionError}
          onClose={() => setActionError(null)}
          closeLabel={t("zipCloseErrorAria")}
        />
      )}
      <div className="zip-body">
        <div className="zip-entry-pane">
          <EntryList entries={list.entries} selectedEntry={list.selectedEntry} onSelect={list.onSelect} t={t} tf={tf} />
        </div>
        <div className="zip-preview-pane">
          <PreviewPanel
            selectedEntry={selectedEntry}
            previewContent={previewContent}
            previewLoading={previewLoading}
            t={t}
            tf={tf}
          />
        </div>
      </div>
    </div>
  );
}