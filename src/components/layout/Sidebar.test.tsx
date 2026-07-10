// @vitest-environment jsdom
// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { I18nProvider } from "../../i18n";
import Sidebar from "./Sidebar";
import type { FileInfo } from "../../types";

afterEach(() => { cleanup(); });

function renderSidebar(props: Partial<React.ComponentProps<typeof Sidebar>> = {}) {
  return render(
    <I18nProvider>
      <Sidebar
        files={[]}
        selectedPath={null}
        onSelect={() => {}}
        onRemove={() => {}}
        {...props}
      />
    </I18nProvider>,
  );
}

const makeFile = (path: string): FileInfo => ({
  path,
  name: path.split("/").pop() ?? path,
  size: 12,
  lastModified: Date.now(),
});

const findChip = () => document.querySelector(".file-search-count") as HTMLElement;
const hasChip = () => Boolean(document.querySelector(".file-search-count"));

describe("Sidebar search count chip (PR #81)", () => {
  it("hides the chip when the search input is empty", () => {
    renderSidebar({ files: [], totalCount: 0, searchValue: "" });
    expect(hasChip()).toBe(false);
  });

  it("hides the chip when no totalCount is provided", () => {
    renderSidebar({ files: [makeFile("/a.dwg"), makeFile("/b.pdf")], searchValue: "dw" });
    expect(hasChip()).toBe(false);
  });

  it("renders a 'shown / total' chip while a search filter is active", () => {
    renderSidebar({
      files: [makeFile("/foo.dwg"), makeFile("/bar.pdf")],
      totalCount: 7,
      searchValue: "fo",
    });
    const txt = findChip().textContent ?? "";
    expect(txt).toMatch(/2/);
    expect(txt).toMatch(/7/);
    });

    it("substitutes both numbers into the chip via ICU placeholders", () => {
      renderSidebar({
        files: [makeFile("/baz.step"), makeFile("/bar.dwg"), makeFile("/bax.dwg")],
        totalCount: 25,
        searchValue: "ba",
      });
      const txt = findChip().textContent ?? "";
      expect(txt).toMatch(/3/);
      expect(txt).toMatch(/25/);
      expect(txt).not.toMatch(/[{}\\]/);
    });
  });

  describe("Sidebar context menu (PR #86)", () => {
    function openContextMenu(file: FileInfo, row: Element) {
      fireEvent.contextMenu(row, { clientX: 90, clientY: 40 });
      const menu = document.querySelector(".recent-context-menu") as HTMLElement;
      expect(menu).toBeTruthy();
      return menu;
    }

    it("opens the menu when a recent row is right-clicked", () => {
      const file = makeFile("/demo/foo.dwg");
      const { container } = renderSidebar({ files: [file] });
      const row = container.querySelector(".recent-row") as HTMLElement;
      openContextMenu(file, row);
      expect(document.querySelectorAll(".recent-context-menu-item").length).toBe(5);
    });

    it("dispatches Open when the first menu item is clicked", () => {
      const file = makeFile("/demo/foo.dwg");
      const onSelect = vi.fn();
      const { container } = renderSidebar({ files: [file], onSelect });
      const row = container.querySelector(".recent-row") as HTMLElement;
      openContextMenu(file, row);
      const items = document.querySelectorAll(".recent-context-menu-item");
      fireEvent.click(items[0]);
      expect(onSelect).toHaveBeenCalledWith(file);
      expect(document.querySelector(".recent-context-menu")).toBeNull();
    });

    it("dispatches Reveal when the reveal menu item is clicked", () => {
      const file = makeFile("/demo/foo.dwg");
      const onReveal = vi.fn();
      const { container } = renderSidebar({ files: [file], onReveal });
      const row = container.querySelector(".recent-row") as HTMLElement;
      openContextMenu(file, row);
      const items = document.querySelectorAll(".recent-context-menu-item");
      fireEvent.click(items[1]);
      expect(onReveal).toHaveBeenCalledWith(file);
    });

    it("dispatches Open-with-system when the system menu item is clicked", () => {
      const file = makeFile("/demo/foo.dwg");
      const onOpenInSystem = vi.fn();
      const { container } = renderSidebar({ files: [file], onOpenInSystem });
      const row = container.querySelector(".recent-row") as HTMLElement;
      openContextMenu(file, row);
      const items = document.querySelectorAll(".recent-context-menu-item");
      fireEvent.click(items[3]);
      expect(onOpenInSystem).toHaveBeenCalledWith(file);
    });

    it("dispatches Remove when the destructive menu item is clicked", () => {
      const file = makeFile("/demo/foo.dwg");
      const onRemove = vi.fn();
      const { container } = renderSidebar({ files: [file], onRemove });
      const row = container.querySelector(".recent-row") as HTMLElement;
      openContextMenu(file, row);
      const items = document.querySelectorAll(".recent-context-menu-item");
      const removeItem = items[items.length - 1] as HTMLElement;
      expect(removeItem.classList.contains("is-destructive")).toBe(true);
      fireEvent.click(removeItem);
      expect(onRemove).toHaveBeenCalledWith(file);
    });

    it("copies the file path to the clipboard via the Copy menu item and shows feedback", async () => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: { writeText },
      });
      const file = makeFile("/demo/foo.dwg");
      const { container } = renderSidebar({ files: [file] });
      const row = container.querySelector(".recent-row") as HTMLElement;
      openContextMenu(file, row);
      const items = document.querySelectorAll(".recent-context-menu-item");
      fireEvent.click(items[2]);
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });
      expect(writeText).toHaveBeenCalledWith("/demo/foo.dwg");
      const copyItem = items[2] as HTMLElement;
      expect(copyItem.classList.contains("is-success")).toBe(true);
    });

    it("closes the context menu when Escape is pressed", () => {
      const file = makeFile("/demo/foo.dwg");
      const { container } = renderSidebar({ files: [file] });
      const row = container.querySelector(".recent-row") as HTMLElement;
      openContextMenu(file, row);
      fireEvent.keyDown(document, { key: "Escape" });
      expect(document.querySelector(".recent-context-menu")).toBeNull();
    });

    it("closes the context menu on outside mousedown", () => {
      const file = makeFile("/demo/foo.dwg");
      const { container } = renderSidebar({ files: [file] });
      const row = container.querySelector(".recent-row") as HTMLElement;
      openContextMenu(file, row);
      fireEvent.mouseDown(document.body);
      expect(document.querySelector(".recent-context-menu")).toBeNull();
    });
  });

