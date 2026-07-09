import type { FileCategory } from "../utils/fileTypeDetector";
import type { FileOpenStrategy, FileRiskLevel, HonestSupportLevel, PreferredViewerId } from "../file-registry";
import type { MetadataEvidence } from "../metadata";
import type { ExternalAppHint } from "../viewer-registry/externalApps";

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
  /**
   * Suggested native apps to hand the file off to. Only populated for D/E/F
   * formats where the brief recommends routing outside OpenMe.
   */
  suggestedApps: ExternalAppHint[];
}
