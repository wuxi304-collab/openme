import { describe, expect, it } from "vitest";
import { CAD_SVG_INLINE_BYTE_LIMIT, normalizeCadSvg, parseViewBox, shouldInlineCadSvg } from "./normalizeCadSvg";

// Mirrors the shape of real ACadSharp SvgWriter output (see cad-host/*.svg samples),
// including the three defects this module exists to fix: malformed font shorthand,
// millimetre stroke widths, and raw ACI colours.
const sampleSvg = `<?xml version="1.0"?>
<svg xmlns="http://www.w3.org/2000/svg" width="2527.93" height="2696.27" viewBox="-1091.51 -582.31 2527.93 2696.27" transform="scale(1,-1)">
  <!--LINE | 856-->
  <line vector-effect="non-scaling-stroke" stroke="rgb(0,255,0)" stroke-width="0.18mm" x1="0" y1="0" x2="-43.3" y2="75" />
  <line vector-effect="non-scaling-stroke" stroke="rgb(255,255,255)" stroke-width="0.05mm" x1="0" y1="0" x2="10" y2="10" />
  <!--MTEXT | 858-->
  <text transform="translate(30.85,116.99)scale(1,-1)" fill="rgb(0,255,0)" style="font:52.5px " alignment-baseline="middle" text-anchor="end">
    <tspan x="0" dy="1e">材质：S30408</tspan>
  </text>
</svg>`;

describe("normalizeCadSvg", () => {
  it("strips scripts and event handlers", () => {
    const result = normalizeCadSvg(
      `<svg viewBox="0 0 10 10"><script>alert(1)</script><rect onload="evil()" width="10" height="10" onclick="x()" /></svg>`,
    );
    expect(result.svg).not.toMatch(/<script/i);
    expect(result.svg).not.toMatch(/onload|onclick/i);
    expect(result.removedUnsafeConstructs).toBeGreaterThan(0);
  });

  it("drops remote hrefs but keeps inline data images", () => {
    const result = normalizeCadSvg(
      `<svg viewBox="0 0 10 10"><a href="https://example.com/x">x</a><image href="data:image/png;base64,AAAA" /></svg>`,
    );
    expect(result.svg).not.toContain("https://example.com");
    expect(result.svg).toContain("data:image/png;base64,AAAA");
  });

  it("repairs the malformed font shorthand so text gets a real family", () => {
    const result = normalizeCadSvg(sampleSvg);
    expect(result.svg).not.toMatch(/font:\s*[\d.]+px/);
    expect(result.svg).toMatch(/font-size:52\.5px/);
    expect(result.svg).toMatch(/font-family:Consolas/);
    // The repair must also re-close the style attribute, not leave it dangling.
    expect(result.svg).toMatch(/style="font-size:52\.5px;font-family:[^"]+"/);
  });

  it("converts millimetre stroke widths to px and enforces a visible minimum", () => {
    const result = normalizeCadSvg(sampleSvg);
    expect(result.svg).not.toMatch(/stroke-width="[\d.]+mm"/);
    // 0.18mm ~= 0.68px, below the 0.75px floor, so it must be raised.
    expect(result.svg).toContain('stroke-width="0.75"');
  });

  it("remaps white strokes that would vanish on a light engineering sheet", () => {
    const result = normalizeCadSvg(sampleSvg, { background: "light" });
    expect(result.svg).not.toContain("rgb(255,255,255)");
    expect(result.svg).toContain('stroke="#1f2430"');
  });

  it("remaps black strokes on the dark sheet instead", () => {
    const result = normalizeCadSvg(`<svg viewBox="0 0 5 5"><line stroke="rgb(0,0,0)" stroke-width="1" /></svg>`, { background: "dark" });
    expect(result.svg).toContain('stroke="#e8eaf0"');
  });

  it("keeps the viewBox but makes the root responsive", () => {
    const result = normalizeCadSvg(sampleSvg);
    expect(result.viewBox).toEqual({ x: -1091.51, y: -582.31, width: 2527.93, height: 2696.27 });
    expect(result.svg).toContain('width="100%"');
    expect(result.svg).toContain('height="100%"');
    expect(result.svg).toContain('viewBox="-1091.51 -582.31 2527.93 2696.27"');
    // Exactly one preserveAspectRatio even if the source already carried one.
    const matches = result.svg.match(/preserveAspectRatio/g) ?? [];
    expect(matches).toHaveLength(1);
  });

  it("paints a background rect covering the drawing extents", () => {
    const light = normalizeCadSvg(sampleSvg, { background: "light" });
    expect(light.svg).toContain('fill="#f7f5f0"');
    const dark = normalizeCadSvg(sampleSvg, { background: "dark" });
    expect(dark.svg).toContain('fill="#0f1115"');
    // Background must come before the geometry so it renders behind it.
    expect(dark.svg.indexOf("<rect")).toBeLessThan(dark.svg.indexOf("<line"));
  });

  it("tolerates empty and malformed input", () => {
    expect(normalizeCadSvg("").svg).toBe("");
    const junk = normalizeCadSvg("not svg at all");
    expect(junk.viewBox).toBeNull();
    expect(typeof junk.svg).toBe("string");
  });

  it("does not corrupt the rest of the geometry", () => {
    const result = normalizeCadSvg(sampleSvg);
    expect(result.svg).toContain('stroke="rgb(0,255,0)"');
    expect(result.svg).toContain("材质：S30408");
    expect(result.svg).toContain("<!--LINE | 856-->");
  });

  it("repairs SHX-style font shorthand (font:Npx TXT) and keeps the SHX name in the stack", () => {
    const result = normalizeCadSvg(
      `<svg xmlns="http://www.w3.org/2000/svg"><text style="font:175px TXT">油漆笔标注</text></svg>`,
    );
    expect(result.svg).toContain("font-size:175px");
    expect(result.svg).toContain("font-family:TXT,");
    expect(result.svg).toContain("Consolas");
    expect(result.svg).toContain("油漆笔标注");
  });

  it("wraps inner content in <g class=\"cad-svg-stage-g\"> so pan/zoom CSS can target it", () => {
    const result = normalizeCadSvg(sampleSvg);
    expect(result.svg).toMatch(/<g class="cad-svg-stage-g">/);
    // The wrapper g must contain BOTH the background <rect> AND the geometry, so
    // pan/zoom moves everything together.
    const gStart = result.svg.indexOf('<g class="cad-svg-stage-g">');
    const gEnd = result.svg.indexOf("</g>", gStart);
    expect(gStart).toBeGreaterThan(-1);
    expect(gEnd).toBeGreaterThan(gStart);
    const inside = result.svg.slice(gStart, gEnd);
    expect(inside).toContain("<rect");
    expect(inside).toContain("<line");
  });
});

describe("MTEXT formatting codes", () => {
  it("strips backslash-less codes that ACadSharp leaks into labels", () => {
    // Observed verbatim in a real title block: the \W0.75; width-factor code
    // reached the screen as the literal prefix "W0.75;".
    const result = normalizeCadSvg(
      `<svg xmlns="http://www.w3.org/2000/svg"><text><tspan>W0.75;结      构</tspan></text></svg>`,
    );
    expect(result.svg).toContain(">结      构<");
    expect(result.svg).not.toContain("W0.75;");
  });

  it("strips codes that kept their backslash", () => {
    const result = normalizeCadSvg(
      `<svg xmlns="http://www.w3.org/2000/svg"><text>\\W0.75;\\H2.5x;\\C1;标高</text></svg>`,
    );
    expect(result.svg).toContain("标高");
    expect(result.svg).not.toContain("\\W0.75;");
    expect(result.svg).not.toContain("\\C1;");
  });

  it("handles paragraph breaks, toggles and grouping braces", () => {
    const result = normalizeCadSvg(
      `<svg xmlns="http://www.w3.org/2000/svg"><text>{\\L第一行\\P第二行\\l}</text></svg>`,
    );
    expect(result.svg).toContain("第一行第二行");
    expect(result.svg).not.toContain("{");
    expect(result.svg).not.toContain("\\L");
    expect(result.svg).not.toContain("\\P");
  });

  it("leaves ordinary labels alone", () => {
    const labels = ["备注：", "建筑工程甲级", "A113007757", "SECREDRG", "secmark", "1.不锈钢制品"];
    for (const label of labels) {
      const result = normalizeCadSvg(
        `<svg xmlns="http://www.w3.org/2000/svg"><text>${label}</text></svg>`,
      );
      expect(result.svg).toContain(label);
    }
  });

  it("never rewrites attribute values", () => {
    const result = normalizeCadSvg(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><text data-note="W0.75;x" x="1">ok</text></svg>`,
    );
    expect(result.svg).toContain('data-note="W0.75;x"');
  });
});

describe("shouldInlineCadSvg", () => {
  it("exports a 1 MB inline byte limit", () => {
    expect(CAD_SVG_INLINE_BYTE_LIMIT).toBe(1_000_000);
  });

  it("inlines drawings at or below the byte limit", () => {
    expect(shouldInlineCadSvg(0)).toBe(true);
    expect(shouldInlineCadSvg(1)).toBe(true);
    expect(shouldInlineCadSvg(CAD_SVG_INLINE_BYTE_LIMIT)).toBe(true);
  });

  it("routes drawings above the byte limit through <img>", () => {
    expect(shouldInlineCadSvg(CAD_SVG_INLINE_BYTE_LIMIT + 1)).toBe(false);
    expect(shouldInlineCadSvg(6_500_000)).toBe(false); // the railing DWG that crashed
  });
});

describe("parseViewBox", () => {
  it("parses space and comma separated viewBoxes", () => {
    expect(parseViewBox(`<svg viewBox="0 0 100 50">`)).toEqual({ x: 0, y: 0, width: 100, height: 50 });
    expect(parseViewBox(`<svg viewBox="1,2,3,4">`)).toEqual({ x: 1, y: 2, width: 3, height: 4 });
  });

  it("rejects missing or degenerate viewBoxes", () => {
    expect(parseViewBox("<svg>")).toBeNull();
    expect(parseViewBox(`<svg viewBox="0 0 0 10">`)).toBeNull();
    expect(parseViewBox(`<svg viewBox="a b c d">`)).toBeNull();
  });
});
