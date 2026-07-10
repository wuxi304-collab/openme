import { useCallback, useEffect, useMemo, useState } from "react";
import { I18nProvider, useI18n } from "./i18n";
import { ThemeProvider } from "./theme";
import { SettingsProvider, useSettings } from "./settings";
import { FileInfo, FileTabState } from "./types";
import { detectCategory } from "./utils/fileTypeDetector";
import { getFileFormatByPath } from "./file-registry";
import { loadFileTabData } from "./core/fileOpenPipeline";
import { describeIpcError, isIpcFailure } from "./core/ipcError";
import Sidebar from "./components/layout/Sidebar";
import TitleBar from "./components/layout/TitleBar";
import StatusBar from "./components/layout/StatusBar";
import FileTabs from "./components/layout/FileTabs";
import CommandPalette, { type CommandItem } from "./components/CommandPalette";
import { ShortcutsOverlay } from "./components/ShortcutsOverlay";
import FileSummaryPanel from "./components/FileSummaryPanel";
import ViewerRouter from "./components/viewers/ViewerRouter";
import { ConfirmProvider, useCloseAllConfirm, useCloseTabConfirm } from "./components/useConfirm";
import { ToastProvider } from "./components/useToast";
import { ToastStack, nextToastId, type ToastEntry, type ToastKind } from "./components/Toast";
import AppErrorBoundary from "./components/AppErrorBoundary";
import { installErrorCapture } from "./utils/errorLog";

// Electron's preload extends the standard `File` with a `path` field —
// declare the augmentation locally so we don't need `(file: any)` in
// drag-and-drop handlers.
type FileWithPath = File & { path?: string };

export default function App() {
  const { t, tf } = useI18n();
  const { settings } = useSettings();
  // Install the global capture hooks before anything else runs so we never
  // miss the first window.onerror / unhandledrejection of the session.
  useEffect(() => { installErrorCapture(); }, []);
  const [recentFiles, setRecentFiles] = useState<FileInfo[]>([]);
  const [tabs, setTabs] = useState<FileTabState[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [toasts, setToasts] = useState<ToastEntry[]>([]);

  const pushToast = useCallback((kind: ToastKind, message: string) => {
    const id = nextToastId();
    setToasts((prev) => [...prev, { id, kind, message, ttlMs: 2600 }]);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((entry) => entry.id !== id));
  }, []);
  const [commandOpen, setCommandOpen] = useState(false);
    const [shortcutsOpen, setShortcutsOpen] = useState(false);
    const confirmCloseTab = useCloseTabConfirm();
  const confirmCloseAll = useCloseAllConfirm();

  useEffect(() => {
    const load = async () => {
      try {
        if (typeof window.electronAPI?.loadRecentFiles === "function") {
          const store = await window.electronAPI.loadRecentFiles();
          setRecentFiles(store?.files ?? []);
        } else {
          // Browser fallback during dev: use empty recent list
          setRecentFiles([]);
        }
      } catch (err) {
        console.error("loadRecentFiles failed:", err);
        setRecentFiles([]);
      }
    };
    void load();
  }, []);

    // Detect whether we're running as the portable .exe and offer the
    // installed version once per session. The portable build does not
    // create desktop / Start-menu shortcuts — the setup build does — so
    // pointing users at it from the running app is the most reliable way
    // to surface that option. We only fire the toast on first mount, in
    // portable mode, and only if the user hasn't dismissed it before
    // (session-scoped flag in localStorage).
    useEffect(() => {
      const SEEN_KEY = "openme.installHint.seen";
      if (typeof window === "undefined") return;
      if (window.localStorage.getItem(SEEN_KEY) === "1") return;
      if (typeof window.electronAPI?.getInstallMode !== "function") return;
      let cancelled = false;
      void window.electronAPI.getInstallMode().then((mode) => {
        if (cancelled || mode !== "portable") return;
        window.localStorage.setItem(SEEN_KEY, "1");
        const id = nextToastId();
        setToasts((prev) => [
          ...prev,
          {
            id,
            kind: "info",
            message: `${t("installModeHintTitle")} — ${t("installModeHintBody")}`,
            ttlMs: 9000,
            action: {
              kind: "external",
              label: t("installModeHintAction"),
              url: "https://github.com/wuxi304-collab/openme/releases/latest",
            },
          },
        ]);
      }).catch(() => undefined);
      return () => { cancelled = true; };
    }, [t]);

  const filteredFiles = useMemo(() => {
    if (!searchQuery.trim()) return recentFiles;
    const q = searchQuery.toLowerCase();
    return recentFiles.filter((f) => f.name.toLowerCase().includes(q) || f.path.toLowerCase().includes(q) || f.extension.toLowerCase().includes(q));
  }, [recentFiles, searchQuery]);

  const activeTab = useMemo(() => tabs.find((t) => t.id === activeTabId) ?? null, [tabs, activeTabId]);
    const hasDirtyTabs = tabs.some((tab) => tab.isDirty);

    // Toast TTL countdown is owned by <ToastStack> so hover-pause can freeze
    // the timer cleanly without coordinating with an effect here.
    useEffect(() => {
    try {
      if (typeof window.electronAPI?.setDirtyState === "function") {
        window.electronAPI.setDirtyState(hasDirtyTabs).catch(() => undefined);
      }
    } catch (err) {
      // ignore in browser
    }
  }, [hasDirtyTabs]);

  const handleSaveCurrent = useCallback(async () => {
      const tab = activeTab;
      if (!tab || !tab.isDirty || tab.content === null) return;
      const result = await window.electronAPI.saveFile(tab.path, tab.content);
      if (result.success) {
        setTabs((prev) => prev.map((t) => t.id === tab.id ? { ...t, isDirty: false } : t));
        pushToast("success", tf("saveSuccess", { name: tab.name }));
        } else if (isIpcFailure(result)) pushToast("error", describeIpcError(t, result));
        else pushToast("error", result.message ?? tf("saveFailed"));
      }, [activeTab, t, tf]);

  const openFileInTab = useCallback(async (fileInfo: FileInfo) => {
    const existingTab = tabs.find((t) => t.path === fileInfo.path);
    if (existingTab) { setActiveTabId(existingTab.id); return; }
    const category = detectCategory(fileInfo.path);
    const id = `tab-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newTab: FileTabState = { id, path: fileInfo.path, name: fileInfo.name, category, content: null, isDirty: false, isLoading: true, sourceFile: fileInfo };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(id);
      await loadAndApply(id, fileInfo, category);
    }, [tabs]);

    // Reload an existing tab from disk. Used by the OpenMeRouteCard Retry button
    // when the user wants to re-attempt a failed open. We clear the previous
    // error and sourceFile so the freshly-resolved metadata flows back through.
    const retryTab = useCallback(async (tabId: string) => {
      const tab = tabs.find((t) => t.id === tabId);
      if (!tab || !tab.sourceFile) return;
      const category = detectCategory(tab.path);
      await loadAndApply(tabId, tab.sourceFile, category);
    }, [tabs]);

    // Single loading path shared by openFileInTab + retryTab. Sets isLoading,
    // awaits loadFileTabData, then either merges loaded data back into the tab
    // or surfaces the error message. Refactoring openFileInTab onto this helper
    // is what lets retry be a one-liner that doesn't drift from the original.
    const loadAndApply = useCallback(async (tabId: string, fileInfo: FileInfo, category: ReturnType<typeof detectCategory>) => {
      setTabs((prev) => prev.map((t) => t.id === tabId ? { ...t, isLoading: true, error: undefined } : t));
      try {
        const loaded = await loadFileTabData(fileInfo, category, t);
        setTabs((prev) => prev.map((tab) => tab.id === tabId ? { ...tab, ...loaded, isLoading: false } : tab));
      } catch (error) {
        setTabs((prev) => prev.map((tab) => tab.id === tabId ? { ...tab, isLoading: false, error: error instanceof Error ? error.message : tf("readFailed") } : tab));
      }
    }, [t, tf]);

  const addToRecent = useCallback(async (file: FileInfo) => { const updated = [file, ...recentFiles.filter((f) => f.path !== file.path)].slice(0, settings.recentLimit); setRecentFiles(updated); await window.electronAPI.saveRecentFiles({ files: updated, version: 1 }).catch(() => undefined); }, [recentFiles, settings.recentLimit]);

  // Audio queue bridge: when the lossless player wants to open a sibling
  // track, it dispatches a CustomEvent on `window` carrying the next
  // path. We resolve it to a FileInfo, push it to recents, and let the
  // normal tab-opening pipeline take over so the new track gets its
  // own tab (with all the standard dirty-state / focus / metadata
  // behavior). The event listener lives in App because the player
  // shouldn't reach into openFileInTab directly via props.
  useEffect(() => {
    const onQueueOpen = async (event: Event) => {
      const detail = (event as CustomEvent<{ path: string }>).detail;
      if (!detail || typeof detail.path !== "string") return;
      const info = await window.electronAPI.getFileInfo(detail.path);
      if (isIpcFailure(info)) return;
      info.file_type = detectCategory(info.path);
      await addToRecent(info);
      await openFileInTab(info);
    };
    window.addEventListener("openme:audio-queue-open", onQueueOpen);
    return () => window.removeEventListener("openme:audio-queue-open", onQueueOpen);
  }, [addToRecent, openFileInTab]);
    const handleFilePaths = useCallback(async (paths: string[]) => {
      for (const p of paths) {
        const fileInfo = await window.electronAPI.getFileInfo(p);
        if (isIpcFailure(fileInfo)) { pushToast("error", describeIpcError(t, fileInfo)); continue; }
        fileInfo.file_type = detectCategory(p);
        await addToRecent(fileInfo);
        await openFileInTab(fileInfo);
      }
    }, [addToRecent, openFileInTab, t]);
  const handleSelectFile = useCallback(async (file: FileInfo) => { await openFileInTab(file); }, [openFileInTab]);
  const handleRemoveRecent = useCallback(async (file: FileInfo) => { const updated = recentFiles.filter((item) => item.path !== file.path); setRecentFiles(updated); await window.electronAPI.saveRecentFiles({ files: updated, version: 1 }); pushToast("success", tf("removeFromRecentToast", { name: file.name })); }, [recentFiles, tf, pushToast]);
  const handleRevealRecent = useCallback((file: FileInfo) => { void window.electronAPI.revealInFolder(file.path); }, []);
  const handleOpenRecentInSystem = useCallback((file: FileInfo) => { void window.electronAPI.openInSystem(file.path); }, []);
  const handleCloseTab = useCallback(async (tabId: string) => { const closingTab = tabs.find((tab) => tab.id === tabId); if (closingTab?.isDirty && settings.confirmTabClose && !(await confirmCloseTab(closingTab.name))) return; setTabs((prev) => { const idx = prev.findIndex((t) => t.id === tabId); const newTabs = prev.filter((t) => t.id !== tabId); if (activeTabId === tabId) { if (newTabs.length > 0) setActiveTabId(newTabs[Math.min(idx, newTabs.length - 1)].id); else setActiveTabId(null); } return newTabs; }); }, [activeTabId, tabs, confirmCloseTab, settings.confirmTabClose]);
  const handleOpenDialog = useCallback(async () => { try { const paths = await window.electronAPI.openFileDialog(); if (paths?.length) handleFilePaths(paths); } catch (error) { console.error("Dialog error:", error); } }, [handleFilePaths]);
    const handleCloseAllTabs = useCallback(async () => { if (hasDirtyTabs && settings.confirmTabClose && !(await confirmCloseAll(tabs.filter((tab) => tab.isDirty).length))) return; setTabs([]); setActiveTabId(null); }, [hasDirtyTabs, tabs, confirmCloseAll, settings.confirmTabClose]);

  const handleReorderTabs = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    if (fromIndex < 0 || toIndex < 0) return;
    setTabs((prev) => {
      if (fromIndex >= prev.length || toIndex >= prev.length) return prev;
      const next = prev.slice();
      const [moved] = next.splice(fromIndex, 1);
      const insertAt = toIndex > fromIndex ? toIndex - 1 : toIndex;
      next.splice(Math.max(0, Math.min(insertAt, next.length)), 0, moved);
      return next;
    });
  }, []);

  const handleContentChange = useCallback((content: string) => { if (!activeTabId) return; setTabs((prev) => prev.map((t) => t.id === activeTabId ? { ...t, content, isDirty: true } : t)); }, [activeTabId]);
  const handleDrop = useCallback((event: React.DragEvent) => { event.preventDefault(); const paths = Array.from(event.dataTransfer.files).map((file) => (file as FileWithPath).path).filter((path): path is string => typeof path === "string" && path.length > 0); if (paths.length) handleFilePaths(paths); }, [handleFilePaths]);
  const activateRelativeTab = useCallback((direction: 1 | -1) => { if (tabs.length < 2) return; const current = Math.max(0, tabs.findIndex((tab) => tab.id === activeTabId)); setActiveTabId(tabs[(current + direction + tabs.length) % tabs.length].id); }, [tabs, activeTabId]);

  const commands = useMemo<CommandItem[]>(() => {
    const baseCommands: CommandItem[] = [
      { id: "open", label: t("cmdOpenFile"), detail: t("cmdOpenFileDetail"), shortcut: "Ctrl O", kind: "file", keywords: ["open", "file"], run: handleOpenDialog },
      { id: "save", label: t("cmdSave"), detail: activeTab?.name ?? t("cmdSaveDetailNoFile"), shortcut: "Ctrl S", kind: "file", keywords: ["save"], disabled: !activeTab?.isDirty, run: handleSaveCurrent },
      { id: "system", label: t("cmdOpenInSystem"), detail: activeTab?.path ?? t("cmdOpenInSystemDetailNoFile"), kind: "system", keywords: ["external", "system"], disabled: !activeTab, run: () => { if (activeTab) window.electronAPI.openInSystem(activeTab.path); } },
      { id: "next", label: t("cmdNextTab"), detail: tf("cmdTabCountDetail", { count: tabs.length }), shortcut: "Ctrl Tab", kind: "tab", disabled: tabs.length < 2, run: () => activateRelativeTab(1) },
      { id: "prev", label: t("cmdPrevTab"), detail: tf("cmdTabCountDetail", { count: tabs.length }), shortcut: "Ctrl Shift Tab", kind: "tab", disabled: tabs.length < 2, run: () => activateRelativeTab(-1) },
      { id: "close", label: t("cmdCloseTab"), detail: activeTab?.name ?? t("cmdSaveDetailNoFile"), shortcut: "Ctrl W", kind: "tab", disabled: !activeTab, run: () => { if (activeTab) handleCloseTab(activeTab.id); } },
      { id: "close-all", label: t("cmdCloseAll"), detail: tf("cmdTabCountDetail", { count: tabs.length }), kind: "workspace", disabled: tabs.length === 0, run: handleCloseAllTabs },
      { id: "clear-search", label: t("cmdClearSearch"), detail: searchQuery ? tf("cmdClearSearchDetailActive", { query: searchQuery }) : t("cmdClearSearchDetailEmpty"), kind: "workspace", disabled: !searchQuery, run: () => setSearchQuery("") },
    ];
    const tabCommands = tabs.map((tab, index) => ({ id: `tab-${tab.id}`, label: tf("cmdSwitchTab", { name: tab.name }), detail: tab.path, kind: "tab" as const, shortcut: index < 9 ? `Alt ${index + 1}` : undefined, keywords: [tab.category], run: () => setActiveTabId(tab.id) }));
    const recentCommands = recentFiles.slice(0, 8).map((file) => ({ id: `recent-${file.path}`, label: tf("cmdOpenRecent", { name: file.name }), detail: file.path, kind: "recent" as const, keywords: [file.extension, file.file_type], openedAt: file.opened_at, run: () => { void openFileInTab(file); } }));
    return [...baseCommands, ...tabCommands, ...recentCommands];
  }, [handleOpenDialog, activeTab, tabs, searchQuery, handleSaveCurrent, activateRelativeTab, handleCloseTab, handleCloseAllTabs, recentFiles, openFileInTab, t, tf]);

  // Global keyboard shortcuts. Capture phase so the command palette
  // (when open) still respects Esc-to-close and won't double-fire on
  // Ctrl+S / Ctrl+O via the bubble-phase handler.
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const mod = event.ctrlKey || event.metaKey;
      if (mod && event.key.toLowerCase() === "s") { event.preventDefault(); void handleSaveCurrent(); return; }
      if (mod && event.key.toLowerCase() === "o") { event.preventDefault(); void handleOpenDialog(); return; }
      if (mod && event.key.toLowerCase() === "k") { event.preventDefault(); setCommandOpen((value) => !value); return; }
            // `?` (Shift+/) toggles the global shortcuts overlay. We accept
            // the literal `?` event.key so layout-independent, but also fall
            // back to shift+slash for completeness.
            if (event.key === "?" || (event.shiftKey && event.key === "/")) {
              event.preventDefault();
              setShortcutsOpen((value) => !value);
              return;
            }
            if (commandOpen || shortcutsOpen) return;
      if (mod && event.key.toLowerCase() === "w") { event.preventDefault(); if (activeTab) void handleCloseTab(activeTab.id); return; }
      if (mod && event.key === "Tab") { event.preventDefault(); activateRelativeTab(event.shiftKey ? -1 : 1); return; }
      if (event.altKey && /^[1-9]$/.test(event.key)) {
        const target = tabs[Number(event.key) - 1];
        if (target) { event.preventDefault(); setActiveTabId(target.id); }
      }
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [handleSaveCurrent, handleOpenDialog, commandOpen, shortcutsOpen, activeTab, handleCloseTab, activateRelativeTab, tabs]);

  return (
    <I18nProvider>
        <SettingsProvider>
          <ConfirmProvider>
          <ThemeProvider>
            <ToastProvider value={{ pushToast }}>
            <AppErrorBoundary>
            <div className="flex flex-col mario-world" style={{ height: "100vh" }}>
                      <a href="#main-content" className="skip-link">{t("skipToContent")}</a>
                      <TitleBar />
            <FileTabs tabs={tabs} activeId={activeTabId} onSelect={setActiveTabId} onClose={handleCloseTab} onReorder={handleReorderTabs} />
            <div className="flex flex-1 min-h-0" style={{ position: "relative", zIndex: 1 }}>
          <Sidebar files={filteredFiles} selectedPath={activeTab?.path ?? null} onSelect={handleSelectFile} onRemove={handleRemoveRecent} onOpenDialog={handleOpenDialog} searchValue={searchQuery} onSearchChange={setSearchQuery} totalCount={recentFiles.length} onReveal={handleRevealRecent} onOpenInSystem={handleOpenRecentInSystem} />
          <main id="main-content" tabIndex={-1} className="flex-1 flex flex-col min-w-0 overflow-hidden focus:outline-none" onDrop={handleDrop} onDragOver={(event) => event.preventDefault()}>
            {tabs.length === 0 ? <EmptyState onOpenDialog={handleOpenDialog} recentFiles={recentFiles} onOpenRecent={(file) => { void openFileInTab(file); }} /> : activeTab ? (
              <div className="workspace-viewer-grid"><div className="workspace-viewer-main">{activeTab.isLoading ? <LoadingState /> : <ViewerRouter tab={activeTab} onChange={handleContentChange} onRetry={activeTab.sourceFile ? () => { void retryTab(activeTab.id); } : undefined} />}</div><FileSummaryPanel tab={activeTab} onOpenInSystem={() => window.electronAPI.openInSystem(activeTab.path)} /></div>
            ) : null}
          </main>
            </div>
            <StatusBar
                          activeTab={
                            activeTab
                              ? (() => {
                                  const fmt = activeTab.path ? getFileFormatByPath(activeTab.path) : undefined;
                                  return {
                                    name: activeTab.name,
                                    path: activeTab.path,
                                    size: activeTab.sourceFile?.size,
                                    content: activeTab.content ?? undefined,
                                    isDirty: activeTab.isDirty,
                                    isLoading: activeTab.isLoading,
                                    openStrategy: fmt?.openStrategy,
                                    riskLevel: fmt?.riskLevel,
                                  };
                                })()
                              : null
                          }
                          activePosition={activeTab ? tabs.findIndex((tab) => tab.id === activeTab.id) + 1 : undefined}
                          totalTabs={tabs.length}
                                                    onOpenInSystem={activeTab?.path ? () => window.electronAPI.openInSystem(activeTab.path) : undefined}
                                                  />
            <ToastStack toasts={toasts} onDismiss={dismissToast} />
            <CommandPalette open={commandOpen} commands={commands} onClose={() => setCommandOpen(false)} />
                        <ShortcutsOverlay open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
          </div>
            </AppErrorBoundary>
            </ToastProvider>
        </ThemeProvider>
          </ConfirmProvider>
                </SettingsProvider>
              </I18nProvider>
            );
          }

export function EmptyState({
  onOpenDialog,
  recentFiles,
  onOpenRecent,
}: {
  onOpenDialog: () => void;
  recentFiles: FileInfo[];
  onOpenRecent: (file: FileInfo) => void;
}) {
  const { t } = useI18n();
  const formats = ["PDF", "DOCX", "XLSX", "DWG", "PSD", "APK", "ISO", "ZIP"];
  const shortcutRows: Array<{ keys: string; label: string }> = [
    { keys: "Ctrl O", label: t("emptyShortcutOpen") },
    { keys: "Ctrl K", label: t("emptyShortcutPalette") },
    { keys: "Ctrl S", label: t("emptyShortcutSave") },
    { keys: "Drag", label: t("emptyShortcutDrop") },
  ];
  const previewRecents = recentFiles.slice(0, 4);
  return (
    <section className="empty-workspace" aria-labelledby="empty-title">
      <div className="sky-grid" aria-hidden="true">
        <span className="pixel-cloud cloud-one" />
        <span className="pixel-cloud cloud-two" />
        <span className="floating-coin coin-one" />
        <span className="floating-coin coin-two" />
        <span className="scenery-hill hill-one" />
        <span className="scenery-hill hill-two" />
      </div>
      <div className="welcome-panel">
        <div className="welcome-eyebrow">
          <span className="eyebrow-line" />
          {t("heroEyebrow")}
          <span className="eyebrow-line" />
        </div>
        <div className="hero-mark" aria-hidden="true">
          <i />
          <span>{t("heroMark")}</span>
        </div>
        <h1 id="empty-title">{t("heroTitle")}</h1>
        <p>{t("heroSubtitle")}</p>
        <div className="empty-actions">
          <button type="button" className="hero-open-button" onClick={onOpenDialog}>
            {t("heroOpen")}
          </button>
          <span className="drop-hint">{t("heroDropHint")}</span>
        </div>
        <div className="empty-cards">
          <div className="empty-card" aria-labelledby="empty-shortcuts-title">
            <h2 id="empty-shortcuts-title" className="empty-card-title">{t("emptyShortcutsTitle")}</h2>
            <ul className="empty-shortcuts">
              {shortcutRows.map((row) => (
                <li key={row.keys}>
                  <kbd>{row.keys}</kbd>
                  <span>{row.label}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="empty-card" aria-labelledby="empty-recent-title">
            <h2 id="empty-recent-title" className="empty-card-title">{t("emptyRecentTitle")}</h2>
            {previewRecents.length ? (
              <ul className="empty-recent-list">
                {previewRecents.map((file) => (
                  <li key={file.path}>
                    <button type="button" className="empty-recent-row" onClick={() => onOpenRecent(file)}>
                      <span className="empty-recent-name">{file.name}</span>
                      <span className="empty-recent-ext">{file.extension.replace(/^\./, "").toUpperCase()}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty-recent-empty">{t("emptyRecentEmpty")}</p>
            )}
          </div>
        </div>
        <div className="format-row" aria-label={t("heroFormatsLabel")}>
          {formats.map((format) => <span key={format}>{format}</span>)}
        </div>
      </div>
      <div className="workspace-ground" aria-hidden="true">
        <span className="ground-pipe" />
        <span className="ground-bricks" />
      </div>
    </section>
  );
}

function LoadingState() {
  const { t } = useI18n();
  return (
    <div className="loading-state">
      <div className="loading-card">
        <div className="loading-dot-row">
          <div className="loading-dot" />
          <div className="loading-dot" />
          <div className="loading-dot" />
        </div>
        <p>{t("loadingFile")}</p>
      </div>
    </div>
  );
}
