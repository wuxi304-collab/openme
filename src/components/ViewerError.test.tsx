// @vitest-environment jsdom
import { afterEach, describe, it, expect, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import ViewerError from "./ViewerError";
import { I18nProvider } from "../i18n";

function renderError(props: React.ComponentProps<typeof ViewerError>) {
  return render(
    <I18nProvider>
      <ViewerError {...props} />
    </I18nProvider>
  );
}

describe("ViewerError", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders title in a role=alert region", () => {
    renderError({ title: "Cannot preview" });
    const region = screen.getByRole("alert");
    expect(region.textContent).toContain("Cannot preview");
  });

  it("renders message body when provided", () => {
    renderError({ title: "Failed", message: "File is corrupt" });
    expect(screen.getByText("File is corrupt")).toBeTruthy();
  });

  it("renders badge when provided", () => {
    renderError({ title: "Failed", badge: "VIDEO" });
    expect(screen.getByText("VIDEO")).toBeTruthy();
  });

  it("renders caption (e.g. filename) when provided", () => {
    renderError({ title: "Failed", caption: "movie.mp4" });
    expect(screen.getByText("movie.mp4")).toBeTruthy();
  });

  it("renders action button when provided", () => {
    const onClick = vi.fn();
    renderError({ title: "Failed", action: { label: "Open externally", onClick } });
    fireEvent.click(screen.getByRole("button", { name: "Open externally" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

    it("renders a secondary action with the is-secondary modifier when provided", () => {
      const primary = vi.fn();
      const secondary = vi.fn();
      const { container } = renderError({
        title: "Failed",
        action: { label: "Open externally", onClick: primary },
        secondaryAction: { label: "Try anyway", onClick: secondary },
      });
      const secondaryBtn = screen.getByRole("button", { name: "Try anyway" });
      expect(secondaryBtn.className).toContain("is-secondary");
      expect(container.querySelector(".viewer-error-actions .btn-mario.is-secondary")).toBeTruthy();
      fireEvent.click(secondaryBtn);
      expect(secondary).toHaveBeenCalledTimes(1);
      expect(primary).not.toHaveBeenCalled();
    });

    it("hides the secondary action when only the primary is supplied", () => {
      renderError({ title: "Failed", action: { label: "Only primary", onClick: () => undefined } });
      expect(screen.queryByRole("button", { name: /try anyway/i })).toBeNull();
    });

    it("renders the action row only when at least one action is supplied", () => {
      const noAction = renderError({ title: "Nothing actionable" });
      expect(noAction.container.querySelector(".viewer-error-actions")).toBeNull();
      noAction.unmount();

      const onlySecondary = renderError({
        title: "Only secondary",
        secondaryAction: { label: "Retry probe", onClick: () => undefined },
      });
      expect(onlySecondary.container.querySelector(".viewer-error-actions")).toBeTruthy();
    });

    it("passes an aria-label through on the secondary action for screen readers", () => {
      renderError({
        title: "Failed",
        secondaryAction: { label: "Try anyway", ariaLabel: "Force built-in playback", onClick: () => undefined },
      });
      expect(screen.getByRole("button", { name: "Force built-in playback" })).toBeTruthy();
    });

  it("renders close button when onClose is provided, with localized aria-label", () => {
    const onClose = vi.fn();
    renderError({ title: "Failed", onClose, closeLabel: "Dismiss error" });
    fireEvent.click(screen.getByRole("button", { name: "Dismiss error" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not render close button when onClose is not provided", () => {
    renderError({ title: "Failed" });
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("renders custom children between message and action", () => {
    renderError({
      title: "Failed",
      message: "Top message",
      children: <span data-testid="extra">Hint content</span>,
      action: { label: "Retry", onClick: () => undefined },
    });
    expect(screen.getByTestId("extra")).toBeTruthy();
  });

  it("uses is-inline class for inline variant", () => {
    const { container } = renderError({ variant: "inline", title: "Inline err" });
    expect(container.querySelector(".viewer-error.is-inline")).toBeTruthy();
  });

  it("uses fullpage class (no is-inline) by default", () => {
    const { container } = renderError({ title: "Fullpage err" });
    expect(container.querySelector(".viewer-error.is-inline")).toBeNull();
    expect(container.querySelector(".viewer-error")).toBeTruthy();
  });

  it("uses aria-live=assertive for fullpage, polite for inline", () => {
    const full = renderError({ title: "A" });
    expect(full.container.querySelector('[role="alert"]')?.getAttribute("aria-live")).toBe("assertive");
    full.unmount();

    const inline = renderError({ variant: "inline", title: "B" });
    expect(inline.container.querySelector('[role="alert"]')?.getAttribute("aria-live")).toBe("polite");
  });

  it("supports className passthrough", () => {
    const { container } = renderError({ title: "X", className: "custom-error" });
    const root = container.querySelector(".viewer-error");
    expect(root?.className).toContain("custom-error");
  });
});