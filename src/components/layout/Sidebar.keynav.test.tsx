// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { I18nProvider } from "../../i18n";
import Sidebar from "./Sidebar";
import type { FileInfo } from "../../types";

afterEach(() => { cleanup(); });

function Providers({ children }: { children: React.ReactNode }) {
  return <I18nProvider>{children}</I18nProvider>;
}

function makeFile(path: string, id?: string): FileInfo {
  const name = path.split("/").pop() ?? path;
  return {
    id: id ?? path,
    path,
    name,
    extension: name.includes(".") ? `.${name.split(".").pop()}` : "",
    size: 12,
    modified_at: "2024-01-01T00:00:00Z",
    file_type: "text",
    opened_at: "2024-01-01T00:00:00Z",
  };
}

function getListbox(): HTMLElement {
  return document.querySelector('[role="listbox"]') as HTMLElement;
}

function getOptions(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('[role="option"]'));
}

describe("Sidebar listbox keyboard navigation", () => {
  it("renders the recent list as a listbox with aria-activedescendant pointing to the focused row", () => {
    const files = [makeFile("/a.dwg"), makeFile("/b.pdf"), makeFile("/c.md")];
    render(
      <Providers>
        <Sidebar files={files} selectedPath="/a.dwg" onSelect={() => undefined} onRemove={() => undefined} />
      </Providers>,
    );
    const listbox = getListbox();
    expect(listbox).toBeTruthy();
    expect(listbox.getAttribute("aria-label")).toBeTruthy();
    const options = getOptions();
    expect(options.length).toBe(3);
    expect(options[0].getAttribute("aria-selected")).toBe("true");
    // The listbox should announce the focused row via aria-activedescendant.
    expect(listbox.getAttribute("aria-activedescendant")).toBe(options[0].id);
  });

  it("uses roving tabindex so only one row is in tab order", () => {
    const files = [makeFile("/a.dwg"), makeFile("/b.pdf")];
    render(
      <Providers>
        <Sidebar files={files} selectedPath={null} onSelect={() => undefined} onRemove={() => undefined} />
      </Providers>,
    );
    const options = getOptions();
    const tabbableCount = options.filter((opt) => opt.getAttribute("tabindex") === "0").length;
    expect(tabbableCount).toBe(1);
  });

  it("ArrowDown moves focus to the next row and updates aria-activedescendant", () => {
    const files = [makeFile("/a.dwg"), makeFile("/b.pdf"), makeFile("/c.md")];
    render(
      <Providers>
        <Sidebar files={files} selectedPath="/a.dwg" onSelect={() => undefined} onRemove={() => undefined} />
      </Providers>,
    );
    const listbox = getListbox();
    const options = getOptions();
    fireEvent.keyDown(listbox, { key: "ArrowDown" });
    expect(document.activeElement).toBe(options[1]);
    expect(listbox.getAttribute("aria-activedescendant")).toBe(options[1].id);
    fireEvent.keyDown(listbox, { key: "ArrowDown" });
    expect(document.activeElement).toBe(options[2]);
  });

  it("ArrowUp moves focus to the previous row", () => {
    const files = [makeFile("/a.dwg"), makeFile("/b.pdf")];
    render(
      <Providers>
        <Sidebar files={files} selectedPath="/b.pdf" onSelect={() => undefined} onRemove={() => undefined} />
      </Providers>,
    );
    const listbox = getListbox();
    const options = getOptions();
    // Put focus on the listbox container first (the roving tabindex host);
    // aria-activedescendant tracks which option is "logically" selected
    // based on focusedIndex state, initialised to the selectedPath's index.
    listbox.focus();
    expect(listbox.getAttribute("aria-activedescendant")).toBe(options[1].id);
    fireEvent.keyDown(listbox, { key: "ArrowUp" });
    expect(document.activeElement).toBe(options[0]);
    expect(listbox.getAttribute("aria-activedescendant")).toBe(options[0].id);
  });

  it("Home jumps to the first row and End jumps to the last", () => {
    const files = [makeFile("/a.dwg"), makeFile("/b.pdf"), makeFile("/c.md")];
    render(
      <Providers>
        <Sidebar files={files} selectedPath={null} onSelect={() => undefined} onRemove={() => undefined} />
      </Providers>,
    );
    const listbox = getListbox();
    const options = getOptions();
    fireEvent.keyDown(listbox, { key: "End" });
    expect(document.activeElement).toBe(options[2]);
    fireEvent.keyDown(listbox, { key: "Home" });
    expect(document.activeElement).toBe(options[0]);
  });

  it("ArrowDown wraps around from the last row to the first", () => {
    const files = [makeFile("/a.dwg"), makeFile("/b.pdf")];
    render(
      <Providers>
        <Sidebar files={files} selectedPath={null} onSelect={() => undefined} onRemove={() => undefined} />
      </Providers>,
    );
    const listbox = getListbox();
    const options = getOptions();
    fireEvent.keyDown(listbox, { key: "End" });
    expect(document.activeElement).toBe(options[1]);
    fireEvent.keyDown(listbox, { key: "ArrowDown" });
    expect(document.activeElement).toBe(options[0]);
  });

  it("Enter on the focused row dispatches onSelect with that file", () => {
    const files = [makeFile("/a.dwg"), makeFile("/b.pdf")];
    let selectedPath: string | null = null;
    render(
      <Providers>
        <Sidebar files={files} selectedPath={selectedPath} onSelect={(f) => { selectedPath = f.path; }} onRemove={() => undefined} />
      </Providers>,
    );
    const listbox = getListbox();
    fireEvent.keyDown(listbox, { key: "ArrowDown" });
    fireEvent.keyDown(listbox, { key: "Enter" });
    expect(selectedPath).toBe("/b.pdf");
  });

  it("Space on the focused row also dispatches onSelect", () => {
    const files = [makeFile("/a.dwg"), makeFile("/b.pdf")];
    let selectedPath: string | null = null;
    render(
      <Providers>
        <Sidebar files={files} selectedPath={selectedPath} onSelect={(f) => { selectedPath = f.path; }} onRemove={() => undefined} />
      </Providers>,
    );
    const listbox = getListbox();
    fireEvent.keyDown(listbox, { key: "ArrowDown" });
    fireEvent.keyDown(listbox, { key: " " });
    expect(selectedPath).toBe("/b.pdf");
  });

  it("renders an aria-live region announcing the focused row", () => {
    const files = [makeFile("/a.dwg"), makeFile("/b.pdf")];
    render(
      <Providers>
        <Sidebar files={files} selectedPath={null} onSelect={() => undefined} onRemove={() => undefined} />
      </Providers>,
    );
    const liveRegions = Array.from(document.querySelectorAll('[aria-live="polite"]'));
    const announce = liveRegions.find((node) => /a\.dwg|position|1 of 2|2 of 2/.test(node.textContent ?? ""));
    expect(announce).toBeTruthy();
  });

  it("does not steal the onRemove handler — the remove button stays clickable", () => {
    const files = [makeFile("/a.dwg")];
    const onRemove = (f: FileInfo) => { removed = f.path; };
    let removed: string | null = null;
    render(
      <Providers>
        <Sidebar files={files} selectedPath={null} onSelect={() => undefined} onRemove={onRemove} />
      </Providers>,
    );
    const removeBtn = document.querySelector(".recent-remove") as HTMLButtonElement;
    expect(removeBtn).toBeTruthy();
    fireEvent.click(removeBtn);
    expect(removed).toBe("/a.dwg");
  });

  it("renders the empty state with the listbox present but not interactive", () => {
    render(
      <Providers>
        <Sidebar files={[]} selectedPath={null} onSelect={() => undefined} onRemove={() => undefined} />
      </Providers>,
    );
      // The listbox role is preserved (so aria-label + aria-activedescendant
      // infrastructure stays consistent), but tabIndex is -1 so the empty
      // container can't capture keyboard focus.
      const listbox = document.querySelector('[role="listbox"]');
      expect(listbox).toBeTruthy();
      expect(listbox?.getAttribute("tabindex")).toBe("-1");
      const empty = document.querySelector(".sidebar-empty");
      expect(empty).toBeTruthy();
      // The empty state surfaces its own label (sidebarEmptyA11y) so screen
      // readers describe "recent list is empty" instead of just "recent list".
      expect(empty?.getAttribute("aria-label")).toBeTruthy();
    });
});

describe("Sidebar empty-state CTA (PR #172)", () => {
  it("auto-focuses the Browse button on mount when the recents list is empty", async () => {
    const onOpenDialog = () => undefined;
    render(
      <Providers>
        <Sidebar
          files={[]}
          selectedPath={null}
          onSelect={() => undefined}
          onRemove={() => undefined}
          onOpenDialog={onOpenDialog}
        />
      </Providers>,
    );
    // Wait for the rAF scheduled inside the auto-focus effect to flush.
    await new Promise((resolve) => requestAnimationFrame(() => resolve()));
    const button = document.querySelector(".sidebar-empty-browse") as HTMLButtonElement;
    expect(button).toBeTruthy();
    expect(document.activeElement).toBe(button);
  });

  it("does NOT steal focus when there are recents (auto-focus is empty-state only)", () => {
    const onOpenDialog = () => undefined;
    const files = [makeFile("/a.txt"), makeFile("/b.md")];
    render(
      <Providers>
        <Sidebar
          files={files}
          selectedPath="/a.txt"
          onSelect={() => undefined}
          onRemove={() => undefined}
          onOpenDialog={onOpenDialog}
        />
      </Providers>,
    );
    // With recents present, no element should be auto-focused to a browse button.
    const browse = document.querySelector(".sidebar-empty-browse");
    expect(browse).toBeNull();
  });

  it("renders a visible Enter shortcut chip so keyboard users see the affordance", () => {
    const onOpenDialog = () => undefined;
    render(
      <Providers>
        <Sidebar
          files={[]}
          selectedPath={null}
          onSelect={() => undefined}
          onRemove={() => undefined}
          onOpenDialog={onOpenDialog}
        />
      </Providers>,
    );
    const kbd = document.querySelector(".sidebar-empty-browse-kbd") as HTMLElement;
    expect(kbd).toBeTruthy();
    expect(kbd.tagName.toLowerCase()).toBe("kbd");
    expect(kbd.textContent).toBe("Enter");
  });

  it("clicking the Browse button fires onOpenDialog", async () => {
    let opened = false;
    const onOpenDialog = () => { opened = true; };
    render(
      <Providers>
        <Sidebar
          files={[]}
          selectedPath={null}
          onSelect={() => undefined}
          onRemove={() => undefined}
          onOpenDialog={onOpenDialog}
        />
      </Providers>,
    );
    await new Promise((resolve) => requestAnimationFrame(() => resolve()));
    const button = document.querySelector(".sidebar-empty-browse") as HTMLButtonElement;
    fireEvent.click(button);
    expect(opened).toBe(true);
  });

  it("wraps the empty card with role=group so screen readers treat it as a landmark", () => {
    const onOpenDialog = () => undefined;
    render(
      <Providers>
        <Sidebar
          files={[]}
          selectedPath={null}
          onSelect={() => undefined}
          onRemove={() => undefined}
          onOpenDialog={onOpenDialog}
        />
      </Providers>,
    );
    const empty = document.querySelector(".sidebar-empty") as HTMLElement;
    expect(empty.getAttribute("role")).toBe("group");
  });
});