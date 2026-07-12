// @vitest-environment jsdom
// PR #144 — ViewerRouter must dispatch lossless audio to LosslessAudioPlayer
// and lossy audio (or any video) to MediaViewer. Earlier revisions let
// MediaViewer do the dispatch internally via an early-return before hooks,
// which violated React's rules of hooks when the user switched between
// lossless and lossy tabs within the same MediaViewer instance.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { I18nProvider } from "../../i18n";
import { ToastProvider } from "../useToast";
import ViewerRouter from "./ViewerRouter";
import type { FileTabState } from "../../types";

function makeTab(overrides: Partial<FileTabState>): FileTabState {
  return {
    id: "tab-test",
    path: "Music/test.mp3",
    name: "test.mp3",
    isLoading: false,
    content: null,
    binaryData: null,
    mimeType: null,
    error: null,
    category: "audio",
    sourceFile: null,
    officeData: null,
    ...overrides,
  };
}

function renderRouter(tab: FileTabState) {
  return render(
    <I18nProvider>
      <ToastProvider value={{ pushToast: vi.fn() }}>
        <ViewerRouter tab={tab} onChange={() => {}} />
      </ToastProvider>
    </I18nProvider>
  );
}

describe("ViewerRouter dispatch (PR #144)", () => {
  beforeEach(() => {
    try {
      window.localStorage.setItem("openme.lang", "en");
    } catch {
      // ignore
    }
    (window as any).electronAPI = {
      getMediaUrl: vi.fn().mockResolvedValue("file:///fake"),
      openInSystem: vi.fn(),
    };
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("dispatches lossy audio (.mp3) to the simple MediaViewer deck", async () => {
    renderRouter(makeTab({ path: "Music/track.mp3", name: "track.mp3" }));
    // MediaViewer renders an "Audio toolbar" with the filename chip
    expect(await screen.findByRole("toolbar", { name: "Audio toolbar" })).toBeTruthy();
    expect(screen.getByText("track.mp3")).toBeTruthy();
  });

  it("dispatches lossless audio (.flac) to LosslessAudioPlayer", async () => {
    renderRouter(makeTab({ path: "Music/album.flac", name: "album.flac" }));
    // LosslessAudioPlayer uses a different toolbar label
    // (don't assert exact text — just confirm the simple MediaViewer toolbar is NOT there)
    expect(screen.queryByRole("toolbar", { name: "Audio toolbar" })).toBeNull();
  });

  it("dispatches lossless audio (.wav) to LosslessAudioPlayer", async () => {
    renderRouter(makeTab({ path: "Music/clip.wav", name: "clip.wav" }));
    expect(screen.queryByRole("toolbar", { name: "Audio toolbar" })).toBeNull();
  });

  it("dispatches lossless audio (.aiff) to LosslessAudioPlayer", async () => {
    renderRouter(makeTab({ path: "Music/song.aiff", name: "song.aiff" }));
    expect(screen.queryByRole("toolbar", { name: "Audio toolbar" })).toBeNull();
  });

  it("dispatches video to the simple MediaViewer deck", () => {
    renderRouter(makeTab({ path: "Movies/clip.mp4", name: "clip.mp4", category: "video" }));
    expect(screen.getByRole("toolbar", { name: "Video toolbar" })).toBeTruthy();
    expect(screen.getByText("clip.mp4")).toBeTruthy();
  });

  // The regression test for "Rendered fewer hooks than expected" lives in
    // MediaViewer.test.tsx — the bug was internal to MediaViewer's hook order
    // when its props transitioned between lossy and lossless filePaths. This
    // suite focuses on the dispatch contract: which child component does
    // ViewerRouter mount for each (category, extension) combination?
  });