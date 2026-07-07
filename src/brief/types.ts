import type { FileCategory } from "../utils/fileTypeDetector";
import type { FileOpenStrategy, FileRiskLevel, HonestSupportLevel, PreferredViewerId } from "../file-registry";
import type { MetadataEvidence } from "../metadata";

export interface FileBriefAction {
  label: string;
  reason: string;
  priority: "primary" | "secondary";
}

export interface FileBrief {
  title: string;
  subtitle: string;
  category: FileCategory;
  supportLevel: HonestSupportLevel;
  preferredViewer: PreferredViewerId;
  openStrategy: FileOpenStrategy;
  riskLevel: FileRiskLevel;
  signals: string[];
  warnings: string[];
  actions: FileBriefAction[];
  evidence: MetadataEvidence[];
}
