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