import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FileInfo, FileTabState } from "./types";
import { detectCategory } from "./utils/fileTypeDetector";
import Sidebar from "./components/layout/Sidebar";
import TitleBar from "./components/layout/TitleBar";
import StatusBar from "./components/layout/StatusBar";
import FileTabs from "./components/layout/FileTabs";
import CommandPalette, { type CommandItem } from "./components/CommandPalette";
import FileSummaryPanel from "./components/FileSummaryPanel";
import ViewerRouter from "./components/viewers/ViewerRouter";

const MAX_RECENT = 50;

export default function App() {
  const [recentFiles, setRecentFiles] = useState<FileInfo[]>([]);
  const [tabs, setTabs] = useState<FileTabState[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [toast, setToast] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const [commandOpen, setCommandOpen] = useState(false);

  useEffect(() => { window.electronAPI.loadRecentFiles().then((store) => setRecentFiles(store.files)).catch(console.error); }, []);

  const filteredFiles = useMemo(() => {
    if (!searchQuery.trim()) return recentFiles;
    const q = searchQuery.toLowerCase();
    return recentFiles.filter((f) => f.name.toLowerCase().includes(q) || f.path.toLowerCase().includes(q) || f.extension.toLowerCase().includes(q));
  }, [recentFiles, searchQuery]);

  const activeTab = useMemo(() => tabs.find((t) => t.id === activeTabId) ?? null, [tabs, activeTabId]);
  const hasDirtyTabs = tabs.some((tab) => tab.isDirty);

  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(null), 2600); return () => window.clearTimeout(timer); }, [toast]);
  useEffect(() => { window.electronAPI.setDirtyState(hasDirtyTabs).catch(() => undefined); }, [hasDirtyTabs]);

  const handleSaveCurrent = useCallback(async () => {
    const tab = activeTab;
    if (!tab || !tab.isDirty || tab.content === null) return;
    const result = await window.electronAPI.saveFile(tab.path, tab.content);
    if (result.success) {
      setTabs((prev) => prev.map((t) => t.id === tab.id ? { ...t, isDirty: false } : t));
      setToast({ kind: "success", message: `已保存 ${tab.name}` });
    } else setToast({ kind: "error", message: result.message ?? "保存失败" });
  }, [activeTab]);

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
      if (category === "office") {
        const ext = fileInfo.extension.toLowerCase();
        if (ext === ".docx") {
          const res = await window.electronAPI.convertDocx(fileInfo.path);
          setTabs((prev) => prev.map((t) => t.id === id ? { ...t, isLoading: false, officeData: res.success ? { type: "docx", html: res.html ?? "" } : undefined, error: res.success ? undefined : res.message ?? "Word 转换失败" } : t));
        } else if (ext === ".xlsx") {
          const res = await window.electronAPI.convertExcel(fileInfo.path);
          setTabs((prev) => prev.map((t) => t.id === id ? { ...t, isLoading: false, officeData: res.success ? { type: "excel", sheets: res.sheets ?? [] } : undefined, error: res.success ? undefined : res.message ?? "Excel 转换失败" } : t));
        } else setTabs((prev) => prev.map((t) => t.id === id ? { ...t, isLoading: false, officeData: { type: "pptx" } } : t));
      } else if (category === "audio" || category === "video" || category === "epub") {
        setTabs((prev) => prev.map((t) => t.id === id ? { ...t, isLoading: false } : t));
      } else if (category === "design" || category === "package" || category === "disk" || category === "other") {
        setTabs((prev) => prev.map((t) => t.id === id ? { ...t, isLoading: false } : t));
      } else if (category === "svg" || category === "image" || category === "pdf" || category === "cad" || category === "font") {
        const maxSize = category === "pdf" || category === "cad" ? 100 * 1024 * 1024 : category === "font" ? 25 * 1024 * 1024 : 50 * 1024 * 1024;
        const res = await window.electronAPI.readBinary(fileInfo.path, maxSize);
        setTabs((prev) => prev.map((t) => t.id === id ? { ...t, isLoading: false, binaryData: res.success ? res.data : undefined, mimeType: getMimeType(fileInfo.extension), error: res.success ? undefined : res.message ?? "无法读取文件" } : t));
      } else {
        const res = await window.electronAPI.readFileContent(fileInfo.path);
        setTabs((prev) => prev.map((t) => t.id === id ? { ...t, isLoading: false, content: res.type === "text" ? res.data ?? null : null, binaryData: res.type === "binary" ? res.data : undefined, mimeType: res.mimeType } : t));
      }
    } catch (error) {
      setTabs((prev) => prev.map((t) => t.id === id ? { ...t, isLoading: false, error: error instanceof Error ? error.message : "读取失败" } : t));
    }
  }, [tabs]);

  const addToRecent = useCallback(async (file: FileInfo) => { const updated = [file, ...recentFiles.filter((f) => f.path !== file.path)].slice(0, MAX_RECENT); setRecentFiles(updated); await window.electronAPI.saveRecentFiles({ files: updated, version: 1 }); }, [recentFiles]);
  const handleFilePaths = useCallback(async (paths: string[]) => { for (const p of paths) { try { const fileInfo = await window.electronAPI.getFileInfo(p); fileInfo.file_type = detectCategory(p) as any; await addToRecent(fileInfo); await openFileInTab(fileInfo); } catch (error) { console.error("Open file error:", error); } } }, [addToRecent, openFileInTab]);
  const handleSelectFile = useCallback(async (file: FileInfo) => { await openFileInTab(file); }, [openFileInTab]);
  const handleRemoveRecent = useCallback(async (file: FileInfo) => { const updated = recentFiles.filter((item) => item.path !== file.path); setRecentFiles(updated); await window.electronAPI.saveRecentFiles({ files: updated, version: 1 }); setToast({ kind: "success", message: `已从最近文件移除 ${file.name}` }); }, [recentFiles]);
  const handleCloseTab = useCallback((tabId: string) => { const closingTab = tabs.find((tab) => tab.id === tabId); if (closingTab?.isDirty && !window.confirm(`“${closingTab.name}”有未保存修改，仍要关闭吗？`)) return; setTabs((prev) => { const idx = prev.findIndex((t) => t.id === tabId); const newTabs = prev.filter((t) => t.id !== tabId); if (activeTabId === tabId) { if (newTabs.length > 0) setActiveTabId(newTabs[Math.min(idx, newTabs.length - 1)].id); else setActiveTabId(null); } return newTabs; }); }, [activeTabId, tabs]);
  const handleOpenDialog = useCallback(async () => { try { const paths = await window.electronAPI.openFileDialog(); if (paths?.length) handleFilePaths(paths); } catch (error) { console.error("Dialog error:", error); } }, [handleFilePaths]);
  const handleCloseAllTabs = useCallback(() => { if (hasDirtyTabs && !window.confirm("存在未保存修改，仍要关闭全部标签吗？")) return; setTabs([]); setActiveTabId(null); }, [hasDirtyTabs]);

  useEffect(() => { const handler = (event: KeyboardEvent) => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "o") { event.preventDefault(); handleOpenDialog(); } }; window.addEventListener("keydown", handler); return () => window.removeEventListener("keydown", handler); }, [handleOpenDialog]);

  const handleContentChange = useCallback((content: string) => { if (!activeTabId) return; setTabs((prev) => prev.map((t) => t.id === activeTabId ? { ...t, content, isDirty: true } : t)); }, [activeTabId]);
  const handleDrop = useCallback((event: React.DragEvent) => { event.preventDefault(); const paths = Array.from(event.dataTransfer.files).map((file: any) => file.path).filter(Boolean); if (paths.length) handleFilePaths(paths); }, [handleFilePaths]);
  const activateRelativeTab = useCallback((direction: 1 | -1) => { if (tabs.length < 2) return; const current = Math.max(0, tabs.findIndex((tab) => tab.id === activeTabId)); setActiveTabId(tabs[(current + direction + tabs.length) % tabs.length].id); }, [tabs, activeTabId]);

  const commands = useMemo<CommandItem[]>(() => {
    const baseCommands: CommandItem[] = [
      { id: "open", label: "打开文件", detail: "从电脑选择一个或多个文件", shortcut: "Ctrl O", kind: "file", keywords: ["open", "file"], run: handleOpenDialog },
      { id: "save", label: "保存当前文件", detail: activeTab?.name ?? "没有打开文件", shortcut: "Ctrl S", kind: "file", keywords: ["save"], disabled: !activeTab?.isDirty, run: handleSaveCurrent },
      { id: "system", label: "用系统程序打开", detail: activeTab?.path ?? "没有打开文件", kind: "system", keywords: ["external", "system"], disabled: !activeTab, run: () => { if (activeTab) window.electronAPI.openInSystem(activeTab.path); } },
      { id: "next", label: "切换到下个标签", detail: `${tabs.length} 个已打开标签`, shortcut: "Ctrl Tab", kind: "tab", disabled: tabs.length < 2, run: () => activateRelativeTab(1) },
      { id: "prev", label: "切换到上个标签", detail: `${tabs.length} 个已打开标签`, shortcut: "Ctrl Shift Tab", kind: "tab", disabled: tabs.length < 2, run: () => activateRelativeTab(-1) },
      { id: "close", label: "关闭当前标签", detail: activeTab?.name ?? "没有打开文件", shortcut: "Ctrl W", kind: "tab", disabled: !activeTab, run: () => { if (activeTab) handleCloseTab(activeTab.id); } },
      { id: "close-all", label: "关闭全部标签", detail: `${tabs.length} 个已打开标签`, kind: "workspace", disabled: tabs.length === 0, run: handleCloseAllTabs },
      { id: "clear-search", label: "清空最近文件搜索", detail: searchQuery ? `当前搜索：${searchQuery}` : "没有搜索条件", kind: "workspace", disabled: !searchQuery, run: () => setSearchQuery("") },
    ];
    const tabCommands = tabs.map((tab, index) => ({ id: `tab-${tab.id}`, label: `切换标签：${tab.name}`, detail: tab.path, kind: "tab" as const, shortcut: index < 9 ? `Alt ${index + 1}` : undefined, keywords: [tab.category], run: () => setActiveTabId(tab.id) }));
    const recentCommands = recentFiles.slice(0, 8).map((file) => ({ id: `recent-${file.path}`, label: `打开最近文件：${file.name}`, detail: file.path, kind: "recent" as const, keywords: [file.extension, file.file_type], run: () => { void openFileInTab(file); } }));
    return [...baseCommands, ...tabCommands, ...recentCommands];
  }, [handleOpenDialog, activeTab, tabs, searchQuery, handleSaveCurrent, activateRelativeTab, handleCloseTab, handleCloseAllTabs, recentFiles, openFileInTab]);

  useEffect(() => { const handler = (event: KeyboardEvent) => { if ((event.ctrlKey || event.metaKey) && event.key.toLocaleLowerCase() === "k") { event.preventDefault(); setCommandOpen((value) => !value); return; } if (commandOpen) return; if ((event.ctrlKey || event.metaKey) && event.key.toLocaleLowerCase() === "w") { event.preventDefault(); if (activeTab) handleCloseTab(activeTab.id); } if ((event.ctrlKey || event.metaKey) && event.key === "Tab") { event.preventDefault(); activateRelativeTab(event.shiftKey ? -1 : 1); } if (event.altKey && /^[1-9]$/.test(event.key)) { const target = tabs[Number(event.key) - 1]; if (target) { event.preventDefault(); setActiveTabId(target.id); } } }; window.addEventListener("keydown", handler, true); return () => window.removeEventListener("keydown", handler, true); }, [commandOpen, activeTab, handleCloseTab, activateRelativeTab, tabs]);

  return (
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
  );
}

function EmptyState({ onOpenDialog }: { onOpenDialog: () => void }) {
  const formats = ["PDF", "DOCX", "XLSX", "DWG", "PSD", "APK", "ISO", "ZIP"];
  return <section className="empty-workspace" aria-labelledby="empty-title"><div className="sky-grid" aria-hidden="true"><span className="pixel-cloud cloud-one" /><span className="pixel-cloud cloud-two" /><span className="floating-coin coin-one" /><span className="floating-coin coin-two" /><span className="scenery-hill hill-one" /><span className="scenery-hill hill-two" /></div><div className="welcome-panel"><div className="welcome-eyebrow"><span className="eyebrow-line" />OPENME WORKSPACE<span className="eyebrow-line" /></div><div className="hero-mark" aria-hidden="true"><i /><span>OM</span></div><h1 id="empty-title">打开文件，先看懂边界</h1><p>拖进来直接预览、识别或路由到系统程序。文件默认只在本地处理。</p><div className="empty-actions"><button type="button" className="hero-open-button" onClick={onOpenDialog}>选择文件</button><span className="drop-hint">也可以拖放到这里</span></div><div className="format-row" aria-label="支持的文件格式">{formats.map((format) => <span key={format}>{format}</span>)}</div></div><div className="workspace-ground" aria-hidden="true"><span className="ground-pipe" /><span className="ground-bricks" /></div></section>;
}

function LoadingState() { return <div className="loading-state"><div className="loading-card"><div className="loading-dot-row"><div className="loading-dot" /><div className="loading-dot" /><div className="loading-dot" /></div><p>正在加载文件...</p></div></div>; }

function getMimeType(ext: string): string {
  const map: Record<string, string> = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif", ".bmp": "image/bmp", ".webp": "image/webp", ".svg": "image/svg+xml", ".pdf": "application/pdf" };
  return map[ext.toLowerCase()] ?? "application/octet-stream";
}
