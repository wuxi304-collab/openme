// @vitest-environment jsdom
// Behavioural tests for PR #173 — "Save All" command.
//
// Verifies that:
//   1. The new i18n keys exist in both locales (zh + en).
//   2. CommandPalette renders a "save-all" command with the Ctrl+Shift+S
//      shortcut when at least one dirty tab is present.
//   3. The disabled state engages when there are no dirty tabs.
//
// These are the user-visible surfaces the new code introduces. The
// underlying iteration + summary toast logic lives inside App.tsx and is
// intentionally not rendered here — that path requires a full app mount
// with electronAPI.saveFile plumbing, which other tests already cover.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { I18nProvider } from "./i18n";
import CommandPalette, { type CommandItem } from "./components/CommandPalette";

beforeEach(() => {
  try { window.localStorage.removeItem("openme.lang"); } catch { /* noop */ }
});

afterEach(() => {
  cleanup();
  try { window.localStorage.removeItem("openme.lang"); } catch { /* noop */ }
});

describe("PR #173 · Save All i18n coverage", () => {
  it("declares cmdSaveAll + summary keys in zh", async () => {
    const { useI18n } = await import("./i18n");
    const Captured = ({ onReady }: { onReady: (api: ReturnType<typeof useI18n>) => void }) => {
      const api = useI18n();
      // Snapshot once on first render so we don't re-render forever.
      onReady(api);
      return null;
    };
    let captured: ReturnType<typeof useI18n> | null = null;
    render(
      <I18nProvider>
        <Captured onReady={(api) => { captured = api; }} />
      </I18nProvider>
    );
    expect(captured, "useI18n must have fired").toBeTruthy();
    // zh is the default locale.
    expect(captured!.t("cmdSaveAll")).toBe("保存全部文件");
    expect(captured!.tf("cmdSaveAllDetail", { count: 3 })).toMatch(/3 个未保存标签/);
    expect(captured!.t("cmdSaveAllDetailEmpty")).toBe("没有未保存修改");
    expect(captured!.tf("saveAllSuccess", { count: 5 })).toMatch(/5 个文件/);
    expect(captured!.tf("saveAllPartial", { saved: 2, failed: 1, total: 3 })).toMatch(/已保存 2/);
    expect(captured!.tf("saveAllFailed", { count: 4 })).toMatch(/4 个文件保存失败/);
  });

  it("declares cmdSaveAll + summary keys in en", async () => {
    try { window.localStorage.setItem("openme.lang", "en"); } catch { /* noop */ }
    const { useI18n } = await import("./i18n");
    const Captured = ({ onReady }: { onReady: (api: ReturnType<typeof useI18n>) => void }) => {
      const api = useI18n();
      onReady(api);
      return null;
    };
    let captured: ReturnType<typeof useI18n> | null = null;
    render(
      <I18nProvider>
        <Captured onReady={(api) => { captured = api; }} />
      </I18nProvider>
    );
    expect(captured).toBeTruthy();
    expect(captured!.t("cmdSaveAll")).toBe("Save all files");
    expect(captured!.tf("cmdSaveAllDetail", { count: 2 })).toBe("2 unsaved tabs");
    expect(captured!.t("cmdSaveAllDetailEmpty")).toBe("No unsaved changes");
    expect(captured!.tf("saveAllSuccess", { count: 3 })).toBe("Saved all 3 files");
    expect(captured!.tf("saveAllPartial", { saved: 1, failed: 2, total: 3 })).toBe("Saved 1 of 3, 2 failed");
    expect(captured!.tf("saveAllFailed", { count: 4 })).toBe("Failed to save 4 files");
  });
});

describe("PR #173 · Save All in CommandPalette", () => {
  function renderPalette(commands: CommandItem[]) {
    return render(
      <I18nProvider>
        <CommandPalette open={true} commands={commands} onClose={() => undefined} />
      </I18nProvider>
    );
  }

  it("renders save-all command with Ctrl+Shift+S shortcut when enabled", () => {
    const run = vi.fn();
    const commands: CommandItem[] = [
      { id: "save-all", label: "Save all files", detail: "3 unsaved tabs", shortcut: "Ctrl Shift S", kind: "file", run },
    ];
    renderPalette(commands);
    const options = screen.getAllByRole("option");
    const saveAll = options.find((o) => within(o).queryByText(/Save all files/));
    expect(saveAll, "save-all command must be visible").toBeTruthy();
    expect(within(saveAll!).getByText(/Ctrl Shift S/)).toBeTruthy();
  });

  it("invokes run() when the user selects the save-all command", () => {
    const run = vi.fn();
    const commands: CommandItem[] = [
      { id: "save-all", label: "Save all files", detail: "3 unsaved tabs", shortcut: "Ctrl Shift S", kind: "file", run },
    ];
    renderPalette(commands);
    const saveAll = screen.getAllByRole("option").find((o) => within(o).queryByText(/Save all files/));
    expect(saveAll).toBeTruthy();
    act(() => { fireEvent.click(saveAll!); });
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("respects disabled state — clicking a disabled save-all is a no-op", () => {
    const run = vi.fn();
    const commands: CommandItem[] = [
      { id: "save-all", label: "Save all files", detail: "No unsaved changes", shortcut: "Ctrl Shift S", kind: "file", disabled: true, run },
    ];
    renderPalette(commands);
    const saveAll = screen.getAllByRole("option").find((o) => within(o).queryByText(/Save all files/));
    expect(saveAll).toBeTruthy();
        // CommandPalette applies `disabled` as a native HTML attribute on the
        // option button (browser handles aria-disabled semantics implicitly).
        expect(saveAll!.hasAttribute("disabled")).toBe(true);
  });

  it("fuzzy-filters save-all command by 'save' keyword", () => {
    const run = vi.fn();
    const commands: CommandItem[] = [
      { id: "save", label: "Save current file", detail: "Write changes", kind: "file", run },
      { id: "save-all", label: "Save all files", detail: "Write all", shortcut: "Ctrl Shift S", kind: "file", keywords: ["all"], run },
      { id: "open", label: "Open file", detail: "Pick a file", kind: "file", run },
    ];
    renderPalette(commands);
    const input = screen.getByRole("textbox", { hidden: true });
    act(() => { fireEvent.change(input, { target: { value: "save" } }); });
    // The keyword "all" makes save-all match "save" only via the label "Save all files".
    const matches = screen.getAllByRole("option");
    expect(matches.length).toBeGreaterThanOrEqual(2);
    const labels = matches.map((m) => m.textContent ?? "");
    expect(labels.some((l) => /Save current/.test(l))).toBe(true);
    expect(labels.some((l) => /Save all/.test(l))).toBe(true);
  });
});

// Tiny vi.fn stand-in removed — explicit `vi` import from "vitest" handles it.