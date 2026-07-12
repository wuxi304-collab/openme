import { useCallback, useRef, useState } from "react";
import { useI18n } from "../i18n";

interface Props {
  onFileDrop: (paths: string[]) => void;
  onOpenDialog?: () => void;
  /**
   * `fill`     → full panel that occupies its parent. Includes a browse
   *              button and hidden file input so users have an alternative
   *              action when there's no drag context (e.g. empty workspace).
   * `overlay`  → fixed-position surface that covers the entire window. No
   *              browse button / file input — the parent (App) controls
   *              when the overlay mounts based on drag state elsewhere.
   *              Drops are routed via `onFileDrop` exactly like the fill
   *              variant; the parent closes the overlay after handling.
   */
  variant?: "fill" | "overlay";
}

export default function FileDropZone({ onFileDrop, onOpenDialog, variant = "fill" }: Props) {
  const { t } = useI18n();
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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

  const openWithPicker = useCallback(() => {
    if (onOpenDialog) {
      onOpenDialog();
      return;
    }
    inputRef.current?.click();
  }, [onOpenDialog]);

  const handlePickerChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;
      const paths = Array.from(files)
        .map((f) => (f as File & { path?: string }).path ?? f.name)
        .filter(Boolean);
      if (paths.length > 0) onFileDrop(paths);
      e.target.value = "";
    },
    [onFileDrop]
  );

  const accent = "var(--accent)";
  const muted = "var(--text-muted)";
  const color = dragging ? accent : muted;

  const formatChips: ReadonlyArray<{ key: string; color: string; tint: string }> = [
    { key: "PDF", color: "#f85149", tint: "rgba(248,81,73,0.10)" },
    { key: "imageCat", color: "#a371f7", tint: "rgba(163,113,247,0.10)" },
    { key: "textCat", color: "#3fb950", tint: "rgba(63,185,80,0.10)" },
    { key: "codeCat", color: "#58a6ff", tint: "rgba(88,166,255,0.10)" },
  ];

  // ---- Overlay variant: fixed-position drop surface -----------
  if (variant === "overlay") {
    return (
      <div
        role="region"
        aria-label={t("dropOverlayAria")}
        aria-describedby="file-drop-overlay-hint"
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className="file-drop-overlay"
        data-dragging={dragging ? "true" : "false"}
      >
        <div className="file-drop-overlay-card">
          <div className="file-drop-overlay-icon" aria-hidden="true">
            <svg
              width="32"
              height="32"
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
          <p className="file-drop-overlay-title" style={{ color }}>
            {dragging ? t("dropRelease") : t("dropOverlayAria")}
          </p>
          <p
            id="file-drop-overlay-hint"
            className="file-drop-overlay-subtitle"
          >
            {t("dropHint")}
          </p>
          <ul
            aria-label={t("dropZoneSupportedFormatsAria")}
            className="file-drop-overlay-chips"
          >
            {formatChips.map(({ key, color: chipColor, tint }) => (
              <li
                key={key}
                style={{ color: chipColor, background: tint, borderColor: `${chipColor}55` }}
              >
                {key === "PDF" ? key : t(key)}
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  // ---- Fill variant: full panel drop target -------------------

  return (
    <section
      role="region"
      aria-label={t("dropZoneAria")}
        aria-describedby="file-drop-zone-hint"
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className="flex flex-col items-center justify-center flex-1 rounded-xl border-2 border-dashed transition-all duration-200 select-none"
        style={{
          borderColor: dragging ? "var(--accent)" : "var(--border-default)",
          background: dragging ? "var(--accent-glow)" : "transparent",
        }}
      >
        <div className="flex flex-col items-center gap-5 text-center px-8">
          <div
            aria-hidden="true"
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
              aria-hidden="true"
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
              {dragging ? t("dropRelease") : t("dropHere")}
            </p>
            <p
              id="file-drop-zone-hint"
              className="text-[12px]"
              style={{ color: "var(--text-muted)" }}
            >
              {t("dropHint")}
            </p>
          </div>
          <button
            type="button"
            onClick={openWithPicker}
            aria-describedby="file-drop-zone-hint"
            className="px-4 py-2 rounded-lg text-[12px] font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--accent)]"
            style={{
              background: "var(--accent)",
              color: "var(--bg-app)",
            }}
          >
            {t("browseFiles")}
          </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="sr-only"
          onChange={handlePickerChange}
          tabIndex={-1}
          aria-hidden="true"
        />
        <ul
          aria-label={t("dropZoneSupportedFormatsAria")}
          className="flex items-center gap-4 pt-2 list-none m-0 p-0"
        >
          {formatChips.map(({ key, color: chipColor, tint }) => (
            <li
              key={key}
              className="px-2 py-0.5 rounded text-[10px] font-medium"
              style={{ background: tint, color: chipColor, border: `1px solid ${chipColor}55` }}
            >
              {key === "PDF" ? key : t(key)}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
