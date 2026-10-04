import { useMemo, useState } from "react";
import { compactForSearch } from "../../cad/extractCadText";
import { useI18n } from "../../i18n";
import Tooltip from "../Tooltip";

export interface CadTextEntry {
  id: string;
  text: string;
  /** Set when the user has replaced this label in the preview. */
  edited?: boolean;
  /** Entity kind (TEXT / MTEXT / ATTDEF / ATTRIB) parsed from the writer's marker. */
  kind?: string;
}

interface Props {
  /** All labels, with any preview edits already applied. */
  items: CadTextEntry[];
  activeId: string | null;
  onLocate: (id: string) => void;
  findQuery: string;
  onFindChange: (value: string) => void;
  replaceQuery: string;
  onReplaceChange: (value: string) => void;
  /** Index into the current match list of the item that is active, or -1. */
  activeMatchIndex: number;
  onStepMatch: (delta: number) => void;
  onReplaceCurrent: () => void;
  onReplaceAll: () => void;
  /** False until a DWG writer is wired up — keeps the UI honest. */
  canPersist: boolean;
}

/**
 * The reading surface: every label in the sheet, searchable, with find/replace.
 * A drafter scanning for SUS304 should never have to hunt through geometry.
 */
export default function CadTextList({
  items,
  activeId,
  onLocate,
  findQuery,
  onFindChange,
  replaceQuery,
  onReplaceChange,
  activeMatchIndex,
  onStepMatch,
  onReplaceCurrent,
  onReplaceAll,
  canPersist,
}: Props) {
  const { t, tf } = useI18n();
  const [filter, setFilter] = useState("");

  const visible = useMemo(() => {
    const needle = compactForSearch(filter.trim().toLowerCase());
    if (!needle) return items;
    return items.filter((item) => compactForSearch(item.text.toLowerCase()).includes(needle));
  }, [items, filter]);

  const matchCount = useMemo(() => {
    const needle = compactForSearch(findQuery.trim().toLowerCase());
    if (!needle) return 0;
    return items.filter((item) => compactForSearch(item.text.toLowerCase()).includes(needle)).length;
  }, [items, findQuery]);

  return (
    <aside className="cad-text-panel" aria-label={t("cadTextPanelAria")}>
      <div className="cad-text-panel-head">
        <input
          type="search"
          className="cad-text-search"
          placeholder={t("cadTextFilterPlaceholder")}
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          aria-label={t("cadTextFilterAria")}
        />
        <div className="cad-text-findrow">
          <input
            type="search"
            className="cad-text-search"
            placeholder={t("cadTextFindPlaceholder")}
            value={findQuery}
            onChange={(event) => onFindChange(event.target.value)}
            aria-label={t("cadTextFindAria")}
          />
          <span className="cad-text-count">
            {findQuery.trim()
              ? tf("cadTextFoundCount", { count: matchCount })
              : tf("cadTextAllCount", { count: items.length })}
          </span>
        </div>
        {findQuery.trim() && (
          <div className="cad-text-findrow">
            <input
              type="text"
              className="cad-text-search"
              placeholder={t("cadTextReplacePlaceholder")}
              value={replaceQuery}
              onChange={(event) => onReplaceChange(event.target.value)}
              aria-label={t("cadTextReplaceAria")}
            />
            <button
              type="button"
              className="cad-text-btn"
              onClick={onReplaceCurrent}
              disabled={matchCount === 0 || !replaceQuery}
            >
              {t("cadTextReplaceOne")}
            </button>
            <button
              type="button"
              className="cad-text-btn"
              onClick={onReplaceAll}
              disabled={matchCount === 0 || !replaceQuery}
            >
              {t("cadTextReplaceAll")}
            </button>
          </div>
        )}
        {findQuery.trim() && (
          <div className="cad-text-findrow">
            <button
              type="button"
              className="cad-text-btn"
              onClick={() => onStepMatch(-1)}
              disabled={matchCount === 0}
            >
              {t("cadTextPrevMatch")}
            </button>
            <button
              type="button"
              className="cad-text-btn"
              onClick={() => onStepMatch(1)}
              disabled={matchCount === 0}
            >
              {t("cadTextNextMatch")}
            </button>
            <span className="cad-text-count">
              {matchCount === 0 ? "—" : `${activeMatchIndex + 1} / ${matchCount}`}
            </span>
          </div>
        )}
        {!canPersist && (
          <p className="cad-text-warning">
            {t("cadTextPreviewOnlyWarning")}
          </p>
        )}
      </div>
      <ul className="cad-text-items">
        {visible.map((item) => (
          <li key={item.id}>
            <Tooltip content={item.text}>
              <button
                type="button"
                className={`cad-text-item ${item.id === activeId ? "is-active" : ""} ${item.edited ? "is-edited" : ""}`}
                onClick={() => onLocate(item.id)}
              >
                {item.edited && <span className="cad-text-dot" aria-label={t("cadTextEditedAria")} />}
                {item.text}
              </button>
            </Tooltip>
          </li>
        ))}
        {visible.length === 0 && <li className="cad-text-empty">{t("cadTextNoMatches")}</li>}
      </ul>
    </aside>
  );
}
