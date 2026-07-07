import type { FileCategory } from "../utils/fileTypeDetector";
import type { FileCapability, FileOpenStrategy, PreferredViewerId } from "../file-registry";

export type ViewerRouteMode = "builtin" | "text" | "semantic" | "safe-card" | "restricted-card";

export interface ViewerRegistration {
  id: PreferredViewerId;
  label: string;
  categories: FileCategory[];
  capabilities: FileCapability[];
  routeModes: ViewerRouteMode[];
  priority: number;
  boundary: string;
}

export interface ViewerRoute {
  viewerId: PreferredViewerId;
  label: string;
  mode: ViewerRouteMode;
  surface: "openme-tab";
  openStrategy: FileOpenStrategy;
  canPreview: boolean;
  canEdit: boolean;
  hasExternalFallback: boolean;
  reason: string;
  boundary: string;
}
