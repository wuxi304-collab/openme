// Settings dialog polish contract — verifies CSS additions:
// - section stagger entrance via --stagger-step tokens
// - hover-gate on radio pill, storage path value, and copy state
// - reset pulse animation hook (is-resetting)
// - copied data-attribute visual state
// - reduced-motion safety nets
//
// These tests read src/components/SettingsDialog.css as a string and assert
// the contract is in place — they don't render the dialog.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect } from "vitest";

const css = readFileSync(
  resolve(__dirname, "components/SettingsDialog.css"),
  "utf8",
);

describe("Settings dialog — section stagger entrance", () => {
  it("defines a settings-section-in keyframe that only animates opacity + transform", () => {
    const m = css.match(
      /@keyframes\s+settings-section-in\s*\{([\s\S]*?)\n\s*\}/,
    );
    expect(m, "settings-section-in keyframe missing").toBeTruthy();
    const body = m![1]!;
    expect(body).toMatch(/opacity/);
    expect(body).toMatch(/transform/);
    // No width/height/top/left/margin — only opacity + transform.
    expect(body).not.toMatch(/\bwidth\s*:/);
    expect(body).not.toMatch(/\bheight\s*:/);
    expect(body).not.toMatch(/\btop\s*:/);
    expect(body).not.toMatch(/\bleft\s*:/);
    expect(body).not.toMatch(/\bmargin\s*:/);
  });

  it("staggered child delays reference --stagger-step and --dur-press tokens", () => {
    const block = css.match(
      /\.settings-dialog-body\s*>\s*\.settings-dialog-section[\s\S]*?(?=\n\n|\n\/\*|$)/,
    );
    expect(block, "section stagger rule block missing").toBeTruthy();
    const body = block![0];
    // nth-child(N) rules for N = 1..5.
    for (const n of [1, 2, 3, 4, 5]) {
      const re = new RegExp(
        `nth-child\\(${n}\\)[^{]*\\{[^{}]*calc\\(var\\(--dur-press[^)]*\\)\\s*\\+\\s*var\\(--stagger-step[^)]*\\)\\s*\\*\\s*${n}\\)`,
      );
      expect(body, `nth-child(${n}) delay must use --stagger-step * ${n}`).toMatch(re);
    }
  });
});

describe("Settings dialog — hover gates", () => {
  it("gates .settings-radio:hover to (hover: hover) and (pointer: fine)", () => {
    const m = css.match(
      /@media\s*\(hover:\s*hover\)\s*and\s*\(pointer:\s*fine\)\s*\{[\s\S]*?\.settings-radio:hover\s*\{[\s\S]*?\}\s*\}/,
    );
    expect(m, "hover-gated .settings-radio:hover rule missing").toBeTruthy();
  });

  it("gates .settings-storage-path-value[title]:hover to fine pointer", () => {
    const m = css.match(
      /@media\s*\(hover:\s*hover\)\s*and\s*\(pointer:\s*fine\)\s*\{[\s\S]*?\.settings-storage-path-value\[title\]:hover\s*\{[\s\S]*?\}\s*\}/,
    );
    expect(m, "hover-gated storage-path-value rule missing").toBeTruthy();
  });
});

describe("Settings dialog — reset pulse", () => {
  it("defines settings-reset-pulse keyframe opacity/transform safe", () => {
    const m = css.match(
      /@keyframes\s+settings-reset-pulse\s*\{([\s\S]*?)\n\s*\}\s*\n[\s\S]*?\.settings-dialog-card\.is-resetting\s+\.settings-radio\s*\{[\s\S]*?animation:\s*settings-reset-pulse/,
    );
    expect(m, "reset pulse keyframe + is-resetting hook missing").toBeTruthy();
  });

  it("disables reset pulse under prefers-reduced-motion", () => {
      const outerRe = /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\n\}/g;
      const matches = [...css.matchAll(outerRe)];
      expect(matches.length).toBeGreaterThanOrEqual(1);
      const outer = matches[matches.length - 1]![0];
      expect(outer).toMatch(/\.settings-dialog-card\.is-resetting\s+\.settings-radio/);
      expect(outer).toMatch(/animation:\s*none/);
    });
});

describe("Settings dialog — copied state + reduced-motion safety nets", () => {
  it("defines a [data-copied='true'] visual state", () => {
    const m = css.match(
      /\.settings-storage-path-action\[data-copied="true"\]\s*\{([\s\S]*?)\}/,
    );
    expect(m, "data-copied=true rule missing").toBeTruthy();
  });

  it("prefers-reduced-motion kills section stagger too", () => {
      // Find the LAST top-level prefers-reduced-motion block (the outer one
      // at the bottom of the file) — earlier inner @media blocks can match
      // first if we greedy-match.
      const outerRe = /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\n\}/g;
      const matches = [...css.matchAll(outerRe)];
      expect(matches.length, "expected at least one top-level prefers-reduced-motion block").toBeGreaterThanOrEqual(1);
      const outer = matches[matches.length - 1]![0];
      expect(outer).toMatch(/\.settings-dialog-body\s*>\s*\.settings-dialog-section/);
      expect(outer).toMatch(/\.settings-dialog-card\.is-resetting\s+\.settings-radio/);
      expect(outer).toMatch(/animation:\s*none/);
    });
});