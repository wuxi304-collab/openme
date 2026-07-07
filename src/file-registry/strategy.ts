import type { FileCategory } from "../utils/fileTypeDetector";
import type { FileFormatDefinition, FileOpenStrategy, FileRiskLevel, PreferredViewerId } from "./types";

export interface RegistryStrategy {
  preferredViewer: PreferredViewerId;
  openStrategy: FileOpenStrategy;
  riskLevel: FileRiskLevel;
  tags: string[];
}

const categoryViewers: Record<FileCategory, PreferredViewerId> = {
  code: "text-viewer",
  markdown: "markdown-viewer",
  json: "json-viewer",
  csv: "table-viewer",
  image: "image-viewer",
  svg: "svg-viewer",
  pdf: "pdf-viewer",
  office: "office-viewer",
  archive: "archive-viewer",
  epub: "office-viewer",
  audio: "media-viewer",
  video: "media-viewer",
  font: "font-viewer",
  cad: "cad-viewer",
  dwg: "cad-viewer",
  design: "route-only",
  package: "route-only",
  disk: "route-only",
  other: "route-only",
};

const highRiskCategories = new Set<FileCategory>(["package", "disk"]);
const mediumRiskCategories = new Set<FileCategory>(["archive", "design", "cad", "dwg", "other"]);
const textCategories = new Set<FileCategory>(["code", "markdown", "json", "csv", "svg"]);

export function getRegistryStrategy(format: FileFormatDefinition): RegistryStrategy {
  return {
    preferredViewer: format.preferredViewer ?? derivePreferredViewer(format),
    openStrategy: format.openStrategy ?? deriveOpenStrategy(format),
    riskLevel: format.riskLevel ?? deriveRiskLevel(format),
    tags: format.tags ?? deriveTags(format),
  };
}

export function derivePreferredViewer(format: FileFormatDefinition): PreferredViewerId {
  return categoryViewers[format.category] ?? "route-only";
}

export function deriveOpenStrategy(format: FileFormatDefinition): FileOpenStrategy {
  if (format.openStrategy) return format.openStrategy;
  if (highRiskCategories.has(format.category)) return "restricted";
  if (textCategories.has(format.category)) return "text";
  if (format.capabilities.includes("preview")) return "builtin";
  if (format.capabilities.includes("ai-summary") || format.capabilities.includes("metadata")) return "semantic";
  return "external";
}

export function deriveRiskLevel(format: FileFormatDefinition): FileRiskLevel {
  if (format.riskLevel) return format.riskLevel;
  if (highRiskCategories.has(format.category)) return "high";
  if (mediumRiskCategories.has(format.category)) return "medium";
  return "low";
}

export function deriveTags(format: FileFormatDefinition): string[] {
  const tags = new Set<string>([format.category, format.supportLevel.toLowerCase()]);
  if (format.capabilities.includes("preview")) tags.add("previewable");
  if (format.capabilities.includes("edit")) tags.add("editable");
  if (format.capabilities.includes("external-open")) tags.add("external-open");
  if (deriveOpenStrategy(format) === "restricted") tags.add("restricted-open");
  return [...tags];
}
