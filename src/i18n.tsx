import React, { createContext, useContext, useEffect, useState } from "react";

export const translations: Record<string, Record<string, string>> = {
  zh: {
    // TitleBar
    appName: "文件工作台",
    world: "WORLD 1–1",
    minimize: "最小化窗口",
    maximize: "最大化窗口",
    restore: "还原窗口",
    close: "关闭窗口",
    light: "明亮",
    dark: "暗色",
    language: "语言",
    chinese: "中文",
    english: "English",
    selectFile: "选择文件",
    openInSystem: "用系统程序打开",
    openInSystemLong: "用系统默认程序打开",

    // Sidebar
    openFile: "打开文件",
    searchRecent: "搜索最近文件",
    searchRecentPlaceholder: "搜索最近文件…",
    recentOpened: "最近打开",
    noFilesYet: "还没有文件",
    openFileHint: "打开一个文件，它会留在这里",
    localMode: "本地模式",
    capabilityTitle: "能力包建议",
    localGuess: "本地判断",
    awaitingFile: "待打开文件",
    capabilityDesc: "打开文件后，OpenMe 会根据格式和文件名给出可用能力包建议。",
    capCardAria: "可能适用的能力包",
    currentFileFlag: "当前文件",
    removeFromListAria: "从列表移除",
    removeFromListTitle: "从列表移除",
    removeFromRecent: "从最近文件移除",
    extensionOrFile: "文件",

    // Hero / EmptyState
    heroEyebrow: "OPENME WORKSPACE",
    heroMark: "OM",
    heroTitle: "打开文件，先看懂边界",
    heroSubtitle: "拖进来直接预览、识别或路由到系统程序。文件默认只在本地处理。",
    heroDropHint: "也可以拖放到这里",
    heroOpen: "选择文件",
    heroFormatsLabel: "支持的文件格式",

    // LoadingState
    loadingFile: "正在加载文件...",

    // StatusBar
    ready: "READY",
    modified: "已修改",
    waitingForFile: "等待打开文件",
    lines: "行",
    saveShortcut: "Ctrl S 保存",
    localFirst: "本地优先",
    livesAria: "本地处理",

    // FileTabs
    fileTabsAria: "打开的文件",
    workspaceSet: "工作集",
    unsaved: "未保存",
    closeTabAria: "关闭 {name}",

    // CommandPalette
    commandPaletteAria: "命令面板",
    searchCommandsAria: "搜索命令",
    searchCommandsPlaceholder: "输入命令、文件名或快捷键…",
    availableCommandsAria: "可用命令",
    noMatchingCommands: "没有匹配命令",
    paletteNavHint: "↑↓ 选择",
    paletteEnterHint: "Enter 执行",
    paletteEscHint: "Esc 关闭",
    paletteCount: "{shown} / {total} 项",

    // FileDropZone
    dropHere: "将文件拖入此处",
    dropRelease: "松开以打开",
    dropHint: "支持 PDF、图片、文档、代码等所有常见格式",
    imageCat: "图片",
    textCat: "文本",
    codeCat: "代码",
    dropCatImage: "图片",
    dropCatText: "文本",
    dropCatCode: "代码",

    // FileMetadata
    fileInfo: "文件信息",
    metaName: "文件名",
    metaType: "类型",
    metaSize: "大小",
    metaModified: "修改时间",
    metaPath: "路径",
    openInSystemApp: "用系统默认程序打开",
    unknownSize: "未知大小",

    // FileSummaryPanel
    fileSummaryAria: "文件摘要",
    capabilityGridAria: "格式能力卡",

    // RecentFiles (legacy empty state, kept for compatibility)
    noRecentFiles: "暂无最近文件",
    dropHintRecent: "拖拽文件到右侧区域开始",

    // ErrorBoundary
    viewerErrorKicker: "Viewer Boundary",
    viewerErrorTitle: "预览器出现错误",
    viewerErrorBody: "当前 Viewer 已被隔离，OpenMe 主工作台仍可继续使用。",
    viewerErrorRetry: "重试当前预览",

    // PreviewPane
    contentPreview: "内容预览",
    linesCountSuffix: "行",
    previewLoading: "正在加载...",
    pdfPreviewTitle: "PDF 预览功能即将到来",
    pdfPreviewSub: "点击上方按钮使用系统默认程序查看",
    imagePreviewTitle: "图片预览功能即将到来",
    imagePreviewSub: "点击上方按钮使用系统默认程序查看",
    unsupportedPreviewTitle: "该文件类型暂不支持内置预览",
    unsupportedPreviewSub: "点击上方按钮使用系统默认程序查看",

    // Toasts
    saveSuccess: "已保存 {name}",
    saveFailed: "保存失败",
        readFailed: "读取失败",
        removeFromRecentToast: "已从最近文件移除 {name}",

    // Close confirm
    unsavedCloseOne: "“{name}”有未保存修改，仍要关闭吗？",
    unsavedCloseAll: "存在未保存修改，仍要关闭全部标签吗？",

    // Command palette items
    cmdOpenFile: "打开文件",
    cmdOpenFileDetail: "从电脑选择一个或多个文件",
    cmdSave: "保存当前文件",
    cmdSaveDetailNoFile: "没有打开文件",
    cmdOpenInSystem: "用系统程序打开",
    cmdOpenInSystemDetailNoFile: "没有打开文件",
    cmdNextTab: "切换到下个标签",
    cmdPrevTab: "切换到上个标签",
    cmdTabCountDetail: "{count} 个已打开标签",
    cmdCloseTab: "关闭当前标签",
    cmdCloseAll: "关闭全部标签",
    cmdClearSearch: "清空最近文件搜索",
    cmdClearSearchDetailActive: "当前搜索：{query}",
    cmdClearSearchDetailEmpty: "没有搜索条件",
    cmdSwitchTab: "切换标签：{name}",
    cmdOpenRecent: "打开最近文件：{name}",

    // FileTypeIcon
    fileTypeSuffix: "文件",
  },
  en: {
    // TitleBar
    appName: "File Workbench",
    world: "WORLD 1–1",
    minimize: "Minimize",
    maximize: "Maximize",
    restore: "Restore",
    close: "Close",
    light: "Light",
    dark: "Dark",
    language: "Language",
    chinese: "中文",
    english: "English",
    selectFile: "Select files",
    openInSystem: "Open in system",
    openInSystemLong: "Open with system default app",

    // Sidebar
    openFile: "Open file",
    searchRecent: "Search recent files",
    searchRecentPlaceholder: "Search recent files…",
    recentOpened: "Recent",
    noFilesYet: "No files yet",
    openFileHint: "Open a file and it will stay here",
    localMode: "Local mode",
    capabilityTitle: "Capability suggestions",
    localGuess: "Local guess",
    awaitingFile: "Waiting for a file",
    capabilityDesc: "OpenMe suggests applicable capability packs based on file format and name.",
    capCardAria: "Possible capability packs",
    currentFileFlag: "Current file",
    removeFromListAria: "Remove from list",
    removeFromListTitle: "Remove from list",
    removeFromRecent: "Remove {name} from recent",
    extensionOrFile: "file",

    // Hero / EmptyState
    heroEyebrow: "OPENME WORKSPACE",
    heroMark: "OM",
    heroTitle: "Open a file, know its boundaries first",
    heroSubtitle: "Drop in for instant preview, identification, or routing to a system app. Files are processed locally by default.",
    heroDropHint: "You can also drop files here",
    heroOpen: "Pick files",
    heroFormatsLabel: "Supported file formats",

    // LoadingState
    loadingFile: "Loading file...",

    // StatusBar
    ready: "READY",
    modified: "Modified",
    waitingForFile: "Waiting for a file",
    lines: "lines",
    saveShortcut: "Ctrl S to save",
    localFirst: "Local first",
    livesAria: "Local processing",

    // FileTabs
    fileTabsAria: "Open files",
    workspaceSet: "Workspace",
    unsaved: "Unsaved",
    closeTabAria: "Close {name}",

    // CommandPalette
    commandPaletteAria: "Command palette",
    searchCommandsAria: "Search commands",
    searchCommandsPlaceholder: "Type a command, file name, or shortcut…",
    availableCommandsAria: "Available commands",
    noMatchingCommands: "No matching commands",
    paletteNavHint: "↑↓ to navigate",
    paletteEnterHint: "Enter to run",
    paletteEscHint: "Esc to close",
    paletteCount: "{shown} / {total} items",

    // FileDropZone
    dropHere: "Drop files here",
    dropRelease: "Release to open",
    dropHint: "Supports PDF, images, documents, code and other common formats",
    imageCat: "Images",
    textCat: "Text",
    codeCat: "Code",
    dropCatImage: "Images",
    dropCatText: "Text",
    dropCatCode: "Code",

    // FileMetadata
    fileInfo: "File info",
    metaName: "Name",
    metaType: "Type",
    metaSize: "Size",
    metaModified: "Modified",
    metaPath: "Path",
    openInSystemApp: "Open with system default",
    unknownSize: "Unknown size",

    // FileSummaryPanel
    fileSummaryAria: "File summary",
    capabilityGridAria: "Capability grid",

    // RecentFiles
    noRecentFiles: "No recent files",
    dropHintRecent: "Drop files on the right area to start",

    // ErrorBoundary
    viewerErrorKicker: "Viewer Boundary",
    viewerErrorTitle: "Viewer error",
    viewerErrorBody: "This viewer has been isolated. The OpenMe workbench keeps running.",
    viewerErrorRetry: "Retry preview",

    // PreviewPane
    contentPreview: "Content preview",
    linesCountSuffix: "lines",
    previewLoading: "Loading...",
    pdfPreviewTitle: "PDF preview coming soon",
    pdfPreviewSub: "Use the system default app via the button above",
    imagePreviewTitle: "Image preview coming soon",
    imagePreviewSub: "Use the system default app via the button above",
    unsupportedPreviewTitle: "No built-in preview for this file type",
    unsupportedPreviewSub: "Use the system default app via the button above",

    // Toasts
    saveSuccess: "Saved {name}",
    saveFailed: "Save failed",
        readFailed: "Read failed",
        removeFromRecentToast: "Removed {name} from recent",

    // Close confirm
    unsavedCloseOne: "“{name}” has unsaved changes. Close anyway?",
    unsavedCloseAll: "There are unsaved changes. Close all tabs anyway?",

    // Command palette items
    cmdOpenFile: "Open file",
    cmdOpenFileDetail: "Pick one or more files from this computer",
    cmdSave: "Save current file",
    cmdSaveDetailNoFile: "No file open",
    cmdOpenInSystem: "Open with system app",
    cmdOpenInSystemDetailNoFile: "No file open",
    cmdNextTab: "Switch to next tab",
    cmdPrevTab: "Switch to previous tab",
    cmdTabCountDetail: "{count} open tabs",
    cmdCloseTab: "Close current tab",
    cmdCloseAll: "Close all tabs",
    cmdClearSearch: "Clear recent file search",
    cmdClearSearchDetailActive: "Current search: {query}",
    cmdClearSearchDetailEmpty: "No active search",
    cmdSwitchTab: "Switch tab: {name}",
    cmdOpenRecent: "Open recent: {name}",

    // FileTypeIcon
    fileTypeSuffix: "file",
  }
};

// Simple template substitution: replaces {name} / {count} / {query} with values
export function format(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const value = params[key];
    return value === undefined || value === null ? `{${key}}` : String(value);
  });
}

type Lang = "zh" | "en";
const STORAGE_KEY = "openme.lang";

const I18nContext = createContext({
  lang: "zh" as Lang,
  setLang: (_l: Lang) => {},
  t: (key: string) => key,
  tf: (key: string, _params?: Record<string, string | number>) => key,
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    try {
      const s = localStorage.getItem(STORAGE_KEY);
      if (s === "en") return "en" as Lang;
    } catch (e) {}
    return "zh" as Lang;
  });
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, lang); } catch { }
    try { document.documentElement.lang = lang === "en" ? "en" : "zh-CN"; } catch { }
  }, [lang]);
  const setLang = (next: Lang) => setLangState(next);
  const t = (key: string) => {
    return (translations[lang] && translations[lang][key]) ? translations[lang][key] : key;
  };
  const tf = (key: string, params?: Record<string, string | number>) => {
    const raw = (translations[lang] && translations[lang][key]) ? translations[lang][key] : key;
    return format(raw, params);
  };
  return <I18nContext.Provider value={{ lang, setLang, t, tf }}>{children}</I18nContext.Provider>;
}

export function useI18n() { return useContext(I18nContext); }
