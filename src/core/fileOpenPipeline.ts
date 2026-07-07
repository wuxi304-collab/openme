import type { FileCategory, FileInfo, FileTabState } from "../types";

export type LoadedFileTabData = Partial<Pick<FileTabState, "content" | "binaryData" | "mimeType" | "officeData" | "error">>;

export async function loadFileTabData(fileInfo: FileInfo, category: FileCategory): Promise<LoadedFileTabData> {
  if (category === "office") return loadOfficeData(fileInfo);
  if (category === "audio" || category === "video" || category === "epub") return {};
  if (category === "design" || category === "package" || category === "disk" || category === "other") return {};
  if (category === "svg" || category === "image" || category === "pdf" || category === "cad" || category === "font") return loadBinaryData(fileInfo, category);
  return loadTextLikeData(fileInfo);
}

async function loadOfficeData(fileInfo: FileInfo): Promise<LoadedFileTabData> {
  const ext = fileInfo.extension.toLowerCase();
  if (ext === ".docx") {
    const res = await window.electronAPI.convertDocx(fileInfo.path);
    return { officeData: res.success ? { type: "docx", html: res.html ?? "" } : undefined, error: res.success ? undefined : res.message ?? "Word conversion failed" };
  }
  if (ext === ".xlsx") {
    const res = await window.electronAPI.convertExcel(fileInfo.path);
    return { officeData: res.success ? { type: "excel", sheets: res.sheets ?? [] } : undefined, error: res.success ? undefined : res.message ?? "Excel conversion failed" };
  }
  return { officeData: { type: "pptx" } };
}

async function loadBinaryData(fileInfo: FileInfo, category: FileCategory): Promise<LoadedFileTabData> {
  const res = await window.electronAPI.readBinary(fileInfo.path, getBinaryReadLimit(category));
  return { binaryData: res.success ? res.data : undefined, mimeType: getMimeType(fileInfo.extension), error: res.success ? undefined : res.message ?? "Failed to read file" };
}

async function loadTextLikeData(fileInfo: FileInfo): Promise<LoadedFileTabData> {
  const res = await window.electronAPI.readFileContent(fileInfo.path);
  return { content: res.type === "text" ? res.data ?? null : null, binaryData: res.type === "binary" ? res.data : undefined, mimeType: res.mimeType, error: res.type === "error" ? res.message ?? "Failed to read file" : undefined };
}

function getBinaryReadLimit(category: FileCategory): number {
  if (category === "pdf" || category === "cad") return 100 * 1024 * 1024;
  if (category === "font") return 25 * 1024 * 1024;
  return 50 * 1024 * 1024;
}

function getMimeType(ext: string): string {
  const map: Record<string, string> = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif", ".bmp": "image/bmp", ".webp": "image/webp", ".svg": "image/svg+xml", ".pdf": "application/pdf" };
  return map[ext.toLowerCase()] ?? "application/octet-stream";
}
