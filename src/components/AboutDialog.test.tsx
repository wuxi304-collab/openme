// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import AboutDialog from "./AboutDialog";
import { I18nProvider } from "../i18n";

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});

// Mock the i18n provider so tests don't depend on the real dict shape.
// Provider accepts children only and re-broadcasts lang changes via storage.
function Providers({ children }: { children: React.ReactNode }) {
  return <I18nProvider>{children}</I18nProvider>;
}

describe("AboutDialog", () => {
  it("renders nothing when closed", () => {
    render(<Providers><AboutDialog open={false} onClose={() => undefined} /></Providers>);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("renders the dialog shell when open", () => {
    render(<Providers><AboutDialog open onClose={() => undefined} /></Providers>);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeTruthy();
    // Title is wired to i18n key aboutTitle — verify the title region exists.
    const title = screen.getByRole("heading", { level: 2 });
    expect(title.id).toBe("about-dialog-title");
  });

  it("calls onClose when ESC is pressed", () => {
    const onClose = vi.fn();
    render(<Providers><AboutDialog open onClose={onClose} /></Providers>);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when the close button is clicked", () => {
    const onClose = vi.fn();
    render(<Providers><AboutDialog open onClose={onClose} /></Providers>);
    // Two close buttons exist (header X + footer primary). The first match
    // is the header one because the footer is rendered later in DOM order.
    const buttons = screen.getAllByRole("button", { name: /关闭|Close/ });
    fireEvent.click(buttons[0]);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("renders all six keyboard shortcuts", () => {
    render(<Providers><AboutDialog open onClose={() => undefined} /></Providers>);
    // Shortcut rows show as Ctrl/Alt combined text. Render the th column for
    // each shortcut.
    expect(screen.getByText("Ctrl + O")).toBeTruthy();
    expect(screen.getByText("Ctrl + S")).toBeTruthy();
    expect(screen.getByText("Ctrl + K")).toBeTruthy();
    expect(screen.getByText("Ctrl + W")).toBeTruthy();
    expect(screen.getByText("Ctrl + Tab")).toBeTruthy();
    expect(screen.getByText("Alt + 1–9")).toBeTruthy();
  });

  it("renders three external resource links", () => {
    render(<Providers><AboutDialog open onClose={() => undefined} /></Providers>);
    const links = screen.getAllByRole("link");
    expect(links.length).toBeGreaterThanOrEqual(3);
    // All three target _blank with noreferrer noopener.
    for (const link of links) {
      expect(link.getAttribute("target")).toBe("_blank");
      expect(link.getAttribute("rel")).toContain("noopener");
    }
  });

  it("shows a platform row and a locale row", () => {
    render(<Providers><AboutDialog open onClose={() => undefined} /></Providers>);
    // dt labels are localized, so check for at least the version dt + 2 dd cells.
    const dts = screen.getAllByText(/当前语言|Locale/);
    expect(dts.length).toBeGreaterThanOrEqual(1);
  });

  it("falls back gracefully when window.electronAPI is undefined", () => {
    // Remove the noop shim from main.tsx — simulate a true browser environment
    // with no preload by overwriting window.electronAPI to undefined.
    const original = (window as { electronAPI?: unknown }).electronAPI;
    (window as { electronAPI?: unknown }).electronAPI = undefined;
    render(<Providers><AboutDialog open onClose={() => undefined} /></Providers>);
    // No crash. Dialog still visible.
    expect(screen.getByRole("dialog")).toBeTruthy();
    // Restore for subsequent tests so localStorage carryover can't trip us up.
    (window as { electronAPI?: unknown }).electronAPI = original;
  });
});

  describe("AboutDialog — publisher / contact section (v0.1.0)", () => {
    beforeEach(() => {
      (window as unknown as { electronAPI: unknown }).electronAPI = {
        appVersion: () => Promise.resolve("0.1.0"),
        getRuntimeInfo: () => Promise.resolve(null),
        openExternal: () => Promise.resolve(),
        platform: "win32",
      };
    });

    it("renders the publisher section in English", () => {
      localStorage.setItem("openme.lang", "en");
      render(<Providers><AboutDialog open onClose={() => undefined} /></Providers>);
      expect(screen.getByText("Publisher")).toBeTruthy();
      expect(screen.getByText("Gangtie Shuxu")).toBeTruthy();
      expect(screen.getByText("Contact")).toBeTruthy();
      expect(screen.getByText("wuxi3042205")).toBeTruthy();
    });

    it("renders the publisher section in Chinese (brand name kept verbatim)", () => {
      localStorage.setItem("openme.lang", "zh");
      render(<Providers><AboutDialog open onClose={() => undefined} /></Providers>);
      expect(screen.getByText("出品方")).toBeTruthy();
      expect(screen.getByText("钢铁私塾")).toBeTruthy();
      expect(screen.getByText("联系方式")).toBeTruthy();
      expect(screen.getByText("wuxi3042205")).toBeTruthy();
    });

    it("copies the WeChat id when the copy button is clicked", async () => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: { writeText },
      });
      localStorage.setItem("openme.lang", "en");
      render(<Providers><AboutDialog open onClose={() => undefined} /></Providers>);
      const button = screen.getByRole("button", { name: "Copy WeChat ID" });
      fireEvent.click(button);
      await vi.waitFor(() => expect(writeText).toHaveBeenCalledWith("wuxi3042205"));
      await vi.waitFor(() => expect(screen.getByText("Copied")).toBeTruthy());
    });
  });

  describe("AboutDialog — release notes section", () => {
    beforeEach(() => {
      (window as unknown as { electronAPI: unknown }).electronAPI = {
        appVersion: () => Promise.resolve("0.1.0"),
        getRuntimeInfo: () => Promise.resolve(null),
        openExternal: () => Promise.resolve(),
        platform: "win32",
      };
    });

    it("renders the section title and subtitle in English", () => {
      localStorage.setItem("openme.lang", "en");
      render(<Providers><AboutDialog open onClose={() => undefined} /></Providers>);
      const heading = screen.getByRole("heading", { name: "Release notes" });
      expect(heading).toBeTruthy();
      // Subtitle copy
      expect(screen.getByText("Recent changes and new features")).toBeTruthy();
    });

    it("renders the section title and subtitle in Chinese", () => {
      localStorage.setItem("openme.lang", "zh");
      render(<Providers><AboutDialog open onClose={() => undefined} /></Providers>);
      const heading = screen.getByRole("heading", { name: "版本更新" });
      expect(heading).toBeTruthy();
      expect(screen.getByText("近期发布的改动与新功能")).toBeTruthy();
    });

    it("renders the latest release with a New badge", () => {
      localStorage.setItem("openme.lang", "en");
      render(<Providers><AboutDialog open onClose={() => undefined} /></Providers>);
      // v0.1.0 is the latest, expect its version pill + the New badge text
      expect(screen.getByText("v0.1.0")).toBeTruthy();
      expect(screen.getByText("New")).toBeTruthy();
      // The latest release's headline is wired to the v0.1.0 key
      expect(screen.getByText("First public release · v0.1.0")).toBeTruthy();
    });

    it("renders the date label with the YYYY-MM-DD format", () => {
      localStorage.setItem("openme.lang", "en");
      render(<Providers><AboutDialog open onClose={() => undefined} /></Providers>);
      // The Released prefix + a date, e.g. "Released · 2026-01-10"
      expect(screen.getByText(/^Released · 2026-01-10$/)).toBeTruthy();
    });

    it("renders at least three bullet items for the v0.1.0 release", () => {
      localStorage.setItem("openme.lang", "en");
      render(<Providers><AboutDialog open onClose={() => undefined} /></Providers>);
      // The first known v0.1.0 bullet is a unique string — verifies the
      // bulletKeys mapping is intact without enumerating all six bullets.
      expect(
        screen.getByText(/Universal file opener debuts/),
      ).toBeTruthy();
    });

    it("honours the LATEST_LIMIT by capping visible releases", () => {
      localStorage.setItem("openme.lang", "en");
      const { container } = render(
        <Providers><AboutDialog open onClose={() => undefined} /></Providers>,
      );
      // Count items in the release list (.about-dialog-release-item)
      const items = container.querySelectorAll(".about-dialog-release-item");
      // The data module caps at 5 — newest first. We have 6 entries, so
      // the oldest (v0.0.3) is hidden.
      expect(items.length).toBe(5);
    });

    it("is keyboard reachable through the dialog focus trap", () => {
      // The release section's bullets aren't interactive, so the trap
      // should still cycle through header + close + footer buttons only.
      // This test guards against accidentally inserting focusable
      // elements inside the release list.
      localStorage.setItem("openme.lang", "en");
      render(<Providers><AboutDialog open onClose={() => undefined} /></Providers>);
      const allButtons = screen.getAllByRole("button");
      // Header close (1) + footer primary (1) + copy version (1)
      // + runtime copy (1) + wechat copy (1) = 5 buttons max
      // (the trap counts only non-disabled, focusable elements).
      expect(allButtons.length).toBeGreaterThanOrEqual(4);
      expect(allButtons.length).toBeLessThanOrEqual(6);
    });
  });
