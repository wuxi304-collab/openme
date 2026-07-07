import type { FileCategory } from "../utils/fileTypeDetector";

export type FileCapability = "detect" | "preview" | "edit" | "metadata" | "thumbnail" | "ai-summary" | "external-open";

export type HonestSupportLevel = "A+" | "A" | "B" | "C" | "D" | "E" | "F";

export type FileOpenStrategy = "builtin" | "text" | "semantic" | "external" | "restricted";

export type FileRiskLevel = "low" | "medium" | "high";

export type PreferredViewerId =
  | "text-viewer"
  | "markdown-viewer"
  | "json-viewer"
  | "table-viewer"
  | "pdf-viewer"
  | "office-viewer"
  | "image-viewer"
  | "svg-viewer"
  | "media-viewer"
  | "archive-viewer"
  | "cad-viewer"
  | "font-viewer"
  | "route-only";

export interface FileFormatDefinition {
  extension: string;
  name: string;
  category: FileCategory;
  description?: string;
  mime?: string;
  capabilities: FileCapability[];
  supportLevel: HonestSupportLevel;
  boundary: string;
  nativeApps?: string[];
  aliases?: string[];
  preferredViewer?: PreferredViewerId;
  openStrategy?: FileOpenStrategy;
  riskLevel?: FileRiskLevel;
  tags?: string[];
}

export interface FileRegistryStats {
  total: number;
  byCategory: Record<string, number>;
  bySupportLevel: Record<HonestSupportLevel, number>;
}
