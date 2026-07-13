import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
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
      onOpenDialog={() => {}}
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
      onOpenDialog={() => {}}
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
      onOpenDialog={() => {}}
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
      onOpenDialog={() => {}}
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
      onOpenDialog={() => {}}
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
      onOpenDialog={() => {}}
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
      onOpenDialog={() => {}}
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
        onOpenDialog={() => {}}
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
        onOpenDialog={() => {}}
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

      // PR #169 — drag-reorder announces the final landing position so screen-
      // reader / voice-control users get the same feedback as keyboard reorders.
      // The keyboard path uses tabMovedLeft/RightAnnounce; the drag path now uses
      // tabDroppedAnnounce with the post-reorder position + total count.
      describe("drag-reorder announcement (PR #169)", () => {
        function liveRegion() {
          const node = document.querySelector(".file-tabs [role='status'][aria-live='polite']");
          return node?.textContent ?? "";
        }

        it("announces the new position when a tab is dropped on a later tab", () => {
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
              onOpenDialog={() => {}}
            />
          );
          const tabNodes = container.querySelectorAll(".file-tab");
          const dt = mockDataTransfer();
          fireEvent.dragStart(tabNodes[0], { dataTransfer: dt });
          fireEvent.dragOver(tabNodes[2], { dataTransfer: dt });
          fireEvent.drop(tabNodes[2], { dataTransfer: dt });
          fireEvent.dragEnd(tabNodes[0], { dataTransfer: dt });
          expect(onReorder).toHaveBeenCalledWith(0, 2);
          // alpha.txt was dragged from index 0 and lands at index 2 (1-based: 3 of 3).
          expect(liveRegion()).toMatch(/alpha\.txt/);
          expect(liveRegion()).toMatch(/3\s*\/\s*3|position\s+3\s+of\s+3/);
        });

        it("does not announce when a tab is dropped onto itself", () => {
          const onReorder = vi.fn();
          const tabs = [makeTab("a", "alpha.txt"), makeTab("b", "beta.json")];
          const { container } = renderInProviders(
            <FileTabs
              tabs={tabs}
              activeId="a"
              onSelect={() => {}}
              onClose={() => {}}
              onReorder={onReorder}
              onOpenDialog={() => {}}
            />
          );
          const tabNodes = container.querySelectorAll(".file-tab");
          const dt = mockDataTransfer();
          fireEvent.dragStart(tabNodes[0], { dataTransfer: dt });
          fireEvent.dragOver(tabNodes[0], { dataTransfer: dt });
          fireEvent.drop(tabNodes[0], { dataTransfer: dt });
          fireEvent.dragEnd(tabNodes[0], { dataTransfer: dt });
          expect(onReorder).not.toHaveBeenCalled();
          expect(liveRegion()).toBe("");
        });

        it("announces the new position when a tab is dropped on an earlier tab", () => {
          const onReorder = vi.fn();
          const tabs = [
            makeTab("a", "alpha.txt"),
            makeTab("b", "beta.json"),
            makeTab("c", "gamma.md"),
          ];
          const { container } = renderInProviders(
            <FileTabs
              tabs={tabs}
              activeId="c"
              onSelect={() => {}}
              onClose={() => {}}
              onReorder={onReorder}
              onOpenDialog={() => {}}
            />
          );
          const tabNodes = container.querySelectorAll(".file-tab");
          const dt = mockDataTransfer();
          // Drag c (index 2) onto a (index 0). With jsdom rect.width = 0 the
          // midpoint comparison resolves to "after" (raw toIndex = 1) because
          // clientX (0) is not strictly less than midpoint (0). After the
          // shift adjustment the final landing position is index 1 (1-based: 2 of 3).
          fireEvent.dragStart(tabNodes[2], { dataTransfer: dt });
          fireEvent.dragOver(tabNodes[0], { dataTransfer: dt });
          fireEvent.drop(tabNodes[0], { dataTransfer: dt });
          fireEvent.dragEnd(tabNodes[2], { dataTransfer: dt });
          expect(onReorder).toHaveBeenCalledWith(2, 1);
          expect(liveRegion()).toMatch(/gamma\.md/);
          // gamma.md moved from position 3 to position 2 of 3.
          expect(liveRegion()).toMatch(/2\s*\/\s*3|position\s+2\s+of\s+3/);
        });

        it("announces in English when the locale is en", () => {
          try { window.localStorage.setItem("openme.lang", "en"); } catch {}
          const onReorder = vi.fn();
          const tabs = [
            makeTab("a", "alpha.txt"),
            makeTab("b", "beta.json"),
          ];
          const { container } = renderInProviders(
            <FileTabs
              tabs={tabs}
              activeId="a"
              onSelect={() => {}}
              onClose={() => {}}
              onReorder={onReorder}
              onOpenDialog={() => {}}
            />
          );
          const tabNodes = container.querySelectorAll(".file-tab");
          const dt = mockDataTransfer();
          fireEvent.dragStart(tabNodes[0], { dataTransfer: dt });
          fireEvent.dragOver(tabNodes[1], { dataTransfer: dt });
          fireEvent.drop(tabNodes[1], { dataTransfer: dt });
          fireEvent.dragEnd(tabNodes[0], { dataTransfer: dt });
          // alpha.txt from index 0 drops to index 1 (last slot, 1-based: 2 of 2).
          expect(liveRegion()).toMatch(/Dropped\s+alpha\.txt\s+at\s+position\s+2\s+of\s+2/);
        });
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
        onOpenDialog={() => {}}
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
        onOpenDialog={() => {}}
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
        onOpenDialog={() => {}}
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
      onOpenDialog={() => {}}
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

    // PR #165 — loading / error state indicators
    it("renders a spinner and aria-busy on tabs whose isLoading is true", () => {
      const tabs = [
        makeTab("a", "alpha.txt", { isLoading: true }),
        makeTab("b", "beta.json"),
      ];
      renderInProviders(
        <FileTabs
          tabs={tabs}
          activeId="a"
          onSelect={() => {}}
          onClose={() => {}}
          onReorder={() => {}}
        onOpenDialog={() => {}}
        />
      );
      const tabButtons = screen.getAllByRole("tab");
      expect(tabButtons[0].getAttribute("aria-busy")).toBe("true");
      expect(tabButtons[1].hasAttribute("aria-busy")).toBe(false);
      expect(tabButtons[0].querySelector(".tab-loading-spinner")).toBeTruthy();
      expect(tabButtons[1].querySelector(".tab-loading-spinner")).toBeNull();
      // aria-label includes the loading suffix so SR users hear the state
      expect(tabButtons[0].getAttribute("aria-label")).toMatch(/\(loading\)|（正在加载）/);
    });

    it("renders an error mark and aria-invalid on tabs whose error is set", () => {
      const tabs = [
        makeTab("a", "alpha.txt"),
        makeTab("b", "beta.json", { error: "decode failed" }),
      ];
      renderInProviders(
        <FileTabs
          tabs={tabs}
          activeId="a"
          onSelect={() => {}}
          onClose={() => {}}
          onReorder={() => {}}
        onOpenDialog={() => {}}
        />
      );
      const tabButtons = screen.getAllByRole("tab");
      expect(tabButtons[1].getAttribute("aria-invalid")).toBe("true");
      expect(tabButtons[0].hasAttribute("aria-invalid")).toBe(false);
      expect(tabButtons[1].querySelector(".tab-error-mark")).toBeTruthy();
      expect(tabButtons[0].querySelector(".tab-error-mark")).toBeNull();
      // aria-label includes the load-failed suffix
      expect(tabButtons[1].getAttribute("aria-label")).toMatch(/\(load failed\)|（加载失败）/);
    });

    it("adds is-loading / is-error class modifiers on the tab container", () => {
      const tabs = [
        makeTab("a", "alpha.txt", { isLoading: true }),
        makeTab("b", "beta.json", { error: "boom" }),
        makeTab("c", "gamma.md"),
      ];
      const { container } = renderInProviders(
        <FileTabs
          tabs={tabs}
          activeId="c"
          onSelect={() => {}}
          onClose={() => {}}
          onReorder={() => {}}
        onOpenDialog={() => {}}
        />
      );
      const tabNodes = container.querySelectorAll(".file-tab");
      expect(tabNodes[0].classList.contains("is-loading")).toBe(true);
      expect(tabNodes[1].classList.contains("is-error")).toBe(true);
      expect(tabNodes[2].classList.contains("is-loading")).toBe(false);
      expect(tabNodes[2].classList.contains("is-error")).toBe(false);
    });

    it("error mark carries an aria-label naming the failing file", () => {
      const tabs = [makeTab("a", "alpha.txt", { error: "boom" })];
      renderInProviders(
        <FileTabs
          tabs={tabs}
          activeId="a"
          onSelect={() => {}}
          onClose={() => {}}
          onReorder={() => {}}
        onOpenDialog={() => {}}
        />
      );
      const errorMark = document.querySelector(".tab-error-mark");
      expect(errorMark?.getAttribute("aria-label") ?? "").toMatch(/alpha\.txt/);
    });

        it("error mark opens a Tooltip body on hover (PR #179 migration)", async () => {
          const tabs = [makeTab("a", "alpha.txt", { error: "boom" })];
          localStorage.setItem("openme.lang", "en");
          renderInProviders(
            <FileTabs
              tabs={tabs}
              activeId="a"
              onSelect={() => {}}
              onClose={() => {}}
              onReorder={() => {}}
              onOpenDialog={() => {}}
            />
          );
          const errorMark = document.querySelector(".tab-error-mark") as HTMLElement;
          expect(errorMark).toBeTruthy();
          expect(errorMark.getAttribute("title") ?? "").toBe("");
          vi.useFakeTimers();
          await act(async () => {
            fireEvent.mouseEnter(errorMark);
            vi.runAllTimers();
          });
          const describedBy = errorMark.getAttribute("aria-describedby");
          expect(describedBy).toBeTruthy();
          const body = document.getElementById(describedBy!);
          expect(body?.textContent).toBe("Error");
          vi.useRealTimers();
        });
      });

        describe("open-file button (PR #175)", () => {
          it("renders a '+' button next to the tab strip when tabs exist", () => {
            const tabs = [makeTab("a", "alpha.txt")];
            renderInProviders(
              <FileTabs
                tabs={tabs}
                activeId="a"
                onSelect={() => {}}
                onClose={() => {}}
                onReorder={() => {}}
                onOpenDialog={() => {}}
              />
            );
            const btn = document.querySelector(".file-tabs-open-button");
            expect(btn).not.toBeNull();
            expect(btn?.tagName).toBe("BUTTON");
          });

          it("does not render the '+' button when there are no tabs", () => {
            renderInProviders(
              <FileTabs
                tabs={[]}
                activeId={null}
                onSelect={() => {}}
                onClose={() => {}}
                onReorder={() => {}}
                onOpenDialog={() => {}}
              />
            );
            const btn = document.querySelector(".file-tabs-open-button");
            expect(btn).toBeNull();
          });

          it("invokes onOpenDialog when the '+' button is clicked", () => {
            const onOpenDialog = vi.fn();
            const tabs = [makeTab("a", "alpha.txt")];
            renderInProviders(
              <FileTabs
                tabs={tabs}
                activeId="a"
                onSelect={() => {}}
                onClose={() => {}}
                onReorder={() => {}}
                onOpenDialog={onOpenDialog}
              />
            );
            const btn = document.querySelector(".file-tabs-open-button");
            expect(btn).not.toBeNull();
            fireEvent.click(btn!);
            expect(onOpenDialog).toHaveBeenCalledTimes(1);
          });

          it("gives the '+' button an accessible aria-label (Chinese)", () => {
            const tabs = [makeTab("a", "alpha.txt")];
            renderInProviders(
              <FileTabs
                tabs={tabs}
                activeId="a"
                onSelect={() => {}}
                onClose={() => {}}
                onReorder={() => {}}
                onOpenDialog={() => {}}
              />
            );
            const btn = document.querySelector(".file-tabs-open-button");
            expect(btn).not.toBeNull();
            const aria = btn!.getAttribute("aria-label") ?? "";
            expect(aria.length).toBeGreaterThan(0);
            // Chinese locale — should contain a non-ASCII character (CJK)
            expect(aria).toMatch(/[\u4e00-\u9fff]/);
          });

          it("opens a Tooltip body on hover (PR #179 migration)", async () => {
                      // PR #179 replaced the native title= with the custom Tooltip
                      // component. Verify the trigger no longer has a title attribute
                      // and instead wires up aria-describedby when hovered.
                      const tabs = [makeTab("a", "alpha.txt")];
                      localStorage.setItem("openme.lang", "en");
                      renderInProviders(
                        <FileTabs
                          tabs={tabs}
                          activeId="a"
                          onSelect={() => {}}
                          onClose={() => {}}
                          onReorder={() => {}}
                          onOpenDialog={() => {}}
                        />
                      );
                      const btn = document.querySelector(".file-tabs-open-button") as HTMLButtonElement | null;
                      expect(btn).toBeTruthy();
                      expect(btn!.getAttribute("title") ?? "").toBe("");
                      vi.useFakeTimers();
                      await act(async () => {
                        fireEvent.mouseEnter(btn!);
                        vi.runAllTimers();
                      });
                      const describedBy = btn!.getAttribute("aria-describedby");
                      expect(describedBy).toBeTruthy();
                      const body = document.getElementById(describedBy!);
                      expect(body?.textContent).toBe("Open another file (Ctrl+O)");
                      vi.useRealTimers();
                    });
        });
