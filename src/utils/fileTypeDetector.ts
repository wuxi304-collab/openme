import { getFileFormatByPath } from "../file-registry";

export type FileCategory = "code" | "markdown" | "json" | "csv" | "image" | "svg" | "pdf" | "office" | "archive" | "epub" | "audio" | "video" | "font" | "cad" | "dwg" | "design" | "package" | "disk" | "other";

function extname(filePath: string): string {
  const lastDot = filePath.lastIndexOf(".");
  const lastSep = Math.max(filePath.lastIndexOf("/"), filePath.lastIndexOf("\\"));
  if (lastDot <= lastSep || lastDot === -1) return "";
  return filePath.slice(lastDot).toLowerCase();
}

export function detectCategory(filePath: string): FileCategory {
  return getFileFormatByPath(filePath)?.category ?? "other";
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
    ".js": "javascript", ".mjs": "javascript", ".cjs": "javascript", ".jsx": "javascript", ".ts": "typescript", ".tsx": "typescript",
    ".py": "python", ".rs": "rust", ".go": "go", ".java": "java",
    ".c": "cpp", ".cpp": "cpp", ".h": "cpp", ".hpp": "cpp", ".css": "css", ".scss": "scss", ".less": "less", ".sass": "scss",
    ".html": "html", ".htm": "html", ".xml": "xml", ".kml": "xml", ".json": "json", ".geojson": "json", ".jsonl": "json", ".ndjson": "json", ".yml": "yaml",
    ".yaml": "yaml", ".sql": "sql", ".sh": "bash", ".bat": "batch", ".cmd": "batch",
    ".ps1": "powershell", ".md": "markdown", ".mdx": "markdown", ".vue": "html", ".svelte": "html",
    ".log": "plaintext", ".ini": "ini", ".env": "bash", ".gradle": "gradle",
    ".toml": "ini", ".cfg": "ini", ".conf": "ini", ".properties": "ini",
    ".rb": "ruby", ".php": "php", ".kt": "kotlin", ".kts": "kotlin", ".swift": "swift", ".dart": "dart",
    ".lua": "lua", ".r": "r", ".m": "objective-c", ".mm": "objective-c", ".cs": "csharp", ".csproj": "xml",
    ".proto": "protobuf", ".graphql": "graphql", ".gql": "graphql", ".tf": "hcl", ".tfvars": "hcl",
    ".v": "verilog", ".sv": "systemverilog", ".lef": "plaintext", ".def": "plaintext", ".lib": "plaintext",
    ".fasta": "plaintext", ".fastq": "plaintext", ".sam": "plaintext", ".pem": "plaintext", ".key": "plaintext", ".ics": "plaintext", ".vcf": "plaintext"
  };
  return langs[ext] || "plaintext";
}
