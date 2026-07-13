import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { FileInfo, type FileCategory } from "../../types";
import { useI18n } from "../../i18n";
import { detectCategory } from "../../utils/fileTypeDetector";
import { getDomainPack, suggestDomainPacks, type PackSuggestion, type SupportedFileCategory } from "../../packs";
import FileTypeIcon from "../FileTypeIcon";
import RecentFileContextMenu from "./RecentFileContextMenu";

interface Props {
  files: FileInfo[];
  selectedPath: string | null;
  onSelect: (file: FileInfo) => void;
  onRemove: (file: FileInfo) => void;
  onOpenDialog?: () => void;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  packSuggestions?: PackSuggestion[];
  // Total recent-file count before the search filter is applied. When
  // this differs from `files.length` we surface a "X / Y" chip next to
  // the search input so users see how many entries were filtered out.
  totalCount?: number;
  onReveal?: (file: FileInfo) => void;
  onOpenInSystem?: (file: FileInfo) => void;
}

export default function Sidebar({ files, selectedPath, onSelect, onRemove, onOpenDialog, searchValue, onSearchChange, packSuggestions = [], totalCount, onReveal, onOpenInSystem }: Props) {
  const { t, tf } = useI18n();
  const selectedFile = files.find((file) => file.path === selectedPath) ?? null;
  const inferredSuggestions = selectedFile
    ? suggestDomainPacks({
        fileName: selectedFile.name,
        category: toPackCategory(detectCategory(selectedFile.path)),
      })
    : [];
  const visibleSuggestions = packSuggestions.length > 0 ? packSuggestions : inferredSuggestions;
  const [menuState, setMenuState] = useState<{ file: FileInfo; x: number; y: number } | null>(null);
  const listboxId = useId();
  const listboxRef = useRef<HTMLDivElement | null>(null);
  // Auto-focus the "Pick files" CTA when the empty state is what the user
  // first encounters (no recents yet). Power users hit Enter immediately;
  // screen reader users hear the button label announced on listbox entry.
  const emptyCtaRef = useRef<HTMLButtonElement | null>(null);
  // Track the visually focused row so ArrowUp/Down/Home/End/Enter work
  // when the user has tabbed into the listbox. We default to the active
  // file (if any) so the keyboard position follows the user's selection.
  const [focusedIndex, setFocusedIndex] = useState<number>(() => {
    if (!selectedPath) return 0;
    const idx = files.findIndex((file) => file.path === selectedPath);
    return idx >= 0 ? idx : 0;
  });
  // When the file list shrinks (e.g. a recent was removed), clamp the
  // focused index so it never points past the end of the array.
  const safeFocusedIndex = Math.min(focusedIndex, Math.max(0, files.length - 1));
  const focusedFile = files[safeFocusedIndex] ?? null;

  const moveFocus = useCallback((next: number) => {
    if (!files.length) return;
    const clamped = (next + files.length) % files.length;
    setFocusedIndex(clamped);
    // Focus the corresponding option synchronously. We previously deferred with
    // requestAnimationFrame to wait for React to commit the new focusedIndex,
    // but rAF never flushes in jsdom so tests silently broke. Synchronous focus
    // works in both jsdom and the real browser because the row's tabIndex
    // (roving tabindex pattern) is already on the option element.
    const listbox = listboxRef.current;
    if (!listbox) return;
    const targetId = `sidebar-option-${listboxId}-${clamped}`;
    const css = (globalThis as { CSS?: { escape?: (v: string) => string } }).CSS;
    const escaper = typeof css?.escape === "function"
      ? (v: string) => css.escape!(v)
      : (v: string) => v.replace(/([^\w-])/g, "\\$1");
    const target = listbox.querySelector<HTMLElement>(`#${escaper(targetId)}`);
    target?.focus();
  }, [files.length, listboxId]);

  const handleListboxKeyDown = useCallback((event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!files.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveFocus(safeFocusedIndex + 1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      moveFocus(safeFocusedIndex - 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      moveFocus(0);
    } else if (event.key === "End") {
      event.preventDefault();
      moveFocus(files.length - 1);
    } else if (event.key === "Enter" || event.key === " ") {
      if (focusedFile) {
        event.preventDefault();
        onSelect(focusedFile);
      }
    }
  }, [files.length, focusedFile, moveFocus, onSelect, safeFocusedIndex]);

  const handleContextMenu = useCallback((event: React.MouseEvent<HTMLDivElement>, file: FileInfo) => {
    event.preventDefault();
    setMenuState({ file, x: event.clientX, y: event.clientY });
  }, []);

  const closeMenu = useCallback(() => setMenuState(null), []);

  // Focus the empty-state CTA so first-time users have a keyboard escape
  // hatch without needing to know it exists. rAF defers past the sidebar's
  // own mount focus so we don't fight whatever was focused before (e.g.
  // the splash close button).
  useEffect(() => {
    if (files.length !== 0) return;
    const handle = requestAnimationFrame(() => {
      if (typeof document === "undefined") return;
      if (document.activeElement && document.activeElement !== document.body) return;
      emptyCtaRef.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(handle);
  }, [files.length]);

  const handleCopyPath = useCallback(async (file: FileInfo): Promise<boolean> => {
    if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) return false;
    try {
      await navigator.clipboard.writeText(file.path);
      return true;
    } catch {
      return false;
    }
  }, []);

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
                    {searchValue && totalCount !== undefined && totalCount > 0 && (
                      <span
                        className="file-search-count"
                        role="status"
                        aria-live="polite"
                        title={tf("sidebarSearchCountTitle", { count: files.length, total: totalCount })}
                      >
                        {tf("sidebarSearchCount", { count: files.length, total: totalCount })}
                      </span>
                    )}
                  </label>
                </div>

      <div className="sidebar-section-heading">
        <span>{t("recentOpened")}</span>
        <span className="coin-count"><i aria-hidden="true" />{files.length}</span>
      </div>
      <div className="recent-list" role="listbox" aria-label={t("sidebarRecentA11y")} tabIndex={files.length ? 0 : -1} ref={listboxRef} onKeyDown={handleListboxKeyDown} aria-activedescendant={focusedFile ? `sidebar-option-${listboxId}-${safeFocusedIndex}` : undefined}>
        {files.length === 0 ? (
                <div className="sidebar-empty" aria-label={t("sidebarEmptyA11y")} role="group">
            <span className="mini-question-block" aria-hidden="true">?</span>
            <strong>{t("noFilesYet")}</strong>
            <span>{t("openFileHint")}</span>
            {onOpenDialog && (
              <>
                <button
                  type="button"
                  ref={emptyCtaRef}
                  className="sidebar-empty-browse"
                  onClick={onOpenDialog}
                  aria-keyshortcuts="Enter"
                >
                  {t("sidebarEmptyBrowse")}
                  <kbd aria-hidden="true" className="sidebar-empty-browse-kbd">Enter</kbd>
                </button>
                <span className="sidebar-empty-drop-hint">{t("sidebarEmptyDropShort")}</span>
              </>
            )}
          </div>
        ) : (
                files.map((file, index) => {
            const active = selectedPath === file.path;
                  const focused = index === safeFocusedIndex;
                  return (
                              <div
                                className={`recent-row ${active ? "is-active" : ""}`}
                                key={file.path || index}
                                onContextMenu={(event) => handleContextMenu(event, file)}
                              >
                                <button
                                  type="button"
                                  className="recent-file"
                                  role="option"
                                  id={`sidebar-option-${listboxId}-${index}`}
                                  aria-selected={active}
                                  tabIndex={focused ? 0 : -1}
                                  onClick={() => { setFocusedIndex(index); onSelect(file); }}
                                  onFocus={() => setFocusedIndex(index)}
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
                      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
                        {focusedFile ? tf("sidebarItemAnnounce", { name: focusedFile.name, position: safeFocusedIndex + 1, total: files.length }) : ""}
                      </div>

                <RecentFileContextMenu
                  open={menuState !== null}
                  position={menuState ? { x: menuState.x, y: menuState.y } : null}
                  file={menuState?.file ?? null}
                  onClose={closeMenu}
                  onOpen={onSelect}
                  onReveal={onReveal ?? ((file) => { void file; })}
                  onCopyPath={handleCopyPath}
                  onOpenInSystem={onOpenInSystem ?? ((file) => { void file; })}
                  onRemove={onRemove}
                />

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
