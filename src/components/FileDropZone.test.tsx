// @vitest-environment jsdom
// PR #115 — FileDropZone aria-describedby wiring
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import FileDropZone from "./FileDropZone";
import { I18nProvider } from "../i18n";

afterEach(() => {
  cleanup();
  try { window.localStorage.removeItem("openme.lang"); } catch {}
});

beforeEach(() => {
  try { window.localStorage.setItem("openme.lang", "en"); } catch {}
});

describe("FileDropZone polish (PR #115)", () => {
  it("renders as a region with an aria-label and a hint with matching id", () => {
    render(
      <I18nProvider>
        <FileDropZone onFileDrop={() => undefined} />
      </I18nProvider>
    );
    const region = screen.getByRole("region", { name: "Drop files or click the button below to choose a file" });
    expect(region).toBeTruthy();
    expect(region.getAttribute("aria-describedby")).toBe("file-drop-zone-hint");
    const hint = document.getElementById("file-drop-zone-hint");
    expect(hint).toBeTruthy();
    expect(hint?.textContent ?? "").toMatch(/Supports PDF/);
  });

  it("browse button picks up the hint as aria-describedby", () => {
    render(
      <I18nProvider>
        <FileDropZone onFileDrop={() => undefined} />
      </I18nProvider>
    );
    const btn = screen.getByRole("button", { name: "Browse files" });
    expect(btn.getAttribute("aria-describedby")).toBe("file-drop-zone-hint");
  });

  it("supports list is announced via aria-label on the ul", () => {
    render(
      <I18nProvider>
        <FileDropZone onFileDrop={() => undefined} />
      </I18nProvider>
    );
    const list = document.querySelector(".file-drop-zone-supported-list, ul[aria-label]");
    expect(list).toBeTruthy();
  });

  it("fires onFileDrop with paths when files are dropped", () => {
    const onFileDrop = vi.fn();
    render(
      <I18nProvider>
        <FileDropZone onFileDrop={onFileDrop} />
      </I18nProvider>
    );
    const region = screen.getByRole("region", { name: "Drop files or click the button below to choose a file" });
    const file = new File(["hello"], "a.txt");
    Object.defineProperty(file, "path", { value: "/tmp/a.txt", configurable: true });
    fireEvent.drop(region, { dataTransfer: { files: [file] } });
    expect(onFileDrop).toHaveBeenCalledWith(["/tmp/a.txt"]);
  });

  it("toggles dragging copy when entering then leaving", () => {
    render(
      <I18nProvider>
        <FileDropZone onFileDrop={() => undefined} />
      </I18nProvider>
    );
    const region = screen.getByRole("region", { name: "Drop files or click the button below to choose a file" });
    expect(screen.getByText("Drop files here")).toBeTruthy();
    fireEvent.dragOver(region);
    expect(screen.getByText("Release to open")).toBeTruthy();
  });
});

describe("FileDropZone overlay variant (PR #154)", () => {
  it("renders a fixed-position overlay region with the drop-overlay aria-label", () => {
    const { container } = render(
      <I18nProvider>
        <FileDropZone variant="overlay" onFileDrop={() => undefined} />
      </I18nProvider>
    );
    const region = screen.getByRole("region", { name: "Drop any file to open it in a new tab" });
    expect(region).toBeTruthy();
    expect(region.className).toContain("file-drop-overlay");
    expect(container.querySelector(".file-drop-overlay-card")).toBeTruthy();
  });

  it("overlay has no browse button or hidden file input", () => {
    render(
      <I18nProvider>
        <FileDropZone variant="overlay" onFileDrop={() => undefined} />
      </I18nProvider>
    );
    // The fill variant has a Browse files button — its absence confirms the
    // overlay doesn't offer the alternative-action escape hatch.
    expect(screen.queryByRole("button", { name: /browse/i })).toBeNull();
    expect(document.querySelector('input[type="file"]')).toBeNull();
  });

  it("overlay reflects data-dragging attribute and switches copy on dragover", () => {
    const { container } = render(
      <I18nProvider>
        <FileDropZone variant="overlay" onFileDrop={() => undefined} />
      </I18nProvider>
    );
    const region = screen.getByRole("region", { name: "Drop any file to open it in a new tab" });
    expect(region.getAttribute("data-dragging")).toBe("false");
    // Idle copy points at the aria-label string ("Drop any file...")
    expect(screen.getByText("Drop any file to open it in a new tab")).toBeTruthy();
    fireEvent.dragOver(region);
    expect(region.getAttribute("data-dragging")).toBe("true");
    expect(screen.getByText("Release to open")).toBeTruthy();
    expect(container.querySelector(".file-drop-overlay-card")).toBeTruthy();
  });

  it("overlay drop fires onFileDrop with extracted paths", () => {
    const onFileDrop = vi.fn();
    render(
      <I18nProvider>
        <FileDropZone variant="overlay" onFileDrop={onFileDrop} />
      </I18nProvider>
    );
    const region = screen.getByRole("region", { name: "Drop any file to open it in a new tab" });
    const a = new File(["hi"], "a.txt");
    const b = new File(["hi"], "b.zip");
    Object.defineProperty(a, "path", { value: "/tmp/a.txt", configurable: true });
    Object.defineProperty(b, "path", { value: "/tmp/b.zip", configurable: true });
    fireEvent.drop(region, { dataTransfer: { files: [a, b] } });
    expect(onFileDrop).toHaveBeenCalledTimes(1);
    expect(onFileDrop).toHaveBeenCalledWith(["/tmp/a.txt", "/tmp/b.zip"]);
  });
});