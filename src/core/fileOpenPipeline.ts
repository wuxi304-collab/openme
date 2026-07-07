import { getViewerRouteByPath } from "../viewer-registry";
import type { ViewerRoute } from "../viewer-registry";
import type { FileCategory, FileInfo, FileOpenLoader, FileOpenOutcome, FileOpenOutcomeStatus, FileTabState } from "../types";

export type LoadedFileTabData = Partial<Pick<FileTabState, "content" | "binaryData" | "mimeType" | "officeData" | "openOutcome" | "error">>;

export async function loadFileTabData(fileInfo: FileInfo, category: FileCategory): Promise<LoadedFileTabData> {
  const route = getViewerRouteByPath(fileInfo.path);

  if (category === "office") return loadOfficeData(fileInfo, route);
  if (category === "audio" || category === "video") return { openOutcome: buildOutcome(route, "loaded", "media", `${fileInfo.name} 已进入 OpenMe 媒体打开面。`) };
  if (category === "epub") return { openOutcome: buildOutcome(route, "loaded", "epub", `${fileInfo.name} 已进入 OpenMe EPUB 打开面。`) };
  if (category === "design" || category === "package" || category === "disk" || category === "other") return {};
  if (category === "svg" || category === "image" || category === "pdf" || category === "cad" || category === "font") return loadBinaryData(fileInfo, category, route);
  return loadTextLikeData(fileInfo, route);
}

async function loadOfficeData(fileInfo: FileInfo, route: ViewerRoute): Promise<LoadedFileTabData> {
  const ext = fileInfo.extension.toLowerCase();
  if (ext === ".docx") {
    const res = await window.electronAPI.convertDocx(fileInfo.path);
    return {
      officeData: res.success ? { type: "docx", html: res.html ?? "" } : undefined,
      openOutcome: buildOutcome(route, res.success ? "loaded" : "route-card", "office", res.success ? `${fileInfo.name} 已进入 OpenMe Office 打开面。` : res.message ?? "Word conversion failed"),
      error: res.success ? undefined : res.message ?? "Word conversion failed",
    };
  }
  if (ext === ".xlsx") {
    const res = await window.electronAPI.convertExcel(fileInfo.path);
    return {
      officeData: res.success ? { type: "excel", sheets: res.sheets ?? [] } : undefined,
      openOutcome: buildOutcome(route, res.success ? "loaded" : "route-card", "office", res.success ? `${fileInfo.name} 已进入 OpenMe Excel 打开面。` : res.message ?? "Excel conversion failed"),
      error: res.success ? undefined : res.message ?? "Excel conversion failed",
    };
  }
  return { officeData: { type: "pptx" }, openOutcome: buildOutcome(route, "loaded", "office", `${fileInfo.name} 已进入 OpenMe Office 打开面。`) };
}

async function loadBinaryData(fileInfo: FileInfo, category: FileCategory, route: ViewerRoute): Promise<LoadedFileTabData> {
  const res = await window.electronAPI.readBinary(fileInfo.path, getBinaryReadLimit(category));
  return {
    binaryData: res.success ? res.data : undefined,
    mimeType: getMimeType(fileInfo.extension),
    openOutcome: buildOutcome(route, res.success ? "loaded" : "route-card", "binary", res.success ? `${fileInfo.name} 已进入 OpenMe 二进制预览面。` : res.message ?? "Failed to read file"),
    error: res.success ? undefined : res.message ?? "Failed to read file",
  };
}

async function loadTextLikeData(fileInfo: FileInfo, route: ViewerRoute): Promise<LoadedFileTabData> {
  const res = await window.electronAPI.readFileContent(fileInfo.path);
  return {
    content: res.type === "text" ? res.data ?? null : null,
    binaryData: res.type === "binary" ? res.data : undefined,
    mimeType: res.mimeType,
    openOutcome: buildOutcome(route, res.type === "error" ? "error" : "loaded", "text", res.type === "error" ? res.message ?? "Failed to read file" : `${fileInfo.name} 已进入 OpenMe 文本打开面。`),
    error: res.type === "error" ? res.message ?? "Failed to read file" : undefined,
  };
}

function buildOutcome(route: ViewerRoute, status: FileOpenOutcomeStatus, loader: FileOpenLoader, message: string): FileOpenOutcome {
  return { surface: "openme-tab", status, loader, routeMode: route.mode, message };
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
