// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { I18nProvider } from "../../i18n";
import SvgViewer from "./SvgViewer";

// Tiny SVG: <svg xmlns viewBox="0 0 10 10"/>
const TINY_SVG_B64 = btoa('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10" fill="red"/></svg>');

function renderViewer(props: { base64Data?: string } = {}) {
  try { window.localStorage.setItem("openme.lang", "en"); } catch { /* ignore */ }
  return render(
    <I18nProvider>
      <SvgViewer base64Data={props.base64Data ?? TINY_SVG_B64} />
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

describe("SvgViewer", () => {
  it("renders the toolbar with the SVG label and zoom menu", () => {
    renderViewer();
    expect(screen.queryByText("SVG")).not.toBeNull();
    expect(screen.queryByText("100%")).not.toBeNull();
  });

  it("exposes the aria-live status region", () => {
    renderViewer();
    const status = document.getElementById("svg-viewer-status");
    expect(status).not.toBeNull();
    expect(status?.getAttribute("role")).toBe("status");
    expect(status?.getAttribute("aria-live")).toBe("polite");
  });

  it("zooms in when the zoom-in button is clicked", () => {
    const { container } = renderViewer();
    const image = container.querySelector("img") as HTMLElement;
    expect(image.style.transform).toMatch(/scale\(1\)/);
    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    expect(image.style.transform).toMatch(/scale\(1\.1\)/);
  });

  it("zooms out when the zoom-out button is clicked", () => {
    const { container } = renderViewer();
    fireEvent.click(screen.getByRole("button", { name: "Zoom out" }));
    const image = container.querySelector("img") as HTMLElement;
    expect(image.style.transform).toMatch(/scale\(0\.9\)/);
  });

  it("applies a 50% preset zoom from the dropdown menu", () => {
    const { container } = renderViewer();
    const details = container.querySelector("details.svg-zoom-menu") as HTMLDetailsElement;
    details.open = true;
    fireEvent.click(screen.getByRole("menuitem", { name: "Zoom 50%" }));
    const image = container.querySelector("img") as HTMLElement;
    expect(image.style.transform).toMatch(/scale\(0\.5\)/);
  });

  it("resets scale when the Fit button is clicked", () => {
    const { container } = renderViewer();
    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    fireEvent.click(screen.getByRole("button", { name: "Fit" }));
    const image = container.querySelector("img") as HTMLElement;
    expect(image.style.transform).toMatch(/scale\(1\)/);
  });

  it("switches to actual size when 1:1 is clicked", () => {
    const { container } = renderViewer();
    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    fireEvent.click(screen.getByRole("button", { name: "1:1 actual size" }));
    const image = container.querySelector("img") as HTMLElement;
    expect(image.style.transform).toMatch(/scale\(1\)/);
  });

  it("treats + - 0 1 as keyboard actions on the focused stage", () => {
    const { container } = renderViewer();
    const stage = container.querySelector(".svg-stage") as HTMLElement;
    const image = container.querySelector("img") as HTMLElement;
    stage.focus();
    fireEvent.keyDown(stage, { key: "+" });
    expect(image.style.transform).toMatch(/scale\(1\.1\)/);
    fireEvent.keyDown(stage, { key: "-" });
    expect(image.style.transform).toMatch(/scale\(1\)/);
    fireEvent.keyDown(stage, { key: "0" });
    expect(image.style.transform).toMatch(/scale\(1\)/);
    fireEvent.keyDown(stage, { key: "1" });
    expect(image.style.transform).toMatch(/scale\(1\)/);
  });
});
