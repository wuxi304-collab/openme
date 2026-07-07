export type FileCategory = "code" | "markdown" | "json" | "csv" | "image" | "svg" | "pdf" | "office" | "archive" | "epub" | "audio" | "video" | "font" | "cad" | "dwg" | "design" | "package" | "disk" | "other";

const CODE_EXTS = [
  ".txt", ".js", ".ts", ".jsx", ".tsx", ".py", ".rs", ".go", ".java", ".c", ".cpp", ".h", ".css", ".html", ".scss", ".less", ".xml", ".yml", ".yaml", ".ini", ".log", ".sh", ".bat", ".ps1", ".vue", ".svelte", ".env", ".sql", ".gradle", ".toml", ".cfg", ".conf", ".properties",
  ".jsonl", ".ndjson", ".lock", ".dockerfile", ".gitignore", ".gitattributes", ".editorconfig", ".prettierrc", ".eslintrc", ".npmrc", ".nvmrc", ".ruby", ".rb", ".php", ".kt", ".kts", ".swift", ".dart", ".lua", ".r", ".m", ".mm", ".pl", ".pm", ".scala", ".clj", ".ex", ".exs", ".erl", ".hrl", ".fs", ".fsx", ".cs", ".csproj", ".vb", ".sln", ".proto", ".graphql", ".gql", ".tf", ".tfvars"
];
const MARKDOWN_EXTS = [".md", ".mdtxt", ".mdx", ".markdown"];
const IMAGE_EXTS = [".png", ".jpg", ".jpeg", ".gif", ".bmp", ".webp", ".avif", ".ico", ".tif", ".tiff", ".heic", ".heif", ".raw", ".dng"];
const OFFICE_EXTS = [".docx", ".xlsx", ".pptx", ".doc", ".xls", ".ppt", ".odt", ".ods", ".odp", ".rtf"];
const ARCHIVE_EXTS = [".zip", ".rar", ".7z", ".tar", ".gz", ".tgz", ".bz2", ".xz", ".zst"];
const AUDIO_EXTS = [".mp3", ".wav", ".ogg", ".oga", ".m4a", ".aac", ".flac", ".opus", ".weba", ".aiff", ".aif", ".wma", ".alac", ".amr", ".mid", ".midi"];
const VIDEO_EXTS = [".mp4", ".webm", ".ogv", ".m4v", ".mov", ".mkv", ".avi", ".wmv", ".flv", ".3gp", ".3g2", ".ts", ".mts", ".m2ts", ".mpeg", ".mpg", ".mxf"];
const FONT_EXTS = [".ttf", ".otf", ".woff", ".woff2", ".eot"];
const CAD_EXTS = [".stl", ".obj", ".gltf", ".glb", ".step", ".stp", ".iges", ".igs", ".3mf", ".ply", ".fbx", ".dae", ".3ds", ".ifc", ".skp"];
const DESIGN_EXTS = [".psd", ".psb", ".ai", ".ait", ".eps", ".indd", ".idml", ".xd", ".sketch", ".fig", ".figma", ".afdesign", ".afphoto", ".afpub", ".cdr", ".kra", ".clip", ".aseprite"];
const PACKAGE_EXTS = [".apk", ".ipa", ".jar", ".war", ".ear", ".appx", ".msix", ".deb", ".rpm", ".dmg", ".pkg", ".exe", ".msi"];
const DISK_EXTS = [".iso", ".img", ".vhd", ".vhdx", ".qcow2", ".vmdk", ".ova", ".ovf"];

function extname(filePath: string): string {
  const lastDot = filePath.lastIndexOf(".");
  const lastSep = Math.max(filePath.lastIndexOf("/"), filePath.lastIndexOf("\\"));
  if (lastDot <= lastSep || lastDot === -1) return "";
  return filePath.slice(lastDot).toLowerCase();
}

export function detectCategory(filePath: string): FileCategory {
  const ext = extname(filePath);
  const base = filePath.split(/[\\/]/).pop()?.toLowerCase() ?? filePath.toLowerCase();
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
  if (DESIGN_EXTS.includes(ext)) return "design";
  if (PACKAGE_EXTS.includes(ext)) return "package";
  if (DISK_EXTS.includes(ext)) return "disk";
  if (base === "dockerfile" || base === "makefile" || base === "rakefile" || base === "gemfile" || base === "podfile" || base === "justfile") return "code";
  if (CODE_EXTS.includes(ext)) return "code";
  return "other";
}

export function isEditable(category: FileCategory): boolean {
  return ["code", "markdown", "json", "csv"].includes(category);
}

export function detectLanguage(filePath: string): string {
  const ext = extname(filePath);
  const base = filePath.split(/[\\/]/).pop()?.toLowerCase() ?? filePath.toLowerCase();
  if (base === "dockerfile") return "dockerfile";
  if (base === "makefile") return "makefile";
  const langs: Record<string, string> = {
    ".js": "javascript", ".jsx": "javascript", ".ts": "typescript", ".tsx": "typescript",
    ".py": "python", ".rs": "rust", ".go": "go", ".java": "java",
    ".c": "cpp", ".cpp": "cpp", ".h": "cpp", ".css": "css",
    ".html": "html", ".xml": "xml", ".json": "json", ".jsonl": "json", ".ndjson": "json", ".yml": "yaml",
    ".yaml": "yaml", ".sql": "sql", ".sh": "bash", ".bat": "batch",
    ".ps1": "powershell", ".md": "markdown", ".mdx": "markdown", ".vue": "html", ".svelte": "html",
    ".log": "plaintext", ".ini": "ini", ".env": "bash", ".gradle": "gradle",
    ".toml": "ini", ".cfg": "ini", ".conf": "ini", ".properties": "ini",
    ".rb": "ruby", ".php": "php", ".kt": "kotlin", ".kts": "kotlin", ".swift": "swift", ".dart": "dart",
    ".lua": "lua", ".r": "r", ".m": "objective-c", ".mm": "objective-c", ".cs": "csharp", ".csproj": "xml",
    ".proto": "protobuf", ".graphql": "graphql", ".gql": "graphql", ".tf": "hcl", ".tfvars": "hcl"
  };
  return langs[ext] || "plaintext";
}
