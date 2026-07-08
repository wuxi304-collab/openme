// Lightweight search + relative-time helpers for the command palette.
//
// `fuzzyScore` is intentionally tiny: substring hits weighted by where they
// land in the haystack and whether the match is contiguous. It is *not* a
// full fuzzy-search algorithm — just good enough to power palette ranking
// for ~50 items without a dependency.

const NOT_FOUND = -1;

/**
 * Returns a non-negative score for how well `needle` matches `haystack`,
 * or `NOT_FOUND` when there is no match. Higher = better.
 *
 * Scoring rules (small → big):
 *  - each needle token that appears as a contiguous substring: +10
 *  - bonus when the token is a prefix of a word boundary: +6
 *  - bonus when the token is at the start of the haystack: +4
 */
export function fuzzyScore(needle: string, haystack: string): number {
  if (!needle) return 1; // empty query is a trivial match
  const tokens = needle.toLocaleLowerCase().split(/\s+/).filter(Boolean);
  if (!tokens.length) return 1;
  const lcHaystack = haystack.toLocaleLowerCase();
  let total = 0;
  for (const token of tokens) {
    const idx = lcHaystack.indexOf(token);
    if (idx === NOT_FOUND) return NOT_FOUND;
    total += 10;
    // Word-boundary bonus: previous char is non-alphanumeric, or the token
    // is at position 0 (implicit boundary). This collapses to the same
    // condition, so we just check one.
    if (idx === 0 || /[\W_]/.test(lcHaystack.charAt(idx - 1))) total += 6;
    if (idx === 0) total += 4; // extra weight for start-of-string
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
