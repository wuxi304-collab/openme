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
    fileBriefKicker: "File Brief",
    registrySection: "Format Registry",
    signalsSection: "Signals",
    evidenceSection: "Evidence",
    boundarySection: "Boundary",
    nextActionsSection: "Next Actions",
    summaryViewer: "Viewer",
    summaryStrategy: "Strategy",
    summaryRisk: "Risk",
    summarySupportBadge: "Support {level}",
    capDetect: "Detect",
    capPreview: "Preview",
    capEdit: "Edit",
    capMetadata: "Metadata",
    capThumbnail: "Thumbnail",
    capAiSummary: "AI Summary",
    capExternal: "External",

    // ImageViewer
    imageLabel: "图片",
    imageAlt: "图片预览",
    imageToolsAria: "图片工具",
    imageFit: "适应",
    imageZoomIn: "放大",
    imageZoomOut: "缩小",
    imageRotateCcw: "逆时针旋转",
    imageRotateCw: "顺时针旋转",

    // JsonViewer
    jsonSyntaxError: "JSON 语法错误",
    jsonSyntaxBadge: "语法错误",
    jsonExpand: "展开",
    jsonCollapse: "折叠",
    jsonExpandAria: "展开 {key}",
    jsonCollapseAria: "折叠 {key}",

    // CodeEditor
    codeEditorLabel: "</> 代码编辑器",
    codeEditorLoading: "加载编辑器…",

    // MarkdownViewer
    mdModeEdit: "编辑",
    mdModeSplit: "分栏",
    mdModePreview: "预览",
    mdPreviewFrameTitle: "Markdown 预览",
    mdRenderError: "渲染错误",

    // SvgViewer
    svgLabel: "SVG",
    svgAlt: "SVG 图像预览",
    svgToolsAria: "SVG 缩放",
    svgFit: "适应",
    svgZoomIn: "放大",
    svgZoomOut: "缩小",

    // CsvViewer
    csvRows: "行",
    csvColumns: "列",
    csvSearchAria: "搜索表格",
    csvSearchPlaceholder: "搜索单元格…",
    csvErrors: "发现 {count} 处格式问题",
    csvEmptyTitle: "CSV 为空",
    csvEmptySub: "文件中没有可显示的行。",
    csvNoMatchTitle: "没有匹配项",
    csvNoMatchSub: "换个关键词试试。",
    csvPrev: "上一页",
    csvNext: "下一页",
    csvCol: "第 {n} 列",
    csvHeaderSummary: "{rows} 行 × {cols} 列",

    // PdfViewer
    pdfLabel: "PDF",
    pdfSearchAria: "全文搜索",
    pdfSearchPlaceholder: "全文搜索…",
    pdfSearchSubmit: "搜索",
    pdfSearchBusy: "搜索中…",
    pdfPrevPage: "上一页",
    pdfNextPage: "下一页",
    pdfPageAria: "页码",
    pdfRotateCwAria: "顺时针旋转",
    pdfZoomAria: "缩放比例",
    pdfMatchCount: "{count} 处匹配",
    pdfMatchPage: "第 {n} 页",
    pdfOpening: "正在打开 PDF…",
    pdfRenderingPage: "正在绘制页面…",
    pdfLoadFailed: "PDF 加载失败",
    pdfCanvasInitFailed: "无法初始化 PDF 画布",
    pdfRenderFailed: "页面渲染失败",
    pdfSearchFailed: "PDF 搜索失败",
    pdfErrorTitle: "PDF 无法预览",

    // FontViewer
    fontLabel: "字体",
    fontSizeLabel: "字号",
    fontSizeAria: "预览文字",
    fontSizePlaceholder: "输入预览文字…",
    fontEmptyState: "输入文字开始预览",
    fontLoading: "正在加载字体…",
    fontErrorTitle: "字体无法加载",
    fontErrorBody: "文件可能损坏或使用了不支持的字体容器。",
    fontSample1: "OpenMe 字体预览",
    fontSample2: "天地玄黄 宇宙洪荒",
    fontSample3: "Aa Bb Cc 0123456789",
    fontSample4: "不锈钢工程图纸 GB/T 24511",

    // EpubViewer
    epubLoadFailed: "EPUB 无法读取",
    epubErrorTitle: "EPUB 无法预览",
    epubOpenInSystem: "系统打开",
    epubLoading: "正在整理章节…",
    epubCoverAlt: "书籍封面",
    epubProgressAria: "阅读进度 {n}%",
    epubChapterCounter: "{current} / {total} 章",
    epubSearchAria: "搜索本章",
    epubSearchPlaceholder: "搜索本章…",
    epubDecFontAria: "减小字号",
    epubIncFontAria: "增大字号",
    epubDecFont: "字−",
    epubIncFont: "字＋",
    epubPrev: "上一章",
    epubNext: "下一章",
    epubTocAria: "章节目录",

    // MediaViewer
    mediaLoadFailed: "媒体无法打开",
    mediaVideoLabel: "视频",
    mediaAudioLabel: "音频",
    mediaVideoCodecHint: "本地视频播放 · 解码能力取决于 Electron / Chromium / 系统编码器",
    mediaAudioCodecHint: "本地音频播放 · 解码能力取决于 Electron / Chromium / 系统编码器",
    mediaLoading: "正在载入…",
    mediaVideoFallbackBody: "浏览器不支持视频播放。",
    mediaAudioFallbackBody: "浏览器不支持音频播放。",
    mediaCodecUnsupported: "容器已识别，但当前编码可能不受内置播放器支持。",
    mediaBadgeVideo: "影",
    mediaBadgeAudio: "声",
    mediaVideoErrorTitle: "视频无法内置播放",
    mediaAudioErrorTitle: "音频无法内置播放",
    mediaCodecExplainer1: "OpenMe 已识别该媒体文件，但容器格式不等于编码器可解码。MOV、MKV、AVI、WMV、HEVC、ProRes 等文件是否能播放，取决于 Electron、Chromium 与系统环境。",
    mediaLocalDisclaimer: "源文件未被修改，未上传。",
    mediaOpenInSystem: "用系统程序打开",

    // OfficeViewer
    officeWordLabel: "Word 文档",
    officeWordFrameTitle: "Word 文档预览",
    officeExcelLabel: "Excel",
    officeSheetEmptyTitle: "工作表为空",
    officeSheetEmptyBody: "“{name}”中没有单元格数据。",
    officeSheetMissingTitle: "没有工作表",
    officeSheetMissingBody: "该文件未包含可读取的表格。",
    officePptxTitle: "PPTX 动画无法预览",
    officePptxBody: "请使用「用系统默认程序打开」查看完整内容",
    officeRowColSummary: "{rows} 行 × {cols} 列",
    officeExcelCol: "第 {n} 列",
    officeExcelPrev: "上一页",
    officeExcelNext: "下一页",
    officeExcelPage: "{current} / {total}",

    // ZipViewer
    zipLoadError: "无法读取压缩包",
    zipLoading: "正在读取压缩包…",
    zipUnzipping: "解压中…",
    zipUnzip: "解压到文件夹",
    zipCount: "{files} 文件 / {dirs} 文件夹",
    zipEmpty: "压缩包为空",
    zipPreviewHeader: "预览：{name}",
    zipPreviewUnsupported: "该文件不支持预览",
    zipPreviewPrompt: "点击文件预览内容",
    zipReadError: "[ 读取失败: {message} ]",
    zipReadErrorShort: "[ 读取失败 ]",
    zipActionError: "解压失败：{message}",
    zipCloseErrorAria: "关闭错误提示",

    // DwgViewer
    dwgToolbarAria: "CAD 工具栏",
    dwgEngineDetecting: "正在检测引擎",
    dwgEngineLibreDwg: "LibreDWG Web 兼容预览",
    dwgEntityLayerSummary: "{entities} 实体 · {layers} 图层",
    dwgCompatCanvas: "兼容画布",
    dwgEngineeringPreview: "工程预览",
    dwgFitWindow: "适应窗口",
    dwgPan: "平移",
    dwgSelect: "选择",
    dwgUndo: "撤销",
    dwgRedo: "重做",
    dwgAcadSharpAlt: "{name} ACadSharp 工程预览",
    dwgParsingTitle: "正在解析 DWG",
    dwgParsingHint: "大型图纸可能需要一些时间",
    dwgErrorTitle: "图纸打开失败",
    dwgInitFailed: "无法初始化 CAD 画布",
    dwgReadFailed: "无法读取 DWG 文件",
    dwgParseFailed: "DWG 解析失败；该图纸可能包含暂不支持的实体或版本",
    dwgLoadFailed: "DWG 加载失败",
    dwgCommandFailed: "命令执行失败",
    dwgOpenInSystem: "用系统程序打开",

    // CadViewer (3D)
    cad3dHeader: "3D 预览",
    cad3dHint: "拖拽旋转 · 滚轮缩放",
    cad3dVertices: "{count} 顶点",
    cad3dMeshes: "{count} 个 mesh",
    cad3dLoading: "加载 3D 模型…",
    cad3dUnsupported: "不支持的格式：{ext}",
    cad3dStepEmpty: "STEP 解析结果为空",
    cad3dStepParseFailed: "STEP 解析失败：{message}",
    cad3dStepLoaderMissing: "STEP 加载器未就绪",
    cad3dOpenInSystem: "用系统程序打开",

    // CadAssistant (CAD Copilot)
    cadAssistantAria: "CAD AI 助手",
    cadAssistantKicker: "CAD COPILOT",
    cadAssistantTitle: "图纸助手",
    cadAssistantSettingsAria: "模型设置",
    cadAssistantApiKey: "API Key",
    cadAssistantApiKeyPlaceholderConfigured: "已安全保存，留空不修改",
    cadAssistantApiKeyPlaceholder: "sk-…",
    cadAssistantModel: "模型",
    cadAssistantBaseUrl: "接口地址",
    cadAssistantSaveSettings: "保存设置",
    cadAssistantSaveSettingsFailed: "无法保存模型设置",
    cadAssistantContextLabel: "当前图纸",
    cadAssistantContextHint: "修改前会生成操作计划，不会直接覆盖原文件。",
    cadAssistantPromptLabel: "你想怎么改？",
    cadAssistantPromptPlaceholder: "例如：把所有尺寸标注移到 DIM 图层，并将文字高度统一为 2.5",
    cadAssistantSubmit: "生成修改计划",
    cadAssistantSubmitting: "正在分析…",
    cadAssistantApiKeyNotice: "先填写 API Key。密钥只保存在 Electron 主进程的加密存储中。",
    cadAssistantPlanFailed: "规划失败",
    cadAssistantPlanEmpty: "模型没有返回可执行计划",
    cadAssistantRiskDestructive: "高风险",
    cadAssistantRiskReversible: "可撤销",
    cadAssistantRiskReadOnly: "只读",
    cadAssistantApply: "应用修改（引擎待接入）",
    cadAssistantApplyHint: "安装 CAD 引擎后启用",

    // OpenMeRouteCard
    routeDirectOpen: "OpenMe Direct Open",
    routeSurface: "Surface",
    routeMode: "Mode",
    routePreview: "Preview",
    routePreviewAvailable: "available",
    routePreviewCard: "card",
    routeLoader: "Loader",
    routeStatus: "Status",
    routeOpenMeActions: "OpenMe Actions",
    routeAria: "OpenMe route",
    routeSystemFallback: "用系统程序兜底打开",

    // ViewerRouter
    routeErrorTitle: "OpenMe 已打开文件，但预览失败",
    routeImageNoData: "图片已进入 OpenMe",
    routeImageNoDataDesc: "OpenMe 已识别该图片格式，但当前解码器没有生成可预览数据。",
    routeSvgNoData: "SVG 已进入 OpenMe",
    routeSvgNoDataDesc: "OpenMe 已识别 SVG，但当前没有可渲染数据。",
    routePdfNoData: "PDF 已进入 OpenMe",
    routePdfNoDataDesc: "OpenMe 已识别 PDF，但当前没有可预览数据。",
    routeOfficeNoData: "Office 文件已进入 OpenMe",
    routeOfficeNoDataDesc: "OpenMe 已识别 Office 文件。当前先显示本地安全卡片，后续继续补齐更完整的转换/预览适配器。",
    routeArchiveNoData: "压缩包已进入 OpenMe",
    routeArchiveNoDataDesc: "OpenMe 已识别该压缩格式。当前以安全卡片打开，避免不安全解包。",
    routeCadNoData: "CAD / 3D 文件已进入 OpenMe",
    routeCadNoDataDesc: "OpenMe 已识别该工程格式。当前显示语义卡片，不承诺源软件级高保真渲染。",
    routeFontNoData: "字体文件已进入 OpenMe",
    routeFontNoDataDesc: "OpenMe 已识别字体文件，但当前没有可预览数据。",
    routeDesignTitle: "设计源文件已进入 OpenMe",
    routeDesignDesc: "OpenMe 已直接打开该设计源文件为本地安全卡片，显示身份、边界、风险和下一步。",
    routePackageTitle: "应用包已进入 OpenMe",
    routePackageDesc: "OpenMe 已直接打开该包文件为限制卡片，显示身份、边界、风险和下一步。",
    routeDiskTitle: "镜像文件已进入 OpenMe",
    routeDiskDesc: "OpenMe 已直接打开该镜像为限制卡片，显示身份、边界、风险和下一步。",
    routeGenericTitle: "文件已进入 OpenMe",
    routeGenericDesc: "OpenMe 已直接打开该文件为本地安全卡片。",
    viewerRouterLoading: "正在加载文件...",

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
    fileBriefKicker: "File Brief",
    registrySection: "Format Registry",
    signalsSection: "Signals",
    evidenceSection: "Evidence",
    boundarySection: "Boundary",
    nextActionsSection: "Next Actions",
    summaryViewer: "Viewer",
    summaryStrategy: "Strategy",
    summaryRisk: "Risk",
    summarySupportBadge: "Support {level}",
    capDetect: "Detect",
    capPreview: "Preview",
    capEdit: "Edit",
    capMetadata: "Metadata",
    capThumbnail: "Thumbnail",
    capAiSummary: "AI Summary",
    capExternal: "External",

    // ImageViewer
    imageLabel: "Image",
    imageAlt: "Image preview",
    imageToolsAria: "Image tools",
    imageFit: "Fit",
    imageZoomIn: "Zoom in",
    imageZoomOut: "Zoom out",
    imageRotateCcw: "Rotate counter-clockwise",
    imageRotateCw: "Rotate clockwise",

    // JsonViewer
    jsonSyntaxError: "JSON syntax error",
    jsonSyntaxBadge: "Syntax error",
    jsonExpand: "Expand",
    jsonCollapse: "Collapse",
    jsonExpandAria: "Expand {key}",
    jsonCollapseAria: "Collapse {key}",

    // CodeEditor
    codeEditorLabel: "</> Code Editor",
    codeEditorLoading: "Loading editor…",

    // MarkdownViewer
    mdModeEdit: "Edit",
    mdModeSplit: "Split",
    mdModePreview: "Preview",
    mdPreviewFrameTitle: "Markdown preview",
    mdRenderError: "Render error",

    // SvgViewer
    svgLabel: "SVG",
    svgAlt: "SVG image preview",
    svgToolsAria: "SVG zoom",
    svgFit: "Fit",
    svgZoomIn: "Zoom in",
    svgZoomOut: "Zoom out",

    // CsvViewer
    csvRows: "rows",
    csvColumns: "columns",
    csvSearchAria: "Search table",
    csvSearchPlaceholder: "Search cells…",
    csvErrors: "{count} format issue(s)",
    csvEmptyTitle: "CSV is empty",
    csvEmptySub: "No displayable rows in the file.",
    csvNoMatchTitle: "No matches",
    csvNoMatchSub: "Try another keyword.",
    csvPrev: "Previous",
    csvNext: "Next",
    csvCol: "Column {n}",
    csvHeaderSummary: "{rows} rows × {cols} columns",

    // PdfViewer
    pdfLabel: "PDF",
    pdfSearchAria: "Search text",
    pdfSearchPlaceholder: "Search text…",
    pdfSearchSubmit: "Search",
    pdfSearchBusy: "Searching…",
    pdfPrevPage: "Previous",
    pdfNextPage: "Next",
    pdfPageAria: "Page number",
    pdfRotateCwAria: "Rotate clockwise",
    pdfZoomAria: "Zoom level",
    pdfMatchCount: "{count} match(es)",
    pdfMatchPage: "Page {n}",
    pdfOpening: "Opening PDF…",
    pdfRenderingPage: "Rendering page…",
    pdfLoadFailed: "Failed to load PDF",
    pdfCanvasInitFailed: "Could not initialize PDF canvas",
    pdfRenderFailed: "Failed to render page",
    pdfSearchFailed: "PDF search failed",
    pdfErrorTitle: "Cannot preview PDF",

    // FontViewer
    fontLabel: "Font",
    fontSizeLabel: "Size",
    fontSizeAria: "Preview text",
    fontSizePlaceholder: "Type preview text…",
    fontEmptyState: "Type something to preview",
    fontLoading: "Loading font…",
    fontErrorTitle: "Font could not be loaded",
    fontErrorBody: "The file may be corrupt or use an unsupported font container.",
    fontSample1: "OpenMe font preview",
    fontSample2: "天地玄黄 宇宙洪荒",
    fontSample3: "Aa Bb Cc 0123456789",
    fontSample4: "Stainless steel · GB/T 24511",

    // EpubViewer
    epubLoadFailed: "EPUB could not be read",
    epubErrorTitle: "Cannot preview EPUB",
    epubOpenInSystem: "Open in system",
    epubLoading: "Arranging chapters…",
    epubCoverAlt: "Book cover",
    epubProgressAria: "Reading progress {n}%",
    epubChapterCounter: "{current} / {total} chapters",
    epubSearchAria: "Search this chapter",
    epubSearchPlaceholder: "Search this chapter…",
    epubDecFontAria: "Decrease text size",
    epubIncFontAria: "Increase text size",
    epubDecFont: "A−",
    epubIncFont: "A＋",
    epubPrev: "Previous chapter",
    epubNext: "Next chapter",
    epubTocAria: "Chapter list",

    // MediaViewer
    mediaLoadFailed: "Cannot open media",
    mediaVideoLabel: "Video",
    mediaAudioLabel: "Audio",
    mediaVideoCodecHint: "Local playback · codec support depends on Electron / Chromium / system",
    mediaAudioCodecHint: "Local playback · codec support depends on Electron / Chromium / system",
    mediaLoading: "Loading…",
    mediaVideoFallbackBody: "Your browser does not support video playback.",
    mediaAudioFallbackBody: "Your browser does not support audio playback.",
    mediaCodecUnsupported: "Container recognized, but the current codec may not be supported by the built-in player.",
    mediaBadgeVideo: "Vid",
    mediaBadgeAudio: "Aud",
    mediaVideoErrorTitle: "Video cannot be played inline",
    mediaAudioErrorTitle: "Audio cannot be played inline",
    mediaCodecExplainer1: "OpenMe detected the media file, but the container is not necessarily decodable. Whether MOV, MKV, AVI, WMV, HEVC, ProRes, and similar files play depends on Electron, Chromium, and your system codecs.",
    mediaLocalDisclaimer: "Source file untouched, nothing uploaded.",
    mediaOpenInSystem: "Open in system",

    // OfficeViewer
    officeWordLabel: "Word Document",
    officeWordFrameTitle: "Word document preview",
    officeExcelLabel: "Excel",
    officeSheetEmptyTitle: "Sheet is empty",
    officeSheetEmptyBody: "\"{name}\" contains no cell data.",
    officeSheetMissingTitle: "No sheets",
    officeSheetMissingBody: "The file does not contain any readable tables.",
    officePptxTitle: "PPTX animations cannot be previewed",
    officePptxBody: "Use \"Open in system\" to view the full content",
    officeRowColSummary: "{rows} rows × {cols} columns",
    officeExcelCol: "Column {n}",
    officeExcelPrev: "Previous",
    officeExcelNext: "Next",
    officeExcelPage: "{current} / {total}",

    // ZipViewer
    zipLoadError: "Cannot read archive",
    zipLoading: "Reading archive…",
    zipUnzipping: "Extracting…",
    zipUnzip: "Extract to folder",
    zipCount: "{files} files / {dirs} folders",
    zipEmpty: "Archive is empty",
    zipPreviewHeader: "Preview: {name}",
    zipPreviewUnsupported: "Preview not supported for this file",
    zipPreviewPrompt: "Click a file to preview its content",
    zipReadError: "[ Read failed: {message} ]",
    zipReadErrorShort: "[ Read failed ]",
    zipActionError: "Extraction failed: {message}",
    zipCloseErrorAria: "Dismiss error",

    // DwgViewer
    dwgToolbarAria: "CAD toolbar",
    dwgEngineDetecting: "Detecting engine",
    dwgEngineLibreDwg: "LibreDWG Web compatibility preview",
    dwgEntityLayerSummary: "{entities} entities · {layers} layers",
    dwgCompatCanvas: "Compat canvas",
    dwgEngineeringPreview: "Engineering preview",
    dwgFitWindow: "Fit window",
    dwgPan: "Pan",
    dwgSelect: "Select",
    dwgUndo: "Undo",
    dwgRedo: "Redo",
    dwgAcadSharpAlt: "{name} ACadSharp engineering preview",
    dwgParsingTitle: "Parsing DWG",
    dwgParsingHint: "Large drawings may take a moment",
    dwgErrorTitle: "Cannot open drawing",
    dwgInitFailed: "Cannot initialize the CAD canvas",
    dwgReadFailed: "Cannot read the DWG file",
    dwgParseFailed: "DWG parse failed; the drawing may contain unsupported entities or versions",
    dwgLoadFailed: "DWG load failed",
    dwgCommandFailed: "Command failed",
    dwgOpenInSystem: "Open in system",

    // CadViewer (3D)
    cad3dHeader: "3D preview",
    cad3dHint: "Drag to rotate · scroll to zoom",
    cad3dLoading: "Loading 3D model…",
    cad3dUnsupported: "Unsupported format: {ext}",
    cad3dVertices: "{count} vertices",
    cad3dMeshes: "{count} mesh(es)",
    cad3dStepEmpty: "STEP parse produced no meshes",
    cad3dStepParseFailed: "STEP parse failed: {message}",
    cad3dStepLoaderMissing: "STEP loader not ready",
    cad3dOpenInSystem: "Open in system",

    // CadAssistant (CAD Copilot)
    cadAssistantAria: "CAD AI assistant",
    cadAssistantKicker: "CAD COPILOT",
    cadAssistantTitle: "Drawing assistant",
    cadAssistantSettingsAria: "Model settings",
    cadAssistantApiKey: "API Key",
    cadAssistantApiKeyPlaceholderConfigured: "Stored securely; leave blank to keep",
    cadAssistantApiKeyPlaceholder: "sk-…",
    cadAssistantModel: "Model",
    cadAssistantBaseUrl: "API endpoint",
    cadAssistantSaveSettings: "Save settings",
    cadAssistantSaveSettingsFailed: "Cannot save the model settings",
    cadAssistantContextLabel: "Current drawing",
    cadAssistantContextHint: "Edits are planned before they happen; the source file is never overwritten directly.",
    cadAssistantPromptLabel: "What do you want to change?",
    cadAssistantPromptPlaceholder: "e.g. Move all dimension annotations to the DIM layer with text height 2.5",
    cadAssistantSubmitting: "Analyzing…",
    cadAssistantSubmit: "Generate modification plan",
    cadAssistantApiKeyNotice: "Set the API key first. The key is stored only in Electron's encrypted main-process store.",
    cadAssistantPlanFailed: "Planning failed",
    cadAssistantPlanEmpty: "The model did not return an actionable plan",
    cadAssistantRiskDestructive: "High risk",
    cadAssistantRiskReversible: "Reversible",
    cadAssistantRiskReadOnly: "Read only",
    cadAssistantApply: "Apply modifications (engine pending)",
    cadAssistantApplyHint: "Enabled after the CAD engine is connected",

    // OpenMeRouteCard
    routeDirectOpen: "OpenMe Direct Open",
    routeSurface: "Surface",
    routeMode: "Mode",
    routePreview: "Preview",
    routePreviewAvailable: "available",
    routePreviewCard: "card",
    routeLoader: "Loader",
    routeStatus: "Status",
    routeOpenMeActions: "OpenMe Actions",
    routeAria: "OpenMe route",
    routeSystemFallback: "Open with system fallback",

    // ViewerRouter
    routeErrorTitle: "OpenMe opened the file, but preview failed",
    routeImageNoData: "Image is now in OpenMe",
    routeImageNoDataDesc: "Image format recognized, but the current decoder did not produce previewable data.",
    routeSvgNoData: "SVG is now in OpenMe",
    routeSvgNoDataDesc: "SVG recognized, but no renderable data.",
    routePdfNoData: "PDF is now in OpenMe",
    routePdfNoDataDesc: "PDF recognized, but no previewable data.",
    routeOfficeNoData: "Office file is now in OpenMe",
    routeOfficeNoDataDesc: "Office file recognized. Local safety card shown; richer adapters coming.",
    routeArchiveNoData: "Archive is now in OpenMe",
    routeArchiveNoDataDesc: "Archive format recognized. Safety card only — no unsafe extraction.",
    routeCadNoData: "CAD / 3D file is now in OpenMe",
    routeCadNoDataDesc: "Engineering format recognized. Semantic card shown, no source-grade fidelity.",
    routeFontNoData: "Font file is now in OpenMe",
    routeFontNoDataDesc: "Font file recognized, but no previewable data.",
    routeDesignTitle: "Design source is now in OpenMe",
    routeDesignDesc: "OpenMe opened the design source as a local safety card showing identity, boundary, risk, and next steps.",
    routePackageTitle: "App package is now in OpenMe",
    routePackageDesc: "OpenMe opened the package as a restricted card showing identity, boundary, risk, and next steps.",
    routeDiskTitle: "Disk image is now in OpenMe",
    routeDiskDesc: "OpenMe opened the disk image as a restricted card showing identity, boundary, risk, and next steps.",
    routeGenericTitle: "File is now in OpenMe",
    routeGenericDesc: "OpenMe opened this file as a local safety card.",
    viewerRouterLoading: "Loading file...",

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
