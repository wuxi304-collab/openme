// @vitest-environment jsdom
// PR #146 — AudioEngine unit tests. Covers the basic playback state
// machine: load → ready, play/pause toggle, seek, A-B loop, dispose.
//
// We synthesise a 1-second 48 kHz / stereo sine buffer directly so the
// tests don't need to read any real audio files.

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { AudioEngine } from "./AudioEngine";

type AnyWindow = Window & { webkitAudioContext?: typeof AudioContext };

// jsdom doesn't ship an AudioContext by default. We mock the minimum the
// engine touches: createGain / createAnalyser / createBufferSource /
// createChannelSplitter / close / resume.
//
// The mock tracks every `node.connect(target)` call so we can assert
// that the audio graph actually reaches ctx.destination. (PR #146 had
// a regression where the wiring left splitter → analysers dangling and
// the audible path gainNode → analyser → destination was a single point
// of failure; the test below verifies the new wiring.)
function installAudioContextMock() {
  const listeners: Array<() => void> = [];
  // graph: Map<nodeId, Array<{ target: nodeId | "destination", channel?: number }>>
  const graph = new Map<string, Array<{ target: string; channel?: number }>>();
  let nodeCounter = 0;
  function newNodeId(): string { nodeCounter += 1; return `n${nodeCounter}`; }
  function trackConnect(from: string, to: string, channel?: number): void {
    let list = graph.get(from);
    if (!list) { list = []; graph.set(from, list); }
    list.push({ target: to, channel });
  }

let mockNow = 0;
class MockAudioNode {
  public id: string;
  constructor() { this.id = newNodeId(); graph.set(this.id, []); }
  connect(other: any, channel?: number) {
    if (other === "destination" || (other && other.id === "__ctx_destination__")) {
      trackConnect(this.id, "__ctx_destination__", channel);
    } else if (other && typeof other === "object" && "id" in other) {
      trackConnect(this.id, (other as { id: string }).id, channel);
    }
    return other;
  }
}
class MockAudioContext {
  public state: "running" | "suspended" | "closed" = "running";
  // We expose currentTime as a getter so the engine reads the latest value.
  public get currentTime() { return mockNow; }
  public destination = { id: "__ctx_destination__" } as unknown as AudioDestinationNode;
  createGain(): any {
    const node = new MockAudioNode();
    return Object.assign(node, { gain: { value: 1 } });
  }
  createAnalyser(): any {
    const node = new MockAudioNode();
    return Object.assign(node, { fftSize: 1024, smoothingTimeConstant: 0 });
  }
  createBufferSource(): any {
    const node = new MockAudioNode();
    return Object.assign(node, {
      buffer: null,
      onended: null as null | (() => void),
      start: () => undefined,
      stop: () => undefined,
    });
  }
  createChannelSplitter(_n: number): any {
    return new MockAudioNode();
  }
  createBuffer(channels: number, length: number, sampleRate: number): AudioBuffer {
    const chans: Float32Array[] = [];
    for (let c = 0; c < channels; c++) chans.push(new Float32Array(length));
    const buf = {
      sampleRate,
      length,
      duration: length / sampleRate,
      numberOfChannels: channels,
      getChannelData(c: number) { return chans[c]; },
      copyFromChannel: () => undefined,
      copyToChannel: () => undefined,
    } as unknown as AudioBuffer;
    return buf;
  }
  close(): Promise<void> { (this as unknown as { state: "closed" }).state = "closed"; return Promise.resolve(); }
  resume(): Promise<void> {
    (this as unknown as { state: "running" }).state = "running";
    return Promise.resolve();
  }
  // Helper for tests: does any path from the given node reach destination?
  reachesDestination(nodeId: string): boolean {
    const seen = new Set<string>();
    const stack: string[] = [nodeId];
    while (stack.length) {
      const cur = stack.pop()!;
      if (cur === "__ctx_destination__") return true;
      if (seen.has(cur)) continue;
      seen.add(cur);
      const edges = graph.get(cur) || [];
      for (const e of edges) stack.push(e.target);
    }
    return false;
  }
}
(globalThis as any).AudioContext = MockAudioContext;
(window as AnyWindow).AudioContext = MockAudioContext as unknown as typeof AudioContext;

  (globalThis as any).__mockAudioGraph = graph;
  (globalThis as any).__mockAudioContextCtor = MockAudioContext;

  // requestAnimationFrame polyfill — flush every tick synchronously when
  // we run `tickNow(0)`. The engine uses rAF for its time-update ticker.
  let rafId = 0;
  const rafs = new Map<number, FrameRequestCallback>();
  (globalThis as any).requestAnimationFrame = (cb: FrameRequestCallback) => {
    rafId += 1;
    rafs.set(rafId, cb);
    return rafId;
  };
  (globalThis as any).cancelAnimationFrame = (id: number) => { rafs.delete(id); };

  return {
    tick(advanceSeconds = 0.01) {
      // Bump the mock AudioContext clock so currentTime() moves.
      mockNow += advanceSeconds;
      for (const [id, cb] of Array.from(rafs.entries())) {
        rafs.delete(id);
        cb(performance.now());
      }
    },
  };
}

describe("AudioEngine (PR #146)", () => {
  let raf: { tick: () => void };

  beforeEach(() => {
    raf = installAudioContextMock();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("starts in idle state and reports zero duration", () => {
    const eng = new AudioEngine();
    expect(eng.getState()).toBe("idle");
    expect(eng.duration()).toBe(0);
    expect(eng.currentTime()).toBe(0);
    eng.dispose();
  });

  it("transitions idle → ready on load() and exposes the analyser pair", () => {
    const eng = new AudioEngine();
    const ctx = new AudioContext();
    const buf = ctx.createBuffer(2, 48000, 48000); // 1 second stereo
    eng.load(buf);
    expect(eng.getState()).toBe("ready");
    expect(eng.duration()).toBeCloseTo(1.0, 5);
    const pair = eng.getAnalyserPair();
    expect(pair?.left).toBeTruthy();
    expect(pair?.right).toBeTruthy();
    eng.dispose();
  });

  it("emits timeupdate while playing", () => {
    const eng = new AudioEngine();
    const ctx = new AudioContext();
    const buf = ctx.createBuffer(2, 48000, 48000);
    eng.load(buf);
    const seen: number[] = [];
    const off = eng.on("timeupdate", (t) => { seen.push(t); });
    eng.play();
    expect(eng.getState()).toBe("playing");
    raf.tick();
    off();
    expect(seen.length).toBeGreaterThan(0);
    expect(seen[0]).toBeGreaterThanOrEqual(0);
    eng.dispose();
  });

  it("seek() updates currentTime and preserves play state", () => {
    const eng = new AudioEngine();
    const ctx = new AudioContext();
    const buf = ctx.createBuffer(2, 48000, 48000);
    eng.load(buf);
    eng.play();
    raf.tick();
    const before = eng.currentTime();
    const newPos = eng.seek(0.5);
    expect(newPos).toBeCloseTo(0.5, 5);
    expect(eng.getState()).toBe("playing");
    expect(before).toBeGreaterThanOrEqual(0);
    eng.dispose();
  });

  it("pause() preserves the playhead and flips state to paused", () => {
    const eng = new AudioEngine();
    const ctx = new AudioContext();
    const buf = ctx.createBuffer(2, 48000, 48000);
    eng.load(buf);
    eng.play();
    raf.tick();
    eng.pause();
    expect(eng.getState()).toBe("paused");
    expect(eng.currentTime()).toBeGreaterThan(0);
    eng.dispose();
  });

  it("toggle() flips between playing and paused", () => {
    const eng = new AudioEngine();
    const ctx = new AudioContext();
    const buf = ctx.createBuffer(2, 48000, 48000);
    eng.load(buf);
    eng.toggle();
    expect(eng.getState()).toBe("playing");
    eng.toggle();
    expect(eng.getState()).toBe("paused");
    eng.dispose();
  });

  it("setVolume() clamps to [0,1]", () => {
    const eng = new AudioEngine();
    eng.setVolume(2.5);
    expect(eng.getVolume()).toBe(1);
    eng.setVolume(-0.5);
    expect(eng.getVolume()).toBe(0);
    eng.setVolume(0.42);
    expect(eng.getVolume()).toBeCloseTo(0.42, 5);
  });

  it("setMuted() silences without altering volume", () => {
    const eng = new AudioEngine();
    eng.setVolume(0.8);
    eng.setMuted(true);
    expect(eng.isMuted()).toBe(true);
    expect(eng.getVolume()).toBe(0.8);
    eng.setMuted(false);
    expect(eng.isMuted()).toBe(false);
  });

  it("off() via setAbLoop(null) clears the loop", () => {
    const eng = new AudioEngine();
    eng.setAbLoop({ a: 0.5, b: 1.5 });
    expect(eng.getAbLoop()).toEqual({ a: 0.5, b: 1.5 });
    eng.setAbLoop(null);
    expect(eng.getAbLoop()).toBe(null);
  });

  it("dispose() tears down state without throwing", () => {
    const eng = new AudioEngine();
    const ctx = new AudioContext();
    const buf = ctx.createBuffer(2, 4800, 48000);
    eng.load(buf);
    expect(() => eng.dispose()).not.toThrow();
    expect(eng.getState()).toBe("idle");
  });

    it("audio graph wiring reaches ctx.destination (PR #146 hotfix)", () => {
      // Regression guard: the previous wiring left the splitter→analysers
      // chain dangling and relied on gainNode→analyser→destination as the
      // sole audio path — a single point of failure if the analyser is
      // muted or its channelCountMode is wrong. The fix routes audio via
      // splitter → destination and keeps the analyser as a metering-only
      // tap. Verify that:
      //   (a) the splitter has a direct edge to ctx.destination, AND
      //   (b) the BufferSource (after play) can reach destination.
      const graph = (globalThis as { __mockAudioGraph: Map<string, Array<{ target: string; channel?: number }>> }).__mockAudioGraph;
      const eng = new AudioEngine();
      const ctx = new AudioContext();
      const buf = ctx.createBuffer(2, 48000, 48000);
      eng.load(buf);
      eng.play();
      const ctxAsMock = ctx as unknown as { reachesDestination: (id: string) => boolean };
      // (a) Find the splitter by topology: 3 outgoing edges (dest + 2 analysers).
      let splitterId: string | null = null;
      for (const [id, edges] of graph) {
        if (edges.length === 3) { splitterId = id; break; }
      }
      expect(splitterId).toBeTruthy();
      // splitter must connect to destination.
      const destEdges = graph.get(splitterId!)?.filter((e) => e.target === "__ctx_destination__") ?? [];
      expect(destEdges.length).toBeGreaterThanOrEqual(1);
      // From splitter we must be able to traverse to destination.
      expect(ctxAsMock.reachesDestination(splitterId!)).toBe(true);
      // (b) Source — last node added during play() — must reach destination.
      const oneEdgeNodes: string[] = [];
      for (const [id, edges] of graph) {
        if (edges.length === 1) oneEdgeNodes.push(id);
      }
      oneEdgeNodes.sort();
      const sourceId = oneEdgeNodes[oneEdgeNodes.length - 1];
      expect(sourceId).toBeTruthy();
      expect(ctxAsMock.reachesDestination(sourceId!)).toBe(true);
      eng.dispose();
    });
});
