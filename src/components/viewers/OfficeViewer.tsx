import { useState } from "react";

interface DocxData { type: "docx"; html: string; }
interface ExcelData { type: "excel"; sheets: { name: string; data: string[][] }[]; }
interface PptxData { type: "pptx"; }
type OfficeData = DocxData | ExcelData | PptxData;

interface Props { data: OfficeData; }

const EXCEL_PAGE_SIZE = 500;

function ExcelSheet({ sheet }: { sheet: { name: string; data: string[][] } }) {
  const [page, setPage] = useState(0);
  const columnCount = sheet.data.reduce((maximum, row) => Math.max(maximum, row.length), 0);
  const headers = Array.from({ length: columnCount }, (_, index) => sheet.data[0]?.[index] || `第 ${index + 1} 列`);
  const rows = sheet.data.slice(1);
  const totalPages = Math.max(1, Math.ceil(rows.length / EXCEL_PAGE_SIZE));
  const visibleRows = rows.slice(page * EXCEL_PAGE_SIZE, (page + 1) * EXCEL_PAGE_SIZE);
  if (columnCount === 0) return <div className="viewer-error"><strong>工作表为空</strong><p>“{sheet.name}”中没有单元格数据。</p></div>;
  return (
    <div className="excel-sheet">
      <div className="excel-grid-wrap"><table className="excel-grid"><thead><tr><th className="excel-row-number">#</th>{headers.map((header, index) => <th key={index}>{header}</th>)}</tr></thead><tbody>{visibleRows.map((row, rowIndex) => <tr key={page * EXCEL_PAGE_SIZE + rowIndex}><td className="excel-row-number">{page * EXCEL_PAGE_SIZE + rowIndex + 1}</td>{headers.map((_, columnIndex) => <td key={columnIndex} title={row[columnIndex] ?? ""}>{row[columnIndex] ?? ""}</td>)}</tr>)}</tbody></table></div>
      <div className="csv-pagination"><span>{rows.length.toLocaleString()} 行 × {columnCount} 列</span><button type="button" disabled={page === 0} onClick={() => setPage((value) => value - 1)}>上一页</button><span>{page + 1} / {totalPages}</span><button type="button" disabled={page >= totalPages - 1} onClick={() => setPage((value) => value + 1)}>下一页</button></div>
    </div>
  );
}
export default function OfficeViewer({ data }: Props) {
  const [activeSheet, setActiveSheet] = useState(0);

  if (data.type === "docx") {
    return (
      <div className="flex flex-col h-full overflow-hidden rounded-lg border" style={{ borderColor: "var(--border-default)", background: "var(--bg-base)" }}>
        <div className="flex items-center px-3 py-1.5 border-b" style={{ borderColor: "var(--border-muted)", background: "var(--bg-surface)" }}>
          <span className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: "var(--text-muted)" }}>Word 文档</span>
        </div>
        <iframe
          className="office-doc-frame"
          title="Word 文档预览"
          sandbox=""
          srcDoc={`<!doctype html><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'"><style>body{box-sizing:border-box;max-width:850px;margin:24px auto;padding:48px 56px;background:#fff;color:#222;font:14px/1.75 system-ui,sans-serif;box-shadow:0 8px 30px #0002}img{max-width:100%}table{border-collapse:collapse;max-width:100%}td,th{border:1px solid #ccc;padding:5px 8px}</style>${data.html}`}
        />
      </div>
    );
  }

  if (data.type === "excel") {
    const sheets = data.sheets;
    const current = sheets[activeSheet];
    return (
      <div className="flex flex-col h-full overflow-hidden rounded-lg border" style={{ borderColor: "var(--border-default)", background: "var(--bg-base)" }}>
        <div className="excel-sheet-tabs" style={{ borderColor: "var(--border-muted)", background: "var(--bg-surface)" }}>
          <span className="text-[10px] uppercase tracking-widest font-semibold mr-2" style={{ color: "var(--text-muted)" }}>Excel</span>
          {sheets.map((s, i) => (
            <button type="button" key={i} onClick={() => setActiveSheet(i)}
              className="px-2 py-0.5 rounded text-[10px] transition-colors"
              style={{
                background: i === activeSheet ? "var(--accent-dim)" : "transparent",
                color: i === activeSheet ? "var(--accent)" : "var(--text-muted)",
              }}>
              {s.name}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-hidden">
          {current ? <ExcelSheet key={current.name} sheet={current} /> : <div className="viewer-error"><strong>没有工作表</strong><p>该文件未包含可读取的表格。</p></div>}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center flex-1 h-full rounded-lg border gap-4" style={{ borderColor: "var(--border-default)", background: "var(--bg-base)" }}>
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
      </svg>
      <p className="text-[13px]" style={{ color: "var(--text-secondary)" }}>PPTX 动画无法预览</p>
      <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>请使用「用系统默认程序打开」查看完整内容</p>
    </div>
  );
}



