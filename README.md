<div align="center">
  <img src="public/openme-logo.png" alt="OpenMe logo" width="104" height="104">
  <h1>OpenMe</h1>
  <p><strong>Open files without guessing the app.</strong></p>
  <p>Local-first file workspace · Honest format support · Extensible domain packs</p>

  <p>
    <a href="LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-blue.svg"></a>
    <img alt="Platform: Windows" src="https://img.shields.io/badge/platform-Windows-0078D4.svg">
    <img alt="Runtime: Electron" src="https://img.shields.io/badge/runtime-Electron-47848F.svg">
    <img alt="Frontend: React + TypeScript" src="https://img.shields.io/badge/frontend-React%20%2B%20TypeScript-3178C6.svg">
    <img alt="Status: early preview" src="https://img.shields.io/badge/status-early%20preview-orange.svg">
  </p>

  <p>
    <a href="#quick-start">Quick start</a> ·
    <a href="#what-openme-does">What it does</a> ·
    <a href="#support-levels">Support levels</a> ·
    <a href="#architecture">Architecture</a> ·
    <a href="#domain-packs">Domain packs</a> ·
    <a href="#中文">中文</a>
  </p>
</div>

---

## What OpenMe is

OpenMe is a **local-first desktop file workspace** for opening, previewing, inspecting, and organizing everyday work files in one calm interface.

It is not a single-industry tool. The core stays general. Domain-specific intelligence should live in optional packs.

```text
OpenMe Core
  -> Format Viewers
  -> File Understanding Layer
  -> Domain Packs
```

## Why it exists

Work files often arrive as a mixed pile: PDF, Excel, Word, images, ZIP archives, code, fonts, media, EPUB, CAD drawings, and 3D models. Before a user can act, they first have to guess which app can open which file.

OpenMe tries to turn that into one motion:

> Open the file. Understand the file. Decide the next action.

## Project status

OpenMe is in **early preview**.

Current focus:

- reliable local opening and previewing
- clear support boundaries
- safer previews for risky formats
- workspace interaction polish
- platform architecture for future domain packs

Not yet the focus:

- cloud sync
- account system
- plugin marketplace
- AI mutation of source files
- AutoCAD-level embedded DWG fidelity

## Quick start

Requirements:

- Windows
- Node.js 20+
- npm

```powershell
npm install
npm run electron:dev
```

Build a Windows package:

```powershell
npm run dist
```

Common shortcuts:

| Shortcut | Action |
| --- | --- |
| `Ctrl+O` | Open files |
| `Ctrl+K` | Command palette |
| `Ctrl+S` | Save editable text/code content |
| `Ctrl+W` | Close current tab |
| `Ctrl+Tab` | Switch tabs |

## What OpenMe does

| Area | Capability |
| --- | --- |
| Workspace | Recent files, tabs, command palette, keyboard flow, status bar |
| Documents | PDF, Markdown, DOCX, plain text, source code |
| Data | CSV, JSON, XLSX |
| Images | PNG, JPEG, GIF, BMP, WebP, SVG |
| Archives | ZIP listing, text preview, guarded extraction |
| Media | Audio and video playback, depending on system codec support |
| Books | EPUB safe text reading |
| Fonts | TTF, OTF, WOFF, WOFF2 preview |
| Engineering | STEP / IGES / STL / OBJ / glTF / GLB approximate preview; DWG/DXF semantic inspection and external-native-open path |

See [SUPPORT_MATRIX.md](SUPPORT_MATRIX.md) for the complete support boundary.

## Support levels

OpenMe uses explicit support levels instead of vague “supported format” claims.

| Level | Meaning |
| --- | --- |
| Full built-in browsing | OpenMe can open and inspect the format locally with the stated features. |
| High-fidelity browsing | Rendering is close for common files, but advanced editing/layout features may be absent. |
| Safe approximate preview | Useful content is extracted or displayed, but source-application fidelity is not promised. |
| Semantic inspection | OpenMe can inspect structure, metadata, or text; visual output may be incomplete. |
| External open | OpenMe routes the file to the system/default application. Built-in preview is not claimed. |
| Experimental | Works for selected samples and needs more regression coverage. |

### DWG / DXF boundary

DWG is a closed and version-fragmented format. OpenMe can provide:

- quick structural inspection
- layer, block, entity, and text summaries when the engine can parse them
- approximate engineering preview
- external launch into native CAD software when available

OpenMe does **not** claim AutoCAD-level fidelity for fonts, dimensions, proxy objects, layouts, or complex entities. Production review and precision editing should use native CAD software.

## Architecture

```text
src/
  core/              file state, commands, workspace, safety boundaries
  viewers/           format-specific preview components
  understanding/     neutral metadata, summary, and evidence extraction
  packs/             optional domain-specific intelligence

electron/
  ipc/               desktop and filesystem bridge
  security/          local safety boundaries
  file-system/       file reading and guarded writes
  sidecars/          CAD and other auxiliary engines
```

More details: [ARCHITECTURE.md](ARCHITECTURE.md).

## Domain packs

OpenMe should grow through domain packs, not hard-coded vertical logic.

Planned pack directions:

| Pack | Purpose |
| --- | --- |
| Engineering Pack | CAD metadata, layers, blocks, entity summaries, drawing review checklists |
| Metal Materials Pack | material grades, specifications, standards, quantities, quotation fields, missing-information checks |
| Finance Pack | invoices, statements, amounts, dates, currencies |
| Legal Pack | parties, obligations, deadlines, termination clauses, risk checklists |
| Research Pack | papers, notes, citations, reading summaries |
| Developer Pack | source trees, dependencies, scripts, configuration summaries |

Metal materials and stainless steel workflows can be the first deep vertical sample, but they are not the boundary of OpenMe.

## Roadmap

| Version | Theme | Goal |
| --- | --- | --- |
| V0.1 | Trustworthy general workspace | Make OpenMe reliable enough for public testing. |
| V0.2 | Project Workspace | Organize multiple related files into one work context. |
| V0.3 | File Understanding Layer | Produce neutral summaries and metadata across file types. |
| V0.4 | Domain Pack System | Add domain intelligence without polluting the core. |
| V0.5 | First Domain Packs | Ship Engineering and Metal Materials pack foundations. |
| V1.0 | Stable platform release | Build a dependable local file command center. |

Full roadmap: [ROADMAP.md](ROADMAP.md).

## Repository map

| File | Purpose |
| --- | --- |
| [ROADMAP.md](ROADMAP.md) | Platform roadmap and release direction |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Core, viewer, understanding, and pack architecture |
| [SUPPORT_MATRIX.md](SUPPORT_MATRIX.md) | Format support levels and capability boundaries |
| [AGENTS.md](AGENTS.md) | Engineering notes, constraints, validation records, and agent instructions |
| [.github/ISSUE_TEMPLATE](.github/ISSUE_TEMPLATE) | Bug, format, and pack request templates |

## Contributing

Focused pull requests, minimal reproducible samples, and clear issue reports are welcome.

Please do not upload private, commercial, customer, or sensitive files. For parser or viewer issues, include:

- file type and extension
- originating application and version when known
- expected behavior
- actual behavior
- minimal public sample when possible

Use these templates:

- Bug report
- Format request
- Domain pack request

## Security and privacy model

- Files are local by default.
- OpenMe should not upload files unless the user explicitly enables an external or AI-assisted action.
- Converted HTML, SVG, Office, EPUB, and archive content must be isolated or sanitized.
- ZIP extraction must guard against path traversal and large archive abuse.
- Source files must not be silently mutated.
- CAD changes must follow: inspect -> plan -> user confirmation -> save copy -> verify.

## Technology

- Electron + React + TypeScript + Vite
- PDF.js, Mammoth, JSZip, read-excel-file
- Monaco Editor, Three.js, OCCT Import JS
- LibreDWG Web / ACadSharp auxiliary CAD pipeline

## License

OpenMe's original code is released under the [MIT License](LICENSE). Third-party components remain subject to their respective licenses; review CAD-related licensing requirements before redistribution.

---

## 中文

### OpenMe 是什么

OpenMe 是一个**本地优先的通用桌面文件工作台**：用统一、安静、可审计的界面打开、预览、检查和整理日常工作文件。

它不是某一个行业的小工具。OpenMe 的核心保持通用，行业能力通过可选能力包扩展。

```text
OpenMe Core
  -> Format Viewers
  -> File Understanding Layer
  -> Domain Packs
```

### 为什么做 OpenMe

工作文件常常不是整齐地来，而是一堆混杂附件：PDF、Excel、Word、图片、ZIP、代码、字体、音视频、EPUB、CAD 图纸和 3D 模型。用户真正要做事之前，先得猜应该用哪个软件打开。

OpenMe 要把这件事压成一个动作：

> 打开文件。看懂文件。决定下一步。

### 当前状态

OpenMe 处于 **early preview / 早期预览**。

当前重点：

- 本地可靠打开与预览
- 明确格式支持边界
- 高风险格式的安全预览
- 工作台交互打磨
- 为后续能力包预留平台架构

暂不作为重点：

- 云同步
- 账号系统
- 插件市场
- AI 直接修改源文件
- AutoCAD 级内嵌 DWG 保真

### 快速开始

要求：

- Windows
- Node.js 20+
- npm

```powershell
npm install
npm run electron:dev
```

构建 Windows 版本：

```powershell
npm run dist
```

常用快捷键：

| 快捷键 | 动作 |
| --- | --- |
| `Ctrl+O` | 打开文件 |
| `Ctrl+K` | 命令面板 |
| `Ctrl+S` | 保存可编辑文本/代码内容 |
| `Ctrl+W` | 关闭当前标签 |
| `Ctrl+Tab` | 切换标签 |

### OpenMe 能做什么

| 方向 | 能力 |
| --- | --- |
| 工作台 | 最近文件、标签页、命令面板、快捷键、状态栏 |
| 文档 | PDF、Markdown、DOCX、纯文本、源代码 |
| 数据 | CSV、JSON、XLSX |
| 图片 | PNG、JPEG、GIF、BMP、WebP、SVG |
| 压缩包 | ZIP 文件列表、文本预览、安全解压 |
| 媒体 | 音频、视频播放，取决于系统编解码能力 |
| 电子书 | EPUB 安全文本阅读 |
| 字体 | TTF、OTF、WOFF、WOFF2 预览 |
| 工程文件 | STEP / IGES / STL / OBJ / glTF / GLB 近似预览；DWG/DXF 语义检查与外部原生打开路径 |

完整边界见 [SUPPORT_MATRIX.md](SUPPORT_MATRIX.md)。

### 支持等级

OpenMe 不使用笼统的“支持某格式”，而是明确分级：

| 等级 | 含义 |
| --- | --- |
| 完整内置浏览 | OpenMe 可在本地按已声明能力打开和检查该格式。 |
| 高保真浏览 | 常见文件渲染接近原格式，但不承诺高级编辑或复杂布局能力。 |
| 安全近似预览 | 能提取或展示有用内容，但不承诺源软件级一致性。 |
| 语义检查 | 能检查结构、元数据或文本，但视觉输出可能不完整。 |
| 外部打开 | 调用系统默认/专业软件打开，不声明内置预览。 |
| 实验性 | 已在部分样本可用，但需要更多回归样本。 |

#### DWG / DXF 边界

DWG 是封闭且版本复杂的格式。OpenMe 可以提供：

- 快速结构检查
- 图层、块、实体和文字摘要
- 近似工程预览
- 检测并调用已安装的原生 CAD 软件

OpenMe **不承诺** AutoCAD 级字体、标注、代理对象、布局和复杂实体保真。生产签审和精确编辑应使用原生 CAD 软件。

### 架构

```text
src/
  core/              文件状态、命令、工作台、安全边界
  viewers/           各格式预览组件
  understanding/     通用元数据、摘要和证据提取
  packs/             可选行业能力包

electron/
  ipc/               桌面与文件系统桥接
  security/          本地安全边界
  file-system/       文件读取与受保护写入
  sidecars/          CAD 等辅助引擎
```

详细说明见 [ARCHITECTURE.md](ARCHITECTURE.md)。

### 能力包方向

OpenMe 的长期路线不是把所有行业逻辑塞进主程序，而是通过 Domain Packs 扩展。

| 能力包 | 用途 |
| --- | --- |
| Engineering Pack | CAD 元数据、图层、块、实体摘要、图纸审查清单 |
| Metal Materials Pack | 材料牌号、规格、标准、数量、报价字段、缺失项检查 |
| Finance Pack | 发票、对账单、金额、日期、币种 |
| Legal Pack | 合同主体、义务、期限、终止条款、风险清单 |
| Research Pack | 论文、笔记、引用、阅读摘要 |
| Developer Pack | 代码树、依赖、脚本、配置摘要 |

金属材料与不锈钢能力可以成为第一个深度样板，但它不是 OpenMe 的边界。

### 路线图

| 版本 | 主题 | 目标 |
| --- | --- | --- |
| V0.1 | 可信通用工作台 | 让 OpenMe 足够可靠，可公开测试。 |
| V0.2 | Project Workspace | 把多个相关文件组织成一个工作上下文。 |
| V0.3 | File Understanding Layer | 跨格式生成通用摘要与元数据。 |
| V0.4 | Domain Pack System | 不污染核心的前提下加入行业能力。 |
| V0.5 | 第一批能力包 | 落地 Engineering 与 Metal Materials 包基础。 |
| V1.0 | 稳定平台版本 | 成为可靠的本地文件命令中心。 |

完整路线见 [ROADMAP.md](ROADMAP.md)。

### 仓库地图

| 文件 | 用途 |
| --- | --- |
| [ROADMAP.md](ROADMAP.md) | 平台路线图与版本方向 |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Core、Viewer、Understanding、Pack 架构 |
| [SUPPORT_MATRIX.md](SUPPORT_MATRIX.md) | 格式支持等级与能力边界 |
| [AGENTS.md](AGENTS.md) | 工程记录、约束、验证结论和 agent 指令 |
| [.github/ISSUE_TEMPLATE](.github/ISSUE_TEMPLATE) | bug、格式请求、能力包请求模板 |

### 贡献

欢迎聚焦的 PR、最小可复现样本和清晰 issue。

请不要上传私有、商业、客户或敏感文件。提交解析或预览问题时，尽量包含：

- 文件类型和扩展名
- 来源软件及版本
- 预期行为
- 实际行为
- 可公开的最小样本

### 安全与隐私模型

- 文件默认保留在本地。
- 除非用户明确启用外部或 AI 辅助动作，否则不应上传文件。
- HTML、SVG、Office、EPUB、压缩包内容必须隔离或清洗。
- ZIP 解压必须防路径穿越和大包滥用。
- 源文件不能被静默修改。
- CAD 修改必须遵循：检查 -> 生成计划 -> 用户确认 -> 另存副本 -> 校验。

### 技术栈

- Electron + React + TypeScript + Vite
- PDF.js, Mammoth, JSZip, read-excel-file
- Monaco Editor, Three.js, OCCT Import JS
- LibreDWG Web / ACadSharp auxiliary CAD pipeline

### 许可证

OpenMe 原始代码使用 [MIT License](LICENSE)。第三方组件遵循各自许可证；重新分发前应单独核查 CAD 相关依赖的许可证要求。
