// @vitest-environment jsdom
// Behavioural tests for the StatusBar polish PR: theme pill toggle,
// line-ending detection, and the indeterminate progress bar.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import StatusBar from "./StatusBar";
import { I18nProvider } from "../../i18n";
import { SettingsProvider, useSettings } from "../../settings";
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

describe("StatusBar", () => {
  it("shows 'no file' state when no tab is active", () => {
    renderInProviders(<StatusBar activeTab={null} />);
    expect(screen.getByText("等待打开文件")).toBeTruthy();
  });

  it("detects CRLF line endings in active file content", () => {
    const crlf = "alpha\r\nbeta\r\ngamma\r\n";
    renderInProviders(<StatusBar activeTab={{ name: "f.txt", path: "/tmp/f.txt", content: crlf, size: 18 }} />);
    expect(screen.getByText("CRLF（Windows 换行）")).toBeTruthy();
  });

  it("detects LF-only line endings", () => {
    const lf = "alpha\nbeta\ngamma\n";
    renderInProviders(<StatusBar activeTab={{ name: "f.txt", path: "/tmp/f.txt", content: lf, size: 16 }} />);
    expect(screen.getByText("LF（Unix 换行）")).toBeTruthy();
  });

  it("flags mixed line endings when both are present", () => {
    const mixed = "alpha\nbeta\r\ngamma\n";
    renderInProviders(<StatusBar activeTab={{ name: "f.txt", path: "/tmp/f.txt", content: mixed, size: 17 }} />);
    expect(screen.getByText("混合")).toBeTruthy();
  });

  it("shows 'no content' when the active file content is empty", () => {
    renderInProviders(<StatusBar activeTab={{ name: "empty.txt", path: "/tmp/empty.txt", content: "" }} />);
    expect(screen.getByText("无内容")).toBeTruthy();
  });

  it("renders the theme toggle with a localised label", () => {
    renderInProviders(<StatusBar activeTab={null} />);
    const btn = screen.getByRole("button", { name: "切换明暗主题" });
    expect(btn).toBeTruthy();
  });

  it("uses English aria-label when lang=en", () => {
    try { window.localStorage.setItem("openme.lang", "en"); } catch {}
    renderInProviders(<StatusBar activeTab={{ name: "f.txt", content: "hello\n" }} />);
    expect(screen.getByRole("button", { name: "Toggle light or dark theme" })).toBeTruthy();
    expect(screen.getByLabelText("Active file")).toBeTruthy();
  });

  it("the theme pill cycles dark → light → dark", () => {
    const seen: string[] = [];
    function Probe() {
      const { settings } = useSettings();
      useEffect(() => { seen.push(settings.theme); }, [settings.theme]);
      return null;
    }
    render(
      <I18nProvider>
        <SettingsProvider>
          <Probe />
          <StatusBar activeTab={null} />
        </SettingsProvider>
      </I18nProvider>
    );
    const btn = screen.getByRole("button", { name: /切换|Toggle/ });
    fireEvent.click(btn);
    fireEvent.click(btn);
    // initial 'dark' followed by two clicks that flip back to dark.
    expect(seen[0]).toBe("dark");
    expect(seen[seen.length - 1]).toBe("dark");
    // … but the middle entry should be 'light'.
    expect(seen).toContain("light");
  });

  it("renders the indeterminate progress bar only when isLoading", () => {
    const { rerender } = renderInProviders(<StatusBar activeTab={{ name: "x", isLoading: true }} />);
    expect(document.querySelector(".status-progress")).toBeTruthy();
    rerender(
      <I18nProvider>
        <SettingsProvider>
          <StatusBar activeTab={{ name: "x", isLoading: false }} />
        </SettingsProvider>
      </I18nProvider>
    );
    expect(document.querySelector(".status-progress")).toBeNull();
  });

  it("falls back to t(key) when input has no real path (settings.theme context ok)", () => {
    const spy = vi.fn();
    // Just confirms the component renders successfully under a Chinese locale with a tab lacking path/size/content.
    renderInProviders(<StatusBar activeTab={{ name: "n.bin" }} />);
    spy(); // silence unused
    expect(screen.getByText("n.bin")).toBeTruthy();
  });

    it("shows the idle hint when no tab is active", () => {
      renderInProviders(<StatusBar activeTab={null} />);
      expect(screen.getByText("按 Ctrl+O 打开文件，或拖入任意文件")).toBeTruthy();
    });

    it("shows the tab position pill only when there is more than one tab", () => {
      const { rerender } = renderInProviders(
        <StatusBar activeTab={{ name: "a.txt" }} activePosition={1} totalTabs={1} />
      );
      expect(document.querySelector(".status-tab-position")).toBeNull();
      rerender(
        <I18nProvider>
          <SettingsProvider>
            <StatusBar activeTab={{ name: "a.txt" }} activePosition={2} totalTabs={4} />
          </SettingsProvider>
        </I18nProvider>
      );
      expect(screen.getByText("第 2 个，共 4 个")).toBeTruthy();
    });

    it("shows the high-risk chip when riskLevel is high", () => {
      renderInProviders(
        <StatusBar
          activeTab={{ name: "danger.exe", riskLevel: "high" }}
        />
      );
      expect(screen.getByText("风险·高风险")).toBeTruthy();
    });

    it("shows the external strategy chip for external files", () => {
      renderInProviders(
        <StatusBar
          activeTab={{ name: "foo.psd", openStrategy: "external" }}
        />
      );
      expect(screen.getByText("打开方式：外部程序打开")).toBeTruthy();
    });

    it("shows the restricted strategy chip for restricted files", () => {
      renderInProviders(
        <StatusBar
          activeTab={{ name: "bar", openStrategy: "restricted" }}
        />
      );
      expect(screen.getByText("打开方式：OpenMe 限制卡片")).toBeTruthy();
    });

    it("hides risk/strategy chips for builtin / low-risk files", () => {
      renderInProviders(
        <StatusBar
          activeTab={{ name: "safe.txt", openStrategy: "builtin", riskLevel: "low" }}
        />
      );
      expect(document.querySelector(".status-risk-chip")).toBeNull();
      expect(document.querySelector(".status-strategy-chip")).toBeNull();
    });

    it("renders English idle hint copy under en locale", () => {
      try { window.localStorage.setItem("openme.lang", "en"); } catch {}
      renderInProviders(<StatusBar activeTab={null} />);
      expect(screen.getByText("Press Ctrl+O to open a file, or drop one anywhere")).toBeTruthy();
    });
  });
