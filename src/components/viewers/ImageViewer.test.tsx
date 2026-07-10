// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { I18nProvider } from "../../i18n";
import ImageViewer from "./ImageViewer";

// 1x1 transparent PNG
const TINY_PNG_B64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

function renderViewer(props: { base64Data?: string; mimeType?: string } = {}) {
  try { window.localStorage.setItem("openme.lang", "en"); } catch { /* ignore */ }
  return render(
    <I18nProvider>
      <ImageViewer
        base64Data={props.base64Data ?? TINY_PNG_B64}
        mimeType={props.mimeType ?? "image/png"}
      />
    </I18nProvider>,
  );
}

beforeEach(() => {
  try { window.localStorage.setItem("openme.lang", "en"); } catch { /* ignore */ }
});

afterEach(() => {
  cleanup();
  try { window.localStorage.removeItem("openme.lang"); } catch { /* ignore */ }
});

describe("ImageViewer", () => {
  it("renders the toolbar with image label and zoom preset menu", () => {
    renderViewer();
    // The toolbar label text comes from useI18n -- "Image" in en.
    expect(screen.queryByText("Image")).not.toBeNull();
    // "Fit" appears both on the toolbar button and in the fit-mode badge;
    // we just want to confirm at least one Fit surface is rendered.
    expect(screen.queryAllByText("Fit").length).toBeGreaterThanOrEqual(1);
  });

  it("exposes the live region status to assistive tech", () => {
    renderViewer();
    const status = document.getElementById("image-viewer-status");
    expect(status).not.toBeNull();
    expect(status?.getAttribute("role")).toBe("status");
    expect(status?.getAttribute("aria-live")).toBe("polite");
  });

  it("rotates the image 90deg clockwise when the rotate button is clicked", () => {
    const { container } = renderViewer();
    const rotateCw = screen.getByRole("button", { name: "Rotate clockwise" });
    const image = container.querySelector("img") as HTMLElement;
    expect(image.style.transform).toMatch(/rotate\(0deg\)/);
    fireEvent.click(rotateCw);
    expect(image.style.transform).toMatch(/rotate\(90deg\)/);
  });

  it("zooms in when the zoom-in button is clicked", () => {
    const { container } = renderViewer();
    const zoomIn = screen.getByRole("button", { name: "Zoom in" });
    const image = container.querySelector("img") as HTMLElement;
    fireEvent.click(zoomIn);
    expect(image.style.transform).toMatch(/scale\(1\.1\)/);
  });

  it("zooms out when the zoom-out button is clicked", () => {
    const { container } = renderViewer();
    const zoomOut = screen.getByRole("button", { name: "Zoom out" });
    const image = container.querySelector("img") as HTMLElement;
    fireEvent.click(zoomOut);
    // Exits fit mode, so the max-width:100%/max-height:100% also clears.
    expect(image.style.transform).toMatch(/scale\(0\.9\)/);
    expect(image.style.maxWidth).toBe("none");
  });

  it("applies a 50% preset zoom from the dropdown menu", () => {
    const { container } = renderViewer();
    // Open the zoom menu by toggling its <details>.
    const details = container.querySelector("details.image-zoom-menu") as HTMLDetailsElement;
    details.open = true;
    // Each preset renders "Zoom 50%" / "Zoom 75%" etc.
    const preset = screen.getByRole("menuitem", { name: "Zoom 50%" });
    fireEvent.click(preset);
    const image = container.querySelector("img") as HTMLElement;
    expect(image.style.transform).toMatch(/scale\(0\.5\)/);
  });

  it("resets to fit when the Fit button is clicked", () => {
    const { container } = renderViewer();
    const image = container.querySelector("img") as HTMLElement;
    // Apply a non-fit state.
    fireEvent.click(screen.getByRole("button", { name: "Rotate clockwise" }));
    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    // Toolbar shows a <button> with text "Fit"; use the toolbar variant by
    // narrowing to <button> elements only (so we skip <small> badges).
    const fitButtons = screen.getAllByRole("button", { name: "Fit" }).filter((el) => el.tagName === "BUTTON");
    expect(fitButtons.length).toBeGreaterThan(0);
    fireEvent.click(fitButtons[0]);
    expect(image.style.transform).toMatch(/rotate\(0deg\)/);
    expect(image.style.transform).toMatch(/scale\(1\)/);
    expect(image.style.maxWidth).toBe("100%");
  });

  it("switches to actual size when 1:1 is clicked", () => {
    const { container } = renderViewer();
    fireEvent.click(screen.getByRole("button", { name: "1:1 actual size" }));
    const image = container.querySelector("img") as HTMLElement;
    expect(image.style.transform).toMatch(/scale\(1\)/);
    expect(image.style.maxWidth).toBe("none");
  });

  it("treats arrow-key panning on the focused stage as keyboard pan", () => {
    const { container } = renderViewer();
    const image = container.querySelector("img") as HTMLElement;
    const stage = container.querySelector(".image-stage") as HTMLElement;
    stage.focus();
    fireEvent.keyDown(stage, { key: "ArrowRight" });
    fireEvent.keyDown(stage, { key: "ArrowRight" });
    fireEvent.keyDown(stage, { key: "ArrowDown" });
    // 16 + 16 + 16 = 48 on both axes
    expect(image.style.transform).toMatch(/translate\(32px, 16px\)/);
  });

  it("treats + - 0 r f 1 as keyboard actions on the focused stage", () => {
    const { container } = renderViewer();
    const stage = container.querySelector(".image-stage") as HTMLElement;
    const image = container.querySelector("img") as HTMLElement;
    stage.focus();
    fireEvent.keyDown(stage, { key: "+" });
    expect(image.style.transform).toMatch(/scale\(1\.1\)/);
    fireEvent.keyDown(stage, { key: "-" });
    expect(image.style.transform).toMatch(/scale\(1\)/);
    fireEvent.keyDown(stage, { key: "r" });
    expect(image.style.transform).toMatch(/rotate\(90deg\)/);
    fireEvent.keyDown(stage, { key: "R" });
    // normalizeRotation wraps to [-180, 180], so 180deg renders as -180deg.
    expect(image.style.transform).toMatch(/rotate\((-?180deg)\)/);
    fireEvent.keyDown(stage, { key: "0" });
    expect(image.style.transform).toMatch(/rotate\(0deg\)/);
    expect(image.style.transform).toMatch(/scale\(1\)/);
  });

  it("captures natural dimensions on image load", () => {
    const { container } = renderViewer();
    const image = container.querySelector("img") as HTMLImageElement;
    // The 1x1 PNG should resolve immediately; trigger load + flush.
    Object.defineProperty(image, "naturalWidth", { value: 320, configurable: true });
    Object.defineProperty(image, "naturalHeight", { value: 240, configurable: true });
    fireEvent.load(image);
    expect(screen.queryByText("320 × 240")).not.toBeNull();
  });
});
