import { FileCategory } from "./fileTypeDetector";

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

export function getFileTypeLabel(type: FileCategory | string): string {
  const labels: Record<string, string> = {
    pdf: "PDF 文档",
    image: "图片",
    svg: "SVG 图片",
    text: "文本",
    code: "代码",
    markdown: "Markdown",
    json: "JSON",
    csv: "CSV",
    office: "Office 文档",
    document: "Office 文档",
    archive: "压缩包",
    epub: "电子书",
    other: "其他",
  };
  return labels[type] ?? "其他";
}

export function isPreviewable(type: FileCategory | string): boolean {
  return ["text", "pdf", "image", "svg", "code", "markdown", "json", "csv", "office"].includes(type);
}
