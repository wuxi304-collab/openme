import type { FileBriefAction } from "../brief";
import type { FileOpenStrategy, FileRiskLevel, PreferredViewerId } from "../file-registry";

export type OpenActionKind = "preview" | "text-preview" | "inspect" | "handoff" | "blocked";

export interface OpenActionPlan {
  kind: OpenActionKind;
  viewer: PreferredViewerId;
  strategy: FileOpenStrategy;
  risk: FileRiskLevel;
  primaryLabel: string;
  explanation: string;
  requiresConfirmation: boolean;
  canUseInternalViewer: boolean;
  action: FileBriefAction;
}
