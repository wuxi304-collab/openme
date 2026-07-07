import { FILE_FORMATS as BASE_FILE_FORMATS } from "./formats";
import { EXPANDED_FILE_FORMATS } from "./expanded-formats";
import type { FileFormatDefinition, FileRegistryStats, HonestSupportLevel } from "./types";

export type { FileCapability, FileFormatDefinition, FileRegistryStats, FileOpenStrategy, FileRiskLevel, HonestSupportLevel, PreferredViewerId } from "./types";
export type { RegistryStrategy } from "./strategy";
export { FILE_FORMATS as BASE_FILE_FORMATS } from "./formats";
export { EXPANDED_FILE_FORMATS } from "./expanded-formats";
export { deriveOpenStrategy, derivePreferredViewer, deriveRiskLevel, deriveTags, getRegistryStrategy } from "./strategy";

export const FILE_FORMATS: FileFormatDefinition[] = dedupeByExtension([...BASE_FILE_FORMATS, ...EXPANDED_FILE_FORMATS]);

const extensionMap = new Map(FILE_FORMATS.map((format) => [format.extension.toLowerCase(), format]));

export function normalizeExtension(extension: string): string {
  const value = extension.trim().toLowerCase();
  if (!value) return "";
  return value.startsWith(".") ? value : `.${value}`;
}

export function getFileFormatByExtension(extension: string): FileFormatDefinition | undefined {
  return extensionMap.get(normalizeExtension(extension));
}

export function getFileFormatByPath(filePath: string): FileFormatDefinition | undefined {
  const lower = filePath.toLowerCase();
  const base = lower.split(/[\\/]/).pop() ?? lower;

  if (base === "dockerfile") return syntheticCodeFormat("Dockerfile", "dockerfile");
  if (base === "makefile") return syntheticCodeFormat("Makefile", "makefile");
  if (base === "rakefile") return syntheticCodeFormat("Rakefile", "rakefile");
  if (base === "gemfile") return syntheticCodeFormat("Gemfile", "gemfile");
  if (base === "podfile") return syntheticCodeFormat("Podfile", "podfile");
  if (base === "justfile") return syntheticCodeFormat("Justfile", "justfile");

  const sortedExtensions = [...extensionMap.keys()].sort((a, b) => b.length - a.length);
  const matched = sortedExtensions.find((extension) => lower.endsWith(extension));
  return matched ? extensionMap.get(matched) : undefined;
}

export function getFileRegistryStats(): FileRegistryStats {
  const supportLevels: HonestSupportLevel[] = ["A+", "A", "B", "C", "D", "E", "F"];
  const bySupportLevel = Object.fromEntries(supportLevels.map((level) => [level, 0])) as Record<HonestSupportLevel, number>;
  const byCategory: Record<string, number> = {};

  for (const format of FILE_FORMATS) {
    byCategory[format.category] = (byCategory[format.category] ?? 0) + 1;
    bySupportLevel[format.supportLevel] += 1;
  }

  return { total: FILE_FORMATS.length, byCategory, bySupportLevel };
}

function dedupeByExtension(formats: FileFormatDefinition[]): FileFormatDefinition[] {
  const seen = new Set<string>();
  const result: FileFormatDefinition[] = [];
  for (const format of formats) {
    const key = format.extension.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(format);
  }
  return result;
}

function syntheticCodeFormat(name: string, extension: string): FileFormatDefinition {
  return {
    extension,
    name,
    category: "code",
    capabilities: ["detect", "preview", "edit", "metadata", "ai-summary", "external-open"],
    supportLevel: "A",
    boundary: "Text editing only; scripts or build recipes are never executed.",
    preferredViewer: "text-viewer",
    openStrategy: "text",
    riskLevel: "low",
    tags: ["code", "text", "editable"],
  };
}
