// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { I18nProvider } from "../i18n";
import FileDropZone from "./FileDropZone";
import FileMetadata from "./FileMetadata";
import RecentFiles from "./RecentFiles";
import PreviewPane from "./PreviewPane";
import type { FileInfo } from "../types";

afterEach(() => {
  cleanup();
  localStorage.clear();
});

function Providers({ children }: { children: React.ReactNode }) {
  return <I18nProvider>{children}</I18nProvider>;
}

const fakeFile: FileInfo = {
  id: "1",
  path: "/tmp/foo.pdf",
  name: "foo.pdf",
  extension: ".pdf",
  size: 12345,
  modified_at: 1700000000000,
  file_type: "pdf",
  category: "document",
  source: "local",
};
describe("FileDropZone a11y", () => {
  it("renders as a labelled region", () => {
    render(
      <Providers>
        <FileDropZone onFileDrop={() => undefined} />
      </Providers>,
    );
    const region = screen.getByRole("region");
    const label = region.getAttribute("aria-label");
    expect(label).toBeTruthy();
    expect(label && label.length).toBeGreaterThan(0);
  });

  it("decorative SVG carries aria-hidden", () => {
    const { container } = render(
      <Providers>
        <FileDropZone onFileDrop={() => undefined} />
      </Providers>,
    );
    const svgs = container.querySelectorAll("svg");
    expect(svgs.length).toBeGreaterThan(0);
    svgs.forEach((svg) => {
      expect(svg.getAttribute("aria-hidden")).toBe("true");
    });
  });

  it("renders a keyboard-accessible browse button", () => {
    render(
      <Providers>
        <FileDropZone onFileDrop={() => undefined} />
      </Providers>,
    );
    const browseBtn = screen.getByRole("button");
    expect(browseBtn.textContent && browseBtn.textContent.length).toBeGreaterThan(0);
    expect(browseBtn.getAttribute("type")).toBe("button");
  });

  it("renders format chips as a labelled list", () => {
    const { container } = render(
      <Providers>
        <FileDropZone onFileDrop={() => undefined} />
      </Providers>,
    );
    const list = container.querySelector("ul");
    expect(list).not.toBeNull();
    const label = list && list.getAttribute("aria-label");
    expect(label && label.length).toBeGreaterThan(0);
  });
});
describe("RecentFiles a11y", () => {
  const files: FileInfo[] = [
    fakeFile,
    { ...fakeFile, id: "2", path: "/tmp/bar.txt", name: "bar.txt", extension: ".txt", file_type: "text", category: "text" },
  ];

  it("marks the selected file with aria-current", () => {
    render(
      <Providers>
        <RecentFiles files={files} selectedPath="/tmp/foo.pdf" onSelect={() => undefined} />
      </Providers>,
    );
    const buttons = screen.getAllByRole("button");
    const selected = buttons.find((b) => b.textContent && b.textContent.includes("foo"));
    expect(selected).toBeTruthy();
    expect(selected && selected.getAttribute("aria-current")).toBe("true");
  });

  it("does not mark unselected files with aria-current", () => {
    render(
      <Providers>
        <RecentFiles files={files} selectedPath="/tmp/foo.pdf" onSelect={() => undefined} />
      </Providers>,
    );
    const buttons = screen.getAllByRole("button");
    const other = buttons.find((b) => b.textContent && b.textContent.includes("bar"));
    expect(other).toBeTruthy();
    expect(other && other.getAttribute("aria-current")).toBeFalsy();
  });
});
describe("FileMetadata a11y", () => {
  it("renders a labelled section with a definition list", () => {
    const { container } = render(
      <Providers>
        <FileMetadata file={fakeFile} onOpenSystem={() => undefined} />
      </Providers>,
    );
    const section = container.querySelector("section");
    expect(section).not.toBeNull();
    const label = section && section.getAttribute("aria-label");
    expect(label && label.length).toBeGreaterThan(0);
    const dl = container.querySelector("dl");
    expect(dl).not.toBeNull();
    expect(container.querySelectorAll("dt").length).toBeGreaterThan(0);
    expect(container.querySelectorAll("dd").length).toBeGreaterThan(0);
  });

  it("open-in-system button has type attribute", () => {
    render(
      <Providers>
        <FileMetadata file={fakeFile} onOpenSystem={() => undefined} />
      </Providers>,
    );
    const btn = screen.getByRole("button");
    expect(btn.getAttribute("type")).toBe("button");
  });
});

describe("PreviewPane a11y", () => {
  it("loading state is announced via aria-live region", () => {
    const { container } = render(
      <Providers>
        <PreviewPane file={fakeFile} textContent={null} loading />
      </Providers>,
    );
    const status = container.querySelector('[role="status"]');
    expect(status).not.toBeNull();
    expect(status && status.getAttribute("aria-live")).toBe("polite");
  });
});
