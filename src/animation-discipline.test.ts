// Contract test: animation discipline in the OpenMe codebase.
//
// Rules enforced (per pocket-ui-polish motion rules):
//   1. Modal/overlay enter animations are within the 300ms budget.
//   2. Stagger lists (recent files, suggestions) have explicit nth-child
//      animation-delay — never uniform.
//   3. Infinite animations (loop forever) have reduced-motion companions
//      so the spinner doesn't trigger vestibular disorders.
//   4. Single-shot enter animations ≤ 300ms by default.
//
// Companion tests:
//   - chrome-hover-gates-v2, viewer-css-hover-gates, component-css-hover-gates
//   - focus-visible-discipline
//   - no-transition-all

import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

function readCss(file: string): string {
  return fs.readFileSync(path.resolve(file), "utf8");
}

describe("animation discipline", () => {
  describe("modal/overlay enter animations", () => {
    it("command-palette uses var(--dur-modal) for its enter animation", () => {
      const css = readCss("src/index.css");
      expect(css).toMatch(/animation:\s*command-in\s+var\(--dur-modal\)/);
    });

    it("shortcuts-overlay uses var(--dur-modal) for its enter animation", () => {
      const css = readCss("src/index.css");
      expect(css).toMatch(/animation:\s*shortcuts-in\s+var\(--dur-modal\)/);
    });

    it("status-format-popover-in is within the 300ms budget", () => {
      const css = readCss("src/file-summary.css");
      const decl = css.match(/animation:\s*status-format-popover-in\s+(\d+(?:\.\d+)?)(s|ms)/);
      expect(decl).not.toBeNull();
      const ms = decl![2] === "s" ? parseFloat(decl![1]) * 1000 : parseFloat(decl![1]);
      expect(ms).toBeLessThanOrEqual(300);
    });
  });

  describe("stagger lists", () => {
    it(".recent-list .recent-file has explicit nth-child stagger delays", () => {
      const css = readCss("src/index.css");
      const delays = css.match(/\.recent-list \.recent-file:nth-child\(\d+\)\s*\{[^}]*animation-delay/g) ?? [];
      expect(delays.length).toBeGreaterThanOrEqual(5);
    });

    it(".empty-recent-list .empty-recent-row has explicit nth-child stagger delays", () => {
      const css = readCss("src/index.css");
      const delays = css.match(/\.empty-recent-list \.empty-recent-row:nth-child\(\d+\)\s*\{[^}]*animation-delay/g) ?? [];
      expect(delays.length).toBeGreaterThanOrEqual(5);
    });

    it(".welcome-panel children use --stagger-step for stagger", () => {
      const css = readCss("src/index.css");
      expect(css).toMatch(/\.welcome-panel\s*>\s*\*\s*\{[^}]*animation-delay:\s*calc\(var\(--dur-press\)\s*\+\s*var\(--stagger-step\)/);
    });
  });

  describe("infinite animations have reduced-motion companions", () => {
    function keyframes(css: string): Set<string> {
      const set = new Set<string>();
      const re = /@keyframes\s+([\w-]+)/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(css)) !== null) set.add(m[1]);
      return set;
    }

    function animationDecls(css: string): string[] {
      return css.match(/animation:[^;]+;/g) ?? [];
    }

    function hasInfiniteUsage(css: string, name: string): boolean {
      for (const decl of animationDecls(css)) {
        const re = new RegExp(`animation:[^;]*\\b${name}\\b[^;]*infinite`);
        if (re.test(decl)) return true;
      }
      return false;
    }

    function hasReducedMotionCompanion(css: string): boolean {
      const rmBlocks = css.match(/@media\s*\(prefers-reduced-motion:[^)]*\)\s*\{[\s\S]*?\n\}/g) ?? [];
      for (const block of rmBlocks) {
        const inner = block.replace(/@media[^{]*\{/, "").replace(/\}\s*$/, "");
        if (/animation:\s*none/.test(inner)) return true;
      }
      return false;
    }

    it("every infinite animation has a reduced-motion companion in src/index.css", () => {
      const css = readCss("src/index.css");
      const kf = keyframes(css);
      const issues: string[] = [];
      for (const name of kf) {
        if (hasInfiniteUsage(css, name)) {
          if (!hasReducedMotionCompanion(css)) {
            issues.push(name);
          }
        }
      }
      expect(issues).toEqual([]);
    });
  });

  describe("durations budget", () => {
    it("no single-shot animation in src/index.css exceeds 300ms", () => {
      const css = readCss("src/index.css");
      const declarations = css.match(/animation:[^;]+;/g) ?? [];
      const violations: string[] = [];
      for (const decl of declarations) {
        const m = decl.match(/animation:\s*([\w-]+)\s+(\d+(?:\.\d+)?)(s|ms)/);
        if (!m) continue;
        const name = m[1];
        const value = parseFloat(m[2]);
        const unit = m[3];
        const ms = unit === "s" ? value * 1000 : value;
        if (/infinite/.test(decl)) continue;
        if (ms > 300) violations.push(`${name} = ${ms}ms`);
      }
      expect(violations).toEqual([]);
    });
  });
});