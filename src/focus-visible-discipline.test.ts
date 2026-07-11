// Contract test: `:focus` is reserved for form controls and accessibility
// primitives. Interactive surfaces (buttons, links, tabs, menu items) MUST
// use `:focus-visible` so mouse clicks don't leave a permanent focus ring.
//
// Rationale (Vercel Web Interface Guidelines + pocket-ui-polish rule 8):
//   "`:focus-visible`优先于 `:focus` — 鼠标点击不应该留下永久的焦点环"
//
// Allowed selectors:
//   - text inputs (input:not([type="checkbox"|"radio"|"range"|"button"|...]))
//   - textareas
//   - .skip-link (paired with :focus-visible for defense in depth)
//   - main element (suppression of default ring on tabindex=-1 targets)
//   - [contenteditable]
//
// Everything else (button, a, [tabindex], .sidebar-item, .tab, etc.) MUST
// use `:focus-visible` only.
//
// Companion tests:
//   - chrome-hover-gates-v2 (covers :hover gates)
//   - viewer-css-hover-gates (covers viewer :hover gates)
//   - component-css-hover-gates (covers dialog :hover gates)

import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

interface FocusRule {
  file: string;
  line: number;
  selector: string;
  isAllowed: boolean;
  reason: string;
}

function findFocusRules(file: string): FocusRule[] {
  const css = fs.readFileSync(path.resolve(file), "utf8");
  // Strip multi-line comments so we don't false-positive on commented selectors
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const out: FocusRule[] = [];
  // Match selectors ending in :focus{ (excluding :focus-visible, :focus-within)
  // Handle multi-selector lists and trailing comma + newlines.
  const re =
    /([^{};\n][^{};]*?):focus\s*(?=[,{:])\s*\{/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(stripped)) !== null) {
    const raw = m[1];
    // Split on top-level commas (we're looking at one selector entry per match)
    const sel = raw
      .split(/,(?![^{]*\})/)
      .map((s) => s.trim())
      .filter(Boolean)
      .pop()!; // last entry — works for both single and comma-separated lists
    if (!sel) continue;
    if (sel.includes("focus-visible")) continue;
    if (sel.includes("focus-within")) continue;
    const line = stripped.slice(0, m.index).split("\n").length;
    out.push({ file, line, selector: sel, isAllowed: false, reason: "" });
  }
  return out;
}

const ALLOWED_SELECTOR_PATTERNS: { pattern: RegExp; reason: string }[] = [
  // Text inputs (any type except checkbox/radio/range/button/submit/reset/color/file)
  {
    pattern: /\binput\b(?![^,]*\[type\s*=\s*["'](?:checkbox|radio|range|button|submit|reset|color|file|image)["']\])/,
    reason: "text input",
  },
  // Textareas
  { pattern: /\btextarea\b/, reason: "textarea" },
  // Skip link (paired with :focus-visible)
  { pattern: /\.skip-link\b/, reason: "skip-link (paired :focus-visible)" },
  // main element (suppression of default ring)
  { pattern: /^main$/, reason: "main element suppression" },
  // contenteditable
  { pattern: /\[contenteditable\b/, reason: "contenteditable" },
  // .mario-input (explicit input class on mario-style text field)
  { pattern: /\.mario-input\b/, reason: ".mario-input is a text input wrapper" },
];

function classify(rule: FocusRule): FocusRule {
  for (const { pattern, reason } of ALLOWED_SELECTOR_PATTERNS) {
    if (pattern.test(rule.selector)) {
      rule.isAllowed = true;
      rule.reason = reason;
      break;
    }
  }
  return rule;
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

describe("focus-visible discipline", () => {
  describe.each(CSS_FILES)("%s", (file) => {
    it("uses :focus only for form controls / a11y primitives", () => {
      const rules = findFocusRules(file).map(classify);
      const violations = rules.filter((r) => !r.isAllowed);
      if (violations.length > 0) {
        const lines = violations
          .map((v) => `  L${v.line}: ${v.selector}`)
          .join("\n");
        throw new Error(
          `Bare :focus used on non-form-control selectors:\n${lines}\n\n` +
            `Promote to :focus-visible — mouse clicks should not leave a permanent ring.`,
        );
      }
    });
  });

  it("total :focus rules match the expected allow-list count", () => {
    let total = 0;
    let allowed = 0;
    for (const f of CSS_FILES) {
      const rules = findFocusRules(f).map(classify);
      total += rules.length;
      allowed += rules.filter((r) => r.isAllowed).length;
    }
      // Currently 5 :focus rules across all CSS — all allowed:
      //   .mario-input, .cad-ai-settings input, .cad-ai-form textarea,
      //   main, .pdf-search input, .csv-search-field input
      // (.skip-link is paired with :focus-visible — caught by spot-check test.)
      expect(total).toBe(allowed);
      expect(total).toBe(5);
    });

  it(".skip-link has paired :focus-visible for defense in depth", () => {
    const css = fs.readFileSync(path.resolve("src/index.css"), "utf8");
    expect(css).toMatch(/\.skip-link:focus\b/);
    expect(css).toMatch(/\.skip-link:focus-visible\b/);
  });

  it("every form-control pattern keeps :focus (not just :focus-visible)", () => {
    // The reason text inputs keep `:focus` is that a mouse click IS the
    // affordance for "I clicked this field, ready to type." `:focus-visible`
    // would miss mouse-initiated focus, defeating the purpose.
    const css = fs.readFileSync(path.resolve("src/index.css"), "utf8");
    expect(css).toMatch(/\.mario-input:focus\b/);
    const cad = fs.readFileSync(path.resolve("src/index.css"), "utf8");
    expect(cad).toMatch(/\.cad-ai-settings input:focus\b/);
    expect(cad).toMatch(/\.cad-ai-form textarea:focus\b/);
  });
});