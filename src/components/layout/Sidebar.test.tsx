// @vitest-environment jsdom
// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { I18nProvider } from "../../i18n";
import Sidebar from "./Sidebar";
import type { FileInfo } from "../../types";

afterEach(() => { cleanup(); });

function renderSidebar(props: Partial<React.ComponentProps<typeof Sidebar>> = {}) {
  return render(
    <I18nProvider>
      <Sidebar
        files={[]}
        selectedPath={null}
        onSelect={() => {}}
        onRemove={() => {}}
        {...props}
      />
    </I18nProvider>,
  );
}

const makeFile = (path: string): FileInfo => ({
  path,
  name: path.split("/").pop() ?? path,
  size: 12,
  lastModified: Date.now(),
});

const findChip = () => document.querySelector(".file-search-count") as HTMLElement;
const hasChip = () => Boolean(document.querySelector(".file-search-count"));

describe("Sidebar search count chip (PR #81)", () => {
  it("hides the chip when the search input is empty", () => {
    renderSidebar({ files: [], totalCount: 0, searchValue: "" });
    expect(hasChip()).toBe(false);
  });

  it("hides the chip when no totalCount is provided", () => {
    renderSidebar({ files: [makeFile("/a.dwg"), makeFile("/b.pdf")], searchValue: "dw" });
    expect(hasChip()).toBe(false);
  });

  it("renders a 'shown / total' chip while a search filter is active", () => {
    renderSidebar({
      files: [makeFile("/foo.dwg"), makeFile("/bar.pdf")],
      totalCount: 7,
      searchValue: "fo",
    });
    const txt = findChip().textContent ?? "";
    expect(txt).toMatch(/2/);
    expect(txt).toMatch(/7/);
  });

  it("substitutes both numbers into the chip via ICU placeholders", () => {
    renderSidebar({
      files: [makeFile("/baz.step"), makeFile("/bar.dwg"), makeFile("/bax.dwg")],
      totalCount: 25,
      searchValue: "ba",
    });
    const txt = findChip().textContent ?? "";
    expect(txt).toMatch(/3/);
    expect(txt).toMatch(/25/);
    expect(txt).not.toMatch(/[{}\\]/);
  });
});

