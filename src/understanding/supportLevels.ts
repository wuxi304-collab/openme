import type { FileCategory } from "../types";
import type { SupportLevel } from "./types";

export function getSupportLevel(category: FileCategory): SupportLevel {
  switch (category) {
    case "code":
    case "json":
    case "csv":
    case "image":
      return "full-built-in";
    case "pdf":
      return "high-fidelity";
    case "markdown":
    case "svg":
    case "office":
    case "epub":
      return "safe-approximate";
    case "dwg":
    case "design":
    case "package":
    case "disk":
      return "semantic-inspection";
    case "cad":
      return "experimental";
    case "audio":
    case "video":
      return "experimental";
    case "archive":
    case "font":
      return "full-built-in";
    case "other":
    default:
      return "external-open";
  }
}

export function getSupportLevelLabel(level: SupportLevel): string {
  switch (level) {
    case "full-built-in":
      return "完整内置浏览";
    case "high-fidelity":
      return "高保真浏览";
    case "safe-approximate":
      return "安全近似预览";
    case "semantic-inspection":
      return "语义检查";
    case "external-open":
      return "外部打开";
    case "experimental":
      return "实验性";
  }
}
