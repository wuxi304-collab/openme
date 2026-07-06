<div align="center">
  <img src="public/openme-logo.png" alt="OpenMe logo" width="104" height="104">
  <h1>OpenMe</h1>
  <p><strong>打开文件，不必先猜该用哪个软件。</strong></p>
  <p><a href="#中文">中文</a> · <a href="#english">English</a> · <a href="#日本語">日本語</a></p>
</div>

---

## 中文

OpenMe 是一个本地优先的桌面文件工作台：把常见文档、表格、图片、压缩包、代码与工程文件放进同一个安静、统一的界面中预览和检查。它由 Electron、React 和 TypeScript 构建，采用深色工作台与轻量游戏化视觉，但文件处理始终是主角。

### 为什么做 OpenMe

日常工作里的文件常常来自不同软件：一份 PDF、一张图、一张表、一个 ZIP，偶尔还有 DWG。OpenMe 希望减少应用切换，让“先看懂文件，再决定怎么处理”变成一个顺畅的动作。

- **本地优先**：预览尽可能留在设备上，文件不会被默认上传到未知服务。
- **一个工作台**：最近文件、标签页、搜索、缩放和快捷键保持一致。
- **安全预览**：隔离 HTML、SVG 与 Office 转换内容，并防护压缩包路径穿越。
- **诚实兼容**：明确区分稳定预览与实验性支持，不把近似渲染冒充原生效果。

### 支持范围

| 类别 | 格式与能力 |
| --- | --- |
| 文档 | PDF、Markdown、DOCX、纯文本与代码 |
| 数据 | CSV、JSON、XLSX，支持搜索、排序或分页 |
| 图片 | 常见位图与 SVG，支持缩放、平移、旋转、适应窗口和 1:1 |
| 压缩包 | ZIP 文件列表、文本预览与安全解压 |
| 媒体 | 音频、视频与字体预览 |
| 电子书 | EPUB 安全文本阅读 |
| 工程文件 | STEP / IGES 等实验性 3D 预览；DWG 实验性语义预览 |

> **DWG 说明：** DWG 是封闭且版本复杂的格式。OpenMe 的开源解析链路适合快速检查，但不保证字体、标注、代理对象、布局和复杂实体与 AutoCAD 完全一致。生产签审与精确编辑仍应以原生 CAD 软件为准。

### 快速开始

需要 Node.js 20 或更新版本。

```powershell
npm install
npm run electron:dev
```

构建 Windows 版本：

```powershell
npm run dist
```

常用快捷键：`Ctrl+O` 打开文件、`Ctrl+K` 命令面板、`Ctrl+W` 关闭标签、`Ctrl+Tab` 切换标签。

---

## English

**Open files without guessing the app.**

OpenMe is a local-first desktop workspace for previewing and inspecting documents, spreadsheets, images, archives, source code, media, and engineering files in one calm, consistent interface. It is built with Electron, React, and TypeScript.

### Why OpenMe

- **Local first:** previews stay on your device whenever possible; files are not uploaded by default.
- **One workspace:** recent files, tabs, search, zoom, and keyboard navigation behave consistently.
- **Safer previews:** converted HTML, SVG, and Office content are isolated, while ZIP extraction is protected against path traversal.
- **Honest compatibility:** stable viewing and experimental support are clearly distinguished.

### Format coverage

| Category | Formats and capabilities |
| --- | --- |
| Documents | PDF, Markdown, DOCX, plain text, and source code |
| Data | CSV, JSON, and XLSX with search, sorting, or pagination |
| Images | Common raster formats and SVG with zoom, pan, rotation, fit, and 1:1 viewing |
| Archives | ZIP listing, text preview, and guarded extraction |
| Media | Audio, video, and font preview |
| Books | Safe EPUB text reading |
| Engineering | Experimental STEP / IGES 3D viewing and DWG semantic preview |

> **About DWG:** OpenMe uses an open-source parsing pipeline for quick inspection. It cannot guarantee AutoCAD-level fidelity for fonts, dimensions, proxy objects, layouts, or complex entities. Use native CAD software for production review and precision editing.

### Get started

Node.js 20 or newer is required.

```powershell
npm install
npm run electron:dev
```

Build the Windows application with `npm run dist`.

---

## 日本語

**ファイルを開くために、先にアプリを探す必要はありません。**

OpenMe は、文書、表計算、画像、圧縮ファイル、ソースコード、メディア、設計ファイルを一つの落ち着いた画面で確認できる、ローカルファーストのデスクトップ・ワークスペースです。Electron、React、TypeScript で構築されています。

### OpenMe の特徴

- **ローカル優先：** 可能な限り端末内でプレビューし、ファイルを無断で外部へ送信しません。
- **統一された操作：** 最近使ったファイル、タブ、検索、ズーム、ショートカットを一貫した操作で利用できます。
- **安全なプレビュー：** HTML、SVG、Office 変換内容を隔離し、ZIP 展開時のパストラバーサルを防止します。
- **正直な互換性表示：** 安定機能と実験的機能を明確に分け、近似表示をネイティブ品質として扱いません。

### 対応範囲

| 種類 | 形式と機能 |
| --- | --- |
| 文書 | PDF、Markdown、DOCX、プレーンテキスト、ソースコード |
| データ | CSV、JSON、XLSX（検索、並べ替え、ページ分割） |
| 画像 | 一般的な画像形式と SVG（ズーム、移動、回転、フィット、等倍） |
| 圧縮ファイル | ZIP の一覧、テキスト確認、安全な展開 |
| メディア | 音声、動画、フォントのプレビュー |
| 電子書籍 | 安全な EPUB テキスト閲覧 |
| 設計ファイル | STEP / IGES の実験的 3D 表示、DWG の実験的セマンティック表示 |

> **DWG について：** OpenMe のオープンソース解析は素早い内容確認を目的としています。フォント、寸法、プロキシオブジェクト、レイアウト、複雑なエンティティについて AutoCAD と同等の表示は保証できません。正式な確認や精密編集にはネイティブ CAD ソフトをご利用ください。

### セットアップ

Node.js 20 以降が必要です。

```powershell
npm install
npm run electron:dev
```

Windows 版は `npm run dist` でビルドできます。

---

## Technology / 技术栈 / 技術スタック

- Electron + React + TypeScript + Vite
- PDF.js, Mammoth, JSZip, read-excel-file
- LibreDWG Web / ACadSharp auxiliary pipeline
- OCCT Import JS + Three.js

## Contributing / 贡献 / コントリビューション

Issues, minimal reproducible samples, and focused pull requests are welcome. Never upload private or commercially sensitive source files. For parser issues, include the originating application and file-format version whenever possible.

## License / 许可证 / ライセンス

OpenMe's original code is released under the [MIT License](LICENSE). Third-party components remain subject to their respective licenses; review CAD-related licensing requirements before redistribution.
