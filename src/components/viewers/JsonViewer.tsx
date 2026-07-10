import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "../../i18n";
import "./JsonViewer.css";

interface Props { content: string; onChange?: (value: string) => void; }
type JsonNodeData = {
  id: string;
  key: string;
  path: string;
  value: unknown;
  type: string;
  depth: number;
  children?: JsonNodeData[];
  size?: number;
};

// Build a hierarchical tree from parsed JSON. Each node carries its full
// dotted path so search and "copy path" can address nodes unambiguously
// (e.g. `root.users[2].name`). Containers carry their child count in
// `size` so the header chip stays cheap to render.
function buildTree(key: string, value: unknown, depth: number, id: string, path: string): JsonNodeData {
  const type = value === null ? "null" : Array.isArray(value) ? "array" : typeof value;
  const children = type === "object" || type === "array"
    ? Object.entries((value ?? {}) as object).map(([childKey, childValue], idx) => {
        const childPath = type === "array" ? `${path}[${idx}]` : `${path}.${childKey}`;
        return buildTree(childKey, childValue, depth + 1, `${id}/${childKey}`, childPath);
      })
    : undefined;
  return {
    id,
    key,
    path,
    value,
    type,
    depth,
    children,
    size: children?.length ?? 0,
  };
}

function SearchIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true">
      <circle cx="7" cy="7" r="5" />
      <line x1="10.6" y1="10.6" x2="14" y2="14" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" aria-hidden="true">
      <rect x="5" y="5" width="8" height="9" rx="1.2" />
      <path d="M3 11V3.2A1.2 1.2 0 0 1 4.2 2H10" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="3 8.5 6.5 12 13 4.5" />
    </svg>
  );
}

function ExpandAllIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 6l3-3 3 3" />
      <path d="M13 10l-3 3-3-3" />
    </svg>
  );
}

function CollapseAllIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 3v6H3" />
      <path d="M10 13V7h3" />
    </svg>
  );
}

// Render a single node. The toggle button handles both pointer and
// keyboard activation; aria-expanded announces the state. Search
// matches highlight the value span (amber underline) without changing
// the value text — the underlying data stays untouched.
function JsonNode({
  node, expanded, onToggle, query, matchedIds, onActivate, focusedId,
}: {
  node: JsonNodeData;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  query: string;
  matchedIds: Set<string>;
  onActivate: (id: string) => void;
  focusedId: string | null;
}) {
  const { tf } = useI18n();
  const isContainer = node.type === "object" || node.type === "array";
  const colors: Record<string, string> = { string: "#3fb950", number: "#d29922", boolean: "#a371f7", null: "#8b949e" };
  const isExpanded = expanded.has(node.id);
  const isMatched = matchedIds.has(node.id);
  const isFocused = focusedId === node.id;
  const rowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isFocused && rowRef.current) {
      rowRef.current.scrollIntoView({ block: "nearest", behavior: "auto" });
    }
  }, [isFocused]);

  const valueText = node.type === "string"
    ? JSON.stringify(node.value)
    : node.type === "null" ? "null" : String(node.value);

  const matchesValue = query.length > 0 && !isContainer && valueText.toLowerCase().includes(query);

  return (
    <div style={{ paddingLeft: node.depth * 16 }}>
      <div
        ref={rowRef}
        className={`json-row flex items-center gap-1.5 py-0.5 ${isMatched ? "is-matched" : ""} ${isFocused ? "is-focused" : ""}`}
        onClick={() => onActivate(node.id)}
      >
        {isContainer ? (
          <button
            type="button"
            aria-label={isExpanded ? tf("jsonCollapseAria", { key: node.key }) : tf("jsonExpandAria", { key: node.key })}
            aria-expanded={isExpanded}
            onClick={(e) => { e.stopPropagation(); onToggle(node.id); }}
            className="json-toggle"
          >
            <span className={`json-chevron ${isExpanded ? "is-open" : ""}`} aria-hidden="true">▶</span>
          </button>
        ) : (
          <span className="json-toggle-spacer" aria-hidden="true" />
        )}
        <span className="json-key" style={{ color: "#58a6ff" }}>"{node.key}"</span>
        <span className="json-colon" style={{ color: "var(--text-muted)" }}>:</span>
        {isContainer ? (
          <span className="json-type-chip text-[11px]" style={{ color: "var(--text-muted)" }}>
            {node.type === "array" ? `[${node.size ?? 0}]` : `{${node.size ?? 0}}`}
          </span>
        ) : (
          <span
            className={`json-value text-[11px] font-mono ${matchesValue ? "is-search-hit" : ""}`}
            style={{ color: colors[node.type] ?? "var(--text-secondary)" }}
          >
            {valueText}
          </span>
        )}
      </div>
      {isContainer && isExpanded && node.children?.map((child) => (
        <JsonNode
          key={child.id}
          node={child}
          expanded={expanded}
          onToggle={onToggle}
          query={query}
          matchedIds={matchedIds}
          onActivate={onActivate}
          focusedId={focusedId}
        />
      ))}
    </div>
  );
}

export default function JsonViewer({ content }: Props) {
  const { t, tf } = useI18n();
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["root"]));
  const [query, setQuery] = useState("");
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [pathCopied, setPathCopied] = useState(false);
  const pathCopyTimerRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (pathCopyTimerRef.current) {
      window.clearTimeout(pathCopyTimerRef.current);
      pathCopyTimerRef.current = null;
    }
  }, []);

  const parsed = useMemo(() => {
    try {
      return { tree: buildTree("root", JSON.parse(content), 0, "root", "root"), error: null as string | null };
    } catch (error) {
      return { tree: null, error: error instanceof Error ? error.message : t("jsonSyntaxError") };
    }
  }, [content, t]);

  // Flatten the tree into a navigable ordered list. Used for keyboard nav
  // (ArrowUp/Down) and focus tracking. Containers are emitted BEFORE
  // their children when expanded, matching on-screen render order.
  const flatRows = useMemo(() => {
    if (!parsed.tree) return [];
    const rows: JsonNodeData[] = [];
    const visit = (node: JsonNodeData) => {
      rows.push(node);
      const isContainer = node.type === "object" || node.type === "array";
      if (isContainer && expanded.has(node.id) && node.children) {
        node.children.forEach(visit);
      }
    };
    visit(parsed.tree);
    return rows;
  }, [parsed.tree, expanded]);

  // Search: case-insensitive substring against key + value. Containers
  // match if any descendant matches (so the whole branch lights up).
  // Empty query clears all matches.
  const matchedIds = useMemo(() => {
    if (!parsed.tree || query.trim().length === 0) return new Set<string>();
    const q = query.toLowerCase();
    const ids = new Set<string>();
    const visit = (node: JsonNodeData): boolean => {
      let hit = false;
      const keyMatches = node.key.toLowerCase().includes(q);
      const valueText = node.type === "string" ? JSON.stringify(node.value) : String(node.value);
      const valueMatches = node.type !== "object" && node.type !== "array" && valueText.toLowerCase().includes(q);
      if (keyMatches || valueMatches) { ids.add(node.id); hit = true; }
      if (node.children) {
        for (const child of node.children) {
          const childHit = visit(child);
          if (childHit) {
            ids.add(node.id);
            hit = true;
          }
        }
      }
      return hit;
    };
    visit(parsed.tree);
    return ids;
  }, [parsed.tree, query]);

  // Auto-expand every container that has a match so users actually see
  // the highlighted nodes without having to drill in manually.
  const autoExpanded = useMemo(() => {
    if (matchedIds.size === 0) return expanded;
    const next = new Set(expanded);
    matchedIds.forEach((id) => {
      const path = id.split("/");
      let prefix = "";
      for (const segment of path) {
        prefix = prefix ? `${prefix}/${segment}` : segment;
        next.add(prefix);
      }
    });
    return next;
  }, [matchedIds, expanded]);

  const toggle = useCallback((id: string) => {
    setExpanded((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback((expand: boolean) => {
    if (!parsed.tree) return;
    if (!expand) { setExpanded(new Set()); return; }
    const ids = new Set<string>();
    const visit = (node: JsonNodeData) => {
      if (node.children) {
        ids.add(node.id);
        node.children.forEach(visit);
      }
    };
    visit(parsed.tree);
    setExpanded(ids);
  }, [parsed.tree]);

  const activate = useCallback((id: string) => {
    setFocusedId(id);
    const node = flatRows.find((row) => row.id === id);
    if (node && (node.type === "object" || node.type === "array")) {
      toggle(id);
    }
  }, [flatRows, toggle]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    if (flatRows.length === 0) return;
    const idx = focusedId ? flatRows.findIndex((row) => row.id === focusedId) : 0;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      const next = idx < 0 ? 0 : Math.min(flatRows.length - 1, idx + 1);
      setFocusedId(flatRows[next].id);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      const next = idx < 0 ? 0 : Math.max(0, idx - 1);
      setFocusedId(flatRows[next].id);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      const node = flatRows[idx];
      if (node && (node.type === "object" || node.type === "array") && !expanded.has(node.id)) {
        toggle(node.id);
      }
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      const node = flatRows[idx];
      if (node && (node.type === "object" || node.type === "array") && expanded.has(node.id)) {
        toggle(node.id);
      }
    } else if (event.key === "Home") {
      event.preventDefault();
      setFocusedId(flatRows[0].id);
    } else if (event.key === "End") {
      event.preventDefault();
      setFocusedId(flatRows[flatRows.length - 1].id);
    } else if (event.key === "Escape") {
      setQuery("");
      setFocusedId(null);
    }
  }, [flatRows, focusedId, expanded, toggle]);

  const copyFocusedPath = useCallback(async () => {
    if (!focusedId) return;
    const node = flatRows.find((row) => row.id === focusedId);
    if (!node) return;
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
        await navigator.clipboard.writeText(node.path);
      }
      setPathCopied(true);
      if (pathCopyTimerRef.current) window.clearTimeout(pathCopyTimerRef.current);
      pathCopyTimerRef.current = window.setTimeout(() => setPathCopied(false), 1600);
    } catch {
      /* clipboard blocked — silently skip */
    }
  }, [focusedId, flatRows]);

  const matchedCount = matchedIds.size;
  const announceRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!announceRef.current) return;
    if (query.trim().length === 0) {
      announceRef.current.textContent = "";
      return;
    }
    announceRef.current.textContent = matchedCount === 0
      ? t("jsonSearchNoMatch")
          : tf("jsonSearchMatchCount", { count: matchedCount });
      }, [matchedCount, query, t, tf]);

  const focusedPath = focusedId
    ? flatRows.find((row) => row.id === focusedId)?.path ?? ""
    : "";

  return (
    <div
      className="flex flex-col h-full overflow-hidden rounded-lg border json-viewer-root"
      style={{ borderColor: "var(--border-default)", background: "var(--bg-base)" }}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div className="flex items-center justify-between px-3 py-1.5 border-b json-toolbar" style={{ borderColor: "var(--border-muted)", background: "var(--bg-surface)" }}>
        <div className="flex items-center gap-3 min-w-0">
          <span className="viewer-label">JSON</span>
          <div className="json-search">
            <label className="json-search-field">
              <SearchIcon />
              <input
                type="search"
                value={query}
                placeholder={t("jsonSearchPlaceholder")}
                aria-label={t("jsonSearchAria")}
                onChange={(e) => setQuery(e.target.value)}
                className="json-search-input"
              />
            </label>
            {query.length > 0 && (
              <span className="json-search-count" aria-hidden="true">
                {matchedCount === 0 ? "0" : `${matchedCount}`}
              </span>
            )}
          </div>
        </div>
        <div className="viewer-tools">
          {parsed.error && <span role="status" className="text-[10px]" style={{ color: "var(--error)" }}>{t("jsonSyntaxBadge")}</span>}
          <button
            type="button"
            onClick={() => toggleAll(true)}
            title={t("jsonExpandAll")}
            aria-label={t("jsonExpandAll")}
            className="json-tool-button"
          >
            <ExpandAllIcon />
          </button>
          <button
            type="button"
            onClick={() => toggleAll(false)}
            title={t("jsonCollapseAll")}
            aria-label={t("jsonCollapseAll")}
            className="json-tool-button"
          >
            <CollapseAllIcon />
          </button>
          <button
            type="button"
            onClick={copyFocusedPath}
            disabled={!focusedId}
            title={focusedPath || t("jsonCopyPathHint")}
            aria-label={t("jsonCopyPath")}
            className="json-tool-button"
          >
            {pathCopied ? <CheckIcon /> : <CopyIcon />}
            <span>{pathCopied ? t("jsonCopied") : t("jsonCopyPath")}</span>
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-3 json-tree" style={{ fontFamily: "var(--font-mono)", fontSize: "12px" }}>
        {parsed.error ? (
          <p role="alert" style={{ color: "var(--error)", fontSize: "12px" }}>{parsed.error}</p>
        ) : parsed.tree ? (
          <JsonNode
            node={parsed.tree}
            expanded={autoExpanded}
            onToggle={toggle}
            query={query.trim().toLowerCase()}
            matchedIds={matchedIds}
            onActivate={activate}
            focusedId={focusedId}
          />
        ) : null}
              </div>
              <div className="json-statusbar" role="status" aria-live="polite">
                <span className="json-statusbar-path" aria-hidden="true">
                  {focusedPath || t("jsonStatusIdle")}
                </span>
                <span className="sr-only" ref={announceRef} />
              </div>
            </div>
          );
        }
