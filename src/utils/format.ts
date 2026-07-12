// Localised formatting helpers used across the app. Keep this module
// dependency-free so it can run in tests, the main process, or the
// renderer without ceremony.

import { translations } from "../i18n";

// Convert a byte count into a human-readable string with one decimal of
// precision once we cross the KB threshold. Below 1 KB we surface raw
// bytes — useful for small config files where the precision matters.
//
// `lang` only nudges the unit suffix where zh / en diverge. Sizes are
// always rendered with the half-width digit set so columns align.
export function formatFileSize(bytes: number, lang: "zh" | "en" = "en"): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return lang === "zh" ? `${bytes} B` : `${bytes} B`;
  const units: Array<{ threshold: number; suffix: { zh: string; en: string } }> = [
    { threshold: 1024, suffix: { zh: "KB", en: "KB" } },
    { threshold: 1024, suffix: { zh: "MB", en: "MB" } },
    { threshold: 1024, suffix: { zh: "GB", en: "GB" } },
    { threshold: 1024, suffix: { zh: "TB", en: "TB" } },
  ];
  let value = bytes / 1024;
  let unit = units[0];
  for (const candidate of units) {
    if (value < candidate.threshold) { unit = candidate; break; }
    value /= candidate.threshold;
    unit = candidate;
  }
  // Round to one decimal when ≥ 10, otherwise strip trailing zeros from
    // the two-decimal form so 1.5 KB stays "1.5 KB" instead of "1.50 KB".
  const rounded = value >= 10 ? Math.round(value * 10) / 10 : Math.round(value * 100) / 100;
    let display: string;
    if (Number.isInteger(rounded)) display = rounded.toFixed(0);
    else if (rounded >= 10) display = rounded.toFixed(1);
    else display = rounded.toString();
    return `${display} ${unit.suffix[lang]}`;
}

// ICU-style minimal substitution helper for use outside React. Mirrors
// the contract of `formatIcu` in i18n.tsx but with no React dependency
// — needed so this module stays importable from tests and the main
// process. Supports `{key}` substitution and `{key, plural, one {...}
// other {#...} }` for grammatically-aware units.
function formatTemplate(template: string, params: Record<string, string | number>, lang: "zh" | "en"): string {
  let out = "";
  let i = 0;
  while (i < template.length) {
    const c = template[i];
    if (c !== "{") { out += c; i++; continue; }
    // Find balanced closing brace.
    let depth = 0;
    let j = i;
    while (j < template.length) {
      if (template[j] === "{") depth++;
      else if (template[j] === "}") { depth--; if (depth === 0) break; }
      j++;
    }
    if (j >= template.length) { out += template.slice(i); break; }
    const inner = template.slice(i + 1, j);
    if (inner.includes(",")) {
      const parts = inner.split(/\s*,\s*/);
      if (parts.length >= 3 && parts[1] === "plural") {
        const key = parts[0];
        const body = parts.slice(2).join(",");
        const n = Number(params[key]);
        const branch = lang === "zh" ? "other" : n === 1 ? "one" : "other";
        const branchRe = new RegExp(`\\b${branch}\\s*\\{`);
        const branchMatch = body.match(branchRe);
        if (branchMatch) {
          const branchStart = branchMatch.index! + branchMatch[0].length - 1;
          let bd = 0;
          let bj = branchStart;
          while (bj < body.length) {
            if (body[bj] === "{") bd++;
            else if (body[bj] === "}") { bd--; if (bd === 0) break; }
            bj++;
          }
          const branchText = body.slice(branchStart + 1, bj);
          out += branchText.replace(/#/g, String(n));
          i = j + 1;
          continue;
        }
      }
    }
    const v = params[inner];
    out += v === undefined || v === null ? `{${inner}}` : String(v);
    i = j + 1;
  }
  // Pass 2: substitute any remaining {key} tokens (e.g. inside a plural branch).
  return out.replace(/\{(\w+)\}/g, (_, k) => {
    const v = params[k];
    return v === undefined || v === null ? `{${k}}` : String(v);
  });
}

// Look up an i18n key for the current locale with a fallback to the
// other locale, then to the key itself. Lets `formatRelativeTime` keep
// rendering reasonable strings even if the dict is briefly unavailable
// (e.g. during the first render before `I18nProvider` mounts).
function lookup(lang: "zh" | "en", key: string): string {
  const zh = translations.zh?.[key];
  const en = translations.en?.[key];
  return (lang === "en" ? en : zh) ?? en ?? zh ?? key;
}

// Convert an ISO timestamp (or epoch ms / Date) into a coarse relative
// description like "2 minutes ago" / "2 分钟前". Returns the absolute
// local date when the gap is over 30 days so we don't show stale data.
export function formatRelativeTime(input: string | number | Date, lang: "zh" | "en" = "en", now: Date = new Date()): string {
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return "—";
  const diffMs = now.getTime() - date.getTime();
  if (diffMs < 0) {
    // Future timestamps are rare but possible if the system clock moved.
    return formatAbsolute(date, lang);
  }
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 5) return lookup(lang, "relativeTimeJustNow");
  if (seconds < 60) return formatTemplate(lookup(lang, "relativeTimeSeconds"), { n: seconds }, lang);
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return formatTemplate(lookup(lang, "relativeTimeMinutes"), { n: minutes }, lang);
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return formatTemplate(lookup(lang, "relativeTimeHours"), { n: hours }, lang);
  const days = Math.floor(hours / 24);
  if (days < 30) return formatTemplate(lookup(lang, "relativeTimeDays"), { n: days }, lang);
  return formatAbsolute(date, lang);
}

// Localised absolute date used when the relative gap is too long to be
// useful. Keeps both locales on the same ISO-derived components.
function formatAbsolute(date: Date, lang: "zh" | "en"): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  if (lang === "zh") return `${y}-${m}-${d} ${hh}:${mm}`;
  return `${y}-${m}-${d} ${hh}:${mm}`;
}