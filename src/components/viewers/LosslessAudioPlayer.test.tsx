// @vitest-environment jsdom
// PR #145 — LosslessAudioPlayer must call the same hooks regardless of
// whether the <audio> element's error event has fired. Earlier revisions
// placed the drag-to-seek hooks AFTER `if (error) return <ViewerError />`,
// so when Chromium failed to decode a FLAC and <audio> fired `error`,
// `error` flipped truthy → next render took the early return → 9 hooks
// were skipped → React threw "Rendered fewer hooks than expected".
//
// PR #155 — When the universal audio decoder (ffmpeg-static in the main
// process) rejects, the player must surface that failure with a real
// ViewerError card showing the decoder title, hint text, and the raw
// ffmpeg error in a collapsible <details> block, AND must push a
// one-shot toast so the user gets a heads-up even if focus is elsewhere.
//
// These tests don't pretend to drive the player; they only verify the
// render contract: the same hook count on every render of the same
// component instance.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
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

  // PR #155 — Audio decoder failure surface.
  //
  // Install the same mock IPC bridge as audioFfmpegDecoder.test.ts, but
  // configure it to emit a done event with ok=false so the decoder rejects
  // with an [FFMPEG_DECODE_FAILED] error. The player should:
  //   1. render the ViewerError card with the decode-failure title
  //   2. include the ffmpeg error message in a collapsible <details> block
  //   3. push a one-shot toast with kind="error"
  //
  // The bridge is created via a custom helper inside this block (rather
  // than imported from audioFfmpegDecoder.test.ts) because we need to
  // control the failure timing and the test fixtures there are
  // intentionally happy-path.

  type Listener<T> = (payload: T) => void;
  interface FailingBridge {
    decodeAudioPcm: ReturnType<typeof vi.fn>;
    cancelAudioDecode: ReturnType<typeof vi.fn>;
    getFfmpegInfo: ReturnType<typeof vi.fn>;
    getMediaUrl: ReturnType<typeof vi.fn>;
    getAudioMetadata: ReturnType<typeof vi.fn>;
    listAudioInFolder: ReturnType<typeof vi.fn>;
    openInSystem: ReturnType<typeof vi.fn>;
    selectFolderDialog: ReturnType<typeof vi.fn>;
    onAudioPcmMeta: (cb: Listener<any>) => () => void;
    onAudioPcmChunk: (cb: Listener<any>) => () => void;
    onAudioPcmDone: (cb: Listener<any>) => () => void;
    emitDone: (payload: any) => void;
  }

  function installFailingBridge(): FailingBridge {
    // jsdom doesn't ship an AudioContext; install a minimal mock so the
    // AudioFfmpegDecoder's ensureContext() call doesn't throw on construction.
        // All methods below are no-op stubs because the test only verifies
        // render-side failure surface — no real audio graph runs.
        class MockAudioContext {
          state: "running" | "suspended" | "closed" = "running";
          currentTime = 0;
          destination = {} as unknown as AudioDestinationNode;
          createBuffer(channels: number, length: number, sampleRate: number): AudioBuffer {
            const chans: Float32Array[] = [];
            for (let c = 0; c < channels; c++) chans.push(new Float32Array(length));
            return { sampleRate, length, duration: length / sampleRate, numberOfChannels: channels, getChannelData(c: number) { return chans[c]; }, copyFromChannel: () => undefined, copyToChannel: () => undefined } as unknown as AudioBuffer;
          }
          createMediaElementSource(_el: HTMLMediaElement) {
            return { connect: () => undefined, disconnect: () => undefined } as unknown as MediaElementAudioSourceNode;
          }
          createGain() {
            return { gain: { value: 1 }, connect: () => undefined, disconnect: () => undefined } as unknown as GainNode;
          }
          createAnalyser() {
            return {
              fftSize: 2048, frequencyBinCount: 1024, smoothingTimeConstant: 0.8,
              getByteFrequencyData: () => undefined,
              getByteTimeDomainData: () => undefined,
              connect: () => undefined, disconnect: () => undefined,
            } as unknown as AnalyserNode;
          }
          createChannelSplitter(_count: number) {
            return { connect: () => undefined, disconnect: () => undefined } as unknown as ChannelSplitterNode;
          }
          async close() { this.state = "closed"; }
          async resume() { this.state = "running"; }
          async suspend() { this.state = "suspended"; }
        }
    (globalThis as unknown as { AudioContext: typeof AudioContext }).AudioContext = MockAudioContext as unknown as typeof AudioContext;
    (window as unknown as { AudioContext: typeof AudioContext }).AudioContext = MockAudioContext as unknown as typeof AudioContext;

    const doneListeners: Array<Listener<any>> = [];
    let seq = 0;
    const bridge: FailingBridge = {
      decodeAudioPcm: vi.fn(async () => {
        seq += 1;
        const requestId = `audec-fail-${seq}`;
        // Emit a failed done event asynchronously so the decoder's await
        // resolves into the catch path with [FFMPEG_DECODE_FAILED].
        setTimeout(() => {
          bridge.emitDone({
            requestId,
            ok: false,
            totalBytes: 0,
            error: { code: "FFMPEG_DECODE_FAILED", message: "Invalid data found when processing input" },
          });
        }, 0);
        return { ok: true, requestId };
      }),
      cancelAudioDecode: vi.fn(),
      getFfmpegInfo: vi.fn(async () => ({ available: true, version: "test" })),
      getMediaUrl: vi.fn().mockResolvedValue("file:///fake.flac"),
      getAudioMetadata: vi.fn().mockResolvedValue({ ok: false }),
      listAudioInFolder: vi.fn().mockResolvedValue({ ok: false, files: [] }),
      openInSystem: vi.fn(),
      selectFolderDialog: vi.fn().mockResolvedValue(""),
      onAudioPcmMeta: () => () => undefined,
      onAudioPcmChunk: () => () => undefined,
      onAudioPcmDone: (cb) => { doneListeners.push(cb); return () => { const i = doneListeners.indexOf(cb); if (i >= 0) doneListeners.splice(i, 1); }; },
      emitDone: (payload) => { for (const cb of doneListeners) cb(payload); },
    };
    (window as unknown as { electronAPI: unknown }).electronAPI = bridge;
    return bridge;
  }

  function renderPlayerWithToastCapture(filePath: string) {
    const pushToast = vi.fn();
    const result = render(
      <I18nProvider>
        <ToastProvider value={{ pushToast }}>
          <LosslessAudioPlayer filePath={filePath} />
        </ToastProvider>
      </I18nProvider>
    );
    return { ...result, pushToast };
  }

  describe("LosslessAudioPlayer audio-decoder failure (PR #155)", () => {
    let bridge: FailingBridge;
    beforeEach(() => {
      try { window.localStorage.setItem("openme.lang", "en"); } catch { /* ignore */ }
      bridge = installFailingBridge();
    });

    afterEach(() => {
      cleanup();
      vi.clearAllMocks();
    });

    it("renders the ViewerError decode-failure card when ffmpeg rejects", async () => {
          renderPlayerWithToastCapture("Music/broken.flac");

          // The decoder rejects asynchronously, so the ViewerError card with
          // the decode-failure title should appear within a few ticks. Allow
          // generous time because the decode path goes through several async
          // hops: invoke → setTimeout → emitDone → resolveDone → throw → setState.
          await waitFor(
            () => {
              expect(screen.getByText("Audio decoder failed")).toBeTruthy();
            },
            { timeout: 3000 }
          );
          expect(screen.getByText(/OpenMe's built-in ffmpeg decoder/)).toBeTruthy();
          // Sanity-check the bridge was actually invoked.
          expect(bridge.decodeAudioPcm).toHaveBeenCalled();
        });

    it("includes the raw ffmpeg error in a collapsible details block", async () => {
      renderPlayerWithToastCapture("Music/broken.flac");

      await waitFor(
        () => {
          expect(screen.getByText("Technical details")).toBeTruthy();
        },
        { timeout: 3000 }
      );
      // The <summary> collapses the error; the <code> shows the message.
      const summary = screen.getByText("Technical details");
      expect(summary.tagName.toLowerCase()).toBe("summary");
      expect(summary.closest("details")).toBeTruthy();
      expect(summary.closest("details")?.textContent ?? "").toMatch(/Invalid data/);
    });

    it("pushes a one-shot error toast when the decoder rejects", async () => {
      const { pushToast } = renderPlayerWithToastCapture("Music/broken.flac");

      await waitFor(
        () => {
          expect(pushToast).toHaveBeenCalledTimes(1);
        },
        { timeout: 3000 }
      );
      const [kind, message] = pushToast.mock.calls[0] as [string, string];
      expect(kind).toBe("error");
      expect(message).toMatch(/Audio decoder failed/);
      expect(message).toMatch(/Invalid data found when processing input/);
    });
  });