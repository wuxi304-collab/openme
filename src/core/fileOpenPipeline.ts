import { getViewerRouteByPath } from "../viewer-registry";
import type { ViewerRoute } from "../viewer-registry";
import type { Translator } from "../i18n";
import type { FileCategory, FileInfo, FileOpenLoader, FileOpenOutcome, FileOpenOutcomeStatus, FileTabState } from "../types";
import { describeIpcError, isIpcFailure } from "./ipcError";

export type LoadedFileTabData = Partial<Pick<FileTabState, "content" | "binaryData" | "mimeType" | "officeData" | "openOutcome" | "error">>;

export async function loadFileTabData(fileInfo: FileInfo, category: FileCategory, t: Translator): Promise<LoadedFileTabData> {
  const route = getViewerRouteByPath(fileInfo.path);

  if (category === "office") return loadOfficeData(fileInfo, route, t);
  if (category === "audio" || category === "video") return { openOutcome: buildOutcome(route, "loaded", "media", t("openOutcomeMedia", { name: fileInfo.name })) };
  if (category === "epub") return { openOutcome: buildOutcome(route, "loaded", "epub", t("openOutcomeEpub", { name: fileInfo.name })) };
  if (category === "design" || category === "package" || category === "disk" || category === "other") return {};
  if (category === "svg" || category === "image" || category === "pdf" || category === "cad" || category === "font") return loadBinaryData(fileInfo, category, route, t);
  return loadTextLikeData(fileInfo, route, t);
}

async function loadOfficeData(fileInfo: FileInfo, route: ViewerRoute, t: Translator): Promise<LoadedFileTabData> {
  const ext = fileInfo.extension.toLowerCase();
  if (ext === ".docx") {
    const res = await window.electronAPI.convertDocx(fileInfo.path);
    const failMessage = isIpcFailure(res) ? describeIpcError(t, res) : res.message ?? t("loadFailedWord");
    return {
      officeData: res.success ? { type: "docx", html: res.html ?? "" } : undefined,
      openOutcome: buildOutcome(route, res.success ? "loaded" : "route-card", "office", res.success ? t("openOutcomeOffice", { name: fileInfo.name }) : failMessage),
      error: res.success ? undefined : failMessage,
    };
  }
  if (ext === ".xlsx") {
    const res = await window.electronAPI.convertExcel(fileInfo.path);
    const failMessage = isIpcFailure(res) ? describeIpcError(t, res) : res.message ?? t("loadFailedExcel");
    return {
      officeData: res.success ? { type: "excel", sheets: res.sheets ?? [] } : undefined,
      openOutcome: buildOutcome(route, res.success ? "loaded" : "route-card", "office", res.success ? t("openOutcomeExcel", { name: fileInfo.name }) : failMessage),
      error: res.success ? undefined : failMessage,
    };
  }
  return { officeData: { type: "pptx" }, openOutcome: buildOutcome(route, "loaded", "office", t("openOutcomeOffice", { name: fileInfo.name })) };
}

async function loadBinaryData(fileInfo: FileInfo, category: FileCategory, route: ViewerRoute, t: Translator): Promise<LoadedFileTabData> {
  const res = await window.electronAPI.readBinary(fileInfo.path, getBinaryReadLimit(category));
  const failMessage = isIpcFailure(res) ? describeIpcError(t, res) : res.message ?? t("loadFailedRead");
  return {
    binaryData: res.success ? res.data : undefined,
    mimeType: getMimeType(fileInfo.extension),
    openOutcome: buildOutcome(route, res.success ? "loaded" : "route-card", "binary", res.success ? t("openOutcomeBinary", { name: fileInfo.name }) : failMessage),
    error: res.success ? undefined : failMessage,
  };
}

async function loadTextLikeData(fileInfo: FileInfo, route: ViewerRoute, t: Translator): Promise<LoadedFileTabData> {
  const res = await window.electronAPI.readFileContent(fileInfo.path);
  // Main process returns an IpcFailure shape on error (PR #34). Resolve via
  // i18n when possible, otherwise fall back to the bundled message.
  const failMessage = res.type === "error" ? describeIpcError(t, isIpcFailure(res) ? res : null) || res.message || t("loadFailedRead") : null;
  return {
    content: res.type === "text" ? res.data ?? null : null,
    binaryData: res.type === "binary" ? res.data : undefined,
    mimeType: res.mimeType,
    openOutcome: buildOutcome(route, res.type === "error" ? "error" : "loaded", "text", res.type === "error" ? failMessage ?? t("loadFailedRead") : t("openOutcomeText", { name: fileInfo.name })),
    error: res.type === "error" ? failMessage ?? t("loadFailedRead") : undefined,
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
