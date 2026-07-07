import type { FileCategory } from "../utils/fileTypeDetector";

export type FileCapability = "detect" | "preview" | "edit" | "metadata" | "thumbnail" | "ai-summary" | "external-open";

export type HonestSupportLevel = "A+" | "A" | "B" | "C" | "D" | "E" | "F";

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
}

export interface FileRegistryStats {
  total: number;
  byCategory: Record<string, number>;
  bySupportLevel: Record<HonestSupportLevel, number>;
}
