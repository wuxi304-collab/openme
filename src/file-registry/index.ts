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

// Precomputed once: extensions sorted longest-first so compound extensions such as
// ".tar.gz" or ".nii.gz" win over their shorter suffixes. Previously this array was
// rebuilt and re-sorted on every getFileFormatByPath call (every render/pipeline run).
const sortedExtensions = [...extensionMap.keys()].sort((a, b) => b.length - a.length);

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

/**
 * Resolves duplicate extension claims. `.ts` is the canonical example: it is both
 * TypeScript and an MPEG transport stream. In a general file workspace the text/code
 * reading is the safer, more common default, so text-like categories win over
 * binary/media ones on conflict.
 *
 * Declared inside the function on purpose: `dedupeByExtension` runs while `FILE_FORMATS`
 * is being initialised, so a module-level `const` referenced here would still be in the
 * temporal dead zone and would throw the moment a real conflict appears.
 */
export function dedupeByExtension(formats: FileFormatDefinition[]): FileFormatDefinition[] {
  const textPreferredCategories = new Set<string>(["code", "markdown", "json", "csv", "svg"]);
  const byExtension = new Map<string, FileFormatDefinition>();
  for (const format of formats) {
    const key = format.extension.toLowerCase();
    const existing = byExtension.get(key);
    if (!existing) {
      byExtension.set(key, format);
      continue;
    }
    // Deterministic conflict resolution: keep the text-like interpretation.
    if (!textPreferredCategories.has(existing.category) && textPreferredCategories.has(format.category)) {
      byExtension.set(key, format);
    }
  }
  return [...byExtension.values()];
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
