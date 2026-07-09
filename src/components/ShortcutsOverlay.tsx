import { useEffect, useRef } from "react";
import { useI18n } from "../i18n";

interface Props {
  open: boolean;
  onClose: () => void;
}

interface Entry {
  keys: string;
  labelKey: string;
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
      { keys: "?", labelKey: "shortcutsShowOverlay" },
      { keys: "Esc", labelKey: "shortcutsCloseOverlay" },
    ],
  },
];

export function ShortcutsOverlay({ open, onClose }: Props) {
  const { t } = useI18n();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return undefined;
    lastFocusedRef.current = document.activeElement as HTMLElement | null;
    const closeBtn = dialogRef.current?.querySelector<HTMLButtonElement>(".shortcuts-overlay-close");
    closeBtn?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); onClose(); }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      lastFocusedRef.current?.focus?.();
    };
  }, [open, onClose]);

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
        <div className="shortcuts-overlay-body">
          {SHORTCUT_GROUPS.map((group) => (
            <section key={group.titleKey} className="shortcuts-group" aria-label={t(group.titleKey)}>
              <h3 className="shortcuts-group-title">{t(group.titleKey)}</h3>
              <table className="shortcuts-group-table">
                <tbody>
                  {group.entries.map((entry) => (
                    <tr key={entry.keys}>
                      <th><kbd>{entry.keys}</kbd></th>
                      <td>{t(entry.labelKey)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ))}
        </div>
        <footer className="shortcuts-overlay-footer">
          <span className="shortcuts-overlay-hint">{t("shortcutsOverlayHint")}</span>
        </footer>
      </div>
    </div>
  );
}