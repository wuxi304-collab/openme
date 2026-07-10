// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { I18nProvider } from "../../i18n";
import OfficeViewer from "./OfficeViewer";

function renderOffice(props: Parameters<typeof OfficeViewer>[0]) {
  return render(
    <I18nProvider>
      <OfficeViewer {...props} />
    </I18nProvider>
  );
}

describe("OfficeViewer polish", () => {
  beforeEach(() => {
    try {
      window.localStorage.setItem("openme.lang", "en");
    } catch {
      // ignore
    }
  });

  afterEach(() => {
    cleanup();
  });

  it("renders the Word toolbar and copy button", () => {
    renderOffice({ data: { type: "docx", html: "<p>Hello world from the test.</p>" } });
    expect(screen.getByText("Word Document")).toBeTruthy();
    expect(screen.getByLabelText("Copy as plain text")).toBeTruthy();
  });

  it("switches between Excel sheets and exposes tab a11y", () => {
    renderOffice({
      data: {
        type: "excel",
        sheets: [
          { name: "First", data: [["a", "b"], ["1", "2"], ["3", "4"]] },
          { name: "Second", data: [["x"], ["5"]] },
        ],
      },
    });
    const firstTab = screen.getByRole("tab", { name: "First" });
    const secondTab = screen.getByRole("tab", { name: "Second" });
    expect(firstTab.getAttribute("aria-selected")).toBe("true");
    expect(secondTab.getAttribute("aria-selected")).toBe("false");
    fireEvent.click(secondTab);
    expect(secondTab.getAttribute("aria-selected")).toBe("true");
    expect(firstTab.getAttribute("aria-selected")).toBe("false");
  });

  it("renders the PPTX fallback message", () => {
    renderOffice({ data: { type: "pptx" } });
    expect(screen.getByText("PowerPoint")).toBeTruthy();
    expect(screen.getByText(/PPTX animations cannot be previewed/)).toBeTruthy();
  });
});