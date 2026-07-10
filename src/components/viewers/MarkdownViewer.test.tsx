// @vitest-environment jsdom
// Tests for the MarkdownViewer formatting toolbar (PR #88).
//
// We wrap the component in I18nProvider + SettingsProvider so the toolbar
// can read translated labels and consume the word-wrap setting. Tests
// focus on the user-visible behaviour of each toolbar button plus the
// keyboard shortcuts (Ctrl/Cmd + B / I / K).

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import MarkdownViewer from "./MarkdownViewer";
import { I18nProvider, useI18n } from "../../i18n";
import { SettingsProvider } from "../../settings";
import { useEffect } from "react";

afterEach(() => {
  cleanup();
  try {
    window.localStorage.removeItem("openme.lang");
    window.localStorage.removeItem("openme.settings.v1");
  } catch {}
});

beforeEach(() => {
  try {
    window.localStorage.setItem("openme.lang", "en");
    window.localStorage.removeItem("openme.settings.v1");
  } catch {}
});

function renderInProviders(ui: React.ReactElement) {
  return render(
    <I18nProvider>
      <SettingsProvider>{ui}</SettingsProvider>
    </I18nProvider>,
  );
}

// Force the I18nProvider to settle on a known language so tests don't have
// to depend on the user's stored preference.
function LanguageSwitch({ lang }: { lang: "zh" | "en" }) {
  const { setLang } = useI18n();
  useEffect(() => { setLang(lang); }, [lang, setLang]);
  return null;
}

function renderWithLang(ui: React.ReactElement, lang: "zh" | "en" = "en") {
  return render(
    <I18nProvider>
      <LanguageSwitch lang={lang} />
      <SettingsProvider>{ui}</SettingsProvider>
    </I18nProvider>,
  );
}

function getTextarea(): HTMLTextAreaElement {
  const candidates = screen.getAllByLabelText("Markdown preview", { selector: "textarea" });
  return candidates[0] as HTMLTextAreaElement;
}

describe("MarkdownViewer toolbar (PR #88)", () => {
  it("renders the formatting toolbar with all actions", () => {
    renderInProviders(<MarkdownViewer content="hello world" />);
    expect(screen.getByRole("toolbar", { name: "Markdown formatting toolbar" })).toBeTruthy();
    expect(screen.getByLabelText("Bold (Ctrl+B)")).toBeTruthy();
    expect(screen.getByLabelText("Italic (Ctrl+I)")).toBeTruthy();
    expect(screen.getByLabelText("Strikethrough")).toBeTruthy();
    expect(screen.getByLabelText("Heading 1")).toBeTruthy();
    expect(screen.getByLabelText("Heading 2")).toBeTruthy();
    expect(screen.getByLabelText("Heading 3")).toBeTruthy();
    expect(screen.getByLabelText("Insert or edit link (Ctrl+K)")).toBeTruthy();
    expect(screen.getByLabelText("Inline code")).toBeTruthy();
    expect(screen.getByLabelText("Code block")).toBeTruthy();
    expect(screen.getByLabelText("Bullet list")).toBeTruthy();
    expect(screen.getByLabelText("Numbered list")).toBeTruthy();
    expect(screen.getByLabelText("Quote")).toBeTruthy();
    expect(screen.getByText("Copy as HTML")).toBeTruthy();
  });

  it("shows word + character count", () => {
    renderInProviders(<MarkdownViewer content="hello brave new world" />);
      const stats = document.querySelector(".md-toolbar-stats") as HTMLElement;
      expect(stats).toBeTruthy();
        expect(stats.textContent).toBe("4 words · 21 characters");
    });

    it("shows zero counts for empty content", () => {
      renderInProviders(<MarkdownViewer content="" />);
      const stats = document.querySelector(".md-toolbar-stats") as HTMLElement;
      expect(stats.textContent).toBe("0 words · 0 characters");
    });

  it("renders Chinese toolbar labels when language is zh", () => {
    renderWithLang(<MarkdownViewer content="你好" />, "zh");
    expect(screen.getByLabelText("加粗（Ctrl+B）")).toBeTruthy();
    expect(screen.getByLabelText("斜体（Ctrl+I）")).toBeTruthy();
    expect(screen.getByLabelText("一级标题")).toBeTruthy();
    expect(screen.getByText("复制为 HTML")).toBeTruthy();
  });

  it("wraps selection with ** when Bold button is clicked", () => {
      renderInProviders(<MarkdownViewer content="hello brave world" />);
      const ta = getTextarea();
      ta.focus();
      ta.setSelectionRange(6, 11); // "brave"
      fireEvent.click(screen.getByLabelText("Bold (Ctrl+B)"));
      expect(ta.value).toBe("hello **brave** world");
    });

  it("wraps selection with * when Italic button is clicked", () => {
    renderInProviders(<MarkdownViewer content="hello brave world" />);
    const ta = getTextarea();
    ta.focus();
    ta.setSelectionRange(6, 11);
    fireEvent.click(screen.getByLabelText("Italic (Ctrl+I)"));
    expect(ta.value).toBe("hello *brave* world");
  });

  it("wraps selection with ~~ for Strikethrough", () => {
    renderInProviders(<MarkdownViewer content="hello brave world" />);
    const ta = getTextarea();
    ta.focus();
    ta.setSelectionRange(6, 11);
    fireEvent.click(screen.getByLabelText("Strikethrough"));
    expect(ta.value).toBe("hello ~~brave~~ world");
  });

  it("inserts placeholder when nothing is selected", () => {
    renderInProviders(<MarkdownViewer content="" />);
    const ta = getTextarea();
    ta.focus();
    ta.setSelectionRange(0, 0);
    fireEvent.click(screen.getByLabelText("Bold (Ctrl+B)"));
    expect(ta.value).toBe("**bold text**");
  });

  it("prefixes the current line with # for Heading 1", () => {
      renderInProviders(<MarkdownViewer content={"alpha\nbeta"} />);
      const ta = getTextarea();
      ta.focus();
      ta.setSelectionRange(0, 0);
      fireEvent.click(screen.getByLabelText("Heading 1"));
      expect(ta.value).toBe("# alpha\nbeta");
    });

  it("prefixes the current line with ## for Heading 2", () => {
      renderInProviders(<MarkdownViewer content={"alpha\nbeta"} />);
      const ta = getTextarea();
      ta.focus();
      // Place caret inside the second line.
      const offset = "alpha\n".length + 2;
      ta.setSelectionRange(offset, offset);
      fireEvent.click(screen.getByLabelText("Heading 2"));
      expect(ta.value).toBe("alpha\n## beta");
    });

  it("prefixes lines with - for bullet list", () => {
      renderInProviders(<MarkdownViewer content={"a\nb\nc"} />);
      const ta = getTextarea();
      ta.focus();
        // Place caret at start of first line — will expand to full line.
        ta.setSelectionRange(0, 0);
        fireEvent.click(screen.getByLabelText("Bullet list"));
        expect(ta.value).toBe("- a\nb\nc");
      });

      it("inserts - prefix on empty doc", () => {
      renderInProviders(<MarkdownViewer content="" />);
      const ta = getTextarea();
      ta.focus();
      ta.setSelectionRange(0, 0);
      fireEvent.click(screen.getByLabelText("Bullet list"));
        expect(ta.value).toBe("- ");
    });

    it("inserts 1. prefix on empty doc", () => {
      renderInProviders(<MarkdownViewer content="" />);
      const ta = getTextarea();
      ta.focus();
      ta.setSelectionRange(0, 0);
      fireEvent.click(screen.getByLabelText("Numbered list"));
          expect(ta.value).toBe("1. ");
    });

  it("wraps selection with > for quote", () => {
      renderInProviders(<MarkdownViewer content="hello brave" />);
    const ta = getTextarea();
    ta.focus();
      ta.setSelectionRange(6, 11); // "brave"
    fireEvent.click(screen.getByLabelText("Quote"));
      expect(ta.value).toBe("hello > brave");
  });

    it("inserts quote placeholder when nothing is selected", () => {
      renderInProviders(<MarkdownViewer content="" />);
      const ta = getTextarea();
      ta.focus();
      ta.setSelectionRange(0, 0);
      fireEvent.click(screen.getByLabelText("Quote"));
      expect(ta.value).toBe("> quote");
    });

  it("wraps selection with backticks for inline code", () => {
    renderInProviders(<MarkdownViewer content="hello brave" />);
    const ta = getTextarea();
    ta.focus();
    ta.setSelectionRange(6, 11);
    fireEvent.click(screen.getByLabelText("Inline code"));
    expect(ta.value).toBe("hello `brave` brave".replace(" brave", "")).toBe("hello `brave`");
  });

  it("wraps selection with triple backticks for code block", () => {
    renderInProviders(<MarkdownViewer content="let x = 1" />);
    const ta = getTextarea();
    ta.focus();
    ta.setSelectionRange(0, 9);
    fireEvent.click(screen.getByLabelText("Code block"));
    expect(ta.value).toBe("\n```\nlet x = 1\n```\n");
  });

  it("inserts a markdown link and places caret inside the URL", () => {
      renderInProviders(<MarkdownViewer content="visit openme today" />);
      const ta = getTextarea();
      ta.focus();
      ta.setSelectionRange(6, 12); // "openme"
      fireEvent.click(screen.getByLabelText("Insert or edit link (Ctrl+K)"));
      expect(ta.value).toBe("visit [openme](https://) today");
    });

  it("inserts a link placeholder when nothing is selected", () => {
    renderInProviders(<MarkdownViewer content="" />);
    const ta = getTextarea();
    ta.focus();
    ta.setSelectionRange(0, 0);
    fireEvent.click(screen.getByLabelText("Insert or edit link (Ctrl+K)"));
    expect(ta.value).toBe("[link text](https://)");
  });

  it("Ctrl+B triggers Bold wrap via keyboard shortcut", () => {
    renderInProviders(<MarkdownViewer content="hello brave world" />);
    const ta = getTextarea();
    ta.focus();
    ta.setSelectionRange(6, 11);
    fireEvent.keyDown(ta, { key: "b", ctrlKey: true });
    expect(ta.value).toBe("hello **brave** world");
  });

  it("Cmd+I triggers Italic wrap via keyboard shortcut", () => {
    renderInProviders(<MarkdownViewer content="hello brave world" />);
    const ta = getTextarea();
    ta.focus();
    ta.setSelectionRange(6, 11);
    fireEvent.keyDown(ta, { key: "i", metaKey: true });
    expect(ta.value).toBe("hello *brave* world");
  });

  it("Ctrl+K triggers link insertion via keyboard shortcut", () => {
    renderInProviders(<MarkdownViewer content="visit openme today" />);
    const ta = getTextarea();
    ta.focus();
      ta.setSelectionRange(6, 12);
    fireEvent.keyDown(ta, { key: "k", ctrlKey: true });
    expect(ta.value).toBe("visit [openme](https://) today");
  });

  it("plain key presses without Ctrl/Cmd do not trigger shortcuts", () => {
    renderInProviders(<MarkdownViewer content="abc" />);
    const ta = getTextarea();
    ta.focus();
    ta.setSelectionRange(0, 3);
    fireEvent.keyDown(ta, { key: "b" });
    expect(ta.value).toBe("abc");
  });

  it("Copy as HTML writes the rendered HTML to clipboard", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    renderInProviders(<MarkdownViewer content={"# Hello\n\nworld"} />);
    const button = screen.getByText("Copy as HTML");
    await act(async () => { fireEvent.click(button); });
    expect(writeText).toHaveBeenCalledTimes(1);
    const payload = writeText.mock.calls[0]![0] as string;
    expect(payload).toContain("<h1");
    expect(payload).toContain("Hello");
    expect(payload).toContain("world");
    // Button label should flash to confirm.
    expect(screen.getByText("HTML copied")).toBeTruthy();
  });

  it("Copy as HTML flash label reverts after the timer expires", async () => {
    vi.useFakeTimers();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    try {
      renderInProviders(<MarkdownViewer content="hello" />);
      const button = screen.getByText("Copy as HTML");
      await act(async () => { fireEvent.click(button); });
      expect(screen.getByText("HTML copied")).toBeTruthy();
      await act(async () => { vi.advanceTimersByTime(1500); });
      expect(screen.getByText("Copy as HTML")).toBeTruthy();
    } finally {
      vi.useRealTimers();
    }
  });

  it("mode toggle button switches between edit / split / preview", () => {
    renderInProviders(<MarkdownViewer content="hello" />);
    const editBtn = screen.getByRole("button", { name: "Edit" });
    const previewBtn = screen.getByRole("button", { name: "Preview" });
    expect(editBtn.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(previewBtn);
    expect(previewBtn.getAttribute("aria-pressed")).toBe("true");
    // The iframe should still be visible after switching to preview-only mode.
    expect(document.querySelector("iframe.markdown-preview-frame")).toBeTruthy();
    fireEvent.click(editBtn);
    expect(editBtn.getAttribute("aria-pressed")).toBe("true");
    // In edit-only mode the textarea should still render but no iframe.
    expect(document.querySelector("iframe.markdown-preview-frame")).toBeFalsy();
  });

  it("calls onChange with the updated text after a toolbar action", () => {
    const onChange = vi.fn();
    renderInProviders(<MarkdownViewer content="hello brave" onChange={onChange} />);
    const ta = getTextarea();
    ta.focus();
    ta.setSelectionRange(6, 11);
    fireEvent.click(screen.getByLabelText("Bold (Ctrl+B)"));
    expect(onChange).toHaveBeenCalledWith("hello **brave**");
  });

  it("does not lose the selection when wrapping a multi-character selection", () => {
    renderInProviders(<MarkdownViewer content="hello brave new world" />);
    const ta = getTextarea();
    ta.focus();
    ta.setSelectionRange(6, 15); // "brave new"
    fireEvent.click(screen.getByLabelText("Italic (Ctrl+I)"));
    expect(ta.value).toBe("hello *brave new* world");
  });

    // PR #112 — toolbar a11y polish
    it("exposes aria-keyshortcuts on Bold / Italic / Link buttons", () => {
      renderInProviders(<MarkdownViewer content="" />);
      expect(screen.getByLabelText("Bold (Ctrl+B)").getAttribute("aria-keyshortcuts")).toBe("Control+B");
      expect(screen.getByLabelText("Italic (Ctrl+I)").getAttribute("aria-keyshortcuts")).toBe("Control+I");
      expect(screen.getByLabelText("Insert or edit link (Ctrl+K)").getAttribute("aria-keyshortcuts")).toBe("Control+K");
    });

    it("hides glyph icons from screen readers via aria-hidden", () => {
      renderInProviders(<MarkdownViewer content="" />);
      const boldBtn = screen.getByLabelText("Bold (Ctrl+B)");
      const glyph = boldBtn.querySelector('[aria-hidden="true"]');
      expect(glyph).toBeTruthy();
      expect(glyph?.textContent).toBe("B");
    });

    it("describes the toolbar with keyboard-shortcut hint for AT users", () => {
      renderInProviders(<MarkdownViewer content="" />);
      const toolbar = screen.getByRole("toolbar", { name: "Markdown formatting toolbar" });
      const describedById = toolbar.getAttribute("aria-describedby");
      expect(describedById).toBeTruthy();
      const hint = document.getElementById(describedById!);
      expect(hint?.textContent).toContain("Ctrl+B");
      expect(hint?.textContent).toContain("Ctrl+I");
      expect(hint?.textContent).toContain("Ctrl+K");
    });
});