import { useEffect, useRef, useState } from "react";
import { useI18n } from "../../i18n";
import ViewerError from "../ViewerError";
import "../ViewerError.css";
import "./OfficeViewer.css";

interface DocxData { type: "docx"; html: string; }
interface ExcelData { type: "excel"; sheets: { name: string; data: string[][] }[]; }
interface PptxData { type: "pptx"; }
type OfficeData = DocxData | ExcelData | PptxData;

interface Props { data: OfficeData; }

const EXCEL_PAGE_SIZE = 500;

function ExcelSheet({ sheet }: { sheet: { name: string; data: string[][] } }) {
  const { t, tf } = useI18n();
  const [page, setPage] = useState(0);
  const columnCount = sheet.data.reduce((maximum, row) => Math.max(maximum, row.length), 0);
  const headers = Array.from({ length: columnCount }, (_, index) => sheet.data[0]?.[index] || tf("officeExcelCol", { n: index + 1 }));
  const rows = sheet.data.slice(1);
  const totalPages = Math.max(1, Math.ceil(rows.length / EXCEL_PAGE_SIZE));
  const visibleRows = rows.slice(page * EXCEL_PAGE_SIZE, (page + 1) * EXCEL_PAGE_SIZE);
  if (columnCount === 0) {
    return (
      <ViewerError title={t("officeSheetEmptyTitle")} message={tf("officeSheetEmptyBody", { name: sheet.name })} />
    );
  }
  return (
    <div className="office-excel-sheet">
      <div className="office-excel-grid-wrap">
        <table className="office-excel-grid">
          <thead>
            <tr>
              <th className="office-excel-row-number">#</th>
              {headers.map((header, index) => <th key={index}>{header}</th>)}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, rowIndex) => (
              <tr key={page * EXCEL_PAGE_SIZE + rowIndex}>
                <td className="office-excel-row-number">{page * EXCEL_PAGE_SIZE + rowIndex + 1}</td>
                {headers.map((_, columnIndex) => (
                  <td key={columnIndex} title={row[columnIndex] ?? ""}>{row[columnIndex] ?? ""}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="office-excel-pagination" role="navigation" aria-label={t("officeExcelPaginationAria")}>
        <span className="office-excel-summary">{tf("officeRowColSummary", { rows: rows.length, cols: columnCount })}</span>
        <button type="button" disabled={page === 0} onClick={() => setPage((value) => value - 1)} aria-label={t("officeExcelPrevAria")}>{t("officeExcelPrev")}</button>
        <span className="office-excel-page-indicator" aria-live="polite">{tf("officeExcelPage", { current: page + 1, total: totalPages })}</span>
        <button type="button" disabled={page >= totalPages - 1} onClick={() => setPage((value) => value + 1)} aria-label={t("officeExcelNextAria")}>{t("officeExcelNext")}</button>
      </div>
    </div>
  );
}

function WordDoc({ html }: { html: string }) {
  const { t, tf } = useI18n();
  const [wordCount, setWordCount] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    const stripped = html.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").trim();
    const tokens = stripped.split(/\s+/).filter((token) => token.length > 0);
    setWordCount(tokens.length);
  }, [html]);
  const handleCopy = async () => {
    const stripped = html.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ");
    try {
      await navigator.clipboard.writeText(stripped);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      // clipboard unavailable
    }
  };
  return (
    <div className="office-word-stage">
      <iframe
        className="office-doc-frame"
        title={t("officeWordFrameTitle")}
        sandbox=""
        srcDoc={`<!doctype html><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'"><style>body{box-sizing:border-box;max-width:850px;margin:24px auto;padding:48px 56px;background:#fff;color:#222;font:14px/1.75 system-ui,sans-serif;box-shadow:0 8px 30px #0002}img{max-width:100%}table{border-collapse:collapse;max-width:100%}td,th{border:1px solid #ccc;padding:5px 8px}</style>${html}`}
      />
      <div className="office-word-statusbar" role="status" aria-live="polite">
        <span>{wordCount !== null ? tf("officeWordCount", { count: wordCount }) : t("officeWordCountPending")}</span>
        <button type="button" onClick={handleCopy} aria-label={t("officeWordCopyAria")}>
          {copied ? t("officeWordCopied") : t("officeWordCopy")}
        </button>
      </div>
    </div>
  );
}

function PptxMessage() {
  const { t } = useI18n();
  return (
    <div className="office-pptx-message">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
      </svg>
      <p className="office-pptx-title">{t("officePptxTitle")}</p>
      <p className="office-pptx-body">{t("officePptxBody")}</p>
    </div>
  );
}

function SheetTabs({ sheets, activeSheet, onChange }: { sheets: { name: string }[]; activeSheet: number; onChange: (index: number) => void }) {
  const { t } = useI18n();
  const tabsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if (event.key === "ArrowRight") { event.preventDefault(); onChange((activeSheet + 1) % sheets.length); }
      else if (event.key === "ArrowLeft") { event.preventDefault(); onChange((activeSheet - 1 + sheets.length) % sheets.length); }
      else if (event.key === "Home") { event.preventDefault(); onChange(0); }
            else if (event.key === "End") { event.preventDefault(); onChange(sheets.length - 1); }
          };
          const node = tabsRef.current;
          if (!node) return;
          node.addEventListener("keydown", handler);
          return () => node.removeEventListener("keydown", handler);
        }, [activeSheet, sheets.length, onChange]);
        return (
          <div ref={tabsRef} className="office-sheet-tabs" role="tablist" aria-label={t("officeSheetTabsAria")}>
            <span className="office-toolbar-label">{t("officeExcelLabel")}</span>
            {sheets.map((sheet, index) => (
              <button
                type="button"
                key={sheet.name + index}
                role="tab"
                aria-selected={index === activeSheet}
                aria-controls={`office-sheet-panel-${index}`}
                id={`office-sheet-tab-${index}`}
                tabIndex={index === activeSheet ? 0 : -1}
                onClick={() => onChange(index)}
                className={index === activeSheet ? "is-active" : ""}
        >
          {sheet.name}
        </button>
      ))}
    </div>
  );
}

export default function OfficeViewer({ data }: Props) {
  const { t } = useI18n();
  const [activeSheet, setActiveSheet] = useState(0);

  if (data.type === "docx") {
    return (
      <div className="office-viewer-shell">
        <div className="office-toolbar" role="toolbar" aria-label={t("officeWordToolbarAria")}>
          <span className="office-toolbar-label">{t("officeWordLabel")}</span>
        </div>
        <WordDoc html={data.html} />
      </div>
    );
  }

  if (data.type === "excel") {
    const sheets = data.sheets;
    const current = sheets[activeSheet];
    return (
      <div className="office-viewer-shell">
        <SheetTabs sheets={sheets} activeSheet={activeSheet} onChange={setActiveSheet} />
        <div className="office-excel-stage" role="tabpanel" id={`office-sheet-panel-${activeSheet}`} aria-labelledby={`office-sheet-tab-${activeSheet}`}>
          {current ? <ExcelSheet key={current.name} sheet={current} /> : (
            <ViewerError title={t("officeSheetMissingTitle")} message={t("officeSheetMissingBody")} />
          )}
        </div>
      </div>
    );
  }

  return (
      <div className="office-viewer-shell">
        <div className="office-toolbar" role="toolbar" aria-label={t("officePptxToolbarAria")}>
          <span className="office-toolbar-label">{t("officePptxLabel")}</span>
        </div>
        <PptxMessage />
      </div>
    );
  }