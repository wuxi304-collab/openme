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
    boundary: "Text files can be inspected and edited locally. OpenMe never executes scripts or build files.",
  },
  {
    id: "markdown-viewer",
    label: "Markdown Viewer",
    categories: ["markdown"],
    capabilities: ["detect", "preview", "edit", "metadata", "ai-summary", "external-open"],
    routeModes: ["text", "builtin"],
    priority: 95,
    boundary: "Markdown is rendered as document content; embedded MDX components are not executed.",
  },
  {
    id: "json-viewer",
    label: "JSON Viewer",
    categories: ["json"],
    capabilities: ["detect", "preview", "edit", "metadata", "ai-summary", "external-open"],
    routeModes: ["text", "builtin"],
    priority: 90,
    boundary: "Structured data is inspected as local text/tree data without remote validation.",
  },
  {
    id: "table-viewer",
    label: "Table Viewer",
    categories: ["csv"],
    capabilities: ["detect", "preview", "edit", "metadata", "ai-summary", "external-open"],
    routeModes: ["text", "builtin"],
    priority: 90,
    boundary: "Table viewing is best-effort and does not infer business schema automatically.",
  },
  {
    id: "pdf-viewer",
    label: "PDF Viewer",
    categories: ["pdf"],
    capabilities: ["detect", "preview", "metadata", "ai-summary", "external-open"],
    routeModes: ["builtin", "semantic"],
    priority: 85,
    boundary: "PDF preview is local and does not imply OCR, DRM bypass or complete layout analysis.",
  },
  {
    id: "office-viewer",
    label: "Office Viewer",
    categories: ["office", "epub"],
    capabilities: ["detect", "preview", "metadata", "ai-summary", "external-open"],
    routeModes: ["builtin", "semantic", "external"],
    priority: 75,
    boundary: "Office preview is approximate; macros are never executed and source-application fidelity is not claimed.",
  },
  {
    id: "image-viewer",
    label: "Image Viewer",
    categories: ["image"],
    capabilities: ["detect", "preview", "thumbnail", "metadata", "ai-summary", "external-open"],
    routeModes: ["builtin", "semantic", "external"],
    priority: 85,
    boundary: "Image preview depends on browser and operating-system codec support.",
  },
  {
    id: "svg-viewer",
    label: "SVG Viewer",
    categories: ["svg"],
    capabilities: ["detect", "preview", "edit", "metadata", "ai-summary", "external-open"],
    routeModes: ["text", "builtin"],
    priority: 80,
    boundary: "SVG is treated as inspectable text/vector content; scripts are not executed.",
  },
  {
    id: "media-viewer",
    label: "Media Viewer",
    categories: ["audio", "video"],
    capabilities: ["detect", "preview", "metadata", "external-open"],
    routeModes: ["builtin", "semantic", "external"],
    priority: 70,
    boundary: "Media container recognition is not codec support. System open remains the fallback.",
  },
  {
    id: "archive-viewer",
    label: "Archive Viewer",
    categories: ["archive"],
    capabilities: ["detect", "preview", "metadata", "ai-summary", "external-open"],
    routeModes: ["builtin", "semantic", "external"],
    priority: 70,
    boundary: "Archive browsing must avoid unsafe extraction and path traversal behavior.",
  },
  {
    id: "cad-viewer",
    label: "CAD Route",
    categories: ["cad", "dwg"],
    capabilities: ["detect", "metadata", "ai-summary", "external-open"],
    routeModes: ["semantic", "external"],
    priority: 60,
    boundary: "CAD route does not claim AutoCAD, BIM or source-CAD fidelity.",
  },
  {
    id: "font-viewer",
    label: "Font Viewer",
    categories: ["font"],
    capabilities: ["detect", "preview", "metadata", "external-open"],
    routeModes: ["builtin", "semantic", "external"],
    priority: 65,
    boundary: "Font preview is display-oriented; advanced table inspection is not implied.",
  },
  {
    id: "route-only",
    label: "External Route",
    categories: ["design", "package", "disk", "other"],
    capabilities: ["detect", "metadata", "external-open"],
    routeModes: ["semantic", "external", "restricted"],
    priority: 10,
    boundary: "OpenMe classifies and routes this family without claiming a built-in editor or source-app fidelity.",
  },
];

const viewerMap = new Map(VIEWER_REGISTRY.map((viewer) => [viewer.id, viewer]));

export function getViewerRegistration(viewerId: PreferredViewerId): ViewerRegistration {
  return viewerMap.get(viewerId) ?? viewerMap.get("route-only")!;
}

export function getViewerRouteForFormat(format: FileFormatDefinition): ViewerRoute {
  const strategy = getRegistryStrategy(format);
  const viewer = getViewerRegistration(strategy.preferredViewer);
  const mode = toRouteMode(strategy.openStrategy);
  const routeMode = viewer.routeModes.includes(mode) ? mode : fallbackMode(viewer, mode);
  const capabilitySet = new Set<FileCapability>(format.capabilities);

  return {
    viewerId: viewer.id,
    label: viewer.label,
    mode: routeMode,
    openStrategy: strategy.openStrategy,
    canPreview: routeMode === "builtin" && capabilitySet.has("preview"),
    canEdit: strategy.openStrategy === "text" && capabilitySet.has("edit"),
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

function toRouteMode(openStrategy: string): ViewerRouteMode {
  if (openStrategy === "restricted") return "restricted";
  if (openStrategy === "text") return "text";
  if (openStrategy === "semantic") return "semantic";
  if (openStrategy === "builtin") return "builtin";
  return "external";
}

function fallbackMode(viewer: ViewerRegistration, desired: ViewerRouteMode): ViewerRouteMode {
  if (desired === "restricted") return "restricted";
  if (viewer.routeModes.includes("semantic")) return "semantic";
  if (viewer.routeModes.includes("external")) return "external";
  return viewer.routeModes[0] ?? "external";
}

function buildRouteReason(format: FileFormatDefinition, viewer: ViewerRegistration, mode: ViewerRouteMode): string {
  if (mode === "restricted") return `${format.name} is routed to a restricted handoff. OpenMe will not execute, install, mount or run it.`;
  if (mode === "external") return `${format.name} is identified and should be opened with a native or system application.`;
  if (mode === "semantic") return `${format.name} is routed for metadata, boundary and brief inspection before external handoff.`;
  if (mode === "text") return `${format.name} is routed to local text inspection.`;
  return `${format.name} is routed to ${viewer.label}.`;
}

function unknownRoute(filePath: string): ViewerRoute {
  return {
    viewerId: "route-only",
    label: "External Route",
    mode: "external",
    openStrategy: "external",
    canPreview: false,
    canEdit: false,
    reason: `${filePath} has no registry match yet and should be opened externally.`,
    boundary: "Unknown formats are routed conservatively until a registry entry exists.",
  };
}
