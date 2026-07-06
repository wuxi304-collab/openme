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
