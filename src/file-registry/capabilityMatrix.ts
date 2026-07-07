import { FILE_FORMATS as BASE_FILE_FORMATS } from "./formats";
import { EXPANDED_FILE_FORMATS } from "./expanded-formats";
import type { FileCapability, FileFormatDefinition, HonestSupportLevel } from "./types";

export interface CapabilityMatrixRow {
  category: string;
  total: number;
  levels: Record<HonestSupportLevel, number>;
  capabilities: Record<FileCapability, number>;
  examples: string[];
}

const defaultFormats = dedupeByExtension([...BASE_FILE_FORMATS, ...EXPANDED_FILE_FORMATS]);
const supportLevels: HonestSupportLevel[] = ["A+", "A", "B", "C", "D", "E", "F"];
const capabilities: FileCapability[] = ["detect", "preview", "edit", "metadata", "thumbnail", "ai-summary", "external-open"];

export function buildCapabilityMatrix(formats: FileFormatDefinition[] = defaultFormats): CapabilityMatrixRow[] {
  const rows = new Map<string, CapabilityMatrixRow>();

  for (const format of formats) {
    const row = rows.get(format.category) ?? createRow(format.category);
    row.total += 1;
    row.levels[format.supportLevel] += 1;
    for (const capability of format.capabilities) row.capabilities[capability] += 1;
    if (row.examples.length < 8) row.examples.push(format.extension);
    rows.set(format.category, row);
  }

  return [...rows.values()].sort((a, b) => b.total - a.total || a.category.localeCompare(b.category));
}

export function getCapabilityCoverage(row: CapabilityMatrixRow, capability: FileCapability): number {
  if (row.total === 0) return 0;
  return row.capabilities[capability] / row.total;
}

export function getPreviewableFormatCount(formats: FileFormatDefinition[] = defaultFormats): number {
  return formats.filter((format) => format.capabilities.includes("preview")).length;
}

export function getRouteOnlyFormatCount(formats: FileFormatDefinition[] = defaultFormats): number {
  return formats.filter((format) => format.capabilities.length === 3 && format.capabilities.includes("detect") && format.capabilities.includes("metadata") && format.capabilities.includes("external-open")).length;
}

function createRow(category: string): CapabilityMatrixRow {
  return {
    category,
    total: 0,
    levels: Object.fromEntries(supportLevels.map((level) => [level, 0])) as Record<HonestSupportLevel, number>,
    capabilities: Object.fromEntries(capabilities.map((capability) => [capability, 0])) as Record<FileCapability, number>,
    examples: [],
  };
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
