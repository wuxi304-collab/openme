// Contract test: CSS must never use `transition: all`. The `all` keyword
// triggers transitions on every animatable property — including properties
// you didn't intend (box-shadow growing on hover, opacity flickering,
// filter triggering compositor layers, etc.). It also defeats the
// "only animate transform + opacity" GPU-friendly rule because it
// silently includes width/height/margin/top/left in the animated set.
//
// Allowed shorthand: `transition: none` (opt-out).
// Allowed longhand:  `transition-property: <explicit list>` (already
//                    split via the `transition:` shorthand).
//
// Per pocket-ui-polish rule 2:
//   "永不用 `transition: all`——显式列属性"
//
// Companion tests:
//   - chrome-hover-gates-v2, viewer-css-hover-gates, component-css-hover-gates
//   - focus-visible-discipline

import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

interface Violation {
  file: string;
  line: number;
  rule: string;
}

function findTransitionAllRules(file: string): Violation[] {
  const css = fs.readFileSync(path.resolve(file), "utf8");
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const out: Violation[] = [];

  // Match `transition: all ...` (anywhere 'all' is the property keyword)
  // - tolerate whitespace and trailing !important
  // - tolerate comma-separated lists where one item is 'all' (also bad)
  // - skip `transition: none` (legitimate opt-out)
  const transitionRe = /transition\s*:\s*([^;{}\n]+)/gi;
  let m: RegExpExecArray | null;
  while ((m = transitionRe.exec(stripped)) !== null) {
    const value = m[1].trim();
    // Strip !important and trailing semicolon
    const cleaned = value.replace(/!important$/i, "").trim();
    // Allow `transition: none` as opt-out
    if (/^none$/i.test(cleaned)) continue;
    // Check if 'all' appears as a standalone property keyword
    // (not as part of another property name)
    // Tokenize by comma for multi-property lists
    const tokens = cleaned.split(",").map((t) => t.trim());
    for (const tok of tokens) {
      // The first word(s) before timing are properties
      // Strip leading/trailing whitespace, then split by whitespace
      // Properties are anything before the first timing function (cubic-bezier, ease, var(--ease-*), linear)
      // or duration (number + optional unit)
      // A simple heuristic: if the token starts with "all" and is followed by whitespace + a duration, it's a violation
      if (/^all\b/.test(tok)) {
        const line = stripped.slice(0, m.index).split("\n").length;
        out.push({ file, line, rule: m[0].trim() });
        break;
      }
    }
  }

  // Also catch `transition-property: all`
  const propRe = /transition-property\s*:\s*([^;{}\n]+)/gi;
  while ((m = propRe.exec(stripped)) !== null) {
    const value = m[1].replace(/!important$/i, "").trim();
    if (/^all$/i.test(value)) {
      const line = stripped.slice(0, m.index).split("\n").length;
      out.push({ file, line, rule: m[0].trim() });
    }
  }

  return out;
}

const CSS_FILES = [
  "src/index.css",
  "src/file-summary.css",
  "src/components/AboutDialog.css",
  "src/components/ConfirmDialog.css",
  "src/components/SettingsDialog.css",
  "src/components/ViewerError.css",
  "src/components/viewers/PdfViewer.css",
  "src/components/viewers/OfficeViewer.css",
  "src/components/viewers/ZipViewer.css",
  "src/components/viewers/CsvViewer.css",
  "src/components/viewers/JsonViewer.css",
  "src/components/viewers/CodeEditor.css",
  "src/components/viewers/ImageViewer.css",
  "src/components/viewers/SvgViewer.css",
  "src/components/viewers/HexViewer.css",
  "src/components/viewers/EpubViewer.css",
  "src/components/viewers/MediaViewer.css",
  "src/components/viewers/FontViewer.css",
  "src/components/viewers/CadViewer.css",
  "src/components/viewers/LosslessAudioPlayer.css",
  "src/components/viewers/markdown-viewer.css",
  "src/components/viewers/openme-route-card.css",
];

describe("no transition: all", () => {
  describe.each(CSS_FILES)("%s", (file) => {
    it("uses explicit property lists (never transition: all)", () => {
      const violations = findTransitionAllRules(file);
      if (violations.length > 0) {
        const lines = violations
          .map((v) => `  L${v.line}: ${v.rule}`)
          .join("\n");
        throw new Error(
          `transition: all detected — animate explicit properties instead:\n${lines}\n\n` +
            `Why: 'all' triggers transitions on every animatable property including ` +
            `unintended ones (box-shadow, opacity, filter), defeating GPU-only motion.`,
        );
      }
    });
  });

  it("the codebase has zero transition: all rules", () => {
    let totalViolations = 0;
    for (const f of CSS_FILES) {
      totalViolations += findTransitionAllRules(f).length;
    }
    expect(totalViolations).toBe(0);
  });

  it("transition: none is allowed as opt-out", () => {
    const css = fs.readFileSync(path.resolve("src/index.css"), "utf8");
    // The codebase already uses `transition: none` legitimately (e.g. for
    // reduced-motion). Just sanity-check the rule is found.
    expect(css).toMatch(/transition\s*:\s*none/);
  });

  it("transition rules use motion tokens (--dur-fast, --ease-out) where possible", () => {
    // Spot check: the dominant pattern is `var(--dur-fast) var(--ease-out)`.
    const css = fs.readFileSync(path.resolve("src/index.css"), "utf8");
    const matches = css.match(/transition\s*:[^;]+/g) ?? [];
    expect(matches.length).toBeGreaterThan(10);
    const usingTokens = matches.filter((m) => m.includes("--dur-fast") || m.includes("--dur-press")).length;
    // At least 60% should use motion tokens (rest are historical or special cases)
    expect(usingTokens / matches.length).toBeGreaterThan(0.6);
  });
});