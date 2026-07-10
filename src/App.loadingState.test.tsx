// @vitest-environment jsdom
// PR #116 — App.tsx LoadingState + main element polish
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { I18nProvider } from "./i18n";

// LoadingState is not exported by App.tsx; we re-implement the same minimal
// mount to verify the role/aria-live/aria-busy attributes we expect by
// reading the source directly. This is a documentation/regression test
// rather than a behavioural one — the source is the contract.

afterEach(() => {
  cleanup();
  try { window.localStorage.removeItem("openme.lang"); } catch {}
});

beforeEach(() => {
  try { window.localStorage.setItem("openme.lang", "en"); } catch {}
});

describe("App.tsx polish (PR #116)", () => {
  it("App.tsx LoadingState source declares role=status + aria-live=polite + aria-busy=true", async () => {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const file = path.resolve(process.cwd(), "src/App.tsx");
    const src = await fs.readFile(file, "utf8");
    // Locate the LoadingState function body
    const match = src.match(/function LoadingState\(\)[\s\S]*?\n\}/);
    expect(match, "LoadingState function not found in App.tsx").toBeTruthy();
    const body = match![0];
    expect(body).toContain('role="status"');
    expect(body).toContain('aria-live="polite"');
    expect(body).toContain('aria-busy="true"');
    expect(body).toContain('aria-hidden="true"'); // dot row decorative
  });

  it("App.tsx <main> declares role=main + aria-label via i18n", async () => {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const file = path.resolve(process.cwd(), "src/App.tsx");
    const src = await fs.readFile(file, "utf8");
    expect(src).toMatch(/<main[^>]*id="main-content"[^>]*role="main"/);
    expect(src).toMatch(/aria-label=\{t\("appMainAria"\)\}/);
  });
});