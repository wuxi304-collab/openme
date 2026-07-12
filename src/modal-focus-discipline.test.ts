// Contract test: modal dialogs MUST keep keyboard focus contained.
//
// What "modal" means here:
//   - React component sets `role="dialog"` AND `aria-modal="true"`
//   - When open, every focusable element on the page MUST live inside the
//     dialog root
//   - When the user closes the dialog, focus MUST return to the element
//     that opened it (not jump to <body>)
//
// We test by inspecting source — modal discipline is structural, so a
// regression grep catches missing focus traps faster than a runtime render.
//
// Companion tests:
//   - sidebar-focus-discipline (focus-visible rings on chrome)
//   - focus-visible-discipline (cross-cutting :focus audit)

import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

type ModalFile = {
  file: string;
  /** Class name of the dialog card (the element that wraps content). */
  cardSelector: string;
};

const MODAL_FILES: ModalFile[] = [
  { file: "src/components/SettingsDialog.tsx", cardSelector: "settings-dialog-card" },
  { file: "src/components/AboutDialog.tsx", cardSelector: "about-dialog-card" },
  { file: "src/components/ShortcutsOverlay.tsx", cardSelector: "shortcuts-overlay" },
  { file: "src/components/ConfirmDialog.tsx", cardSelector: "confirm-dialog-card" },
];

function readSource(file: string): string {
  return fs.readFileSync(path.resolve(file), "utf8");
}

describe("modal focus discipline", () => {
  describe.each(MODAL_FILES)("$file", ({ file, cardSelector }) => {
    it('sets role="dialog" and aria-modal="true"', () => {
      const src = readSource(file);
      const dialogMatch = src.match(/role="dialog"[\s\S]{0,200}?aria-modal="true"/);
      expect(
        dialogMatch,
        `${file} must declare role="dialog" alongside aria-modal="true"`,
      ).not.toBeNull();
    });

    it(`wires a useRef to .${cardSelector} (forward OR reverse attribute order)`, () => {
      const src = readSource(file);
      const escaped = cardSelector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      // Allow either `ref={xRef} className="..."` or `className="..." ref={xRef}`.
      const wiringRe = new RegExp(
        `(?:ref=\\{(\\w+Ref)\\}\\s+className="${escaped}"|className="${escaped}"\\s+ref=\\{(\\w+Ref)\\})`,
      );
      const wiringMatch = src.match(wiringRe);
      expect(
        wiringMatch,
        `${file} must wire a useRef to .${cardSelector} (focus trap needs DOM access)`,
      ).not.toBeNull();
    });

    it('listens for "Tab" key (with any comparison)', () => {
      const src = readSource(file);
      // Accept `event.key === "Tab"`, `e.key !== "Tab"`, `key === "Tab"`.
      const hasTabKeyHandler =
        /(?:event|e|key)\s*===\s*["']Tab["']/.test(src) ||
        /(?:event|e|key)\s*!==\s*["']Tab["']/.test(src);
      expect(
        hasTabKeyHandler,
        `${file} must listen for "Tab" key`,
      ).toBe(true);
      const hasFocusableQuery = /button[\s\S]{0,200}?\[href\][\s\S]{0,200}?input/.test(src);
      expect(
        hasFocusableQuery,
        `${file} must query for focusable elements inside the card`,
      ).toBe(true);
      const hasFocusRedirect = /\.focus\(\)/.test(src);
      expect(
        hasFocusRedirect,
        `${file} must call .focus() to redirect Tab out-of-bounds`,
      ).toBe(true);
    });

    it("captures the trigger element on open and restores on close", () => {
      const src = readSource(file);
      const captureOnOpen =
        /previouslyFocusedRef\.current\s*=\s*document\.activeElement/.test(src) ||
        /lastFocusedRef\.current\s*=\s*document\.activeElement/.test(src);
      expect(
        captureOnOpen,
        `${file} must capture the trigger element when opening`,
      ).toBe(true);
      const restoreOnClose =
        /previouslyFocusedRef\.current[\s\S]{0,400}?\.focus\(/.test(src) ||
        /lastFocusedRef\.current\?\.focus/.test(src);
      expect(
        restoreOnClose,
        `${file} must restore focus to the trigger on close`,
      ).toBe(true);
    });
  });

  describe("settings-dialog CSS focus ring", () => {
    it("close button has :focus-visible outline", () => {
      const css = readSource("src/components/SettingsDialog.css");
      const hasOutline = /\.settings-dialog-close[\s\S]{0,400}?focus-visible[\s\S]{0,400}?outline/.test(css);
      expect(hasOutline, "settings-dialog-close must have :focus-visible outline").toBe(true);
    });
  });
});
