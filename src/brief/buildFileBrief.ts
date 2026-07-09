import type { MetadataResult } from "../metadata";
import type { FileBrief, FileBriefAction } from "./types";
import { getExternalAppHints } from "../viewer-registry/externalApps";

export function buildFileBrief(metadata: MetadataResult): FileBrief {
  const signals = buildSignals(metadata);
  const warnings = buildWarnings(metadata);
  const actions = buildActions(metadata);
  const suggestedApps = getExternalAppHints(
    metadata.extension,
    metadata.category,
    metadata.openStrategy,
    metadata.supportLevel,
  );

  return {
    title: metadata.fileName,
    subtitle: buildSubtitle(metadata),
    category: metadata.category,
    supportLevel: metadata.supportLevel,
    preferredViewer: metadata.preferredViewer,
    openStrategy: metadata.openStrategy,
    riskLevel: metadata.riskLevel,
    signals,
    warnings,
    actions,
    evidence: metadata.evidence,
    suggestedApps,
  };
}

function buildSubtitle(metadata: MetadataResult): string {
  const parts = [metadata.category, metadata.extension || "unknown extension", `support ${metadata.supportLevel}`, metadata.openStrategy];
  return parts.join(" · ");
}

function buildSignals(metadata: MetadataResult): string[] {
  const signals = new Set<string>();
  signals.add(`viewer:${metadata.preferredViewer}`);
  signals.add(`strategy:${metadata.openStrategy}`);
  signals.add(`risk:${metadata.riskLevel}`);
  signals.add(`support:${metadata.supportLevel}`);
  if (metadata.mime) signals.add(`mime:${metadata.mime}`);
  if (typeof metadata.size === "number") signals.add("has-size");
  if (metadata.lineCount) signals.add(`lines:${metadata.lineCount}`);
  if (metadata.characterCount) signals.add(`chars:${metadata.characterCount}`);
  return [...signals];
}

function buildWarnings(metadata: MetadataResult): string[] {
  const warnings = [...metadata.warnings];
  if (metadata.supportLevel === "F") warnings.push("This file has no registered support entry yet.");
  if (metadata.openStrategy === "restricted") warnings.push("OpenMe will not open this file as active content.");
  if (metadata.riskLevel === "high" && !warnings.some((warning) => warning.toLowerCase().includes("high risk"))) {
    warnings.push("This file family requires an explicit handoff to trusted system tools.");
  }
  return dedupe(warnings);
}

function buildActions(metadata: MetadataResult): FileBriefAction[] {
  if (metadata.openStrategy === "restricted") {
    return [
      { label: "Review boundary", reason: "This file family is intentionally restricted in OpenMe.", priority: "primary" },
      { label: "Open with trusted system tool", reason: "Use the operating system or a verified native application for this format.", priority: "secondary" },
    ];
  }

  if (metadata.openStrategy === "external") {
    return [
      { label: "Open externally", reason: "OpenMe can identify the file but does not provide an internal viewer.", priority: "primary" },
      { label: "Add registry coverage", reason: "A richer registry entry can improve guidance for this format.", priority: "secondary" },
    ];
  }

  if (metadata.openStrategy === "semantic") {
    return [
      { label: "Inspect metadata", reason: "OpenMe can provide safe metadata and summary signals.", priority: "primary" },
      { label: "Use native application", reason: "Full-fidelity authoring or rendering belongs in the source application.", priority: "secondary" },
    ];
  }

  if (metadata.openStrategy === "text") {
    return [
      { label: "Open text preview", reason: "This file can be inspected as text.", priority: "primary" },
      { label: "Check encoding", reason: "Text rendering quality depends on encoding and file size.", priority: "secondary" },
    ];
  }

  return [
    { label: "Open preview", reason: "OpenMe has a built-in viewing path for this file family.", priority: "primary" },
    { label: "Inspect evidence", reason: "Review registry and metadata evidence before taking action.", priority: "secondary" },
  ];
}

function dedupe(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}
