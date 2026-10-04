/**
 * Export the extracted label inventory as CSV or JSON (plan Phase 0, item 2).
 *
 * The inventory is derived from the *rendered view*, not from DWG entities: the
 * ids are positional, one label can stand for many block occurrences, and there
 * is no entity handle anywhere in the pipeline (see `extractCadText`). Every
 * export therefore carries a provenance banner, because a spreadsheet that
 * travels out of the app and reaches a colleague is exactly where that
 * distinction stops being obvious and someone starts treating row 12 as "the
 * handle to edit".
 */

import type { CadTextItem } from "./extractCadText";

export const CAD_TEXT_EXPORT_PROVENANCE =
  "Derived from the rendered drawing view. Not entity-authoritative: ids are positional, " +
  "one row may represent many block occurrences, and no DWG entity handle is present. " +
  "Use for cross-checking and reporting, not as an edit address.";

export interface CadTextExportMeta {
  fileName: string;
  /** AC10xx signature, when known. */
  version?: string | null;
  generatedAt?: string;
  itemCount?: number;
}

const CSV_COLUMNS = ["id", "kind", "text", "x", "y", "height", "textAnchor", "rotation"] as const;

/**
 * A cell that parses as a plain number cannot execute as a formula, so it is
 * left alone — otherwise every negative coordinate would be mangled. Anything
 * else starting with one of the formula characters gets a leading apostrophe,
 * which Excel and LibreOffice both treat as "this is text".
 */
const FORMULA_LEAD = /^[=+\-@\t\r]/;
const PLAIN_NUMBER = /^-?\d+(\.\d+)?$/;

function neutralizeFormula(text: string): string {
  if (!FORMULA_LEAD.test(text)) return text;
  if (PLAIN_NUMBER.test(text)) return text;
  return `'${text}`;
}

/** RFC 4180 quoting: wrap when the value contains a delimiter, quote or newline. */
function csvCell(value: unknown): string {
  const raw = value === null || value === undefined ? "" : String(value);
  const text = neutralizeFormula(raw);
  if (/[",\r\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

/**
 * @param bom Prefix a UTF-8 BOM so Excel on Windows opens Chinese text correctly
 *   instead of guessing the encoding. Default true for CSV; JSON stays BOM-free.
 */
export function toCadTextCsv(
  items: readonly CadTextItem[],
  meta: CadTextExportMeta,
  options: { bom?: boolean } = {},
): string {
  const bom = options.bom === false ? "" : "\uFEFF";
  const lines: string[] = [];
  lines.push(`# ${CAD_TEXT_EXPORT_PROVENANCE}`);
  lines.push(`# file=${csvCell(meta.fileName)}`);
  lines.push(`# version=${csvCell(meta.version ?? "unknown")}`);
  lines.push(`# generatedAt=${csvCell(meta.generatedAt ?? "")}`);
  lines.push(`# count=${items.length}`);
  lines.push(CSV_COLUMNS.join(","));
  for (const item of items) {
    lines.push(
      [
        csvCell(item.id),
        csvCell(item.kind ?? ""),
        csvCell(item.text),
        csvCell(round(item.geom?.x)),
        csvCell(round(item.geom?.y)),
        csvCell(round(item.geom?.height)),
        csvCell(item.geom?.textAnchor),
        csvCell(round(item.geom?.rotation)),
      ].join(","),
    );
  }
  // Trailing newline: tools that concatenate or line-diff exports expect it.
  return bom + lines.join("\r\n") + "\r\n";
}

export interface CadTextJsonExport {
  schemaVersion: 1;
  provenance: string;
  source: CadTextExportMeta;
  labels: Array<{
    id: string;
    kind: string | null;
    text: string;
    x: number | null;
    y: number | null;
    height: number | null;
    textAnchor: string | null;
    rotation: number | null;
  }>;
}

export function toCadTextJson(
  items: readonly CadTextItem[],
  meta: CadTextExportMeta,
): string {
  const payload: CadTextJsonExport = {
    schemaVersion: 1,
    provenance: CAD_TEXT_EXPORT_PROVENANCE,
    source: { ...meta, itemCount: items.length },
    labels: items.map((item) => ({
      id: item.id,
      kind: item.kind ?? null,
      text: item.text,
      x: item.geom?.x ?? null,
      y: item.geom?.y ?? null,
      height: item.geom?.height ?? null,
      textAnchor: item.geom?.textAnchor ?? null,
      rotation: item.geom?.rotation ?? null,
    })),
  };
  return JSON.stringify(payload, null, 2) + "\n";
}

/**
 * Suggests a default export name: `12.栏杆节点图.labels.csv`.
 *
 * Only the drawing's extension is stripped — Windows-illegal characters in a
 * path are already legal-or-not in the original name, and silently rewriting a
 * user's filename would be a worse surprise than an illegal character. Callers
 * that care should sanitise separately.
 */
export function suggestExportFileName(
  fileName: string,
  extension: "csv" | "json",
): string {
  const base = (fileName || "drawing").replace(/\.[^.]+$/, "");
  return `${base}.labels.${extension}`;
}

function round(value: number | undefined, digits = 3): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
