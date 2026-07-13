// Tests for the command palette search + relative-time helpers.

import { describe, expect, it } from "vitest";
import { bucketRelativeTime, fuzzyScore, rankByFuzzy } from "./commandPaletteSearch";

describe("fuzzyScore", () => {
  it("returns positive for an empty needle (trivial match)", () => {
    expect(fuzzyScore("", "anything")).toBe(1);
  });

  it("returns NOT_FOUND (-1) when a token is missing", () => {
    expect(fuzzyScore("save", "open file")).toBe(-1);
  });

  it("scores a plain substring match", () => {
    const score = fuzzyScore("save", "save current file");
    expect(score).toBeGreaterThanOrEqual(10);
  });

  it("scores a word-boundary prefix higher than a mid-word match", () => {
    const wordBoundary = fuzzyScore("save", "open save dialog");
    const midWord = fuzzyScore("save", "autosave current");
    expect(wordBoundary).toBeGreaterThan(midWord);
  });

  it("scores a start-of-string match even higher", () => {
    const atStart = fuzzyScore("save", "save current file");
    const atWordBoundary = fuzzyScore("save", "open save file");
    expect(atStart).toBeGreaterThan(atWordBoundary);
  });

  it("requires all tokens to be present (AND, not OR)", () => {
    expect(fuzzyScore("save current", "save file")).toBe(-1);
    expect(fuzzyScore("save current", "save current file")).toBeGreaterThan(0);
  });

    // Char-level fallback (PR #174) ---------------------------------------

    it("matches a typo via character-level fuzzy ('sve' finds 'save')", () => {
      const score = fuzzyScore("sve", "save current file");
      expect(score).toBeGreaterThan(0);
    });

    it("matches scattered needle chars in haystack order ('clor' finds 'color')", () => {
      const score = fuzzyScore("clor", "background color");
      expect(score).toBeGreaterThan(0);
    });

    it("rejects when a needle char is missing entirely", () => {
      expect(fuzzyScore("sve", "open recent")).toBe(-1);
    });

    it("scores exact substring match higher than char-level fuzzy", () => {
      const exact = fuzzyScore("save", "save current file");
      const fuzzy = fuzzyScore("svae", "save current file"); // 4-char typo still in order
      expect(exact).toBeGreaterThan(fuzzy);
    });

    it("scores consecutive char runs higher than scattered ones", () => {
      // 'col' as a contiguous substring of 'color' should score higher than
      // 'col' scattered across 'console override log'.
      const consecutive = fuzzyScore("col", "color picker");
      const scattered = fuzzyScore("col", "console output log");
      expect(consecutive).toBeGreaterThan(scattered);
    });

    it("multi-occurrence substring gets a bonus over a single occurrence", () => {
      // Both haystacks start the match at the same word-boundary position so
      // the start-of-string bonus is constant — the only difference must come
      // from the extra occurrence.
      const once = fuzzyScore("save", "auto save file");
      const twice = fuzzyScore("save", "auto save and save file");
      expect(twice).toBeGreaterThan(once);
    });
  });

describe("rankByFuzzy", () => {
  const items = [
    { id: "open", label: "Open file" },
    { id: "save", label: "Save current" },
    { id: "recent", label: "Open recent: report.pdf" },
    { id: "switch", label: "Switch tab" },
  ];
  const haystack = (i: { label: string }) => i.label;

  it("returns the original list when query is empty / whitespace", () => {
    expect(rankByFuzzy(items, "", haystack)).toEqual(items);
    expect(rankByFuzzy(items, "   ", haystack)).toEqual(items);
  });

  it("filters out non-matching items", () => {
    const out = rankByFuzzy(items, "save", haystack);
    expect(out.map((i) => i.id)).toEqual(["save"]);
  });

  it("ranks the start-of-string hit above a word-boundary hit", () => {
    const out = rankByFuzzy(items, "open", haystack);
    // "Open file" starts with "Open"; "Open recent: ..." also has "Open" at
    // position 0, so both tie and stable sort preserves original order.
    expect(out.length).toBe(2);
  });

  it("falls back to original order for ties", () => {
    const out = rankByFuzzy(items, "open", haystack);
    expect(out[0]?.id).toBe("open");
    expect(out[1]?.id).toBe("recent");
  });
});

describe("bucketRelativeTime", () => {
  const now = Date.parse("2026-07-09T12:00:00Z");

  it("returns justNow for < 60 seconds", () => {
    expect(bucketRelativeTime({ pastIso: "2026-07-09T11:59:30Z", nowMs: now })).toEqual({ kind: "justNow" });
  });

  it("returns minutes for < 60 minutes", () => {
    expect(bucketRelativeTime({ pastIso: "2026-07-09T11:55:00Z", nowMs: now })).toEqual({ kind: "minutes", n: 5 });
  });

  it("returns hours for < 24 hours", () => {
    expect(bucketRelativeTime({ pastIso: "2026-07-09T09:00:00Z", nowMs: now })).toEqual({ kind: "hours", n: 3 });
  });

  it("returns yesterday for 24-48 hours", () => {
    expect(bucketRelativeTime({ pastIso: "2026-07-08T06:00:00Z", nowMs: now })).toEqual({ kind: "yesterday" });
  });

  it("returns days for 2-7 days", () => {
    expect(bucketRelativeTime({ pastIso: "2026-07-05T12:00:00Z", nowMs: now })).toEqual({ kind: "days", n: 4 });
  });

  it("returns weeks for 7-28 days", () => {
    expect(bucketRelativeTime({ pastIso: "2026-06-25T12:00:00Z", nowMs: now })).toEqual({ kind: "weeks", n: 2 });
  });

  it("returns months for >= 28 days", () => {
    expect(bucketRelativeTime({ pastIso: "2026-04-01T12:00:00Z", nowMs: now })).toEqual({ kind: "months", n: 3 });
  });

  it("falls back to days=1 on invalid input", () => {
    expect(bucketRelativeTime({ pastIso: "not-a-date", nowMs: now })).toEqual({ kind: "days", n: 1 });
  });
});
