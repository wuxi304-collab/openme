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
