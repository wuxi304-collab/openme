// Contract test: component dialogs (AboutDialog / ConfirmDialog /
// SettingsDialog / ViewerError) must NOT use bare `:hover` selectors — touch
// users see a sticky hover state after a tap. Every interactive surface
// should be wrapped in `@media (hover: hover) and (pointer: fine)`.
//
// `::-webkit-scrollbar-thumb:hover` is allowed because the browser itself
// gates pseudo-element hover to real cursors.
//
// Companion to chrome-hover-gates-v2 (covers `index.css` + `file-summary.css`)
// and viewer-css-hover-gates (covers `components/viewers/*.css`).

import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

function stripHoverGateBlocks(css: string): string {
  // Strip every `@media (hover: hover) and (pointer: fine) { ... }` block by
  // counting braces (PowerShell regex with `(?:[^}]+|})*?` hangs on deep
  // nesting — explicit depth counter is reliable).
  let out = "";
  let i = 0;
  while (i < css.length) {
    const rest = css.slice(i);
    const m = rest.match(/@media\s+\(hover:\s*hover\)\s+and\s+\(pointer:\s*fine\)\s*\{/);
    if (!m) {
      out += rest;
      break;
    }
    out += rest.slice(0, m.index);
    let depth = 1;
    let j = i + (m.index ?? 0) + m[0].length;
    while (j < css.length && depth > 0) {
      const ch = css[j];
      if (ch === "{") depth += 1;
      else if (ch === "}") depth -= 1;
      j += 1;
    }
    i = j;
  }
  return out;
}

function findBareHovers(css: string): string[] {
  const stripped = stripHoverGateBlocks(css);
  const out: string[] = [];
  // Match `:hover {` after a selector, skip media queries (already stripped)
  // and pseudo-selectors that are themselves media-gated (::-webkit-scrollbar).
  const re = /([^{}@;\n]+):hover(?![^{]*\([^)]*\))\s*\{/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(stripped)) !== null) {
    const sel = m[1].trim();
    if (sel.includes("::-webkit-scrollbar")) continue;
    if (sel.endsWith(":")) continue;
    out.push(sel);
  }
  return out;
}

const COMPONENT_CSS_FILES = [
  "src/components/AboutDialog.css",
  "src/components/ConfirmDialog.css",
  "src/components/SettingsDialog.css",
  "src/components/ViewerError.css",
];

describe("component CSS hover-gates", () => {
  describe.each(COMPONENT_CSS_FILES)("%s", (file) => {
    it("has zero bare :hover selectors outside @media hover gates", () => {
      const css = fs.readFileSync(path.resolve(file), "utf8");
      const bare = findBareHovers(css);
      expect(bare).toEqual([]);
    });
  });

  it("AboutDialog hovers are all gated", () => {
    const css = fs.readFileSync(path.resolve("src/components/AboutDialog.css"), "utf8");
    const gated = css.match(/@media \(hover: hover\) and \(pointer: fine\) \{/g) ?? [];
    expect(gated.length).toBeGreaterThanOrEqual(5);
  });

  it("ConfirmDialog hovers are all gated", () => {
    const css = fs.readFileSync(path.resolve("src/components/ConfirmDialog.css"), "utf8");
    const gated = css.match(/@media \(hover: hover\) and \(pointer: fine\) \{/g) ?? [];
    expect(gated.length).toBeGreaterThanOrEqual(3);
  });

  it("SettingsDialog hovers are all gated (incl. storage-path value)", () => {
    const css = fs.readFileSync(path.resolve("src/components/SettingsDialog.css"), "utf8");
    const bare = findBareHovers(css);
    // Should have at least 4 gated dialog buttons + 1 storage-path value
    // (the .settings-storage-path-value[title]:hover rule).
    expect(bare).toEqual([]);
  });

  it("ViewerError close hovers are all gated (both modal and inline variants)", () => {
    const css = fs.readFileSync(path.resolve("src/components/ViewerError.css"), "utf8");
    const gated = css.match(/@media \(hover: hover\) and \(pointer: fine\) \{/g) ?? [];
    expect(gated.length).toBeGreaterThanOrEqual(2);
  });

  it("SettingsDialog reduced-motion block covers all :active transform rules", () => {
    const css = fs.readFileSync(path.resolve("src/components/SettingsDialog.css"), "utf8");
    const block = css.match(
      /@media \(prefers-reduced-motion: reduce\)\s*\{[\s\S]*?\n\}/g,
    );
    expect(block).not.toBeNull();
    const last = block![block!.length - 1];
    expect(last).toMatch(/\.settings-dialog-close:active/);
    expect(last).toMatch(/\.settings-dialog-reset:active/);
    expect(last).toMatch(/\.settings-dialog-primary:active/);
    expect(last).toMatch(/\.settings-dialog-secondary:active/);
  });

  it("AboutDialog reduced-motion block covers all 6 :active transform rules", () => {
    const css = fs.readFileSync(path.resolve("src/components/AboutDialog.css"), "utf8");
    const block = css.match(
      /@media \(prefers-reduced-motion: reduce\)\s*\{[\s\S]*?\n\}/g,
    );
    expect(block).not.toBeNull();
    const last = block![block!.length - 1];
    expect(last).toMatch(/\.about-dialog-close:active/);
    expect(last).toMatch(/\.about-dialog-copy:active/);
    expect(last).toMatch(/\.about-dialog-link:active/);
    expect(last).toMatch(/\.about-dialog-copy-button:active/);
    expect(last).toMatch(/\.about-dialog-primary:active/);
    expect(last).toMatch(/\.about-info-button:active/);
  });
});