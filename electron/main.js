const { app, BrowserWindow, ipcMain, dialog, shell, safeStorage, protocol, net } = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");
const log = require("electron-log");
const { execFile } = require("child_process");
const { pathToFileURL } = require("url");
const { readEpub } = require("./epub");
const { ipcError } = require("./ipcErrors");
const mm = require("music-metadata");
const audioFfmpeg = require("./audioFfmpeg");

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

// ---------------------------------------------------------------------------
// One-click launch support
// ---------------------------------------------------------------------------
//
// Goal: make `OpenMe.exe <file1> <file2> ...` Just Work, both when the app
// is starting cold and when another instance is already running.
//
// Behaviour:
//   * Single-instance lock. If another instance owns the lock, we hand off
//     our argv to it via `second-instance` and quit immediately.
//   * Parse argv on cold start too. Real file paths get buffered and
//     forwarded to the renderer once the main window is ready.
//   * macOS `open-file` event is also wired — double-clicking a file in
//     Finder hits this path, not argv.
//
// Why a buffer and not fire-and-forget: on cold start the renderer isn't
// mounted yet; if we send an IPC the renderer hasn't registered its
// `openme:initial-files` listener for and the files vanish silently.
let pendingFilePaths = [];
let mainReady = false;

// Module-scope set of flags that consume their next token as their value.
// Browser/Electron CLI flags are listed here; add a new one whenever a
// stray "value" shows up that we'd otherwise try to open as a file. Tests
// in argvFiles.test.js exercise the consumer-skip logic against synthetic
// argv payloads.
const SWITCH_TAKES_VALUE = new Set([
  "--source-app-id",
  "--app-user-model-id",
  "--session-data-dir",
  "--user-data-dir",
  "--log-file",
  "--remote-debugging-port",
  "--inspect-port",
  "--inspect",
  "--js-flags",
  "--crash-dumps-dir",
  "--user-agent",
  "--disk-cache-dir",
]);

function extractFilePathsFromArgv(argv) {
  if (!Array.isArray(argv)) return [];
  const out = [];
  // Electron (and Chromium it embeds) stuff many switches into argv that
  // *consume the next token as their value* (e.g. `--source-app-id 1234`).
  // If we treat that consumed token as a file path, we'd try to open a
  // random hex string. The SWITCH_TAKES_VALUE list above lets us skip
  // their values before they're considered for "is this a file?".
  for (let i = 1; i < argv.length; i++) {
    const arg = argv[i];
    if (typeof arg !== "string") continue;
    if (!arg.startsWith("-")) {
      try {
        if (fs.existsSync(arg) && fs.statSync(arg).isFile()) {
          out.push(path.resolve(arg));
        }
      } catch (_) { /* ignore unreadable entries */ }
      continue;
    }
    // This is a flag. Detect consumer form: no `=` AND the bare flag is
    // known to consume the next token. Pre-bump i so the for-loop's
    // natural i++ lands us on the token AFTER the consumer value.
    const equalsIdx = arg.indexOf("=");
    const bare = equalsIdx >= 0 ? arg.slice(0, equalsIdx) : arg;
    if (equalsIdx < 0 && SWITCH_TAKES_VALUE.has(bare)) {
      i += 1;
    }
  }
  return out;
}

// Collect argv ASAP so we don't miss files provided during cold start.
pendingFilePaths = extractFilePathsFromArgv(process.argv);
log.info("main: argv file paths captured", { count: pendingFilePaths.length, paths: pendingFilePaths });

// Single-instance lock. If we can't acquire it, another OpenMe is running
// and Electron will emit `second-instance` on it with our argv. We quit
// so the running instance takes over.
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  log.info("main: another instance owns the lock — handing off argv and quitting");
  app.quit();
} else {
  app.on("second-instance", (_event, argv /* argv of the new instance */, _cwd) => {
    log.info("main: second-instance forwarded", { argv });
    const forwarded = extractFilePathsFromArgv(argv);
    if (mainWindow && !mainWindow.isDestroyed()) {
      // Bring the existing window forward.
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
      if (forwarded.length > 0) {
        mainWindow.webContents.send("openme:initial-files", forwarded);
      }
    } else if (forwarded.length > 0) {
      // Window isn't up yet — buffer the paths so when createWindow()
      // finishes the renderer will receive them on its initial-files
      // listener.
      pendingFilePaths = pendingFilePaths.concat(forwarded);
      log.info("main: buffered forwarded paths for renderer", { count: pendingFilePaths.length });
    }
  });
}

// macOS-specific: Finder double-click delivers files via `open-file`.
app.on("will-finish-launching", () => {
  app.on("open-file", (event, filePath) => {
    event.preventDefault();
    log.info("main: open-file event", { filePath });
    if (typeof filePath !== "string") return;
    if (mainWindow && !mainWindow.isDestroyed() && mainReady) {
      mainWindow.webContents.send("openme:initial-files", [filePath]);
    } else {
      pendingFilePaths.push(filePath);
    }
  });
});

function flushPendingFilePaths() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (pendingFilePaths.length === 0) return;
  const payload = pendingFilePaths.slice();
  pendingFilePaths = [];
  log.info("main: flushing pending file paths to renderer", { count: payload.length });
  mainWindow.webContents.send("openme:initial-files", payload);
}

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
let splashWindow = null;
let hasUnsavedChanges = false;
let splashClosed = false;
let mainShown = false;
let splashAdvanceGuard = false;

// Localized strings pushed from the renderer on mount (and whenever the user
// switches language). Main process uses these for native dialogs that the OS
// renders — file picker title, unzip destination title, and the unsaved-changes
// close prompt. Falls back to Chinese defaults when the renderer hasn't pushed
// any values yet (cold start).
let uiLang = "zh";
let uiStrings = {
  dialogSelectFile: "选择文件",
  dialogSelectFolder: "选择解压目标文件夹",
  closePromptTitle: "还有未保存修改",
  closePromptMessage: "关闭 OpenMe Qiwu？",
  closePromptDetail: "未保存的文本、代码或 Markdown 修改将丢失。",
  closePromptKeepEditing: "继续编辑",
  closePromptDiscard: "放弃并关闭",
  settingsExportDialogTitle: "导出设置",
  settingsImportDialogTitle: "导入设置",
};

const isDev = !app.isPackaged && process.env.OPENME_USE_DIST !== "1";
const DEV_ORIGIN = "http://localhost:1420";

function buildContentSecurityPolicy() {
  // Dev allowance: Vite HMR / react-refresh inject inline scripts and rely on
  // eval-based module evaluation, so we have to grant 'unsafe-inline' +
  // 'unsafe-eval' to script-src. We *narrow* it with a host allow-list so a
  // future injection of remote scripts would still be blocked. Production
  // CSP keeps 'self' only — see electron-builder release config.
  const scriptSrc = isDev
    ? "'self' 'unsafe-inline' 'unsafe-eval' http://localhost:1420"
    : "'self'";
  const connectSrc = isDev
    ? "'self' http://localhost:1420 ws://localhost:1420 openme-media:"
    : "'self' openme-media:";
  // stylesheet links from googleapis + woff2 binaries from gstatic.
  // Pulled from src/index.css which @imports the Catamaran + JetBrains Mono
  // families for the Mario landing page. Without these hosts the landing
  // background hero silently falls back to sans-serif in dev.
  const styleSrc = isDev
    ? "'self' 'unsafe-inline' https://fonts.googleapis.com"
    : "'self' 'unsafe-inline'";
  const fontSrc = isDev
    ? "'self' data: https://fonts.gstatic.com"
    : "'self' data:";
  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    `style-src ${styleSrc}`,
    "style-src-elem " + (isDev ? "'self' 'unsafe-inline' https://fonts.googleapis.com" : "'self' 'unsafe-inline'"),
    "img-src 'self' data: blob: openme-media:",
    `font-src ${fontSrc}`,
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

    // Splash lifecycle — see electron/splash/splash.html. The splash is a
    // separate, frameless, always-on-top BrowserWindow that loads its own
    // static HTML. It survives until `hideSplash()` is called by the main
    // window's `ready-to-show` event (or 8s safety timeout if main never
    // reports ready — desktop cold start + first bundle parse can be slow).
    function createSplashWindow() {
      if (splashWindow && !splashWindow.isDestroyed()) return splashWindow;
      splashWindow = new BrowserWindow({
        width: 420,
        height: 320,
        center: true,
        resizable: false,
        movable: false,
        minimizable: false,
        maximizable: false,
        fullscreenable: false,
        frame: false,
        transparent: false,
        backgroundColor: "#0e0d0b",
        alwaysOnTop: true,
        skipTaskbar: true,
        show: false,
        title: "OpenMe Qiwu",
        icon: path.join(__dirname, "../public/icons/icon.ico"),
        webPreferences: {
          preload: path.join(__dirname, "splash-preload.js"),
          contextIsolation: true,
          nodeIntegration: false,
          sandbox: true,
          webSecurity: true,
        },
      });
      splashWindow.removeMenu();
      // Render from filesystem so it works identically in dev (file://) and
      // packaged (asar). The splash directory ships as part of
      // `electron/**/*` (see package.json `build.files`).
      const splashHtml = path.join(__dirname, "splash", "splash.html");
      splashWindow.loadFile(splashHtml);
      splashWindow.once("ready-to-show", () => {
              if (splashWindow && !splashWindow.isDestroyed()) {
                splashWindow.show();
                splashFirstShownAt = Date.now();
              }
            });
      splashWindow.on("closed", () => {
        splashWindow = null;
        splashClosed = true;
      });
      return splashWindow;
    }

    function emitSplashInit() {
      if (!splashWindow || splashWindow.isDestroyed()) return;
          try {
            splashWindow.webContents.send("splash:init", {
              version: app.getVersion(),
              lang: uiLang,
            });
          } catch {
            /* ignore — webContents may already be gone */
          }
        }

            function emitSplashProgress(percent, phase, sublabel) {
          if (!splashWindow || splashWindow.isDestroyed()) return;
              const elapsedMs = splashFirstShownAt > 0 ? Date.now() - splashFirstShownAt : 0;
              try {
                splashWindow.webContents.send("splash:progress", {
                  percent,
                  phase,
                  lang: uiLang,
                  sublabel: typeof sublabel === "string" ? sublabel : undefined,
                  elapsedMs,
                });
              } catch {
                /* ignore — webContents may already be gone */
              }
            }

            // Granular sublabel updates without a phase advance — used to show
            // "loading PDF.js" / "mounting recent files" while the percent stays
            // pegged to the current phase.
            function emitSplashSublabel(text) {
              if (!splashWindow || splashWindow.isDestroyed()) return;
              if (typeof text !== "string") return;
              try {
                splashWindow.webContents.send("splash:sublabel", text);
              } catch {
                /* ignore — renderer may be gone */
              }
            }

            // Lightweight metric ticker — keeps the elapsed chip fresh every
            // animation frame without going through the full progress payload.
            let splashMetricTimer = null;
            function startSplashMetricTicker() {
              if (splashMetricTimer || !splashWindow || splashWindow.isDestroyed()) return;
              const tick = () => {
                if (!splashWindow || splashWindow.isDestroyed()) {
                  splashMetricTimer = null;
                  return;
                }
                const elapsedMs = splashFirstShownAt > 0 ? Date.now() - splashFirstShownAt : 0;
                try {
                  splashWindow.webContents.send("splash:metric", { elapsedMs });
                } catch {
                  /* ignore */
                }
                splashMetricTimer = setTimeout(tick, 200);
              };
              splashMetricTimer = setTimeout(tick, 200);
            }
            function stopSplashMetricTicker() {
              if (splashMetricTimer) {
                clearTimeout(splashMetricTimer);
                splashMetricTimer = null;
              }
            }

        function emitSplashLangChange() {
          if (!splashWindow || splashWindow.isDestroyed()) return;
          try {
            splashWindow.webContents.send("splash:lang", { lang: uiLang });
          } catch {
            /* ignore — webContents may already be gone */
          }
        }

        // Phase timing constants — see PR #95. Splash phases advance on a fixed
        // schedule so users always see motion during cold start; lifecycle hooks
        // (dom-ready / ready-to-show) bump us into later phases earlier when the
        // renderer is actually ready. Per-phase dwell ensures each label is
        // readable even on fast machines.
        const SPLASH_PHASE_BOOT_MS = 320;
        const SPLASH_PHASE_RENDERER_MS = 360;
        const SPLASH_PHASE_ASSETS_MS = 260;
        const SPLASH_PHASE_FADE_MS = 220;
        const SPLASH_BOOT_PCT = 15;
        const SPLASH_RENDERER_PCT = 45;
        const SPLASH_ASSETS_PCT = 80;
        const SPLASH_READY_PCT = 98;
        const SPLASH_DONE_PCT = 100;
                // Hold the splash for at least this long once it has appeared, so
                // the user always sees the brand surface even on fast machines.
                // 800ms is long enough to read the tagline + phase label but short
                // enough to feel snappy. Without this, fast hardware dismisses the
                // splash in ~250ms and the user perceives a black flash instead.
                const SPLASH_MIN_VISIBLE_MS = 800;
                let splashFirstShownAt = 0;

        function scheduleSplashTimeline() {
          // Phase 1 — engine (immediately). User has visual feedback the moment
          // we have a splash surface on screen.
          emitSplashProgress(SPLASH_BOOT_PCT, "splashPhaseBoot");
                  startSplashMetricTicker();
                  // Phase 2 — interface. After a short dwell, kick off the main window
                  // creation. We schedule createWindow here so the boot phase is always
                  // visible, even on machines where renderer loading is sub-200ms.
                  setTimeout(() => {
                    if (splashClosed) return;
                    emitSplashProgress(SPLASH_RENDERER_PCT, "splashPhaseRenderer");
                  }, SPLASH_PHASE_BOOT_MS);
                }

    function hideSplash() {
      if (!splashWindow || splashWindow.isDestroyed()) return;
              // Minimum-visible-time gate — hold the splash until the user has
              // had at least SPLASH_MIN_VISIBLE_MS to read the brand surface,
              // regardless of how fast the renderer finished loading. Without
              // this gate the splash disappears in a flicker on fast machines.
              const elapsed = splashFirstShownAt > 0 ? Date.now() - splashFirstShownAt : 0;
              const remaining = Math.max(0, SPLASH_MIN_VISIBLE_MS - elapsed);
              // Tell the splash renderer to fade itself out before we destroy it.
              // The CSS `.splash.is-fading` rule animates opacity to 0 over
              // SPLASH_PHASE_FADE_MS. If the splash webContents is already gone
              // (e.g. window-all-closed raced), we just destroy synchronously.
              const startFade = () => {
                try {
                  splashWindow.webContents.send("splash:fade");
                } catch {
                  /* ignore — renderer may be gone */
                }
                try {
                  splashWindow.hide();
                } catch {
                  /* ignore — window already gone */
                }
                // Give the main window a frame to paint before destroying the splash
                // so the user never sees a gap between splash-hide and main-show.
                setTimeout(() => {
                  if (splashWindow && !splashWindow.isDestroyed()) splashWindow.destroy();
                }, 240);
              };
              if (remaining > 0) setTimeout(startFade, remaining);
              else startFade();
                            // Stop the metric ticker now that we're committing to fade-out.
                            // The elapsed chip will freeze on its last value as the splash
                            // animates away.
                            stopSplashMetricTicker();
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
        // backgroundColor prevents the white flash before React mounts.
        backgroundColor: "#0e0d0b",
        show: false,
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
          spellcheck: false,
          backgroundThrottling: false,
        },
      });

      hardenWebContents(mainWindow.webContents);

      log.info("Main window created");

            // dom-ready fires when the renderer's document has finished parsing
            // (HTML loaded, scripts resolved). This is roughly the "renderer
            // connected" milestone — splash advances to "preparing assets".
            mainWindow.webContents.once("dom-ready", () => {
              if (splashClosed) return;
              // Throttle: if we're still in the boot/renderer phases, advance
              // through to assets immediately; otherwise just bump the percent.
              emitSplashProgress(SPLASH_ASSETS_PCT, "splashPhaseAssets");
              log.info("Main window dom-ready");
            });

            // ready-to-show fires once the renderer has produced its first real
            // frame. Showing before this causes a white / blank flash. We swap
            // splash → main here so the user sees a single continuous transition.
            mainWindow.once("ready-to-show", () => {
              if (!mainWindow || mainWindow.isDestroyed()) return;
              mainShown = true;
              mainWindow.show();
              log.info("Main window ready-to-show");
              // Splash "ready" → fade out → destroy. Hold the splash for the
              // configured dwell so users actually see the "almost there" label
              // even on a fast machine, then fade smoothly into the main window.
              if (!splashClosed) {
                emitSplashProgress(SPLASH_READY_PCT, "splashPhaseReady");
                setTimeout(() => {
                  if (splashClosed) return;
                  emitSplashProgress(SPLASH_DONE_PCT, "splashPhaseReady");
                  // Slight delay so the progress fill visually reaches 100% before
                  // we fade the splash away.
                  setTimeout(() => hideSplash(), SPLASH_PHASE_FADE_MS);
                }, SPLASH_PHASE_ASSETS_MS);
              }
            });

            // Hard ceiling: if the renderer never reports ready-to-show (e.g. JS
            // crash), still show the window after 8s so the user can see an error
            // surface or close it manually instead of staring at a frozen splash.
            setTimeout(() => {
              if (!mainShown && mainWindow && !mainWindow.isDestroyed()) {
                log.warn("ready-to-show timed out — forcing main window visible");
                mainShown = true;
                mainWindow.show();
                hideSplash();
              }
            }, 8000);

      if (isDev) {
        mainWindow.loadURL(DEV_ORIGIN);
        mainWindow.webContents.openDevTools();
      } else {
        mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
      }

            // Wire main-window webContents lifecycle events to splash sublabel
            // updates so the user sees real movement beyond the static timeline.
            // "did-start-loading" fires when the renderer begins a top-level
            // navigation (cold start or reload). "did-finish-load" fires when the
            // page has finished loading all sub-resources.
            if (!isDev) {
              mainWindow.webContents.on("did-start-loading", () => {
                if (splashClosed || !splashWindow || splashWindow.isDestroyed()) return;
                emitSplashSublabel(uiLang === "en" ? "Loading application bundle…" : "正在加载应用资源…");
              });
              mainWindow.webContents.on("did-finish-load", () => {
                if (splashClosed || !splashWindow || splashWindow.isDestroyed()) return;
                emitSplashSublabel(uiLang === "en" ? "Application bundle loaded" : "应用资源已加载");
                // The renderer has finished its initial navigation. Now
                // it's safe to flush any buffered CLI argv paths to its
                // `openme:initial-files` listener.
                mainReady = true;
                flushPendingFilePaths();
              });
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
  // Spawn the splash FIRST so the user has immediate visual feedback
  // before the main window's renderer even starts loading the bundle.
  createSplashWindow();
  emitSplashInit();
  scheduleSplashTimeline();
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createSplashWindow();
      emitSplashInit();
      scheduleSplashTimeline();
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// Renderer-side milestone channel. The renderer pushes fine-grained
// progress ("settings hydrated", "viewer registry ready", etc.) and we
// relay it to the splash as a sublabel update. We do NOT advance the
// percent from here; that's the lifecycle's job. The guard prevents the
// renderer from running away with sublabel spam during long loads — at
// most one update per 80ms.
let lastMilestoneAt = 0;
ipcMain.on("app:startup-milestone", (event, payload) => {
  if (splashClosed || !splashWindow || splashWindow.isDestroyed()) return;
  if (!event.sender || event.sender.isDestroyed()) return;
  const now = Date.now();
  if (now - lastMilestoneAt < 80) return;
  lastMilestoneAt = now;
  const text = payload && typeof payload.sublabel === "string" ? payload.sublabel : "";
  emitSplashSublabel(text);
});

ipcMain.handle("set-ui-strings", (_, strings) => {
  if (strings && typeof strings === "object") {
    if (typeof strings.lang === "string" && (strings.lang === "zh" || strings.lang === "en")) {
      uiLang = strings.lang;
      emitSplashLangChange();
    }
    // Strip the meta `lang` field before merging into uiStrings — it's not a
    // dialog string, just a hint we use for splash localization.
    const { lang: _lang, ...rest } = strings;
    uiStrings = { ...uiStrings, ...rest };
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

ipcMain.handle("export-settings-to-file", async (_, payload, defaultName) => {
  try {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: uiStrings.settingsExportDialogTitle,
      defaultPath: defaultName || "openme-settings.json",
      filters: [{ name: "JSON", extensions: ["json"] }],
    });
    if (result.canceled || !result.filePath) return { ok: false, canceled: true };
    fs.writeFileSync(result.filePath, JSON.stringify(payload, null, 2), "utf-8");
    return { ok: true, path: result.filePath };
  } catch (e) {
    log.error("export-settings-to-file failed", e);
    return ipcError("SETTINGS_EXPORT_FAILED", { message: e.message });
  }
});

ipcMain.handle("import-settings-from-file", async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: uiStrings.settingsImportDialogTitle,
      properties: ["openFile"],
      filters: [{ name: "JSON", extensions: ["json"] }, { name: "All", extensions: ["*"] }],
    });
    if (result.canceled || result.filePaths.length === 0) return { ok: false, canceled: true };
    const filePath = result.filePaths[0];
    const raw = fs.readFileSync(filePath, "utf-8");
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (parseError) {
      return ipcError("SETTINGS_IMPORT_INVALID_JSON", { message: parseError.message });
    }
    return { ok: true, path: filePath, data: parsed };
  } catch (e) {
    log.error("import-settings-from-file failed", e);
    return ipcError("SETTINGS_IMPORT_FAILED", { message: e.message });
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

// Reveal a file in the host file manager (Explorer / Finder / Nautilus).
// Returns `{ ok: true, revealed: true }` on success or IpcFailure so the
// renderer can surface a toast without crashing the panel.
ipcMain.handle("reveal-in-folder", async (_, filePath) => {
  try {
    if (!filePath || typeof filePath !== "string") return ipcError("FILE_NOT_FOUND");
    if (!fs.existsSync(filePath)) return ipcError("FILE_NOT_FOUND");
    shell.showItemInFolder(filePath);
    return { ok: true, revealed: true };
  } catch (e) {
    log.error("reveal-in-folder failed", e);
    return ipcError("REVEAL_IN_FOLDER_FAILED", { message: e.message });
  }
});

// Report the user-data directory where local settings, recent-files list
// and the error-log directory live. Used by the Settings dialog to render
// a "Settings file: <path>" disclosure with a Reveal-in-folder action.
ipcMain.handle("get-settings-storage-path", async () => {
  try {
    return { ok: true, path: app.getPath("userData") };
  } catch (e) {
    log.error("get-settings-storage-path failed", e);
    return ipcError("GET_SETTINGS_STORAGE_PATH_FAILED", { message: e.message });
  }
});

// Stream-hash a file with SHA-256 and return the first 64 hex chars plus
// the byte size so the panel can show "fingerprint" + "bytes". Uses a
// 1 MiB chunk size to stay responsive on multi-GB inputs.
ipcMain.handle("get-file-hash", async (_, filePath) => {
  try {
    if (!filePath || typeof filePath !== "string") return ipcError("FILE_NOT_FOUND");
    if (!fs.existsSync(filePath)) return ipcError("FILE_NOT_FOUND");
    const stats = fs.statSync(filePath);
    const crypto = require("crypto");
    const hash = crypto.createHash("sha256");
    const stream = fs.createReadStream(filePath, { highWaterMark: 1024 * 1024 });
    await new Promise((resolve, reject) => {
      stream.on("data", (chunk) => hash.update(chunk));
      stream.on("end", resolve);
      stream.on("error", reject);
    });
    const full = hash.digest("hex");
    return {
      ok: true,
      algorithm: "sha256",
      hash: full,
      shortHash: full.slice(0, 16),
      size: stats.size,
      computedAt: new Date().toISOString(),
    };
  } catch (e) {
    log.error("get-file-hash failed", e);
    return ipcError("FILE_HASH_FAILED", { message: e.message });
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

// Read tag + technical metadata for a single audio file. Returns a plain
// JSON object the renderer can hand to the lossless player; cover art is
// inlined as a data: URL so we never need a second IPC round trip.
// music-metadata is pure-JS and supports FLAC, WAV (RIFF INFO), AIFF,
// Vorbis comments, ID3v2, DSF (DSDIFF) and more.
ipcMain.handle("get-audio-metadata", async (_, filePath) => {
  try {
    const resolved = path.resolve(filePath);
    if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
      return ipcError("MEDIA_NOT_FOUND");
    }
    const meta = await mm.parseFile(resolved, { duration: true, skipCovers: false });
    const { common = {}, format = {} } = meta;
    const cover = (common.picture && common.picture[0]) || null;
    return {
      ok: true,
      path: resolved,
      tag: {
        title: common.title || null,
        artist: common.artist || null,
        album: common.album || null,
        albumArtist: common.albumartist || null,
        year: typeof common.year === "number" ? common.year : null,
        genre: Array.isArray(common.genre) ? common.genre[0] || null : (common.genre || null),
        track: typeof common.track?.no === "number" ? common.track.no : null,
        trackTotal: typeof common.track?.of === "number" ? common.track.of : null,
        disc: typeof common.disk?.no === "number" ? common.disk.no : null,
        discTotal: typeof common.disk?.of === "number" ? common.disk.of : null,
        composer: common.composer || null,
        comment: Array.isArray(common.comment) ? common.comment[0] || null : (common.comment || null),
      },
      format: {
        container: format.container || null,
        codec: format.codec || format.codecProfile || null,
        lossless: typeof format.lossless === "boolean" ? format.lossless : null,
        sampleRate: typeof format.sampleRate === "number" ? format.sampleRate : null,
        bitsPerSample: typeof format.bitsPerSample === "number" ? format.bitsPerSample : null,
        channels: typeof format.numberOfChannels === "number" ? format.numberOfChannels : null,
        channelLayout: format.numberOfChannels === 1 ? "mono" : format.numberOfChannels === 2 ? "stereo" : (format.numberOfChannels > 2 ? "surround" : null),
        bitrate: typeof format.bitrate === "number" ? Math.round(format.bitrate) : null,
        durationSec: typeof format.duration === "number" ? format.duration : null,
        encoder: format.encoder || null,
      },
      cover: cover
        ? { format: cover.format || "image/jpeg", mime: cover.format || "image/jpeg", data: `data:${cover.format || "image/jpeg"};base64,${Buffer.from(cover.data).toString("base64")}` }
        : null,
    };
  } catch (e) {
    log.error("get-audio-metadata failed", e);
    return ipcError("AUDIO_METADATA_FAILED", { message: e && e.message ? e.message : String(e) });
  }
});

// Quick probe that returns just the technical format block (no tags, no
// cover). Cheaper than get-audio-metadata when the UI only needs the
// sample-rate / bit-depth / bitrate for the badge (e.g. when scrolling a
// long list of tracks).
ipcMain.handle("get-audio-format", async (_, filePath) => {
  try {
    const resolved = path.resolve(filePath);
    if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
      return ipcError("MEDIA_NOT_FOUND");
    }
    const meta = await mm.parseFile(resolved, { duration: true, skipCovers: true });
    const f = meta.format || {};
    return {
      ok: true,
      path: resolved,
      container: f.container || null,
      codec: f.codec || null,
      lossless: typeof f.lossless === "boolean" ? f.lossless : null,
      sampleRate: typeof f.sampleRate === "number" ? f.sampleRate : null,
      bitsPerSample: typeof f.bitsPerSample === "number" ? f.bitsPerSample : null,
      channels: typeof f.numberOfChannels === "number" ? f.numberOfChannels : null,
      bitrate: typeof f.bitrate === "number" ? Math.round(f.bitrate) : null,
      durationSec: typeof f.duration === "number" ? f.duration : null,
    };
  } catch (e) {
    log.error("get-audio-format failed", e);
    return ipcError("AUDIO_METADATA_FAILED", { message: e && e.message ? e.message : String(e) });
  }
});

// -----------------------------------------------------------------------------
// Universal audio decoder (ffmpeg-static, raw f32le PCM over IPC).
//
// Renderer → main  : "decode-audio-pcm"   { filePath, requestId, options? }
// main     → rend  : "audio-pcm-meta"     { requestId, ok, sampleRate, channels, durationSec, bitDepth, codec, container, lossless }
// main     → rend  : "audio-pcm-chunk"    { requestId, seq, bytes: ArrayBuffer }
// main     → rend  : "audio-pcm-done"     { requestId, ok, totalBytes, error? }
// renderer → main  : "decode-audio-cancel"  { requestId }
//
// Each renderer request gets a unique requestId so multiple tabs can decode
// in flight simultaneously. The main process keeps a per-id handle so the
// renderer can cancel a running decode (e.g. user jumped to a new track).
// -----------------------------------------------------------------------------

const activeAudioDecodes = new Map();
let audioDecodeSeq = 0;

function nextAudioDecodeRequestId() {
  audioDecodeSeq = (audioDecodeSeq + 1) >>> 0;
  return `audec-${Date.now().toString(36)}-${audioDecodeSeq.toString(36)}`;
}

ipcMain.handle("decode-audio-pcm", async (event, payload) => {
  const sender = event.sender;
  const filePath = payload && typeof payload.filePath === "string" ? payload.filePath : "";
  const requestId = payload && typeof payload.requestId === "string" && payload.requestId
    ? payload.requestId
    : nextAudioDecodeRequestId();
  const options = payload && typeof payload.options === "object" && payload.options ? payload.options : {};

  if (!filePath) {
    return { ok: false, requestId, error: { code: "BAD_REQUEST", message: "filePath missing" } };
  }

  // Resolve + validate up-front.
  let resolved;
  try {
    resolved = path.resolve(filePath);
    if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
      return { ok: false, requestId, error: { code: "MEDIA_NOT_FOUND", message: "file not found" } };
    }
  } catch (e) {
    return { ok: false, requestId, error: { code: "MEDIA_NOT_FOUND", message: e.message } };
  }

  // Pre-parse metadata via music-metadata (fast, no ffmpeg spawn) so the
  // renderer can paint the badge + duration immediately while the PCM
  // stream is still arriving.
  let meta = null;
  try {
    const parsed = await mm.parseFile(resolved, { duration: true, skipCovers: true });
    const f = parsed && parsed.format ? parsed.format : {};
    meta = {
      sampleRate: typeof f.sampleRate === "number" ? f.sampleRate : null,
      channels: typeof f.numberOfChannels === "number" ? f.numberOfChannels : null,
      bitDepth: typeof f.bitsPerSample === "number" ? f.bitsPerSample : null,
      durationSec: typeof f.duration === "number" ? f.duration : null,
      codec: f.codec || null,
      container: f.container || null,
      lossless: typeof f.lossless === "boolean" ? f.lossless : null,
      bitrate: typeof f.bitrate === "number" ? Math.round(f.bitrate) : null,
    };
  } catch (e) {
    log.warn("decode-audio-pcm: music-metadata probe failed (continuing)", e.message);
  }

  // Kick off the ffmpeg decode.
  const handle = audioFfmpeg.decodeAudioPcm(resolved, options, (chunk) => {
    if (sender.isDestroyed()) return;
    // Send a structured-cloneable ArrayBuffer view across IPC.
    // chunk is a Uint8Array; we copy the bytes so the underlying buffer
    // can be recycled safely between spawn ticks.
    const copy = new Uint8Array(chunk.byteLength);
    copy.set(chunk);
    sender.send("audio-pcm-chunk", { requestId, seq: -1, bytes: copy.buffer });
  });

  if (handle.error) {
    return { ok: false, requestId, error: handle.error, meta };
  }

  const { proc } = handle;

  // Send the meta event up front so the renderer can begin allocating
  // its AudioBuffer right away.
  try {
    sender.send("audio-pcm-meta", {
      requestId,
      ok: true,
      meta,
    });
  } catch (e) {
    log.warn("decode-audio-pcm: send meta failed", e.message);
  }

  activeAudioDecodes.set(requestId, { proc, filePath: resolved, sender });

  // Resolve the invoke() promise once ffmpeg exits so the renderer can
  // await completion. We don't return the chunks here — those go via
  // the audio-pcm-chunk / audio-pcm-done events.
  return new Promise((resolve) => {
    proc.on("error", (err) => {
      log.error("audioFfmpeg: proc error", requestId, err);
      activeAudioDecodes.delete(requestId);
      try {
        sender.send("audio-pcm-done", { requestId, ok: false, totalBytes: 0, error: { code: "FFMPEG_RUNTIME_ERROR", message: err.message } });
      } catch (_) { /* sender destroyed */ }
      resolve({ ok: false, requestId, error: { code: "FFMPEG_RUNTIME_ERROR", message: err.message } });
    });
    proc.on("close", (code, signal) => {
      activeAudioDecodes.delete(requestId);
      const totalBytes = handle.totalBytesRef ? handle.totalBytesRef() : 0;
      if (code === 0) {
        try { sender.send("audio-pcm-done", { requestId, ok: true, totalBytes }); } catch (_) { /* ignore */ }
        resolve({ ok: true, requestId, totalBytes });
      } else {
        const tail = (handle.stderrTail && handle.stderrTail()) || "";
        const msg = tail.trim() || `ffmpeg exited with code ${code}${signal ? ` (signal ${signal})` : ""}`;
        log.warn("audioFfmpeg: proc close non-zero", requestId, code, signal, msg);
        try { sender.send("audio-pcm-done", { requestId, ok: false, totalBytes, error: { code: "FFMPEG_DECODE_FAILED", message: msg } }); } catch (_) { /* ignore */ }
        resolve({ ok: false, requestId, totalBytes, error: { code: "FFMPEG_DECODE_FAILED", message: msg } });
      }
    });
  });
});

ipcMain.on("decode-audio-cancel", (_event, payload) => {
  const requestId = payload && typeof payload.requestId === "string" ? payload.requestId : "";
  if (!requestId) return;
  const handle = activeAudioDecodes.get(requestId);
  if (!handle) return;
  try {
    handle.proc.kill("SIGKILL");
  } catch (e) {
    log.warn("decode-audio-cancel: kill failed", requestId, e.message);
  }
  activeAudioDecodes.delete(requestId);
});

ipcMain.handle("get-ffmpeg-info", () => {
  // Lightweight probe so the renderer can show a "FFmpeg not available"
  // message without a full decode attempt.
  const p = audioFfmpeg.resolveFfmpegPath();
  return {
    available: Boolean(p),
    path: p || null,
  };
});

// Audio extensions the queue builder recognises. Mirrors the lossless +
// lossy set in src/file-registry/formats.ts. We list them here too so the
// main process can filter a folder scan without round-tripping to the
// renderer for every file.
const AUDIO_EXTENSIONS = new Set([
  ".flac", ".wav", ".aif", ".aiff", ".dsf", ".dff",
  ".mp3", ".aac", ".ogg", ".opus", ".m4a", ".wma",
  ".ape", ".mp2", ".mka", ".ac3",
]);

ipcMain.handle("list-audio-in-folder", async (_, folderPath, options) => {
  try {
    const resolved = path.resolve(folderPath);
    if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
      return ipcError("FOLDER_NOT_FOUND");
    }
    const recursive = options && typeof options.recursive === "boolean" ? options.recursive : true;
    const limit = options && typeof options.limit === "number" && options.limit > 0 ? options.limit : 500;
    const out = [];
    const walk = (dir) => {
      let entries;
      try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
      catch (e) { log.warn("readdir failed", dir, e.message); return; }
      for (const entry of entries) {
        if (out.length >= limit) return;
        const child = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (!recursive) continue;
          if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
          walk(child);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (AUDIO_EXTENSIONS.has(ext)) {
            let size = 0;
            try { size = fs.statSync(child).size; } catch (e) { /* ignore */ }
            out.push({ path: child, name: entry.name, size });
          }
        }
      }
    };
    walk(resolved);
    out.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }));
    return { ok: true, folder: resolved, files: out.slice(0, limit) };
  } catch (e) {
    log.error("list-audio-in-folder failed", e);
    return ipcError("FOLDER_READ_FAILED", { message: e && e.message ? e.message : String(e) });
  }
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

// Snapshot of runtime + host details used by the About dialog. Pulled in one
// round-trip so the dialog can paint every row even when some sources are
// unavailable (browser dev mode, missing preload). Keep the shape flat and
// primitive — the renderer never needs anything more exotic than strings.
ipcMain.handle("get-runtime-info", () => ({
  appVersion: app.getVersion(),
  electron: process.versions.electron ?? "",
  chrome: process.versions.chrome ?? "",
  node: process.versions.node ?? "",
  v8: process.versions.v8 ?? "",
  osName: `${os.type()} ${os.release()}`.trim(),
  osPlatform: process.platform,
  osArch: process.arch,
  systemLocale: app.getLocale?.() ?? "",
  hostname: os.hostname(),
  cpus: os.cpus()?.length ?? 0,
  totalMemGb: os.totalmem ? Math.round((os.totalmem() / (1024 ** 3)) * 10) / 10 : 0,
}));

ipcMain.handle("save-error-log", async (_, payload, defaultName) => {
  // Persist the captured renderer error as a JSON document. The renderer
  // hands us a fully-formed PersistedErrorLog (built in src/utils/errorLog.ts);
  // we sanitize the filename and write under os.tmpdir() so the user can
  // re-find the file later via the file manager.
  if (!payload || typeof payload !== "object") {
    return ipcError("SAVE_ERROR_LOG_FAILED", { reason: "payload is not an object" });
  }
  try {
    let filename = (typeof defaultName === "string" && defaultName.trim()) || `openme-error-${Date.now()}.json`;
    filename = filename.replace(/[^a-zA-Z0-9._\-]/g, "_");
    const dest = path.join(os.tmpdir(), filename);
      const serialized = JSON.stringify(payload, null, 2);
      await fs.promises.writeFile(dest, serialized, "utf8");
      log.warn("renderer error log saved", { dest, payloadVersion: payload?.capturedAt ?? null });
      return { ok: true, path: dest, bytes: Buffer.byteLength(serialized, "utf8") };
  } catch (err) {
    log.error("save-error-log failed", err);
    return ipcError("SAVE_ERROR_LOG_FAILED", { message: err?.message || String(err) });
  }
});

ipcMain.handle("set-dirty-state", (_, dirty) => { hasUnsavedChanges = Boolean(dirty); });
ipcMain.handle("window-minimize", () => mainWindow?.minimize());
ipcMain.handle("window-maximize", () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize();
  else mainWindow?.maximize();
});
ipcMain.handle("window-close", () => mainWindow?.close());
ipcMain.handle("window-is-maximized", () => mainWindow?.isMaximized() ?? false);

    // Install mode detection — used by the renderer to show a one-time
    // toast on portable launches offering to download the installer. We
    // distinguish three modes:
    //   * "installed" — running from %LOCALAPPDATA%\Programs or Program Files
    //   * "portable"  — launched via electron-builder portable (sets
    //                   PORTABLE_EXECUTABLE_DIR) or running from a temp dir
    //   * "dev"       — running from a git checkout via `npm run electron`
    ipcMain.handle("app:install-mode", () => {
      if (isDev) return "dev";
      if (process.env.PORTABLE_EXECUTABLE_DIR) return "portable";
      const exeDir = path.dirname(app.getPath("exe")).toLowerCase();
      if (
        exeDir.includes("\\programs\\") ||
        exeDir.includes("\\appdata\\local\\programs\\") ||
        exeDir.includes("\\program files\\")
      ) {
        return "installed";
      }
      return "portable";
    });

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
