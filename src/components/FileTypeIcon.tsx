import { useMemo, type CSSProperties } from "react";
import { FileCategory } from "../utils/fileTypeDetector";
import { useI18n } from "../i18n";

interface IconConfig {
  top: string;
  bottom: string;
  ink: string;
  label: string;
  mini: string;
  shadow: string;
}

// Static palette for every known category. The "other" entry is a fallback
// for unknown extensions and is replaced at render time with the file's
// actual extension when one is supplied (see resolveConfig below).
const CONFIG: Record<string, IconConfig> = {
  pdf:      { top: "#ff6b65", bottom: "#d91f1b", ink: "#fff", label: "PDF",  mini: "P", shadow: "#831713" },
  image:    { top: "#59c9ff", bottom: "#227bcc", ink: "#fff", label: "IMG",  mini: "I", shadow: "#164c85" },
  svg:      { top: "#d78af0", bottom: "#8a3db0", ink: "#fff", label: "SVG",  mini: "S", shadow: "#52246c" },
  text:     { top: "#72d991", bottom: "#309653", ink: "#fff", label: "TXT",  mini: "T", shadow: "#1d6036" },
  code:     { top: "#66b7ff", bottom: "#3269cf", ink: "#fff", label: "SRC",  mini: "<", shadow: "#203f83" },
  markdown: { top: "#75d68e", bottom: "#328a48", ink: "#fff", label: "MD",   mini: "M", shadow: "#20572e" },
  json:     { top: "#ffe35b", bottom: "#e8aa16", ink: "#674100", label: "JSON", mini: "{", shadow: "#956706" },
  csv:      { top: "#ffb95b", bottom: "#e86d20", ink: "#fff", label: "CSV",  mini: "C", shadow: "#914115" },
  office:   { top: "#55c8ff", bottom: "#196fb8", ink: "#fff", label: "DOC",  mini: "D", shadow: "#104777" },
  document: { top: "#55c8ff", bottom: "#196fb8", ink: "#fff", label: "DOC",  mini: "D", shadow: "#104777" },
  archive:  { top: "#ffbf55", bottom: "#e57920", ink: "#fff", label: "ZIP",  mini: "Z", shadow: "#8d4613" },
  epub:     { top: "#ff9981", bottom: "#da563c", ink: "#fff", label: "EPUB", mini: "E", shadow: "#8a3425" },
  audio:    { top: "#68d7a8", bottom: "#23885c", ink: "#fff", label: "AUD",  mini: "♪", shadow: "#15563a" },
  video:    { top: "#8ea2ff", bottom: "#4557bd", ink: "#fff", label: "VID",  mini: "▶", shadow: "#293574" },
  font:     { top: "#f3d36b", bottom: "#b77818", ink: "#3d2a08", label: "FONT", mini: "A", shadow: "#70480d" },
  cad:      { top: "#a8bdc7", bottom: "#536d79", ink: "#fff", label: "CAD",  mini: "C", shadow: "#32434a" },
  dwg:      { top: "#ffad55", bottom: "#e36320", ink: "#fff", label: "DWG",  mini: "D", shadow: "#913b14" },
  other:    { top: "#aebdc4", bottom: "#71858e", ink: "#fff", label: "???",  mini: "?", shadow: "#43545b" },
};

// Pure helper exported for tests: derive the human label for an unknown
// extension. Strips the leading dot, uppercases, and trims to four letters
// so it fits the existing icon label box (JSON / EPUB / FONT all use 4).
// Falls back to "???" when nothing usable is supplied (matches the
// previous visual).
export function deriveOtherLabel(extension: string | undefined): string {
  if (!extension) return "???";
  const stripped = extension.replace(/^\./, "").replace(/\s+/g, "").toUpperCase();
  // Compound extensions like ".tar.gz" get the first segment so the
  // label reads naturally (TAR, not TAR.).
  const firstSegment = stripped.split(/[.\-_+]/)[0] ?? stripped;
  const trimmed = firstSegment.slice(0, 4);
  return trimmed.length > 0 ? trimmed : "???";
}

function resolveConfig(type: FileCategory, extension: string | undefined): IconConfig {
  const base = CONFIG[type] ?? CONFIG.other;
  if (base !== CONFIG.other) return base;
  const label = deriveOtherLabel(extension);
  // Compact mini is just the first char of the label so it lines up with
  // the existing single-letter badges (P, I, S, T, …).
  return { ...base, label, mini: label.charAt(0) || "?" };
}

type IconStyle = CSSProperties & Record<"--icon-top" | "--icon-bottom" | "--icon-ink" | "--icon-shadow", string>;

interface Props {
  type: FileCategory;
  size?: number;
  /** File extension including the leading dot, e.g. ".dat". Used to label
   *  the "other" category so users see the actual file type instead of
   *  a generic "???" placeholder. */
  extension?: string;
}

export default function FileTypeIcon({ type, size = 34, extension }: Props) {
  const { t } = useI18n();
  const config = useMemo(() => resolveConfig(type, extension), [type, extension]);
  const compact = size < 24;
  const style: IconStyle = {
    width: size,
    height: size,
    "--icon-top": config.top,
    "--icon-bottom": config.bottom,
    "--icon-ink": config.ink,
    "--icon-shadow": config.shadow,
    fontSize: compact ? Math.max(8, size * 0.5) : Math.max(10, size * 0.28),
  };

  return (
    <span className={`filetype-cute ${compact ? "is-compact" : ""}`} style={style} aria-label={`${config.label} ${t("fileTypeSuffix")}`} title={config.label}>
      <span className="filetype-shine" aria-hidden="true" />
      <span className="filetype-label" aria-hidden="true">{compact ? config.mini : config.label}</span>
      {!compact && <span className="filetype-feet" aria-hidden="true"><i /><i /></span>}
    </span>
  );
}


