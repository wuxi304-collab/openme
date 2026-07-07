import { getFileFormatByPath, getRegistryStrategy } from "../file-registry";
import type { MetadataEvidence, MetadataInput, MetadataResult } from "./types";

export function extractMetadata(input: MetadataInput): MetadataResult {
  const format = getFileFormatByPath(input.filePath);
  const strategy = format ? getRegistryStrategy(format) : undefined;
  const extension = input.extension ?? format?.extension ?? deriveExtension(input.fileName || input.filePath);
  const category = format?.category ?? "other";
  const supportLevel = format?.supportLevel ?? "F";
  const preferredViewer = strategy?.preferredViewer ?? "route-only";
  const openStrategy = strategy?.openStrategy ?? "external";
  const riskLevel = strategy?.riskLevel ?? "medium";
  const warnings: string[] = [];
  const evidence: MetadataEvidence[] = [];

  evidence.push({ source: "file", label: "Name", value: input.fileName, severity: "info" });
  evidence.push({ source: "file", label: "Extension", value: extension || "unknown", severity: extension ? "info" : "warning" });

  if (typeof input.size === "number") {
    evidence.push({ source: "file", label: "Size", value: formatBytes(input.size), severity: "info" });
  }

  if (format) {
    evidence.push({ source: "registry", label: "Registered format", value: format.name, severity: "info" });
    evidence.push({ source: "registry", label: "Support level", value: format.supportLevel, severity: "info" });
    evidence.push({ source: "strategy", label: "Open strategy", value: openStrategy, severity: riskLevel === "high" ? "risk" : "info" });
  } else {
    warnings.push("No registry entry matched this file. OpenMe will route it conservatively.");
    evidence.push({ source: "registry", label: "Registered format", value: "No match", severity: "warning" });
  }

  if (riskLevel === "high") {
    warnings.push("This file family is treated as high risk and should not be opened as active content inside OpenMe.");
  }

  const textStats = getTextStats(input.textSample);
  if (textStats) {
    evidence.push({ source: "content", label: "Text lines", value: String(textStats.lineCount), severity: "info" });
    evidence.push({ source: "content", label: "Characters", value: String(textStats.characterCount), severity: "info" });
  }

  return {
    filePath: input.filePath,
    fileName: input.fileName,
    extension,
    category,
    size: input.size,
    modifiedAt: input.modifiedAt,
    mime: format?.mime,
    supportLevel,
    preferredViewer,
    openStrategy,
    riskLevel,
    encoding: textStats ? "text" : undefined,
    lineCount: textStats?.lineCount,
    characterCount: textStats?.characterCount,
    warnings,
    evidence,
  };
}

export function deriveExtension(value: string): string {
  const base = value.split(/[\\/]/).pop() ?? value;
  const lower = base.toLowerCase();
  const compoundExtensions = [".tar.gz", ".tar.bz2", ".tar.xz", ".nii.gz"];
  const compound = compoundExtensions.find((extension) => lower.endsWith(extension));
  if (compound) return compound;
  const dot = lower.lastIndexOf(".");
  return dot >= 0 ? lower.slice(dot) : "";
}

export function formatBytes(size: number): string {
  if (!Number.isFinite(size) || size < 0) return "unknown";
  if (size < 1024) return `${size} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = size / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value >= 10 ? 1 : 2)} ${units[unitIndex]}`;
}

function getTextStats(textSample: string | undefined): { lineCount: number; characterCount: number } | undefined {
  if (!textSample) return undefined;
  return {
    lineCount: textSample.split(/\r\n|\r|\n/).length,
    characterCount: textSample.length,
  };
}
