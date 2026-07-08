import { useMemo, useState } from "react";
import { useI18n } from "../../i18n";

interface Props { content: string; onChange?: (value: string) => void; }
type JsonNodeData = { id: string; key: string; value: unknown; type: string; depth: number; children?: JsonNodeData[] };

function buildTree(key: string, value: unknown, depth: number, id: string): JsonNodeData {
  const type = value === null ? "null" : Array.isArray(value) ? "array" : typeof value;
  const children = type === "object" || type === "array"
    ? Object.entries((value ?? {}) as object).map(([childKey, childValue]) => buildTree(childKey, childValue, depth + 1, `${id}/${childKey}`))
    : undefined;
  return { id, key, value, type, depth, children };
}

function JsonNode({ node, expanded, onToggle }: { node: JsonNodeData; expanded: Set<string>; onToggle: (id: string) => void }) {
  const { tf } = useI18n();
  const isContainer = node.type === "object" || node.type === "array";
  const colors: Record<string, string> = { string: "#3fb950", number: "#d29922", boolean: "#a371f7", null: "#8b949e" };
  const isExpanded = expanded.has(node.id);
  return (
    <div style={{ paddingLeft: node.depth * 16 }}>
      <div className="flex items-center gap-1.5 py-0.5">
        {isContainer ? <button type="button" aria-label={isExpanded ? tf("jsonCollapseAria", { key: node.key }) : tf("jsonExpandAria", { key: node.key })} onClick={() => onToggle(node.id)} className="json-toggle">{isExpanded ? "▼" : "▶"}</button> : <span className="w-3" />}
        <span style={{ color: "#58a6ff" }}>"{node.key}"</span><span style={{ color: "var(--text-muted)" }}>:</span>
        {isContainer ? <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>{node.type === "array" ? `[${node.children?.length ?? 0}]` : `{${node.children?.length ?? 0}}`}</span>
          : <span className="text-[11px] font-mono" style={{ color: colors[node.type] ?? "var(--text-secondary)" }}>{node.type === "string" ? JSON.stringify(node.value) : String(node.value)}</span>}
      </div>
      {isContainer && isExpanded && node.children?.map((child) => <JsonNode key={child.id} node={child} expanded={expanded} onToggle={onToggle} />)}
    </div>
  );
}

export default function JsonViewer({ content }: Props) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["root"]));
  const parsed = useMemo(() => {
    try { return { tree: buildTree("root", JSON.parse(content), 0, "root"), error: null as string | null }; }
    catch (error) { return { tree: null, error: error instanceof Error ? error.message : t("jsonSyntaxError") }; }
  }, [content]);
  const toggle = (id: string) => setExpanded((previous) => { const next = new Set(previous); next.has(id) ? next.delete(id) : next.add(id); return next; });
  const toggleAll = (expand: boolean) => {
    if (!parsed.tree) return;
    if (!expand) { setExpanded(new Set()); return; }
    const ids = new Set<string>();
    const visit = (node: JsonNodeData) => { if (node.children) { ids.add(node.id); node.children.forEach(visit); } };
    visit(parsed.tree); setExpanded(ids);
  };
  return (
    <div className="flex flex-col h-full overflow-hidden rounded-lg border" style={{ borderColor: "var(--border-default)", background: "var(--bg-base)" }}>
      <div className="flex items-center justify-between px-3 py-1.5 border-b" style={{ borderColor: "var(--border-muted)", background: "var(--bg-surface)" }}>
        <span className="viewer-label">JSON</span>
        <div className="viewer-tools">
          {parsed.error && <span role="status" className="text-[10px]" style={{ color: "var(--error)" }}>{t("jsonSyntaxBadge")}</span>}
          <button type="button" onClick={() => toggleAll(true)}>{t("jsonExpand")}</button>
          <button type="button" onClick={() => toggleAll(false)}>{t("jsonCollapse")}</button>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-3" style={{ fontFamily: "var(--font-mono)", fontSize: "12px" }}>
        {parsed.error ? <p role="alert" style={{ color: "var(--error)", fontSize: "12px" }}>{parsed.error}</p> : parsed.tree && <JsonNode node={parsed.tree} expanded={expanded} onToggle={toggle} />}
      </div>
    </div>
  );
}
