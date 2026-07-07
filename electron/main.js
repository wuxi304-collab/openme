const { app, BrowserWindow, ipcMain, dialog, shell, safeStorage, protocol, net } = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");
const { execFile } = require("child_process");
const { pathToFileURL } = require("url");
const { readEpub } = require("./epub");

// Allow managed environments to place Chromium state in an explicitly writable directory.
if (process.env.OPENME_USER_DATA_DIR) {
  app.setPath("userData", path.resolve(process.env.OPENME_USER_DATA_DIR));
}

app.setAppUserModelId("com.openme.desktop");
protocol.registerSchemesAsPrivileged([{ scheme: "openme-media", privileges: { standard: true, secure: true, stream: true, supportFetchAPI: true } }]);

let mainWindow = null;
let hasUnsavedChanges = false;

const isDev = !app.isPackaged && process.env.OPENME_USE_DIST !== "1";

function getRecentFilesPath() {
  const appDir = path.join(app.getPath("userData"));
  if (!fs.existsSync(appDir)) fs.mkdirSync(appDir, { recursive: true });
  return path.join(appDir, "recent-files.json");
}

function detectFileType(extension) {
  const ext = extension.toLowerCase();
  const map = {
    ".pdf": "pdf",
    ".png": "image", ".jpg": "image", ".jpeg": "image", ".gif": "image", ".bmp": "image", ".webp": "image", ".avif": "image", ".ico": "image", ".tif": "image", ".tiff": "image", ".svg": "image",
    ".txt": "text", ".md": "text", ".json": "text", ".csv": "text", ".xml": "text", ".yml": "text", ".yaml": "text", ".ini": "text", ".log": "text",
    ".js": "code", ".ts": "code", ".jsx": "code", ".tsx": "code", ".py": "code", ".rs": "code", ".go": "code", ".java": "code", ".c": "code", ".cpp": "code", ".h": "code", ".css": "code", ".html": "code",
    ".doc": "document", ".docx": "document", ".xls": "document", ".xlsx": "document", ".ppt": "document", ".pptx": "document",
    ".zip": "archive",
    ".epub": "epub",
    ".mp3": "audio", ".wav": "audio", ".ogg": "audio", ".oga": "audio", ".m4a": "audio", ".aac": "audio", ".flac": "audio", ".opus": "audio", ".weba": "audio", ".aiff": "audio", ".aif": "audio", ".wma": "audio",
    ".mp4": "video", ".webm": "video", ".ogv": "video", ".m4v": "video", ".mov": "video", ".mkv": "video", ".avi": "video", ".wmv": "video", ".flv": "video", ".3gp": "video", ".3g2": "video", ".ts": "video", ".mts": "video", ".m2ts": "video",
    ".ttf": "font", ".otf": "font", ".woff": "font", ".woff2": "font",
  };
  return map[ext] || "other";
}

function getMimeType(ext) {
  const map = {
    ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
    ".gif": "image/gif", ".bmp": "image/bmp", ".webp": "image/webp", ".avif": "image/avif", ".ico": "image/x-icon", ".tif": "image/tiff", ".tiff": "image/tiff",
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
  if (!fs.existsSync(executable)) return Promise.resolve({ success: false, message: "ACadSharp CadHost 尚未构建" });
  return new Promise((resolve) => {
    execFile(executable, ["--inspect", filePath], { windowsHide: true, timeout: 120000, maxBuffer: 32 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) return resolve({ success: false, message: stderr.trim() || error.message });
      try { resolve({ success: true, document: JSON.parse(stdout) }); }
      catch (parseError) { resolve({ success: false, message: `CadHost 返回无效数据: ${parseError.message}` }); }
    });
  });
}
function renderCadDocument(filePath) {
  const executable = getCadHostPath();
  if (!fs.existsSync(executable)) return Promise.resolve({ success: false, message: "ACadSharp CadHost 尚未构建" });
  return new Promise((resolve) => {
    execFile(executable, ["--render-svg", filePath], { windowsHide: true, timeout: 120000, maxBuffer: 128 * 1024 * 1024, encoding: "buffer" }, (error, stdout, stderr) => {
      const decode = (value) => {
        try { return new TextDecoder("utf-8", { fatal: true }).decode(value); }
        catch { return new TextDecoder("gbk").decode(value); }
      };
      if (error) return resolve({ success: false, message: decode(stderr).trim() || error.message });
      resolve({ success: true, svg: decode(stdout) });
    });
  });
}
function findCadEngine() {
  const cadHost = getCadHostPath();
  if (fs.existsSync(cadHost)) {
    return {
      available: true, kind: "acadsharp", name: "ACadSharp 语义引擎", executable: cadHost,
      capabilities: ["inspect", "read", "write", "layers", "blocks"], quality: "semantic", fallback: true,
      message: "DWG 语义由 ACadSharp 解析，画布暂由 LibreDWG 兼容渲染。"
    };
  }
  const explicit = process.env.OPENME_CAD_ENGINE;
  const candidates = [];
  if (explicit) candidates.push({ kind: "realdwg", name: "RealDWG Sidecar", executable: explicit, capabilities: ["read", "write", "layout", "font"] });

  const programFiles = [process.env.ProgramFiles, process.env["ProgramFiles(x86)"]].filter(Boolean);
  for (const root of programFiles) {
    candidates.push({ kind: "oda", name: "ODA File Converter", executable: path.join(root, "ODA", "ODAFileConverter", "ODAFileConverter.exe"), capabilities: ["convert"] });
    const autodeskRoot = path.join(root, "Autodesk");
    try {
      for (const entry of fs.readdirSync(autodeskRoot, { withFileTypes: true })) {
        if (entry.isDirectory() && /^AutoCAD\s/i.test(entry.name)) {
          candidates.push({ kind: "autocad", name: `AutoCAD Core Console (${entry.name})`, executable: path.join(autodeskRoot, entry.name, "accoreconsole.exe"), capabilities: ["read", "write", "script", "layout", "font"] });
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
    executable: null,
    capabilities: ["preview", "basic-entities"],
    quality: "compatibility",
    fallback: true,
    message: "未检测到 Autodesk/ODA 原生引擎，复杂实体、字体和布局可能不完整。",
  };
}