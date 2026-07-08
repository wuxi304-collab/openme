// @vitest-environment jsdom
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { I18nProvider } from "../i18n";
import { SettingsProvider } from "../settings";
import SettingsDialog from "./SettingsDialog";

function renderDialog(open = true, onClose = () => undefined) {
  // Force English so we can assert exact English labels (the default
  // locale is zh, in which t("settingsTitle") returns "设置").
  try { localStorage.setItem("openme.lang", "en"); } catch { /* noop */ }
  return render(
    <I18nProvider>
      <SettingsProvider>
        <SettingsDialog open={open} onClose={onClose} />
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
    expect(within(dialog).getByText(/Settings/i)).toBeTruthy();
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

  it("clicking the reset button restores dark theme", () => {
    renderDialog();
    const themeSection = screen.getByRole("radiogroup", { name: /Theme/i });
    const lightRadio = within(themeSection).getAllByRole("radio")[1] as HTMLInputElement;
    fireEvent.click(lightRadio);
    expect(lightRadio.checked).toBe(true);
    fireEvent.click(screen.getByText("Reset to defaults"));
    const darkRadio = within(themeSection).getAllByRole("radio")[0] as HTMLInputElement;
    expect(darkRadio.checked).toBe(true);
  });
});