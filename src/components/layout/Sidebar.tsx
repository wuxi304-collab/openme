import { FileInfo, type FileCategory } from "../../types";
import { useI18n } from "../../i18n";
import { detectCategory } from "../../utils/fileTypeDetector";
import { getDomainPack, suggestDomainPacks, type PackSuggestion, type SupportedFileCategory } from "../../packs";
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
  const { t, tf } = useI18n();
  const selectedFile = files.find((file) => file.path === selectedPath) ?? null;
  const inferredSuggestions = selectedFile
    ? suggestDomainPacks({
        fileName: selectedFile.name,
        category: toPackCategory(detectCategory(selectedFile.path)),
      })
    : [];
  const visibleSuggestions = packSuggestions.length > 0 ? packSuggestions : inferredSuggestions;

  return (
    <aside className="workspace-sidebar">
      <div className="sidebar-actions">
        <button type="button" onClick={onOpenDialog} className="open-file-button">
          <span className="button-brick" aria-hidden="true">+</span>
          <span>{t("openFile")}</span>
          <kbd>Ctrl O</kbd>
        </button>
        <label className="file-search">
          <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="7" />
            <path d="m16.2 16.2 4 4" />
          </svg>
          <span className="sr-only">{t("searchRecent")}</span>
          <input
            value={searchValue}
            onChange={(event) => onSearchChange?.(event.target.value)}
            placeholder={t("searchRecentPlaceholder")}
            autoComplete="off"
          />
        </label>
      </div>

      <div className="sidebar-section-heading">
        <span>{t("recentOpened")}</span>
        <span className="coin-count"><i aria-hidden="true" />{files.length}</span>
      </div>
      <div className="recent-list" role="list" aria-label={t("sidebarRecentA11y")}>
        {files.length === 0 ? (
          <div className="sidebar-empty">
            <span className="mini-question-block" aria-hidden="true">?</span>
            <strong>{t("noFilesYet")}</strong>
            <span>{t("openFileHint")}</span>
            {onOpenDialog && (
              <>
                <button
                  type="button"
                  className="sidebar-empty-browse"
                  onClick={onOpenDialog}
                >
                  {t("sidebarEmptyBrowse")}
                </button>
                <span className="sidebar-empty-drop-hint">{t("sidebarEmptyDropShort")}</span>
              </>
            )}
          </div>
        ) : (
          files.map((file) => {
            const active = selectedPath === file.path;
            return (
              <div className={`recent-row ${active ? "is-active" : ""}`} key={file.id}>
                <button
                  type="button"
                  className="recent-file"
                  onClick={() => onSelect(file)}
                  title={file.path}
                  aria-current={active ? "true" : undefined}
                >
                  <FileTypeIcon type={detectCategory(file.path)} size={38} extension={file.extension} />
                  <span className="recent-file-copy">
                    <strong>{file.name}</strong>
                    <small>{file.extension || t("fileTypeSuffix")}</small>
                  </span>
                  {active && <span className="active-flag" aria-label={t("currentFileFlag")}>●</span>}
                </button>
                <button
                  type="button"
                  className="recent-remove"
                  aria-label={tf("removeFromRecent", { name: file.name })}
                  title={t("removeFromListTitle")}
                  onClick={() => onRemove(file)}
                >
                  ×
                </button>
              </div>
            );
          })
        )}
      </div>

      <PackSuggestionPanel suggestions={visibleSuggestions} />

      <div className="sidebar-footer">
        <span className="pipe-status" aria-hidden="true" />
        <span>{t("localMode")}</span>
        <span className="sidebar-footer-spacer" />
        <span>v1.0</span>
      </div>
    </aside>
  );
}

function toPackCategory(category: FileCategory): SupportedFileCategory {
  switch (category) {
    case "markdown":
      return "text";
    case "json":
    case "csv":
      return "data";
    case "cad":
      return "model3d";
    case "dwg":
      return "dwg";
    case "code":
    case "image":
    case "svg":
    case "pdf":
    case "office":
    case "archive":
    case "epub":
    case "audio":
    case "video":
    case "font":
    case "other":
      return category;
    default:
      return "other";
  }
}

function PackSuggestionPanel({ suggestions }: { suggestions: PackSuggestion[] }) {
  const { t } = useI18n();
  const visible = suggestions.slice(0, 3).map((suggestion) => ({ suggestion, pack: getDomainPack(suggestion.packId) })).filter((item) => item.pack);

  return (
    <section
      aria-label={t("capCardAria")}
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
        <strong style={{ fontSize: 12, color: "#263238", letterSpacing: "0.02em" }}>{t("capabilityTitle")}</strong>
        <span style={{ fontSize: 11, color: "#607D8B", fontWeight: 700 }}>{visible.length ? t("localGuess") : t("awaitingFile")}</span>
      </div>

      {visible.length === 0 ? (
        <p style={{ margin: 0, fontSize: 12, color: "#607D8B", lineHeight: 1.55 }}>{t("capabilityDesc")}</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {visible.map(({ suggestion, pack }) => (
            <div key={suggestion.packId} style={{ padding: "9px 10px", borderRadius: 12, background: "rgba(248,250,252,0.86)", border: "1px solid rgba(148,163,184,0.2)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                <strong style={{ fontSize: 12, color: "#111827" }}>{t(pack!.zhName)}</strong>
                <span style={{ fontSize: 10, color: "#475569", fontWeight: 800 }}>{Math.round(suggestion.confidence * 100)}%</span>
              </div>
              <p style={{ margin: "3px 0 0", fontSize: 11, color: "#64748B", lineHeight: 1.45 }}>{t(pack!.tagline)}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
