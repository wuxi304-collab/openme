import { getSupportLevel, getSupportLevelLabel } from "./supportLevels";
import type { FileSummary, SummaryInput } from "./types";

export function buildBasicFileSummary(input: SummaryInput): FileSummary {
  const supportLevel = getSupportLevel(input.category);
  const extension = input.extension?.trim() || extensionFromName(input.fileName) || "未知扩展名";
  const sizeLabel = typeof input.size === "number" ? formatBytes(input.size) : "未知大小";
  const warnings = getCategoryWarnings(input.category);

  return {
    filePath: input.filePath,
    fileName: input.fileName,
    category: input.category,
    supportLevel,
    title: input.fileName,
    description: `${getCategoryLabel(input.category)} · ${getSupportLevelLabel(supportLevel)}`,
    signals: [
      `格式：${extension}`,
      `大小：${sizeLabel}`,
      `支持等级：${getSupportLevelLabel(supportLevel)}`,
    ],
    warnings,
    evidence: [
      { label: "文件名", value: input.fileName },
      { label: "文件类型", value: getCategoryLabel(input.category) },
      { label: "支持等级", value: getSupportLevelLabel(supportLevel), severity: supportLevel === "external-open" || supportLevel === "experimental" || supportLevel === "semantic-inspection" ? "warning" : "info" },
      { label: "文件大小", value: sizeLabel },
    ],
  };
}

function getCategoryLabel(category: SummaryInput["category"]): string {
  switch (category) {
    case "code": return "代码";
    case "markdown": return "Markdown";
    case "json": return "JSON";
    case "csv": return "CSV";
    case "image": return "图片";
    case "svg": return "SVG";
    case "pdf": return "PDF";
    case "office": return "Office 文档";
    case "archive": return "压缩包";
    case "epub": return "电子书";
    case "audio": return "音频";
    case "video": return "视频";
    case "font": return "字体";
    case "cad": return "3D / 工程模型";
    case "dwg": return "DWG / DXF 图纸";
    case "design": return "设计源文件";
    case "package": return "安装包 / 应用包";
    case "disk": return "磁盘镜像 / 虚拟机镜像";
    case "other":
    default:
      return "未知文件";
  }
}

function getCategoryWarnings(category: SummaryInput["category"]): string[] {
  switch (category) {
    case "dwg":
      return ["DWG/DXF 预览属于语义检查或近似预览，不承诺 AutoCAD 级保真。"];
    case "cad":
      return ["3D 模型预览仍属实验性，复杂装配、材质和 STEP 语义可能不完整。"];
    case "audio":
    case "video":
      return ["音视频容器识别不等于编码器可播放，失败时应使用系统程序打开。"];
    case "office":
      return ["Office 预览不承诺分页、浮动对象、宏、图表和复杂样式完全一致。"];
    case "svg":
      return ["SVG 必须隔离预览，不执行脚本。"];
    case "design":
      return ["设计源文件先做格式识别与外部打开路由；PSD、AI、Sketch、Figma 等不承诺内置高保真预览。"];
    case "package":
      return ["安装包和应用包先做语义检查与外部打开路由；不执行安装器、不运行未知二进制。"];
    case "disk":
      return ["磁盘镜像和虚拟机镜像先做识别与外部打开路由；不自动挂载、不自动解包。"];
    case "archive":
      return ["ZIP 可内置浏览；RAR、7Z、TAR、GZ 等仍应走外部打开或后续专用解包器。"];
    default:
      return [];
  }
}

function extensionFromName(fileName: string): string {
  const index = fileName.lastIndexOf(".");
  return index >= 0 ? fileName.slice(index).toLowerCase() : "";
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "未知大小";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value >= 10 ? 1 : 2)} ${units[unitIndex]}`;
}
