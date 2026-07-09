## 概要 / Summary

FileSummaryPanel 元数据扩充 / FilesSummaryPanel metadata enrichment (closes the "how do I trust this file?" gap surfaced in earlier reviews)。

新增 4 个数据列 + 2 个动作按钮，对每一张打开的文件都能立刻核实路径 / 修改时间 / SHA-256 指纹，并在系统文件管理器里打开或导出元数据。SHA-256 通过主进程流式 1 MiB chunk 完成，多 GB 文件也不卡 UI。

## 改动 / Changes

### 主进程 / Main process

- `electron/main.js` 新增两个 IPC handler：
  - `reveal-in-folder(path)` — 调 `shell.showItemInFolder` 跨平台支持 (Explorer / Finder / Nautilus)
  - `get-file-hash(path)` — 用 `crypto.createHash("sha256")` + 1 MiB chunk 流式读取，返 `{ ok, hash, shortHash, size, computedAt }`
- `electron/preload.js` 暴露 `revealInFolder` / `getFileHash`
- `electron/ipcErrors.js` 加 `REVEAL_IN_FOLDER_FAILED` / `FILE_HASH_FAILED` 两个错误码

### 类型 / Types

- `src/types/electron-api.d.ts`：新增 `RevealResult` 与 `FileHashResult` interface

### Renderer

- `src/utils/format.ts`（全新）：本地化格式化
  - `formatFileSize(bytes, lang)` — < 1 KB 显示原 B 数；≥ 10 用 1 位小数；< 10 strip trailing zeros
  - `formatRelativeTime(input, lang)` — < 5 s / < 60 s / 分钟 / 小时 / 天 / ≥ 30 天（落绝对日期）
- `src/utils/format.test.ts`：10 个单测覆盖零 / 边界 / 单位换算
- `src/components/FileSummaryPanel.tsx`：在 registry / capability grid 之后插入新的 File metadata section：
  - 路径（带 copy button — flashCopy 视觉反馈 1.4 s + toast 提示）
  - 大小（带 locale-aware 单位）
  - 修改时间（带 locale-aware 相对时间）
  - 指纹 — 流式 SHA-256 的 16 字符 short hash + Copy 完整版（disabled when loading/error）
  - Show in file manager / Copy as JSON 两个动作按钮
- `src/file-summary.css`：新增 `.summary-metadata-list` / `.summary-metadata-row` / `.summary-metadata-copy` / `.summary-metadata-hash-cell` / `.summary-metadata-button` 等样式（融合 C91F37 主题色 + 9be7a8 复制完成染色 + focus-visible 描边）

### i18n

19 对新键 zh + en 双语齐头（部分挑选示例）：

| key | zh | en |
| --- | --- | --- |
| `summaryMetadataSection` | 文件元数据 | File metadata |
| `summaryPath` | 路径 | Path |
| `summarySize` | 大小 | Size |
| `summaryModified` | 修改时间 | Modified |
| `summaryHash` | 指纹 | Fingerprint |
| `summaryHashShort` | 前 16 位 | First 16 chars |
| `summaryHashFull` | 完整 SHA-256 | Full SHA-256 |
| `summaryHashPending` | 正在计算… | Computing… |
| `summaryHashFailed` | 计算失败 | Hash failed |
| `summaryHashCopied` | 指纹已复制 | Fingerprint copied |
| `summaryHashCopyAria` | 复制完整 SHA-256 | Copy full SHA-256 |
| `summaryPathCopyAria` | 复制文件路径 | Copy file path |
| `summaryPathCopied` | 路径已复制 | Path copied |
| `summaryRevealInFolder` | 在文件管理器中显示 | Show in file manager |
| `summaryRevealInFolderAria` | 在系统文件管理器中定位该文件 | Reveal the file in the host file manager |
| `summaryCopyAsJson` | 复制为 JSON | Copy as JSON |
| `summaryCopyAsJsonCopied` | 元数据已复制 | Metadata copied |
| `summaryRevealFailed` | 无法在文件管理器中显示 | Could not reveal in file manager |

"指纹 / Fingerprint" 选用避免与 macOS "Fingerprint" (Touch ID) 混淆，又比 "SHA-256" 更通俗；"前 16 位 / First 16 chars" 比 "First 16 chars of the hash" 更紧凑。

## 测试 / Tests

- 新增 `src/components/FileSummaryPanel.metadata.test.tsx`，10 个测试：
  - zh 渲染 5 个英文 key 的 zh 翻译
  - en 渲染 metadata section heading + 4 个 column key
  - en — SHA-256 resolve 后渲染 16-char short hash
  - en — IPC failure 降级为 "Hash failed" 状态 + copy 按钮 disabled
  - en — Copy path → `navigator.clipboard.writeText(path)` 调用
  - en — Copy as JSON / Show in file manager button labels
  - en — Reveal in folder → 转发到 IPC handler

## 验证 / Validation

- `npx tsc --noEmit` ✓
- `npm test` 307 / 307 ✓
- `npm run audit:i18n` 559 zh + 559 en，全镜像 ✓
- `npm run build` ✓

## 后续 / Follow-up

下一切片候选：
- Error boundary + viewer retry
- Keyboard shortcuts overlay
- Workspace tabs drag-reorder
- Recent files 增强（size + last opened 时间）
- Settings → About → FileSummaryPanel 形成完整的 onboarding loop

🤖 Generated with [OpenMe PR Assistant](https://github.com/wuxi304-collab/openme)

Co-authored-by: Copilot App <223556219+Copilot@users.noreply.github.com>
