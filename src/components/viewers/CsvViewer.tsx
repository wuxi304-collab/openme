import { useCallback, useEffect, useMemo, useState } from "react";
import Papa from "papaparse";
import { useI18n } from "../../i18n";
import ViewerError from "../ViewerError";
import "../ViewerError.css";
import "./CsvViewer.css";

interface Props { content: string; }
interface SortState { column: number; direction: "asc" | "desc" }
const DEFAULT_PAGE_SIZE = 300;
const PAGE_SIZES = [50, 100, 300, 1000] as const;
type PageSize = typeof PAGE_SIZES[number];

export default function CsvViewer({ content }: Props) {
  const { t, tf } = useI18n();
  const [sort, setSort] = useState<SortState>({ column: -1, direction: "asc" });
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<PageSize>(DEFAULT_PAGE_SIZE);
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
        return needle
          ? parsed.rows.filter((row) => row.some((cell) => String(cell ?? "").toLocaleLowerCase().includes(needle)))
          : parsed.rows;
      }, [parsed.rows, query]);

      const sorted = useMemo(() => {
        if (sort.column < 0) return filtered;
        return [...filtered].sort((left, right) => {
          const comparison = (left[sort.column] ?? "").localeCompare(right[sort.column] ?? "", undefined, {
            numeric: true,
            sensitivity: "base",
          });
          return sort.direction === "asc" ? comparison : -comparison;
        });
      }, [filtered, sort]);

      const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));

      useEffect(() => { setPage(0); }, [query, pageSize]);
      useEffect(() => { if (page >= totalPages) setPage(totalPages - 1); }, [page, totalPages]);

      const pageRows = sorted.slice(page * pageSize, (page + 1) * pageSize);
      const handleSort = useCallback((column: number) => {
        setSort((current) => current.column === column
          ? { column, direction: current.direction === "asc" ? "desc" : "asc" }
          : { column, direction: "asc" });
    setPage(0);
  }, []);

  const clearSearch = useCallback(() => setQuery(""), []);

  return (
    <div
      className="flex flex-col h-full rounded-lg border overflow-hidden csv-viewer-root"
      style={{ borderColor: "var(--border-default)", background: "var(--bg-base)" }}
    >
      <div
        className="csv-toolbar"
        style={{ borderColor: "var(--border-muted)", background: "var(--bg-surface)" }}
      >
        <div className="csv-toolbar-left">
          <span className="viewer-label">CSV</span>
          <span className="csv-summary-chip" aria-hidden="true">
            {tf("csvHeaderSummary", { rows: filtered.length.toLocaleString(), cols: parsed.headers.length })}
          </span>
          {parsed.errors.length > 0 && (
            <span className="csv-warning-chip" title={parsed.errors[0].message}>
              {tf("csvErrors", { count: parsed.errors.length })}
            </span>
          )}
        </div>
        <div className="csv-toolbar-right">
          <label className="csv-search-field">
            <span className="sr-only">{t("csvSearchAria")}</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("csvSearchPlaceholder")}
              autoComplete="off"
              type="search"
            />
            {query.length > 0 && (
              <button
                type="button"
                onClick={clearSearch}
                className="csv-search-clear"
                aria-label={t("csvSearchClearAria")}
                title={t("csvSearchClearAria")}
              >×</button>
            )}
          </label>
          <label className="csv-page-size-field">
            <span className="sr-only">{t("csvPageSizeAria")}</span>
            <select
              value={pageSize}
              onChange={(event) => setPageSize(Number(event.target.value) as PageSize)}
              aria-label={t("csvPageSizeAria")}
            >
              {PAGE_SIZES.map((size) => (
                <option key={size} value={size}>{tf("csvPageSizeOption", { count: size })}</option>
              ))}
            </select>
          </label>
        </div>
      </div>
                  <div className="flex-1 overflow-auto csv-table-scroll">
                    {parsed.headers.length === 0 ? (
                      <ViewerError title={t("csvEmptyTitle")} message={t("csvEmptySub")} />
                    ) : (
                      <table className="csv-table">
                        <thead className="csv-thead-sticky">
                          <tr>
                            <th className="csv-row-number" aria-hidden="true">#</th>
                            {parsed.headers.map((header, index) => (
                              <th
                                key={index}
                                aria-sort={sort.column === index ? (sort.direction === "asc" ? "ascending" : "descending") : "none"}
                                scope="col"
                              >
                                <button type="button" onClick={() => handleSort(index)} className="csv-th-button">
                                  <span>{header}</span>
                                  <span className="csv-sort-indicator" aria-hidden="true">
                                    {sort.column === index ? (sort.direction === "asc" ? "▲" : "▼") : ""}
                                  </span>
                                </button>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {pageRows.map((row, rowIndex) => (
                            <tr key={page * pageSize + rowIndex}>
                              <td className="csv-row-number">{page * pageSize + rowIndex + 1}</td>
                              {parsed.headers.map((_, columnIndex) => (
                    <td key={columnIndex} title={row[columnIndex] ?? ""}>{row[columnIndex] ?? ""}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {parsed.headers.length > 0 && pageRows.length === 0 && (
          <ViewerError title={t("csvNoMatchTitle")} message={t("csvNoMatchSub")} />
        )}
      </div>
      <div className="csv-pagination" role="navigation" aria-label={t("csvPaginationAria")}>
        <button
          type="button"
          onClick={() => setPage((value) => Math.max(0, value - 1))}
          disabled={page === 0}
          aria-label={t("csvPrev")}
        >
          ‹ {t("csvPrev")}
        </button>
        <span className="csv-page-indicator" aria-live="polite">
          {tf("csvPageIndicator", { current: page + 1, total: totalPages })}
        </span>
        <button
          type="button"
          onClick={() => setPage((value) => Math.min(totalPages - 1, value + 1))}
          disabled={page >= totalPages - 1}
          aria-label={t("csvNext")}
        >
          {t("csvNext")} ›
        </button>
      </div>
    </div>
  );
}