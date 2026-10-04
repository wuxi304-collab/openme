import { describe, expect, it } from "vitest";
import {
  compactForSearch,
  extractCadText,
  pickCadTextAt,
  type CadTextItem,
} from "./extractCadText";

const wrap = (body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${body}</svg>`;

describe("extractCadText", () => {
  it("extracts a single-line label and tags the element", () => {
    const result = extractCadText(wrap(`<text x="1">备注：</text>`));
    expect(result.items).toHaveLength(1);
    expect(result.items[0].text).toBe("备注：");
    expect(result.svg).toContain(`data-cad-text-id="${result.items[0].id}"`);
  });

  it("flattens nested tspans into one label", () => {
    const result = extractCadText(
      wrap(`<text><tspan x="0">第一行</tspan><tspan x="0">第二行</tspan></text>`),
    );
    expect(result.items).toHaveLength(1);
    expect(result.items[0].text).toBe("第一行 第二行");
  });

  it("collapses the padded spacing used in title blocks", () => {
    const result = extractCadText(wrap(`<text>结      构</text>`));
    expect(result.items[0].text).toBe("结 构");
  });

  it("skips empty labels and the ACadSharp '.' placeholder", () => {
    const result = extractCadText(wrap(`<text>   </text><text>.</text><text>ok</text>`));
    expect(result.items).toHaveLength(1);
    expect(result.items[0].text).toBe("ok");
  });

  it("assigns unique ids across many labels", () => {
    const result = extractCadText(wrap(`<text>a</text><text>b</text><text>c</text>`));
    const ids = result.items.map((i) => i.id);
    expect(new Set(ids).size).toBe(3);
    expect(result.items.map((i) => i.text)).toEqual(["a", "b", "c"]);
  });

  it("decodes XML entities in the label", () => {
    const result = extractCadText(wrap(`<text>A&amp;B &lt;1&gt;</text>`));
    expect(result.items[0].text).toBe("A&B <1>");
  });

  it("does not duplicate the id attribute on re-extraction", () => {
    const once = extractCadText(wrap(`<text>x</text>`));
    const twice = extractCadText(once.svg);
    const count = (twice.svg.match(/data-cad-text-id=/g) ?? []).length;
    expect(count).toBe(1);
  });

  it("matches letter-spaced title-block text when the query has no spaces", () => {
    // "会签" must still find the label rendered as "会 签 栏".
    const result = extractCadText(wrap(`<text>会    签    栏</text>`));
    expect(result.items[0].text).toBe("会 签 栏");
    expect(compactForSearch(result.items[0].text)).toContain(compactForSearch("会签"));
  });

  it("leaves non-text markup untouched", () => {
    const svg = wrap(`<line x1="0" y1="0" x2="1" y2="1" /><text>L</text>`);
    const result = extractCadText(svg);
    expect(result.svg).toContain(`<line x1="0" y1="0" x2="1" y2="1" />`);
  });
});

describe("extractCadText entity kinds", () => {
  it("assigns TEXT when the writer's marker precedes a <text> via a <g> wrapper", () => {
    const svg = wrap(`<!--TEXT | 1--><g><text transform="translate(0,0)">备注</text></g>`);
    expect(extractCadText(svg).items[0].kind).toBe("TEXT");
  });

  it("assigns MTEXT and ATTDEF", () => {
    const m = wrap(`<!--MTEXT | 2--><g><text>建 筑</text></g>`);
    const a = wrap(`<!--ATTDEF | 3--><g><text>secmark</text></g>`);
    expect(extractCadText(m).items[0].kind).toBe("MTEXT");
    expect(extractCadText(a).items[0].kind).toBe("ATTDEF");
  });

  it("leaves the kind undefined when no marker precedes the element", () => {
    const svg = wrap(`<g><text>无名</text></g>`);
    expect(extractCadText(svg).items[0].kind).toBeUndefined();
  });

  it("drops the kind when another element sits between marker and text", () => {
    // The marker is consumed by a generic element before it reaches a text.
    const svg = wrap(`<!--TEXT | 1--><g><line/><text>应为未知</text></g>`);
    expect(extractCadText(svg).items[0].kind).toBeUndefined();
  });

  it("ignores markers for non-text kinds (e.g. LINE) even if they reach a text", () => {
    // Defensive: a stray "LINE" comment must never be reported as a text kind.
    const svg = wrap(`<!--LINE | 1--><g><text>x</text></g>`);
    expect(extractCadText(svg).items[0].kind).toBeUndefined();
  });
});

describe("extractCadText composed geometry", () => {
  it("composes a single translate on the <g> ancestor", () => {
    const svg = wrap(
      `<g transform="translate(10,20)"><text transform="translate(3,4)">x</text></g>`,
    );
    const item = extractCadText(svg).items[0];
    expect(item.geom?.x).toBeCloseTo(13);
    expect(item.geom?.y).toBeCloseTo(24);
  });

  it("composes translate + scale on a nested <g>", () => {
    const svg = wrap(
      `<g transform="translate(100,0) scale(2,1)"><text transform="translate(3,4)">x</text></g>`,
    );
    const item = extractCadText(svg).items[0];
    expect(item.geom?.x).toBeCloseTo(106); // 100 + 2*3
    expect(item.geom?.y).toBeCloseTo(4); // 0 + 1*4
  });

  it("captures rotation from the element's own rotate(...) without moving the origin", () => {
    const svg = wrap(
      `<text transform="translate(10,-20) scale(1,-1) rotate(-90)">建</text>`,
    );
    const item = extractCadText(svg).items[0];
    expect(item.geom?.x).toBeCloseTo(10);
    expect(item.geom?.y).toBeCloseTo(-20);
    expect(item.geom?.rotation).toBeCloseTo(-90);
  });

  it("parses font-size from a normalized style attribute", () => {
    const svg = wrap(
      `<text style="font-size:6px;font-family:sans-serif;">x</text>`,
    );
    expect(extractCadText(svg).items[0].geom?.height).toBeCloseTo(6);
  });

  it("parses text-anchor and rotation correctly together", () => {
    const svg = wrap(
      `<text transform="translate(0,0) rotate(0)" text-anchor="middle">x</text>`,
    );
    const item = extractCadText(svg).items[0];
    expect(item.geom?.textAnchor).toBe("middle");
    expect(item.geom?.rotation).toBe(0);
  });
});

describe("pickCadTextAt", () => {
  const make = (overrides: Partial<CadTextItem>): CadTextItem => ({
    id: "x",
    text: "hello",
    raw: "hello",
    geom: { x: 0, y: 0, height: 4, textAnchor: "start", rotation: 0 },
    ...overrides,
  });

  it("picks the label whose box contains the point", () => {
    const items = [make({ id: "a", geom: { x: 10, y: 0, height: 4, textAnchor: "start", rotation: 0 } })];
    expect(pickCadTextAt(items, { x: 11, y: 1 }, { tolerance: 2 })).toBe("a");
  });

  it("picks the nearest label when several are within tolerance", () => {
    const items = [
      make({ id: "near", geom: { x: 10, y: 0, height: 2, textAnchor: "start", rotation: 0 } }),
      make({ id: "far", geom: { x: 80, y: 0, height: 2, textAnchor: "start", rotation: 0 } }),
    ];
    expect(pickCadTextAt(items, { x: 15, y: 0 }, { tolerance: 20 })).toBe("near");
  });

  it("returns null when the click is outside every box by more than the tolerance", () => {
    const items = [make({ id: "a", geom: { x: 10, y: 10, height: 2, textAnchor: "start", rotation: 0 } })];
    expect(pickCadTextAt(items, { x: 80, y: 80 }, { tolerance: 5 })).toBeNull();
  });

  it("ignores items without geometry (DOM-measured-only path)", () => {
    const items = [
      { id: "geomless", text: "?", raw: "?" } as CadTextItem,
      make({ id: "with", geom: { x: 0, y: 0, height: 4, textAnchor: "start", rotation: 0 } }),
    ];
    expect(pickCadTextAt(items, { x: 1, y: 0 }, { tolerance: 2 })).toBe("with");
  });

  it("uses rotated box for vertical/rotated text", () => {
    // Box 4 units tall, rotated 90° clockwise around its origin: extends along
    // +x (right) from the origin. A click 2 units to the right should hit.
    const items = [
      make({
        id: "vertical",
        geom: { x: 10, y: 10, height: 4, textAnchor: "start", rotation: 90 },
      }),
    ];
    expect(pickCadTextAt(items, { x: 12, y: 10 }, { tolerance: 1 })).toBe("vertical");
  });

  it("falls back to a degenerate point when font-size is unknown", () => {
    const items = [
      make({
        id: "noheight",
        text: "?",
        geom: { x: 5, y: 5, height: 0, textAnchor: "start", rotation: 0 },
      }),
    ];
    expect(pickCadTextAt(items, { x: 5, y: 5 }, { tolerance: 1 })).toBe("noheight");
  });
});
