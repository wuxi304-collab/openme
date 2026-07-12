// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { I18nProvider } from "../../i18n";
import { ToastProvider } from "../useToast";
import { setCachedFfmpegAvailability } from "../../utils/audioFfmpegDecoder";
import LosslessAudioPlayer from "./LosslessAudioPlayer";

const QUEUE_KEY = "openme.audio.queue.v1";

const sampleQueue = [
  { path: "/music/a.flac", name: "a.flac", durationSec: 200 },
  { path: "/music/b.flac", name: "b.flac", durationSec: 180 },
  { path: "/music/c.flac", name: "c.flac", durationSec: 240 },
];

function seedQueue(items = sampleQueue, folder = "/music") {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify({ folder, items }));
  } catch {
    /* ignore */
  }
}

beforeEach(() => {
  try {
    localStorage.clear();
    localStorage.setItem("openme.lang", "en");
  } catch {
    /* ignore */
  }
  // Force ffmpeg off so the player uses the <audio> fallback in jsdom,
  // avoiding the "Ctor is not a constructor" path that flips decodeError.
  try { setCachedFfmpegAvailability(false); } catch { /* ignore */ }

  (window as any).electronAPI = {
    openInSystem: vi.fn(),
    selectFolderDialog: vi.fn().mockResolvedValue(null),
    listAudioInFolder: vi.fn().mockResolvedValue({ ok: true, folder: "/x", files: [] }),
    getFfmpegInfo: vi.fn().mockResolvedValue({ available: false }),
    // ffmpeg path must return a never-resolving invoke so the decoder doesn't
    // push the component into the ViewerError early-return. Returning
    // undefined here crashes the `.decode()` promise with the wrong shape.
    decodeAudioPcm: vi.fn().mockImplementation(
      () => new Promise(() => { /* never resolves — engine stays initializing */ }),
    ),
    cancelAudioDecode: vi.fn(),
    getMediaUrl: vi.fn().mockResolvedValue("file:///fake.flac"),
    getAudioMetadata: vi.fn().mockResolvedValue({
      ok: true,
      path: "/music/a.flac",
      format: { container: "FLAC", codec: "FLAC", lossless: true, sampleRate: 44100, bitsPerSample: 16, channels: 2, channelLayout: "stereo", bitrate: null, durationSec: 200, encoder: null },
      tag: { title: "Track A", artist: "Artist", album: "Album", albumArtist: null, year: 2024, genre: null, track: 1, trackTotal: 3, disc: null, discTotal: null, composer: null, comment: null },
    }),
    getAudioFormat: vi.fn().mockResolvedValue({
      ok: true,
      format: { container: "FLAC", codec: "FLAC", sampleRate: 44100, bitsPerSample: 16, channels: 2, bitrate: null, durationSec: 200 },
    }),
    onAudioPcmMeta: vi.fn(() => () => {}),
    onAudioPcmChunk: vi.fn(() => () => {}),
    onAudioPcmDone: vi.fn(() => () => {}),
    onAudioPcmError: vi.fn(() => () => {}),
  };
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  try { localStorage.clear(); } catch { /* ignore */ }
});

function renderPlayer() {
  return render(
    <I18nProvider>
      <ToastProvider value={{ pushToast: vi.fn() }}>
        <LosslessAudioPlayer filePath="/music/a.flac" />
      </ToastProvider>
    </I18nProvider>,
  );
}

describe("LosslessAudioPlayer queue listbox", () => {
  it("renders the queue as a listbox with aria-label and options", async () => {
    seedQueue();
    renderPlayer();
    await waitFor(() => {
      expect(screen.getByRole("listbox")).toBeTruthy();
    });
    const listbox = screen.getByRole("listbox");
    expect(listbox.getAttribute("aria-label")).toMatch(/queue/i);
    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(3);
    expect(options[0].getAttribute("aria-selected")).toBe("true");
    expect(options[1].getAttribute("aria-selected")).toBe("false");
    expect(options[2].getAttribute("aria-selected")).toBe("false");
  });


  it("assigns a stable id per option for aria-activedescendant", async () => {
    seedQueue();
    renderPlayer();
    await waitFor(() => {
      expect(screen.getByRole("listbox")).toBeTruthy();
    });
    const listbox = screen.getByRole("listbox");
    expect(listbox.getAttribute("aria-activedescendant")).toBe("ll-queue-opt-0");
    expect(document.getElementById("ll-queue-opt-0")).toBeTruthy();
    expect(document.getElementById("ll-queue-opt-1")).toBeTruthy();
    expect(document.getElementById("ll-queue-opt-2")).toBeTruthy();
  });

  it("uses roving tabindex so only the focused row is in the tab sequence", async () => {
    seedQueue();
    renderPlayer();
    await waitFor(() => {
      expect(screen.getByRole("listbox")).toBeTruthy();
    });
    const buttons = document.querySelectorAll<HTMLButtonElement>(".ll-queue-open");
    expect(buttons[0].tabIndex).toBe(0);
    expect(buttons[1].tabIndex).toBe(-1);
    expect(buttons[2].tabIndex).toBe(-1);
  });

  it("ArrowDown moves aria-activedescendant to the next option", async () => {
    seedQueue();
    renderPlayer();
    await waitFor(() => {
      expect(screen.getByRole("listbox")).toBeTruthy();
    });
    const listbox = screen.getByRole("listbox");
    listbox.focus();
    fireEvent.keyDown(listbox, { key: "ArrowDown" });
    expect(listbox.getAttribute("aria-activedescendant")).toBe("ll-queue-opt-1");
    // After re-render, the roving tabindex has flipped so index 1's button
    // is the one in the tab sequence. jsdom's focus move is timing-sensitive
    // here — the contract we verify is aria-activedescendant + roving
    // tabindex, which together drive every assistive tech experience.
    await waitFor(() => {
      const buttons = document.querySelectorAll<HTMLButtonElement>(".ll-queue-open");
      expect(buttons[0].tabIndex).toBe(-1);
      expect(buttons[1].tabIndex).toBe(0);
    });
    fireEvent.keyDown(listbox, { key: "ArrowDown" });
    expect(listbox.getAttribute("aria-activedescendant")).toBe("ll-queue-opt-2");
  });

  it("ArrowUp moves focus to the previous option", async () => {
    seedQueue();
    renderPlayer();
    await waitFor(() => {
      expect(screen.getByRole("listbox")).toBeTruthy();
    });
    const listbox = screen.getByRole("listbox");
    listbox.focus();
    fireEvent.keyDown(listbox, { key: "ArrowUp" });
    expect(listbox.getAttribute("aria-activedescendant")).toBe("ll-queue-opt-0");
    fireEvent.keyDown(listbox, { key: "ArrowDown" });
    fireEvent.keyDown(listbox, { key: "ArrowDown" });
    expect(listbox.getAttribute("aria-activedescendant")).toBe("ll-queue-opt-2");
    fireEvent.keyDown(listbox, { key: "ArrowUp" });
    expect(listbox.getAttribute("aria-activedescendant")).toBe("ll-queue-opt-1");
  });

  it("Home and End jump to the first and last options", async () => {
    seedQueue();
    renderPlayer();
    await waitFor(() => {
      expect(screen.getByRole("listbox")).toBeTruthy();
    });
    const listbox = screen.getByRole("listbox");
    listbox.focus();
    fireEvent.keyDown(listbox, { key: "End" });
    expect(listbox.getAttribute("aria-activedescendant")).toBe("ll-queue-opt-2");
    fireEvent.keyDown(listbox, { key: "Home" });
    expect(listbox.getAttribute("aria-activedescendant")).toBe("ll-queue-opt-0");
  });

  it("ArrowDown clamps at the last option (no wrap-around)", async () => {
    seedQueue();
    renderPlayer();
    await waitFor(() => {
      expect(screen.getByRole("listbox")).toBeTruthy();
    });
    const listbox = screen.getByRole("listbox");
    listbox.focus();
    fireEvent.keyDown(listbox, { key: "End" });
    fireEvent.keyDown(listbox, { key: "ArrowDown" });
    expect(listbox.getAttribute("aria-activedescendant")).toBe("ll-queue-opt-2");
    fireEvent.keyDown(listbox, { key: "ArrowUp" });
    fireEvent.keyDown(listbox, { key: "ArrowUp" });
    fireEvent.keyDown(listbox, { key: "ArrowUp" });
    expect(listbox.getAttribute("aria-activedescendant")).toBe("ll-queue-opt-0");
  });

  it("aria-label contains 'Track N of Total' and 'Now playing' for the currently playing row", async () => {
    seedQueue();
    renderPlayer();
    await waitFor(() => {
      expect(screen.getByRole("listbox")).toBeTruthy();
    });
    const options = screen.getAllByRole("option");
    const buttons = options.map((opt) => opt.querySelector("button.ll-queue-open") as HTMLButtonElement | null);
    expect(buttons[0]?.getAttribute("aria-label")).toMatch(/Track 1 of 3/);
    expect(buttons[0]?.getAttribute("aria-label")).toMatch(/Now playing/);
    expect(buttons[1]?.getAttribute("aria-label")).toMatch(/Track 2 of 3/);
    expect(buttons[1]?.getAttribute("aria-label")).not.toMatch(/Now playing/);
    expect(buttons[2]?.getAttribute("aria-label")).toMatch(/Track 3 of 3/);
  });

  it("zh locale produces Chinese aria-labels and the playing suffix", async () => {
    try { localStorage.setItem("openme.lang", "zh"); } catch { /* ignore */ }
    seedQueue();
    renderPlayer();
    await waitFor(() => {
      expect(screen.getByRole("listbox")).toBeTruthy();
    });
    const listbox = screen.getByRole("listbox");
    expect(listbox.getAttribute("aria-label")).toMatch(/播放队列/);
    const options = screen.getAllByRole("option");
    const buttons = options.map((opt) => opt.querySelector("button.ll-queue-open") as HTMLButtonElement | null);
    expect(buttons[0]?.getAttribute("aria-label")).toMatch(/第 1 首，共 3 首/);
    expect(buttons[0]?.getAttribute("aria-label")).toMatch(/正在播放/);
    expect(buttons[1]?.getAttribute("aria-label")).toMatch(/第 2 首，共 3 首/);
  });
});
