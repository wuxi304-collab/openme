import type { FileCategory, FileOpenStrategy } from "../file-registry/types";

export interface ExternalAppHint {
  /** Stable key used in i18n. Pair with `route.suggestedApps.{key}.name`. */
  key: string;
  /** Concrete executable/bundle id we are hinting at (purely informational). */
  id: string;
  /** Operating systems this hint actually targets. */
  platforms: Array<"macos" | "windows" | "linux">;
  /** Optional fallback hint if the primary app is not present. */
  fallbackKey?: string;
}

/**
 * Curated map of "if you want to open this format properly outside OpenMe,
 * here's the canonical native app". Hints are intentionally narrow: we only
 * emit a hint when the user is likely to want one, which is whenever the file
 * family is recognized but not internally rendered (D/E support level).
 *
 * Keys are stable i18n handles; the renderer should look up the user-visible
 * name via `route.suggestedApps.{key}.name` / `.reason` so we don't hard-code
 * vendor names in component code.
 */
export const EXTERNAL_APP_HINTS: Readonly<Record<string, ExternalAppHint>> = {
  photoshop: { key: "photoshop", id: "com.adobe.Photoshop", platforms: ["macos", "windows"], fallbackKey: "photopea" },
  illustrator: { key: "illustrator", id: "com.adobe.Illustrator", platforms: ["macos", "windows"], fallbackKey: "inkscape" },
  indesign: { key: "indesign", id: "com.adobe.InDesign", platforms: ["macos", "windows"] },
  xd: { key: "xd", id: "com.adobe.XD", platforms: ["macos", "windows"] },
  figma: { key: "figma", id: "com.figma.Desktop", platforms: ["macos", "windows", "linux"] },
  sketch: { key: "sketch", id: "com.bohemiancoding.Sketch3", platforms: ["macos"] },
  coreldraw: { key: "coreldraw", id: "com.coreldraw.GraphicsSuite", platforms: ["macos", "windows"], fallbackKey: "inkscape" },
  affinityDesigner: { key: "affinityDesigner", id: "com.serif.AffinityDesigner2", platforms: ["macos", "windows"] },
  inkscape: { key: "inkscape", id: "org.inkscape.Inkscape", platforms: ["macos", "windows", "linux"] },
  photopea: { key: "photopea", id: "io.photopea", platforms: ["macos", "windows", "linux"] },

  autocad: { key: "autocad", id: "com.autodesk.AutoCAD", platforms: ["macos", "windows"], fallbackKey: "librecad" },
  librecad: { key: "librecad", id: "org.librecad.librecad", platforms: ["macos", "windows", "linux"] },
  fusion360: { key: "fusion360", id: "com.autodesk.Fusion360", platforms: ["macos", "windows"] },
  kicad: { key: "kicad", id: "org.kicad.KiCad", platforms: ["macos", "windows", "linux"] },

  microsoftWord: { key: "microsoftWord", id: "com.microsoft.Word", platforms: ["macos", "windows"] },
  microsoftExcel: { key: "microsoftExcel", id: "com.microsoft.Excel", platforms: ["macos", "windows"] },
  microsoftPowerpoint: { key: "microsoftPowerpoint", id: "com.microsoft.Powerpoint", platforms: ["macos", "windows"] },
  wpsOffice: { key: "wpsOffice", id: "com.kingsoft.wpsoffice.mac", platforms: ["macos", "windows", "linux"] },
  libreOffice: { key: "libreOffice", id: "org.libreoffice.LibreOffice", platforms: ["macos", "windows", "linux"] },
  pages: { key: "pages", id: "com.apple.iWork.Pages", platforms: ["macos"] },
  numbers: { key: "numbers", id: "com.apple.iWork.Numbers", platforms: ["macos"] },
  keynote: { key: "keynote", id: "com.apple.iWork.Keynote", platforms: ["macos"] },

  vlc: { key: "vlc", id: "org.videolan.vlc", platforms: ["macos", "windows", "linux"] },
  iina: { key: "iina", id: "com.colliderli.iina", platforms: ["macos"] },
  foobar2000: { key: "foobar2000", id: "com.foobar2000.foobar2000", platforms: ["windows"] },
  audacity: { key: "audacity", id: "org.audacityteam.audacity", platforms: ["macos", "windows", "linux"] },
  dspeaker: { key: "dspeaker", id: "com.silentdisc.dspeaker", platforms: ["macos", "windows", "linux"] },

  calibre: { key: "calibre", id: "net.calibre-ebook.calibre", platforms: ["macos", "windows", "linux"] },
  kindle: { key: "kindle", id: "com.amazon.Kindle", platforms: ["macos", "windows"] },
  neatReader: { key: "neatReader", id: "io.neat", platforms: ["macos", "windows", "linux"] },

  systemViewer: { key: "systemViewer", id: "system.imageViewer", platforms: ["macos", "windows", "linux"] },
  fontManager: { key: "fontManager", id: "system.fontManager", platforms: ["macos", "windows", "linux"] },
  fontForge: { key: "fontForge", id: "org.fontforge.FontForge", platforms: ["macos", "windows", "linux"] },
  fontBase: { key: "fontBase", id: "com.fontbase.app", platforms: ["macos", "windows", "linux"] },

  peazip: { key: "peazip", id: "io.github.peazip", platforms: ["macos", "windows", "linux"] },
  keka: { key: "keka", id: "com.keka.Keka", platforms: ["macos"] },
  theUnarchiver: { key: "theUnarchiver", id: "com.macpaw.site.theunarchiver", platforms: ["macos"] },
  bandizip: { key: "bandizip", id: "com.bandisoft.bandizip", platforms: ["windows"] },

  djvulibre: { key: "djvulibre", id: "org.djvulibre.djvulibre", platforms: ["macos", "windows", "linux"] },

  gis: { key: "gis", id: "org.qgis.QGIS", platforms: ["macos", "windows", "linux"] },
};

interface HintLookupRule {
  extensions: ReadonlyArray<string>;
  hintKey: string;
  category?: FileCategory;
}

/**
 * Pure-data rules: extension → external app hint. Order matters: more specific
 * rules go first so we never override a vendor-specific tool with a generic
 * fallback.
 */
const HINT_LOOKUP: ReadonlyArray<HintLookupRule> = [
  // Design source files
  { extensions: [".psd", ".psb"], hintKey: "photoshop" },
  { extensions: [".ai"], hintKey: "illustrator" },
  { extensions: [".indd"], hintKey: "indesign" },
  { extensions: [".xd"], hintKey: "xd" },
  { extensions: [".fig"], hintKey: "figma" },
  { extensions: [".sketch"], hintKey: "sketch" },
  { extensions: [".cdr"], hintKey: "coreldraw" },
  { extensions: [".afdesign"], hintKey: "affinityDesigner" },
  { extensions: [".eps"], hintKey: "inkscape" },
  { extensions: [".svg"], hintKey: "inkscape" },
  { extensions: [".raw", ".cr2", ".nef", ".arw"], hintKey: "systemViewer", category: "image" },
  { extensions: [".heic", ".heif"], hintKey: "systemViewer", category: "image" },
  { extensions: [".tiff", ".tif"], hintKey: "photopea", category: "image" },
  { extensions: [".icns"], hintKey: "systemViewer", category: "image" },
  { extensions: [".ico"], hintKey: "photopea" },

  // Office
  { extensions: [".doc", ".docx", ".dotx"], hintKey: "microsoftWord" },
  { extensions: [".xls", ".xlsx", ".xlsm", ".xltx"], hintKey: "microsoftExcel" },
  { extensions: [".ppt", ".pptx", ".pptm"], hintKey: "microsoftPowerpoint" },
  { extensions: [".wps"], hintKey: "wpsOffice" },
  { extensions: [".et"], hintKey: "wpsOffice" },
  { extensions: [".dps"], hintKey: "wpsOffice" },
  { extensions: [".odt", ".ods", ".odp"], hintKey: "libreOffice" },
  { extensions: [".pages"], hintKey: "pages" },
  { extensions: [".numbers"], hintKey: "numbers" },
  { extensions: [".keynote", ".key"], hintKey: "keynote" },
  { extensions: [".rtf"], hintKey: "microsoftWord" },
  { extensions: [".xlsm"], hintKey: "microsoftExcel" },

  // Media
  { extensions: [".avi", ".mkv", ".flv", ".f4v", ".rm", ".rmvb", ".wmv", ".ts", ".3gp"], hintKey: "vlc" },
  { extensions: [".mov"], hintKey: "iina" },
  { extensions: [".ape", ".wma"], hintKey: "foobar2000" },
  { extensions: [".aup3"], hintKey: "audacity" },
  { extensions: [".dsf", ".dff"], hintKey: "dspeaker" },
  { extensions: [".mid", ".midi"], hintKey: "vlc" },

  // Video projects
  { extensions: [".prproj"], hintKey: "systemViewer" },
  { extensions: [".aep"], hintKey: "systemViewer" },
  { extensions: [".veg"], hintKey: "systemViewer" },
  { extensions: [".drp"], hintKey: "systemViewer" },
  { extensions: [".fcpxml"], hintKey: "systemViewer" },

  // CAD
  { extensions: [".dwg", ".dxf"], hintKey: "autocad" },
  { extensions: [".kicad_pcb", ".sch", ".brd", ".gbr", ".ger", ".dsn"], hintKey: "kicad" },
  { extensions: [".gds"], hintKey: "kicad" },
  { extensions: [".iges", ".step", ".stp"], hintKey: "fusion360" },
  { extensions: [".stl", ".obj", ".3mf"], hintKey: "fusion360" },
  { extensions: [".fbx", ".blend", ".gltf", ".glb"], hintKey: "fusion360" },

  // Books
  { extensions: [".azw", ".azw3", ".mobi"], hintKey: "kindle" },
  { extensions: [".epub"], hintKey: "calibre" },

  // Archives
  { extensions: [".rar", ".7z"], hintKey: "peazip" },
  { extensions: [".tar", ".gz", ".tgz", ".bz2", ".xz"], hintKey: "theUnarchiver" },
  { extensions: [".cab"], hintKey: "bandizip" },

  // Fonts (D-level)
  { extensions: [".eot", ".ttc"], hintKey: "fontManager" },
  { extensions: [".pfb", ".pfm"], hintKey: "fontForge" },
];

/**
 * Collect the external app hints that apply for a given file.
 *
 * @param extension     e.g. ".psd"
 * @param category      category used as a tie-breaker for ambiguous rules
 * @param openStrategy  only emit hints when the file is being routed outside OpenMe
 * @param supportLevel  "D"/"E" (or unknown "F") formats deserve a hint; "A"/"B"/"C" do not.
 */
export function getExternalAppHints(
  extension: string,
  category: FileCategory,
  openStrategy: FileOpenStrategy,
  supportLevel: string,
): ExternalAppHint[] {
  if (!extension) return [];
  const lowered = extension.toLowerCase();

  const isExternal = openStrategy === "external" || openStrategy === "restricted" || openStrategy === "semantic";
  if (!isExternal) return [];
  if (supportLevel !== "D" && supportLevel !== "E" && supportLevel !== "F") return [];

  const matched = HINT_LOOKUP.filter((rule) => {
    const extMatch = rule.extensions.includes(lowered);
    if (!extMatch) return false;
    if (rule.category && rule.category !== category) return false;
    return true;
  });

  const seen = new Set<string>();
  const result: ExternalAppHint[] = [];
  for (const rule of matched) {
    const hint = EXTERNAL_APP_HINTS[rule.hintKey];
    if (!hint) continue;
    if (seen.has(hint.key)) continue;
    seen.add(hint.key);
    result.push(hint);
    if (hint.fallbackKey) {
      const fallback = EXTERNAL_APP_HINTS[hint.fallbackKey];
      if (fallback && !seen.has(fallback.key)) {
        seen.add(fallback.key);
        result.push(fallback);
      }
    }
  }
  return result;
}
