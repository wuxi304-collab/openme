import { describe, expect, it } from "vitest";
import { formatFileSize, formatRelativeTime } from "./format";

describe("formatFileSize", () => {
  it("returns the byte count for sub-kilobyte sizes", () => {
    expect(formatFileSize(0, "en")).toBe("0 B");
    expect(formatFileSize(0, "zh")).toBe("0 B");
    expect(formatFileSize(512, "en")).toBe("512 B");
    expect(formatFileSize(1023, "en")).toBe("1023 B");
  });

  it("renders KB / MB / GB thresholds with one decimal for ≥ 10", () => {
    expect(formatFileSize(1024, "en")).toMatch(/KB$/);
    expect(formatFileSize(1024 * 1.5, "en")).toBe("1.5 KB");
    expect(formatFileSize(1024 * 1024, "en")).toBe("1 MB");
    expect(formatFileSize(1024 * 1024 * 12.34, "en")).toBe("12.3 MB");
    expect(formatFileSize(1024 * 1024 * 1024 * 2.5, "en")).toBe("2.5 GB");
  });

  it("falls back to dashes for invalid input", () => {
    expect(formatFileSize(NaN, "en")).toBe("—");
    expect(formatFileSize(-1, "en")).toBe("—");
    expect(formatFileSize(Number.POSITIVE_INFINITY, "en")).toBe("—");
  });

  it("keeps the same unit suffix in zh as in en", () => {
    expect(formatFileSize(1024 * 1024 * 5, "zh")).toMatch(/MB$/);
    expect(formatFileSize(1024 * 1024 * 1024 * 1.2, "zh")).toMatch(/GB$/);
  });
});

describe("formatRelativeTime", () => {
  const now = new Date("2026-07-09T12:00:00Z");

  it("renders 'just now' within 5 seconds", () => {
    expect(formatRelativeTime("2026-07-09T11:59:57Z", "en", now)).toBe("just now");
    expect(formatRelativeTime("2026-07-09T11:59:57Z", "zh", now)).toBe("刚刚");
  });

  it("renders seconds / minutes / hours in both locales", () => {
    expect(formatRelativeTime("2026-07-09T11:59:30Z", "en", now)).toBe("30 seconds ago");
    expect(formatRelativeTime("2026-07-09T11:59:30Z", "zh", now)).toBe("30 秒前");
    expect(formatRelativeTime("2026-07-09T11:55:00Z", "en", now)).toBe("5 minutes ago");
    expect(formatRelativeTime("2026-07-09T11:55:00Z", "zh", now)).toBe("5 分钟前");
    expect(formatRelativeTime("2026-07-09T09:00:00Z", "en", now)).toBe("3 hours ago");
    expect(formatRelativeTime("2026-07-09T09:00:00Z", "zh", now)).toBe("3 小时前");
  });

  it("renders days for sub-month gaps", () => {
    expect(formatRelativeTime("2026-07-07T12:00:00Z", "en", now)).toBe("2 days ago");
    expect(formatRelativeTime("2026-07-07T12:00:00Z", "zh", now)).toBe("2 天前");
  });

  it("falls back to an absolute date for month-scale gaps", () => {
    expect(formatRelativeTime("2026-01-15T08:30:00Z", "en", now)).toMatch(/^2026-01-15 /);
    expect(formatRelativeTime("2026-01-15T08:30:00Z", "zh", now)).toMatch(/^2026-01-15 /);
  });

  it("handles singular vs plural in English", () => {
    expect(formatRelativeTime("2026-07-09T11:59:00Z", "en", now)).toBe("1 minute ago");
    expect(formatRelativeTime("2026-07-09T11:00:00Z", "en", now)).toBe("1 hour ago");
    expect(formatRelativeTime("2026-07-08T12:00:00Z", "en", now)).toBe("1 day ago");
  });

  it("returns a dash for invalid timestamps", () => {
    expect(formatRelativeTime("not-a-date", "en", now)).toBe("—");
    expect(formatRelativeTime(Number.NaN, "en", now)).toBe("—");
  });

  it("ignores locale switching (renders per-call lang, not ambient)", () => {
    // Two calls in quick succession in different locales must each pick
    // the right plural branch — no leakage of one call's resources into
    // the next.
    expect(formatRelativeTime("2026-07-09T11:55:00Z", "en", now)).toBe("5 minutes ago");
    expect(formatRelativeTime("2026-07-09T11:55:00Z", "zh", now)).toBe("5 分钟前");
    expect(formatRelativeTime("2026-07-09T11:59:00Z", "en", now)).toBe("1 minute ago");
    expect(formatRelativeTime("2026-07-09T11:59:00Z", "zh", now)).toBe("1 分钟前");
  });

  it("renders both just-now and second-boundary correctly", () => {
    // < 5s gap → just-now branch; == 5s falls into "5 seconds ago".
    expect(formatRelativeTime("2026-07-09T11:59:56Z", "en", now)).toBe("just now");
    expect(formatRelativeTime("2026-07-09T11:59:56Z", "zh", now)).toBe("刚刚");
    expect(formatRelativeTime("2026-07-09T11:59:55Z", "en", now)).toBe("5 seconds ago");
    expect(formatRelativeTime("2026-07-09T11:59:55Z", "zh", now)).toBe("5 秒前");
  });

  it("handles future timestamps by falling back to absolute date", () => {
    // System clock skew can make this happen; formatRelativeTime should
    // never render negative "n seconds in the future" copy.
    expect(formatRelativeTime("2026-07-10T12:00:00Z", "en", now)).toMatch(/^2026-07-10 /);
  });
});