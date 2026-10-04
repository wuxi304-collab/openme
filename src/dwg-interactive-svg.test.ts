// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const DWG_TSX = readFileSync(
  resolve(__dirname, "components/viewers/DwgViewer.tsx"),
  "utf8"
);
const DWG_CSS = readFileSync(
  resolve(__dirname, "components/viewers/DwgViewer.css"),
  "utf8"
);
const I18N_TSX = readFileSync(resolve(__dirname, "i18n.tsx"), "utf8");
const INDEX_CSS = readFileSync(resolve(__dirname, "index.css"), "utf8");

// The interactive pan/zoom used to live inline in DwgViewer.tsx as a transformed
// <img src={objectUrl}>. It now lives in CadSvgCanvas, which owns the paper
// sheet, the label inventory and the transform, and which applies pan/zoom to
// the normalised <g> wrapper instead of to an <img>. DwgViewer keeps the engine
// selection / i18n / lazy-LibreDWG responsibilities and hands the raw SVG text
// down. The assertions below follow the code to its new home — the zoom floor
// is deliberately NOT the old 0.1, see the MIN_SCALE note in the component.
const CAD_CANVAS_TSX = readFileSync(
  resolve(__dirname, "components/viewers/CadSvgCanvas.tsx"),
  "utf8"
);
const CAD_TEXT_TSX = readFileSync(
  resolve(__dirname, "components/viewers/CadTextList.tsx"),
  "utf8"
);

describe("DWG interactive SVG mode", () => {
  it("imports the new DwgViewer stylesheet", () => {
    expect(DWG_TSX).toMatch(/import\s+["']\.\/DwgViewer\.css["']/);
  });

  it("DwgViewer hands the raw SVG text to CadSvgCanvas instead of an object URL", () => {
    // A blob: URL would throw away the markup CadSvgCanvas parses to build the
    // label inventory, so this wiring is load-bearing, not cosmetic.
    expect(DWG_TSX).toMatch(/<CadSvgCanvas/);
    expect(DWG_TSX).toMatch(/svgText=\{nativeSvg\}/);
    expect(DWG_TSX).not.toMatch(/createObjectURL/);
  });

  it("declares pan/zoom state and a stable svg drag origin ref", () => {
    expect(CAD_CANVAS_TSX).toMatch(/const\s+\[scale,\s*setScale\]\s*=\s*useState/);
    expect(CAD_CANVAS_TSX).toMatch(/const\s+\[tx,\s*setTx\]\s*=\s*useState/);
    expect(CAD_CANVAS_TSX).toMatch(/const\s+\[ty,\s*setTy\]\s*=\s*useState/);
    expect(CAD_CANVAS_TSX).toMatch(/dragRef\s*=\s*useRef<\{[^}]*startX[^}]*\}\s*\|\s*null>/);
  });

  it("clamps zoom so XREF-heavy sheets can still fit", () => {
    // Regression guard: a viewBox ~7600 units wide rendered into a ~430 px pane
    // needs a scale around 0.05, so a 0.1 floor pushed the fit 2x too large and
    // the sheet overflowed. Keep the floor far below that and the ceiling sane.
    expect(CAD_CANVAS_TSX).toMatch(/const\s+MIN_SCALE\s*=\s*0\.002/);
    expect(CAD_CANVAS_TSX).toMatch(/const\s+MAX_SCALE\s*=\s*64/);
    expect(CAD_CANVAS_TSX).toMatch(/Math\.max\(MIN_SCALE,\s*Math\.min\(MAX_SCALE,/);
  });

  it("owns the drag state machine with pointer capture on the host", () => {
    expect(CAD_CANVAS_TSX).toMatch(/onPointerDown=\{onPointerDown\}/);
    expect(CAD_CANVAS_TSX).toMatch(/onPointerMove=\{onPointerMove\}/);
    expect(CAD_CANVAS_TSX).toMatch(/onPointerUp=\{onPointerUp\}/);
    expect(CAD_CANVAS_TSX).toMatch(/onPointerCancel=\{onPointerUp\}/);
    // Pointer capture keeps the drag alive when the cursor leaves the canvas,
    // which is what the old window-level listeners were there to do.
    expect(CAD_CANVAS_TSX).toMatch(/setPointerCapture\(event\.pointerId\)/);
    expect(CAD_CANVAS_TSX).toMatch(/releasePointerCapture\(event\.pointerId\)/);
  });

  it("fits from the normalised viewBox and re-fits on resize", () => {
    expect(CAD_CANVAS_TSX).toMatch(/const\s+fitToWindow\s*=\s*useCallback/);
    expect(CAD_CANVAS_TSX).toMatch(/const\s+applyCentredScale\s*=\s*useCallback/);
    expect(CAD_CANVAS_TSX).toMatch(/FIT_FLOOR/);
    expect(CAD_CANVAS_TSX).toMatch(/viewBox\.width\}px/);
    expect(CAD_CANVAS_TSX).toMatch(/ResizeObserver/);
  });

  it("applies translate()/scale() to the stage <g> with transformOrigin 0 0", () => {
    // The transform goes on the inner <g> wrapper rather than the <svg> root,
    // so it cannot clobber the Y-flip transform ACadSharp writes on the root.
    expect(CAD_CANVAS_TSX).toMatch(/querySelector<SVGGElement>\("\.cad-svg-stage-g"\)/);
    expect(CAD_CANVAS_TSX).toMatch(
      /target\.style\.transform\s*=\s*`translate\(\$\{tx\}px,\s*\$\{ty\}px\)\s*scale\(\$\{scale\}\)`/
    );
    expect(CAD_CANVAS_TSX).toMatch(/target\.style\.transformOrigin\s*=\s*["']0 0["']/);
  });

  it("gates wheel handling with preventDefault to suppress page scroll", () => {
    expect(CAD_CANVAS_TSX).toMatch(/const\s+onWheel\s*=\s*useCallback/);
    expect(CAD_CANVAS_TSX).toMatch(/onWheel=\{onWheel\}/);
    expect(CAD_CANVAS_TSX).toMatch(/const\s+onWheel\s*=\s*useCallback\([\s\S]{0,400}preventDefault\(\)/);
  });

  it("keeps the host in charge of the gesture so nothing starts a native drag", () => {
    // touch-action + user-select on the host suppress the browser's own
    // pan/zoom and text selection for both the inline <g> and the bitmap <img>
    // fallback path, so neither can swallow the pointer.
    expect(INDEX_CSS).toMatch(/\.cad-svg-host\s*\{[^}]*touch-action:\s*none/);
    expect(INDEX_CSS).toMatch(/\.cad-svg-host\s*\{[^}]*user-select:\s*none/);
    expect(INDEX_CSS).toMatch(/\.cad-svg-host\s*\{[^}]*cursor:\s*grab/);
    expect(INDEX_CSS).toMatch(/\.cad-svg-host:active\s*\{\s*cursor:\s*grabbing/);
  });

  it("disables motion for prefers-reduced-motion users", () => {
    // Only the compat-mode toolbar transition is still ours to control; the
    // native sheet's motion is governed by index.css's global reduced-motion
    // block. Both are asserted, so dropping either one fails here.
    expect(DWG_CSS).toMatch(
      /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{\s*\.dwg-toolbar button\s*\{\s*transition:\s*none/
    );
    expect(INDEX_CSS).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]{0,400}transition-duration/);
  });

  it("keeps native image drag from fighting the pan gesture on the bitmap path", () => {
    // Drawings over the 1 MB inline limit render as <img src={blobURL}>. Without
    // draggable={false} the browser starts its own image drag and the component's
    // pan never completes. The old inline canvas had this; the port dropped it.
    expect(CAD_CANVAS_TSX).toMatch(/<img[\s\S]{0,400}draggable=\{false\}/);
  });

  it("localizes the CAD surface instead of hardcoding Chinese", () => {
    // Regression guard for the merge that replaced the localized native canvas
    // with a Chinese-only one. audit:i18n cannot catch this: it only diffs the zh
    // and en dictionaries against each other and never looks at components.
    expect(CAD_CANVAS_TSX).toMatch(/useI18n\(\)/);
    expect(CAD_TEXT_TSX).toMatch(/useI18n\(\)/);
    // Native title= is banned project-wide; Tooltip is the only sanctioned way.
    expect(CAD_CANVAS_TSX).not.toMatch(/\btitle=/);
    expect(CAD_TEXT_TSX).not.toMatch(/\btitle=/);

    // The check that actually matters: no CJK may survive outside a comment.
    // Checking only for useI18n() would pass on a component that calls the hook
    // and then hardcodes half its labels anyway, which is exactly how this
    // regression shipped the first time.
    const cjk = /[\u3000-\u303f\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\ufe30-\ufe4f\uff00-\uffef]/;
    for (const [name, source] of [
      ["CadSvgCanvas.tsx", CAD_CANVAS_TSX],
      ["CadTextList.tsx", CAD_TEXT_TSX],
    ] as const) {
      const offenders = source
        .split("\n")
        .map((line, index) => ({ line: line.trim(), number: index + 1 }))
        .filter(({ line }) => cjk.test(line))
        .filter(({ line }) => !/^(\/\*|\*|\*\/|\/\/)/.test(line))
        .map(({ line, number }) => `${name}:${number}: ${line}`);
      expect(offenders, "user-visible CJK must go through useI18n()").toEqual([]);
    }
  });

  it("exposes the CAD toolbar and label-panel labels in both locales", () => {
    const keys = [
      "cadSvgToolbarAria",
      "cadSvgFitWindow",
      "cadSvgPaperSize",
      "cadSvgCanvasAria",
      "cadTextPanelAria",
      "cadTextFilterPlaceholder",
      "cadTextPreviewOnlyWarning",
    ];
    // Each key must appear in both dictionaries, i.e. twice, with a different
    // value in each. Comparing counts alone would pass on a duplicated zh entry.
    for (const key of keys) {
      const hits = I18N_TSX.match(new RegExp(`\\b${key}:`, "g")) ?? [];
      expect(hits.length, `${key} should exist in both zh and en dictionaries`).toBe(2);
    }
    expect(I18N_TSX).toMatch(/cadSvgFitWindow:\s*["']适应窗口["']/);
    expect(I18N_TSX).toMatch(/cadSvgFitWindow:\s*["']Fit to window["']/);
    expect(I18N_TSX).toMatch(/cadTextPanelAria:\s*["']图纸文字["']/);
  });
});
