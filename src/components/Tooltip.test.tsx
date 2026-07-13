import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import Tooltip from "./Tooltip";

// @vitest-environment jsdom

afterEach(() => { cleanup(); vi.useRealTimers(); });

beforeEach(() => {
  Element.prototype.getBoundingClientRect = function () {
    return { top: 100, bottom: 120, left: 100, right: 200, width: 100, height: 20, x: 100, y: 100, toJSON() { return this; } } as DOMRect;
  };
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 1024 });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: 768 });
});

function renderWithTrigger(props = {}) {
  return render(<Tooltip content="hello world" {...props}><button type="button">trigger</button></Tooltip>);
}


describe("Tooltip", () => {
  it("does not open the tooltip body until the trigger is hovered", () => {
    renderWithTrigger();
    expect(document.querySelector(".is-open")).toBeNull();
  });

  it("opens after the configured delay on mouseenter", async () => {
    vi.useFakeTimers();
    renderWithTrigger({ delay: 200 });
    const btn = document.querySelector("button");
    await act(async () => {
      fireEvent.mouseEnter(btn);
      vi.advanceTimersByTime(200);
    });
    expect(document.querySelector(".is-open")).not.toBeNull();
  });

  it("opens after the same delay on focus (keyboard users)", async () => {
    vi.useFakeTimers();
    renderWithTrigger({ delay: 400 });
    const btn = document.querySelector("button");
    await act(async () => {
      btn.focus();
      vi.advanceTimersByTime(400);
    });
    expect(document.querySelector(".is-open")).not.toBeNull();
  });

  it("closes on mouseleave", async () => {
    vi.useFakeTimers();
    renderWithTrigger({ delay: 0 });
    const btn = document.querySelector("button");
    await act(async () => {
      fireEvent.mouseEnter(btn);
      vi.runAllTimers();
    });
    expect(document.querySelector(".is-open")).not.toBeNull();
    await act(async () => {
      fireEvent.mouseLeave(btn);
    });
    expect(document.querySelector(".is-open")).toBeNull();
  });

  it("closes on blur", async () => {
    vi.useFakeTimers();
    renderWithTrigger({ delay: 0 });
    const btn = document.querySelector("button");
    await act(async () => {
      btn.focus();
      vi.runAllTimers();
    });
    expect(document.querySelector(".is-open")).not.toBeNull();
    await act(async () => {
      btn.blur();
    });
    expect(document.querySelector(".is-open")).toBeNull();
  });

  it("closes on Escape", async () => {
    vi.useFakeTimers();
    renderWithTrigger({ delay: 0 });
    const btn = document.querySelector("button");
    await act(async () => {
      fireEvent.mouseEnter(btn);
      vi.runAllTimers();
    });
    expect(document.querySelector(".is-open")).not.toBeNull();
    await act(async () => {
      fireEvent.keyDown(document, { key: "Escape" });
    });
    expect(document.querySelector(".is-open")).toBeNull();
  });

  it("wires aria-describedby on the trigger only while open", async () => {
    vi.useFakeTimers();
    renderWithTrigger({ delay: 0 });
    const btn = document.querySelector("button");
    expect(btn.getAttribute("aria-describedby")).toBeNull();
    await act(async () => {
      fireEvent.mouseEnter(btn);
      vi.runAllTimers();
    });
    const tip = document.querySelector('[role="tooltip"]');
    expect(btn.getAttribute("aria-describedby")).toBe(tip.id);
    await act(async () => {
      fireEvent.mouseLeave(btn);
    });
    expect(btn.getAttribute("aria-describedby")).toBeNull();
  });

  it("renders the tooltip content from the content prop", async () => {
    vi.useFakeTimers();
    renderWithTrigger({ delay: 0, content: <span>shortcut: Ctrl+O</span> });
    const btn = document.querySelector("button");
    await act(async () => {
      fireEvent.mouseEnter(btn);
      vi.runAllTimers();
    });
    expect(document.body.textContent
).toContain("shortcut: Ctrl+O");
  });

  it("does not show when disabled", async () => {
    vi.useFakeTimers();
    renderWithTrigger({ delay: 0, disabled: true });
    const btn = document.querySelector("button");
    await act(async () => {
      fireEvent.mouseEnter(btn);
      vi.runAllTimers();
    });
    expect(document.querySelector(".is-open")).toBeNull();
  });

  it("forwards ref to the trigger element", () => {
    let captured = null;
    render(
      <Tooltip content="x">
        <button ref={(el) => { captured = el; }} type="button">trigger</button>
      </Tooltip>
    );
    expect(captured).not.toBeNull();
    expect(captured.tagName).toBe("BUTTON");
  });

  it("preserves user-provided onMouseEnter", () => {
    const user = vi.fn();
    render(
      <Tooltip content="x">
        <button type="button" onMouseEnter={user}>trigger</button>
      </Tooltip>
    );
    const btn = document.querySelector("button");
    fireEvent.mouseEnter(btn);
    expect(user).toHaveBeenCalledTimes(1);
  });
});
