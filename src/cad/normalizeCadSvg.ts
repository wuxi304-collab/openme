/**
 * Normalises and sanitises the SVG produced by the ACadSharp `SvgWriter` sidecar before it
 * is inlined into the OpenMe CAD canvas.
 *
 * Why this exists — measured against real ACadSharp output (see cad-host/*.svg samples):
 *
 *  1. The writer emits a malformed font shorthand (`style="font:52.5px "`) whose empty
 *     family terminates the style attribute early, so TEXT/MTEXT can render with a broken
 *     or missing font.
 *  2. Stroke widths are emitted in millimetres (`stroke-width="0.18mm"`) paired with
 *     `vector-effect="non-scaling-stroke"`, which produces hairlines that effectively
 *     disappear once the drawing is fitted to a viewport.
 *  3. Raw AutoCAD colour indices are emitted verbatim, so ACI 7 resolves to white on a
 *     light engineering background — the classic "invisible entities" failure.
 *  4. Root `width`/`height` are absolute drawing units thousands of pixels wide, which
 *     fights any attempt to fit the drawing to the viewport.
 *
 * It also sanitises the markup, because the result is inlined (not loaded through `<img>`)
 * so that it stays crisp at any zoom level.
 */

export type CadCanvasBackground = "light" | "dark";

export interface CadSvgOptions {
  background?: CadCanvasBackground;
  /** Minimum stroke width in px; enforces visibility of hairline geometry. */
  minStrokePx?: number;
  fontFamily?: string;
}

export interface CadSvgViewBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CadSvgResult {
  svg: string;
  viewBox: CadSvgViewBox | null;
  /** Number of script-bearing or otherwise unsafe constructs stripped out. */
  removedUnsafeConstructs: number;
}

/**
 * Drawings whose SVG exceeds this size are rendered through `<img>` instead of
 * being inlined into the DOM. Why: pan/zoom is a CSS transform on the drawing,
 * which forces the compositor to build a layer the size of the whole subtree. A
 * 6 MB / ~7k-node ACadSharp export makes that layer big enough to take the GPU
 * process down, and with `--in-process-gpu` that kills the whole app.
 * Rasterising through `<img>` keeps the compositor working with a single bitmap,
 * so zoom/pan stays cheap and the app stays alive.
 */
export const CAD_SVG_INLINE_BYTE_LIMIT = 1_000_000;

/**
 * Returns whether a drawing of `bytes` bytes should be inlined (interactive
 * canvas) or routed through `<img>` (bitmap fallback). The cutoff favours
 * Vector fidelity where it is cheap and falls back when compositing a
 * multi-megabyte layer would risk crashing the GPU process.
 */
export function shouldInlineCadSvg(bytes: number): boolean {
  return bytes <= CAD_SVG_INLINE_BYTE_LIMIT;
}

const DEFAULT_FONT = "Consolas, 'Microsoft YaHei', 'Noto Sans SC', sans-serif";
const MM_PER_INCH = 25.4;
const CSS_PX_PER_INCH = 96;

export function normalizeCadSvg(input: string, options: CadSvgOptions = {}): CadSvgResult {
  const background = options.background ?? "light";
  const minStrokePx = options.minStrokePx ?? 0.75;
  const fontFamily = options.fontFamily ?? DEFAULT_FONT;

  let removedUnsafeConstructs = 0;
  let svg = String(input ?? "");

  // 1. Strip unsafe constructs before anything else touches the string.
  const strip = (pattern: RegExp): void => {
    const before = svg.length;
    svg = svg.replace(pattern, "");
    if (svg.length !== before) removedUnsafeConstructs += 1;
  };

  strip(/<\s*script\b[\s\S]*?<\s*\/\s*script\s*>/gi);
  strip(/<\s*script\b[^>]*\/\s*>/gi);
  strip(/<\s*foreignObject\b[\s\S]*?<\s*\/\s*foreignObject\s*>/gi);
  strip(/<\s*(iframe|embed|object|audio|video)\b[\s\S]*?<\s*\/\s*\1\s*>/gi);

  // Event handler attributes.
  const eventHandlers = svg.match(/\son[a-z]+\s*=/gi);
  if (eventHandlers) {
    removedUnsafeConstructs += eventHandlers.length;
    svg = svg.replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  }

  // Non-fragment href/xlink:href (javascript:, http(s):, protocol-relative…).
  const remoteRefs = svg.match(/(?:xlink:)?href\s*=\s*"(?!#)[^"]*"/gi);
  if (remoteRefs) {
    // Keep inline data: images (raster references inside the drawing); drop everything else.
    const kept = remoteRefs.filter((value) => /data:/i.test(value));
    removedUnsafeConstructs += remoteRefs.length - kept.length;
    svg = svg.replace(/(?:xlink:)?href\s*=\s*"(?!#)(?!data:)[^"]*"/gi, 'href=""');
  }
  strip(/url\s*\(\s*["']?(?:https?:)?\/\/[^)]*\)/gi);

  // 2. Repair the malformed font shorthand. The empty family closes the attribute early,
  //    so the replacement restores the closing quote and keeps the markup well-formed.
  //    Also normalise real CSS font-family names (e.g. SHX-derived "TXT", "MONOTXT",
  //    "SIMPLEX") to a CJK-capable stack so Chinese text actually renders in Chromium.
  svg = svg.replace(/font:\s*([\d.]+)px\s*"/g, `font-size:$1px;font-family:${fontFamily};"`);
  svg = svg.replace(/font:\s*([\d.]+)px\s*'/g, `font-size:$1px;font-family:${fontFamily};'`);
  svg = svg.replace(/font:\s*([\d.]+)px\s*;/g, `font-size:$1px;font-family:${fontFamily};`);
  svg = svg.replace(/font:\s*([\d.]+)px([^;"']+)(["'])/g, (_match, size: string, family: string, quote: string) => {
    const cleaned = family.replace(/["']/g, "").trim();
    return `font-size:${size}px;font-family:${cleaned ? `${cleaned}, ${fontFamily}` : fontFamily};${quote}`;
  });

  // 2b. Strip AutoCAD MTEXT inline formatting codes from text content.
  svg = stripMtextFormatting(svg);

  // 3. Convert mm stroke widths to px and enforce a visible minimum.
  svg = svg.replace(/stroke-width\s*=\s*"([\d.]+)\s*mm"/gi, (_match, value: string) => {
    const px = (Number(value) * CSS_PX_PER_INCH) / MM_PER_INCH;
    return `stroke-width="${formatNumber(Math.max(px, minStrokePx))}"`;
  });
  svg = svg.replace(/stroke-width\s*=\s*"([\d.]+)\s*(?:px)?"/gi, (_match, value: string) => {
    const px = Number(value);
    if (!Number.isFinite(px) || px <= 0) return _match;
    return `stroke-width="${formatNumber(Math.max(px, minStrokePx))}"`;
  });

  // 4. Remap colours that would be invisible against the chosen background.
  svg = remapInvisibleColors(svg, background);

  // 5. Make the root responsive while preserving the viewBox, and paint a background.
  const viewBox = parseViewBox(svg);
  svg = svg.replace(/<svg\b([^>]*)>/i, (_match, attributes: string) => {
    const next = attributes
      .replace(/\spreserveAspectRatio\s*=\s*"[^"]*"/gi, "")
      .replace(/\swidth\s*=\s*"[^"]*"/gi, ' width="100%"')
      .replace(/\sheight\s*=\s*"[^"]*"/gi, ' height="100%"');
    const withWidth = /\swidth\s*=\s*"/i.test(next) ? next : `${next} width="100%"`;
    const withHeight = /\sheight\s*=\s*"/i.test(withWidth) ? withWidth : `${withWidth} height="100%"`;
    return `<svg${withHeight} preserveAspectRatio="xMidYMid meet">`;
  });

  if (viewBox) {
    const fill = background === "dark" ? "#0f1115" : "#f7f5f0";
    svg = svg.replace(
      /<svg\b[^>]*>/i,
      (match) =>
        `${match}<rect x="${viewBox.x}" y="${viewBox.y}" width="${viewBox.width}" height="${viewBox.height}" fill="${fill}" />`,
    );
  }

  // 6. Wrap inner content in a dedicated <g> so the renderer's pan/zoom transform
  //    can be attached to that group without overriding the root <svg> element's own
  //    `transform="scale(1,-1)"` attribute (CSS transform on the root would replace
  //    that attribute and undo the Y-flip the geometry relies on).
  svg = wrapInPanZoomGroup(svg);

  return { svg, viewBox, removedUnsafeConstructs };
}

/**
 * Wraps everything between `<svg ...>` and `</svg>` in `<g class="cad-svg-stage-g">`.
 * No-op when the markup isn't shaped like an SVG document.
 */
function wrapInPanZoomGroup(svg: string): string {
  const open = svg.match(/<svg\b[^>]*>/i);
  const close = svg.match(/<\/svg\s*>/i);
  if (!open || !close) return svg;
  const openIdx = (open.index ?? 0) + open[0].length;
  const closeIdx = close.index ?? svg.length;
  if (closeIdx <= openIdx) return svg;
  const inner = svg.slice(openIdx, closeIdx);
  return `${svg.slice(0, openIdx)}<g class="cad-svg-stage-g">${inner}</g>${svg.slice(closeIdx)}`;
}

/**
 * Strips AutoCAD MTEXT inline formatting codes out of text content.
 *
 * ACadSharp's SvgWriter emits MTEXT content verbatim, so codes meant to be
 * interpreted leak into the visible label. On a real title block that turns
 * `\W0.75;结  构` into the literal string "W0.75;结  构" on screen — the sheet
 * looks like a decoding failure even though the Chinese decoded perfectly.
 *
 * Two shapes have to be handled:
 *   1. Codes that kept their backslash (`\W0.75;`, `\H2.5x;`, `\C1;`, `\fArial|b0;`).
 *   2. Codes that lost it — observed in practice — leaving a bare `W0.75;`
 *      prefix. Only a *leading* run is stripped, and only when each segment
 *      carries a numeric/`|` parameter, so legitimate labels are not eaten.
 *
 * Only element text content is touched; attributes are never rewritten.
 */
function stripMtextFormatting(svg: string): string {
  return svg.replace(
    /(<(?:text|tspan)\b[^>]*>)([^<]*)(<\/)/gi,
    (_match, open: string, content: string, close: string) =>
      `${open}${cleanMtextContent(content)}${close}`,
  );
}

function cleanMtextContent(value: string): string {
  if (!value) return value;
  let out = value;

  // 1. Backslash-prefixed codes with parameters: \W0.75;  \H2.5x;  \C1;  \fArial|b0|i0;
  out = out.replace(/\\[A-Za-z][^;\\]{0,60};/g, "");

  // 2. Backslash toggles and escapes: \P (paragraph), \L \l \O \o \K \k, \~ \{ \}
  out = out.replace(/\\([PLlOoKk{}])/g, "");
  out = out.replace(/\\~/g, " ");

  // 3. Grouping braces left behind after the codes are gone.
  out = out.replace(/[{}]/g, "");

  // 4. Backslash-less codes left at the start, e.g. "W0.75;结  构".
  out = out.replace(/^(?:[WHCTAQSFO][\d.|a-zA-Z-]{0,40};)+/, (run) => {
    const segments = run.split(";").filter(Boolean);
    const looksLikeCodes = segments.length > 0 && segments.every((seg) => /[\d|]/.test(seg.slice(1)));
    return looksLikeCodes ? "" : run;
  });

  return out;
}

/**
 * ACadSharp writes raw AutoCAD colour indices. ACI 7 is nominally "black or white
 * depending on background" and is emitted as literal white, which vanishes on a light
 * engineering sheet. Do the same for near-black strokes on the dark sheet.
 */
function remapInvisibleColors(svg: string, background: CadCanvasBackground): string {
  if (background === "light") {
    return svg.replace(/(?:stroke|fill)\s*=\s*"(?:rgb\(\s*255\s*,\s*255\s*,\s*255\s*\)|#fff(?:fff)?|white)"/gi, (match) =>
      match.startsWith("stroke") ? 'stroke="#1f2430"' : 'fill="#1f2430"',
    );
  }
  return svg.replace(/(?:stroke|fill)\s*=\s*"(?:rgb\(\s*0\s*,\s*0\s*,\s*0\s*\)|#000(?:000)?|black)"/gi, (match) =>
    match.startsWith("stroke") ? 'stroke="#e8eaf0"' : 'fill="#e8eaf0"',
  );
}

export function parseViewBox(svg: string): CadSvgViewBox | null {
  const match = svg.match(/viewBox\s*=\s*"([^"]+)"/i);
  if (!match) return null;
  const parts = match[1]
    .split(/[\s,]+/)
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));
  if (parts.length !== 4) return null;
  const [x, y, width, height] = parts;
  if (width <= 0 || height <= 0) return null;
  return { x, y, width, height };
}

function formatNumber(value: number): string {
  return String(Number(value.toFixed(3)));
}
