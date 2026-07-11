import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const COMPONENT_PATH = resolve(__dirname, "..", "src", "components", "viewers", "LosslessAudioPlayer.tsx");
const CSS_PATH = resolve(__dirname, "..", "src", "components", "viewers", "LosslessAudioPlayer.css");

function readComponent(): string {
  return readFileSync(COMPONENT_PATH, "utf8");
}
function readCss(): string {
  return readFileSync(CSS_PATH, "utf8");
}

describe("LosslessAudioPlayer — drag-to-seek wiring", () => {
  const src = readComponent();

  it("uses pointerdown (not onClick) on the progress bar", () => {
    // The bar must respond to pointerdown — the legacy onClick only fired on
    // pointerup after no movement, so dragging never worked.
    expect(src, "bar should listen for onPointerDown").toMatch(/className=\{?`[^`]*ll-bar[^`]*`\}?[\s\S]{0,400}onPointerDown=/);
    // No onClick on the bar
    const barBlock = src.match(/<div\s+className=\{?`ll-bar[^]*?<\/div>/);
    expect(barBlock, "bar block must exist").toBeTruthy();
    expect(barBlock![0]).not.toMatch(/\bonClick=/);
  });

  it("starts a drag with a state machine (begin/continue/end)", () => {
    expect(src).toMatch(/const beginSeek\s*=/);
    expect(src).toMatch(/const continueSeek\s*=/);
    expect(src).toMatch(/const endSeek\s*=/);
  });

  it("listens for pointermove + pointerup + pointercancel on window during a drag", () => {
    const block = src.match(/addEventListener\("pointermove"[\s\S]*?addEventListener\("pointercancel"[\s\S]*?\}\);/);
    expect(block, "window pointermove + pointerup + pointercancel listeners must exist").toBeTruthy();
    expect(block![0]).toMatch(/addEventListener\("pointermove"/);
    expect(block![0]).toMatch(/addEventListener\("pointerup"/);
    expect(block![0]).toMatch(/addEventListener\("pointercancel"/);
    expect(block![0]).toMatch(/removeEventListener/);
  });

  it("pauses the audio while dragging and resumes on release", () => {
    // beginSeek pauses; endSeek resumes if it was playing before.
    expect(src).toMatch(/wasPlayingBeforeDragRef/);
    const begin = src.match(/beginSeek\s*=\s*useCallback\([\s\S]*?\},\s*\[[^\]]*\]/);
    expect(begin, "beginSeek body must be parsed").toBeTruthy();
    expect(begin![0]).toMatch(/el\.pause\(\)/);
    const end = src.match(/endSeek\s*=\s*useCallback\([\s\S]*?\},\s*\[[^\]]*\]/);
    expect(end, "endSeek body must be parsed").toBeTruthy();
    expect(end![0]).toMatch(/audioRef\.current\?\.play\(\)/);
  });

  it("shows the drag-time on the bar instead of currentTime when dragging", () => {
    const block = src.match(/className=\{?`ll-bar[\s\S]*?<\/div>/);
    expect(block, "ll-bar block must exist").toBeTruthy();
    // The bar fill and thumb style use dragTime when present
    expect(block![0]).toMatch(/dragTime\s*!=\s*null/);
    // The time labels branch on isDragging too
    expect(src).toMatch(/isDragging\s*&&\s*dragTime\s*!=\s*null\s*\?\s*dragTime\s*:\s*currentTime/);
  });

  it("supports keyboard seek (Home/End/ArrowLeft/ArrowRight)", () => {
    const barBlock = src.match(/<div\s+className=\{?`ll-bar[^]*?<\/div>/);
    expect(barBlock![0]).toMatch(/ArrowLeft/);
    expect(barBlock![0]).toMatch(/ArrowRight/);
    expect(barBlock![0]).toMatch(/Home/);
    expect(barBlock![0]).toMatch(/End/);
  });
});

describe("LosslessAudioPlayer — drag cursor CSS", () => {
  const css = readCss();

  it("defaults to grab cursor when hovering the bar (gated to hover-capable pointers)", () => {
    expect(css).toMatch(/@media\s*\(hover:\s*hover\)\s*and\s*\(pointer:\s*fine\)[\s\S]*?\.ll-bar:hover\s*\{[^}]*cursor:\s*grab/);
  });

  it("switches to grabbing cursor while dragging", () => {
    expect(css).toMatch(/\.ll-bar\.is-dragging\s*\{[^}]*cursor:\s*grabbing/);
  });

  it("disables the fill animation while dragging (so the thumb doesn't jitter)", () => {
    expect(css).toMatch(/\.ll-bar\.is-dragging\s+\.ll-bar-fill[\s\S]*?transition:\s*none/);
    expect(css).toMatch(/\.ll-bar\.is-dragging\s+\.ll-bar-thumb[\s\S]*?transition:\s*none/);
  });
});
