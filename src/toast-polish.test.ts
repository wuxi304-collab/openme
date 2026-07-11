import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const CSS_PATH = resolve(__dirname, "..", "src", "index.css");

function readCss(): string {
  return readFileSync(CSS_PATH, "utf8");
}

describe("Toast polish - close button hover-gate", () => {
  const css = readCss();

  it("app-toast-close hover is gated to (hover: hover) and (pointer: fine)", () => {
    expect(css).toMatch(/@media\s*\(hover:\s*hover\)\s*and\s*\(pointer:\s*fine\)\s*\{[\s\S]*?\.app-toast-close:hover\s*\{[\s\S]*?background:#ffffff14/);
  });

  it("app-toast-close keeps its :focus-visible outline", () => {
    expect(css).toMatch(/\.app-toast-close:focus-visible\s*\{[\s\S]*?outline/);
  });
});

  describe("Toast polish - action button hover + press", () => {
    const css = readCss();

    it("action hover is gated to fine pointer only", () => {
      expect(css).toMatch(/@media\s*\(hover:\s*hover\)\s*and\s*\(pointer:\s*fine\)\s*\{[\s\S]*?\.app-toast-action:hover\s*\{[\s\S]*?background:#ffffff24/);
    });

    it("action gains a scale-down :active press feedback", () => {
      expect(css).toMatch(/@media\s*\(hover:\s*hover\)\s*and\s*\(pointer:\s*fine\)\s*\{[\s\S]*?\.app-toast-action:active\s*\{[\s\S]*?transform:\s*scale\(\.96\)/);
    });

    it("info-variant action hover is also gated", () => {
      expect(css).toMatch(/@media\s*\(hover:\s*hover\)\s*and\s*\(pointer:\s*fine\)\s*\{[\s\S]*?\.app-toast\.is-info\s+\.app-toast-action:hover/);
      });
    });

    describe("Toast polish - stack lift on hover/focus", () => {
      const css = readCss();

      it("app-toast transition now covers both transform + box-shadow", () => {
      const match = css.match(/\.app-toast\s*\{([\s\S]+?)\}/);
      expect(match).toBeTruthy();
      expect(match![1]).toMatch(/transition:[^;]*transform/);
      expect(match![1]).toMatch(/transition:[^;]*box-shadow/);
      });

      it("hover lifts the toast 2px and brightens the shadow, gated", () => {
      const match = css.match(/@media\s*\(hover:\s*hover\)\s*and\s*\(pointer:\s*fine\)\s*\{([\s\S]*?)\.app-toast:hover\s*\{([\s\S]*?)\}/);
      expect(match).toBeTruthy();
      expect(match![2]).toMatch(/transform:\s*translateY\(calc\(var\(--stack-index[\s\S]*?-\s*2px\)\)/);
      expect(match![2]).toMatch(/box-shadow:\s*0\s+18px\s+48px/);
      });

      it("focus-within also lifts (no hover gate - keyboard users always get it)", () => {
      const match = css.match(/\.app-toast:focus-within\s*\{([\s\S]*?)\}/);
      expect(match).toBeTruthy();
      expect(match![1]).toMatch(/transform:\s*translateY\(calc\(var\(--stack-index[\s\S]*?-\s*2px\)\)/);
      });
    });

    describe("Toast polish - emil invariants", () => {
      const css = readCss();

      it("toast-in keyframe only animates opacity + transform", () => {
      const match = css.match(/@keyframes\s+toast-in\s*\{([^}]+)\}/);
      expect(match).toBeTruthy();
      expect(match![1]).toMatch(/opacity/);
      expect(match![1]).toMatch(/transform/);
      expect(match![1]).not.toMatch(/width|height|margin|top|left|right|bottom/);
      });

      it("toast-ttl keyframe only animates transform", () => {
      const match = css.match(/@keyframes\s+toast-ttl\s*\{([^}]+)\}/);
      expect(match).toBeTruthy();
      expect(match![1]).toMatch(/transform/);
      });

      it("reduced-motion safety net still kills the progress bar animation", () => {
      expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*?\.app-toast-progress\s*\{[\s\S]*?animation:\s*none/);
      });
    });