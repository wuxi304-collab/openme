// Capture and serialize runtime errors so they can be persisted to disk
// (for bug reports) and rendered in the per-viewer / app-level ErrorBoundary
// fallback UI.
//
// Design notes
// ------------
//
// 1. The renderer doesn't have `process` or `fs`, so we cannot write to
//    disk from here directly. Instead, we collect structured payloads
//    (latest console.error / window.error / unhandledrejection events)
//    and hand them to the main process via the `save-error-log` IPC for
//    persistence.
//
// 2. The buffer is a fixed-size ring — only the last `BUFFER_LIMIT`
//    console messages are kept. This guarantees memory stays bounded
//    even when a runaway effect logs thousands of lines.
//
// 3. We deliberately preserve `Date.now()` rather than the full
//    locale string so that the host OS, not the renderer, decides how
//    to render timestamps when the JSON is opened in another tool.
//    Useful when triaging logs across machines.

const BUFFER_LIMIT = 50;

export interface RingEntry {
  /** epoch milliseconds when the entry was captured. */
  ts: number;
  /** Where the entry came from: "console" / "window" / "unhandled" / "boundary". */
  source: "console" | "window" | "unhandled" | "boundary";
  /** Level hint for the consumer (the boundary uses this to pick color). */
  level: "error" | "warn" | "info";
  /** Stringified message + args. Already pre-stringified by the caller. */
  text: string;
}

export interface AppErrorMeta {
  appVersion?: string;
  platform?: string;
  locale?: string;
  userAgent?: string;
  url?: string;
}

export interface PersistedErrorLog {
  /** ISO timestamp when the log was assembled. */
  capturedAt: string;
  /** Wall-clock epoch ms when the log was assembled (handy for diffing). */
  capturedAtMs: number;
  /** The actual error / boundary event that triggered the save. */
  error: { name: string; message: string; stack?: string };
  /** Last N console + window events preceding the error. */
  ring: RingEntry[];
  /** Metadata about the running host. */
  meta: AppErrorMeta;
}

type Listener = (entry: RingEntry) => void;

class ErrorRingBuffer {
  private entries: RingEntry[] = [];
  private listeners = new Set<Listener>();

  record(source: RingEntry["source"], level: RingEntry["level"], text: string) {
    const entry: RingEntry = { ts: Date.now(), source, level, text };
    this.entries.push(entry);
    if (this.entries.length > BUFFER_LIMIT) this.entries.shift();
    for (const listener of this.listeners) {
      try { listener(entry); } catch { /* swallow */ }
    }
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  snapshot(): RingEntry[] {
    return [...this.entries];
  }

  clear() { this.entries = []; }
}

export const errorRing = new ErrorRingBuffer();

// Format any value into a printable string. Avoids "[object Object]" for
// non-string args by falling back to JSON when available.
function stringify(arg: unknown): string {
  if (arg instanceof Error) return arg.stack ? `${arg.name}: ${arg.message}\n${arg.stack}` : `${arg.name}: ${arg.message}`;
  if (typeof arg === "string") return arg;
  if (typeof arg === "number" || typeof arg === "boolean") return String(arg);
  try { return JSON.stringify(arg); } catch { return String(arg); }
}

// Compose the args-array passed to console.* into a single line.
function join(args: unknown[]): string {
  return args.map((a) => stringify(a)).join(" ");
}

let installed = false;

/**
 * Hook global console.error / window.onerror / unhandledrejection into the
 * ring buffer. Idempotent — safe to call multiple times.
 */
export function installErrorCapture(): void {
  if (installed) return;
  installed = true;
  if (typeof window === "undefined") return;

  const original = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    errorRing.record("console", "error", join(args).slice(0, 4096));
    return original(...args);
  };
  const originalWarn = console.warn.bind(console);
  console.warn = (...args: unknown[]) => {
    errorRing.record("console", "warn", join(args).slice(0, 4096));
    return originalWarn(...args);
  };

  window.addEventListener("error", (event) => {
    errorRing.record("window", "error", join([
      event.message || "(no message)",
      event.filename ? `@ ${event.filename}:${event.lineno}:${event.colno}` : "",
    ]).slice(0, 4096));
  });
  window.addEventListener("unhandledrejection", (event) => {
    errorRing.record("unhandled", "error", join([
      "unhandledrejection:",
      stringify(event.reason),
    ]).slice(0, 4096));
  });
}

/**
 * Build the persisted payload for a boundary hit. Pulls the latest
 * ring entries (capped at BUFFER_LIMIT), includes a snapshot of host
 * metadata from the supplied meta, and assembles a structured
 * JSON-ready object.
 */
export function serializeErrorLog(error: Error | null | undefined, meta: AppErrorMeta = {}): PersistedErrorLog {
  const ring = errorRing.snapshot();
  return {
    capturedAt: new Date().toISOString(),
    capturedAtMs: Date.now(),
    error: {
      name: error?.name ?? "UnknownError",
      message: error?.message ?? "(no message)",
      stack: error?.stack,
    },
    ring,
    meta: {
      appVersion: meta.appVersion,
      // userAgentData isn't in the default TS Navigator lib — fall back to
      // (legacy) navigator.platform so older browsers / jsdom still report.
      platform: typeof navigator !== "undefined"
        ? ((navigator as { userAgentData?: { platform?: string } }).userAgentData?.platform
            ?? (navigator as { platform?: string }).platform
            ?? "unknown")
        : "unknown",
      locale: typeof document !== "undefined" ? (document.documentElement.lang || "unknown") : "unknown",
      userAgent: typeof navigator !== "undefined" ? (navigator.userAgent ?? "unknown") : "unknown",
      url: typeof location !== "undefined" ? (location.href ?? "unknown") : "unknown",
      ...meta,
    },
  };
}

export function buildFilename(error: Error | null | undefined): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const tag = (error?.name ?? "error").replace(/[^a-z0-9_-]/gi, "_").toLowerCase();
  return `openme-error-${stamp}-${tag}.json`;
}
