// Preload script — runs in the renderer's process but with a restricted
// execution context. The renderer is OS-sandboxed (sandbox: true in
// main.js), so this script can only use Electron's sandbox-safe module
// subset. The current preload only touches:
//
//   - contextBridge : bridge functions into window.electronAPI
//   - ipcRenderer   : send invoke() messages to the main process
//
// Do NOT add require()s for any other Node module (e.g. fs, path,
// child_process) — they will be undefined under sandbox: true and
// fail loudly at startup. If you need a new capability, add a new
// IPC channel in main.js and expose it via contextBridge here.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  getFileInfo: (path) => ipcRenderer.invoke("get-file-info", path),
  setUiStrings: (strings) => ipcRenderer.invoke("set-ui-strings", strings),
  loadRecentFiles: () => ipcRenderer.invoke("load-recent-files"),
  saveRecentFiles: (store) => ipcRenderer.invoke("save-recent-files", store),
  exportSettingsToFile: (payload, defaultName) => ipcRenderer.invoke("export-settings-to-file", payload, defaultName),
  importSettingsFromFile: () => ipcRenderer.invoke("import-settings-from-file"),
  saveRecentFiles: (store) => ipcRenderer.invoke("save-recent-files", store),
  readTextFile: (path, maxSize) => ipcRenderer.invoke("read-text-file", path, maxSize),
  openFileDialog: () => ipcRenderer.invoke("open-file-dialog"),
  openInSystem: (path) => ipcRenderer.invoke("open-in-system", path),
  revealInFolder: (path) => ipcRenderer.invoke("reveal-in-folder", path),
  getSettingsStoragePath: () => ipcRenderer.invoke("get-settings-storage-path"),
  getFileHash: (path) => ipcRenderer.invoke("get-file-hash", path),
  getAppVersion: () => ipcRenderer.invoke("get-app-version"),
  getRuntimeInfo: () => ipcRenderer.invoke("get-runtime-info"),
  getMediaUrl: (path) => ipcRenderer.invoke("get-media-url", path),
  getAudioMetadata: (path) => ipcRenderer.invoke("get-audio-metadata", path),
  getAudioFormat: (path) => ipcRenderer.invoke("get-audio-format", path),
  // Universal audio decoder (ffmpeg-static → raw f32le PCM over IPC).
  // The renderer registers `onAudioPcmMeta/Chunk/Done` listeners BEFORE
  // calling `decodeAudioPcm` so it never misses the meta event that
  // precedes the chunk stream.
  decodeAudioPcm: (filePath, options) => ipcRenderer.invoke("decode-audio-pcm", { filePath, options }),
  cancelAudioDecode: (requestId) => ipcRenderer.send("decode-audio-cancel", { requestId }),
  getFfmpegInfo: () => ipcRenderer.invoke("get-ffmpeg-info"),
  onAudioPcmMeta: (cb) => {
    const listener = (_e, payload) => cb(payload);
    ipcRenderer.on("audio-pcm-meta", listener);
    return () => ipcRenderer.removeListener("audio-pcm-meta", listener);
  },
  onAudioPcmChunk: (cb) => {
    const listener = (_e, payload) => cb(payload);
    ipcRenderer.on("audio-pcm-chunk", listener);
    return () => ipcRenderer.removeListener("audio-pcm-chunk", listener);
  },
  onAudioPcmDone: (cb) => {
    const listener = (_e, payload) => cb(payload);
    ipcRenderer.on("audio-pcm-done", listener);
    return () => ipcRenderer.removeListener("audio-pcm-done", listener);
  },
  listAudioInFolder: (folderPath, options) => ipcRenderer.invoke("list-audio-in-folder", folderPath, options),
  readEpub: (path) => ipcRenderer.invoke("read-epub", path),
  getCadEngineStatus: () => ipcRenderer.invoke("get-cad-engine-status"),
  inspectCadDocument: (path) => ipcRenderer.invoke("inspect-cad-document", path),
  renderCadDocument: (path) => ipcRenderer.invoke("render-cad-document", path),
  readFileContent: (path, maxSize) => ipcRenderer.invoke("read-file-content", path, maxSize),
  saveFile: (path, content) => ipcRenderer.invoke("save-file", path, content),
  readBinary: (path, maxSize) => ipcRenderer.invoke("read-binary", path, maxSize),
  convertDocx: (path) => ipcRenderer.invoke("convert-docx", path),
  convertExcel: (path) => ipcRenderer.invoke("convert-excel", path),
  listZipContents: (path) => ipcRenderer.invoke("list-zip-contents", path),
  unzipFile: (path, targetDir) => ipcRenderer.invoke("unzip-file", path, targetDir),
  readZipEntry: (path, entryName) => ipcRenderer.invoke("read-zip-entry", path, entryName),
  selectFolderDialog: () => ipcRenderer.invoke("select-folder-dialog"),
  setDirtyState: (dirty) => ipcRenderer.invoke("set-dirty-state", dirty),
  windowMinimize: () => ipcRenderer.invoke("window-minimize"),
  windowMaximize: () => ipcRenderer.invoke("window-maximize"),
  windowClose: () => ipcRenderer.invoke("window-close"),
  windowIsMaximized: () => ipcRenderer.invoke("window-is-maximized"),
  getAiConfig: () => ipcRenderer.invoke("get-ai-config"),
  saveAiConfig: (config) => ipcRenderer.invoke("save-ai-config", config),
  planCadChange: (input) => ipcRenderer.invoke("plan-cad-change", input),
  saveErrorLog: (payload, defaultName) => ipcRenderer.invoke("save-error-log", payload, defaultName),
    getInstallMode: () => ipcRenderer.invoke("app:install-mode"),
    pushStartupMilestone: (sublabel) => ipcRenderer.send("app:startup-milestone", { sublabel: typeof sublabel === "string" ? sublabel : "" }),
    });





