import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { useI18n } from "../i18n";
import { bucketRelativeTime, rankByFuzzy } from "../core/commandPaletteSearch";

export type CommandItem = {
  id: string;
  label: string;
  detail: string;
  shortcut?: string;
  disabled?: boolean;
  kind?: "file" | "tab" | "workspace" | "system" | "recent";
  keywords?: string[];
  /**
   * Optional ISO-8601 timestamp used by the palette to render a relative-time
   * tag next to recent-file commands. The command palette doesn't have a
   * "now" clock of its own, so callers should pass the timestamp of the file
   * the command would open.
   */
  openedAt?: string;
  run: () => void;
};

// Maps a CommandItem.kind to its i18n key. Returns the key for the
// generic "Command" label when no kind is set, so the kind tag in the
// palette row is always rendered through the i18n dict.
function kindLabelKey(kind: CommandItem["kind"]): string {
  switch (kind) {
    case "file": return "paletteKindFile";
    case "tab": return "paletteKindTab";
    case "workspace": return "paletteKindWorkspace";
    case "system": return "paletteKindSystem";
    case "recent": return "paletteKindRecent";
    default: return "paletteKindCommand";
  }
}

// Split a piece of copy into plain runs + matched runs so the palette can
// highlight which characters matched the user's query. We do a single
// case-insensitive search per token (the same haystack `rankByFuzzy`
// already uses) and re-emit the original string with the matched range
// wrapped in <mark>. Falls back to a single plain-text node when the
// query is empty or no token hits.
function splitMatches(text: string, query: string): ReactNode {
  const trimmed = query.trim();
  if (!trimmed) return text;
  // Use only the first token for highlighting so the <mark> wrap stays
  // legible when the user types "sav tab" — we still rank across both
  // tokens, but only highlight where the most identifying one landed.
  const token = trimmed.split(/\s+/)[0] ?? "";
  if (!token) return text;
  const lowerText = text.toLocaleLowerCase();
  const lowerToken = token.toLocaleLowerCase();
  if (lowerToken.length === 0) return text;
  const segments: ReactNode[] = [];
  let cursor = 0;
  while (cursor < text.length) {
    const hit = lowerText.indexOf(lowerToken, cursor);
    if (hit === -1) {
      segments.push(text.slice(cursor));
      break;
    }
    if (hit > cursor) segments.push(text.slice(cursor, hit));
    segments.push(
      <mark key={`m-${hit}-${segments.length}`} className="command-palette-mark">
        {text.slice(hit, hit + lowerToken.length)}
      </mark>
    );
    cursor = hit + lowerToken.length;
  }
  return segments;
}

interface Props {
  open: boolean;
  commands: CommandItem[];
  onClose: () => void;
}

export default function CommandPalette({ open, commands, onClose }: Props) {
  const { t, tf } = useI18n();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  const filtered = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) return commands;
    return rankByFuzzy(commands, trimmed, (command) =>
      [command.label, command.detail, command.shortcut, command.kind, ...(command.keywords ?? [])]
        .filter(Boolean).join(" ")
    );
  }, [commands, query]);

  useEffect(() => {
    if (!open) return;
    previousFocus.current = document.activeElement as HTMLElement;
    setQuery("");
    setSelected(0);
    requestAnimationFrame(() => inputRef.current?.focus());
    return () => previousFocus.current?.focus();
  }, [open]);

  useEffect(() => {
    setSelected((value) => Math.min(value, Math.max(0, filtered.length - 1)));
  }, [filtered.length]);

  if (!open) return null;

  // Render a "5 min ago" / "Yesterday" / "3 days ago" tag for recent-file
  // commands. Other kinds skip the relative-time badge entirely.
  const relativeForCommand = (command: CommandItem): string | null => {
    if (command.kind !== "recent" || !command.openedAt) return null;
    const bucket = bucketRelativeTime({ pastIso: command.openedAt, nowMs: Date.now() });
    switch (bucket.kind) {
      case "justNow": return t("recentJustNow");
      case "minutes": return tf("recentMinAgo", { n: bucket.n });
      case "hours": return tf("recentHourAgo", { n: bucket.n });
      case "yesterday": return t("recentYesterday");
      case "days": return tf("recentDaysAgo", { n: bucket.n });
      case "weeks": return tf("recentWeeksAgo", { n: bucket.n });
      case "months": return tf("recentMonthsAgo", { n: bucket.n });
    }
  };

  const execute = (command: CommandItem | undefined) => {
    if (!command || command.disabled) return;
    onClose();
    command.run();
  };

  const moveSelection = (direction: 1 | -1) => {
    if (!filtered.length) return;
    setSelected((value) => {
      for (let step = 1; step <= filtered.length; step += 1) {
        const next = (value + direction * step + filtered.length) % filtered.length;
        if (!filtered[next]?.disabled) return next;
      }
      return value;
    });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape") onClose();
    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveSelection(1);
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      moveSelection(-1);
    }
    if (event.key === "Enter") {
      event.preventDefault();
      execute(filtered[selected]);
    }
    if (event.key === "Tab") {
      const focusable = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('input,button:not(:disabled)'));
      if (!focusable.length) return;
      const current = focusable.indexOf(document.activeElement as HTMLElement);
      const next = event.shiftKey ? (current - 1 + focusable.length) % focusable.length : (current + 1) % focusable.length;
      event.preventDefault();
      focusable[next].focus();
    }
  };

  return (
    <div className="command-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="command-palette" role="dialog" aria-modal="true" aria-label={t("commandPaletteAria")} onKeyDown={handleKeyDown}>
        <label className="command-search">
          <span aria-hidden="true">›_</span>
          <span className="sr-only">{t("searchCommandsAria")}</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => { setQuery(event.target.value); setSelected(0); }}
            placeholder={t("searchCommandsPlaceholder")}
            autoComplete="off"
          />
        </label>
        <div className="command-list" role="listbox" aria-label={t("availableCommandsAria")}>
          {filtered.length ? filtered.map((command, index) => {
            const relative = relativeForCommand(command);
            return (
              <button type="button" role="option" aria-selected={index === selected} key={command.id} disabled={command.disabled} className={index === selected ? "is-selected" : ""} onMouseEnter={() => setSelected(index)} onClick={() => execute(command)}>
                <span>
                                <strong>{splitMatches(command.label, query)}</strong>
                                <small>{splitMatches(command.detail, query)}</small>
                </span>
                {relative ? <em className="command-relative" aria-label={relative}>{relative}</em> : <em>{t(kindLabelKey(command.kind))}</em>}
                {command.shortcut && <kbd>{command.shortcut}</kbd>}
              </button>
            );
          }) : (
            <div className="command-empty">
              <div>{t("paletteEmptyQuery")}</div>
              <small>{tf("paletteFuzzyHint", { example: "sve → save" })}</small>
            </div>
          )}
        </div>
        <footer>
          <span>{tf("paletteCount", { shown: filtered.length, total: commands.length })}</span>
                  {query.trim().length > 0 && (
                    <span className="command-palette-query-meta">{tf("paletteQueryLength", { count: query.trim().length })}</span>
                  )}
                  <span>{t("paletteNavHint")}</span>
                  <span>{t("paletteEnterHint")}</span>
                  <span>{t("paletteEscHint")}</span>
                </footer>
      </section>
    </div>
  );
}
