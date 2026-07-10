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
});