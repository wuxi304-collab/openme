import { useState, useMemo } from "react";

interface Props {
  content: string;
  onChange?: (v: string) => void;
}

type JsonNode = { key: string; value: any; type: string; depth: number; children?: JsonNode[] };

function buildTree(key: string, value: any, depth: number): JsonNode {
  const type = value === null ? "null" : Array.isArray(value) ? "array" : typeof value;
  const children = type === "object" || type === "array"
    ? Object.entries(type === "array" ? value : value || {}).map(([k, v]) => buildTree(type === "array" ? k : k, v, depth + 1))
    : undefined;
  return { key, value, type, depth, children };
}

function JsonNode({ node, expanded, onToggle }: { node: JsonNode; expanded: Set<string>; onToggle: (k: string) => void }) {
  const isContainer = node.type === "object" || node.type === "array";
  const id = `${node.depth}-${node.key}`;

  const colorMap: Record<string, string> = {
    string: "#3fb950", number: "#d29922", boolean: "#a371f7", null: "#6e7681", object: "#8b949e", array: "#8b949e",
  };

  return (
    <div style={{ paddingLeft: node.depth * 16 }}>
      <div className="flex items-center gap-1.5 py-0.5 group">
        {isContainer ? (
          <button onClick={() => onToggle(id)} className="text-[10px] select-none" style={{ color: "var(--text-muted)" }}>
            {expanded.has(id) ? "▼" : "▶"}
          </button>
        ) : <span className="w-3" />}
        <span style={{ color: "#58a6ff" }}>"{node.key}"</span>
        <span style={{ color: "var(--text-muted)" }}>:</span>
        {isContainer ? (
          <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
            {node.type === "array" ? `[${node.children?.length ?? 0}]` : `{${node.children?.length ?? 0}}`}
          </span>
        ) : (
          <span className="text-[11px] font-mono" style={{ color: colorMap[node.type] ?? "var(--text-secondary)" }}>
            {node.type === "string" ? `"${String(node.value)}"` : String(node.value)}
          </span>
        )}
      </div>
      {isContainer && expanded.has(id) && node.children?.map((c) => (
        <JsonNode key={`${id}-${c.key}`} node={c} expanded={expanded} onToggle={onToggle} />
      ))}
    </div>
  );
}

export default function JsonViewer({ content }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["0-root"]));
  const [error, setError] = useState<string | null>(null);

  const tree = useMemo(() => {
    try {
      const parsed = JSON.parse(content);
      setError(null);
      return buildTree("root", parsed, 0);
    } catch (e: any) {
      setError(e.message);
      return null;
    }
  }, [content]);

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = (expand: boolean) => {
    if (!tree) return;
    const collect = (n: JsonNode, ids: Set<string>) => {
      const id = `${n.depth}-${n.key}`;
      if (expand) ids.add(id); else ids.delete(id);
      n.children?.forEach((c) => collect(c, ids));
    };
    const ids = new Set<string>();
    if (expand) { ids.add("0-root"); tree.children?.forEach((c) => collect(c, ids)); }
    setExpanded(ids);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden rounded-lg border" style={{ borderColor: "var(--border-default)", background: "var(--bg-base)" }}>
      <div className="flex items-center justify-between px-3 py-1.5 border-b" style={{ borderColor: "var(--border-muted)", background: "var(--bg-surface)" }}>
        <span className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: "var(--text-muted)" }}>JSON</span>
        <div className="flex items-center gap-2">
          {error && <span className="text-[10px]" style={{ color: "var(--error)" }}>语法错误</span>}
          <button onClick={() => toggleAll(true)} className="text-[10px] px-2 py-0.5 rounded" style={{ color: "var(--text-muted)", background: "var(--bg-elevated)" }}>展开</button>
          <button onClick={() => toggleAll(false)} className="text-[10px] px-2 py-0.5 rounded" style={{ color: "var(--text-muted)", background: "var(--bg-elevated)" }}>折叠</button>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-3" style={{ fontFamily: "var(--font-mono)", fontSize: "12px" }}>
        {error ? <p style={{ color: "var(--error)", fontSize: "12px" }}>{error}</p>
          : tree && <JsonNode node={tree} expanded={expanded} onToggle={toggle} />}
      </div>
    </div>
  );
}
