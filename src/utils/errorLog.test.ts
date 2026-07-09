// @vitest-environment jsdom
import { describe, expect, it, beforeEach, vi } from "vitest";
import { errorRing, installErrorCapture, serializeErrorLog, buildFilename } from "./errorLog";

describe("errorRing", () => {
  beforeEach(() => errorRing.clear());

  it("records entries and exposes a snapshot in insertion order", () => {
    errorRing.record("console", "info", "hello");
    errorRing.record("console", "warn", "world");
    expect(errorRing.snapshot()).toEqual([
      { ts: expect.any(Number), source: "console", level: "info", text: "hello" },
      { ts: expect.any(Number), source: "console", level: "warn", text: "world" },
    ]);
  });

  it("caps the buffer at 50 entries (oldest first)", () => {
    for (let i = 0; i < 60; i++) errorRing.record("console", "info", `msg-${i}`);
    const snap = errorRing.snapshot();
    expect(snap).toHaveLength(50);
    expect(snap[0].text).toBe("msg-10");
    expect(snap[snap.length - 1].text).toBe("msg-59");
  });

  it("notifies subscribers and detaches them on unsubscribe", () => {
    const callback = vi.fn();
    const detach = errorRing.subscribe(callback);
    errorRing.record("boundary", "error", "boom");
    expect(callback).toHaveBeenCalledTimes(1);
    detach();
    errorRing.record("boundary", "error", "again");
    expect(callback).toHaveBeenCalledTimes(1);
  });
});

describe("installErrorCapture", () => {
  beforeEach(() => errorRing.clear());

  it("hooks console.error / console.warn into the ring", () => {
    // jsdom always exposes window + console
    installErrorCapture();
    console.error("from-error");
    console.warn("from-warn");
    const snap = errorRing.snapshot();
    expect(snap.map((e) => e.text)).toEqual(["from-error", "from-warn"]);
    expect(snap.map((e) => e.level)).toEqual(["error", "warn"]);
  });

  it("replaces stringified errors with their name + stack", () => {
    installErrorCapture();
    const err = Object.assign(new Error("kaboom"), { name: "KaboomError" });
    console.error("error-prefix:", err);
    const snap = errorRing.snapshot();
    expect(snap[0].text).toMatch(/KaboomError: kaboom/);
    expect(snap[0].text).toMatch(/error-prefix:/);
  });

  it("stringifies non-string args via JSON", () => {
    installErrorCapture();
    console.warn({ a: 1, b: { c: [2, 3] } });
    expect(errorRing.snapshot()[0].text).toContain('"a":1');
  });
});

describe("serializeErrorLog", () => {
  beforeEach(() => errorRing.clear());

  it("captures the error name / message / stack plus the ring buffer", () => {
    errorRing.record("console", "info", "preceding message");
    const err = new Error("the bad thing happened");
    const payload = serializeErrorLog(err, { appVersion: "1.2.3-test" });
    expect(payload.error.message).toBe("the bad thing happened");
    expect(payload.error.stack).toContain("Error: the bad thing happened");
    expect(payload.ring).toHaveLength(1);
    expect(payload.meta.appVersion).toBe("1.2.3-test");
    expect(payload.capturedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(payload.capturedAtMs).toBeGreaterThan(0);
  });

  it("handles a null / undefined error gracefully", () => {
    errorRing.clear();
    const payload = serializeErrorLog(null);
    expect(payload.error.name).toBe("UnknownError");
    expect(payload.error.message).toBe("(no message)");
    expect(payload.error.stack).toBeUndefined();
    expect(payload.ring).toEqual([]);
  });

  it("fills in derived metadata when caller leaves it blank", () => {
    const payload = serializeErrorLog(new Error("x"));
    expect(payload.meta.platform).toBeDefined();
    expect(payload.meta.userAgent).toBeDefined();
    expect(payload.meta.url).toBeDefined();
  });
});

describe("buildFilename", () => {
  it("produces a timestamped, sanitized filename", () => {
    const fname = buildFilename(Object.assign(new Error("Bad/Name"), { name: "Bad/Name" }));
    expect(fname).toMatch(/^openme-error-\d{4}-\d{2}-\d{2}T.*-bad_name\.json$/);
  });

  it("falls back to 'error' when there is no error", () => {
    expect(buildFilename(null)).toMatch(/^openme-error-.*-error\.json$/);
  });
});
