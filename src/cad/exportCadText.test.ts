import { describe, expect, it } from "vitest";
import type { CadTextItem } from "./extractCadText";
import {
  CAD_TEXT_EXPORT_PROVENANCE,
  suggestExportFileName,
  toCadTextCsv,
  toCadTextJson,
} from "./exportCadText";

const item = (over: Partial<CadTextItem> = {}): CadTextItem => ({
  id: "0",
  text: "结  构",
  raw: "<text>结  构</text>",
  kind: "MTEXT",
  geom: { x: 12.3456, y: -7.8912, height: 2.5, textAnchor: "middle", rotation: 90 },
  ...over,
});

const meta = { fileName: "12.栏杆节点图.dwg", version: "AC1018", generatedAt: "2026-10-04T00:00:00Z" };

describe("toCadTextCsv", () => {
  it("leads with the provenance banner on every export", () => {
    // A spreadsheet that leaves the app is exactly where "these ids are not
    // entity handles" stops being obvious.
    const csv = toCadTextCsv([item()], meta);
    const firstLine = csv.replace(/^\uFEFF/, "").split("\r\n")[0];
    expect(firstLine).toBe(`# ${CAD_TEXT_EXPORT_PROVENANCE}`);
    expect(CAD_TEXT_EXPORT_PROVENANCE).toMatch(/not entity-authoritative/i);
  });

  it("defaults to a UTF-8 BOM so Excel opens Chinese text correctly", () => {
    expect(toCadTextCsv([], meta).charCodeAt(0)).toBe(0xfeff);
    expect(toCadTextCsv([], meta, { bom: false }).charCodeAt(0)).not.toBe(0xfeff);
  });

  it("quotes fields containing commas, quotes and newlines", () => {
    const csv = toCadTextCsv(
      [item({ text: 'A, B "C"' }), item({ id: "1", text: "line1\nline2" })],
      meta,
      { bom: false },
    );
    const lines = csv.split("\r\n");
    // `"A, B ""C"""` — the embedded quote is doubled, the field is wrapped.
    expect(lines[6]).toBe('0,MTEXT,"A, B ""C""",12.346,-7.891,2.5,middle,90');
    expect(lines[7]).toBe('1,MTEXT,"line1\nline2",12.346,-7.891,2.5,middle,90');
  });

  it("writes one row per label with rounded coordinates", () => {
    const csv = toCadTextCsv([item(), item({ id: "1", text: "SUS304" })], meta, { bom: false });
    const lines = csv.split("\r\n").filter(Boolean);
    // Five `#` provenance lines, then the column header, then one line per label.
    expect(lines).toHaveLength(8);
    expect(lines.slice(0, 5).every((line) => line.startsWith("# "))).toBe(true);
    expect(lines[5]).toBe("id,kind,text,x,y,height,textAnchor,rotation");
    expect(lines[6]).toBe("0,MTEXT,结  构,12.346,-7.891,2.5,middle,90");
    expect(lines[7]).toBe("1,MTEXT,SUS304,12.346,-7.891,2.5,middle,90");
  });

  it("tolerates a label with no geometry or kind", () => {
    const csv = toCadTextCsv([item({ geom: undefined, kind: undefined })], meta, { bom: false });
    // 8 columns means 7 separators; absent fields stay as empty cells rather
    // than shifting the remaining values left.
    expect(csv.split("\r\n")[6]).toBe("0,,结  构,,,,,");
  });

  it("neutralises formula-looking cells so Excel cannot execute them", () => {
    // This export is BOM'd for Excel on purpose and is expected to leave the
    // app, so a drawing label that happens to start with = + - or @ must not
    // become a live formula in the recipient's sheet.
    const csv = toCadTextCsv(
      [
        item({ text: '=HYPERLINK("http://evil","click")' }),
        item({ id: "1", text: "+cmd|'/c calc'!A1" }),
        item({ id: "2", text: "@SUM(A1:A9)" }),
      ],
      meta,
      { bom: false },
    );
    const rows = csv.split("\r\n");
    // Only cells that actually contain a delimiter/quote/newline get wrapped in
    // double quotes; the apostrophe prefix is what neutralises the formula.
    expect(rows[6]).toMatch(/^0,MTEXT,"'=HYPERLINK/);
    expect(rows[7]).toMatch(/^1,MTEXT,'\+cmd\|'/);
    expect(rows[8]).toMatch(/^2,MTEXT,'@SUM/);
  });

  it("leaves ordinary and numeric cells alone", () => {
    // The neutraliser must not mangle a negative coordinate into text.
    const csv = toCadTextCsv([item()], meta, { bom: false });
    const row = csv.split("\r\n")[6];
    expect(row).toBe("0,MTEXT,结  构,12.346,-7.891,2.5,middle,90");
    expect(row).not.toContain("'");
  });

  it("records the count it actually wrote", () => {
    const csv = toCadTextCsv([item(), item({ id: "1" })], meta, { bom: false });
    expect(csv).toContain("# count=2");
  });

  it("handles an empty inventory without producing a broken header", () => {
    const csv = toCadTextCsv([], meta, { bom: false });
    expect(csv).toContain("# count=0");
    expect(csv).toContain("id,kind,text,x,y,height,textAnchor,rotation");
  });
});

describe("toCadTextJson", () => {
  it("emits a schema, the provenance banner and the labels", () => {
    const payload = JSON.parse(toCadTextJson([item(), item({ id: "1", text: "SUS304" })], meta));
    expect(payload.schemaVersion).toBe(1);
    expect(payload.provenance).toBe(CAD_TEXT_EXPORT_PROVENANCE);
    expect(payload.source).toMatchObject({ fileName: "12.栏杆节点图.dwg", version: "AC1018", itemCount: 2 });
    expect(payload.labels).toHaveLength(2);
    expect(payload.labels[0]).toEqual({
      id: "0",
      kind: "MTEXT",
      text: "结  构",
      x: 12.3456,
      y: -7.8912,
      height: 2.5,
      textAnchor: "middle",
      rotation: 90,
    });
  });

  it("uses null rather than dropping absent fields", () => {
    const payload = JSON.parse(toCadTextJson([item({ geom: undefined, kind: undefined })], meta));
    expect(payload.labels[0]).toEqual({
      id: "0",
      kind: null,
      text: "结  构",
      x: null,
      y: null,
      height: null,
      textAnchor: null,
      rotation: null,
    });
  });

  it("is valid JSON for an empty inventory", () => {
    const payload = JSON.parse(toCadTextJson([], meta));
    expect(payload.labels).toEqual([]);
    expect(payload.source.itemCount).toBe(0);
  });
});

describe("suggestExportFileName", () => {
  it("replaces the drawing extension", () => {
    expect(suggestExportFileName("12.栏杆节点图.dwg", "csv")).toBe("12.栏杆节点图.labels.csv");
    expect(suggestExportFileName("plan.dxf", "json")).toBe("plan.labels.json");
  });

  it("keeps dots that are part of the name", () => {
    expect(suggestExportFileName("plate.06.rev2.dwg", "csv")).toBe("plate.06.rev2.labels.csv");
  });

  it("falls back to a usable name", () => {
    expect(suggestExportFileName("", "csv")).toBe("drawing.labels.csv");
  });
});
