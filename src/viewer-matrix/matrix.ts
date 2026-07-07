import { FILE_FORMATS, getFileFormatByPath } from "../file-registry";
import type { FileFormatDefinition } from "../file-registry";
import { getViewerRouteForFormat } from "../viewer-registry";
import type { ViewerMatrixEntry, ViewerMatrixLevel, ViewerMatrixStats } from "./types";

export function buildViewerMatrixEntry(format: FileFormatDefinition): ViewerMatrixEntry {
  const route = getViewerRouteForFormat(format);
  const level = getMatrixLevel(route.mode, route.canPreview);

  return {
    extension: format.extensions[0] ?? "",
    name: format.name,
    category: format.category,
    supportLevel: format.supportLevel,
    routeMode: route.mode,
    viewerId: route.viewerId,
    level,
    surface: route.surface,
    canPreview: route.canPreview,
    canEdit: route.canEdit,
    needsNativeFidelity: level !== "direct",
    adapter: getAdapterName(level, route.label),
    reason: route.reason,
  };
}

export function buildViewerMatrix(formats: FileFormatDefinition[] = FILE_FORMATS): ViewerMatrixEntry[] {
  return formats.map(buildViewerMatrixEntry);
}

export function getViewerMatrixEntryByPath(filePath: string): ViewerMatrixEntry | null {
  const format = getFileFormatByPath(filePath);
  return format ? buildViewerMatrixEntry(format) : null;
}

export function getViewerMatrixStats(entries: ViewerMatrixEntry[] = buildViewerMatrix()): ViewerMatrixStats {
  return entries.reduce<ViewerMatrixStats>(
    (stats, entry) => {
      stats.total += 1;
      stats[entry.level] += 1;
      return stats;
    },
    { total: 0, direct: 0, semantic: 0, card: 0, guarded: 0 },
  );
}

function getMatrixLevel(mode: string, canPreview: boolean): ViewerMatrixLevel {
  if (canPreview || mode === "text" || mode === "builtin") return "direct";
  if (mode === "semantic") return "semantic";
  if (mode.includes("restricted")) return "guarded";
  return "card";
}

function getAdapterName(level: ViewerMatrixLevel, label: string): string {
  if (level === "direct") return label;
  if (level === "semantic") return "Semantic Inspector";
  if (level === "guarded") return "Guarded Route Card";
  return "Safe Route Card";
}
