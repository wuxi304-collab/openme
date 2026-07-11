// Viewer CSS hover-gates — wraps every remaining bare :hover in viewer CSS
// inside @media (hover: hover) and (pointer: fine) so touch devices don't
// leak hover state on first tap.

import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, it, expect } from "vitest";

const VIEWERS_DIR = resolve(__dirname, "components/viewers");

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
  file: string;
}

function findBareHoversInFile(path: string): BareHover[] {
  const css = readFileSync(path, "utf8");
  const stripped = stripHoverGateBlocks(css);
  const re = /([^{}\n;]+):hover\b\s*\{([^}]*)\}/g;
  const results: BareHover[] = [];
  for (const m of stripped.matchAll(re)) {
    const selector = m[1]!.trim();
    if (selector.includes("::-webkit-scrollbar")) continue;
    results.push({ selector, body: m[2]!.trim(), file: path });
  }
  return results;
}

const VIEWER_CSS_FILES = readdirSync(VIEWERS_DIR)
  .filter((f) => f.endsWith(".css"))
  .map((f) => join(VIEWERS_DIR, f));

describe.each(VIEWER_CSS_FILES)("Viewer CSS hover-gates — %s", (file) => {
  const bare = findBareHoversInFile(file);
  it("has no bare :hover rules", () => {
    expect(bare, JSON.stringify(bare, null, 2)).toEqual([]);
  });
});