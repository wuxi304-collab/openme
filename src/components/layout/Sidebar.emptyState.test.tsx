// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { I18nProvider } from "../../i18n";
import Sidebar from "./Sidebar";

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});

function Providers({ children }: { children: React.ReactNode }) {
  return <I18nProvider>{children}</I18nProvider>;
}

describe("Sidebar actionable empty state", () => {
  beforeEach(() => {
    try { localStorage.setItem("openme.lang", "en"); } catch { /* noop */ }
  });

  it("hides the browse button when onOpenDialog is not provided", () => {
    render(
      <Providers>
        <Sidebar files={[]} selectedPath={null} onSelect={() => undefined} onRemove={() => undefined} />
      </Providers>,
    );
    expect(screen.queryByRole("button", { name: /Pick files/i })).toBeNull();
  });

  it("renders a localized 'Pick files' browse button when onOpenDialog is provided", () => {
    render(
      <Providers>
        <Sidebar files={[]} selectedPath={null} onSelect={() => undefined} onRemove={() => undefined} onOpenDialog={() => undefined} />
      </Providers>,
    );
    const btn = screen.getByRole("button", { name: /Pick files/i });
    expect(btn).toBeTruthy();
    expect(btn.getAttribute("type")).toBe("button");
  });

  it("invokes onOpenDialog when the browse button is clicked", () => {
    const handler = vi.fn();
    render(
      <Providers>
        <Sidebar files={[]} selectedPath={null} onSelect={() => undefined} onRemove={() => undefined} onOpenDialog={handler} />
      </Providers>,
    );
    fireEvent.click(screen.getByRole("button", { name: /Pick files/i }));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("renders the 'Or drop a file here' hint alongside the button", () => {
    render(
      <Providers>
        <Sidebar files={[]} selectedPath={null} onSelect={() => undefined} onRemove={() => undefined} onOpenDialog={() => undefined} />
      </Providers>,
    );
    expect(screen.getByText(/Or drop a file here/i)).toBeTruthy();
  });

  it("localizes the empty state into Chinese", () => {
    try { localStorage.setItem("openme.lang", "zh"); } catch { /* noop */ }
    render(
      <Providers>
        <Sidebar files={[]} selectedPath={null} onSelect={() => undefined} onRemove={() => undefined} onOpenDialog={() => undefined} />
      </Providers>,
    );
    expect(screen.getByRole("button", { name: "选择文件" })).toBeTruthy();
    expect(screen.getByText(/或者直接把文件拖到这里/)).toBeTruthy();
  });
});
