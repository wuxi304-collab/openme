// Audit script: find any zh dict entry whose value is byte-identical to the
// en dict entry. Such entries were typically copied from en during i18n
// scaffolding but never actually translated. PR #45 fixed 17 of them in the
// FileSummaryPanel section; this script catches any future regression.
//
// Usage: node scripts/audit-i18n.mjs
// Exit 0 = clean. Exit 1 = at least one untranslated zh entry found.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const I18N_PATH = path.join(__dirname, "..", "src", "i18n.tsx");

const source = fs.readFileSync(I18N_PATH, "utf8");

// Extract the `translations` object literal. We parse the two top-level
// properties (zh and en) and the inner string entries. Avoids depending on
// a TS loader.
function extractDict(lang) {
  // Find the start of the `lang: {` block, then walk braces to find its
  // matching close brace. This handles nested objects and comments safely
  // as long as no string literal contains an unescaped `{` or `}`.
  const startMarker = `${lang}: {`;
  const startIdx = source.indexOf(startMarker);
  if (startIdx === -1) throw new Error(`Could not find ${lang} dict in i18n.tsx`);
  let depth = 0;
  let bodyStart = -1;
  let bodyEnd = -1;
  for (let i = startIdx + startMarker.length - 1; i < source.length; i++) {
    const ch = source[i];
    if (ch === "{") { depth += 1; if (bodyStart === -1) bodyStart = i + 1; }
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) { bodyEnd = i; break; }
    }
  }
  if (bodyStart === -1 || bodyEnd === -1) throw new Error(`Could not find end of ${lang} dict`);
  const body = source.slice(bodyStart, bodyEnd);
  // Match top-level entries: 4-space indent, key, colon, string. Allow
  // string values to contain any non-newline, non-quote chars.
  const entryRe = /^    ([a-zA-Z][a-zA-Z0-9]*)\s*:\s*"((?:\\.|[^"\\\n])*)"/gm;
  const dict = {};
  for (const match of body.matchAll(entryRe)) {
    const [, key, value] = match;
    dict[key] = value.replace(/\\(.)/g, "$1");
  }
  return dict;
}

const zh = extractDict("zh");
const en = extractDict("en");

// Whitelist of keys where the zh value is intentionally equal to the en
// value: brand strings, product names, the English language name itself,
// single-word stylised labels. Add to this list (with a comment) if a
// future entry is correctly kept as English.
const WHITELIST = new Set([
  "world",              // "WORLD 1–1" — Mario reference, brand styling
  "english",            // "English" — the English language name
  "heroEyebrow",        // "OPENME WORKSPACE" — brand eyebrow, stylised all-caps
  "ready",              // "READY" — single-word status pill
  "officeExcelLabel",   // "Excel" — Microsoft product name
  "cadAssistantKicker", // "CAD COPILOT" — brand/stylistic kicker
  "categoryMarkdown",   // "Markdown" — file type name
  "categoryJson",       // "JSON" — file type name
]);

const untranslated = [];
const onlyInZh = [];
const onlyInEn = [];

for (const key of new Set([...Object.keys(zh), ...Object.keys(en)])) {
  if (!(key in zh)) {
    onlyInEn.push(key);
    continue;
  }
  if (!(key in en)) {
    onlyInZh.push(key);
    continue;
  }
  if (zh[key] === en[key] && /[A-Za-z]{4,}/.test(en[key]) && !WHITELIST.has(key)) {
    // Heuristic: skip short technical terms / brand names / single tokens
    // by requiring at least 4 consecutive ASCII letters. This filters
    // false positives like `pdfLabel: "PDF"`.
    untranslated.push({ key, value: en[key] });
  }
}

if (onlyInEn.length) {
  console.error(`\n  ${onlyInEn.length} keys missing from zh:`);
  for (const key of onlyInEn) console.error(`    - ${key}`);
}
if (onlyInZh.length) {
  console.error(`\n  ${onlyInZh.length} keys missing from en:`);
  for (const key of onlyInZh) console.error(`    - ${key}`);
}
if (untranslated.length) {
  console.error(`\n  ${untranslated.length} zh entries identical to en (untranslated):`);
  for (const { key, value } of untranslated) console.error(`    - ${key}: "${value}"`);
}

if (onlyInEn.length || onlyInZh.length || untranslated.length) {
  console.error("\n✗ i18n audit FAILED");
  process.exit(1);
}

console.log(`✓ i18n audit clean (${Object.keys(zh).length} zh keys, ${Object.keys(en).length} en keys, all translated)`);
