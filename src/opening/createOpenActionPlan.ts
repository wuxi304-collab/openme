import type { FileBrief, FileBriefAction } from "../brief";
import type { OpenActionKind, OpenActionPlan } from "./types";

export function createOpenActionPlan(brief: FileBrief): OpenActionPlan {
  const action = getPrimaryAction(brief.actions);
  const kind = resolveKind(brief.openStrategy);

  return {
    kind,
    viewer: brief.preferredViewer,
    strategy: brief.openStrategy,
    risk: brief.riskLevel,
    primaryLabel: action.label,
    explanation: action.reason,
    requiresConfirmation: brief.riskLevel === "high" || kind === "blocked",
    canUseInternalViewer: kind === "preview" || kind === "text-preview",
    action,
  };
}

function resolveKind(strategy: FileBrief["openStrategy"]): OpenActionKind {
  if (strategy === "restricted") return "blocked";
  if (strategy === "external") return "handoff";
  if (strategy === "text") return "text-preview";
  if (strategy === "semantic") return "inspect";
  return "preview";
}

function getPrimaryAction(actions: FileBriefAction[]): FileBriefAction {
  return actions.find((action) => action.priority === "primary") ?? actions[0] ?? {
    label: "Inspect file",
    reason: "No stronger action was generated for this file brief.",
    priority: "primary",
  };
}
