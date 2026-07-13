// Lightweight search + relative-time helpers for the command palette.
//
// `fuzzyScore` is intentionally tiny: substring hits weighted by where they
// land in the haystack and whether the match is contiguous, with a
// character-level fuzzy fallback so short typos / missing letters still
// match (`sve` finds `save`, `clor` finds `color`). It is *not* a full
// fuzzy-search algorithm — just good enough to power palette ranking for
// ~50 items without a dependency.

const NOT_FOUND = -1;
const WORD_BOUNDARY = /[\W_]/;

interface CharRun {
  /** Length of the longest run of consecutive needle chars in the haystack. */
  consecutive: number;
  /** Index in the haystack where the first needle char landed. */
  firstHit: number;
}

/**
 * Walk the haystack left-to-right, matching each needle char to the next
 * occurrence at or after `hi`. Returns the longest run of consecutive
 * matched positions, plus where the first match landed, or `null` if any
 * needle char is missing.
 */
function charLevelScan(needle: string, lcHaystack: string): CharRun | null {
  let hi = 0;
  let lastHit = -2;
  let run = 0;
  let bestRun = 0;
  let firstHit = -1;
  for (const ch of needle) {
    const found = lcHaystack.indexOf(ch, hi);
    if (found === NOT_FOUND) return null;
    if (firstHit === -1) firstHit = found;
    if (found === lastHit + 1) {
      run += 1;
      if (run > bestRun) bestRun = run;
    } else {
      run = 1;
    }
    lastHit = found;
    hi = found + 1;
  }
  return { consecutive: bestRun || needle.length, firstHit };
}

/**
 * Returns a non-negative score for how well `needle` matches `haystack`,
 * or `NOT_FOUND` when there is no match. Higher = better.
 *
 * Two-pass scoring per needle token:
 *  1. **Substring pass** — if the full token appears as a contiguous
 *     substring, score generously (+10 base, +6 word boundary, +4 start
 *     of string, +2 per extra occurrence up to +6).
 *  2. **Character-level fallback** — when the substring pass misses, walk
 *     the needle chars in order through the haystack. Score: +4 base, +1
 *     per consecutive matched char (the longest run), +2 word-boundary
 *     bonus on the first hit. This means a 3-letter typo still finds the
 *     right command but ranks below an exact substring hit.
 *
 * Both passes contribute across multiple needle tokens (e.g. `sav tab`
 * must match `save` and `tab` independently to score non-zero).
 */
export function fuzzyScore(needle: string, haystack: string): number {
  if (!needle) return 1; // empty query is a trivial match
  const tokens = needle.toLocaleLowerCase().split(/\s+/).filter(Boolean);
  if (!tokens.length) return 1;
  const lcHaystack = haystack.toLocaleLowerCase();
  let total = 0;
  for (const token of tokens) {
    const idx = lcHaystack.indexOf(token);
    if (idx !== NOT_FOUND) {
      // Substring pass — the gold standard.
      total += 10;
      if (idx === 0 || WORD_BOUNDARY.test(lcHaystack.charAt(idx - 1))) total += 6;
      if (idx === 0) total += 4;
      // Multi-occurrence bonus: cap at 3 extra hits so a noisy haystack
      // doesn't drown out a clean exact match elsewhere.
      let extraHits = 0;
      let searchFrom = idx + token.length;
      let next = lcHaystack.indexOf(token, searchFrom);
      while (next !== NOT_FOUND && extraHits < 3) {
        extraHits += 1;
        searchFrom = next + token.length;
        next = lcHaystack.indexOf(token, searchFrom);
      }
      total += Math.min(6, extraHits * 2);
      continue;
    }
    // Character-level fallback — for "sve" → "save", "clor" → "color".
    const scan = charLevelScan(token, lcHaystack);
    if (!scan) return NOT_FOUND;
    total += 4;
    total += scan.consecutive; // longest run of consecutive needle chars
    if (scan.firstHit === 0 || WORD_BOUNDARY.test(lcHaystack.charAt(scan.firstHit - 1))) total += 2;
  }
  return total;
}

/**
 * Rank items by their fuzzy match against `query`. Items that don't match
 * are pushed to the end in their original order. Items with a higher score
 * come first; ties keep their original order (stable sort via index pair).
 */
export function rankByFuzzy<T>(items: readonly T[], query: string, haystackOf: (item: T) => string): T[] {
  if (!query.trim()) return items.slice();
  return items
    .map((item, index) => ({ item, index, score: fuzzyScore(query, haystackOf(item)) }))
    .filter((entry) => entry.score !== NOT_FOUND)
    .sort((a, b) => (b.score - a.score) || (a.index - b.index))
    .map((entry) => entry.item);
}

/**
 * Builds a "X ago" / "Just now" label from a past ISO timestamp.
 *
 * Buckets:
 *  - < 1 min       → just-now
 *  - < 1 hour      → "{n} min ago"
 *  - < 24 hours    → "{n} hr ago"
 *  - < 48 hours    → "Yesterday"
 *  - < 7 days      → "{n} days ago"
 *  - < 4 weeks     → "{n} wks ago"
 *  - else          → "{n} mos ago"
 */
export interface RelativeTimeInputs {
  /** Past timestamp in ISO-8601. */
  pastIso: string;
  /** Reference "now" in ms — exposed for tests so we don't have to mock Date. */
  nowMs: number;
}

export type RelativeTimeBucket =
  | { kind: "justNow" }
  | { kind: "minutes"; n: number }
  | { kind: "hours"; n: number }
  | { kind: "yesterday" }
  | { kind: "days"; n: number }
  | { kind: "weeks"; n: number }
  | { kind: "months"; n: number };

export function bucketRelativeTime({ pastIso, nowMs }: RelativeTimeInputs): RelativeTimeBucket {
  const pastMs = Date.parse(pastIso);
  if (!Number.isFinite(pastMs)) return { kind: "days", n: 1 };
  const deltaSec = Math.max(0, Math.floor((nowMs - pastMs) / 1000));
  if (deltaSec < 60) return { kind: "justNow" };
  const minutes = Math.floor(deltaSec / 60);
  if (minutes < 60) return { kind: "minutes", n: minutes };
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return { kind: "hours", n: hours };
  const days = Math.floor(hours / 24);
  if (days < 2) return { kind: "yesterday" };
  if (days < 7) return { kind: "days", n: days };
  if (days < 28) return { kind: "weeks", n: Math.max(1, Math.floor(days / 7)) };
  return { kind: "months", n: Math.max(1, Math.floor(days / 30)) };
}
