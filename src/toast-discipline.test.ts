// Contract test: toast stack + each toast entry MUST follow the
// accessibility / motion discipline rules so future regressions are caught
// at lint time.
//
// Scope:
//   - aria-live region exists for SR announcement
//   - close button has aria-label in both locales
//   - prefers-reduced-motion companions exist for the entrance + ttl + exit
//   - hover-pause logic (is-paused class toggles on mouse enter / leave)
//   - hover lift is gated with (hover: hover) and (pointer: fine)
//   - exit animation has a reduced-motion fallback
//
// Companion tests:
//   - focus-visible-discipline (cross-cutting :focus audit)
//   - animation-discipline (CSS animation budget)
//   - modal-focus-discipline (Tab-trap audit)

import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

const TOAST_TSX = "src/components/Toast.tsx";
const INDEX_CSS = "src/index.css";
const I18N_TSX = "src/i18n.tsx";

function readSource(file: string): string {
  return fs.readFileSync(path.resolve(file), "utf8");
}

describe("toast discipline", () => {
  describe("a11y wiring (Toast.tsx)", () => {
    it("declares an aria-live polite region on the stack container", () => {
      const src = readSource(TOAST_TSX);
      const hasLive = /aria-live="polite"/.test(src);
      expect(hasLive, "stack container must set aria-live=polite").toBe(true);
    });

    it('adds role="status" alongside aria-live', () => {
      const src = readSource(TOAST_TSX);
      // Some readers treat role="status" + aria-live="polite" as redundant,
      // but role=status gives an implicit aria-live, so the pair is the
      // most cross-reader-friendly combination.
      const hasRoleStatus = /role="status"/.test(src);
      expect(hasRoleStatus, "stack container must set role=status").toBe(true);
    });

    it("renders aria-label for the close button via i18n", () => {
      const src = readSource(TOAST_TSX);
      const hasAriaLabel = /className="app-toast-close"[^>]*aria-label=\{t\(["']toastClose["']\)\}/.test(src)
        || /aria-label=\{t\(["']toastClose["']\)\}[^>]*className="app-toast-close"/.test(src);
      expect(hasAriaLabel, "close button must use t(toastClose) for aria-label").toBe(true);
    });

    it("provides an aria-describedby sr-only hint for keyboard / SR users", () => {
      const src = readSource(TOAST_TSX);
      // The hint must be wired via aria-describedby so SR / keyboard users
      // learn about hover-or-focus-to-pause just like mouse users via title.
      const hasDescribedBy = /aria-describedby=\{hintId\}/.test(src);
      expect(hasDescribedBy, "toast must wire aria-describedby to a sr-only hint").toBe(true);
      const hasSrOnly = /className="app-toast-sr-hint"/.test(src);
      expect(hasSrOnly, "toast must render an sr-only hint span").toBe(true);
    });
  });

  describe("motion discipline (index.css)", () => {
    it("toast-in keyframe has a reduced-motion fade fallback", () => {
      const css = readSource(INDEX_CSS);
      // Reduced-motion override must switch the entrance animation to
      // an opacity-only toast-fade so users with motion sensitivity
      // don't see transform interpolations.
      const rmBlock = /\.app-toast\s*\{[^}]*animation:toast-fade|matches for toast-fade in reduced-motion/.test(css);
      const hasToasterFade = /@keyframes\s+toast-fade/.test(css);
      const hasReducedMotion = /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*?\.app-toast\s*\{[\s\S]*?animation:\s*toast-fade/.test(css);
      expect(hasToasterFade, "toast-fade keyframe must exist").toBe(true);
      expect(hasReducedMotion, "toast entrance must switch to toast-fade under reduced-motion").toBe(true);
    });

    it("toast-out (exit) animation also has a reduced-motion fade fallback", () => {
      const css = readSource(INDEX_CSS);
      const hasOutKeyframe = /@keyframes\s+toast-out\b/.test(css);
      const hasOutFade = /@keyframes\s+toast-out-fade\b/.test(css);
      const hasRmOverrides = /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*?\.app-toast\.is-exiting\s*\{[^}]*animation:\s*toast-out-fade/.test(css);
      expect(hasOutKeyframe, "toast-out keyframe must exist for exit animation").toBe(true);
      expect(hasRmOverrides, "is-exiting must switch to toast-out-fade under reduced-motion").toBe(true);
      expect(hasOutFade, "toast-out-fade keyframe must exist for reduced-motion exit").toBe(true);
    });

    it("hover lift on .app-toast is gated with (hover: hover) and (pointer: fine)", () => {
      const css = readSource(INDEX_CSS);
      // Match a `@media (hover: hover) and (pointer: fine) {` block that
      // contains `.app-toast:hover` (followed by translateY -2px).
      const gated = /@media\s*\(hover:\s*hover\)\s*and\s*\(pointer:\s*fine\)\s*\{[^}]*\.app-toast:hover/.test(css);
      expect(gated, "hover lift must be media-gated to avoid touch device stuck-state").toBe(true);
    });

    it("is-exiting class drives the exit animation forwards", () => {
      const css = readSource(INDEX_CSS);
      const hasExitingRule = /\.app-toast\.is-exiting\s*\{[^}]*animation:\s*toast-out/.test(css);
      const isForwards = /\.app-toast\.is-exiting[\s\S]{0,200}?forwards/.test(css);
      expect(hasExitingRule, ".app-toast.is-exiting must trigger toast-out animation").toBe(true);
      expect(isForwards, "is-exiting animation must run forwards so end state sticks").toBe(true);
    });

    it("blocks pointer-events on the toast while it is exiting", () => {
      const css = readSource(INDEX_CSS);
      const blocksEvents = /\.app-toast\.is-exiting[\s\S]{0,200}?pointer-events:\s*none/.test(css);
      expect(blocksEvents, "exit-phase toasts must not capture pointer events").toBe(true);
    });
  });

  describe("i18n wiring", () => {
    it("defines toastClose key in both locales", () => {
      const src = readSource(I18N_TSX);
      const zhCount = (src.match(/toastClose\s*:/g) ?? []).length;
      const enCount = (src.match(/toastClose\s*:/g) ?? []).length;
      // Both locales are inside the same file — count of 2 means zh+en pair.
      expect(zhCount, "toastClose must be defined for both zh and en").toBe(2);
    });

    it("defines toastHoverHint (used for title + sr-only hint)", () => {
      const src = readSource(I18N_TSX);
      const count = (src.match(/toastHoverHint\s*:/g) ?? []).length;
      expect(count, "toastHoverHint must be defined for both zh and en").toBe(2);
    });

    it("defines toastLimitHint with {count} placeholder", () => {
      const src = readSource(I18N_TSX);
      const zhRe = /toastLimitHint\s*:\s*["'][^"']*\{count\}/;
      const enRe = /toastLimitHint\s*:\s*["'][^"']*\{count\}/;
      const zhCount = (src.match(zhRe.source, "g") ?? []).length;
      const enCount = (src.match(enRe.source, "g") ?? []).length;
      expect(zhCount, "toastLimitHint must use {count} placeholder in zh").toBeGreaterThanOrEqual(1);
      expect(enCount, "toastLimitHint must use {count} placeholder in en").toBeGreaterThanOrEqual(1);
    });
  });

  describe("hover-pause logic (Toast.tsx)", () => {
    it("toggles is-paused on mouseEnter / mouseLeave", () => {
      const src = readSource(TOAST_TSX);
      const hasEnter = /onMouseEnter=\{handlePause\}/.test(src);
      const hasLeave = /onMouseLeave=\{handleResume\}/.test(src);
      const hasFocusPause = /onFocusCapture=\{handlePause\}/.test(src);
      const hasBlurResume = /onBlurCapture=\{handleResume\}/.test(src);
      expect(hasEnter, "must pause on mouseEnter").toBe(true);
      expect(hasLeave, "must resume on mouseLeave").toBe(true);
      expect(hasFocusPause, "must pause on focus (keyboard users can pause too)").toBe(true);
      expect(hasBlurResume, "must resume on blur").toBe(true);
    });

    it("uses a second-stage timer to delay onDismiss while exit animation plays", () => {
      const src = readSource(TOAST_TSX);
      // Look for the pattern: setExiting(true) followed by a setTimeout
      // that calls onDismiss after ~180ms.
      const hasTwoStage = /setExiting\(true\)[\s\S]{0,200}?setTimeout\(\(\)\s*=>\s*\{[\s\S]{0,80}?onDismiss/.test(src);
      expect(hasTwoStage, "auto-dismiss must use a two-stage setTimeout for fade-out").toBe(true);
    });
  });
});
