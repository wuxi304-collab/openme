import type { FileInfo, RecentFilesStore } from "../types";
import type { IpcFailure } from "../core/ipcError";

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

// Handlers that previously threw now return an IpcFailure shape so the
// renderer can resolve the message through describeIpcError() with locale
// awareness. Successful returns keep their plain object shape.
export type IpcSuccess<T> = T & { success?: true };
export type IpcFailureResult = IpcFailure;

export interface ElectronAPI {
  getFileInfo: (path: string) => Promise<FileInfo | IpcFailureResult>;
  setUiStrings: (strings: Partial<UiStrings>) => Promise<void>;
  loadRecentFiles: () => Promise<RecentFilesStore>;
  saveRecentFiles: (store: { files: FileInfo[]; version: number }) => Promise<void>;
  readFileContent: (path: string, maxSize?: number) => Promise<{ type: string; data?: string; mimeType?: string; message?: string }>;
  saveFile: (path: string, content: string) => Promise<{ success: boolean; message?: string }>;
  readBinary: (path: string, maxSize?: number) => Promise<{ success: boolean; data?: string; message?: string }>;
  convertDocx: (path: string) => Promise<{ success: boolean; html?: string; message?: string }>;
  convertExcel: (path: string) => Promise<{ success: boolean; sheets?: unknown[]; message?: string }>;
  openFileDialog: () => Promise<string[]>;
  openInSystem: (path: string) => Promise<void>;
  getAppVersion: () => Promise<string>;
  getMediaUrl: (path: string) => Promise<string>;
  readEpub: (path: string) => Promise<{ success: boolean; book?: EpubBook; message?: string }>;
  getCadEngineStatus: () => Promise<CadEngineStatus>;
  inspectCadDocument: (path: string) => Promise<CadInspectionResult>;
  renderCadDocument: (path: string) => Promise<{ success: boolean; svg?: string; message?: string }>;
  listZipContents: (path: string) => Promise<{ success: boolean; entries?: ZipEntry[]; totalSize?: number; message?: string }>;
  readZipEntry: (path: string, entryName: string) => Promise<{ success: boolean; data?: string; message?: string }>;
  unzipFile: (path: string, targetDir: string) => Promise<{ success: boolean; destination?: string; message?: string }>;
  selectFolderDialog: () => Promise<string | null>;
  setDirtyState: (dirty: boolean) => Promise<void>;
  windowMinimize: () => Promise<void>;
  windowMaximize: () => Promise<void>;
  windowClose: () => Promise<void>;
  windowIsMaximized: () => Promise<boolean>;
  getAiConfig: () => Promise<{ configured: boolean; model: string; baseUrl: string }>;
  saveAiConfig: (config: { apiKey: string; model: string; baseUrl: string }) => Promise<{ success: boolean; message?: string }>;
  planCadChange: (input: { filePath: string; fileName: string; request: string }) => Promise<{ success: boolean; plan?: unknown; message?: string }>;
}

  export interface UiStrings {
    dialogSelectFile: string;
    dialogSelectFolder: string;
    closePromptTitle: string;
    closePromptMessage: string;
    closePromptDetail: string;
    closePromptKeepEditing: string;
    closePromptDiscard: string;
  }

export interface EpubBook {
  title: string;
  creator?: string;
  language?: string;
  cover?: { data: string; mimeType: string } | null;
  chapters: { title: string; text: string }[];
}

export interface CadEngineStatus {
  available: boolean;
  kind: string;
  name: string;
  nameCode?: string;
  nameParams?: Record<string, string | number>;
  capabilities: string[];
  quality: string;
  fallback: boolean;
  message?: string;
  messageCode?: string;
  messageParams?: Record<string, string | number>;
}

export interface CadInspectionResult {
  success: boolean;
  document?: {
    document?: { entityCount?: number; layerCount?: number; blockCount?: number };
    entityTypes?: Record<string, number>;
  };
  message?: string;
}

export interface ZipEntry {
  name: string;
  isDir: boolean;
  size: number;
  safe?: boolean;
}
