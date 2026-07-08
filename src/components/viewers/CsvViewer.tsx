import { useEffect, useMemo, useState } from "react";
import Papa from "papaparse";
import { useI18n } from "../../i18n";
import ViewerError from "../ViewerError";
import "../ViewerError.css";

interface Props { content: string; }
interface SortState { column: number; direction: "asc" | "desc" }
const PAGE_SIZE = 300;

export default function CsvViewer({ content }: Props) {
  const { t, tf } = useI18n();
  const [sort, setSort] = useState<SortState>({ column: -1, direction: "asc" });
  const [page, setPage] = useState(0);
  const [query, setQuery] = useState("");
  const parsed = useMemo(() => {
    const result = Papa.parse<string[]>(content, { skipEmptyLines: "greedy" });
    const rows = result.data;
    const columnCount = rows.reduce((maximum, row) => Math.max(maximum, row.length), 0);
    const first = rows[0] ?? [];
    const headers = Array.from({ length: columnCount }, (_, index) => first[index]?.trim() || tf("csvCol", { n: index + 1 }));
    return { headers, rows: rows.slice(1), errors: result.errors };
  }, [content, tf]);
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return needle ? parsed.rows.filter((row) => row.some((cell) => String(cell ?? "").toLocaleLowerCase().includes(needle))) : parsed.rows;
  }, [parsed.rows, query]);
  const sorted = useMemo(() => {
    if (sort.column < 0) return filtered;
    return [...filtered].sort((left, right) => {
      const comparison = (left[sort.column] ?? "").localeCompare(right[sort.column] ?? "", undefined, { numeric: true, sensitivity: "base" });
      return sort.direction === "asc" ? comparison : -comparison;
    });
  }, [filtered, sort]);
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  useEffect(() => { setPage(0); }, [query]);
  useEffect(() => { if (page >= totalPages) setPage(totalPages - 1); }, [page, totalPages]);
  const pageRows = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const handleSort = (column: number) => { setSort((current) => current.column === column ? { column, direction: current.direction === "asc" ? "desc" : "asc" } : { column, direction: "asc" }); setPage(0); };

  return (
    <div className="flex flex-col h-full rounded-lg border overflow-hidden" style={{ borderColor: "var(--border-default)", background: "var(--bg-base)" }}>
      <div className="flex items-center justify-between px-3 py-1.5 border-b" style={{ borderColor: "var(--border-muted)", background: "var(--bg-surface)" }}>
        <span className="viewer-label">CSV <small className="viewer-meta">{tf("csvHeaderSummary", { rows: filtered.length.toLocaleString(), cols: parsed.headers.length })}</small>{parsed.errors.length > 0 && <small className="csv-warning" title={parsed.errors[0].message}>{tf("csvErrors", { count: parsed.errors.length })}</small>}</span>
        <label className="viewer-search"><span className="sr-only">{t("csvSearchAria")}</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("csvSearchPlaceholder")} autoComplete="off" /></label>
      </div>
      <div className="flex-1 overflow-auto">
        {parsed.headers.length === 0 ? <ViewerError title={t("csvEmptyTitle")} message={t("csvEmptySub")} /> : <table className="csv-table"><thead><tr><th className="csv-row-number">#</th>{parsed.headers.map((header, index) => <th key={index} aria-sort={sort.column === index ? (sort.direction === "asc" ? "ascending" : "descending") : "none"}><button type="button" onClick={() => handleSort(index)}>{header}<span aria-hidden="true">{sort.column === index ? (sort.direction === "asc" ? "▲" : "▼") : ""}</span></button></th>)}</tr></thead><tbody>{pageRows.map((row, rowIndex) => <tr key={page * PAGE_SIZE + rowIndex}><td className="csv-row-number">{page * PAGE_SIZE + rowIndex + 1}</td>{parsed.headers.map((_, columnIndex) => <td key={columnIndex} title={row[columnIndex] ?? ""}>{row[columnIndex] ?? ""}</td>)}</tr>)}</tbody></table>}
        {parsed.headers.length > 0 && pageRows.length === 0 && <ViewerError title={t("csvNoMatchTitle")} message={t("csvNoMatchSub")} />}
      </div>
      <div className="csv-pagination"><button type="button" onClick={() => setPage((value) => Math.max(0, value - 1))} disabled={page === 0}>{t("csvPrev")}</button><span>{page + 1} / {totalPages}</span><button type="button" onClick={() => setPage((value) => Math.min(totalPages - 1, value + 1))} disabled={page >= totalPages - 1}>{t("csvNext")}</button></div>
    </div>
  );
}


