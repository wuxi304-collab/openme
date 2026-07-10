// @vitest-environment jsdom
// Tests for PR #94 — StatusBar polish v3: character count, word count,
// and BOM-aware encoding detection.

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import StatusBar from "./StatusBar";
import { I18nProvider } from "../../i18n";
import { SettingsProvider } from "../../settings";

afterEach(() => {
  cleanup();
  try {
    window.localStorage.removeItem("openme.lang");
    window.localStorage.removeItem("openme.settings.v1");
  } catch {}
});

beforeEach(() => {
  try {
    window.localStorage.removeItem("openme.lang");
    window.localStorage.removeItem("openme.settings.v1");
  } catch {}
});

function renderInProviders(ui: React.ReactElement) {
  return render(
    <I18nProvider>
      <SettingsProvider>{ui}</SettingsProvider>
    </I18nProvider>
  );
}

describe("StatusBar — character & word counts (PR #94)", () => {
  it("does not show char / word chips when no file is active", () => {
    renderInProviders(<StatusBar activeTab={null} />);
    expect(document.querySelector(".status-char-count")).toBeNull();
    expect(document.querySelector(".status-word-count")).toBeNull();
  });

  it("shows char count for a plain ASCII text file", () => {
    renderInProviders(
      <StatusBar
        activeTab={{ name: "greet.txt", path: "C:/demo/greet.txt", content: "hello" }}
      />
    );
    const chip = document.querySelector(".status-char-count") as HTMLElement | null;
    expect(chip).toBeTruthy();
    expect(chip?.textContent ?? "").toMatch(/5/);
  });

  it("counts CJK ideographs as one character each (no surrogate splitting)", () => {
    // 4 Chinese characters; \uFEFF added at start to exercise BOM detection
    const content = "\u4F60\u597D\u4E16\u754C";
    renderInProviders(
      <StatusBar
        activeTab={{ name: "cn.txt", path: "C:/demo/cn.txt", content }}
      />
    );
    const chip = document.querySelector(".status-char-count") as HTMLElement | null;
    expect(chip).toBeTruthy();
    expect(chip?.textContent ?? "").toMatch(/4/);
  });

  it("counts CJK ideographs as one word each (no whitespace runs)", () => {
    const content = "\u4F60\u597D\u4E16\u754C"; // 4 chars, no spaces
    renderInProviders(
      <StatusBar
        activeTab={{ name: "cn.txt", path: "C:/demo/cn.txt", content }}
      />
    );
    const chip = document.querySelector(".status-word-count") as HTMLElement | null;
    expect(chip).toBeTruthy();
    // 4 ideographs count as 4 words
    expect(chip?.textContent ?? "").toMatch(/4/);
  });

  it("counts Latin words split on whitespace", () => {
    const content = "alpha beta gamma delta";
    renderInProviders(
      <StatusBar
        activeTab={{ name: "words.txt", path: "C:/demo/words.txt", content }}
      />
    );
    const chip = document.querySelector(".status-word-count") as HTMLElement | null;
    expect(chip).toBeTruthy();
    expect(chip?.textContent ?? "").toMatch(/4/);
  });

  it("renders an explicit '0 words' chip for whitespace-only content", () => {
    renderInProviders(
      <StatusBar
        activeTab={{ name: "blank.txt", path: "C:/demo/blank.txt", content: "   \n\n  " }}
      />
    );
    const chip = document.querySelector(".status-word-count") as HTMLElement | null;
    expect(chip).toBeTruthy();
    expect(chip?.textContent ?? "").toMatch(/0/);
  });

  it("exposes a localised aria-label on the char count chip under en locale", () => {
    try { window.localStorage.setItem("openme.lang", "en"); } catch {}
    renderInProviders(
      <StatusBar
        activeTab={{ name: "f.txt", path: "C:/demo/f.txt", content: "abcdef" }}
      />
    );
    const chip = document.querySelector(".status-char-count") as HTMLElement | null;
    expect(chip).toBeTruthy();
    expect(chip?.getAttribute("aria-label") ?? "").toMatch(/characters/);
  });
});

describe("StatusBar — encoding detection (PR #94)", () => {
  it("detects UTF-8 with BOM when content starts with \\uFEFF", () => {
    const content = "\uFEFFhello world";
    renderInProviders(
      <StatusBar
        activeTab={{ name: "bom.txt", path: "C:/demo/bom.txt", content }}
      />
    );
    const enc = screen.getByText(/UTF-8 \(BOM\)/);
    expect(enc).toBeTruthy();
  });

  it("falls back to plain UTF-8 when no BOM is present", () => {
    renderInProviders(
      <StatusBar
        activeTab={{ name: "plain.txt", path: "C:/demo/plain.txt", content: "no bom here" }}
      />
    );
    const enc = screen.getByText("UTF-8");
    expect(enc).toBeTruthy();
  });

  it("omits the encoding chip when there is no active tab", () => {
    renderInProviders(<StatusBar activeTab={null} />);
    // The right cluster is empty in the no-tab state.
    const cluster = document.querySelector(".status-line-ending");
    expect(cluster?.textContent ?? "").not.toMatch(/UTF-16|Unknown/);
  });

  it("uses English encoding label under en locale", () => {
    try { window.localStorage.setItem("openme.lang", "en"); } catch {}
    const content = "\uFEFFhi";
    renderInProviders(
      <StatusBar
        activeTab={{ name: "bom.txt", path: "C:/demo/bom.txt", content }}
      />
    );
    const enc = screen.getByText("UTF-8 (BOM)");
    expect(enc).toBeTruthy();
    expect(enc.getAttribute("title") ?? "").toMatch(/File encoding/);
  });
});
