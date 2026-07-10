// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { I18nProvider } from "../../i18n";
import FontViewer from "./FontViewer";

class FakeFontFace {
  family: string;
  status: "unloaded" | "loading" | "loaded" | "error" = "unloaded";
  constructor(public _family: string, public _source: string) {
    this.family = _family;
  }
  load() {
    this.status = "loaded";
    (document as any).fonts._faces.push(this);
    return Promise.resolve(this);
  }
}

beforeEach(() => {
  if (!URL.createObjectURL) {
    URL.createObjectURL = (blob: Blob) => `blob:fake-${Math.random()}`;
    URL.revokeObjectURL = () => undefined;
  }
  (window as any).FontFace = FakeFontFace;
  (document as any).fonts = {
    _faces: [] as FakeFontFace[],
    add(face: FakeFontFace) {
      this._faces.push(face);
    },
    delete(face: FakeFontFace) {
      this._faces = this._faces.filter((f: FakeFontFace) => f !== face);
    },
  };
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderFont(props: Parameters<typeof FontViewer>[0]) {
  return render(
    <I18nProvider>
      <FontViewer {...props} />
    </I18nProvider>
  );
}

describe("FontViewer polish", () => {
  beforeEach(() => {
    try {
      window.localStorage.setItem("openme.lang", "en");
    } catch {
      // ignore
    }
  });
  it("renders toolbar with aria-label and exposes range input with values", () => {
    renderFont({ base64Data: btoa("fake-font-bytes"), fileName: "Inter-Regular.otf" });
    expect(screen.getByRole("toolbar", { name: "Font preview toolbar" })).toBeTruthy();
    const range = screen.getByRole("slider");
    expect(range.getAttribute("aria-valuemin")).toBe("18");
    expect(range.getAttribute("aria-valuemax")).toBe("120");
    expect(range.getAttribute("aria-valuenow")).toBe("54");
  });

  it("renders hero preview region with aria-live and aria-busy", () => {
    renderFont({ base64Data: btoa("fake-font-bytes"), fileName: "Inter-Regular.otf" });
    const hero = screen.getByRole("status");
    expect(hero.getAttribute("aria-live")).toBe("polite");
  });

  it("renders specimen list region with aria-label", () => {
    renderFont({ base64Data: btoa("fake-font-bytes"), fileName: "Inter-Regular.otf" });
    expect(screen.getByRole("region", { name: "Specimen list" })).toBeTruthy();
  });
});
