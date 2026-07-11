import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const CSS_PATH = resolve(__dirname, "..", "src", "index.css");

function readCss(): string {
  return readFileSync(CSS_PATH, "utf8");
}

describe("App chrome polish — welcome panel stagger", () => {
  const css = readCss();

  it("declares a `panel-child-enter` keyframe that only animates opacity + transform", () => {
    const match = css.match(/@keyframes\s+panel-child-enter\s*\{([^}]+)\}/);
    expect(match, "panel-child-enter keyframe block must exist").toBeTruthy();
    expect(match![1]).toMatch(/opacity/);
    expect(match![1]).toMatch(/transform/);
    // emil rule: never layout-triggering properties
    expect(match![1]).not.toMatch(/width|height|margin|top|left|right|bottom/);
  });

  it("staggers welcome-panel direct children via --stagger-step", () => {
      // Default + 5 nth-child + n+7 = 7 staggered children
      const delays = css.match(/\.welcome-panel\s*>\s*\*(?::nth-child\([^)]+\))?\s*\{\s*animation-delay:[^}]+}/g) ?? [];
    expect(delays.length).toBeGreaterThanOrEqual(6);
    for (const d of delays) {
          // either calc(... * N) or calc(--dur-press + --stagger-step * N)
          expect(d, `delay "${d}" should reference --stagger-step`).toMatch(/--stagger-step/);
        }
  });

  it("honors prefers-reduced-motion by killing child entrance", () => {
    const reduce = css.match(/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\.welcome-panel\s*>\s*\*\s*\{[\s\S]*?\}\s*\}/);
    expect(reduce, "reduced-motion safety net for welcome-panel children must exist").toBeTruthy();
    expect(reduce![0]).toMatch(/animation:\s*none/);
  });
});

describe("App chrome polish — empty-recent-row stagger tokenization", () => {
  const css = readCss();

  it("all 7 nth-child delays are now --stagger-step driven (no hardcoded ms)", () => {
    const delays = css.match(/\.empty-recent-list\s+\.empty-recent-row:nth-child\([^)]+\)\s*\{\s*animation-delay:[^}]+}/g) ?? [];
    expect(delays.length).toBeGreaterThanOrEqual(7);
    for (const d of delays) {
      expect(d, `delay "${d}" should use --stagger-step`).toMatch(/calc\(var\(--stagger-step\)\s*\*\s*\d+\)/);
      expect(d).not.toMatch(/animation-delay:\s*\d+ms/);
    }
  });
});

describe("App chrome polish — hero-open-button focus ring", () => {
  const css = readCss();

  it("declares a :focus-visible outline + accent halo", () => {
    const match = css.match(/\.hero-open-button:focus-visible\s*\{([^}]+)\}/);
    expect(match, ":focus-visible rule for hero-open-button must exist").toBeTruthy();
    expect(match![1]).toMatch(/outline/);
    expect(match![1]).toMatch(/box-shadow/);
  });

  it("keeps the existing :active press feedback", () => {
    expect(css).toMatch(/\.hero-open-button:active\s*\{[^}]*transform:translateY\(2px\)\s*scale\(\.98\)/);
  });
});

describe("App chrome polish — drop-hint micro animation", () => {
  const css = readCss();

  it("adds a `::before` glyph with vertical bob keyframe", () => {
    expect(css).toMatch(/\.drop-hint::before\s*\{/);
    expect(css).toMatch(/content:"↓"/);
    const bobMatch = css.match(/@keyframes\s+drop-hint-bob\s*\{([\s\S]+?)\}/);
    expect(bobMatch, "drop-hint-bob keyframe must exist").toBeTruthy();
    expect(bobMatch![1]).toMatch(/opacity/);
    expect(bobMatch![1]).toMatch(/transform:\s*translateY/);
    // emil rule: only animate opacity + transform
    expect(bobMatch![1]).not.toMatch(/width|height|margin|top|left|right|bottom/);
  });

  it("disables bob under prefers-reduced-motion", () => {
    const reduce = css.match(/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\.drop-hint::before\s*\{[\s\S]*?animation:\s*none/);
    expect(reduce, "reduced-motion safety net for drop-hint must disable the bob").toBeTruthy();
  });
});

describe("App chrome polish — format-row chip hover", () => {
  const css = readCss();

  it("chips transition only opacity/transform-friendly properties", () => {
    const match = css.match(/\.format-row span\s*\{([^}]+)\}/);
    expect(match).toBeTruthy();
    expect(match![1]).toMatch(/transition:[^;]*transform/);
    expect(match![1]).toMatch(/transition:[^;]*color/);
  });

  it("hover is gated behind (hover: hover) and (pointer: fine)", () => {
    expect(css).toMatch(/@media\s*\(hover:\s*hover\)\s*and\s*\(pointer:\s*fine\)\s*\{[\s\S]*?\.format-row span:hover\s*\{[^}]*transform:\s*translateY/);
  });
});