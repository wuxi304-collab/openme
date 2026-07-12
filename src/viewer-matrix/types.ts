import type { FileFormatDefinition, HonestSupportLevel } from "../file-registry";
import type { ViewerRoute, ViewerRouteMode } from "../viewer-registry";

/**
 * Routing fidelity level for a given format:
 *
 * - "direct"    — format opens inside OpenMe's native surface (builtin or text).
 * - "semantic"  — format is inspected via metadata / brief but cannot preview natively.
 * - "card"      — format falls back to a safe / brief card with no preview path.
 * - "guarded"   — format is recognized but routed to a restricted card (no native open).
 */
export type ViewerMatrixLevel = "direct" | "semantic" | "card" | "guarded";

export interface ViewerMatrixEntry {
  extension: string;
  name: string;
  category: FileFormatDefinition["category"];
  supportLevel: HonestSupportLevel;
  routeMode: ViewerRouteMode;
  viewerId: ViewerRoute["viewerId"];
  level: ViewerMatrixLevel;
  surface: ViewerRoute["surface"];
  canPreview: boolean;
  canEdit: boolean;
  hasExternalFallback: boolean;
  needsNativeFidelity: boolean;
  adapter: string;
  reason: string;
}

export interface ViewerMatrixStats {
  total: number;
  direct: number;
  semantic: number;
  card: number;
  guarded: number;
}