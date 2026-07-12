import { FILE_FORMATS, getFileFormatByPath } from "../file-registry";
import type { FileFormatDefinition } from "../file-registry";
import { getViewerRouteForFormat } from "../viewer-registry";
import type { ViewerMatrixEntry, ViewerMatrixLevel, ViewerMatrixStats } from "./types";

/**
 * Map a (route mode, preview capability) pair to a high-level fidelity tier.
 * Used by FileSummaryPanel / AboutDialog / Support Matrix to group formats
 * by how they actually open in OpenMe rather than just by category.
 */
export function getMatrixLevel(mode: string, canPreview: boolean): ViewerMatrixLevel {
  if (mode === "restricted-card") return "guarded";
  if (canPreview || mode === "text" || mode === "builtin") return "direct";
  if (mode === "semantic") return "semantic";
  return "card";
}

export function getAdapterLabel(level: ViewerMatrixLevel, viewerLabel: string): string {
  switch (level) {
    case "direct":
      return viewerLabel;
    case "semantic":
      return "Semantic Inspector";
    case "guarded":
      return "Guarded Route Card";
    case "card":
    default:
      return "Safe Route Card";
  }
}

export function buildViewerMatrixEntry(format: FileFormatDefinition): ViewerMatrixEntry {
  const route = getViewerRouteForFormat(format);
  const level = getMatrixLevel(route.mode, route.canPreview);

  return {
    extension: format.extension,
    name: format.name,
    category: format.category,
    supportLevel: format.supportLevel,
    routeMode: route.mode,
    viewerId: route.viewerId,
    level,
    surface: route.surface,
    canPreview: route.canPreview,
    canEdit: route.canEdit,
    hasExternalFallback: route.hasExternalFallback,
    needsNativeFidelity: level !== "direct",
    adapter: getAdapterLabel(level, route.label),
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