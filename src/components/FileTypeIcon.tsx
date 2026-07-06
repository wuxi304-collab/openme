import type { CSSProperties } from "react";
import { FileCategory } from "../utils/fileTypeDetector";

interface IconConfig {
  top: string;
  bottom: string;
  ink: string;
  label: string;
  mini: string;
  shadow: string;
}

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

type IconStyle = CSSProperties & Record<"--icon-top" | "--icon-bottom" | "--icon-ink" | "--icon-shadow", string>;

export default function FileTypeIcon({ type, size = 34 }: { type: FileCategory; size?: number }) {
  const config = CONFIG[type] ?? CONFIG.other;
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
    <span className={`filetype-cute ${compact ? "is-compact" : ""}`} style={style} aria-label={`${config.label} 文件`} title={config.label}>
      <span className="filetype-shine" aria-hidden="true" />
      <span className="filetype-label" aria-hidden="true">{compact ? config.mini : config.label}</span>
      {!compact && <span className="filetype-feet" aria-hidden="true"><i /><i /></span>}
    </span>
  );
}


