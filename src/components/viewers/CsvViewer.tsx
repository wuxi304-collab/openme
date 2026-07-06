import { useMemo, useState } from "react";
import Papa from "papaparse";

interface Props {
  content: string;
}

interface SortState { col: number; dir: "asc" | "desc" }

const PAGE_SIZE = 500;

export default function CsvViewer({ content }: Props) {
  const [sort, setSort] = useState<SortState>({ col: -1, dir: "asc" });
  const [page, setPage] = useState(0);

  const { headers, data } = useMemo(() => {
    const result = Papa.parse(content, { skipEmptyLines: true });
    const rows = result.data as string[][];
    return { headers: rows[0] ?? [], data: rows.slice(1) };
  }, [content]);

  const sorted = useMemo(() => {
    if (sort.col < 0) return data;
    return [...data].sort((a, b) => {
      const av = a[sort.col] ?? "";
      const bv = b[sort.col] ?? "";
      const cmp = av.localeCompare(bv, undefined, { numeric: true, sensitivity: "base" });
      return sort.dir === "asc" ? cmp : -cmp;
    });
  }, [data, sort]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageRows = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleSort = (col: number) => {
    setSort((s) =>
      s.col === col ? { col, dir: s.dir === "asc" ? "desc" : "asc" } : { col, dir: "asc" }
    );
    setPage(0);
  };

  const colCount = headers.length;

  return (
    <div className="flex flex-col h-full rounded-lg border overflow-hidden" style={{ borderColor: "var(--border-default)", background: "var(--bg-base)" }}>
      <div className="flex items-center justify-between px-3 py-1.5 border-b flex-shrink-0" style={{ borderColor: "var(--border-muted)", background: "var(--bg-surface)" }}>
        <span className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: "var(--text-muted)" }}>CSV</span>
        <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{data.length.toLocaleString()} 行 × {colCount} 列</span>
      </div>
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-[11px]">
          <thead style={{ position: "sticky", top: 0, zIndex: 1 }}>
            <tr style={{ background: "var(--bg-surface)" }}>
              {headers.map((h, i) => (
                <th
                  key={i}
                  onClick={() => handleSort(i)}
                  className="px-3 py-1.5 text-left cursor-pointer select-none border-b whitespace-nowrap transition-colors"
                  style={{ borderColor: "var(--border-muted)", color: sort.col === i ? "var(--accent)" : "var(--text-muted)", fontWeight: 600 }}
                >
                  <span className="flex items-center gap-1">
                    {h || <span style={{ opacity: 0.4 }}>(空)</span>}
                    {sort.col === i && (
                      <span style={{ fontSize: 8 }}>{sort.dir === "asc" ? "▲" : "▼"}</span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, ri) => (
              <tr
                key={ri}
                style={{ borderBottom: "1px solid var(--border-muted)" }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "var(--bg-hover)")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
              >
                {headers.map((_, ci) => (
                  <td key={ci} className="px-3 py-1" style={{ color: "var(--text-secondary)", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={row[ci] ?? ""}>
                    {row[ci] ?? ""}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-center gap-6 px-3 py-2 border-t flex-shrink-0" style={{ borderColor: "var(--border-muted)", background: "var(--bg-surface)" }}>
        <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}
          className="text-[11px] px-3 py-1 rounded disabled:opacity-30" style={{ color: "var(--text-muted)", background: "var(--bg-elevated)" }}>
          ← 上一页
        </button>
        <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
          {page + 1} / {totalPages}
        </span>
        <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
          className="text-[11px] px-3 py-1 rounded disabled:opacity-30" style={{ color: "var(--text-muted)", background: "var(--bg-elevated)" }}>
          下一页 →
        </button>
      </div>
    </div>
  );
}
