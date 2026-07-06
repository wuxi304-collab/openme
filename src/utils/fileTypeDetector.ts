export type FileCategory = "code" | "markdown" | "json" | "csv" | "image" | "svg" | "pdf" | "office" | "archive" | "epub" | "audio" | "video" | "font" | "cad" | "dwg" | "other";

const CODE_EXTS = [".txt", ".js", ".ts", ".jsx", ".tsx", ".py", ".rs", ".go", ".java", ".c", ".cpp", ".h", ".css", ".html", ".scss", ".less", ".xml", ".yml", ".yaml", ".ini", ".log", ".sh", ".bat", ".ps1", ".vue", ".svelte", ".env", ".sql", ".gradle", ".toml", ".cfg", ".conf", ".properties"];
const MARKDOWN_EXTS = [".md", ".mdtxt", ".mdx"];
const IMAGE_EXTS = [".png", ".jpg", ".jpeg", ".gif", ".bmp", ".webp"];
const OFFICE_EXTS = [".docx", ".xlsx", ".pptx"];
const ARCHIVE_EXTS = [".zip"];
const AUDIO_EXTS = [".mp3", ".wav", ".ogg", ".m4a", ".aac", ".flac"];
const VIDEO_EXTS = [".mp4", ".webm", ".ogv", ".m4v"];
const FONT_EXTS = [".ttf", ".otf", ".woff", ".woff2"];
const CAD_EXTS = [".stl", ".obj", ".gltf", ".glb", ".step", ".stp", ".iges", ".igs"];

function extname(filePath: string): string {
  const lastDot = filePath.lastIndexOf(".");
  const lastSep = Math.max(filePath.lastIndexOf("/"), filePath.lastIndexOf("\\"));
  if (lastDot <= lastSep || lastDot === -1) return "";
  return filePath.slice(lastDot).toLowerCase();
}

export function detectCategory(filePath: string): FileCategory {
  const ext = extname(filePath);
  if (ext === ".svg") return "svg";
  if (ext === ".pdf") return "pdf";
  if (ext === ".epub") return "epub";
  if (AUDIO_EXTS.includes(ext)) return "audio";
  if (VIDEO_EXTS.includes(ext)) return "video";
  if (FONT_EXTS.includes(ext)) return "font";
  if (IMAGE_EXTS.includes(ext)) return "image";
  if (MARKDOWN_EXTS.includes(ext)) return "markdown";
  if (ext === ".json") return "json";
  if (ext === ".csv") return "csv";
  if (OFFICE_EXTS.includes(ext)) return "office";
  if (ARCHIVE_EXTS.includes(ext)) return "archive";
  if (CAD_EXTS.includes(ext)) return "cad";
  if (ext === ".dwg" || ext === ".dxf") return "dwg";
  if (CODE_EXTS.includes(ext)) return "code";
  return "other";
}

export function isEditable(category: FileCategory): boolean {
  return ["code", "markdown", "json", "csv"].includes(category);
}

export function detectLanguage(filePath: string): string {
  const ext = extname(filePath);
  const langs: Record<string, string> = {
    ".js": "javascript", ".jsx": "javascript", ".ts": "typescript", ".tsx": "typescript",
    ".py": "python", ".rs": "rust", ".go": "go", ".java": "java",
    ".c": "cpp", ".cpp": "cpp", ".h": "cpp", ".css": "css",
    ".html": "html", ".xml": "xml", ".json": "json", ".yml": "yaml",
    ".yaml": "yaml", ".sql": "sql", ".sh": "bash", ".bat": "batch",
    ".ps1": "powershell", ".md": "markdown", ".vue": "html", ".svelte": "html",
    ".log": "plaintext", ".ini": "ini", ".env": "bash", ".gradle": "gradle",
    ".toml": "ini", ".cfg": "ini", ".conf": "ini", ".properties": "ini",
  };
  return langs[ext] || "plaintext";
}


