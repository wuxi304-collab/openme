// Localised formatting helpers used across the app. Keep this module
// dependency-free so it can run in tests, the main process, or the
// renderer without ceremony.

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
  if (seconds < 5) return lang === "zh" ? "刚刚" : "just now";
  if (seconds < 60) return lang === "zh" ? `${seconds} 秒前` : `${seconds} seconds ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return lang === "zh" ? `${minutes} 分钟前` : `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return lang === "zh" ? `${hours} 小时前` : `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return lang === "zh" ? `${days} 天前` : `${days} day${days === 1 ? "" : "s"} ago`;
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