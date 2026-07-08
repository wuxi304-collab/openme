const { app, BrowserWindow, ipcMain, dialog, shell, safeStorage, protocol, net } = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");
const log = require("electron-log");
const { execFile } = require("child_process");
const { pathToFileURL } = require("url");
const { readEpub } = require("./epub");
const { ipcError } = require("./ipcErrors");

// Allow managed environments to place Chromium state in an explicitly writable directory.
if (process.env.OPENME_USER_DATA_DIR) {
  app.setPath("userData", path.resolve(process.env.OPENME_USER_DATA_DIR));
}

function setupLogging() {
  log.transports.file.level = "info";
  log.transports.console.level = process.env.OPENME_LOG_LEVEL || "info";
  log.transports.file.fileName = "openme-main.log";
  log.transports.file.maxSize = 5 * 1024 * 1024;
  log.initialize({ preload: false });
  log.info("OpenMe Qiwu main process starting", { version: app.getVersion(), platform: process.platform, arch: process.arch });
}

setupLogging();

process.on("uncaughtException", (error) => {
  log.error("uncaughtException", error);
});

process.on("unhandledRejection", (reason) => {
  log.error("unhandledRejection", reason);
});

app.setAppUserModelId("com.openme.desktop");
protocol.registerSchemesAsPrivileged([{ scheme: "openme-media", privileges: { standard: true, secure: true, stream: true, supportFetchAPI: true } }]);

// Defense-in-depth: apply the same web-contents hardening (CSP, blocked
// window.open, blocked will-navigate) to ANY web contents the app
// creates — not just the main window. Without this, a future feature
// that opens a BrowserWindow, a `<webview>`, or a child webContents
// could spawn an unhardened renderer. The main window is hardened
// explicitly via hardenWebContents() inside createWindow(); this is the
// catch-all for everything else.
app.on("web-contents-created", (_event, contents) => {
  hardenWebContents(contents);
});

let mainWindow = null;
let hasUnsavedChanges = false;

// Localized strings pushed from the renderer on mount (and whenever the user
// switches language). Main process uses these for native dialogs that the OS
// renders — file picker title, unzip destination title, and the unsaved-changes
// close prompt. Falls back to Chinese defaults when the renderer hasn't pushed
// any values yet (cold start).
let uiStrings = {
  dialogSelectFile: "选择文件",
  dialogSelectFolder: "选择解压目标文件夹",
  closePromptTitle: "还有未保存修改",
  closePromptMessage: "关闭 OpenMe Qiwu？",
  closePromptDetail: "未保存的文本、代码或 Markdown 修改将丢失。",
  closePromptKeepEditing: "继续编辑",
  closePromptDiscard: "放弃并关闭",
};

const isDev = !app.isPackaged && process.env.OPENME_USE_DIST !== "1";
const DEV_ORIGIN = "http://localhost:1420";

function buildContentSecurityPolicy() {
  // For dev allow inline scripts injected by Vite (HMR/react-refresh). Do NOT include 'unsafe-inline' in production.
  const scriptSrc = isDev ? "'self' 'unsafe-eval' 'unsafe-inline' http://localhost:1420" : "'self'";
  const connectSrc = isDev ? "'self' http://localhost:1420 ws://localhost:1420 openme-media:" : "'self' openme-media:";
  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: openme-media:",
    "font-src 'self' data:",
    "media-src 'self' blob: openme-media:",
    `connect-src ${connectSrc}`,
    "object-src 'none'",
    "frame-src 'none'",
    "base-uri 'self'",
    "form-action 'none'",
  ].join("; ");
}

function isDevServerUrl(targetUrl) {
  try {
    const parsed = new URL(targetUrl);
    return isDev && parsed.origin === DEV_ORIGIN;
  } catch {
    return false;
  }
}

function isAppUrl(targetUrl) {
  if (isDevServerUrl(targetUrl)) return true;
  try {
    const parsed = new URL(targetUrl);
    return parsed.protocol === "file:" || parsed.protocol === "openme-media:";
  } catch {
    return false;
  }
}

function isExternalWebUrl(targetUrl) {
  try {
    const parsed = new URL(targetUrl);
    return ["https:", "http:", "mailto:"].includes(parsed.protocol);
  } catch {
    return false;
  }
}

function hardenWebContents(webContents) {
  webContents.session.webRequest.onHeadersReceived((details, callback) => {
    const responseHeaders = {
      ...details.responseHeaders,
      "Content-Security-Policy": [buildContentSecurityPolicy()],
      "X-Content-Type-Options": ["nosniff"],
    };
    callback({ responseHeaders });
  });

  webContents.setWindowOpenHandler(({ url }) => {
    log.warn("Blocked window.open", { url });
    if (isExternalWebUrl(url)) shell.openExternal(url).catch((error) => log.error("openExternal failed", error));
    return { action: "deny" };
  });

  webContents.on("will-navigate", (event, url) => {
    if (isAppUrl(url)) return;
    event.preventDefault();
    log.warn("Blocked renderer navigation", { url });
    if (isExternalWebUrl(url)) shell.openExternal(url).catch((error) => log.error("openExternal failed", error));
  });

  webContents.on("render-process-gone", (_event, details) => {
    log.error("Renderer process gone", details);
  });

  webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    log.error("Renderer failed to load", { errorCode, errorDescription, validatedURL, isMainFrame });
  });

  webContents.on("unresponsive", () => {
    log.warn("Renderer became unresponsive");
  });
}

function getRecentFilesPath() {
  const appDir = path.join(app.getPath("userData"));
  if (!fs.existsSync(appDir)) fs.mkdirSync(appDir, { recursive: true });
  return path.join(appDir, "recent-files.json");
}

function detectFileType(extension) {
  const ext = extension.toLowerCase();
  const map = {
    ".pdf": "pdf",
    ".png": "image", ".jpg": "image", ".jpeg": "image", ".gif": "image", ".bmp": "image", ".webp": "image", ".svg": "image",
    ".txt": "text", ".md": "text", ".json": "text", ".csv": "text", ".xml": "text", ".yml": "text", ".yaml": "text", ".ini": "text", ".log": "text",
    ".js": "code", ".ts": "code", ".jsx": "code", ".tsx": "code", ".py": "code", ".rs": "code", ".go": "code", ".java": "code", ".c": "code", ".cpp": "code", ".h": "code", ".css": "code", ".html": "code",
    ".doc": "document", ".docx": "document", ".xls": "document", ".xlsx": "document", ".ppt": "document", ".pptx": "document",
    ".zip": "archive",
    ".epub": "epub",
    ".mp3": "audio", ".wav": "audio", ".ogg": "audio", ".m4a": "audio", ".aac": "audio", ".flac": "audio",
    ".mp4": "video", ".webm": "video", ".ogv": "video", ".m4v": "video",
    ".ttf": "font", ".otf": "font", ".woff": "font", ".woff2": "font",
  };
  return map[ext] || "other";
}

function getMimeType(ext) {
  const map = {
    ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
    ".gif": "image/gif", ".bmp": "image/bmp", ".webp": "image/webp",
    ".svg": "image/svg+xml", ".pdf": "application/pdf",
  };
  return map[ext] || "application/octet-stream";
}

function getCadHostPath() {
  const base = app.isPackaged ? process.resourcesPath : path.join(__dirname, "..");
  return path.join(base, "cad-host", app.isPackaged ? "CadHost.exe" : path.join("publish", "CadHost.exe"));
}

function inspectCadDocument(filePath) {
  const executable = getCadHostPath();
  if (!fs.existsSync(executable)) return Promise.resolve(ipcError("CADHOST_NOT_BUILT"));
  return new Promise((resolve) => {
    execFile(executable, ["--inspect", filePath], { windowsHide: true, timeout: 120000, maxBuffer: 32 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) return resolve(ipcError("CADHOST_RENDER_FAILED", { message: stderr.trim() || error.message }));
      try { resolve({ success: true, document: JSON.parse(stdout) }); }
      catch (parseError) { resolve(ipcError("CADHOST_INVALID_DATA", { message: parseError.message })); }
    });
  });
}
function renderCadDocument(filePath) {
  const executable = getCadHostPath();
  if (!fs.existsSync(executable)) return Promise.resolve(ipcError("CADHOST_NOT_BUILT"));
  return new Promise((resolve) => {
    execFile(executable, ["--render-svg", filePath], { windowsHide: true, timeout: 120000, maxBuffer: 128 * 1024 * 1024, encoding: "buffer" }, (error, stdout, stderr) => {
      const decode = (value) => {
        try { return new TextDecoder("utf-8", { fatal: true }).decode(value); }
        catch { return new TextDecoder("gbk").decode(value); }
      };
      if (error) return resolve(ipcError("CADHOST_RENDER_FAILED", { message: decode(stderr).trim() || error.message }));
      resolve({ success: true, svg: decode(stdout) });
    });
  });
}
function findCadEngine() {
  const cadHost = getCadHostPath();
  if (fs.existsSync(cadHost)) {
    return {
      available: true, kind: "acadsharp", name: "ACadSharp 语义引擎", nameCode: "dwgEngineAcadSharp", executable: cadHost,
      capabilities: ["inspect", "read", "write", "layers", "blocks"], quality: "semantic", fallback: true,
      message: "DWG 语义由 ACadSharp 解析，画布暂由 LibreDWG 兼容渲染。",
      messageCode: "dwgEngineMessageAcadSharp",
    };
  }
  const explicit = process.env.OPENME_CAD_ENGINE;
  const candidates = [];
  if (explicit) candidates.push({ kind: "realdwg", name: "RealDWG Sidecar", nameCode: "dwgEngineRealDwg", executable: explicit, capabilities: ["read", "write", "layout", "font"] });

  const programFiles = [process.env.ProgramFiles, process.env["ProgramFiles(x86)"]].filter(Boolean);
  for (const root of programFiles) {
    candidates.push({ kind: "oda", name: "ODA File Converter", nameCode: "dwgEngineOda", executable: path.join(root, "ODA", "ODAFileConverter", "ODAFileConverter.exe"), capabilities: ["convert"] });
    const autodeskRoot = path.join(root, "Autodesk");
    try {
      for (const entry of fs.readdirSync(autodeskRoot, { withFileTypes: true })) {
        if (entry.isDirectory() && /^AutoCAD\s/i.test(entry.name)) {
          candidates.push({ kind: "autocad", name: `AutoCAD Core Console (${entry.name})`, nameCode: "dwgEngineAutocad", executable: path.join(autodeskRoot, entry.name, "accoreconsole.exe"), capabilities: ["read", "write", "script", "layout", "font"] });
        }
      }
    } catch {}
  }

  const engine = candidates.find((item) => fs.existsSync(item.executable));
  if (engine) return { available: true, ...engine, quality: "native", fallback: false };
  return {
    available: true,
    kind: "libredwg-web",
    name: "LibreDWG Web 兼容预览",
    nameCode: "dwgEngineLibreDwg",
    executable: null,
    capabilities: ["preview", "basic-entities"],
    quality: "compatibility",
    fallback: true,
    message: "未检测到 Autodesk/ODA 原生引擎，复杂实体、字体和布局可能不完整。",
    messageCode: "dwgEngineMessageLibreDwg",
  };
}
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 800,
    minHeight: 600,
    center: true,
    resizable: true,
    fullscreen: false,
    frame: false,
    titleBarStyle: "hidden",
    titleBarOverlay: false,
    title: "OpenMe Qiwu",
    icon: path.join(__dirname, "../public/icons/icon.ico"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      // OS-level renderer sandbox. Combined with contextIsolation: true
      // and nodeIntegration: false, the renderer cannot escape its
      // process even if a V8 vulnerability is exploited. The preload
      // script (preload.js) only uses contextBridge + ipcRenderer,
      // both of which are part of Electron's sandbox-safe subset.
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
  });

  hardenWebContents(mainWindow.webContents);

  log.info("Main window created");

  if (isDev) {
    mainWindow.loadURL(DEV_ORIGIN);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }


  mainWindow.on("close", (event) => {
    if (!hasUnsavedChanges) return;
    const choice = dialog.showMessageBoxSync(mainWindow, {
      type: "warning",
        title: uiStrings.closePromptTitle,
        message: uiStrings.closePromptMessage,
        detail: uiStrings.closePromptDetail,
        buttons: [uiStrings.closePromptKeepEditing, uiStrings.closePromptDiscard],
      defaultId: 0,
      cancelId: 0,
      noLink: true,
    });
    if (choice === 0) event.preventDefault();
    else hasUnsavedChanges = false;
  });
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  protocol.handle("openme-media", (request) => {
    const mediaPath = new URL(request.url).searchParams.get("path");
    if (!mediaPath || !fs.existsSync(mediaPath) || !fs.statSync(mediaPath).isFile()) return new Response("Not found", { status: 404 });
    return net.fetch(pathToFileURL(mediaPath).toString());
  });
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

ipcMain.handle("set-ui-strings", (_, strings) => {
  if (strings && typeof strings === "object") {
    uiStrings = { ...uiStrings, ...strings };
  }
});

ipcMain.handle("get-file-info", async (_, filePath) => {
  try {
    const stats = fs.statSync(filePath);
    const parsed = path.parse(filePath);
    const now = new Date().toISOString();
    return {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      path: filePath,
      name: parsed.base,
      extension: parsed.ext,
      size: stats.size,
      modified_at: stats.mtime.toISOString(),
      file_type: detectFileType(parsed.ext),
      opened_at: now,
    };
  } catch (e) {
    log.error("get-file-info failed", e);
    return ipcError("READ_FILE_FAILED", { message: e.message });
  }
});

ipcMain.handle("load-recent-files", async () => {
  try {
    const p = getRecentFilesPath();
    if (!fs.existsSync(p)) return { files: [], version: 1 };
    const content = fs.readFileSync(p, "utf-8");
    return JSON.parse(content);
  } catch (e) {
    log.warn("load-recent-files failed", e);
    return { files: [], version: 1 };
  }
});

ipcMain.handle("save-recent-files", async (_, store) => {
  try {
    const p = getRecentFilesPath();
    fs.writeFileSync(p, JSON.stringify(store, null, 2), "utf-8");
  } catch (e) {
    log.error("save-recent-files failed", e);
    return ipcError("SAVE_RECENT_FAILED", { message: e.message });
  }
});

ipcMain.handle("read-text-file", async (_, filePath, maxSize = 1024 * 500) => {
  try {
    const stats = fs.statSync(filePath);
    if (stats.size > maxSize) {
      return ipcError("TEXT_FILE_TOO_LARGE", { sizeBytes: stats.size });
    }
    return fs.readFileSync(filePath, "utf-8");
  } catch (e) {
    log.error("read-text-file failed", e);
    return ipcError("READ_TEXT_FAILED", { message: e.message });
  }
});

ipcMain.handle("read-file-content", async (_, filePath, maxSize = 10 * 1024 * 1024) => {
  try {
    const stats = fs.statSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const imageExts = [".png", ".jpg", ".jpeg", ".gif", ".bmp", ".webp", ".svg", ".pdf"];
    if (imageExts.includes(ext)) {
      if (stats.size > maxSize) {
        return ipcError("FILE_TOO_LARGE", { sizeMb: (stats.size / 1024 / 1024).toFixed(1) });
      }
      const buffer = fs.readFileSync(filePath);
      return { type: "binary", data: buffer.toString("base64"), mimeType: getMimeType(ext) };
    }
    if (stats.size > maxSize) {
      return ipcError("FILE_TOO_LARGE", { sizeMb: (stats.size / 1024 / 1024).toFixed(1) });
    }
    const content = fs.readFileSync(filePath, "utf-8");
    return { type: "text", data: content };
  } catch (e) {
    log.error("read-file-content failed", e);
    return ipcError("READ_FILE_CONTENT_FAILED", { message: e.message });
  }
});

ipcMain.handle("read-binary", async (_, filePath, maxSize = 10 * 1024 * 1024) => {
  try {
    const stats = fs.statSync(filePath);
    if (stats.size > maxSize) {
      return ipcError("FILE_TOO_LARGE", { sizeMb: (stats.size / 1024 / 1024).toFixed(1) });
    }
    const buffer = fs.readFileSync(filePath);
    return { success: true, data: buffer.toString("base64") };
  } catch (e) {
    log.error("read-binary failed", e);
    return ipcError("READ_BINARY_FAILED", { message: e.message });
  }
});

ipcMain.handle("save-file", async (_, filePath, content) => {
  try {
    fs.writeFileSync(filePath, content, "utf-8");
    return { success: true };
  } catch (e) {
    log.error("save-file failed", e);
    return ipcError("SAVE_FILE_FAILED", { message: e.message });
  }
});

ipcMain.handle("convert-docx", async (_, filePath) => {
  try {
    const mammoth = require("mammoth");
    const result = await mammoth.convertToHtml({ path: filePath });
    return { success: true, html: result.value };
  } catch (e) {
    log.error("convert-docx failed", e);
    return ipcError("CONVERT_DOCX_FAILED", { message: e.message });
  }
});

ipcMain.handle("convert-excel", async (_, filePath) => {
  try {
    const stats = await fs.promises.stat(filePath);
    if (stats.size > 50 * 1024 * 1024) return ipcError("EXCEL_TOO_LARGE");
    const { default: readWorkbook } = await import("read-excel-file/node");
    const workbook = await readWorkbook(filePath);
    const sheets = workbook.map(({ sheet, data }) => ({
      name: sheet,
      data: data.map((row) => row.map((cell) => cell == null ? "" : cell instanceof Date ? cell.toLocaleString("zh-CN") : String(cell))),
    }));
    return { success: true, sheets };
  } catch (e) {
    log.error("convert-excel failed", e);
    return ipcError("CONVERT_EXCEL_FAILED", { message: e.message });
  }
});

ipcMain.handle("open-file-dialog", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: uiStrings.dialogSelectFile,
    properties: ["openFile", "multiSelections"],
  });
  if (result.canceled) return [];
  return result.filePaths;
});

ipcMain.handle("open-in-system", async (_, filePath) => {
  try {
    await shell.openPath(filePath);
  } catch (e) {
    log.error("open-in-system failed", e);
    return ipcError("OPEN_IN_SYSTEM_FAILED", { message: e.message });
  }
});

function safeArchiveRelativePath(entryName) {
  const normalized = path.posix.normalize(String(entryName).replace(/\\/g, "/"));
  if (!normalized || normalized === "." || normalized.startsWith("../") || path.posix.isAbsolute(normalized)) return null;
  return normalized;
}

ipcMain.handle("list-zip-contents", async (_, filePath) => {
  try {
    const JSZip = require("jszip");
    const data = await fs.promises.readFile(filePath);
    const zip = await JSZip.loadAsync(data);
    const entries = Object.entries(zip.files).map(([name, file]) => ({
      name,
      isDir: file.dir,
      size: file._data?.uncompressedSize ?? 0,
      safe: Boolean(safeArchiveRelativePath(name)),
    }));
    const totalSize = entries.reduce((sum, entry) => sum + entry.size, 0);
    return { success: true, entries, totalSize };
  } catch (e) {
    log.error("list-zip-contents failed", e);
    return ipcError("READ_FILE_CONTENT_FAILED", { message: e.message });
  }
});

ipcMain.handle("unzip-file", async (_, filePath, targetDir) => {
  try {
    const JSZip = require("jszip");
    const data = await fs.promises.readFile(filePath);
    const zip = await JSZip.loadAsync(data);
    const archiveName = path.basename(filePath, path.extname(filePath));
    const destinationRoot = path.resolve(targetDir, archiveName);
    const files = Object.entries(zip.files);
    const totalSize = files.reduce((sum, [, file]) => sum + (file._data?.uncompressedSize ?? 0), 0);
    if (files.length > 100000) return ipcError("ZIP_TOO_MANY_FILES");
    if (totalSize > 2 * 1024 * 1024 * 1024) return ipcError("ZIP_TOO_LARGE");
    await fs.promises.mkdir(destinationRoot, { recursive: true });
    for (const [entryName, file] of files) {
      const relativePath = safeArchiveRelativePath(entryName);
      if (!relativePath) return ipcError("ZIP_UNSAFE_PATH", { entry: entryName });
      const destination = path.resolve(destinationRoot, ...relativePath.split("/"));
      if (destination !== destinationRoot && !destination.startsWith(destinationRoot + path.sep)) return ipcError("ZIP_PATH_TRAVERSAL", { entry: entryName });
      if (file.dir) await fs.promises.mkdir(destination, { recursive: true });
      else {
        await fs.promises.mkdir(path.dirname(destination), { recursive: true });
        await fs.promises.writeFile(destination, await file.async("nodebuffer"));
      }
    }
    return { success: true, destination: destinationRoot };
  } catch (e) {
    log.error("unzip-file failed", e);
    return ipcError("READ_FILE_CONTENT_FAILED", { message: e.message });
  }
});

ipcMain.handle("read-zip-entry", async (_, filePath, entryName) => {
  try {
    const JSZip = require("jszip");
    const data = await fs.promises.readFile(filePath);
    const zip = await JSZip.loadAsync(data);
    const file = zip.file(entryName);
    if (!file || file.dir) return ipcError("ZIP_ENTRY_NOT_FOUND");
    const size = file._data?.uncompressedSize ?? 0;
    if (size > 2 * 1024 * 1024) return ipcError("ZIP_ENTRY_TOO_LARGE");
    return { success: true, data: await file.async("base64") };
  } catch (e) {
    log.error("read-zip-entry failed", e);
    return ipcError("READ_FILE_CONTENT_FAILED", { message: e.message });
  }
});
ipcMain.handle("select-folder-dialog", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: uiStrings.dialogSelectFolder,
    properties: ["openDirectory", "createDirectory"],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

ipcMain.handle("get-cad-engine-status", () => findCadEngine());
ipcMain.handle("inspect-cad-document", (_, filePath) => inspectCadDocument(filePath));
ipcMain.handle("render-cad-document", (_, filePath) => renderCadDocument(filePath));

ipcMain.handle("get-media-url", async (_, filePath) => {
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) return ipcError("MEDIA_NOT_FOUND");
  return `openme-media://local/?path=${encodeURIComponent(resolved)}`;
});

ipcMain.handle("read-epub", async (_, filePath) => {
  try { return { success: true, book: await readEpub(filePath) }; }
  catch (e) {
    log.error("read-epub failed", e);
    if (e && e.code) return ipcError(e.code, e.params);
    return ipcError("READ_FILE_CONTENT_FAILED", { message: e.message });
  }
});
ipcMain.handle("get-app-version", () => app.getVersion());

ipcMain.handle("set-dirty-state", (_, dirty) => { hasUnsavedChanges = Boolean(dirty); });
ipcMain.handle("window-minimize", () => mainWindow?.minimize());
ipcMain.handle("window-maximize", () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize();
  else mainWindow?.maximize();
});
ipcMain.handle("window-close", () => mainWindow?.close());
ipcMain.handle("window-is-maximized", () => mainWindow?.isMaximized() ?? false);

function getAiConfigPath() {
  return path.join(app.getPath("userData"), "ai-config.json");
}

function readAiConfig() {
  const configPath = getAiConfigPath();
  if (!fs.existsSync(configPath)) return null;
  const stored = JSON.parse(fs.readFileSync(configPath, "utf8"));
  if (!stored.encryptedApiKey || !safeStorage.isEncryptionAvailable()) return null;
  return {
    apiKey: safeStorage.decryptString(Buffer.from(stored.encryptedApiKey, "base64")),
    model: stored.model || "gpt-5.4-mini",
    baseUrl: stored.baseUrl || "https://api.openai.com/v1",
  };
}

ipcMain.handle("get-ai-config", () => {
  try {
    const config = readAiConfig();
    return { configured: Boolean(config?.apiKey), model: config?.model || "gpt-5.4-mini", baseUrl: config?.baseUrl || "https://api.openai.com/v1" };
  } catch {
    return { configured: false, model: "gpt-5.4-mini", baseUrl: "https://api.openai.com/v1" };
  }
});

ipcMain.handle("save-ai-config", (_, input) => {
  try {
    if (!safeStorage.isEncryptionAvailable()) return ipcError("AI_NO_ENCRYPTION");
    const previous = readAiConfig();
    const apiKey = String(input?.apiKey || previous?.apiKey || "").trim();
    const model = String(input?.model || "gpt-5.4-mini").trim();
    const baseUrl = String(input?.baseUrl || "https://api.openai.com/v1").trim().replace(/\/$/, "");
    const parsedUrl = new URL(baseUrl);
    if (parsedUrl.protocol !== "https:" && parsedUrl.hostname !== "localhost" && parsedUrl.hostname !== "127.0.0.1") {
      return ipcError("AI_INVALID_URL");
    }
    if (!apiKey) return ipcError("AI_MISSING_KEY");
    const payload = { encryptedApiKey: safeStorage.encryptString(apiKey).toString("base64"), model, baseUrl };
    fs.writeFileSync(getAiConfigPath(), JSON.stringify(payload, null, 2), { encoding: "utf8", mode: 0o600 });
    return { success: true };
  } catch (error) {
    log.error("save-ai-config failed", error);
    return ipcError("READ_FILE_CONTENT_FAILED", { message: error.message });
  }
});

const cadPlanSchema = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "risk_level", "requires_confirmation", "needs_clarification", "clarification_question", "operations"],
  properties: {
    summary: { type: "string" },
    risk_level: { type: "string", enum: ["read_only", "reversible", "destructive"] },
    requires_confirmation: { type: "boolean" },
    needs_clarification: { type: "boolean" },
    clarification_question: { type: ["string", "null"] },
    operations: { type: "array", items: {
      type: "object", additionalProperties: false,
      required: ["id", "action", "target", "layer", "x", "y", "x2", "y2", "radius", "angle", "scale", "text", "reason"],
      properties: {
        id: { type: "string" },
        action: { type: "string", enum: ["inspect", "select", "create_line", "create_circle", "create_arc", "create_polyline", "create_text", "move", "rotate", "scale", "delete", "set_layer", "create_layer"] },
        target: { type: ["string", "null"] }, layer: { type: ["string", "null"] },
        x: { type: ["number", "null"] }, y: { type: ["number", "null"] }, x2: { type: ["number", "null"] }, y2: { type: ["number", "null"] },
        radius: { type: ["number", "null"] }, angle: { type: ["number", "null"] }, scale: { type: ["number", "null"] }, text: { type: ["string", "null"] },
        reason: { type: "string" }
      }
    }}
  }
};

ipcMain.handle("plan-cad-change", async (_, input) => {
  try {
    const config = readAiConfig();
    if (!config?.apiKey) return ipcError("AI_NOT_CONFIGURED");
    const request = String(input?.request || "").trim();
    if (!request) return ipcError("AI_EMPTY_REQUEST");
    const response = await fetch(`${config.baseUrl}/responses`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: config.model,
        reasoning: { effort: "medium" },
        instructions: "你是谨慎的 CAD 工程师。把中文修改要求转换成最小、可验证的 CAD 操作计划。不得猜测图纸中不存在的实体、坐标、图层或尺寸；信息不足时设置 needs_clarification=true。删除或不可逆覆盖必须标记 destructive。只返回符合 schema 的 JSON。",
        input: `文件：${String(input?.fileName || "未知")}\n路径仅供标识：${String(input?.filePath || "")}\n用户要求：${request}`,
        text: { format: { type: "json_schema", name: "cad_change_plan", strict: true, schema: cadPlanSchema } }
      })
    });
    const body = await response.json();
    if (!response.ok) return ipcError("AI_REQUEST_FAILED", { status: response.status, message: body?.error?.message || "" });
    const outputText = body.output?.flatMap((item) => item.content || []).find((content) => content.type === "output_text")?.text;
    if (!outputText) return ipcError("AI_NO_PLAN");
    return { success: true, plan: JSON.parse(outputText) };
  } catch (error) {
    log.error("plan-cad-change failed", error);
    return ipcError("AI_REQUEST_FAILED", { status: 0, message: error.message });
  }
});
