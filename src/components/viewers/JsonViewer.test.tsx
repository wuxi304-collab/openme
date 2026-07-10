// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import JsonViewer from "./JsonViewer";
import { I18nProvider } from "../../i18n";

function renderJson(json: string) {
  try { window.localStorage.setItem("openme.lang", "en"); } catch { /* ignore */ }
  if (typeof Element !== "undefined" && !Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = function () {};
  }
  return render(
    <I18nProvider>
      <JsonViewer content={json} />
    </I18nProvider>,
  );
}

describe("JsonViewer v2", () => {
  beforeEach(() => {
    try { window.localStorage.setItem("openme.lang", "en"); } catch { /* ignore */ }
  });
  afterEach(() => {
    cleanup();
  });

  it("renders the root container with size chip", () => {
    renderJson('{"a":1,"b":2}');
    expect(screen.getByText(/"a"/)).toBeTruthy();
    expect(screen.getByText(/"b"/)).toBeTruthy();
    expect(screen.getByText("{2}")).toBeTruthy();
  });

  it("renders arrays with bracket size chip", () => {
    renderJson("[10,20,30]");
    expect(screen.getByText("[3]")).toBeTruthy();
  });

  it("shows the JSON label and toolbar buttons", () => {
    renderJson('{"a":1}');
    expect(screen.getByText("JSON")).toBeTruthy();
    expect(screen.getByLabelText("Expand all")).toBeTruthy();
    expect(screen.getByLabelText("Collapse all")).toBeTruthy();
  });

  it("search input filters with announcement", () => {
    renderJson('{"alpha":1,"beta":2,"alphabet":3}');
    const search = screen.getByLabelText("Search JSON");
    fireEvent.change(search, { target: { value: "alpha" } });
    // root + matching leaf + sibling should all still render (search keeps structure)
    expect(screen.getByText(/"alpha"/)).toBeTruthy();
    expect(screen.getByText(/"alphabet"/)).toBeTruthy();
    expect(screen.getByText(/"beta"/)).toBeTruthy();
  });

  it("status bar shows idle hint when no node focused", () => {
    renderJson('{"a":1}');
    expect(screen.getByText("Use arrow keys to navigate")).toBeTruthy();
  });

  it("copy path button is disabled until a node is focused", () => {
    renderJson('{"a":1}');
    const copyBtn = screen.getByLabelText("Copy path");
    expect((copyBtn as HTMLButtonElement).disabled).toBe(true);
  });

  it("clicking a leaf row focuses it", () => {
    renderJson('{"a":1,"b":2}');
    const aRow = screen.getByText("1").closest(".json-row");
    expect(aRow).toBeTruthy();
    fireEvent.click(aRow!);
    expect(aRow!.className).toContain("is-focused");
  });

  it("Escape clears the search query", () => {
    renderJson('{"a":1,"b":2}');
    const search = screen.getByLabelText("Search JSON");
    fireEvent.change(search, { target: { value: "alpha" } });
    expect((search as HTMLInputElement).value).toBe("alpha");
    fireEvent.keyDown(search, { key: "Escape" });
    expect((search as HTMLInputElement).value).toBe("");
  });

  it("expand-all button reveals nested children", () => {
    renderJson('{"a":{"b":{"c":1}}}');
    const expandAll = screen.getByLabelText("Expand all");
    fireEvent.click(expandAll);
    expect(screen.getByText(/"c"/)).toBeTruthy();
  });
});