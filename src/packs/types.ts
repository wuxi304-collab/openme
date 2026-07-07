export type PackStatus = "planned" | "experimental" | "preview" | "stable";

export type PackPermission =
  | "read-file-metadata"
  | "read-file-content"
  | "read-workspace-summary"
  | "suggest-actions"
  | "external-open"
  | "ai-assisted";

export type SupportedFileCategory =
  | "pdf"
  | "office"
  | "text"
  | "code"
  | "data"
  | "image"
  | "svg"
  | "archive"
  | "audio"
  | "video"
  | "font"
  | "epub"
  | "cad"
  | "dwg"
  | "model3d"
  | "other";

export interface DomainPackManifest {
  id: string;
  displayName: string;
  zhName: string;
  tagline: string;
  description: string;
  status: PackStatus;
  version: string;
  supportedCategories: SupportedFileCategory[];
  permissions: PackPermission[];
  keywords: string[];
}

export interface PackRegistryEntry {
  manifest: DomainPackManifest;
  enabledByDefault: boolean;
}

export interface PackSuggestion {
  packId: string;
  confidence: number;
  reason: string;
}
