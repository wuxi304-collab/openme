// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { I18nProvider } from "../../i18n";
import MediaViewer from "./MediaViewer";

function renderMedia(props: Parameters<typeof MediaViewer>[0]) {
  return render(
    <I18nProvider>
      <MediaViewer {...props} />
    </I18nProvider>
  );
}

describe("MediaViewer polish", () => {
  beforeEach(() => {
    try {
      window.localStorage.setItem("openme.lang", "en");
    } catch {
      // ignore
    }
    // Stub electronAPI for the source-load effect
    (window as any).electronAPI = {
      getMediaUrl: vi.fn().mockResolvedValue("file:///fake.mp3"),
      openInSystem: vi.fn(),
    };
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders audio toolbar with filename chip and codec hint", async () => {
    renderMedia({ filePath: "Music/test-song.mp3", kind: "audio" });
    expect(screen.getByRole("toolbar", { name: "Audio toolbar" })).toBeTruthy();
    expect(screen.getByText("test-song.mp3")).toBeTruthy();
    expect(screen.getByLabelText("Audio playback area")).toBeTruthy();
  });

  it("renders video toolbar with filename chip and stage label", () => {
    renderMedia({ filePath: "Movies/clip.mp4", kind: "video" });
    expect(screen.getByRole("toolbar", { name: "Video toolbar" })).toBeTruthy();
    expect(screen.getByText("clip.mp4")).toBeTruthy();
    expect(screen.getByLabelText("Video playback area")).toBeTruthy();
  });

    // PR #144 — MediaViewer must call the same hooks regardless of filePath
    // transitions. Earlier revisions did `if (isLosslessExtension(...)) return ...`
    // before any hooks, which made hook counts depend on the prop and threw
    // "Rendered fewer hooks than expected" when the user switched between
    // lossless and lossy tabs within the same MediaViewer instance. Lossless
    // dispatch now lives in ViewerRouter; MediaViewer only renders the simple
    // <audio>/<video> deck and always calls the same hooks.
    it("does not crash on rerender with a different filePath (hooks stay stable)", () => {
      const { rerender } = renderMedia({ filePath: "Music/track-01.mp3", kind: "audio" });
      expect(screen.getByRole("toolbar", { name: "Audio toolbar" })).toBeTruthy();
      // Rerender with a different lossy path — hook count must stay identical.
      expect(() => rerender(<MediaViewer filePath="Music/track-02.aac" kind="audio" />)).not.toThrow();
      // Rerender from lossy to (theoretically) lossless — MediaViewer no longer
      // takes the early-return branch, so the hook count stays at 5 throughout.
      // ViewerRouter is what dispatches lossless files to LosslessAudioPlayer
      // before MediaViewer ever mounts.
      expect(() => rerender(<MediaViewer filePath="Music/album.flac" kind="audio" />)).not.toThrow();
      expect(screen.getByText("album.flac")).toBeTruthy();
    });

    it("renders the simple audio deck even when given a lossless extension (dispatch is upstream)", async () => {
      // Lossless dispatch happens in ViewerRouter. If MediaViewer itself is
      // mounted with a .flac path (e.g. via the regression test above), it
      // must still render without crashing and surface the standard audio
      // toolbar — the codec probe will then decide whether the deck works.
      renderMedia({ filePath: "Music/song.flac", kind: "audio" });
      expect(screen.getByRole("toolbar", { name: "Audio toolbar" })).toBeTruthy();
      expect(screen.getByText("song.flac")).toBeTruthy();
    });
  });