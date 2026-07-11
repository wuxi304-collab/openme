// StatusBar polish v4 — verifies CSS additions:
// - .status-filename-button:hover is gated to fine pointer
// - .status-theme-pill:hover is gated + new :active press feedback
// - .status-format-popover-app-button:hover gated
// - .status-format-popover-action:hover + primary hover gated
// - prefers-reduced-motion kills new active transforms
//
// These tests read src/index.css and src/file-summary.css as strings and
// assert the contract is in place.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect } from "vitest";

const indexCss = readFileSync(resolve(__dirname, "index.css"), "utf8");
const summaryCss = readFileSync(resolve(__dirname, "file-summary.css"), "utf8");

/**
 * Return every `prefers-reduced-motion: reduce` block in the CSS so the
 * tests can assert against any of them (overrides can live in multiple
 * scoped blocks across the file).
 */
function reducedMotionBlocks(css: string): string[] {
  const re = /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\n\}/g;
  return [...css.matchAll(re)].map((m) => m[0]);
}

describe("StatusBar v4 — filename button hover gate", () => {
  it(".status-filename-button:hover is wrapped in (hover: hover) and (pointer: fine)", () => {
    const m = indexCss.match(
      /@media\s*\(hover:\s*hover\)\s*and\s*\(pointer:\s*fine\)\s*\{[\s\S]*?\.status-filename-button:hover:not\(:disabled\)\s*\{[\s\S]*?\}\s*\}/,
    );
    expect(m, "hover-gated filename-button rule missing").toBeTruthy();
  });

  it("prefers-reduced-motion still kills filename button :active transform", () => {
    const blocks = reducedMotionBlocks(indexCss);
    expect(blocks.length).toBeGreaterThan(0);
    const found = blocks.some((b) =>
      /\.status-filename-button:active:not\(:disabled\)\s*\{\s*transform:\s*none/.test(b),
    );
    expect(found, "filename-button :active transform not killed").toBe(true);
  });
});

describe("StatusBar v4 — theme pill", () => {
  it(".status-theme-pill:hover is wrapped in (hover: hover) and (pointer: fine)", () => {
    const m = indexCss.match(
      /@media\s*\(hover:\s*hover\)\s*and\s*\(pointer:\s*fine\)\s*\{[\s\S]*?\.status-theme-pill:hover\s*\{[\s\S]*?\}\s*\}/,
    );
    expect(m, "hover-gated theme-pill rule missing").toBeTruthy();
  });

  it(".status-theme-pill has :active press feedback (scale)", () => {
    expect(indexCss).toMatch(/\.status-theme-pill:active\s*\{\s*transform:\s*scale\(0\.92\)/);
  });

  it("prefers-reduced-motion kills .status-theme-pill:active transform", () => {
    const blocks = reducedMotionBlocks(indexCss);
    const found = blocks.some((b) =>
      /\.status-theme-pill:active\s*\{\s*transform:\s*none/.test(b),
    );
    expect(found, "theme-pill :active transform not killed").toBe(true);
  });
});

describe("StatusBar v4 — format popover buttons", () => {
  it(".status-format-popover-app-button:hover is gated", () => {
    const m = summaryCss.match(
      /@media\s*\(hover:\s*hover\)\s*and\s*\(pointer:\s*fine\)\s*\{[\s\S]*?\.status-format-popover-app-button:hover\s*\{[\s\S]*?\}\s*\}/,
    );
    expect(m, "hover-gated popover app-button rule missing").toBeTruthy();
  });

  it(".status-format-popover-action:hover is gated", () => {
    const m = summaryCss.match(
      /@media\s*\(hover:\s*hover\)\s*and\s*\(pointer:\s*fine\)\s*\{[\s\S]*?\.status-format-popover-action:hover\s*\{[\s\S]*?\}\s*\}/,
    );
    expect(m, "hover-gated popover action rule missing").toBeTruthy();
  });

  it(".status-format-popover-action-primary:hover is gated", () => {
    const m = summaryCss.match(
      /@media\s*\(hover:\s*hover\)\s*and\s*\(pointer:\s*fine\)\s*\{[\s\S]*?\.status-format-popover-action-primary:hover\s*\{[\s\S]*?\}\s*\}/,
    );
    expect(m, "hover-gated popover action-primary rule missing").toBeTruthy();
  });

  it("prefers-reduced-motion kills popover buttons :active transforms", () => {
    const blocks = reducedMotionBlocks(summaryCss);
    expect(blocks.length).toBeGreaterThan(0);
    const allText = blocks.join("\n");
    expect(allText).toMatch(/\.status-format-popover-app-button:active/);
    expect(allText).toMatch(/\.status-format-popover-action:active/);
    expect(allText).toMatch(/\.status-format-popover-action-primary:active/);
  });
});

describe("StatusBar v4 — emil invariants", () => {
  it("popover entry keyframe only animates opacity + transform", () => {
    const m = summaryCss.match(
      /@keyframes\s+status-format-popover-in\s*\{([\s\S]*?)\n\s*\}/,
    );
    expect(m, "popover entry keyframe missing").toBeTruthy();
    const body = m![1]!;
    expect(body).toMatch(/opacity/);
    expect(body).toMatch(/transform/);
    expect(body).not.toMatch(/\bwidth\s*:/);
    expect(body).not.toMatch(/\bheight\s*:/);
  });

  it("theme-pill transition explicitly lists props (no `all`)", () => {
    const m = indexCss.match(
      /\.status-theme-pill\s*\{[^}]*transition:\s*([^;]+);/,
    );
    expect(m, "theme-pill transition rule missing").toBeTruthy();
    const value = m![1]!;
    expect(value).not.toMatch(/\ball\b/);
  });
});