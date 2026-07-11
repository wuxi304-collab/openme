import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

// Extensions we render with full-fidelity (binary-safe): PNG/JPG/GIF/BMP/WebP.
// Inline SVG also goes here, with the same <img> renderer (never injected as
// raw SVG to avoid script injection from a malicious archive).
const IMAGE_EXTS = new Set(["png", "jpg", "jpeg", "gif", "bmp", "webp", "svg"]);
const TEXT_EXTS = new Set([
  "txt", "md", "json", "js", "ts", "html", "css", "xml", "yml", "yaml",
  "ini", "log", "py", "rs", "go", "java", "c", "cpp", "h", "sql",
  "sh", "bat", "ps1", "env", "toml", "cfg", "conf", "properties",
]);
const PDF_EXTS = new Set(["pdf"]);
const NESTED_ZIP_EXTS = new Set(["zip", "jar", "war", "apk", "ipa", "epub"]);

type EntryKind = "text" | "image" | "pdf" | "nested-zip" | "unsupported";

interface PreviewText {
  kind: "text";
  text: string;
}
interface PreviewBinary {
  kind: "image" | "pdf";
  url: string;
  mime: string;
}
interface PreviewNested {
  kind: "nested-zip";
  name: string;
}
interface PreviewError {
  kind: "error";
  message: string;
}
type PreviewState =
  | PreviewText
  | PreviewBinary
  | PreviewNested
  | PreviewError
  | { kind: "empty" }; // for binary entries that exist but have zero bytes

function mimeForKind(kind: "image" | "pdf", ext: string): string {
  if (kind === "pdf") return "application/pdf";
  switch (ext) {
    case "png":  return "image/png";
    case "jpg":
    case "jpeg": return "image/jpeg";
    case "gif":  return "image/gif";
    case "bmp":  return "image/bmp";
    case "webp": return "image/webp";
    case "svg":  return "image/svg+xml";
    default:     return "application/octet-stream";
  }
}

function inferEntryKind(name: string): EntryKind {
  const ext = getFileExt(name);
  if (IMAGE_EXTS.has(ext)) return "image";
  if (PDF_EXTS.has(ext)) return "pdf";
  if (TEXT_EXTS.has(ext)) return "text";
  if (NESTED_ZIP_EXTS.has(ext)) return "nested-zip";
  return "unsupported";
}

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
        const kind = inferEntryKind(entry.name);
        const isPreviewable = kind !== "unsupported";
        const iconStroke = kind === "image"
          ? "#5da9ff"
          : kind === "pdf"
            ? "#f06b6b"
            : kind === "nested-zip"
              ? "#c39bff"
              : isPreviewable
                ? "var(--accent)"
                : "var(--text-muted)";
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
                stroke={iconStroke}
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
  preview: PreviewState | null;
  previewLoading: boolean;
  t: (k: string) => string;
  tf: (k: string, p?: Record<string, string | number>) => string;
}

function PreviewPanel({
  selectedEntry,
  preview,
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

  if (!preview) {
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

  if (preview.kind === "error") {
    return (
      <div className="zip-preview-unsupported zip-preview-error" role="alert" aria-label={t("zipPreviewRegionAria")}>
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
        <p>{preview.message}</p>
      </div>
    );
  }

  if (preview.kind === "empty") {
    return (
      <div className="zip-preview-unsupported" role="region" aria-label={t("zipPreviewRegionAria")}>
        <p>{t("zipPreviewEmpty")}</p>
      </div>
    );
  }

  if (preview.kind === "nested-zip") {
    return (
      <div className="zip-preview-unsupported" role="region" aria-label={t("zipPreviewRegionAria")}>
        <p>{tf("zipPreviewNested", { name: preview.name })}</p>
      </div>
    );
  }

  if (preview.kind === "text") {
    return (
      <div className="zip-preview-region" role="region" aria-label={t("zipPreviewRegionAria")}>
        <div className="zip-preview-header">
          <span>{tf("zipPreviewHeader", { name: getFileName(selectedEntry) })}</span>
        </div>
        <pre className="zip-preview-content">{preview.text.slice(0, 50000)}</pre>
      </div>
    );
  }

  if (preview.kind === "image") {
    return (
      <div className="zip-preview-region" role="region" aria-label={t("zipPreviewRegionAria")}>
        <div className="zip-preview-header">
          <span>{tf("zipPreviewHeader", { name: getFileName(selectedEntry) })}</span>
          <span className="zip-preview-kind-chip" aria-hidden="true">{t("zipPreviewKindImage")}</span>
        </div>
        <div className="zip-preview-image-frame">
          <img src={preview.url} alt={getFileName(selectedEntry)} className="zip-preview-image" />
        </div>
      </div>
    );
  }

  // preview.kind === "pdf"
  return (
    <div className="zip-preview-region zip-preview-region--pdf" role="region" aria-label={t("zipPreviewRegionAria")}>
      <div className="zip-preview-header">
        <span>{tf("zipPreviewHeader", { name: getFileName(selectedEntry) })}</span>
        <span className="zip-preview-kind-chip" aria-hidden="true">{t("zipPreviewKindPdf")}</span>
      </div>
      <object
        data={preview.url}
        type={preview.mime}
        className="zip-preview-pdf"
        aria-label={getFileName(selectedEntry)}
      >
        <p>
          {tf("zipPreviewPdfUnsupported", { name: getFileName(selectedEntry) })}
        </p>
      </object>
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
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [unzipping, setUnzipping] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Ref to the current object URL so we can revoke it when the entry
  // changes or the component unmounts. Image/PDF previews are loaded into
  // blob: URLs (not data: URIs) to keep memory low — large images as
  // data URIs make Electron devtools unhappy.
  const blobUrlRef = useRef<string | null>(null);

  // Revoke the prior preview's blob URL whenever preview changes or we
  // unmount. We do this in an effect (not in setState) so that we can
  // safely URL.revokeObjectURL without touching React state.
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, []);

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

  const clearPreview = useCallback(() => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    setPreview(null);
  }, []);

  const handleSelectEntry = useCallback(
    async (entryName: string) => {
      setSelectedEntry(entryName);
      const kind = inferEntryKind(entryName);
      const ext = getFileExt(entryName);

      // Unsupported kind → empty preview surface, no IPC read.
      if (kind === "unsupported") {
        clearPreview();
        return;
      }

      // Nested archive (zip/jar/apk/ipa/epub) → surface a notice rather
      // than recursing (we don't have a recursive renderer yet).
      if (kind === "nested-zip") {
        clearPreview();
        setPreview({ kind: "nested-zip", name: getFileName(entryName) });
        return;
      }

      setPreviewLoading(true);
      try {
        const res = await window.electronAPI.readZipEntry(zipPath, entryName);
        if (!res.success) {
          if (isIpcFailure(res)) {
            setPreview({ kind: "error", message: tf("zipReadError", { message: describeIpcError(t, res) }) });
          } else {
            setPreview({ kind: "error", message: tf("zipReadError", { message: res.message ?? "" }) });
          }
          return;
        }
        // Always rotate the blob URL.
        if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);

        const binary = atob(res.data ?? "");
        if (binary.length === 0) {
          blobUrlRef.current = null;
          setPreview({ kind: "empty" });
          return;
        }
        // Decode base64 → Uint8Array → Blob (preserves binary integrity for
        // images/PDFs; using TextDecoder would corrupt them).
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

        if (kind === "text") {
          // Text preview: use TextDecoder with utf-8 fallback.
          try {
            const decoded = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
            setPreview({ kind: "text", text: decoded });
          } catch {
            setPreview({ kind: "text", text: binary });
          }
          return;
        }

        // Binary kinds (image/pdf): build a blob URL keyed off the right
        // MIME so the renderer (Chrome's <img> + Adobe's PDFium via <object>)
        // can sniff correctly.
        const mime = mimeForKind(kind === "image" ? "image" : "pdf", ext);
        const blob = new Blob([bytes], { type: mime });
        const url = URL.createObjectURL(blob);
        blobUrlRef.current = url;
        if (kind === "image") {
          setPreview({ kind: "image", url, mime });
        } else {
          setPreview({ kind: "pdf", url, mime });
        }
      } catch {
        clearPreview();
        setPreview({ kind: "error", message: t("zipReadErrorShort") });
      } finally {
        setPreviewLoading(false);
      }
    },
    [zipPath, t, tf, clearPreview]
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
            preview={preview}
            previewLoading={previewLoading}
            t={t}
            tf={tf}
          />
        </div>
      </div>
    </div>
  );
}