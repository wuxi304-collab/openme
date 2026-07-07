<div align="center">
  <img src="public/openme-logo.png" alt="OpenMe logo" width="104" height="104">
  <h1>OpenMe</h1>
  <p><strong>打开文件，不必先猜该用哪个软件。</strong></p>
  <p><strong>Open files without guessing the app.</strong></p>
  <p><a href="#中文">中文</a> · <a href="#english">English</a> · <a href="#日本語">日本語</a></p>
</div>

---

## 中文

OpenMe 是一个本地优先的通用桌面文件工作台：用统一、安静、可审计的界面打开、预览、检查和整理文档、表格、图片、压缩包、代码、媒体、电子书与工程文件。

OpenMe 的核心不是某个行业，而是文件工作台。行业能力应该以可选能力包存在，而不是写死在核心里。

```text
OpenMe Core
  -> Format Viewers
  -> File Understanding Layer
  -> Domain Packs
```

### 为什么做 OpenMe

日常工作里的文件常常来自不同软件：一份 PDF、一张图、一张表、一个 ZIP，偶尔还有 DWG、STEP、字体、音视频或代码项目。OpenMe 希望减少应用切换，让“先看懂文件，再决定怎么处理”变成一个顺畅动作。

- **本地优先**：预览尽可能留在设备上，文件不会被默认上传到未知服务。
- **一个工作台**：最近文件、标签页、搜索、缩放、快捷键和命令面板保持一致。
- **安全预览**：隔离 HTML、SVG 与 Office 转换内容，并防护压缩包路径穿越。
- **诚实兼容**：明确区分完整浏览、高保真浏览、近似预览、语义检查、外部打开与实验性支持。
- **能力包扩展**：通用内核保持干净，工程、金属材料、财务、合同、研究、开发者等领域能力通过 pack 扩展。

### 支持范围

| 类别 | 格式与能力 | 支持等级 |
| --- | --- | --- |
| 文档 | PDF、Markdown、DOCX、纯文本与代码 | PDF 高保真浏览；DOCX/Markdown 安全近似预览；文本/代码完整浏览 |
| 数据 | CSV、JSON、XLSX | CSV/JSON 完整浏览；XLSX 只读数据预览 |
| 图片 | PNG、JPEG、GIF、BMP、WebP、SVG | 位图完整浏览；SVG 安全近似预览 |
| 压缩包 | ZIP | 文件列表、文本预览与安全解压 |
| 媒体 | 音频、视频与字体 | 编解码能力取决于 Electron/系统环境 |
| 电子书 | EPUB | 安全文本阅读 |
| 工程文件 | STEP / IGES / STL / OBJ / glTF / GLB / DWG / DXF | 3D 近似预览；DWG/DXF 语义检查、近似预览与外部原生打开 |

完整支持边界见 [SUPPORT_MATRIX.md](SUPPORT_MATRIX.md)。

> **DWG 说明：** DWG 是封闭且版本复杂的格式。OpenMe 可以做快速结构检查、文字/图层/块等语义分析和近似工程预览，但不保证字体、标注、代理对象、布局和复杂实体与 AutoCAD 完全一致。生产签审与精确编辑应以原生 CAD 软件为准。

### 能力包方向

OpenMe 的长期路线不是把所有行业逻辑塞进主程序，而是通过 Domain Packs 扩展。

计划方向包括：

- **Engineering Pack**：CAD 元数据、图层、块、实体、文字摘要和图纸审查清单。
- **Metal Materials Pack**：材料牌号、规格、标准、数量、报价字段和缺失项检查。
- **Finance Pack**：发票、对账单、金额、日期和币种识别。
- **Legal Pack**：合同主体、义务、期限、终止条款和风险清单。
- **Research Pack**：论文、笔记、引用和阅读摘要。
- **Developer Pack**：代码项目结构、依赖、脚本和配置检查。

金属材料与不锈钢能力可以成为第一个深度样板，但它不是 OpenMe 的边界。

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

### 项目文档

- [ROADMAP.md](ROADMAP.md)：平台路线图
- [ARCHITECTURE.md](ARCHITECTURE.md)：核心、查看器、理解层与能力包架构
- [SUPPORT_MATRIX.md](SUPPORT_MATRIX.md)：格式支持等级与边界

---

## English

OpenMe is a local-first general desktop file workspace for opening, previewing, inspecting, and organizing documents, spreadsheets, images, archives, source code, media, books, and engineering files in one calm and auditable interface.

OpenMe is not defined by a single industry. Domain-specific intelligence should live in optional packs rather than in the core application.

```text
OpenMe Core
  -> Format Viewers
  -> File Understanding Layer
  -> Domain Packs
```

### Why OpenMe

Work files often come from many different applications: a PDF, an image, a spreadsheet, a ZIP file, sometimes a DWG, STEP model, font, media file, or code project. OpenMe aims to reduce app switching so users can understand a file before deciding what to do next.

- **Local first:** previews stay on your device whenever possible; files are not uploaded by default.
- **One workspace:** recent files, tabs, search, zoom, keyboard shortcuts, and command palette behave consistently.
- **Safer previews:** converted HTML, SVG, and Office content are isolated, while ZIP extraction is protected against path traversal.
- **Honest compatibility:** full browsing, high-fidelity browsing, approximate preview, semantic inspection, external open, and experimental support are clearly separated.
- **Extensible packs:** the core stays clean while engineering, metal materials, finance, legal, research, and developer workflows can be added through packs.

### Format coverage

| Category | Formats and capabilities | Support level |
| --- | --- | --- |
| Documents | PDF, Markdown, DOCX, plain text, and source code | PDF high-fidelity browsing; DOCX/Markdown safe approximate preview; text/code full browsing |
| Data | CSV, JSON, XLSX | CSV/JSON full browsing; XLSX read-only data preview |
| Images | PNG, JPEG, GIF, BMP, WebP, SVG | Raster images full browsing; SVG safe approximate preview |
| Archives | ZIP | Listing, text preview, and guarded extraction |
| Media | Audio, video, and fonts | Codec support depends on Electron and the system environment |
| Books | EPUB | Safe text reading |
| Engineering | STEP / IGES / STL / OBJ / glTF / GLB / DWG / DXF | Approximate 3D preview; DWG/DXF semantic inspection, approximate preview, and external native open |

See [SUPPORT_MATRIX.md](SUPPORT_MATRIX.md) for the full support boundary.

> **About DWG:** DWG is a closed and version-fragmented format. OpenMe can provide quick structural inspection, text/layer/block semantic analysis, and approximate engineering previews. It cannot guarantee AutoCAD-level fidelity for fonts, dimensions, proxy objects, layouts, or complex entities. Use native CAD software for production review and precision editing.

### Domain packs

OpenMe should grow through Domain Packs rather than hard-coded vertical logic.

Planned pack directions include:

- **Engineering Pack:** CAD metadata, layers, blocks, entities, text summaries, and drawing review checklists.
- **Metal Materials Pack:** material grades, specifications, standards, quantities, quotation fields, and missing-information checks.
- **Finance Pack:** invoices, statements, amounts, dates, and currencies.
- **Legal Pack:** parties, obligations, deadlines, termination clauses, and risk checklists.
- **Research Pack:** papers, notes, citations, and reading summaries.
- **Developer Pack:** source trees, dependencies, scripts, and project configuration.

Metal materials and stainless steel workflows can be the first deep vertical sample, but they are not the boundary of OpenMe.

### Get started

Node.js 20 or newer is required.

```powershell
npm install
npm run electron:dev
```

Build the Windows application with:

```powershell
npm run dist
```

Common shortcuts: `Ctrl+O` open files, `Ctrl+K` command palette, `Ctrl+W` close tab, `Ctrl+Tab` switch tabs.

### Project documents

- [ROADMAP.md](ROADMAP.md): platform roadmap
- [ARCHITECTURE.md](ARCHITECTURE.md): core, viewer, understanding, and pack architecture
- [SUPPORT_MATRIX.md](SUPPORT_MATRIX.md): format support levels and boundaries

---

## 日本語

OpenMe は、文書、表計算、画像、圧縮ファイル、ソースコード、メディア、電子書籍、設計ファイルを一つの落ち着いた画面で開き、確認し、整理するためのローカルファーストな汎用デスクトップ・ファイルワークスペースです。

OpenMe の中核は特定業界ではありません。業界固有の知能は、コアに直接埋め込むのではなく、任意の Domain Pack として拡張されるべきです。

```text
OpenMe Core
  -> Format Viewers
  -> File Understanding Layer
  -> Domain Packs
```

### OpenMe の特徴

- **ローカル優先：** 可能な限り端末内でプレビューし、ファイルを無断で外部へ送信しません。
- **統一された操作：** 最近使ったファイル、タブ、検索、ズーム、ショートカット、コマンドパレットを一貫した操作で利用できます。
- **安全なプレビュー：** HTML、SVG、Office 変換内容を隔離し、ZIP 展開時のパストラバーサルを防止します。
- **正直な互換性表示：** 完全閲覧、高精度閲覧、近似プレビュー、セマンティック検査、外部アプリ起動、実験的対応を明確に分けます。
- **拡張可能なパック：** コアを汎用に保ち、設計、金属材料、財務、法務、研究、開発者向けの機能は pack として追加します。

### 対応範囲

| 種類 | 形式と機能 | 対応レベル |
| --- | --- | --- |
| 文書 | PDF、Markdown、DOCX、プレーンテキスト、ソースコード | PDF は高精度閲覧、DOCX/Markdown は安全な近似プレビュー、テキスト/コードは完全閲覧 |
| データ | CSV、JSON、XLSX | CSV/JSON は完全閲覧、XLSX は読み取り専用データプレビュー |
| 画像 | PNG、JPEG、GIF、BMP、WebP、SVG | ラスター画像は完全閲覧、SVG は安全な近似プレビュー |
| 圧縮ファイル | ZIP | 一覧、テキスト確認、安全な展開 |
| メディア | 音声、動画、フォント | コーデック対応は Electron とシステム環境に依存します |
| 電子書籍 | EPUB | 安全文本阅读 |
| 設計ファイル | STEP / IGES / STL / OBJ / glTF / GLB / DWG / DXF | 3D 近似プレビュー、DWG/DXF のセマンティック検査、近似プレビュー、外部ネイティブ起動 |

詳細は [SUPPORT_MATRIX.md](SUPPORT_MATRIX.md) を参照してください。

> **DWG について：** DWG は閉じた形式であり、バージョンや実装差も大きい形式です。OpenMe は構造確認、文字・レイヤー・ブロックのセマンティック分析、近似的な設計プレビューを提供できますが、AutoCAD と同等の表示品質は保証しません。正式な確認や精密編集にはネイティブ CAD ソフトをご利用ください。

### Domain Packs

OpenMe はコアに業界ロジックを固定するのではなく、Domain Packs によって拡張されるべきです。

計画中の方向：

- **Engineering Pack**：CAD メタデータ、レイヤー、ブロック、エンティティ、文字要約、図面レビュー。
- **Metal Materials Pack**：材料グレード、仕様、規格、数量、見積フィールド、不足情報チェック。
- **Finance Pack**：請求書、明細、金額、日付、通貨。
- **Legal Pack**：契約主体、義務、期限、解除条項、リスクチェック。
- **Research Pack**：論文、ノート、引用、読書要約。
- **Developer Pack**：ソースツリー、依存関係、スクリプト、設定確認。

金属材料やステンレスのワークフローは最初の深い垂直サンプルになり得ますが、OpenMe の境界ではありません。

### セットアップ

Node.js 20 以降が必要です。

```powershell
npm install
npm run electron:dev
```

Windows 版は次のコマンドでビルドできます。

```powershell
npm run dist
```

---

## Technology / 技术栈 / 技術スタック

- Electron + React + TypeScript + Vite
- PDF.js, Mammoth, JSZip, read-excel-file
- LibreDWG Web / ACadSharp auxiliary pipeline
- OCCT Import JS + Three.js

## Contributing / 贡献 / コントリビューション

Issues, minimal reproducible samples, and focused pull requests are welcome. Never upload private or commercially sensitive source files. For parser issues, include the originating application and file-format version whenever possible.

Use the issue templates for bug reports, format requests, and domain pack requests.

## License / 许可证 / ライセンス

OpenMe's original code is released under the [MIT License](LICENSE). Third-party components remain subject to their respective licenses; review CAD-related licensing requirements before redistribution.
