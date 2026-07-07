import type { FileCategory } from "../types";

export type SupportLevel =
  | "full-built-in"
  | "high-fidelity"
  | "safe-approximate"
  | "semantic-inspection"
  | "external-open"
  | "experimental";

export type EvidenceSeverity = "info" | "warning" | "risk";

export interface FileEvidence {
  label: string;
  value: string;
  severity?: EvidenceSeverity;
  location?: string;
}

export interface FileSummary {
  filePath: string;
  fileName: string;
  category: FileCategory;
  supportLevel: SupportLevel;
  title: string;
  description: string;
  signals: string[];
  warnings: string[];
  evidence: FileEvidence[];
}

export interface SummaryInput {
  filePath: string;
  fileName: string;
  category: FileCategory;
  extension?: string;
  size?: number;
  textSample?: string;
}
