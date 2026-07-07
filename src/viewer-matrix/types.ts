import type { FileFormatDefinition } from "../file-registry";
import type { ViewerRoute, ViewerRouteMode } from "../viewer-registry";

export type ViewerMatrixLevel = "direct" | "semantic" | "card" | "guarded";

export interface ViewerMatrixEntry {
  extension: string;
  name: string;
  category: FileFormatDefinition["category"];
  supportLevel: FileFormatDefinition["supportLevel"];
  routeMode: ViewerRouteMode;
  viewerId: ViewerRoute["viewerId"];
  level: ViewerMatrixLevel;
  surface: "openme-tab";
  canPreview: boolean;
  canEdit: boolean;
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
