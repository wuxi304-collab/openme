import { FileCategory } from "./fileTypeDetector";
import type { Translator } from "../i18n";

export type { FileCategory };

export function detectFileType(extension: string): FileCategory {
  const ext = extension.toLowerCase();
  const map: Record<string, FileCategory> = {
    ".pdf": "pdf",
    ".png": "image", ".jpg": "image", ".jpeg": "image", ".gif": "image", ".bmp": "image", ".webp": "image",
    ".svg": "svg",
    ".txt": "code", ".md": "code", ".json": "json", ".csv": "csv",
    ".xml": "code", ".yml": "code", ".yaml": "code", ".ini": "code", ".log": "code",
    ".js": "code", ".ts": "code", ".jsx": "code", ".tsx": "code",
    ".py": "code", ".rs": "code", ".go": "code", ".java": "code",
    ".c": "code", ".cpp": "code", ".h": "code", ".css": "code", ".html": "code",
    ".doc": "office", ".docx": "office", ".xls": "office", ".xlsx": "office", ".ppt": "office", ".pptx": "office",
    ".zip": "archive", ".rar": "archive", ".7z": "archive", ".tar": "archive", ".gz": "archive",
    ".epub": "epub",
  };
  return map[ext] ?? "other";
}

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
