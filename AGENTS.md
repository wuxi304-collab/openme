# AGENTS.md

## 项目目标

OpenMe 是 Windows 桌面通用文件工作台，当前使用 Electron + React + Vite。界面采用 Codex 客户端式工作台结构，并融入克制的超级马里奥视觉语言。CAD 方向的目标是可靠查看 DWG/DXF、提取结构语义，并在用户确认后由 LLM 生成可审计的修改计划。

## 当前技术路线

- 桌面运行时：Electron 34。Tauri 已停止推进，因为本机 Smart App Control 会拦截 Rust 构建脚本、过程宏 DLL 与 WebView2 宏组件。
- CAD 语义：ACadSharp 3.6.35，通过 `cad-host` .NET 8 sidecar 读取 DWG/DXF。
- CAD 精准预览：ACadSharp `SvgWriter` 输出模型空间 SVG。
- CAD 兼容画布：`@mlightcad/cad-simple-viewer` + LibreDWG Web，保留为可交互回退。
- LLM：Electron 主进程保存加密配置，前端 CAD Copilot 只请求修改计划，不直接覆盖原图。

## 得（已经验证有效）

1. ACadSharp 能读取三张真实图纸，正确给出实体、图层和块数量。
2. 三张图纸均能导出 SVG；块引用、标注箭头和主要轮廓的覆盖率比 LibreDWG Web 更高。
3. DWG 内中文文本本身解析正确，例如“油漆笔标注”“材质：S30408”。截图中的菱形问号来自 Windows 控制台编码与 Electron UTF-8 解码不一致，不是源图文字丢失。
4. React/Vite 生产构建通过。
5. LibreDWG 交互画布仍可一键切换，便于比较并避免单引擎失败时完全不可用。

## 失（已确认的局限）

1. ACadSharp SVG 不是完整 AutoCAD 显示引擎；复杂代理对象、SHX 字形、布局空间和部分 CAXA/GstarCAD 扩展对象可能不完整。
2. 第一版精准预览把黑色实体放在黑色背景上，导致轮廓近乎不可见；已改为浅色工程图纸底。
3. 第一版 CadHost 使用系统控制台编码输出 SVG，Electron 按 UTF-8 接收造成中文乱码；源码已固定 UTF-8 输出。
4. 本机应用控制策略可能拦截刚重新编译的 CadHost DLL。不要反复移动构建目录规避策略；优先使用已验证发布物，重新发布后必须在目标机器验证。
5. “ACadSharp 语义引擎”徽标不等于 AutoCAD 级视觉保真。UI 文案不得再把实验性 SVG 称作绝对精准。

## 三张回归样本（2026-07-06）

- `93204-2614888锥筒03-01.DWG`：20 个模型空间实体、9 图层、64 块。
- `93204-2614887锥筒02-01.DWG`：20 个模型空间实体、9 图层、64 块。
- `93204-2507832板06.dwg`：26 个模型空间实体、11 图层、77 块。

每次修改 CAD 渲染器后必须用这三张图回归：轮廓可见、中文正常、视图完整、切换兼容画布不崩溃。

## 工程约束

- 不提交 `node_modules`、`dist`、`release`、本地 SDK、CadHost 发布目录或测试 SVG。
- 不提交 API Key；LLM 密钥仅通过 Electron `safeStorage` 存在用户数据目录。
- 不直接覆盖用户 CAD 原文件。修改流程必须是：分析 → 生成计划 → 用户确认 → 另存副本 → 校验。
- 发布前依次执行 CAD sidecar 构建、`npm run build`、三图回归和打包。
- 如果追求 AutoCAD 级 DWG 保真，开源栈不能作保证；应把系统已安装的 AutoCAD Core Console 作为可选最高优先级引擎，而不是捆绑试用 SDK。

## 2026-07-06 三图二次验收结论

用户确认三张真实 DWG 在 ACadSharp SVG 与 LibreDWG Web 下仍未达到可用保真度。进一步检查结果：

- 三图完整内容位于模型空间，不是选错布局；纸空间为空或仅有一个视口。
- DWG 内嵌预览均只有 180×85，不能作为正式预览。
- 本机未安装 AutoCAD、DWG TrueView、浩辰、中望、BricsCAD 或 ODA 原生引擎。
- 这些图包含 SolidWorks/CAXA/GstarCAD 风格扩展块。纯开源解析链只能近似显示，继续调整 SVG/CSS 无法补齐未实现的专有显示语义。
- 不得再把 ACadSharp SVG 描述成“精准预览”；它只能叫“工程预览/结构预览”。
- 下一条可验收路线：使用 Autodesk 免费且非试用的 DWG TrueView 作为原生保真查看器，OpenMe 保留语义分析和 LLM 修改计划；若要求直接嵌入 OpenMe 画布，则需要 ODA/RealDWG 商业 SDK。

## 2026-07-06 非 CAD 格式审计与打磨

支持等级必须按真实能力描述：

- **完整浏览**：PNG/JPEG/GIF/BMP/WebP、纯文本/代码、JSON、CSV、ZIP。图片支持缩放拖拽和尺寸；JSON 支持独立节点展开；CSV 支持搜索、排序、分页和畸形行提示；ZIP 只承诺 `.zip`，包含路径穿越防护、2 GB/100,000 项安全上限和 2 MB 单文件文本预览上限。
- **高保真浏览但功能未齐全**：PDF 使用本地打包的 PDF.js worker，可离线逐页渲染和缩放；尚无文本层、全文搜索、表单填写和批注。
- **安全近似预览**：SVG 通过图片上下文展示；Markdown 和 DOCX 在无脚本 sandbox iframe 中显示。DOCX 由 Mammoth 提取内容，不承诺 Word 分页、浮动对象和复杂样式一致。
- **数据预览**：XLSX 使用 `read-excel-file` 只读解析，显示工作表和单元格值；不承诺公式计算、图表、宏、条件格式、合并样式与打印布局。已移除存在高危公告的 `xlsx` 包。
- **仅外部打开**：PPT/PPTX、DOC/XLS 旧二进制格式、RAR/7Z/TAR/GZ、EPUB。UI 不得再把这些格式标成内置支持。
- **3D 近似预览**：STL/OBJ/glTF/GLB/STEP/IGES 依赖 Three.js/OCCT 导入能力；材质、装配语义和复杂 STEP 实体需要单独样本回归。

安全修复：

- 移除 Markdown、DOCX、SVG 对主 DOM 的直接 HTML 注入。
- ZIP 解压改为逐项等待写入并校验目标路径，修复“返回成功但仍在写入”和 Zip Slip。
- PDF worker 从 CDN 改为安装包内资源。
- 关闭未保存标签前确认；允许保存空文件；各转换失败进入明确错误状态。
- 生产依赖审计仍有 1 个高危项，来源为冻结的 `@mlightcad/cad-simple-viewer -> lodash-es`，仅保留在 CAD 兼容画布，待 CAD 引擎替换时删除。

## 2026-07-07 新增格式

- **EPUB**：新增安全文本阅读模式，支持元数据、封面、书脊章节、目录切换、本章搜索、字号调整和左右方向键翻章。限制为最多 300 章、100 MB 文件、10,000,000 字符；不执行书内脚本，不还原复杂排版、嵌入字体和交互内容。
- **音频**：新增 MP3/WAV/OGG/M4A/AAC/FLAC 分类，使用 Electron 自定义流式协议读取本地文件，避免 Base64 全量入内存。实际解码能力取决于当前 Chromium 编解码器。
- **视频**：新增 MP4/WebM/OGV/M4V 分类和本地流式播放。H.264/AV1/HEVC 等是否可用取决于 Electron 构建和系统环境；不承诺 MOV/HEVC。
- **字体**：新增 TTF/OTF/WOFF/WOFF2 预览，支持自定义中英文试排和 18–120 px 字号调整，单文件上限 25 MB。
- EPUB 解析器独立为 `electron/epub.js`，已用最小 EPUB 回归样本验证章节、中文和脚本剔除。

## 2026-07-07 性能与数据安全打磨

- 重型查看器全部改为 React 按需加载：首页 JavaScript 从约 956 KB 降至约 229 KB（gzip 约 72 KB）；Monaco、Markdown、CSV、PDF、Office、ZIP、3D、EPUB、媒体、字体仅在首次打开对应格式时加载。
- XLSX 工作表改为每页 500 行，补充行号、粘性表头与空工作表状态，避免大表一次创建数万 DOM 节点。
- 新增主进程级未保存状态保护：关闭按钮、Alt+F4 和系统窗口关闭都会提示，避免文本/代码/Markdown 修改丢失。
- EPUB 在当前应用会话中记住每本书的章节位置，并显示章节阅读进度。

## 2026-07-07 查看器工具升级

- PDF 新增全文搜索：按 8 页一批提取文本，展示总匹配数、最多 30 个页码入口与上下文提示；支持结果跳页、90° 旋转和 PageUp/PageDown 翻页。搜索不修改原 PDF，也不声称支持 OCR。
- 图片新增逆/顺时针旋转、适应窗口、1:1 实际像素、双击复位；滚轮缩放后自动进入自由缩放模式。
- 保存流程新增成功/失败 Toast；状态栏明确显示“已修改”和 `Ctrl S 保存`，避免保存结果无反馈。

## 2026-07-07 工作台交互升级

- 新增 `Ctrl K` 命令面板，提供打开、保存、系统打开、切换标签和关闭标签；支持搜索、上下选择、Enter 执行、Esc 关闭、Tab 焦点循环与关闭后焦点回归。
- 新增 `Ctrl W` 关闭当前标签、`Ctrl Tab` / `Ctrl Shift Tab` 循环标签；标签栏支持左右方向键并采用 `tablist/tab` 语义。
- 最近文件支持单项移除并立即持久化，不删除磁盘原文件。
- ZIP 解压失败由阻塞式系统 `alert` 改为应用内可关闭错误条。
- CSV 排序状态移至正确的列头 `aria-sort` 语义。

## 2026-07-07 GitHub 发布与清理流程（必须保留）

本机可复用的可靠路径如下。下次不要重新折腾 GitHub Desktop 或把 Token 粘进命令：

1. 账户来源优先使用 Windows Git Credential Manager：`git credential-manager github list` 只显示账户名，不输出密钥。
2. 检查 CLI 登录与权限：`gh auth status`。如果 `gh` 尚未接入，但 Git Credential Manager 已有凭据，可从 `git credential fill` 在内存中读取，再通过标准输入交给 `gh auth login --with-token`；严禁打印、记录或提交 `password` 字段。
3. 新建公开仓库优先使用 `gh repo create <owner>/<repo> --public --source . --remote origin --push`。本次因 CLI 初始未登录，使用 GitHub REST `POST /user/repos` 创建 `wuxi304-collab/openme`，再执行 `git branch -M main`、设置 `origin`、`git push -u origin main`。
4. 推送前必须保证 README、LICENSE、真实能力边界、生产构建和本地提交均完成。不得把 DWG 实验性预览描述为工业级保真。
5. 删除仓库是不可逆操作：先调用 `/user/repos?affiliation=owner` 生成完整清单，排除保留仓库，再向用户展示数量与名称，并在执行前取得明确的永久删除确认。
6. GitHub 删除需要 `delete_repo` OAuth scope。通过 `gh auth refresh --hostname github.com --scopes delete_repo --clipboard` 获取；浏览器设备码流程可能因网络出现 `EOF`，只允许在确认网络瞬断后有限重试。
7. 删除时使用 `gh api --method DELETE repos/<owner>/<repo>`，逐项记录成功/失败；结束后再次枚举账户仓库，确认保留集准确。本次已删除 20 个旧仓库，复核结果仅剩公开仓库 `wuxi304-collab/openme`。
8. 安全底线：聊天、源码、脚本、Git 历史和工具输出中不得出现完整 PAT/OAuth Token。用户粘贴过的 Token 一律视为泄露，要求立即撤销。临时提升的 `delete_repo` 权限完成任务后应尽快移除或撤销对应旧令牌。

---

## 2026-07-08 → 2026-08 中期状态

下面这一段覆盖工具链从 Tauri 切到 Electron + Chrome Tooltip 迁移 + 桌面快捷启动 + Universal Audio Decoder 的阶段。新加进项目的 agent 优先读这一段；上面 2026-07 段是历史背景。

### 技术栈现状

- **Electron 34** 单进程模型，Vite 5 + React 18 + TypeScript 5 渲染器。
- **ACadSharp 3.6.35** 通过 `cad-host/` 自建 .NET 8 sidecar 提供 DWG/DXF 语义读取与 SVG 工程预览。
- **ffmpeg-static 5.3.0** 通过 `extraResources` 打入 `resources/ffmpeg/ffmpeg.exe`，主进程 demux/decode 全格式音频（FLAC/ALAC/AIFF/APE/WavPack/TAK/DSD 等）到 f32le 流，渲染端用 Web Audio API 播放。Chromium 43 内置 FFmpeg 不带无损编解码，必须用 ffmpeg-static 兜底。
- **No Tauri / no WebView2** — 本机 Smart App Control 拦截 Rust 构建脚本，已永久弃用。

### 累计交付指标

- **180+ PRs merged**（含 v0.1.0 release、Chrome Tooltip 迁移、Audio Decoder、桌面快捷启动）。
- **1182 tests passing**，tsc 0 错，vite build 4.8–6.6 s。
- **1009 zh / 1009 en i18n keys**，audit:i18n 100% clean。
- **release/OpenMe-Qiwu-0.1.0-portable-x64.exe** 113 MB（无 ffmpeg）/ 159 MB（含 ffmpeg），SHA256 校验发布。

### Chrome Tooltip 迁移（PR #176 → #179）

每一个顶层 chrome 控件（TitleBar / StatusBar / AboutDialog / SettingsDialog / FileTabs）都改用 `src/components/Tooltip.tsx`（统一 `content` prop、`useId` aria-describedby、auto-flip、viewport clamp、prefers-reduced-motion 跳过动画），不再用原生 `title=`。

- 19 个 use site。
- **理由**：原生 `title=` 出现慢、OS 风格不一致、SR 不友好；自定义 Tooltip 4 项 UX 改进（自定义延迟、键盘可达、节流 rerender、自定义样式）。

### i18n 模式

- `src/i18n.tsx` 是唯一来源；新增 viewer/key 必须 append 到文件尾，注释按 viewer 分组。
- `useI18n()` 返回 `{ t, tf, locale, setLocale }`。`t(key)` 走 `formatIcu(key, { ... })`；`tf(key, vars)` 是 `t` 的命名别名。
- **formatIcu 已知 quirk**：内嵌的 `#` substitution 永远等于外层 plural selector 的值。partial failure 模板要传 `{saved}` 而不是再写一个 `#`。
- **`scripts/audit-i18n.mjs`** 走 CI 门禁；新增 zh 字符串但缺 en（或反之）会 fail。
- **`scripts/support:matrix`** 检查所有 level 描述都进了 i18n。

### 工程约束（新增）

- **不要在 chrome 用 `title=` 属性**。统一用 `<Tooltip content={t("...")}>...</Tooltip>`。
- **不要在 `useCallback` / `useMemo` deps 里塞 `t`/`tf`**，react-hooks/exhaustive-deps 会报警。
- **从 `useI18n()` 解构时只取实际用到的字段**，否则 TS6133（declared but never read）。
- **避免按钮 label 和 Tooltip body 完全相同**——`screen.getByText` 会因 strict mode 抛 ambiguous。按钮 label 主动缩短，Tooltip body 放完整描述。
- **PR body 草稿**用 `Set-Content -Encoding UTF8 -Value @'...'@` 写临时文件，再用 `gh pr create --body-file`，不要把内嵌换行 / 中文直接走 `--body` 字符串。
- **每个 PR 一个 branch 一个 commit**，命名 `feat(<area>): <slice>`（例：`feat(tabs): add error badge tooltip`）。
- **CI 失败重试一次**：已知 flake（`AboutDialog.runtime`）；re-run 用 `gh run rerun <run-id> --failed`。
- **Merge 用 `gh api --method PUT repos/wuxi304-collab/openme/pulls/N/merge --field merge_method=merge`**；squash 不保留工时统计。
- **Merge 后立刻 `git push origin --delete <branch>`**，不要保留已合并的 remote branch。

### 工作树与 git

- 主 checkout：`C:\Users\wuxi3\Tools\openme`（main）
- 其他 session worktree：`C:\Users\wuxi3\Tools\copilot-worktrees\openme\wuxi304-collab-*`
- PR 用的 worktree branch 一律 `wuxi304-collab-<short-slug>`，merge 后保留在 main checkout
- **不要在 main 上直接开发**。每个 PR 前先 `git fetch origin main && git reset --hard origin/main`，再开新 worktree / new branch
- **`git branch -d` 在 stale remote tracking 时会拒绝**（squash merge 后 force-push）。若本地 tip 已被 main 包含，用 `git branch -D` 兜底

### 启动脚本

桌面 Windows 启动脚本全部在 `scripts/windows/`：

| 脚本 | 作用 |
|---|---|
| `start-openme.cmd` | 一键启动（npx electron → portable → win-unpacked 三级回退） |
| `deploy-branded.cmd` | 打 钢铁私塾 品牌包 |
| `install-cad-engine.cmd` | 装 .NET 8 + 构建 ACadSharp sidecar |
| `cleanup-project.cmd` | 一次性 Tauri 弃用清理脚本（已无用，可保留作历史） |

桌面快捷启动：`powershell -ExecutionPolicy Bypass -File scripts\windows\install-desktop-shortcut.ps1 -Force`，把 `OpenMe 旗悟.lnk` 放到 `%USERPROFILE%\Desktop\`，支持拖文件自动打开。

### 给未来 agent 的工作协议

1. **开 PR 前**：用 `git status` 确认在 feature branch；用 `npm run test` 跑基线；`git fetch origin main` 同步远端。
2. **实现**：每个 chrome 控件查 `title=` → 改 `<Tooltip content>`；新 viewer 查硬编码中文 → 走 `useI18n`；新功能先写 1-2 个 i18n key 进 `i18n.tsx` 再 wire。
3. **测试**：vitest + RTL；chrome 行为断言用 `screen.getByRole` / `screen.getByText`；用户态断言 `screen.getByText` + `expect(button.textContent)`（避 ambiguous）。
4. **验证 gate**（PR push 前必跑）：
   - `npx tsc --noEmit` → 0 错
   - `npm run test` → 全部绿
   - `npm run audit:i18n` → 1009 zh / 1009 en
   - `npm run build` → 干净 vite build
5. **PR body**：写英文，按「What / Why / How / Test plan / English copy review」五段；`English copy review` 段是新 i18n 字符串必经评审入口。
6. **Merge 后**：`git fetch origin main && git reset --hard origin/main`，保留 main 在工作区干净状态。
7. **不要做的事**：
   - 不要把 DWG SVG 描述成"精准预览"
   - 不要把 Toasts 的 internal action 接 synchronous window.open（要 `internal` kind + onSelect）
   - 不要给 IRREVERSIBLE 操作（关未保存标签、清空 recents、删除文件）省掉 confirm dialog
   - 不要把 chrome modal 的 `tabIndex={-1}` 设到非根节点（会破坏 focus trap）


