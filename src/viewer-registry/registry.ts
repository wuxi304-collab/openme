import { getFileFormatByPath, getRegistryStrategy } from "../file-registry";
import type { FileCapability, FileFormatDefinition, PreferredViewerId } from "../file-registry";
import type { ViewerRegistration, ViewerRoute, ViewerRouteMode } from "./types";

export const VIEWER_REGISTRY: ViewerRegistration[] = [
  {
    id: "text-viewer",
    label: "Text Viewer",
    categories: ["code"],
    capabilities: ["detect", "preview", "edit", "metadata", "ai-summary", "external-open"],
    routeModes: ["text"],
    priority: 100,
    boundary: "Text files open directly inside OpenMe for local inspection and editing. OpenMe never executes scripts or build files.",
  },
  {
    id: "markdown-viewer",
    label: "Markdown Viewer",
    categories: ["markdown"],
    capabilities: ["detect", "preview", "edit", "metadata", "ai-summary", "external-open"],
    routeModes: ["text", "builtin"],
    priority: 95,
    boundary: "Markdown opens directly inside OpenMe as document content; embedded MDX components are not executed.",
  },
  {
    id: "json-viewer",
    label: "JSON Viewer",
    categories: ["json"],
    capabilities: ["detect", "preview", "edit", "metadata", "ai-summary", "external-open"],
    routeModes: ["text", "builtin"],
    priority: 90,
    boundary: "Structured data opens directly inside OpenMe as local text/tree data without remote validation.",
  },
  {
    id: "table-viewer",
    label: "Table Viewer",
    categories: ["csv"],
    capabilities: ["detect", "preview", "edit", "metadata", "ai-summary", "external-open"],
    routeModes: ["text", "builtin"],
    priority: 90,
    boundary: "Table files open directly inside OpenMe with best-effort tabular viewing; business schema is not inferred automatically.",
  },
  {
    id: "pdf-viewer",
    label: "PDF Viewer",
    categories: ["pdf"],
    capabilities: ["detect", "preview", "metadata", "ai-summary", "external-open"],
    routeModes: ["builtin", "semantic"],
    priority: 85,
    boundary: "PDF files open directly inside OpenMe with local preview where possible; OCR, DRM bypass and complete layout analysis are not implied.",
  },
  {
    id: "office-viewer",
    label: "Office Viewer",
    categories: ["office", "epub"],
    capabilities: ["detect", "preview", "metadata", "ai-summary", "external-open"],
    routeModes: ["builtin", "semantic", "safe-card"],
    priority: 75,
    boundary: "Office-like files open directly inside OpenMe through preview, conversion or a safe brief card; macros are never executed.",
  },
  {
    id: "image-viewer",
    label: "Image Viewer",
    categories: ["image"],
    capabilities: ["detect", "preview", "thumbnail", "metadata", "ai-summary", "external-open"],
    routeModes: ["builtin", "semantic", "safe-card"],
    priority: 85,
    boundary: "Images open directly inside OpenMe where browser or operating-system codecs can decode them; unsupported codecs still get an OpenMe brief card.",
  },
  {
    id: "svg-viewer",
    label: "SVG Viewer",
    categories: ["svg"],
    capabilities: ["detect", "preview", "edit", "metadata", "ai-summary", "external-open"],
    routeModes: ["text", "builtin"],
    priority: 80,
    boundary: "SVG opens directly inside OpenMe as inspectable text/vector content; scripts are not executed.",
  },
  {
    id: "media-viewer",
    label: "Media Viewer",
    categories: ["audio", "video"],
    capabilities: ["detect", "preview", "metadata", "external-open"],
    routeModes: ["builtin", "semantic", "safe-card"],
    priority: 70,
    boundary: "Media files open directly inside OpenMe through the media surface when codecs are available; container recognition is not codec support.",
  },
  {
    id: "archive-viewer",
    label: "Archive Viewer",
    categories: ["archive"],
    capabilities: ["detect", "preview", "metadata", "ai-summary", "external-open"],
    routeModes: ["builtin", "semantic", "safe-card"],
    priority: 70,
    boundary: "Archives open directly inside OpenMe as a safe listing or brief card; unsafe extraction and path traversal are not allowed.",
  },
  {
    id: "cad-viewer",
    label: "CAD Viewer",
    categories: ["cad", "dwg"],
    capabilities: ["detect", "metadata", "ai-summary", "external-open"],
    routeModes: ["semantic", "safe-card"],
    priority: 60,
    boundary: "CAD files open directly inside OpenMe as a CAD surface, semantic brief or safety card. OpenMe does not claim AutoCAD, BIM or source-CAD fidelity.",
  },
  {
    id: "font-viewer",
    label: "Font Viewer",
    categories: ["font"],
    capabilities: ["detect", "preview", "metadata", "external-open"],
    routeModes: ["builtin", "semantic", "safe-card"],
    priority: 65,
    boundary: "Fonts open directly inside OpenMe for display-oriented preview where possible; advanced font table inspection is not implied.",
  },
  {
    id: "route-only",
    label: "OpenMe Safe Card",
    categories: ["design", "package", "disk", "other"],
    capabilities: ["detect", "metadata", "external-open"],
    routeModes: ["semantic", "safe-card", "restricted-card"],
    priority: 10,
    boundary: "OpenMe opens this family inside a local safe card with identity, boundary, risk and next actions. Native-app handoff is only an optional fallback.",
  },
];

const viewerMap = new Map(VIEWER_REGISTRY.map((viewer) => [viewer.id, viewer]));

export function getViewerRegistration(viewerId: PreferredViewerId): ViewerRegistration {
  return viewerMap.get(viewerId) ?? viewerMap.get("route-only")!;
}

export function getViewerRouteForFormat(format: FileFormatDefinition): ViewerRoute {
  const strategy = getRegistryStrategy(format);
  const viewer = getViewerRegistration(strategy.preferredViewer);
  const mode = toDirectRouteMode(strategy.openStrategy);
  const routeMode = viewer.routeModes.includes(mode) ? mode : fallbackMode(viewer, mode);
  const capabilitySet = new Set<FileCapability>(format.capabilities);

  return {
    viewerId: viewer.id,
    label: viewer.label,
    mode: routeMode,
    surface: "openme-tab",
    openStrategy: strategy.openStrategy,
    canPreview: routeMode === "builtin" && capabilitySet.has("preview"),
    canEdit: strategy.openStrategy === "text" && capabilitySet.has("edit"),
    hasExternalFallback: capabilitySet.has("external-open"),
    reason: buildRouteReason(format, viewer, routeMode),
    boundary: format.boundary || viewer.boundary,
  };
}

export function getViewerRouteByPath(filePath: string): ViewerRoute {
  const format = getFileFormatByPath(filePath);
  if (!format) return unknownRoute(filePath);
  return getViewerRouteForFormat(format);
}

export function getRoutableFormatCount(formats: FileFormatDefinition[]): number {
  return formats.filter((format) => Boolean(getViewerRouteForFormat(format).viewerId)).length;
}

function toDirectRouteMode(openStrategy: string): ViewerRouteMode {
  if (openStrategy === "restricted") return "restricted-card";
  if (openStrategy === "text") return "text";
  if (openStrategy === "semantic") return "semantic";
  if (openStrategy === "builtin") return "builtin";
  return "safe-card";
}

function fallbackMode(viewer: ViewerRegistration, desired: ViewerRouteMode): ViewerRouteMode {
  if (viewer.routeModes.includes(desired)) return desired;
  if (desired === "restricted-card" && viewer.routeModes.includes("safe-card")) return "safe-card";
  if (viewer.routeModes.includes("semantic")) return "semantic";
  if (viewer.routeModes.includes("safe-card")) return "safe-card";
  return viewer.routeModes[0] ?? "safe-card";
}

function buildRouteReason(format: FileFormatDefinition, viewer: ViewerRegistration, mode: ViewerRouteMode): string {
  if (mode === "restricted-card") return `${format.name} opens inside an OpenMe restricted card. OpenMe will not execute, install, mount or run it.`;
  if (mode === "safe-card") return `${format.name} opens inside an OpenMe safe card with identity, boundary, risk and next actions.`;
  if (mode === "semantic") return `${format.name} opens inside OpenMe for metadata, boundary and brief inspection.`;
  if (mode === "text") return `${format.name} opens directly inside OpenMe for local text inspection.`;
  return `${format.name} opens directly inside OpenMe through ${viewer.label}.`;
}

function unknownRoute(filePath: string): ViewerRoute {
  return {
    viewerId: "route-only",
    label: "OpenMe Safe Card",
    mode: "safe-card",
    surface: "openme-tab",
    openStrategy: "external",
    canPreview: false,
    canEdit: false,
    hasExternalFallback: true,
    reason: `${filePath} has no registry match yet and opens inside an OpenMe safe card before any optional native-app handoff.`,
    boundary: "Unknown formats are opened conservatively inside OpenMe until a registry entry exists.",
  };
}
