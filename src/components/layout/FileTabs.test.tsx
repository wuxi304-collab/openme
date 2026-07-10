import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import FileTabs from "./FileTabs";
import { I18nProvider } from "../../i18n";

// @vitest-environment jsdom

afterEach(() => {
  cleanup();
  try {
    window.localStorage.removeItem("openme.lang");
  } catch {}
});

beforeEach(() => {
  try {
    window.localStorage.removeItem("openme.lang");
  } catch {}
});

function renderInProviders(ui) {
  return render(<I18nProvider>{ui}</I18nProvider>);
}

function makeTab(id, name, overrides = {}) {
  return {
    id,
    name,
    path: "C:/demo/" + name,
    extension: name.split(".").pop() || "",
    content: "",
    size: 0,
    isDirty: false,
    sourceFile: null,
    category: "text",
    ...overrides,
  };
}

function mockDataTransfer() {
  return {
    effectAllowed: "",
    dropEffect: "",
    files: [],
    items: [],
    types: [],
    setData: vi.fn(),
    getData: vi.fn(),
    clearData: vi.fn(),
    setDragImage: vi.fn(),
  };
}

describe("FileTabs", () => {
  it("renders nothing when there are no tabs", () => {
    const { container } = renderInProviders(
      <FileTabs
        tabs={[]}
        activeId={null}
        onSelect={() => {}}
        onClose={() => {}}
        onReorder={() => {}}
      />
    );
    expect(container.querySelector(".file-tabs")).toBeNull();
  });

  it("renders one tab per FileTabState with role=tab and aria-selected", () => {
    const tabs = [
      makeTab("a", "alpha.txt"),
      makeTab("b", "beta.json", { isDirty: true }),
    ];
    renderInProviders(
      <FileTabs
        tabs={tabs}
        activeId="a"
        onSelect={() => {}}
        onClose={() => {}}
        onReorder={() => {}}
      />
    );
    const tabButtons = screen.getAllByRole("tab");
    expect(tabButtons).toHaveLength(2);
    expect(tabButtons[0].getAttribute("aria-selected")).toBe("true");
    expect(tabButtons[1].getAttribute("aria-selected")).toBe("false");
    expect(screen.getByLabelText("\u672a\u4fdd\u5b58")).toBeTruthy();
  });

  it("uses roving tabindex so only the active tab is in the tab order", () => {
    const tabs = [makeTab("a", "alpha.txt"), makeTab("b", "beta.json")];
    renderInProviders(
      <FileTabs
        tabs={tabs}
        activeId="b"
        onSelect={() => {}}
        onClose={() => {}}
        onReorder={() => {}}
      />
    );
    const tabButtons = screen.getAllByRole("tab");
    expect(tabButtons[0].tabIndex).toBe(-1);
    expect(tabButtons[1].tabIndex).toBe(0);
  });

  it("calls onSelect when the tab body is clicked", () => {
    const onSelect = vi.fn();
    const tabs = [makeTab("a", "alpha.txt"), makeTab("b", "beta.json")];
    renderInProviders(
      <FileTabs
        tabs={tabs}
        activeId="a"
        onSelect={onSelect}
        onClose={() => {}}
        onReorder={() => {}}
      />
    );
    fireEvent.click(screen.getAllByRole("tab")[1]);
    expect(onSelect).toHaveBeenCalledWith("b");
  });

  it("calls onClose when the close button is clicked", () => {
    const onClose = vi.fn();
    const tabs = [makeTab("a", "alpha.txt"), makeTab("b", "beta.json")];
    renderInProviders(
      <FileTabs
        tabs={tabs}
        activeId="a"
        onSelect={() => {}}
        onClose={onClose}
        onReorder={() => {}}
      />
    );
    const closeButtons = document.querySelectorAll(".tab-close");
    fireEvent.click(closeButtons[1]);
    expect(onClose).toHaveBeenCalledWith("b");
  });

  it("calls onClose when the tab body is middle-clicked", () => {
    const onClose = vi.fn();
    const tabs = [makeTab("a", "alpha.txt"), makeTab("b", "beta.json")];
    renderInProviders(
      <FileTabs
        tabs={tabs}
        activeId="a"
        onSelect={() => {}}
        onClose={onClose}
        onReorder={() => {}}
      />
    );
    fireEvent(
      screen.getAllByRole("tab")[1],
      new MouseEvent("auxclick", { bubbles: true, button: 1 })
    );
    expect(onClose).toHaveBeenCalledWith("b");
  });

  it("ignores auxclick when button is not the middle button", () => {
    const onClose = vi.fn();
    const tabs = [makeTab("a", "alpha.txt"), makeTab("b", "beta.json")];
    renderInProviders(
      <FileTabs
        tabs={tabs}
        activeId="a"
        onSelect={() => {}}
        onClose={onClose}
        onReorder={() => {}}
      />
    );
    fireEvent(
      screen.getAllByRole("tab")[1],
      new MouseEvent("auxclick", { bubbles: true, button: 2 })
    );
    expect(onClose).not.toHaveBeenCalled();
  });

  it("calls onReorder when a tab is dropped onto another tab (jsdom)", () => {
    // jsdom gives every element rect.width = 0 and DragEvent does not
    // honour clientX, so the dragover heuristic computes edge="after"
    // and toIndex = targetIndex + 1.  App then adjusts that down by 1
    // when toIndex > fromIndex.  We assert the final (from, to) pair
    // produced by that pathway rather than rely on coordinates.
    const onReorder = vi.fn();
    const tabs = [
      makeTab("a", "alpha.txt"),
      makeTab("b", "beta.json"),
      makeTab("c", "gamma.md"),
    ];
    const { container } = renderInProviders(
      <FileTabs
        tabs={tabs}
        activeId="a"
        onSelect={() => {}}
        onClose={() => {}}
        onReorder={onReorder}
      />
    );
    const tabNodes = container.querySelectorAll(".file-tab");
    const dt = mockDataTransfer();
    fireEvent.dragStart(tabNodes[0], { dataTransfer: dt });
    fireEvent.dragOver(tabNodes[2], { dataTransfer: dt });
    fireEvent.drop(tabNodes[2], { dataTransfer: dt });
    fireEvent.dragEnd(tabNodes[0], { dataTransfer: dt });
    expect(onReorder).toHaveBeenCalledTimes(1);
    // Dragging a (index 0) onto c (index 2). Drop resolves to
    // edge="after" -> raw toIndex = 3; since 3 > 0 we subtract 1 -> 2.
    expect(onReorder).toHaveBeenCalledWith(0, 2);
  });

  it("does not call onReorder when a tab is dropped onto itself", () => {
    const onReorder = vi.fn();
    const tabs = [makeTab("a", "alpha.txt"), makeTab("b", "beta.json")];
    const { container } = renderInProviders(
      <FileTabs
        tabs={tabs}
        activeId="a"
        onSelect={() => {}}
        onClose={() => {}}
        onReorder={onReorder}
      />
    );
    const tabNodes = container.querySelectorAll(".file-tab");
    const dt = mockDataTransfer();
    fireEvent.dragStart(tabNodes[0], { dataTransfer: dt });
    fireEvent.dragOver(tabNodes[0], { dataTransfer: dt });
    fireEvent.drop(tabNodes[0], { dataTransfer: dt });
    fireEvent.dragEnd(tabNodes[0], { dataTransfer: dt });
    expect(onReorder).not.toHaveBeenCalled();
  });

  it("Ctrl+ArrowLeft moves the focused tab one slot left", () => {
    const onReorder = vi.fn();
    const tabs = [
      makeTab("a", "alpha.txt"),
      makeTab("b", "beta.json"),
      makeTab("c", "gamma.md"),
    ];
    renderInProviders(
      <FileTabs
        tabs={tabs}
        activeId="b"
        onSelect={() => {}}
        onClose={() => {}}
        onReorder={onReorder}
      />
    );
    const tabButtons = screen.getAllByRole("tab");
    fireEvent.keyDown(tabButtons[1], { key: "ArrowLeft", ctrlKey: true });
    expect(onReorder).toHaveBeenCalledWith(1, 0);
  });

  it("Ctrl+ArrowRight moves the focused tab one slot right", () => {
    const onReorder = vi.fn();
    const tabs = [
      makeTab("a", "alpha.txt"),
      makeTab("b", "beta.json"),
      makeTab("c", "gamma.md"),
    ];
    renderInProviders(
      <FileTabs
        tabs={tabs}
        activeId="a"
        onSelect={() => {}}
        onClose={() => {}}
        onReorder={onReorder}
      />
    );
    const tabButtons = screen.getAllByRole("tab");
    fireEvent.keyDown(tabButtons[0], { key: "ArrowRight", ctrlKey: true });
    expect(onReorder).toHaveBeenCalledWith(0, 2);
  });

  it("plain ArrowRight cycles focus without reordering", () => {
    const onReorder = vi.fn();
    const onSelect = vi.fn();
    const tabs = [makeTab("a", "alpha.txt"), makeTab("b", "beta.json")];
    renderInProviders(
      <FileTabs
        tabs={tabs}
        activeId="a"
        onSelect={onSelect}
        onClose={() => {}}
        onReorder={onReorder}
      />
    );
    fireEvent.keyDown(screen.getAllByRole("tab")[0], { key: "ArrowRight" });
    expect(onReorder).not.toHaveBeenCalled();
    expect(onSelect).toHaveBeenCalledWith("b");
  });

  it("exposes an aria-describedby hint about drag and keyboard reorder", () => {
    const tabs = [makeTab("a", "alpha.txt")];
    renderInProviders(
      <FileTabs
        tabs={tabs}
        activeId="a"
        onSelect={() => {}}
        onClose={() => {}}
        onReorder={() => {}}
      />
    );
    const list = document.querySelector('[role="tablist"]');
    expect(list?.getAttribute("aria-describedby")).toBe(
      "file-tabs-reorder-hint"
    );
    expect(
      document.getElementById("file-tabs-reorder-hint")?.textContent || ""
    ).toMatch(/drag|Ctrl/);
  });
});
