// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/* PR #118 — Chrome decoration (promote emil tokens + accent line + vignette + hover-gate)
 *
 * Pure-source assertions: every change in this PR lives in src/index.css.
 * We verify the contracts by reading the static file and matching the
 * structural pieces we just added.
 *
 * The tokens were previously scoped to :root[data-theme="dark"] — which
 * meant light-scheme users got `0ms` durations and the browser's default
 * `ease` keyword (not emil's strong curves). PR #118 promotes the
 * motion tokens into the global :root so both themes inherit.
 */

const ROOT = process.cwd();
const CSS = readFileSync(join(ROOT, "src/index.css"), "utf8");

describe("chrome-decoration · global motion tokens", () => {
  it("declares --ease-out / --ease-in-out / --ease-drawer in the GLOBAL :root", () => {
    // Find the first :root block (no [data-theme] qualifier).
    const globalRoot = CSS.match(/:root\s*\{[\s\S]*?\n\}/);
    expect(globalRoot).toBeTruthy();
    const block = globalRoot![0];
    expect(block).toMatch(/--ease-out\s*:\s*cubic-bezier\(0\.23,\s*1,\s*0\.32,\s*1\)/);
    expect(block).toMatch(/--ease-in-out\s*:/);
    expect(block).toMatch(/--ease-drawer\s*:/);
  });

  it("declares the four-tier duration scale + stagger-step in :root", () => {
    const globalRoot = CSS.match(/:root\s*\{[\s\S]*?\n\}/)![0];
    expect(globalRoot).toMatch(/--dur-press\s*:\s*140ms/);
    expect(globalRoot).toMatch(/--dur-fast\s*:\s*200ms/);
    expect(globalRoot).toMatch(/--dur-base\s*:\s*\d+ms/);
    expect(globalRoot).toMatch(/--dur-modal\s*:\s*\d+ms/);
    expect(globalRoot).toMatch(/--stagger-step\s*:/);
  });

  it("removes the duplicated dark-only motion token block (now global)", () => {
    // The old :root[data-theme="dark"] block re-declared --ease-out etc.
    // PR #118 deletes those redundant lines. If they came back, dark-scheme
    // tokens would shadow the global ones (different specificity wins).
    const darkRoot = CSS.match(/:root\[data-theme="dark"\]\s*\{[\s\S]*?\n\}/);
    if (darkRoot) {
      expect(darkRoot[0]).not.toMatch(/--ease-out\s*:/);
      expect(darkRoot[0]).not.toMatch(/--dur-press\s*:/);
    }
  });

  it("zeros all motion tokens under prefers-reduced-motion (not just duration)", () => {
    expect(CSS).toMatch(/@media\s*\(prefers-reduced-motion\s*:\s*reduce\)[\s\S]*?--dur-press\s*:\s*0ms/);
    expect(CSS).toMatch(/@media\s*\(prefers-reduced-motion\s*:\s*reduce\)[\s\S]*?--stagger-step\s*:\s*0ms/);
  });

  it("explicitly kills long decorative loops under prefers-reduced-motion", () => {
    // Belt-and-suspenders: even if a token didn't propagate, the named
    // animation should stop. We list the ones we know are infinite.
    expect(CSS).toMatch(/@media\s*\(prefers-reduced-motion\s*:\s*reduce\)[\s\S]*?\.coin-bob[\s\S]*?animation\s*:\s*none/);
    expect(CSS).toMatch(/@media\s*\(prefers-reduced-motion\s*:\s*reduce\)[\s\S]*?\.audio-pulse[\s\S]*?animation\s*:\s*none/);
    expect(CSS).toMatch(/@media\s*\(prefers-reduced-motion\s*:\s*reduce\)[\s\S]*?\.status-progress-slide[\s\S]*?animation\s*:\s*none/);
  });
});

describe("chrome-decoration · titlebar accent line", () => {
  it(".titlebar-publisher has a position:relative anchor", () => {
    expect(CSS).toMatch(/\.titlebar-publisher\s*\{[^}]*position\s*:\s*relative/);
  });

  it(".titlebar-publisher::after draws a China-red accent line", () => {
    expect(CSS).toMatch(/\.titlebar-publisher::after\s*\{/);
    const block = CSS.match(/\.titlebar-publisher::after\s*\{[\s\S]*?\n\}/);
    expect(block).toBeTruthy();
    expect(block![0]).toMatch(/linear-gradient\([\s\S]*?#d87930/);
    expect(block![0]).toMatch(/position\s*:\s*absolute/);
  });

  it(".titlebar-publisher::after respects prefers-reduced-motion", () => {
    expect(CSS).toMatch(/@media\s*\(prefers-reduced-motion\s*:\s*reduce\)\s*\{[\s\S]*?\.titlebar-publisher::after\s*\{[\s\S]*?transition\s*:\s*none/);
  });

  it("hover widens the accent line (gated to fine pointer)", () => {
    expect(CSS).toMatch(/@media\s*\(hover:\s*hover\)\s*and\s*\(pointer:\s*fine\)[\s\S]*?\.titlebar-publisher:hover::after\s*\{[\s\S]*?width\s*:\s*\d+px/);
  });
});

describe("chrome-decoration · sidebar empty-state vignette", () => {
  it(".sidebar-empty is positioned to host a ::before layer", () => {
    expect(CSS).toMatch(/\.sidebar-empty\s*\{[^}]*position\s*:\s*relative/);
  });

  it(".sidebar-empty::before draws a soft radial accent", () => {
    expect(CSS).toMatch(/\.sidebar-empty::before\s*\{/);
    const block = CSS.match(/\.sidebar-empty::before\s*\{[\s\S]*?\n\}/);
    expect(block).toBeTruthy();
    expect(block![0]).toMatch(/radial-gradient\(/);
    // The accent orange should be in the gradient stops.
    expect(block![0]).toMatch(/rgba\(216,\s*121,\s*48/);
  });
});

describe("chrome-decoration · command palette row", () => {
  it(".command-list button has a transition (opacity/transform safe only)", () => {
    const btnMatch = CSS.match(/\.command-list\s+button\s*\{[\s\S]*?\}/);
    expect(btnMatch).toBeTruthy();
    expect(btnMatch![0]).toMatch(/transition\s*:[^;]*(background-color|color|transform|opacity)[^;]*;/);
    expect(btnMatch![0]).not.toMatch(/transition\s*:\s*all/);
  });

  it(".command-list button hover is gated to fine pointers (no touch-tap bug)", () => {
    expect(CSS).toMatch(/@media\s*\(hover:\s*hover\)\s*and\s*\(pointer:\s*fine\)[\s\S]*?\.command-list\s+button:not\(:disabled\):hover\s*\{/);
  });

  it(".command-list button.is-selected:hover darkens further (also gated)", () => {
    expect(CSS).toMatch(/\.command-list\s+button\.is-selected:not\(:disabled\):hover\s*\{/);
  });
});

describe("chrome-decoration · recent-file stagger driven by --stagger-step", () => {
  it("every nth-child delay uses calc(var(--stagger-step) * N)", () => {
    const delays = CSS.match(/\.recent-list\s+\.recent-file:nth-child\(\d+\)\s*\{\s*animation-delay\s*:\s*calc\(var\(--stagger-step\)/g) || [];
    expect(delays.length).toBeGreaterThanOrEqual(5);
  });
});

describe("chrome-decoration · toast prefers-reduced-motion contract", () => {
  it("toast-in keyframes animate only opacity + transform (no layout-triggering)", () => {
    const keyframes = CSS.match(/@keyframes\s+toast-in\s*\{[^}]*\}/);
    expect(keyframes).toBeTruthy();
    expect(keyframes![0]).toMatch(/opacity\s*:/);
    expect(keyframes![0]).toMatch(/transform\s*:/);
    expect(keyframes![0]).not.toMatch(/\b(top|left|right|bottom|width|height|padding|margin)\s*:/);
  });

  it("audio-pulse keyframes animate only opacity + transform", () => {
    const keyframes = CSS.match(/@keyframes\s+audio-pulse\s*\{[^}]*\}/);
    expect(keyframes).toBeTruthy();
    expect(keyframes![0]).toMatch(/transform\s*:/);
    expect(keyframes![0]).not.toMatch(/\b(top|left|right|bottom|width|height|padding|margin)\s*:/);
  });
});