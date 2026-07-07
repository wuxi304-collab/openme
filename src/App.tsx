import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FileInfo, FileTabState, RecentFilesStore } from "./types";
import { detectCategory, detectLanguage } from "./utils/fileTypeDetector";
import Sidebar from "./components/layout/Sidebar";
import TitleBar from "./components/layout/TitleBar";
import StatusBar from "./components/layout/StatusBar";
import FileTabs from "./components/layout/FileTabs";
import CommandPalette, { type CommandItem } from "./components/CommandPalette";
import FileSummaryPanel from "./components/FileSummaryPanel";
import ErrorBoundary from "./components/ErrorBoundary";
import JsonViewer from "./components/viewers/JsonViewer";
import ImageViewer from "./components/viewers/ImageViewer";
import SvgViewer from "./components/viewers/SvgViewer";
import CadAssistant from "./components/viewers/CadAssistant";

const MAX_RECENT = 50;
const CodeEditor = React.lazy(() => import("./components/viewers/CodeEditor"));
const MarkdownViewer = React.lazy(() => import("./components/viewers/MarkdownViewer"));
const CsvViewer = React.lazy(() => import("./components/viewers/CsvViewer"));
const PdfViewer = React.lazy(() => import("./components/viewers/PdfViewer"));
const OfficeViewer = React.lazy(() => import("./components/viewers/OfficeViewer"));
const ZipViewer = React.lazy(() => import("./components/viewers/ZipViewer"));
const CadViewer = React.lazy(() => import("./components/viewers/CadViewer"));
const MediaViewer = React.lazy(() => import("./components/viewers/MediaViewer"));
const FontViewer = React.lazy(() => import("./components/viewers/FontViewer"));
const EpubViewer = React.lazy(() => import("./components/viewers/EpubViewer"));
const DwgViewer = React.lazy(() => import("./components/viewers/DwgViewer"));

declare global {
  interface Window {
    electronAPI: {
      getFileInfo: (path: string) => Promise<FileInfo>;
      loadRecentFiles: () => Promise<RecentFilesStore>;
      saveRecentFiles: (store: { files: FileInfo[]; version: number }) => Promise<void>;
      readFileContent: (path: string, maxSize?: number) => Promise<{ type: string; data?: string; mimeType?: string; message?: string }>;
      saveFile: (path: string, content: string) => Promise<{ success: boolean; message?: string }>;
      readBinary: (path: string, maxSize?: number) => Promise<{ success: boolean; data?: string; message?: string }>;
      convertDocx: (path: string) => Promise<{ success: boolean; html?: string; message?: string }>;
      convertExcel: (path: string) => Promise<{ success: boolean; sheets?: any[]; message?: string }>;
      openFileDialog: () => Promise<string[]>;
      openInSystem: (path: string) => Promise<void>;
      getAppVersion: () => Promise<string>;
      getMediaUrl: (path: string) => Promise<string>;
      readEpub: (path: string) => Promise<{ success: boolean; book?: { title: string; creator?: string; language?: string; cover?: { data: string; mimeType: string } | null; chapters: { title: string; text: string }[] }; message?: string }>;
      getCadEngineStatus: () => Promise<{ available: boolean; kind: string; name: string; capabilities: string[]; quality: string; fallback: boolean; message?: string }>;
      inspectCadDocument: (path: string) => Promise<{ success: boolean; document?: { document?: { entityCount?: number; layerCount?: number; blockCount?: number }; entityTypes?: Record<string, number> }; message?: string }>;
      renderCadDocument: (path: string) => Promise<{ success: boolean; svg?: string; message?: string }>;
      listZipContents: (path: string) => Promise<{ success: boolean; entries?: { name: string; isDir: boolean; size: number }[]; message?: string }>;
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
    };
  }
}

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

  useEffect(() => { const handler = (event: KeyboardEvent) => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "o") { event.preventDefault(); handleOpenDialog(); } }; window.addEventListener("keydown", handler); return () => window.removeEventListener("keydown", handler); }, [handleOpenDialog]);

  const handleContentChange = useCallback((content: string) => { if (!activeTabId) return; setTabs((prev) => prev.map((t) => t.id === activeTabId ? { ...t, content, isDirty: true } : t)); }, [activeTabId]);
  const handleDrop = useCallback((event: React.DragEvent) => { event.preventDefault(); const paths = Array.from(event.dataTransfer.files).map((file: any) => file.path).filter(Boolean); if (paths.length) handleFilePaths(paths); }, [handleFilePaths]);
  const activateRelativeTab = useCallback((direction: 1 | -1) => { if (tabs.length < 2) return; const current = Math.max(0, tabs.findIndex((tab) => tab.id === activeTabId)); setActiveTabId(tabs[(current + direction + tabs.length) % tabs.length].id); }, [tabs, activeTabId]);

  const commands = useMemo<CommandItem[]>(() => [
    { id: "open", label: "打开文件", detail: "从电脑选择一个或多个文件", shortcut: "Ctrl O", run: handleOpenDialog },
    { id: "save", label: "保存当前文件", detail: activeTab?.name ?? "没有打开文件", shortcut: "Ctrl S", disabled: !activeTab?.isDirty, run: handleSaveCurrent },
    { id: "system", label: "用系统程序打开", detail: activeTab?.path ?? "没有打开文件", disabled: !activeTab, run: () => { if (activeTab) window.electronAPI.openInSystem(activeTab.path); } },
    { id: "next", label: "切换到下个标签", detail: `${tabs.length} 个已打开标签`, shortcut: "Ctrl Tab", disabled: tabs.length < 2, run: () => activateRelativeTab(1) },
    { id: "close", label: "关闭当前标签", detail: activeTab?.name ?? "没有打开文件", shortcut: "Ctrl W", disabled: !activeTab, run: () => { if (activeTab) handleCloseTab(activeTab.id); } },
  ], [handleOpenDialog, handleSaveCurrent, activeTab, tabs.length, activateRelativeTab, handleCloseTab]);

  useEffect(() => { const handler = (event: KeyboardEvent) => { if ((event.ctrlKey || event.metaKey) && event.key.toLocaleLowerCase() === "k") { event.preventDefault(); setCommandOpen((value) => !value); return; } if (commandOpen) return; if ((event.ctrlKey || event.metaKey) && event.key.toLocaleLowerCase() === "w") { event.preventDefault(); if (activeTab) handleCloseTab(activeTab.id); } if ((event.ctrlKey || event.metaKey) && event.key === "Tab") { event.preventDefault(); activateRelativeTab(event.shiftKey ? -1 : 1); } }; window.addEventListener("keydown", handler, true); return () => window.removeEventListener("keydown", handler, true); }, [commandOpen, activeTab, handleCloseTab, activateRelativeTab]);

  return (
    <div className="flex flex-col mario-world" style={{ height: "100vh" }}>
      <TitleBar />
      <FileTabs tabs={tabs} activeId={activeTabId} onSelect={setActiveTabId} onClose={handleCloseTab} />
      <div className="flex flex-1 min-h-0" style={{ position: "relative", zIndex: 1 }}>
        <Sidebar files={filteredFiles} selectedPath={activeTab?.path ?? null} onSelect={handleSelectFile} onRemove={handleRemoveRecent} onOpenDialog={handleOpenDialog} searchValue={searchQuery} onSearchChange={setSearchQuery} />
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden" onDrop={handleDrop} onDragOver={(event) => event.preventDefault()}>
          {tabs.length === 0 ? <EmptyState onOpenDialog={handleOpenDialog} /> : activeTab ? (
            <div className="workspace-viewer-grid"><div className="workspace-viewer-main">{activeTab.isLoading ? <LoadingState /> : <TabContent tab={activeTab} onChange={handleContentChange} />}</div><FileSummaryPanel tab={activeTab} onOpenInSystem={() => window.electronAPI.openInSystem(activeTab.path)} /></div>
          ) : null}
        </main>
      </div>
      <StatusBar activeTab={activeTab ? { name: activeTab.name, size: activeTab.sourceFile?.size, content: activeTab.content ?? undefined, isDirty: activeTab.isDirty } : null} />
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

function ViewerBoundary({ children }: { children: React.ReactNode }) {
  return <ErrorBoundary><React.Suspense fallback={<LoadingState />}>{children}</React.Suspense></ErrorBoundary>;
}

function UnsupportedCard({ title, subtitle, description, onOpenInSystem }: { title: string; subtitle: string; description: string; onOpenInSystem: () => void }) {
  return <div className="unsupported-card"><div className="unsupported-icon" aria-hidden="true"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><circle cx="12" cy="15" r="1" /><path d="M12 12v1" /></svg></div><h3>{title}</h3><p className="unsupported-subtitle">{subtitle}</p><p>{description}</p><button type="button" onClick={onOpenInSystem}>用系统程序打开</button></div>;
}

function TabContent({ tab, onChange }: { tab: FileTabState; onChange: (content: string) => void }) {
  if (tab.error) return <div className="viewer-error" role="alert"><strong>无法预览</strong><p>{tab.error}</p><button type="button" onClick={() => window.electronAPI.openInSystem(tab.path)}>用系统程序打开</button></div>;
  switch (tab.category) {
    case "code": return <div className="flex-1 min-h-0 p-4"><ViewerBoundary><CodeEditor content={tab.content ?? ""} language={detectLanguage(tab.path)} onChange={onChange} /></ViewerBoundary></div>;
    case "markdown": return <div className="flex-1 min-h-0 p-4"><ViewerBoundary><MarkdownViewer content={tab.content ?? ""} onChange={onChange} /></ViewerBoundary></div>;
    case "json": return <div className="flex-1 min-h-0 p-4"><ViewerBoundary><JsonViewer content={tab.content ?? ""} onChange={onChange} /></ViewerBoundary></div>;
    case "csv": return <div className="flex-1 min-h-0 p-4"><ViewerBoundary><CsvViewer content={tab.content ?? ""} /></ViewerBoundary></div>;
    case "image": return <div className="flex-1 min-h-0 p-4"><ViewerBoundary>{tab.binaryData ? <ImageViewer base64Data={tab.binaryData} mimeType={tab.mimeType ?? "image/png"} /> : <div className="empty-viewer-message">无法加载图片</div>}</ViewerBoundary></div>;
    case "svg": return <div className="flex-1 min-h-0 p-4"><ViewerBoundary>{tab.binaryData ? <SvgViewer base64Data={tab.binaryData} /> : <div className="empty-viewer-message">无法加载 SVG</div>}</ViewerBoundary></div>;
    case "pdf": return <div className="flex-1 min-h-0 p-4">{tab.binaryData ? <ViewerBoundary><PdfViewer base64Data={tab.binaryData} /></ViewerBoundary> : <div className="empty-viewer-message">无法加载 PDF</div>}</div>;
    case "office": return <div className="flex-1 min-h-0 p-4">{tab.officeData ? <ViewerBoundary><OfficeViewer data={tab.officeData as any} /></ViewerBoundary> : <div className="empty-viewer-message">正在转换 Office 文件...</div>}</div>;
    case "archive": return <div className="flex-1 min-h-0 p-4"><ViewerBoundary><ZipViewer zipPath={tab.path} /></ViewerBoundary></div>;
    case "cad": return <div className="flex-1 min-h-0 p-4">{tab.binaryData ? <ViewerBoundary><CadViewer base64Data={tab.binaryData} filePath={tab.path} /></ViewerBoundary> : <div className="empty-viewer-message">无法加载 3D 模型</div>}</div>;
    case "epub": return <div className="flex-1 min-h-0 p-4"><ViewerBoundary><EpubViewer filePath={tab.path} /></ViewerBoundary></div>;
    case "audio":
    case "video": return <div className="flex-1 min-h-0 p-4"><ViewerBoundary><MediaViewer filePath={tab.path} kind={tab.category} /></ViewerBoundary></div>;
    case "font": return <div className="flex-1 min-h-0 p-4"><ViewerBoundary>{tab.binaryData ? <FontViewer base64Data={tab.binaryData} fileName={tab.name} /> : <div className="viewer-error"><strong>字体无法加载</strong></div>}</ViewerBoundary></div>;
    case "dwg": return <div className="cad-workspace"><div className="cad-stage"><ViewerBoundary><DwgViewer filePath={tab.path} fileName={tab.name} /></ViewerBoundary></div><CadAssistant filePath={tab.path} fileName={tab.name} /></div>;
    case "design": return <SemanticRouteCard tab={tab} title="设计源文件" description="该文件已被识别为设计源文件。OpenMe 当前提供语义检查、风险边界和系统程序路由，不承诺源软件级高保真预览。" />;
    case "package": return <SemanticRouteCard tab={tab} title="安装包 / 应用包" description="该文件已被识别为安装包或应用包。OpenMe 不执行安装器、不运行未知二进制，只提供本地识别和外部打开。" />;
    case "disk": return <SemanticRouteCard tab={tab} title="磁盘镜像 / 虚拟机镜像" description="该文件已被识别为镜像文件。OpenMe 不自动挂载、不自动解包、不自动启动，仅提供识别和外部打开。" />;
    default: return <div className="flex-1 flex items-center justify-center p-6"><UnsupportedCard title="未知文件格式" subtitle={tab.name} description="该格式暂不支持内置预览，请使用系统程序打开。" onOpenInSystem={() => window.electronAPI.openInSystem(tab.path)} /></div>;
  }
}

function SemanticRouteCard({ tab, title, description }: { tab: FileTabState; title: string; description: string }) {
  return <div className="flex-1 flex items-center justify-center p-6"><UnsupportedCard title={title} subtitle={tab.name} description={description} onOpenInSystem={() => window.electronAPI.openInSystem(tab.path)} /></div>;
}

function getMimeType(ext: string): string {
  const map: Record<string, string> = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif", ".bmp": "image/bmp", ".webp": "image/webp", ".svg": "image/svg+xml", ".pdf": "application/pdf" };
  return map[ext.toLowerCase()] ?? "application/octet-stream";
}
