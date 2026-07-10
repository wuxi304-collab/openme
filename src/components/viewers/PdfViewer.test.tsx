// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { I18nProvider } from "../../i18n";

// Mock pdfjs-dist so the dynamic import does not pull in worker code in jsdom
vi.mock("pdfjs-dist", () => ({
  getDocument: () => ({
    promise: Promise.resolve({
      numPages: 5,
      getPage: () => Promise.resolve({
        getViewport: ({ scale }: { scale: number }) => ({ width: 800 * scale, height: 600 * scale }),
        getTextContent: () => Promise.resolve({ items: [] }),
        render: () => ({ promise: Promise.resolve() }),
      }),
    }),
    destroy: () => undefined,
  }),
  GlobalWorkerOptions: { workerSrc: "" },
}));

vi.mock("pdfjs-dist/build/pdf.worker.min.mjs?url", () => ({ default: "" }));

import PdfViewer from "./PdfViewer";

function renderPdf(props: { base64Data?: string } = {}) {
  return render(
    <I18nProvider>
      <PdfViewer base64Data={props.base64Data ?? "AAAA"} />
    </I18nProvider>
  );
}

describe("PdfViewer polish", () => {
  beforeEach(() => {
    try {
      window.localStorage.setItem("openme.lang", "en");
    } catch {
      // ignore
    }
    // Element.scrollIntoView not in jsdom
    if (!Element.prototype.scrollIntoView) {
      Element.prototype.scrollIntoView = vi.fn();
    }
  });

  afterEach(() => {
    cleanup();
  });

  it("renders the PDF label and toolbar buttons in English", () => {
    renderPdf();
    expect(screen.getByText("PDF")).toBeTruthy();
    expect(screen.getByLabelText("Previous")).toBeTruthy();
    expect(screen.getByLabelText("Next")).toBeTruthy();
    expect(screen.getByLabelText("Fit width")).toBeTruthy();
    expect(screen.getByLabelText("Zoom out")).toBeTruthy();
    expect(screen.getByLabelText("Zoom in")).toBeTruthy();
    expect(screen.getByLabelText("Reset zoom")).toBeTruthy();
  });

  it("renders the search form with English placeholder", () => {
    renderPdf();
    expect(screen.getByPlaceholderText("Search text…")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Search" })).toBeTruthy();
  });

  it("renders the status bar with Page / Total template", () => {
    renderPdf();
      const statusbars = screen.getAllByRole("status");
      const pageStatus = statusbars.find((node) => /Page\s+\d/.test(node.textContent ?? ""));
      expect(pageStatus).toBeTruthy();
    });

  it("renders the page-count chip once totalPages is known", async () => {
    renderPdf();
    // Give the async pdfjs mock a microtask to resolve
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.getByText(/5 pages/)).toBeTruthy();
  });
});