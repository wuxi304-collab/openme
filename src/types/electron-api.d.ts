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

export interface SaveErrorLogResult {
  ok: true;
  path: string;
  bytes: number;
}

export interface GetSettingsStoragePathResult {
  ok: true;
  path: string;
}

export interface ElectronAPI {
  getFileInfo: (path: string) => Promise<FileInfo | IpcFailureResult>;
  setUiStrings: (strings: Partial<UiStrings> & { lang?: "zh" | "en" }) => Promise<void>;
  loadRecentFiles: () => Promise<RecentFilesStore>;
  saveRecentFiles: (store: { files: FileInfo[]; version: number }) => Promise<void>;
  readFileContent: (path: string, maxSize?: number) => Promise<{ type: string; data?: string; mimeType?: string; message?: string }>;
  saveFile: (path: string, content: string) => Promise<{ success: boolean; message?: string }>;
  readBinary: (path: string, maxSize?: number) => Promise<{ success: boolean; data?: string; message?: string }>;
  convertDocx: (path: string) => Promise<{ success: boolean; html?: string; message?: string }>;
  convertExcel: (path: string) => Promise<{ success: boolean; sheets?: unknown[]; message?: string }>;
  openFileDialog: () => Promise<string[]>;
  openInSystem: (path: string) => Promise<void>;
    revealInFolder: (path: string) => Promise<RevealResult | IpcFailureResult>;
    getFileHash: (path: string) => Promise<FileHashResult | IpcFailureResult>;
    getAppVersion: () => Promise<string>;
    getRuntimeInfo: () => Promise<RuntimeInfo>;
    getMediaUrl: (path: string) => Promise<string>;
  getAudioMetadata: (path: string) => Promise<AudioMetadataResult | IpcFailureResult>;
  getAudioFormat: (path: string) => Promise<AudioFormatProbe | IpcFailureResult>;
  listAudioInFolder: (folderPath: string, options?: { recursive?: boolean; limit?: number }) => Promise<ListAudioFolderResult | IpcFailureResult>;
  /** Desktop launch wiring — main process forwards `OpenMe.exe <files>` argv
   *  (or second-instance hand-off, or macOS `open-file`) via this channel.
   *  The renderer registers this listener BEFORE opening any tabs. */
  onInitialFiles: (cb: (paths: string[]) => void) => () => void;
  /** Universal audio decoder (PR #146) — main process uses ffmpeg-static to
   *  decode the file into f32le PCM and streams chunks back via IPC events.
   *  `decodeAudioPcm` returns once the file is fully streamed. */
  decodeAudioPcm: (path: string, options: { targetSampleRate?: number; targetChannels?: number; expectedBytes?: number | null }) => Promise<{ ok: boolean; requestId: string; totalBytes?: number; error?: { code: string; message: string }; meta?: AudioFfmpegMeta | null }>;
  cancelAudioDecode: (requestId: string) => void;
  getFfmpegInfo: () => Promise<{ available: boolean; ffmpegPath?: string; version?: string }>;
  onAudioPcmMeta: (cb: (payload: { requestId: string; ok: boolean; meta: AudioFfmpegMeta | null }) => void) => () => void;
  onAudioPcmChunk: (cb: (payload: { requestId: string; bytes: ArrayBuffer }) => void) => () => void;
  onAudioPcmDone: (cb: (payload: { requestId: string; ok: boolean; totalBytes: number; error?: { code: string; message: string } }) => void) => () => void;
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
  saveErrorLog: (payload: unknown, defaultName?: string) => Promise<SaveErrorLogResult | IpcFailureResult>;
  exportSettingsToFile: (payload: unknown, defaultName?: string) => Promise<{ ok: true; path: string } | { ok: false; canceled: true } | IpcFailureResult>;
  importSettingsFromFile: () => Promise<{ ok: true; path: string; data: unknown } | { ok: false; canceled: true } | IpcFailureResult>;
    getSettingsStoragePath: () => Promise<GetSettingsStoragePathResult | IpcFailureResult>;
      /**
       * Returns how the user is currently running the app. The renderer uses
       * this to surface a one-time toast on portable launches pointing at
       * the setup installer. Returns one of `"installed"`, `"portable"`,
       * or `"dev"` (when running outside Electron via `npm run electron`).
       */
      getInstallMode: () => Promise<"installed" | "portable" | "dev">;
            /**
             * Renderer-side startup progress hook. Pushes a fine-grained sublabel
             * ("loading viewer registry", "hydrating settings") to the splash
             * window so the user sees real movement beyond the static phase
             * timeline. No-op when the splash has already faded. Throttled by
             * main process to ≥ 80ms between calls.
             */
            pushStartupMilestone: (sublabel: string) => void;
          }

  export interface UiStrings {
    dialogSelectFile: string;
    dialogSelectFolder: string;
    closePromptTitle: string;
    closePromptMessage: string;
    closePromptDetail: string;
    closePromptKeepEditing: string;
    closePromptDiscard: string;
    settingsExportDialogTitle: string;
    settingsImportDialogTitle: string;
  }

export interface EpubBook {
  title: string;
  creator?: string;
  language?: string;
  cover?: { data: string; mimeType: string } | null;
  chapters: { title: string; text: string }[];
}

// Snapshot of runtime + host details used by the About dialog. All fields
// are optional because the renderer can also be opened in browser dev mode
// where window.electronAPI is a noop shim that returns undefined.
export interface RuntimeInfo {
  appVersion?: string;
  electron?: string;
  chrome?: string;
  node?: string;
  v8?: string;
  osName?: string;
  osPlatform?: string;
  osArch?: string;
  systemLocale?: string;
  hostname?: string;
  cpus?: number;
  totalMemGb?: number;
}

export interface RevealResult {
  ok: true;
  revealed: boolean;
}

export interface FileHashResult {
  ok: true;
  algorithm: "sha256";
  hash: string;
  shortHash: string;
  size: number;
  computedAt: string;
}

// Lossless / hi-res audio metadata returned by the main process. Mirrors
// the shape produced by `music-metadata` but flattened for the renderer —
// cover art is inlined as a data: URL so we never need a second IPC.
export interface AudioMetadataResult {
  ok: true;
  path: string;
  tag: {
    title: string | null;
    artist: string | null;
    album: string | null;
    albumArtist: string | null;
    year: number | null;
    genre: string | null;
    track: number | null;
    trackTotal: number | null;
    disc: number | null;
    discTotal: number | null;
    composer: string | null;
    comment: string | null;
  };
  format: {
    container: string | null;
    codec: string | null;
    lossless: boolean | null;
    sampleRate: number | null;
    bitsPerSample: number | null;
    channels: number | null;
    channelLayout: "mono" | "stereo" | "surround" | null;
    bitrate: number | null;
    durationSec: number | null;
    encoder: string | null;
  };
  cover: { format: string; mime: string; data: string } | null;
}

// Lightweight probe: technical format block only, no tags or cover art.
// Cheaper than AudioMetadataResult when the UI just needs the badge data.
export interface AudioFormatProbe {
  ok: true;
  path: string;
  container: string | null;
  codec: string | null;
  lossless: boolean | null;
  sampleRate: number | null;
  bitsPerSample: number | null;
  channels: number | null;
  bitrate: number | null;
  durationSec: number | null;
}

// Result of scanning a folder for audio files. Used by the lossless
// player to build a queue from a single folder drop.
export interface ListAudioFolderResult {
  ok: true;
  folder: string;
  files: { path: string; name: string; size: number }[];
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

// AudioFfmpegMeta mirrors the structure emitted by electron/audioFfmpeg.js
// over the audio-pcm-meta IPC event. See src/utils/audioFfmpegDecoder.ts.
export interface AudioFfmpegMeta {
  sampleRate: number | null;
  channels: number | null;
  bitDepth: number | null;
  durationSec: number | null;
  codec: string | null;
  container: string | null;
  lossless: boolean | null;
  bitrate: number | null;
}
