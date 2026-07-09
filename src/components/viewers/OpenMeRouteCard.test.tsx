// @vitest-environment jsdom
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import OpenMeRouteCard from "./OpenMeRouteCard";
import { I18nProvider } from "../../i18n";
import type { FileTabState } from "../../types";

function buildTab(overrides: Partial<FileTabState> = {}): FileTabState {
  return {
    id: "tab-1",
    path: String.raw`C:\demo\hero.psd`,
    name: "hero.psd",
    category: "design",
    content: null,
    isDirty: false,
    isLoading: false,
    sourceFile: {
      path: String.raw`C:\demo\hero.psd`,
      name: "hero.psd",
      extension: ".psd",
      size: 1024,
      mimeType: "image/vnd.adobe.photoshop",
    },
    ...overrides,
  };
}

function renderCard(props: React.ComponentProps<typeof OpenMeRouteCard>) {
  return render(
    <I18nProvider>
      <OpenMeRouteCard {...props} />
    </I18nProvider>
  );
}

describe("OpenMeRouteCard retry button", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("hides the retry button when onRetry is not provided", () => {
    renderCard({
      tab: buildTab(),
      route: {} as any,
      title: "Cannot preview",
      description: "OpenMe opened as a local safety card.",
    });
    expect(screen.queryByRole("button", { name: /Retry|重新加载/ })).toBeNull();
  });

  it("renders the retry button when onRetry is provided and forwards clicks", () => {
    const onRetry = vi.fn();
    renderCard({
      tab: buildTab(),
      route: { hasExternalFallback: false } as any,
      title: "Cannot preview",
      description: "OpenMe opened as a local safety card.",
      onRetry,
    });
    // Pick whichever locale is active; the button label is localised by
    // useI18n() and tests run with the default zh dict.
    const button = screen.getByRole("button", { name: /重新加载|Retry/ });
    fireEvent.click(button);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("flips to the busy state and disables the button during retry", () => {
    vi.useFakeTimers();
    const onRetry = vi.fn();
    renderCard({
      tab: buildTab(),
      route: { hasExternalFallback: false } as any,
      title: "Cannot preview",
      description: "OpenMe opened as a local safety card.",
      onRetry,
    });
    const initial = screen.getByRole("button", { name: /重新加载|Retry/ });
    fireEvent.click(initial);
    // After click the busy copy takes over and the button is disabled.
        const busy = screen.getByRole("button", { name: /正在重新加载|Retrying/ }) as HTMLButtonElement;
        expect(busy.disabled).toBe(true);
    expect(busy.getAttribute("aria-busy")).toBe("true");
    // The auto-reset setTimeout (600ms) should have fired by now.
    vi.advanceTimersByTime(800);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("ignores extra clicks while the busy state is active", () => {
    vi.useFakeTimers();
    const onRetry = vi.fn();
    renderCard({
      tab: buildTab(),
      route: { hasExternalFallback: false } as any,
      title: "Cannot preview",
      description: "OpenMe opened as a local safety card.",
      onRetry,
    });
    const initial = screen.getByRole("button", { name: /重新加载|Retry/ });
    fireEvent.click(initial);
    const busy = screen.getByRole("button", { name: /正在重新加载|Retrying/ });
    fireEvent.click(busy);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("co-exists with the system fallback action and renders both buttons", () => {
    const onRetry = vi.fn();
    const openInSystem = vi.fn();
    (window as any).electronAPI = { openInSystem };
    renderCard({
      tab: buildTab(),
      route: { hasExternalFallback: true } as any,
      title: "Cannot preview",
      description: "OpenMe opened as a local safety card.",
      onRetry,
    });
    // Both buttons should be present, and neither should swallow the other.
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThanOrEqual(2);
    // Click the retry button — onRetry must fire, but openInSystem must NOT.
    fireEvent.click(screen.getByRole("button", { name: /重新加载|Retry/ }));
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(openInSystem).not.toHaveBeenCalled();
  });

  it("renders the action row even when onRetry is omitted, as long as hasExternalFallback is set", () => {
    const openInSystem = vi.fn();
    (window as any).electronAPI = { openInSystem };
    renderCard({
      tab: buildTab(),
      route: { hasExternalFallback: true } as any,
      title: "Cannot preview",
      description: "OpenMe opened as a local safety card.",
    });
    expect(screen.queryByRole("button", { name: /重新加载|Retry/ })).toBeNull();
    // At least one fallback button should still be present.
    expect(screen.getAllByRole("button").length).toBeGreaterThanOrEqual(1);
  });
});