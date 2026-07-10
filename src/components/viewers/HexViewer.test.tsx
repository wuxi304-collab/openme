// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../../i18n";
import HexViewer from "./HexViewer";

// btoa("Hello, World!") === "SGVsbG8sIFdvcmxkIQ=="
const HELLO_B64 = "SGVsbG8sIFdvcmxkIQ==";

// 13 bytes "Hello, World!" → 50 4B 03 04 (PK\x03\x04 -- ZIP magic) padded
// with zeros to a 16-byte row, giving us a recognizable search target.
function makeZipLikeBuffer(): Uint8Array {
  const out = new Uint8Array(64);
  const magic = [0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x08, 0x00];
  out.set(magic, 0);
  // ASCII "Hello" at offset 0x20 for the text-search leg of the test.
  out.set([0x48, 0x65, 0x6c, 0x6c, 0x6f], 0x20);
  return out;
}

function toBase64(buffer: Uint8Array): string {
  let binary = "";
  for (let index = 0; index < buffer.length; index += 1) {
    binary += String.fromCharCode(buffer[index]);
  }
  return btoa(binary);
}

function renderHex(props: { base64Data: string; fileName?: string }) {
  try { window.localStorage.setItem("openme.lang", "en"); } catch { /* ignore */ }
  return render(
    <I18nProvider>
      <HexViewer base64Data={props.base64Data} fileName={props.fileName ?? "blob.bin"} />
    </I18nProvider>
  );
}

beforeEach(() => {
  // Reset locale + DOM before each test so locale-pinned text doesn't
  // leak across tests.
  try { window.localStorage.setItem("openme.lang", "en"); } catch { /* ignore */ }
});

afterEach(() => {
  cleanup();
  try { window.localStorage.removeItem("openme.lang"); } catch { /* ignore */ }
});

describe("HexViewer", () => {
  it("renders the file name in the toolbar", () => {
    renderHex({ base64Data: HELLO_B64, fileName: "greeting.txt" });
    expect(screen.queryByText("greeting.txt")).not.toBeNull();
  });

  it("renders header row + one data row per 16 bytes", () => {
    // 32-byte payload = 2 data rows + 1 header.
    const buffer = new Uint8Array(32).fill(0xab);
    renderHex({ base64Data: toBase64(buffer) });
    const stage = screen.getByLabelText("Hexadecimal byte view");
    const rows = within(stage).getAllByText(/^[0-9A-F]{8}$/);
    expect(rows.length).toBeGreaterThanOrEqual(2);
  });

  it("shows an empty-state message for 0-byte files", () => {
    renderHex({ base64Data: "" });
    expect(screen.queryByText("File is empty")).not.toBeNull();
  });

  it("shows the truncated banner when file exceeds the render cap", () => {
    // 300 KiB payload -- well past the 256 KiB render cap.
    const buffer = new Uint8Array(300 * 1024);
    renderHex({ base64Data: toBase64(buffer) });
    expect(screen.queryByText(/Showing first/)).not.toBeNull();
  });

  it("accepts space-separated hex pairs in the search box", () => {
    renderHex({ base64Data: toBase64(makeZipLikeBuffer()) });
    const input = screen.getByPlaceholderText(/Search bytes/);
    fireEvent.change(input, { target: { value: "50 4B 03 04" } });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    expect(screen.queryByText(/1\/1 matches/)).not.toBeNull();
  });

  it("accepts ASCII text as search input", () => {
    renderHex({ base64Data: toBase64(makeZipLikeBuffer()) });
    const input = screen.getByPlaceholderText(/Search bytes/);
    fireEvent.change(input, { target: { value: "Hello" } });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    expect(screen.queryByText(/1\/1 matches/)).not.toBeNull();
  });

  it("reports no-match for missing sequences without crashing", () => {
    renderHex({ base64Data: toBase64(makeZipLikeBuffer()) });
    const input = screen.getByPlaceholderText(/Search bytes/);
    fireEvent.change(input, { target: { value: "DE AD BE EF" } });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    expect(screen.queryByText("No matches")).not.toBeNull();
  });

  it("cycles through matches with the Next / Previous buttons", () => {
    const buffer = new Uint8Array(256);
    buffer.set([0xaa, 0xbb], 0);
    buffer.set([0xaa, 0xbb], 32);
    renderHex({ base64Data: toBase64(buffer) });
    const input = screen.getByPlaceholderText(/Search bytes/);
    fireEvent.change(input, { target: { value: "AA BB" } });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    expect(screen.queryByText(/1\/2 matches/)).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.queryByText(/2\/2 matches/)).not.toBeNull();
  });

  it("copies the offset to clipboard when an offset cell is clicked", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    renderHex({ base64Data: HELLO_B64 });
    const offsetButton = screen.getAllByText(/^00000000$/)[0];
    fireEvent.click(offsetButton);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(writeText).toHaveBeenCalledWith("0x00000000");
  });
});
