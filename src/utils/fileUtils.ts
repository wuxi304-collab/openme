import { FileCategory } from "./fileTypeDetector";
import type { Translator } from "../i18n";

export type { FileCategory };

// NOTE: do not add a per-extension detection map here. The File Registry
// (`src/file-registry`) is the single source of truth for category detection; use
// `detectCategory()` from `./fileTypeDetector` instead. Keeping a second map caused
// real drift (e.g. `.md` was classified as "code" rather than "markdown").

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

export function formatDate(isoString: string): string {
  if (!isoString) return "-";
  const d = new Date(isoString);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function getFileTypeLabel(type: FileCategory | string, t: Translator): string {
  const keys: Record<string, string> = {
    pdf: "categoryPdf",
    image: "categoryImage",
    svg: "categorySvg",
    text: "categoryText",
    code: "categoryCode",
    markdown: "categoryMarkdown",
    json: "categoryJson",
    csv: "categoryCsv",
    office: "categoryOffice",
    document: "categoryDocument",
    archive: "categoryArchive",
    epub: "categoryEpub",
    other: "categoryOther",
  };
  return t(keys[type] ?? "categoryOther");
}

export function isPreviewable(type: FileCategory | string): boolean {
  return ["text", "pdf", "image", "svg", "code", "markdown", "json", "csv", "office"].includes(type);
}
