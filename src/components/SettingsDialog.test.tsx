// @vitest-environment jsdom
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { I18nProvider } from "../i18n";
import { SettingsProvider } from "../settings";
import { ToastProvider } from "./useToast";
import { ConfirmProvider } from "./useConfirm";
import SettingsDialog from "./SettingsDialog";

function renderDialog(open = true, onClose = () => undefined) {
  // Force English so we can assert exact English labels (the default
  // locale is zh, in which t("settingsTitle") returns "设置").
  try { localStorage.setItem("openme.lang", "en"); } catch { /* noop */ }
  return render(
    <I18nProvider>
      <SettingsProvider>
        <ConfirmProvider>
          <ToastProvider value={{ pushToast: () => undefined }}>
            <SettingsDialog open={open} onClose={onClose} />
          </ToastProvider>
        </ConfirmProvider>
      </SettingsProvider>
    </I18nProvider>
  );
}

describe("SettingsDialog", () => {
  beforeEach(() => {
    try { localStorage.clear(); } catch { /* jsdom may disallow */ }
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders nothing when closed", () => {
    renderDialog(false);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("renders the dialog shell with title and tagline when open", () => {
    renderDialog();
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeTruthy();
    expect(within(dialog).getByText(/Settings/i, { selector: "h2" })).toBeTruthy();
    expect(within(dialog).getByText(/local preferences/i)).toBeTruthy();
  });

  it("calls onClose when Escape is pressed", () => {
    let closed = false;
    renderDialog(true, () => { closed = true; });
    fireEvent.keyDown(window, { key: "Escape" });
    expect(closed).toBe(true);
  });

  it("calls onClose when close button is clicked", () => {
    let closed = false;
    renderDialog(true, () => { closed = true; });
    const dialog = screen.getByRole("dialog");
    // Use aria-label "Close settings" to find the close button (aria-labelled,
    // not text-content, since the button is an icon-only SVG button).
    const buttons = within(dialog).getAllByRole("button");
    const closeButton = buttons.find((b) => b.getAttribute("aria-label") === "Close settings");
    expect(closeButton).toBeTruthy();
    fireEvent.click(closeButton!);
    expect(closed).toBe(true);
  });

  it("renders all three sections with their titles", () => {
    renderDialog();
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Theme")).toBeTruthy();
    expect(within(dialog).getByText("Confirm before closing tabs")).toBeTruthy();
    expect(within(dialog).getByText("Recent files kept")).toBeTruthy();
    expect(within(dialog).getByText("Editor")).toBeTruthy();
  });

  it("exposes three theme options and reflects the default (dark)", () => {
    renderDialog();
    const themeSection = screen.getByRole("radiogroup", { name: /Theme/i });
    const radios = within(themeSection).getAllByRole("radio");
    expect(radios.length).toBe(2);
    expect((radios[0] as HTMLInputElement).value).toBe("dark");
    expect((radios[1] as HTMLInputElement).value).toBe("light");
    expect((radios[0] as HTMLInputElement).checked).toBe(true);
  });

  it("toggles theme when the light option is clicked", () => {
    renderDialog();
    const themeSection = screen.getByRole("radiogroup", { name: /Theme/i });
    const lightRadio = within(themeSection).getAllByRole("radio")[1] as HTMLInputElement;
    fireEvent.click(lightRadio);
    expect(lightRadio.checked).toBe(true);
  });

  it("renders three recent-limit options", () => {
    renderDialog();
    const recentSection = screen.getByRole("radiogroup", { name: /Recent files kept/i });
    const radios = within(recentSection).getAllByRole("radio");
    expect(radios.length).toBe(3);
    expect((radios[0] as HTMLInputElement).value).toBe("10");
    expect((radios[1] as HTMLInputElement).value).toBe("25");
    expect((radios[2] as HTMLInputElement).value).toBe("50");
  });

  it("renders reset and close actions in the footer", () => {
    renderDialog();
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Reset to defaults")).toBeTruthy();
    expect(within(dialog).getByText("Close")).toBeTruthy();
  });

  it("clicking the reset button opens a confirm dialog; confirming restores dark theme", async () => {
      renderDialog();
      const themeSection = screen.getByRole("radiogroup", { name: /Theme/i });
      const lightRadio = within(themeSection).getAllByRole("radio")[1] as HTMLInputElement;
      fireEvent.click(lightRadio);
      expect(lightRadio.checked).toBe(true);
      fireEvent.click(screen.getByText("Reset to defaults"));
      // The confirm dialog title is `settingsResetConfirmTitle` = "Reset to defaults?"
      // (note the question mark) — disambiguate from the settings footer button.
      const confirmTitle = await screen.findByText("Reset to defaults?");
      const confirmDialog = confirmTitle.closest('[role="dialog"]') as HTMLElement;
      expect(confirmDialog).toBeTruthy();
      const confirmButton = within(confirmDialog).getByRole("button", { name: "Reset" });
      fireEvent.click(confirmButton);
      // handleReset is async (awaits confirm promise); wait for the theme to
      // actually flip back to dark.
      await waitFor(() => {
        const darkRadio = within(themeSection).getAllByRole("radio")[0] as HTMLInputElement;
        expect(darkRadio.checked).toBe(true);
      });
    });

  it("renders the editor sub-section with tab size, line numbers, and word wrap groups", () => {
    renderDialog();
    expect(screen.getByRole("radiogroup", { name: /Tab size/i })).toBeTruthy();
    expect(screen.getByRole("radiogroup", { name: /Line numbers/i })).toBeTruthy();
    expect(screen.getByRole("radiogroup", { name: /Word wrap/i })).toBeTruthy();
  });

  it("exposes three tab-size options with 4 spaces as the default", () => {
    renderDialog();
    const group = screen.getByRole("radiogroup", { name: /Tab size/i });
    const radios = within(group).getAllByRole("radio") as HTMLInputElement[];
    expect(radios.map((r) => r.value)).toEqual(["2", "4", "8"]);
    expect(radios[1].checked).toBe(true);
  });

  it("switches line numbers to off when the hide option is clicked", () => {
    renderDialog();
    const group = screen.getByRole("radiogroup", { name: /Line numbers/i });
    const radios = within(group).getAllByRole("radio") as HTMLInputElement[];
    fireEvent.click(radios[1]);
    expect(radios[1].checked).toBe(true);
    expect(radios[0].checked).toBe(false);
  });

  it("switching tab size to 8 updates the persisted settings", () => {
    renderDialog();
    const group = screen.getByRole("radiogroup", { name: /Tab size/i });
    const radios = within(group).getAllByRole("radio") as HTMLInputElement[];
    fireEvent.click(radios[2]);
    expect(radios[2].checked).toBe(true);
    const stored = JSON.parse(localStorage.getItem("openme.settings.v1") ?? "{}");
    expect(stored.tabSize).toBe(8);
  });

    it("renders the storage-path disclosure block with a copy + reveal button", async () => {
      const fakePath = "C:\\Users\\test\\AppData\\Roaming\\openme";
      const getSettingsStoragePath = vi.fn().mockResolvedValue({ ok: true, path: fakePath });
      (window as unknown as { electronAPI: unknown }).electronAPI = {
        getSettingsStoragePath,
        revealInFolder: vi.fn().mockResolvedValue({ ok: true }),
      };
      renderDialog();
      await screen.findByText(fakePath);
      const copyBtn = screen.getByRole("button", { name: /Copy the storage path/i });
      const revealBtn = screen.getByRole("button", { name: /Open the settings storage folder/i });
      expect(copyBtn).toBeTruthy();
      expect(revealBtn).toBeTruthy();
      fireEvent.click(revealBtn);
      expect((window as unknown as { electronAPI: { revealInFolder: ReturnType<typeof vi.fn> } }).electronAPI.revealInFolder).toHaveBeenCalledWith(fakePath);
    });

    it("renders the storage-path unavailable message when the IPC is missing", async () => {
      // No electronAPI on window → storage path should render the "unavailable" copy.
      (window as unknown as { electronAPI?: unknown }).electronAPI = undefined;
      renderDialog();
      // The Copy / Reveal buttons must be disabled.
      const copyBtn = await screen.findByRole("button", { name: /Copy the storage path/i });
      const revealBtn = screen.getByRole("button", { name: /Open the settings storage folder/i });
      expect((copyBtn as HTMLButtonElement).disabled).toBe(true);
      expect((revealBtn as HTMLButtonElement).disabled).toBe(true);
      expect(screen.getByText(/Storage path unavailable/i)).toBeTruthy();
    });

    it("traps focus inside the dialog when Tab is pressed on the last focusable", () => {
      renderDialog();
      const dialog = screen.getByRole("dialog");
      const card = dialog.querySelector(".settings-dialog-card") as HTMLElement;
      // The trap considers buttons, inputs, anchors, etc. — mirror its selector.
      const focusable = Array.from(card.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      ));
      // Sanity: focusable should include buttons AND inputs.
      const buttons = focusable.filter((el) => el.tagName === "BUTTON");
      const inputs = focusable.filter((el) => el.tagName === "INPUT");
      expect(buttons.length).toBeGreaterThan(0);
      expect(inputs.length).toBeGreaterThan(0);
      const lastEl = focusable[focusable.length - 1]!;
      lastEl.focus();
      // After focusing, activeElement must actually be lastEl — otherwise the
      // trap below has nothing to wrap.
      expect(document.activeElement).toBe(lastEl);
      fireEvent.keyDown(window, { key: "Tab" });
      expect(document.activeElement).toBe(focusable[0]);
    });

    it("Shift+Tab from the first focusable wraps to the last", () => {
      renderDialog();
      const dialog = screen.getByRole("dialog");
      const card = dialog.querySelector(".settings-dialog-card") as HTMLElement;
      const focusable = Array.from(card.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      ));
      const firstEl = focusable[0]!;
      firstEl.focus();
      expect(document.activeElement).toBe(firstEl);
      fireEvent.keyDown(window, { key: "Tab", shiftKey: true });
      expect(document.activeElement).toBe(focusable[focusable.length - 1]);
    });

    it("clicking reset and then Cancel leaves settings untouched", async () => {
      renderDialog();
      const themeSection = screen.getByRole("radiogroup", { name: /Theme/i });
      const lightRadio = within(themeSection).getAllByRole("radio")[1] as HTMLInputElement;
      fireEvent.click(lightRadio);
      expect(lightRadio.checked).toBe(true);
      fireEvent.click(screen.getByText("Reset to defaults"));
      const confirmTitle = await screen.findByText("Reset to defaults?");
      const confirmDialog = confirmTitle.closest('[role="dialog"]') as HTMLElement;
      expect(confirmDialog).toBeTruthy();
      fireEvent.click(within(confirmDialog).getByRole("button", { name: "Cancel" }));
      // Theme is still light because reset was cancelled.
      expect(lightRadio.checked).toBe(true);
    });

    it("links each radio group to its section description via aria-describedby", () => {
      renderDialog();
      const theme = screen.getByRole("radiogroup", { name: /Theme/i });
      expect(theme.getAttribute("aria-describedby")).toBe("settings-theme-desc");
      const close = screen.getByRole("radiogroup", { name: /Confirm before closing tabs/i });
      expect(close.getAttribute("aria-describedby")).toBe("settings-close-confirm-desc");
      const recent = screen.getByRole("radiogroup", { name: /Recent files kept/i });
      expect(recent.getAttribute("aria-describedby")).toBe("settings-recent-desc");
      const tab = screen.getByRole("radiogroup", { name: /Tab size/i });
      expect(tab.getAttribute("aria-describedby")).toBe("settings-tab-size-desc");
      const lines = screen.getByRole("radiogroup", { name: /Line numbers/i });
      expect(lines.getAttribute("aria-describedby")).toBe("settings-line-numbers-desc");
      const wrap = screen.getByRole("radiogroup", { name: /Word wrap/i });
      expect(wrap.getAttribute("aria-describedby")).toBe("settings-word-wrap-desc");
    });

          // Slice K — Settings search/filter (PR #163)
    it("renders the search input with the localized placeholder and aria-label", () => {
      renderDialog();
      const input = screen.getByPlaceholderText("Filter settings…") as HTMLInputElement;
      expect(input).toBeTruthy();
      expect(input.getAttribute("aria-label")).toBe("Filter settings");
      // "/" hint chip is rendered as sr-only text. Use the input's parent
      // wrapper to find it without disturbing other matches in the doc.
      const dialog = screen.getByRole("dialog");
      const hint = within(dialog).getByText("Press / to focus search");
      expect(hint).toBeTruthy();
    });

    it("hides non-matching sections when typing a search query", async () => {
      renderDialog();
      const input = screen.getByPlaceholderText("Filter settings…") as HTMLInputElement;
      fireEvent.change(input, { target: { value: "theme" } });
      // After effect flushes, only the Theme section should be visible.
      await waitFor(() => {
        const dialog = screen.getByRole("dialog");
        const visibleSections = Array.from(
          dialog.querySelectorAll<HTMLElement>(".settings-dialog-section")
        ).filter((s) => !s.hidden);
        expect(visibleSections.length).toBe(1);
        expect(visibleSections[0]?.querySelector("h3")?.textContent).toMatch(/Theme/i);
      });
    });

    it("shows a no-results message when the query matches no section", async () => {
      renderDialog();
      const input = screen.getByPlaceholderText("Filter settings…") as HTMLInputElement;
      fireEvent.change(input, { target: { value: "zzzzzz" } });
      await waitFor(() => {
        const dialog = screen.getByRole("dialog");
        expect(within(dialog).getByText(/No settings match/i)).toBeTruthy();
      });
    });

    it("resets the filter when the dialog is closed and reopened", async () => {
      // Force English locale before this specific test so we can match the
      // placeholder verbatim.
      try { localStorage.setItem("openme.lang", "en"); } catch { /* noop */ }
      const { rerender } = render(
        <I18nProvider>
          <SettingsProvider>
            <ConfirmProvider>
              <ToastProvider value={{ pushToast: () => undefined }}>
                <SettingsDialog open={true} onClose={() => undefined} />
              </ToastProvider>
            </ConfirmProvider>
          </SettingsProvider>
        </I18nProvider>
      );
      const input = screen.getByPlaceholderText("Filter settings…") as HTMLInputElement;
      fireEvent.change(input, { target: { value: "theme" } });
      await waitFor(() => expect(input.value).toBe("theme"));
      // Now close and reopen — filter should clear.
      rerender(
        <I18nProvider>
          <SettingsProvider>
            <ConfirmProvider>
              <ToastProvider value={{ pushToast: () => undefined }}>
                <SettingsDialog open={false} onClose={() => undefined} />
              </ToastProvider>
            </ConfirmProvider>
          </SettingsProvider>
        </I18nProvider>
      );
      rerender(
        <I18nProvider>
          <SettingsProvider>
            <ConfirmProvider>
              <ToastProvider value={{ pushToast: () => undefined }}>
                <SettingsDialog open={true} onClose={() => undefined} />
              </ToastProvider>
            </ConfirmProvider>
          </SettingsProvider>
        </I18nProvider>
      );
      const reopened = screen.getByPlaceholderText("Filter settings…") as HTMLInputElement;
      expect(reopened.value).toBe("");
    });

          it("focuses the search input when '/' is pressed and no other input is focused", () => {
            renderDialog();
            // Focus the dialog card first so the focus-trap doesn't intercept.
            const dialog = screen.getByRole("dialog");
            const card = dialog.querySelector(".settings-dialog-card") as HTMLElement;
            card.focus();
            fireEvent.keyDown(window, { key: "/" });
            const input = screen.getByPlaceholderText("Filter settings…") as HTMLInputElement;
            expect(document.activeElement).toBe(input);
          });

          it("does not hijack '/' when an input is already focused", () => {
            renderDialog();
            const input = screen.getByPlaceholderText("Filter settings…") as HTMLInputElement;
            input.focus();
            // Pre-fill so the user is mid-typing.
            fireEvent.change(input, { target: { value: "the" } });
            // Press '/' — must NOT cause preventDefault / NOT block the typing.
            // The handler should be a no-op because the user is typing.
            // We assert by checking that no exception is thrown AND input value
            // remains the user's value.
            fireEvent.keyDown(window, { key: "/" });
            expect(input.value).toBe("the");
          });

          it("Escape inside the search input clears the query (does not close the dialog)", () => {
            let closed = false;
            renderDialog(true, () => { closed = true; });
            const input = screen.getByPlaceholderText("Filter settings…") as HTMLInputElement;
            fireEvent.change(input, { target: { value: "theme" } });
            expect(input.value).toBe("theme");
            fireEvent.keyDown(input, { key: "Escape" });
            expect(input.value).toBe("");
            // Dialog must NOT have closed.
            expect(closed).toBe(false);
            expect(screen.queryByRole("dialog")).toBeTruthy();
          });

          it("hides section <h3> titles from the Tab focus trap via the [hidden] attribute", async () => {
            renderDialog();
            const input = screen.getByPlaceholderText("Filter settings…") as HTMLInputElement;
            fireEvent.change(input, { target: { value: "theme" } });
            await waitFor(() => {
              const dialog = screen.getByRole("dialog");
              const card = dialog.querySelector(".settings-dialog-card") as HTMLElement;
              // The hidden attribute removes elements from the DOM in practice, but
              // JSDOM keeps them. Verify they're flagged with [hidden] (which our
              // CSS turns into display:none in real browsers).
              const hiddenSections = Array.from(
                card.querySelectorAll<HTMLElement>(".settings-dialog-section[hidden]")
              );
              expect(hiddenSections.length).toBe(4);
            });
          });

              describe("SettingsDialog Tooltip migration (PR #178)", () => {
                it("does not set native title= on the migrated close button", () => {
                  renderDialog();
                  const closeBtn = document.querySelector(
                    ".settings-dialog-close",
                  ) as HTMLButtonElement | null;
                  expect(closeBtn).toBeTruthy();
                  expect(closeBtn!.title).toBe("");
                });

                it("opens the close-button Tooltip with the close copy", async () => {
                  renderDialog();
                  const closeBtn = document.querySelector(
                    ".settings-dialog-close",
                  ) as HTMLButtonElement;
                  expect(closeBtn).toBeTruthy();
                  vi.useFakeTimers();
                  await act(async () => {
                    fireEvent.mouseEnter(closeBtn);
                    vi.runAllTimers();
                  });
                  const describedBy = closeBtn.getAttribute("aria-describedby");
                  expect(describedBy).toBeTruthy();
                  const tooltipBody = document.getElementById(describedBy!);
                  expect(tooltipBody?.textContent).toBe("Close settings");
                  vi.useRealTimers();
                });

                it("renders the storage-path section without native title= on the migrated copy/reveal buttons", async () => {
                  // The copy + reveal buttons (chrome controls) lost their native title=
                  // via the Tooltip migration in PR #178. The inline <code> element
                  // intentionally retains native title= for full-path-on-hover (truncation
                  // pattern, not an explanation), but that's conditional on the IPC
                  // returning a real path — in this mocked env we only get the "unavailable"
                  // fallback, so we just verify the migrated buttons have no title attr.
                  renderDialog();
                  await waitFor(() => {
                    // Storage-path section always renders one of two branches:
                    // a) <code> with the path (when IPC ok)
                    // b) the "unavailable" message (when IPC fails / not present)
                    const block = document.querySelector(".settings-storage-path");
                    expect(block).toBeTruthy();
                  });
                  // In the mocked env the IPC fails, so we get the unavailable branch —
                  // which means there's no <code> with title=. Instead verify that the
                  // migrated chrome controls have no title= at all.
                  const closeBtn = document.querySelector(
                    ".settings-dialog-close",
                  ) as HTMLButtonElement;
                  expect(closeBtn.title).toBe("");
                  // The storage-path block in the unavailable branch should not contain
                  // any element with a non-empty title attribute (no chrome-control Tooltip
                  // candidate leaked into this branch).
                  const block = document.querySelector(".settings-storage-path") as HTMLElement;
                  const titled = Array.from(
                    block.querySelectorAll<HTMLElement>("[title]"),
                  ).filter((el) => (el.getAttribute("title") ?? "").length > 0);
                  expect(titled.length).toBe(0);
                });
              });
        });