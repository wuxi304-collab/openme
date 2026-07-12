// src/components/viewers/AudioEngine.ts
//
// Web Audio API playback engine. Owns:
//   - one shared AudioContext
//   - one AudioBufferSourceNode per playback (recreated on each play())
//   - one GainNode for volume/mute
//   - a ChannelSplitter + two AnalyserNodes for VU metering
//
// The engine exposes a minimal imperative API the React component layer
// can drive from useState/useEffect: load(buffer), play(), pause(),
// seek(timeSec), setVolume(), setMuted(), currentTime(), duration().
//
// Time tracking is done via audioContext.currentTime deltas against
// startedAtContextTime + startedAtBufferOffset; this is rock-solid
// (driven by the audio clock, not setInterval) and survives pause/resume
// correctly.

export type AudioEngineState = "idle" | "loading" | "ready" | "playing" | "paused" | "ended" | "error";

export type AudioEngineEventName = "timeupdate" | "statechange" | "ended" | "error";

export type AudioEngineListener<E extends AudioEngineEventName = AudioEngineEventName> =
  E extends "timeupdate"
    ? (currentTime: number, duration: number) => void
    : E extends "statechange"
      ? (state: AudioEngineState) => void
      : E extends "ended"
        ? () => void
        : (error: Error) => void;

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private leftAnalyser: AnalyserNode | null = null;
  private rightAnalyser: AnalyserNode | null = null;
  private buffer: AudioBuffer | null = null;
  private source: AudioBufferSourceNode | null = null;
  private startedAtContextTime = 0;
  private startedAtBufferOffset = 0;
  private pausedAtBufferOffset = 0;
  private state: AudioEngineState = "idle";
  private rafHandle: number | null = null;
  private volume = 1;
  private muted = false;
  private listeners: Map<AudioEngineEventName, Set<AudioEngineListener<AudioEngineEventName>>> = new Map();
  /** Optional A-B loop region (inclusive of `a`, exclusive of `b`). */
  private abLoop: { a: number; b: number } | null = null;

  /** Register an event listener. Returns an unsubscribe function. */
  on<E extends AudioEngineEventName>(event: E, fn: AudioEngineListener<E>): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(fn as AudioEngineListener<AudioEngineEventName>);
    return () => {
      set!.delete(fn as AudioEngineListener<AudioEngineEventName>);
    };
  }

  /** Lazy-create the AudioContext and routing. Must be called from a user
     *  gesture the first time. Subsequent calls reuse the same context. */
    private ensureContext(): AudioContext {
      if (!this.ctx) {
        const w = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
        const Ctor = w.AudioContext || w.webkitAudioContext;
        if (!Ctor) throw new Error("Web Audio API not supported in this environment");
        this.ctx = new Ctor();
        this.gainNode = this.ctx.createGain();
        this.gainNode.gain.value = this.muted ? 0 : this.volume;
        this.analyser = this.ctx.createAnalyser();
        this.analyser.fftSize = 1024;
        const splitter = this.ctx.createChannelSplitter(2);
        this.leftAnalyser = this.ctx.createAnalyser();
        this.rightAnalyser = this.ctx.createAnalyser();
        this.leftAnalyser.fftSize = 1024;
        this.rightAnalyser.fftSize = 1024;
        this.leftAnalyser.smoothingTimeConstant = 0.4;
        this.rightAnalyser.smoothingTimeConstant = 0.4;
        // Audio reaches speakers via splitter → destination (single tap, no extra
        // node in the audible path). The analyser is a metering-only tap off
        // gainNode; left/right analysers are metering taps off splitter.
        this.gainNode.connect(splitter);
        splitter.connect(this.ctx.destination);
        this.gainNode.connect(this.analyser);
        splitter.connect(this.leftAnalyser, 0);
        splitter.connect(this.rightAnalyser, 1);
      }
      return this.ctx;
    }

  /** Get the underlying AudioContext (null until first use). */
  getContext(): AudioContext | null {
    return this.ctx;
  }

  /** Get a single combined analyser (post-gain, pre-destination). */
  getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  /** Get the stereo analyser pair (L/R). Null until the first time the
   *  AudioContext has been initialised. */
  getAnalyserPair(): { left: AnalyserNode; right: AnalyserNode } | null {
    if (!this.leftAnalyser || !this.rightAnalyser) return null;
    return { left: this.leftAnalyser, right: this.rightAnalyser };
  }

  /** Load a new buffer. Stops any current playback. */
  load(buffer: AudioBuffer): void {
    // Touch the context so the analyser pair exists before UI reads it.
    this.ensureContext();
    this.stop();
    this.buffer = buffer;
    this.pausedAtBufferOffset = 0;
    this.setState("ready");
  }

  /** Start or resume playback. Returns true if a new source was started. */
  play(): boolean {
    const ctx = this.ensureContext();
    if (ctx.state === "suspended") {
      // Some Chromium autoplay policies suspend the context until the
      // first user gesture. Calling resume() makes it active.
      void ctx.resume();
    }
    if (!this.buffer || !this.gainNode) {
      this.setState("error");
      this.emitError(new Error("No audio buffer loaded"));
      return false;
    }
    if (this.state === "playing") return false;

    // Each play() creates a fresh AudioBufferSourceNode (Web Audio rule:
    // source nodes are single-use). We capture the start context time
    // so we can compute currentTime from `audioContext.currentTime`.
    const src = ctx.createBufferSource();
    src.buffer = this.buffer;
    src.connect(this.gainNode);
    src.onended = () => {
      // Distinguish a natural end vs a stop()/load() cancellation by
      // checking the state we were in when the source ended.
      if (this.source !== src) return;
      if (this.state !== "playing") return;
      this.source = null;
      this.pausedAtBufferOffset = 0;
      this.setState("ended");
      this.stopTicker();
      this.emitEnded();
    };
    const offset = this.pausedAtBufferOffset;
    const dur = this.buffer.duration - offset;
    if (dur <= 0) {
      this.pausedAtBufferOffset = 0;
      this.setState("ended");
      this.emitEnded();
      return false;
    }
    src.start(0, offset);
    this.startedAtContextTime = ctx.currentTime;
    this.startedAtBufferOffset = offset;
    this.source = src;
    this.setState("playing");
    this.startTicker();
    return true;
  }

  /** Pause playback (keeps the playhead where it is). */
  pause(): void {
    if (this.state !== "playing") return;
    const ctx = this.ctx;
    if (!ctx || !this.source) return;
    const offset = this.currentTime();
    try { this.source.stop(); } catch (_) { /* ignore */ }
    this.source = null;
    this.pausedAtBufferOffset = Math.max(0, Math.min(this.buffer ? this.buffer.duration : 0, offset));
    this.setState("paused");
    this.stopTicker();
  }

  /** Toggle play/pause. Returns the resulting state. */
  toggle(): boolean {
    if (this.state === "playing") {
      this.pause();
      return false;
    }
    return this.play();
  }

  /** Stop playback and reset the playhead to 0. */
  stop(): void {
    if (this.source) {
      try { this.source.stop(); } catch (_) { /* already stopped */ }
      this.source = null;
    }
    this.pausedAtBufferOffset = 0;
    this.stopTicker();
    if (this.buffer) this.setState("ready");
    else this.setState("idle");
  }

  /** Seek to a specific time in seconds. Returns the clamped time. */
  seek(timeSec: number): number {
    if (!this.buffer) return 0;
    const dur = this.buffer.duration;
    const t = Math.max(0, Math.min(dur, timeSec));
    const wasPlaying = this.state === "playing";
    if (this.source) {
      try { this.source.stop(); } catch (_) { /* already stopped */ }
      this.source = null;
    }
    this.pausedAtBufferOffset = t;
    if (wasPlaying) {
      this.play();
    } else {
      this.emitTimeUpdate(t, dur);
    }
    return t;
  }

  /** Volume in [0..1]. */
  setVolume(v: number): void {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.gainNode && !this.muted) this.gainNode.gain.value = this.volume;
  }

  getVolume(): number { return this.volume; }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.gainNode) this.gainNode.gain.value = muted ? 0 : this.volume;
  }

  isMuted(): boolean { return this.muted; }

  /** Current playback time in seconds. */
  currentTime(): number {
    if (!this.buffer) return 0;
    if (this.state === "playing" && this.ctx) {
      return Math.max(0, Math.min(this.buffer.duration, this.startedAtBufferOffset + (this.ctx.currentTime - this.startedAtContextTime)));
    }
    return this.pausedAtBufferOffset;
  }

  duration(): number { return this.buffer ? this.buffer.duration : 0; }

  getState(): AudioEngineState { return this.state; }

  /** Set or clear an A-B loop region. The region is honoured during
   *  playback by seeking back to `a` whenever the playhead crosses `b`. */
  setAbLoop(loop: { a: number; b: number } | null): void {
    this.abLoop = loop;
    if (this.abLoop && this.state === "playing") {
      const t = this.currentTime();
      if (t >= this.abLoop.b) this.seek(this.abLoop.a);
    }
  }

  getAbLoop(): { a: number; b: number } | null {
    return this.abLoop ? { ...this.abLoop } : null;
  }

  private setState(s: AudioEngineState): void {
    if (this.state === s) return;
    this.state = s;
    this.emitState(s);
  }

  private startTicker(): void {
    if (this.rafHandle != null) return;
    const tick = () => {
      if (this.state !== "playing") {
        this.rafHandle = null;
        return;
      }
      const t = this.currentTime();
      const d = this.duration();
      // A-B loop: when we cross `b`, jump back to `a` and keep playing.
      if (this.abLoop && t >= this.abLoop.b) {
        this.seek(this.abLoop.a);
        this.emitTimeUpdate(this.abLoop.a, d);
        this.rafHandle = requestAnimationFrame(tick);
        return;
      }
      this.emitTimeUpdate(t, d);
      this.rafHandle = requestAnimationFrame(tick);
    };
    this.rafHandle = requestAnimationFrame(tick);
  }

  private stopTicker(): void {
    if (this.rafHandle != null) {
      cancelAnimationFrame(this.rafHandle);
      this.rafHandle = null;
    }
  }

  /** Tear down the engine. Frees the AudioContext. */
  dispose(): void {
    this.stop();
    this.stopTicker();
    this.listeners.clear();
    if (this.ctx) {
      try { this.ctx.close(); } catch (_) { /* ignore */ }
      this.ctx = null;
      this.gainNode = null;
      this.analyser = null;
      this.leftAnalyser = null;
      this.rightAnalyser = null;
    }
    this.buffer = null;
    // Reset state explicitly so callers can verify teardown.
    this.setState("idle");
  }

  // --- typed emit helpers ---
  private emitTimeUpdate(currentTime: number, duration: number): void {
    const set = this.listeners.get("timeupdate");
    if (!set) return;
    for (const fn of set) {
      try { (fn as AudioEngineListener<"timeupdate">)(currentTime, duration); }
      catch (err) { console.warn("AudioEngine listener threw:", err); }
    }
  }

  private emitState(state: AudioEngineState): void {
    const set = this.listeners.get("statechange");
    if (!set) return;
    for (const fn of set) {
      try { (fn as AudioEngineListener<"statechange">)(state); }
      catch (err) { console.warn("AudioEngine listener threw:", err); }
    }
  }

  private emitError(error: Error): void {
    const set = this.listeners.get("error");
    if (!set) return;
    for (const fn of set) {
      try { (fn as AudioEngineListener<"error">)(error); }
      catch (err) { console.warn("AudioEngine listener threw:", err); }
    }
  }

  private emitEnded(): void {
    const set = this.listeners.get("ended");
    if (!set) return;
    for (const fn of set) {
      try { (fn as AudioEngineListener<"ended">)(); }
      catch (err) { console.warn("AudioEngine listener threw:", err); }
    }
  }
}
