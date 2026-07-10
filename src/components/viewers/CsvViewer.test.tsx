// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import CsvViewer from "./CsvViewer";
import { I18nProvider } from "../../i18n";

function renderCsv(content: string) {
  try { window.localStorage.setItem("openme.lang", "en"); } catch { /* ignore */ }
  return render(
    <I18nProvider>
      <CsvViewer content={content} />
    </I18nProvider>,
  );
}

const SIMPLE_CSV = "name,age\nAlice,30\nBob,25\nCharlie,35\n";

function getSearchInput(): HTMLInputElement {
  return screen.getByPlaceholderText("Search cells…") as HTMLInputElement;
}

describe("CsvViewer polish", () => {
  beforeEach(() => {
    try { window.localStorage.setItem("openme.lang", "en"); } catch { /* ignore */ }
  });
  afterEach(() => { cleanup(); });

  it("renders header row and data rows", () => {
    renderCsv(SIMPLE_CSV);
    expect(screen.getByText("name")).toBeTruthy();
    expect(screen.getByText("age")).toBeTruthy();
    expect(screen.getByText("Alice")).toBeTruthy();
    expect(screen.getByText("Bob")).toBeTruthy();
  });

  it("shows the summary chip with row and column counts", () => {
    renderCsv(SIMPLE_CSV);
    expect(screen.getAllByText(/3 rows/).length).toBeGreaterThan(0);
  });

  it("filters rows when search query matches", () => {
    renderCsv(SIMPLE_CSV);
    const search = getSearchInput();
    fireEvent.change(search, { target: { value: "alice" } });
    expect(screen.getByText("Alice")).toBeTruthy();
    expect(screen.queryByText("Bob")).toBeNull();
    expect(screen.queryByText("Charlie")).toBeNull();
  });

  it("shows a clear button when search has content", () => {
    renderCsv(SIMPLE_CSV);
    const search = getSearchInput();
    fireEvent.change(search, { target: { value: "alice" } });
    const clearBtn = screen.getByLabelText("Clear search");
    expect(clearBtn).toBeTruthy();
    fireEvent.click(clearBtn);
    expect(search.value).toBe("");
  });

  it("shows no-match error when search has no hits", () => {
    renderCsv(SIMPLE_CSV);
    fireEvent.change(getSearchInput(), { target: { value: "zzzzzz" } });
    expect(screen.getByText("No matches")).toBeTruthy();
  });

  it("sorts when clicking a header", () => {
    renderCsv(SIMPLE_CSV);
    const nameHeader = screen.getByRole("button", { name: /name/ });
    fireEvent.click(nameHeader);
    const rows = screen.getAllByRole("row");
    expect(within(rows[1]!).getByText("Alice")).toBeTruthy();
  });

  it("page size selector has the 4 expected options", () => {
    renderCsv(SIMPLE_CSV);
    const select = screen.getByLabelText("Rows per page") as HTMLSelectElement;
    const texts = Array.from(select.options).map((opt) => opt.text);
    expect(texts).toContain("50 / page");
    expect(texts).toContain("100 / page");
    expect(texts).toContain("300 / page");
    expect(texts).toContain("1000 / page");
  });

  it("pagination shows page indicator", () => {
    renderCsv(SIMPLE_CSV);
    expect(screen.getByText(/Page 1/)).toBeTruthy();
  });

  it("previous button is disabled on first page", () => {
    renderCsv(SIMPLE_CSV);
    const nav = screen.getByRole("navigation");
      const prev = within(nav).getByRole("button", { name: /Previous/ });
    expect((prev as HTMLButtonElement).disabled).toBe(true);
  });

  it("shows error chip when parser reports errors", () => {
    const malformed = 'a,b,c\n"unterminated,2,3\n';
    renderCsv(malformed);
    expect(screen.getAllByText(/format issue/).length).toBeGreaterThan(0);
  });

  it("shows empty state when csv has no data rows", () => {
    renderCsv("");
    expect(screen.getByText("CSV is empty")).toBeTruthy();
  });

  it("generates column placeholders for missing headers", () => {
      // First row has fewer cells than a data row → padding headers
      renderCsv("name\nAlice,30,Boston\n");
      expect(screen.getByText("name")).toBeTruthy();
      // The 2nd and 3rd columns have no header → "Column N" placeholder
      expect(screen.getByText("Column 2")).toBeTruthy();
      expect(screen.getByText("Column 3")).toBeTruthy();
    });
});