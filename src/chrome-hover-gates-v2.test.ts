// Chrome hover-gates v2 — verifies remaining bare :hover rules in chrome CSS
// have been wrapped in @media (hover: hover) and (pointer: fine).
//
// Tolerated exceptions:
//   - ::-webkit-scrollbar-thumb:hover (webkit pseudo, browser-gated already)
//
// Helper strips @media (hover: hover) and (pointer: fine) { ... } blocks first
// (handling nested braces) and then searches the remainder for any bare :hover.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect } from "vitest";

const indexCss = readFileSync(resolve(__dirname, "index.css"), "utf8");
const summaryCss = readFileSync(resolve(__dirname, "file-summary.css"), "utf8");

function stripHoverGateBlocks(css: string): string {
  const out: string[] = [];
  let i = 0;
  const gateRe = /@media\s*\(hover:\s*hover\)\s*and\s*\(pointer:\s*fine\)\s*\{/i;
  while (i < css.length) {
    const m = css.slice(i).match(gateRe);
    if (m && m.index !== undefined) {
      out.push(css.slice(i, i + m.index));
      let j = i + m.index + m[0].length;
      let depth = 1;
      while (j < css.length && depth > 0) {
        if (css[j] === "{") depth++;
        else if (css[j] === "}") depth--;
        j++;
      }
      i = j;
    } else {
      out.push(css.slice(i));
      i = css.length;
    }
  }
  return out.join("");
}

interface BareHover {
  selector: string;
  body: string;
}

function findBareHovers(css: string): BareHover[] {
  const stripped = stripHoverGateBlocks(css);
  const re = /([^{}\n;]+):hover\b\s*\{([^}]*)\}/g;
  const results: BareHover[] = [];
  for (const m of stripped.matchAll(re)) {
    const selector = m[1]!.trim();
    if (selector.includes("::-webkit-scrollbar")) continue;
    results.push({ selector, body: m[2]!.trim() });
  }
  return results;
}

describe("Chrome hover-gates v2 — index.css", () => {
  const bare = findBareHovers(indexCss);
  it("has no bare :hover rules except webkit scrollbar", () => {
    expect(bare, JSON.stringify(bare, null, 2)).toEqual([]);
  });

  it("wraps known surfaces: btn-mario, sidebar-item, q-block, mario-prose", () => {
    const gated = indexCss.match(
      /@media\s*\(hover:\s*hover\)\s*and\s*\(pointer:\s*fine\)\s*\{[\s\S]*?\.btn-mario:hover[\s\S]*?\}\s*\}/,
    );
    expect(gated).toBeTruthy();
    const sbar = indexCss.match(
      /@media\s*\(hover:\s*hover\)\s*and\s*\(pointer:\s*fine\)\s*\{[\s\S]*?\.sidebar-item:hover[\s\S]*?\}\s*\}/,
    );
    expect(sbar).toBeTruthy();
    const qblock = indexCss.match(
      /@media\s*\(hover:\s*hover\)\s*and\s*\(pointer:\s*fine\)\s*\{[\s\S]*?\.q-block:hover[\s\S]*?\}\s*\}/,
    );
    expect(qblock).toBeTruthy();
    const prose = indexCss.match(
      /@media\s*\(hover:\s*hover\)\s*and\s*\(pointer:\s*fine\)\s*\{[\s\S]*?\.mario-prose tr:hover td[\s\S]*?\}\s*\}/,
    );
    expect(prose).toBeTruthy();
  });
});

describe("Chrome hover-gates v2 — file-summary.css", () => {
  const bare = findBareHovers(summaryCss);
  it("has no bare :hover rules", () => {
    expect(bare, JSON.stringify(bare, null, 2)).toEqual([]);
  });

  it("wraps known surfaces: summary-suggested-app, summary-metadata-button, status-format-popover-close", () => {
    const app = summaryCss.match(
      /@media\s*\(hover:\s*hover\)\s*and\s*\(pointer:\s*fine\)\s*\{[\s\S]*?\.summary-suggested-app:hover[\s\S]*?\}\s*\}/,
    );
    expect(app).toBeTruthy();
    const btn = summaryCss.match(
      /@media\s*\(hover:\s*hover\)\s*and\s*\(pointer:\s*fine\)\s*\{[\s\S]*?\.summary-metadata-button:hover[\s\S]*?\}\s*\}/,
    );
    expect(btn).toBeTruthy();
    const close = summaryCss.match(
      /@media\s*\(hover:\s*hover\)\s*and\s*\(pointer:\s*fine\)\s*\{[\s\S]*?\.status-format-popover-close:hover[\s\S]*?\}\s*\}/,
    );
    expect(close).toBeTruthy();
  });
});