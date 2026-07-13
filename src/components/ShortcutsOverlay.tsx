import { useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "../i18n";

interface Props {
  open: boolean;
  onClose: () => void;
}

interface Entry {
  keys: string;
  labelKey: string;
  single?: boolean;
}
interface Group {
  titleKey: string;
  entries: Entry[];
}

const SHORTCUT_GROUPS: Group[] = [
  {
    titleKey: "shortcutsGroupFiles",
    entries: [
      { keys: "Ctrl O", labelKey: "aboutShortcutOpen" },
      { keys: "Ctrl S", labelKey: "aboutShortcutSave" },
    ],
  },
  {
    titleKey: "shortcutsGroupTabs",
    entries: [
      { keys: "Ctrl Tab", labelKey: "shortcutsNextTab" },
      { keys: "Ctrl Shift Tab", labelKey: "shortcutsPrevTab" },
      { keys: "Alt 1-9", labelKey: "shortcutsJumpTab" },
      { keys: "Ctrl W", labelKey: "aboutShortcutCloseTab" },
    ],
  },
  {
    titleKey: "shortcutsGroupApp",
    entries: [
      { keys: "Ctrl K", labelKey: "aboutShortcutPalette" },
      { keys: "?", labelKey: "shortcutsShowOverlay", single: true },
      { keys: "Esc", labelKey: "shortcutsCloseOverlay", single: true },
    ],
  },
];

export function ShortcutsOverlay({ open, onClose }: Props) {
  const { t, tf } = useI18n();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const filteredGroups = useMemo(() => {
    if (!q) return SHORTCUT_GROUPS;
    return SHORTCUT_GROUPS
      .map((group) => ({
        ...group,
        entries: group.entries.filter((entry) => {
          const label = t(entry.labelKey).toLowerCase();
          return entry.keys.toLowerCase().includes(q) || label.includes(q);
        }),
      }))
      .filter((group) => group.entries.length > 0);
  }, [q, t]);

  const totalEntries = SHORTCUT_GROUPS.reduce((sum, g) => sum + g.entries.length, 0);
  const shownEntries = filteredGroups.reduce((sum, g) => sum + g.entries.length, 0);

  useEffect(() => {
    if (!open) {
      // Reset query on close so the next open starts clean.
      setQuery("");
      return undefined;
    }
    lastFocusedRef.current = document.activeElement as HTMLElement | null;
    const closeBtn = dialogRef.current?.querySelector<HTMLButtonElement>(".shortcuts-overlay-close");
    closeBtn?.focus();
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const inSearch = !!target?.classList?.contains("shortcuts-overlay-search-input");
      if (e.key === "Escape") {
        // First Escape inside the search input clears the filter; the second
        // close. Mirrors the SettingsDialog search contract (PR #163).
        if (inSearch && query !== "") {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation?.();
          setQuery("");
          return;
        }
        e.stopPropagation();
        onClose();
        return;
      }
      // `/` focuses the search box (VSCode convention). Skipped when the user
      // is already typing in another input/textarea/contenteditable.
      if (e.key === "/" && !inSearch) {
        const tag = target?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable) return;
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }
      if (e.key !== "Tab") return;
            const root = dialogRef.current;
            if (!root) return;
            const focusable = Array.from(root.querySelectorAll<HTMLElement>(
              'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'
            ));
            if (!focusable.length) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            const active = document.activeElement as HTMLElement | null;
            if (e.shiftKey && (active === first || !focusable.includes(active as HTMLElement))) {
              e.preventDefault();
              last.focus();
            } else if (!e.shiftKey && active === last) {
              e.preventDefault();
              first.focus();
            }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      lastFocusedRef.current?.focus?.();
    };
  }, [open, onClose, query]);

  if (!open) return null;
  return (
    <div
      className="shortcuts-overlay-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="presentation"
    >
      <div
        ref={dialogRef}
        className="shortcuts-overlay"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-overlay-title"
      >
        <header className="shortcuts-overlay-header">
          <h2 id="shortcuts-overlay-title" className="shortcuts-overlay-title">{t("shortcutsOverlayTitle")}</h2>
          <button
            type="button"
            className="shortcuts-overlay-close"
            aria-label={t("shortcutsCloseAria")}
            onClick={onClose}
          >
            \u00d7
          </button>
        </header>
        <div className="shortcuts-overlay-search">
          <input
            ref={searchInputRef}
            type="search"
            className="shortcuts-overlay-search-input"
            placeholder={t("shortcutsSearchPlaceholder")}
            aria-label={t("shortcutsSearchAria")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <span className="shortcuts-overlay-search-hint" aria-hidden="true">
            {t("shortcutsSearchHint")}
          </span>
        </div>
        <div className="shortcuts-overlay-summary" role="status" aria-live="polite">
          {tf("shortcutsSearchSummary", { shown: shownEntries, total: totalEntries })}
        </div>
        {q !== "" && shownEntries === 0 ? (
          <div className="shortcuts-overlay-no-results" role="status">
            <p className="shortcuts-overlay-no-results-text">
              {tf("shortcutsSearchNoResults", { query })}
            </p>
            <p className="shortcuts-overlay-no-results-hint">{t("shortcutsSearchEmptyHint")}</p>
          </div>
        ) : (
          <div className="shortcuts-overlay-body">
            {filteredGroups.map((group) => (
              <section
                key={group.titleKey}
                className="shortcuts-group"
                aria-label={tf("shortcutsGroupAria", { group: t(group.titleKey), count: group.entries.length })}
              >
                <h3 className="shortcuts-group-title">
                  <span className="shortcuts-group-name">{t(group.titleKey)}</span>
                  <span className="shortcuts-group-count" aria-hidden="true">
                    {tf("shortcutsGroupCount", { count: group.entries.length })}
                  </span>
                </h3>
                <ul className="shortcuts-group-list" role="list">
                  {group.entries.map((entry) => (
                    <li key={entry.keys} className="shortcuts-row">
                      <kbd className={entry.single ? "shortcuts-kbd shortcuts-kbd-single" : "shortcuts-kbd"} aria-label={entry.single ? `${entry.keys} (${t("shortcutsKeysSingle")})` : entry.keys}>
                        {entry.keys}
                      </kbd>
                      <span className="shortcuts-row-label">{t(entry.labelKey)}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
        <footer className="shortcuts-overlay-footer">
          <span className="shortcuts-overlay-hint">{t("shortcutsOverlayHint")}</span>
        </footer>
      </div>
    </div>
  );
}
