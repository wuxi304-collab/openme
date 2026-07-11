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

describe("DWG interactive SVG mode", () => {
  it("imports the new DwgViewer stylesheet", () => {
    expect(DWG_TSX).toMatch(/import\s+["']\.\/DwgViewer\.css["']/);
  });

  it("declares pan/zoom state and a stable svg drag origin ref", () => {
      expect(DWG_TSX).toMatch(/useState\(\{\s*x:\s*0,\s*y:\s*0\s*\}\)/);
      expect(DWG_TSX).toMatch(/useRef<\{[^}]*startPanX[^}]*\}\s*\|\s*null>/);
    expect(DWG_TSX).toMatch(/const\s+\[viewZoom,\s*setViewZoom\]\s*=\s*useState/);
  });

  it("clamps zoom between 0.1 and 8", () => {
      expect(DWG_TSX).toMatch(/Math\.max\(0\.1,\s*Math\.min\(8,/);
  });

  it("wires window pointer listeners for the SVG drag state machine", () => {
    expect(DWG_TSX).toMatch(/window\.addEventListener\(\s*["']pointermove["']/);
    expect(DWG_TSX).toMatch(/window\.addEventListener\(\s*["']pointerup["']/);
    expect(DWG_TSX).toMatch(/window\.addEventListener\(\s*["']pointercancel["']/);
  });

  it("fitToWindow measures naturalWidth / naturalHeight inside requestAnimationFrame", () => {
    expect(DWG_TSX).toMatch(/fitToWindow[\s\S]{0,400}requestAnimationFrame/);
    expect(DWG_TSX).toMatch(/naturalWidth/);
    expect(DWG_TSX).toMatch(/naturalHeight/);
  });

  it("renders the SVG with translate() scale() and transformOrigin 0 0", () => {
    expect(DWG_TSX).toMatch(/transform:\s*`translate\(\$\{viewPan\.x\}px,\s*\$\{viewPan\.y\}px\)\s+scale\(\$\{viewZoom\}\)`/);
    expect(DWG_TSX).toMatch(/transformOrigin:\s*["']0\s+0["']/);
  });

  it("gates wheel handling with preventDefault to suppress page scroll", () => {
    expect(DWG_TSX).toMatch(/onWheel=\{[\s\S]{0,200}preventDefault\(\)/);
  });

  it("keeps the SVG image from swallowing pointer events so the host owns drag", () => {
      // The img gets draggable={false} inline, and pointer-events is enforced
      // via the stylesheet so the host canvas always owns drag/wheel.
      expect(DWG_TSX).toMatch(/draggable=\{false\}/);
      expect(DWG_CSS).toMatch(/pointer-events:\s*none/);
    });

  it("exposes native canvas surface with grab cursor gated to hover-capable pointers", () => {
    expect(DWG_CSS).toMatch(/@media\s*\(hover:\s*hover\)/);
    expect(DWG_CSS).toMatch(/\.dwg-native-canvas[\s\S]{0,400}cursor:\s*grab/);
  });

  it("uses grabbing cursor and disables transition while panning", () => {
    expect(DWG_CSS).toMatch(/\.dwg-native-canvas\.is-panning[\s\S]{0,200}cursor:\s*grabbing/);
    expect(DWG_CSS).toMatch(/\.is-panning\s+img[\s\S]{0,200}transition:\s*none/);
  });

  it("disables motion for prefers-reduced-motion users", () => {
    expect(DWG_CSS).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  });

  it("exposes the new toolbar aria-labels in both locales", () => {
    expect(I18N_TSX).toMatch(/dwgFitSvgAria:\s*["']适应窗口["']/);
    expect(I18N_TSX).toMatch(/dwgZoomInAria:\s*["']放大["']/);
    expect(I18N_TSX).toMatch(/dwgZoomOutAria:\s*["']缩小["']/);
    expect(I18N_TSX).toMatch(/dwgResetViewAria:\s*["']重置视图["']/);
    expect(I18N_TSX).toMatch(/dwgNativeCanvasAria:\s*["']DWG/);
    expect(I18N_TSX).toMatch(/dwgFitSvgAria:\s*["']Fit to window["']/);
    expect(I18N_TSX).toMatch(/dwgZoomInAria:\s*["']Zoom in["']/);
    expect(I18N_TSX).toMatch(/dwgZoomOutAria:\s*["']Zoom out["']/);
    expect(I18N_TSX).toMatch(/dwgResetViewAria:\s*["']Reset view["']/);
  });
});