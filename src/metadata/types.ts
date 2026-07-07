import type { FileCategory } from "../utils/fileTypeDetector";
import type { FileOpenStrategy, FileRiskLevel, HonestSupportLevel, PreferredViewerId } from "../file-registry";

export type MetadataEvidenceSource = "file" | "registry" | "strategy" | "content";
export type MetadataEvidenceSeverity = "info" | "warning" | "risk";

export interface MetadataEvidence {
  source: MetadataEvidenceSource;
  label: string;
  value: string;
  severity: MetadataEvidenceSeverity;
}

export interface MetadataInput {
  filePath: string;
  fileName: string;
  extension?: string;
  size?: number;
  modifiedAt?: string;
  textSample?: string;
}

export interface MetadataResult {
  filePath: string;
  fileName: string;
  extension: string;
  category: FileCategory;
  size?: number;
  modifiedAt?: string;
  mime?: string;
  supportLevel: HonestSupportLevel;
  preferredViewer: PreferredViewerId;
  openStrategy: FileOpenStrategy;
  riskLevel: FileRiskLevel;
  encoding?: string;
  lineCount?: number;
  characterCount?: number;
  warnings: string[];
  evidence: MetadataEvidence[];
}
