import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadFileTabData } from "./fileOpenPipeline";
import type { FileInfo } from "../types";
import type { Translator } from "../i18n";

const baseFile: FileInfo = {
  id: "file-1",
  path: "C:/demo/report.txt",
  name: "report.txt",
  extension: ".txt",
  size: 12,
  modified_at: "2026-01-01T00:00:00.000Z",
  file_type: "code",
  opened_at: "2026-01-01T00:00:00.000Z",
};

const electronAPI = {
  convertDocx: vi.fn(),
  convertExcel: vi.fn(),
  readBinary: vi.fn(),
  readFileContent: vi.fn(),
};

const noopT: Translator = (key) => key;

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("window", { electronAPI });
});

describe("loadFileTabData", () => {
  it("loads text-like categories through readFileContent", async () => {
    electronAPI.readFileContent.mockResolvedValue({ type: "text", data: "hello" });

    const result = await loadFileTabData(baseFile, "code", noopT);

    expect(electronAPI.readFileContent).toHaveBeenCalledWith(baseFile.path);
    expect(result.content).toBe("hello");
  });

  it("loads binary preview categories through readBinary", async () => {
    electronAPI.readBinary.mockResolvedValue({ success: true, data: "base64" });

    const result = await loadFileTabData({ ...baseFile, extension: ".pdf", path: "C:/demo/file.pdf" }, "pdf", noopT);

    expect(electronAPI.readBinary).toHaveBeenCalledWith("C:/demo/file.pdf", 100 * 1024 * 1024);
    expect(result.binaryData).toBe("base64");
    expect(result.mimeType).toBe("application/pdf");
  });

  it("converts docx through the Office path", async () => {
    electronAPI.convertDocx.mockResolvedValue({ success: true, html: "<p>ok</p>" });

    const result = await loadFileTabData({ ...baseFile, extension: ".docx", path: "C:/demo/file.docx" }, "office", noopT);

    expect(electronAPI.convertDocx).toHaveBeenCalledWith("C:/demo/file.docx");
    expect(result.officeData).toEqual({ type: "docx", html: "<p>ok</p>" });
  });

  it("does not eagerly read route-only unsafe categories", async () => {
    const result = await loadFileTabData({ ...baseFile, extension: ".exe", path: "C:/demo/setup.exe" }, "package", noopT);

    expect(result).toEqual({});
    expect(electronAPI.readBinary).not.toHaveBeenCalled();
    expect(electronAPI.readFileContent).not.toHaveBeenCalled();
  });
});
