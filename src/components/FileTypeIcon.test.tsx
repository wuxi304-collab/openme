import { cleanup, render, screen } from "@testing-library/react";
// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { I18nProvider, useI18n } from "../i18n";
import FileTypeIcon, { deriveOtherLabel } from "./FileTypeIcon";

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe("deriveOtherLabel", () => {
  it("strips leading dot and uppercases", () => {
    expect(deriveOtherLabel(".dat")).toBe("DAT");
    expect(deriveOtherLabel(".pdf")).toBe("PDF");
    expect(deriveOtherLabel(".JSON")).toBe("JSON");
  });

  it("trims to four characters", () => {
    expect(deriveOtherLabel(".tar.gz")).toBe("TAR");
      expect(deriveOtherLabel(".backup")).toBe("BACK");
      expect(deriveOtherLabel(".xlsx-template")).toBe("XLSX");
      expect(deriveOtherLabel(".verylongext")).toBe("VERY");
    });

    it("splits compound extensions on common separators", () => {
      expect(deriveOtherLabel(".my-ext")).toBe("MY");
      expect(deriveOtherLabel(".env_local")).toBe("ENV");
    });

  it("handles strings without a leading dot", () => {
    expect(deriveOtherLabel("log")).toBe("LOG");
  });

  it("falls back to '???' for missing or empty input", () => {
    expect(deriveOtherLabel(undefined)).toBe("???");
    expect(deriveOtherLabel("")).toBe("???");
    expect(deriveOtherLabel(".")).toBe("???");
    expect(deriveOtherLabel("   ")).toBe("???");
  });
});

function Probe() {
  const { lang } = useI18n();
  return <span data-testid="lang">{lang}</span>;
}

describe("<FileTypeIcon>", () => {
  it("renders the standard label for known categories", () => {
    render(
      <I18nProvider>
        <FileTypeIcon type="pdf" size={32} />
      </I18nProvider>
    );
    // aria-label is "PDF 文件" in zh, "PDF file" in en
    expect(screen.getByLabelText(/PDF/)).toBeTruthy();
  });

  it("renders '???' for unknown categories with no extension", () => {
    render(
      <I18nProvider>
        <FileTypeIcon type="other" size={32} />
      </I18nProvider>
    );
        expect(screen.getByTitle("???")).toBeTruthy();
  });

  it("renders the real extension for unknown categories when provided", () => {
    render(
      <I18nProvider>
        <FileTypeIcon type="other" size={32} extension=".dat" />
      </I18nProvider>
    );
        expect(screen.getByTitle("DAT")).toBeTruthy();
  });

  it("uses single-letter mini badge derived from the extension", () => {
    render(
      <I18nProvider>
        <FileTypeIcon type="other" size={17} extension=".dat" />
      </I18nProvider>
    );
    // aria-label still includes "DAT" so screen readers get the full word.
    const node = screen.getByLabelText(/DAT/);
    expect(node.textContent).toBe("D");
  });

  it("ignores the extension for known categories", () => {
    render(
      <I18nProvider>
        <FileTypeIcon type="pdf" size={32} extension=".dat" />
      </I18nProvider>
    );
    // .dat is ignored because pdf is a known category — the badge stays PDF.
        expect(screen.getByTitle("PDF")).toBeTruthy();
  });

  it("renders the language probe under I18nProvider", () => {
    render(
      <I18nProvider>
        <Probe />
      </I18nProvider>
    );
    // Sanity check that I18nProvider works in this test setup.
    expect(screen.getByTestId("lang").textContent).toBe("zh");
  });
});