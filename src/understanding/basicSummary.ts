import { getSupportLevel, getSupportLevelLabel } from "./supportLevels";
import type { Translator } from "../i18n";
import type { FileSummary, SummaryInput } from "./types";

export function buildBasicFileSummary(input: SummaryInput, t: Translator): FileSummary {
  const supportLevel = getSupportLevel(input.category);
  const extension = input.extension?.trim() || extensionFromName(input.fileName) || t("unknownExtension");
  const sizeLabel = typeof input.size === "number" ? formatBytes(input.size, t) : t("unknownSize");
  const warnings = getCategoryWarnings(input.category, t);

  return {
    filePath: input.filePath,
    fileName: input.fileName,
    category: input.category,
    supportLevel,
    title: input.fileName,
    description: `${getCategoryLabel(input.category, t)} · ${getSupportLevelLabel(supportLevel, t)}`,
    signals: [
      t("signalFormat", { ext: extension }),
      t("signalSize", { size: sizeLabel }),
      t("signalSupportLevel", { level: getSupportLevelLabel(supportLevel, t) }),
    ],
    warnings,
    evidence: [
      { label: t("evidenceFileName"), value: input.fileName },
      { label: t("evidenceFileType"), value: getCategoryLabel(input.category, t) },
      { label: t("evidenceSupportLevel"), value: getSupportLevelLabel(supportLevel, t), severity: supportLevel === "external-open" || supportLevel === "experimental" || supportLevel === "semantic-inspection" ? "warning" : "info" },
      { label: t("evidenceFileSize"), value: sizeLabel },
    ],
  };
}

function getCategoryLabel(category: SummaryInput["category"], t: Translator): string {
  switch (category) {
    case "code": return t("categoryCode");
    case "markdown": return t("categoryMarkdown");
    case "json": return t("categoryJson");
    case "csv": return t("categoryCsv");
    case "image": return t("categoryImage");
    case "svg": return t("categorySvg");
    case "pdf": return t("categoryPdf");
    case "office": return t("categoryOffice");
    case "archive": return t("categoryArchive");
    case "epub": return t("categoryEpub");
    case "audio": return t("categoryAudio");
    case "video": return t("categoryVideo");
    case "font": return t("categoryFont");
    case "cad": return t("categoryCad");
    case "dwg": return t("categoryDwg");
    case "design": return t("categoryDesign");
    case "package": return t("categoryPackage");
    case "disk": return t("categoryDisk");
    case "other":
    default:
      return t("categoryOther");
  }
}

function getCategoryWarnings(category: SummaryInput["category"], t: Translator): string[] {
  switch (category) {
    case "dwg":
      return [t("warningDwg")];
    case "cad":
      return [t("warningCad")];
    case "audio":
    case "video":
      return [t("warningMedia")];
    case "office":
      return [t("warningOffice")];
    case "svg":
      return [t("warningSvg")];
    case "design":
      return [t("warningDesign")];
    case "package":
      return [t("warningPackage")];
    case "disk":
      return [t("warningDisk")];
    case "archive":
      return [t("warningArchive")];
    default:
      return [];
  }
}

function extensionFromName(fileName: string): string {
  const index = fileName.lastIndexOf(".");
  return index >= 0 ? fileName.slice(index).toLowerCase() : "";
}

function formatBytes(bytes: number, t: Translator): string {
  if (!Number.isFinite(bytes) || bytes < 0) return t("unknownSize");
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