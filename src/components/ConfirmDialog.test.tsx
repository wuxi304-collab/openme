// @vitest-environment jsdom
import { afterEach, describe, it, expect, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import ConfirmDialog, { type ConfirmDialogState } from "./ConfirmDialog";
import { I18nProvider } from "../i18n";

function renderDialog(state: ConfirmDialogState | null, onResolve = vi.fn()) {
  return render(
    <I18nProvider>
      <ConfirmDialog state={state} onResolve={onResolve} />
    </I18nProvider>
  );
}

const baseState: ConfirmDialogState = {
  id: 1,
  title: "Confirm",
  message: "Are you sure?",
  confirmLabel: "Yes",
  cancelLabel: "No",
  variant: "default",
  resolve: vi.fn(),
};

describe("ConfirmDialog", () => {
  afterEach(() => {
    cleanup();
  });
  it("renders nothing when state is null", () => {
    const { container } = renderDialog(null);
    expect(container.querySelector(".confirm-dialog-overlay")).toBeNull();
  });

  it("renders title and message when open", () => {
    renderDialog(baseState);
      expect(screen.getByRole("dialog", { name: "Confirm" })).toBeTruthy();
      expect(screen.getByText("Are you sure?")).toBeTruthy();
      expect(screen.getByRole("button", { name: "Yes" })).toBeTruthy();
      expect(screen.getByRole("button", { name: "No" })).toBeTruthy();
  });

  it("applies aria-modal and aria-describedby", () => {
    renderDialog(baseState);
    const dialog = screen.getByRole("dialog");
      expect(dialog.getAttribute("aria-modal")).toBe("true");
      expect(dialog.getAttribute("aria-describedby")).toBe("confirm-dialog-message");
  });

  it("cancel button resolves with false", () => {
    const onResolve = vi.fn();
    renderDialog(baseState, onResolve);
    fireEvent.click(screen.getByRole("button", { name: "No" }));
    expect(onResolve).toHaveBeenCalledWith(false);
  });

  it("confirm button resolves with true", () => {
    const onResolve = vi.fn();
    renderDialog(baseState, onResolve);
    fireEvent.click(screen.getByRole("button", { name: "Yes" }));
    expect(onResolve).toHaveBeenCalledWith(true);
  });

  it("Escape key resolves with false", () => {
    const onResolve = vi.fn();
    renderDialog(baseState, onResolve);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onResolve).toHaveBeenCalledWith(false);
  });

  it("overlay mouse-down resolves with false", () => {
    const onResolve = vi.fn();
    renderDialog(baseState, onResolve);
    const overlay = document.querySelector(".confirm-dialog-overlay") as HTMLElement;
    fireEvent.mouseDown(overlay);
    expect(onResolve).toHaveBeenCalledWith(false);
  });

  it("cancel button is focused by default on open", async () => {
    renderDialog(baseState);
    await new Promise((r) => requestAnimationFrame(() => r(null)));
      const cancel = screen.getByRole("button", { name: "No" });
      expect(document.activeElement).toBe(cancel);
    });

    it("applies danger variant class to confirm button", () => {
      const dangerState: ConfirmDialogState = { ...baseState, variant: "danger" };
      renderDialog(dangerState);
      const confirm = screen.getByRole("button", { name: "Yes" });
      expect(confirm.className).toContain("is-danger");
    });

    it("uses default variant class when not specified", () => {
      renderDialog(baseState);
      const confirm = screen.getByRole("button", { name: "Yes" });
      expect(confirm.className).not.toContain("is-danger");
    });
});