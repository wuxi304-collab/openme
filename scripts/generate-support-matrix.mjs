import fs from "node:fs";
import path from "node:path";

const formatSourcePaths = [
  path.resolve("src/file-registry/formats.ts"),
  path.resolve("src/file-registry/expanded-formats.ts"),
];
const outputPath = path.resolve("SUPPORT_MATRIX.generated.md");

const source = formatSourcePaths.map((sourcePath) => fs.readFileSync(sourcePath, "utf8")).join("\n");
const entries = [...source.matchAll(/\{ extension: "([^"]+)", name: "([^"]+)", category: "([^"]+)"[\s\S]*?supportLevel: "([^"]+)"[\s\S]*?boundary: "([^"]+)"/g)].map((match) => ({
  extension: match[1],
  name: match[2],
  category: match[3],
  supportLevel: match[4],
  boundary: match[5],
}));

if (entries.length === 0) {
  console.error("No file registry entries found.");
  process.exit(1);
}

const categoryLabels = {
  code: "Text and Code",
  markdown: "Markdown",
  json: "JSON and Structured Text",
  csv: "Delimited Data",
  image: "Images",
  svg: "SVG",
  pdf: "PDF",
  office: "Office Documents",
  archive: "Archives",
  epub: "Ebooks",
  audio: "Audio",
  video: "Video",
  font: "Fonts",
  cad: "3D / CAD / BIM",
  dwg: "Drawings / EDA",
  design: "Design and Media Projects",
  package: "Packages and Installers",
  disk: "Disk and VM Images",
  other: "Other / Specialist",
};

const levelMeaning = {
  "A+": "Official or native-quality implementation",
  A: "Strong built-in local support",
  B: "Built-in preview or extraction with documented limits",
  C: "Approximate preview or text-level support",
  D: "Recognized with metadata, boundary, or semantic route",
  E: "External-open route only; no built-in preview claim",
  F: "Known but not supported",
};

const supportOrder = ["A+", "A", "B", "C", "D", "E", "F"];
const categories = [...new Set(entries.map((entry) => entry.category))].sort((a, b) => (categoryLabels[a] ?? a).localeCompare(categoryLabels[b] ?? b));

function groupBy(items, key) {
  const result = new Map();
  for (const item of items) {
    const value = key(item);
    result.set(value, [...(result.get(value) ?? []), item]);
  }
  return result;
}

function levelCounts(items) {
  const counts = Object.fromEntries(supportOrder.map((level) => [level, 0]));
  for (const item of items) counts[item.supportLevel] += 1;
  return supportOrder.filter((level) => counts[level] > 0).map((level) => `${level}: ${counts[level]}`).join(" · ");
}

function escapeCell(value) {
  return String(value).replace(/\|/g, "\\|");
}

const lines = [];
lines.push("# OpenMe Generated Support Matrix");
lines.push("");
lines.push("This file is generated from `src/file-registry/formats.ts` and `src/file-registry/expanded-formats.ts`. Do not use it as marketing copy without checking the boundaries.");
lines.push("");
lines.push(`Total registered formats: **${entries.length}**`);
lines.push("");
lines.push("## Support Levels");
lines.push("");
lines.push("| Level | Meaning |");
lines.push("| --- | --- |");
for (const level of supportOrder) lines.push(`| ${level} | ${levelMeaning[level]} |`);
lines.push("");
lines.push("## Category Summary");
lines.push("");
lines.push("| Category | Count | Support distribution |");
lines.push("| --- | ---: | --- |");
for (const category of categories) {
  const items = entries.filter((entry) => entry.category === category);
  lines.push(`| ${categoryLabels[category] ?? category} | ${items.length} | ${levelCounts(items)} |`);
}
lines.push("");
lines.push("## Formats by Category");
for (const category of categories) {
  const items = entries.filter((entry) => entry.category === category).sort((a, b) => a.extension.localeCompare(b.extension));
  const grouped = groupBy(items, (item) => item.supportLevel);
  lines.push("");
  lines.push(`### ${categoryLabels[category] ?? category}`);
  lines.push("");
  lines.push("| Extension | Format | Level | Boundary |");
  lines.push("| --- | --- | --- | --- |");
  for (const level of supportOrder) {
    for (const item of grouped.get(level) ?? []) {
      lines.push(`| \`${item.extension}\` | ${escapeCell(item.name)} | ${item.supportLevel} | ${escapeCell(item.boundary)} |`);
    }
  }
}
lines.push("");
lines.push("## Rule");
lines.push("");
lines.push("A format claim is valid only when it maps to a registry entry, a support level, and an explicit boundary.");
lines.push("");

fs.writeFileSync(outputPath, lines.join("\n"), "utf8");
console.log(`Wrote ${path.relative(process.cwd(), outputPath)} with ${entries.length} formats.`);
