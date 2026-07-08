import React, { useCallback, useEffect, useMemo, useState } from "react";
import { I18nProvider, useI18n } from "./i18n";
import { ThemeProvider } from "./theme";
import { FileInfo, FileTabState } from "./types";
import { detectCategory } from "./utils/fileTypeDetector";
import { loadFileTabData } from "./core/fileOpenPipeline";
import { describeIpcError, isIpcFailure } from "./core/ipcError";
import Sidebar from "./components/layout/Sidebar";
import TitleBar from "./components/layout/TitleBar";
import StatusBar from "./components/layout/StatusBar";
import FileTabs from "./components/layout/FileTabs";
import CommandPalette, { type CommandItem } from "./components/CommandPalette";
import FileSummaryPanel from "./components/FileSummaryPanel";
import ViewerRouter from "./components/viewers/ViewerRouter";

const MAX_RECENT = 50;

export default function App() {
  const { t, tf } = useI18n();
  const [recentFiles, setRecentFiles] = useState<FileInfo[]>([]);
  const [tabs, setTabs] = useState<FileTabState[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [toast, setToast] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const [commandOpen, setCommandOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        if (typeof (window as any).electronAPI?.loadRecentFiles === "function") {
          const store = await (window as any).electronAPI.loadRecentFiles();
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

  const filteredFiles = useMemo(() => {
    if (!searchQuery.trim()) return recentFiles;
    const q = searchQuery.toLowerCase();
    return recentFiles.filter((f) => f.name.toLowerCase().includes(q) || f.path.toLowerCase().includes(q) || f.extension.toLowerCase().includes(q));
  }, [recentFiles, searchQuery]);

  const activeTab = useMemo(() => tabs.find((t) => t.id === activeTabId) ?? null, [tabs, activeTabId]);
  const hasDirtyTabs = tabs.some((tab) => tab.isDirty);

  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(null), 2600); return () => window.clearTimeout(timer); }, [toast]);
  useEffect(() => {
    try {
      if (typeof (window as any).electronAPI?.setDirtyState === "function") {
        (window as any).electronAPI.setDirtyState(hasDirtyTabs).catch(() => undefined);
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
        setToast({ kind: "success", message: tf("saveSuccess", { name: tab.name }) });
        } else if (isIpcFailure(result)) setToast({ kind: "error", message: describeIpcError(t, result) });
        else setToast({ kind: "error", message: result.message ?? tf("saveFailed") });
      }, [activeTab, t, tf]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => { if ((event.ctrlKey || event.metaKey) && event.key === "s") { event.preventDefault(); handleSaveCurrent(); } };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSaveCurrent]);

  const openFileInTab = useCallback(async (fileInfo: FileInfo) => {
    const existingTab = tabs.find((t) => t.path === fileInfo.path);
    if (existingTab) { setActiveTabId(existingTab.id); return; }
    const category = detectCategory(fileInfo.path);
    const id = `tab-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newTab: FileTabState = { id, path: fileInfo.path, name: fileInfo.name, category, content: null, isDirty: false, isLoading: true, sourceFile: fileInfo };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(id);
    try {
      const loaded = await loadFileTabData(fileInfo, category, t);
      setTabs((prev) => prev.map((t) => t.id === id ? { ...t, ...loaded, isLoading: false } : t));
    } catch (error) {
      setTabs((prev) => prev.map((t) => t.id === id ? { ...t, isLoading: false, error: error instanceof Error ? error.message : tf("readFailed") } : t));
    }
  }, [tabs, t]);

  const addToRecent = useCallback(async (file: FileInfo) => { const updated = [file, ...recentFiles.filter((f) => f.path !== file.path)].slice(0, MAX_RECENT); setRecentFiles(updated); await window.electronAPI.saveRecentFiles({ files: updated, version: 1 }).catch(() => undefined); }, [recentFiles]);
    const handleFilePaths = useCallback(async (paths: string[]) => {
      for (const p of paths) {
        const fileInfo = await window.electronAPI.getFileInfo(p);
        if (isIpcFailure(fileInfo)) { setToast({ kind: "error", message: describeIpcError(t, fileInfo) }); continue; }
        (fileInfo as FileInfo).file_type = detectCategory(p) as any;
        await addToRecent(fileInfo as FileInfo);
        await openFileInTab(fileInfo as FileInfo);
      }
    }, [addToRecent, openFileInTab, t]);
  const handleSelectFile = useCallback(async (file: FileInfo) => { await openFileInTab(file); }, [openFileInTab]);
  const handleRemoveRecent = useCallback(async (file: FileInfo) => { const updated = recentFiles.filter((item) => item.path !== file.path); setRecentFiles(updated); await window.electronAPI.saveRecentFiles({ files: updated, version: 1 }); setToast({ kind: "success", message: tf("removeFromRecentToast", { name: file.name }) }); }, [recentFiles, tf]);
  const handleCloseTab = useCallback((tabId: string) => { const closingTab = tabs.find((tab) => tab.id === tabId); if (closingTab?.isDirty && !window.confirm(tf("unsavedCloseOne", { name: closingTab.name }))) return; setTabs((prev) => { const idx = prev.findIndex((t) => t.id === tabId); const newTabs = prev.filter((t) => t.id !== tabId); if (activeTabId === tabId) { if (newTabs.length > 0) setActiveTabId(newTabs[Math.min(idx, newTabs.length - 1)].id); else setActiveTabId(null); } return newTabs; }); }, [activeTabId, tabs, tf]);
  const handleOpenDialog = useCallback(async () => { try { const paths = await window.electronAPI.openFileDialog(); if (paths?.length) handleFilePaths(paths); } catch (error) { console.error("Dialog error:", error); } }, [handleFilePaths]);
  const handleCloseAllTabs = useCallback(() => { if (hasDirtyTabs && !window.confirm(tf("unsavedCloseAll"))) return; setTabs([]); setActiveTabId(null); }, [hasDirtyTabs, tf]);

  useEffect(() => { const handler = (event: KeyboardEvent) => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "o") { event.preventDefault(); handleOpenDialog(); } }; window.addEventListener("keydown", handler); return () => window.removeEventListener("keydown", handler); }, [handleOpenDialog]);

  const handleContentChange = useCallback((content: string) => { if (!activeTabId) return; setTabs((prev) => prev.map((t) => t.id === activeTabId ? { ...t, content, isDirty: true } : t)); }, [activeTabId]);
  const handleDrop = useCallback((event: React.DragEvent) => { event.preventDefault(); const paths = Array.from(event.dataTransfer.files).map((file: any) => file.path).filter(Boolean); if (paths.length) handleFilePaths(paths); }, [handleFilePaths]);
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
    const recentCommands = recentFiles.slice(0, 8).map((file) => ({ id: `recent-${file.path}`, label: tf("cmdOpenRecent", { name: file.name }), detail: file.path, kind: "recent" as const, keywords: [file.extension, file.file_type], run: () => { void openFileInTab(file); } }));
    return [...baseCommands, ...tabCommands, ...recentCommands];
  }, [handleOpenDialog, activeTab, tabs, searchQuery, handleSaveCurrent, activateRelativeTab, handleCloseTab, handleCloseAllTabs, recentFiles, openFileInTab, t, tf]);

  useEffect(() => { const handler = (event: KeyboardEvent) => { if ((event.ctrlKey || event.metaKey) && event.key.toLocaleLowerCase() === "k") { event.preventDefault(); setCommandOpen((value) => !value); return; } if (commandOpen) return; if ((event.ctrlKey || event.metaKey) && event.key.toLocaleLowerCase() === "w") { event.preventDefault(); if (activeTab) handleCloseTab(activeTab.id); } if ((event.ctrlKey || event.metaKey) && event.key === "Tab") { event.preventDefault(); activateRelativeTab(event.shiftKey ? -1 : 1); } if (event.altKey && /^[1-9]$/.test(event.key)) { const target = tabs[Number(event.key) - 1]; if (target) { event.preventDefault(); setActiveTabId(target.id); } } }; window.addEventListener("keydown", handler, true); return () => window.removeEventListener("keydown", handler, true); }, [commandOpen, activeTab, handleCloseTab, activateRelativeTab, tabs]);

  return (
    <I18nProvider>
      <ThemeProvider>
        <div className="flex flex-col mario-world" style={{ height: "100vh" }}>
          <TitleBar />
          <FileTabs tabs={tabs} activeId={activeTabId} onSelect={setActiveTabId} onClose={handleCloseTab} />
          <div className="flex flex-1 min-h-0" style={{ position: "relative", zIndex: 1 }}>
        <Sidebar files={filteredFiles} selectedPath={activeTab?.path ?? null} onSelect={handleSelectFile} onRemove={handleRemoveRecent} onOpenDialog={handleOpenDialog} searchValue={searchQuery} onSearchChange={setSearchQuery} />
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden" onDrop={handleDrop} onDragOver={(event) => event.preventDefault()}>
          {tabs.length === 0 ? <EmptyState onOpenDialog={handleOpenDialog} /> : activeTab ? (
            <div className="workspace-viewer-grid"><div className="workspace-viewer-main">{activeTab.isLoading ? <LoadingState /> : <ViewerRouter tab={activeTab} onChange={handleContentChange} />}</div><FileSummaryPanel tab={activeTab} onOpenInSystem={() => window.electronAPI.openInSystem(activeTab.path)} /></div>
          ) : null}
        </main>
          </div>
          <StatusBar activeTab={activeTab ? { name: activeTab.name, path: activeTab.path, size: activeTab.sourceFile?.size, content: activeTab.content ?? undefined, isDirty: activeTab.isDirty } : null} />
          {toast && <div className={`app-toast is-${toast.kind}`} role="status" aria-live="polite"><i aria-hidden="true">{toast.kind === "success" ? "✓" : "!"}</i>{toast.message}</div>}
          <CommandPalette open={commandOpen} commands={commands} onClose={() => setCommandOpen(false)} />
        </div>
      </ThemeProvider>
    </I18nProvider>
  );
}

function EmptyState({ onOpenDialog }: { onOpenDialog: () => void }) {
  const { t } = useI18n();
  const formats = ["PDF", "DOCX", "XLSX", "DWG", "PSD", "APK", "ISO", "ZIP"];
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
          OPENME WORKSPACE
          <span className="eyebrow-line" />
        </div>
        <div className="hero-mark" aria-hidden="true">
          <i />
          <span>OM</span>
        </div>
        <h1 id="empty-title">{t("heroTitle")}</h1>
        <p>{t("heroSubtitle")}</p>
        <div className="empty-actions">
          <button type="button" className="hero-open-button" onClick={onOpenDialog}>
            {t("heroOpen")}
          </button>
          <span className="drop-hint">{t("heroDropHint")}</span>
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
