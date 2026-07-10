// @vitest-environment jsdom
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useRef } from "react";
import { useAudioMeter } from "./useAudioMeter";

afterEach(() => { cleanup(); });

interface FakeAnalyserNode {
  fftSize: number;
  smoothingTimeConstant: number;
  getByteTimeDomainData: (buf: Uint8Array) => void;
  connect: ReturnType<typeof vi.fn>;
}

function installFakeAudioGraph() {
  const analyserConnect = vi.fn();
  const splitterConnect = vi.fn();
  const sourceConnect = vi.fn();
  const ctxClose = vi.fn(() => Promise.resolve());
  const ctxResume = vi.fn(() => Promise.resolve());
  const createAnalyser = vi.fn((): FakeAnalyserNode => ({
    fftSize: 1024,
    smoothingTimeConstant: 0.4,
    getByteTimeDomainData: vi.fn(),
    connect: analyserConnect,
  }));
  const createChannelSplitter = vi.fn(() => ({ connect: splitterConnect }));
  const createMediaElementSource = vi.fn((_el: HTMLAudioElement) => ({
    connect: sourceConnect,
  }));
  class FakeAudioContext {
    state: "running" | "suspended" = "suspended";
    destination = {};
    createMediaElementSource = createMediaElementSource;
    createChannelSplitter = createChannelSplitter;
    createAnalyser = createAnalyser;
    resume = ctxResume;
    close = ctxClose;
  }
  (window as unknown as { AudioContext: typeof FakeAudioContext }).AudioContext = FakeAudioContext;
  return { analyserConnect, splitterConnect, sourceConnect, ctxClose, ctxResume, createAnalyser, createChannelSplitter, createMediaElementSource };
}

function Harness({ playing, sourceReady }: { playing: boolean; sourceReady: boolean }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { frame, floorDb } = useAudioMeter({ audioRef, playing, sourceReady });
  return (
    <div>
      <audio ref={audioRef} data-testid="audio" />
      <span data-testid="left-db">{frame.leftDb}</span>
      <span data-testid="right-db">{frame.rightDb}</span>
      <span data-testid="peak-left">{frame.peakLeftDb}</span>
      <span data-testid="peak-right">{frame.peakRightDb}</span>
      <span data-testid="floor">{floorDb}</span>
    </div>
  );
}

describe("useAudioMeter", () => {
  let fakeGraph: ReturnType<typeof installFakeAudioGraph>;

  beforeEach(() => {
    fakeGraph = installFakeAudioGraph();
  });

  afterEach(() => {
    delete (window as unknown as { AudioContext?: unknown }).AudioContext;
    vi.restoreAllMocks();
  });

  it("renders the empty frame when not playing", () => {
    const { getByTestId } = render(<Harness playing={false} sourceReady={true} />);
    expect(Number(getByTestId("left-db").textContent)).toBe(-60);
    expect(Number(getByTestId("right-db").textContent)).toBe(-60);
    expect(Number(getByTestId("peak-left").textContent)).toBe(-60);
    expect(Number(getByTestId("floor").textContent)).toBe(-60);
  });

  it("builds an AudioContext graph on first mount with source", () => {
    render(<Harness playing={false} sourceReady={true} />);
    expect(fakeGraph.createMediaElementSource).toHaveBeenCalledTimes(1);
    expect(fakeGraph.createChannelSplitter).toHaveBeenCalledTimes(1);
    expect(fakeGraph.createAnalyser).toHaveBeenCalledTimes(2);
    expect(fakeGraph.sourceConnect).toHaveBeenCalled(); // to destination + splitter
    expect(fakeGraph.splitterConnect).toHaveBeenCalledTimes(2); // to L + R analyser
  });

  it("does not rebuild the graph on re-render with the same sourceReady", () => {
    const { rerender } = render(<Harness playing={false} sourceReady={true} />);
    rerender(<Harness playing={false} sourceReady={true} />);
    expect(fakeGraph.createMediaElementSource).toHaveBeenCalledTimes(1);
  });

  it("resumes the AudioContext when playback starts", () => {
    const { rerender } = render(<Harness playing={false} sourceReady={true} />);
    rerender(<Harness playing={true} sourceReady={true} />);
    expect(fakeGraph.ctxResume).toHaveBeenCalled();
  });

  it("schedules a requestAnimationFrame loop while playing", () => {
    const rafSpy = vi.spyOn(window, "requestAnimationFrame");
    const { rerender } = render(<Harness playing={false} sourceReady={true} />);
    rafSpy.mockClear();
    act(() => { rerender(<Harness playing={true} sourceReady={true} />); });
    expect(rafSpy).toHaveBeenCalled();
  });

  it("cancels the animation frame when playback stops", () => {
    const cancelSpy = vi.spyOn(window, "cancelAnimationFrame");
    const { rerender } = render(<Harness playing={true} sourceReady={true} />);
    cancelSpy.mockClear();
    act(() => { rerender(<Harness playing={false} sourceReady={true} />); });
    expect(cancelSpy).toHaveBeenCalled();
  });

  it("closes the AudioContext on unmount", () => {
    const { unmount } = render(<Harness playing={false} sourceReady={true} />);
    unmount();
    expect(fakeGraph.ctxClose).toHaveBeenCalled();
  });

  it("does nothing when AudioContext is unavailable", () => {
    delete (window as unknown as { AudioContext?: unknown }).AudioContext;
    const { getByTestId } = render(<Harness playing={true} sourceReady={true} />);
    expect(Number(getByTestId("left-db").textContent)).toBe(-60);
    expect(fakeGraph.createMediaElementSource).not.toHaveBeenCalled();
  });

  it("does not build the graph when source is not ready", () => {
    render(<Harness playing={false} sourceReady={false} />);
    expect(fakeGraph.createMediaElementSource).not.toHaveBeenCalled();
  });
});