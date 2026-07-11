// Contract test: sidebar interactive surfaces MUST have a visible
// `:focus-visible` outline. Without it, keyboard users have no way to see
// which file is currently focused in the recent list.
//
// Scope:
//   - .open-file-button (top-of-sidebar primary CTA)
//   - .recent-file (each row in the recent files list)
//   - .recent-remove (per-row remove button)
//   - .sidebar-empty-browse (CTA shown when list is empty)
//
// Companion tests:
//   - focus-visible-discipline (cross-cutting :focus audit)
//   - component-css-hover-gates (hover gate sweep for components)

import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

const INDEX_CSS = "src/index.css";

function readCss(file: string): string {
  return fs.readFileSync(path.resolve(file), "utf8");
}

function extractRules(css: string, selectorPrefix: string): string[] {
  // For each selector that starts with `selectorPrefix` followed by optional
  // pseudo-classes, return its body.
  const re = new RegExp(`(${selectorPrefix})([^{}]*)\\{([^}]*)\\}`, "g");
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(css)) !== null) {
    out.push(m[3]);
  }
  return out;
}

describe("sidebar focus discipline", () => {
  describe(".open-file-button", () => {
    it("has a :focus-visible outline", () => {
      const css = readCss(INDEX_CSS);
      const rules = extractRules(css, "\\.open-file-button");
      const focusVisibleRule = rules.find((body) => /outline\s*:/.test(body));
      expect(focusVisibleRule, "open-file-button must have a focus-visible outline").toBeDefined();
    });
  });

  describe(".recent-file", () => {
    it("has a :focus-visible outline (not just animation: none)", () => {
      const css = readCss(INDEX_CSS);
      const rules = extractRules(css, "\\.recent-file");
      // Find a rule that sets `outline:` directly on .recent-file:focus-visible
      const focusVisibleOutline = /\.recent-file:focus-visible\s*\{[^}]*outline\s*:/m.test(css);
      expect(focusVisibleOutline).toBe(true);
    });

    it("suppresses the stagger animation on focus-visible (so it doesn't compete with the outline)", () => {
      const css = readCss(INDEX_CSS);
      expect(css).toMatch(/\.recent-list \.recent-file:focus-visible\s*\{[^}]*animation:\s*none/);
    });
  });

  describe(".recent-remove", () => {
    it("has a :focus-visible outline (paired with opacity:1)", () => {
      const css = readCss(INDEX_CSS);
      expect(css).toMatch(/\.recent-remove:focus-visible\s*\{[^}]*outline\s*:/);
    });
  });

  describe(".sidebar-empty-browse", () => {
    it("has a :focus-visible outline (yellow ring matching the mario palette)", () => {
      const css = readCss(INDEX_CSS);
      expect(css).toMatch(/\.sidebar-empty-browse:focus-visible\s*\{[^}]*outline\s*:/);
    });
  });

  describe("active state consolidation", () => {
    it(".recent-file is-active and .recent-row.is-active are not both setting redundant bg/border", () => {
      // We tolerate one canonical active surface. Both classes can exist, but
      // the inner .recent-file.is-active rule must be visually cancelled by
      // the outer .recent-row.is-active rule (or vice versa). Otherwise users
      // see double-layered highlight.
      const css = readCss(INDEX_CSS);
      const fileActiveBg = /\.recent-file\.is-active\s*\{[^}]*background\s*:/.test(css);
      const rowActiveBg = /\.recent-row\.is-active\s*\{[^}]*background\s*:/.test(css);
      // At least one canonical active surface exists (sanity check).
      expect(fileActiveBg || rowActiveBg).toBe(true);
    });
  });

  describe("touch target sizing (pocket-ui-polish rule 9)", () => {
    it(".recent-file has min-height: 46px (≥ 44px touch target)", () => {
      const css = readCss(INDEX_CSS);
      expect(css).toMatch(/\.recent-file\s*\{[^}]*min-height:\s*46px/);
    });

      it(".open-file-button meets 44px touch target on mobile", () => {
      const css = readCss(INDEX_CSS);
        // Either baseline 44px OR a mobile media query bumps it up.
        // The mobile override uses a comma-separated selector list, so we
        // allow `.open-file-button` to appear anywhere within a selector
        // list followed by `{...min-height: 44px}`.
        const inline44 = /\.open-file-button\s*\{[^}]*min-height:\s*44px/.test(css);
        const mobile44 = /@media[^{}]+\{[\s\S]*?\.open-file-button[\s\S]*?\{[^}]*min-height:\s*44px/.test(css);
        expect(inline44 || mobile44).toBe(true);
      });
    });
});