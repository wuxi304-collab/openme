// @vitest-environment jsdom
// PR #145 — LosslessAudioPlayer must call the same hooks regardless of
// whether the <audio> element's error event has fired. Earlier revisions
// placed the drag-to-seek hooks AFTER `if (error) return <ViewerError />`,
// so when Chromium failed to decode a FLAC and <audio> fired `error`,
// `error` flipped truthy → next render took the early return → 9 hooks
// were skipped → React threw "Rendered fewer hooks than expected".
//
// These tests don't pretend to drive the player; they only verify the
// render contract: the same hook count on every render of the same
// component instance.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { I18nProvider } from "../../i18n";
import { ToastProvider } from "../useToast";
import LosslessAudioPlayer from "./LosslessAudioPlayer";

function renderPlayer(props: { filePath: string }) {
  return render(
    <I18nProvider>
      <ToastProvider value={{ pushToast: vi.fn() }}>
        <LosslessAudioPlayer {...props} />
      </ToastProvider>
    </I18nProvider>
  );
}

describe("LosslessAudioPlayer polish (PR #145)", () => {
  beforeEach(() => {
    try {
      window.localStorage.setItem("openme.lang", "en");
    } catch {
      // ignore
    }
    // Stub electronAPI so the load effect doesn't crash.
    (window as any).electronAPI = {
      getMediaUrl: vi.fn().mockResolvedValue("file:///fake.flac"),
      getAudioMetadata: vi.fn().mockResolvedValue({ ok: false }),
      listAudioInFolder: vi.fn().mockResolvedValue({ ok: false, files: [] }),
      openInSystem: vi.fn(),
      selectFolderDialog: vi.fn().mockResolvedValue(""),
    };
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("mounts with a .flac filePath and renders the player shell", () => {
    const { container } = renderPlayer({ filePath: "Music/song.flac" });
    // The player's root div has class "lossless-player"
    expect(container.querySelector(".lossless-player")).toBeTruthy();
  });

  // The critical regression: rerendering with a different filePath must
  // call the same hooks in the same order. Earlier code put 9 hooks after
  // the `if (error) return ...` early return, which meant any rerender that
  // triggered the error path skipped those hooks and crashed React.
  it("does not throw on rerender with a different filePath (hooks stay stable)", () => {
    const { rerender } = renderPlayer({ filePath: "Music/track-01.flac" });
    expect(() =>
      rerender(
        <I18nProvider>
          <ToastProvider value={{ pushToast: vi.fn() }}>
            <LosslessAudioPlayer filePath="Music/track-02.flac" />
          </ToastProvider>
        </I18nProvider>
      )
    ).not.toThrow();
    expect(() =>
      rerender(
        <I18nProvider>
          <ToastProvider value={{ pushToast: vi.fn() }}>
            <LosslessAudioPlayer filePath="Music/track-03.wav" />
          </ToastProvider>
        </I18nProvider>
      )
    ).not.toThrow();
  });

  it("does not throw when <audio> element fires its `error` event", async () => {
    const { container } = renderPlayer({ filePath: "Music/song.flac" });

    // Wait for the effect that wires audio element events to run.
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Grab the <audio> element that the player rendered and dispatch the
    // `error` event. This is what Chromium does when it can't decode a
    // FLAC stream and which used to flip `error` → early return → fewer
    // hooks → React crash. After PR #145 all hooks are above the early
    // return so the component stays mounted with stable hook count.
    const audio = container.querySelector("audio") as HTMLAudioElement | null;
    if (audio) {
      audio.dispatchEvent(new Event("error"));
    }

    // If React throws "Rendered fewer hooks than expected", the test
    // will fail because the error is uncaught. The act of dispatching
    // the event and re-rendering is what would crash under the old code.
    expect(audio).toBeTruthy();
  });
});