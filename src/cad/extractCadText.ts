/**
 * Entity kinds the ACadSharp SVG writer tags with `<!--TYPE | n-->` markers.
 *
 * The writer emits a marker comment immediately before every entity it renders,
 * but we only trust the marker for the kinds that actually carry visible text.
 * A stray "LINE" comment preceding a text is treated as a miscount and dropped.
 */
export type CadTextKind = "TEXT" | "MTEXT" | "ATTDEF" | "ATTRIB";

/** Drawing-space geometry captured during extraction. */
export interface CadTextGeom {
  /** Origin in SVG user units (the viewBox coordinate space), composed from ancestor <g transform> transforms. */
  x: number;
  y: number;
  /**
   * Nominal cap height in user units, parsed from the element's font-size.
   * 0 when the writer emitted no font-size; the hit tester then treats the
   * label as a point so a generous tolerance still picks it up.
   */
  height: number;
  /** "start" (default), "middle", or "end" — controls the horizontal hit box. */
  textAnchor: "start" | "middle" | "end";
  /** Net rotation in degrees parsed from rotate(...) in the element's own transform. */
  rotation: number;
}

export interface CadTextItem {
  /** Stable id matching the `data-cad-text-id` attribute injected into the SVG. */
  id: string;
  /** Visible label with tags/MTEXT codes removed and whitespace normalised. */
  text: string;
  /** Raw inner markup of the <text> element, for reference. */
  raw: string;
  /**
   * Entity kind derived from the writer's `<!--TYPE | n-->` marker. Undefined
   * when no marker is present within one wrapper of the element — the signal
   * is conservative by design.
   */
  kind?: CadTextKind;
  /**
   * Drawing-space origin of the label. Approximate by design: the writer nests
   * text inside block <g transform="..."> instances whose full transform we
   * compose, so the value is exact for direct text and consistent with what
   * the browser renders for nested text. Sub-unit labels (font-size ≈ 1 unit)
   * keep the hit box within a few units of the visible glyph.
   */
  geom?: CadTextGeom;
}

export interface CadTextExtraction {
  items: CadTextItem[];
  /** Same SVG with `data-cad-text-id="N"` added to every <text> element. */
  svg: string;
}

/**
 * Enumerates every text label in an ACadSharp-rendered SVG and tags the
 * elements so the viewer can locate and highlight them in the DOM.
 *
 * Why the SVG and not the DWG: text in these sheets overwhelmingly lives inside
 * block definitions (a 194-entity sheet reported only 3 top-level TextEntity),
 * so `--inspect` never sees it, while the rendered SVG has every label plus its
 * transform.
 *
 * One single-pass scanner over the markup does three things at once:
 *   1. Inject `data-cad-text-id` so the canvas can map a click back to a label.
 *   2. Read `<!--TYPE | n-->` markers so each label knows whether it came from
 *      TEXT / MTEXT / ATTDEF / ATTRIB. The signal is conservative: a marker
 *      only counts when the next element is a <text> within one <g> wrapper,
 *      and only for known text-bearing kinds. No kind ⇒ no fabrication.
 *   3. Compose ancestor <g transform="..."> matrices (translate / scale /
 *      rotate / matrix / skew) to recover the label's origin in the same
 *      coordinate space as the viewBox. That origin is what the <img>-path
 *      hit tester needs; the inline path uses `getBoundingClientRect()` and
 *      falls back to nearest-DOM-node distance.
 */
export function extractCadText(svg: string): CadTextExtraction {
  const items: CadTextItem[] = [];
  let counter = 0;

  // Stack of accumulated 2D affine matrices from the root down to the current
  // <g>. Top of stack maps a point in the current g's local coordinate space
  // into the root's user-space (the viewBox coordinate space). The root
  // `<svg transform="scale(1,-1)">` is a CSS-box flip, not a coordinate-space
  // transform, so it is intentionally NOT pushed here — the canvas handles
  // the visual flip separately when mapping clicks.
  type Affine = readonly [number, number, number, number, number, number];
  const stack: Affine[] = [IDENTITY];
  let pendingKind: CadTextKind | null = null;
  let pendingDepth = -1;

  const KNOWN_KINDS = new Set<CadTextKind>(["TEXT", "MTEXT", "ATTDEF", "ATTRIB"]);

  // Single regex, alternation ordered so the most specific tokens win first.
  // The 5th alternative (`<tag ...>`) is a generic catch-all that fires for
  // anything else — including self-closing elements and any tag not matched by
  // an earlier alternative. It also clears `pendingKind`, which is how a stray
  // <!--LINE--> marker loses its hold before it can leak onto a nearby text.
  const SCAN = /(?:<text\b([^>]*>)([\s\S]*?)<\/text\s*>)|<\/g\s*>|<g\b([^>]*)>|<!--\s*([A-Za-z]+)\s*(?:\|\s*\d+)?\s*-->|<([a-zA-Z][a-zA-Z0-9-]*)\b([^>]*\/?)>/gi;

  const tagged = svg.replace(SCAN, (match, textAttrs: string | undefined, textInner: string | undefined, gAttrs: string | undefined, kindWord: string | undefined, _genericName: string | undefined, _genericRest: string | undefined) => {
    if (textAttrs !== undefined) {
      const label = normaliseLabel(textInner ?? "");
      if (!label) return match;
      const id = `cad-text-${counter}`;
      counter += 1;
      const ownTransform = extractTransformAttr(textAttrs ?? "");
      const ownM = parseTransform(ownTransform);
      const ownOrigin = applyTransform(ownM, 0, 0);
      const world = applyTransform(stack[stack.length - 1], ownOrigin[0], ownOrigin[1]);
      const geom: CadTextGeom = {
        x: world[0],
        y: world[1],
        height: parseFontSize(textAttrs ?? ""),
        textAnchor: parseTextAnchor(textAttrs ?? ""),
        rotation: parseRotation(ownTransform),
      };
      let kind: CadTextKind | undefined;
      if (pendingKind && KNOWN_KINDS.has(pendingKind) && stack.length - pendingDepth <= 1) {
        kind = pendingKind;
      }
      pendingKind = null;
      items.push({ id, text: label, raw: textInner ?? "", kind, geom });
      const opener = textAttrs ?? "";
      const cleaned = opener.replace(/\sdata-cad-text-id\s*=\s*"[^"]*"/gi, "");
      return `<text data-cad-text-id="${id}"${cleaned}${textInner ?? ""}</text>`;
    }
    if (gAttrs !== undefined) {
      const m = parseTransform(gAttrs);
      stack.push(multiplyTransform(stack[stack.length - 1], m));
      return match;
    }
    if (kindWord !== undefined) {
      const upper = kindWord.toUpperCase();
      if (KNOWN_KINDS.has(upper as CadTextKind)) {
        pendingKind = upper as CadTextKind;
        pendingDepth = stack.length;
      } else {
        pendingKind = null;
      }
      return match;
    }
    if (_genericName !== undefined) {
      // Any other element (line, polyline, rect, path, tspan inside an opened
      // text, defs, pattern, …) invalidates the pending kind so it does not
      // leak past the element it was meant for.
      pendingKind = null;
      return match;
    }
    // </g>: pop the most recent push.
    if (stack.length > 1) stack.pop();
    if (stack.length < pendingDepth) {
      pendingKind = null;
      pendingDepth = stack.length;
    }
    return match;
  });

  return { items, svg: tagged };
}

/**
 * Removes all whitespace, for search matching.
 *
 * Title-block labels are letter-spaced ("会 签 栏", "室 内"), so a drafter
 * searching "会签" would otherwise get zero hits on text that visibly reads
 * 会签栏. Compare compacted forms on both sides.
 */
export function compactForSearch(value: string): string {
  return value.replace(/\s+/g, "");
}

/**
 * Hit-tests a list of extracted labels against a point in the same
 * coordinate space the origin was captured in (SVG user units = viewBox units).
 *
 * The box is built from the label's own font-size and text-anchor; for
 * vertical or rotated text the box is rotated into local space before the
 * distance is computed (rotations preserve distance, so the visual cost is
 * negligible). Items without `geom` are ignored — they cannot be hit-tested
 * without DOM measurements.
 *
 * Returns the id of the closest label whose outside-box distance is within
 * `tolerance` (same units), or `null` when nothing is close enough.
 */
export function pickCadTextAt(
  items: CadTextItem[],
  point: { x: number; y: number },
  options: { tolerance: number },
): string | null {
  const tolerance = Math.max(0, options.tolerance);
  let bestId: string | null = null;
  let bestDist = Infinity;
  const px = point.x;
  const py = point.y;
  for (const item of items) {
    const g = item.geom;
    if (!g) continue;
    // Rotate the click into the label's local space (anchor at origin, baseline along +x).
    const local = rotatePoint(px - g.x, py - g.y, -g.rotation);
    const height = g.height > 0 ? g.height : MIN_HIT_HEIGHT_UNITS;
    const width =
      g.height > 0 ? Math.max(height, height * HIT_WIDTH_EM_PER_CHAR * Math.max(1, item.text.length)) : 0;
    // Vertical band: ±height/2 from the baseline (label sits roughly above its origin).
    // Anchor-dependent horizontal band: [0, w], [-w/2, w/2], or [-w, 0].
    const left =
      g.textAnchor === "middle" ? -width / 2 : g.textAnchor === "end" ? -width : 0;
    const right = g.textAnchor === "middle" ? width / 2 : width;
    const dx = Math.max(left - local.x, local.x - right, 0);
    const dyRaw = Math.abs(local.y) - height / 2;
    const dy = dyRaw > 0 ? dyRaw : 0;
    const dist = Math.hypot(dx, dy);
    if (dist <= tolerance && dist < bestDist) {
      bestDist = dist;
      bestId = item.id;
    }
  }
  return bestId;
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

/** Approx. average glyph width as a fraction of font-size, used to estimate a label's horizontal extent. */
const HIT_WIDTH_EM_PER_CHAR = 0.6;

/** Floor used when a font-size is missing so degenerate labels still have *some* box. */
const MIN_HIT_HEIGHT_UNITS = 1;

const IDENTITY: readonly [number, number, number, number, number, number] = [1, 0, 0, 1, 0, 0];

/** Strips child tags (tspan etc.), decodes the few entities ACadSharp emits, collapses space. */
function normaliseLabel(inner: string): string {
  // Adjacent tspans are separate lines of one MTEXT; join them so the label
  // reads as a sentence instead of running the lines together.
  const spaced = inner.replace(/<\/tspan>\s*<tspan\b[^>]*>/gi, " ");
  const withoutTags = spaced.replace(/<[^>]*>/g, "");
  const decoded = withoutTags
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
  const collapsed = decoded.replace(/\s+/g, " ").trim();
  // A lone "." is an ACadSharp placeholder, not real content.
  return collapsed === "." ? "" : collapsed;
}

function extractTransformAttr(attrs: string): string {
  const m = attrs.match(/transform\s*=\s*"([^"]*)"/i);
  return m ? m[1] : "";
}

/**
 * Parses an SVG `transform` attribute into a 2D affine in row-major
 * `[a, b, c, d, e, f]` form, where a point (x, y) maps to
 * (a*x + c*y + e, b*x + d*y + f). The returned matrix represents the
 * list applied as written (leftmost transform outermost) so that
 * `M·p` reproduces the spec's "post-multiplied" semantics.
 *
 * Supports: translate, translateX/Y, scale, scaleX/Y, rotate, skewX/Y, matrix.
 * Unknown tokens are skipped, not rejected — the writer's vocabulary is
 * small but not fixed.
 */
function parseTransform(value: string): readonly [number, number, number, number, number, number] {
  if (!value) return IDENTITY;
  const re = /([a-zA-Z]+)\s*\(\s*([^)]*)\s*\)/g;
  let m: readonly [number, number, number, number, number, number] = IDENTITY;
  let match: RegExpExecArray | null;
  while ((match = re.exec(value)) !== null) {
    const fn = match[1].toLowerCase();
    const args = match[2].split(/[\s,]+/).filter(Boolean).map((s) => Number(s));
    if (args.some((n) => !Number.isFinite(n))) continue;
    const step = singleTransform(fn, args);
    if (step) m = multiplyTransform(m, step);
  }
  return m;
}

function singleTransform(
  fn: string,
  args: number[],
): readonly [number, number, number, number, number, number] | null {
  switch (fn) {
    case "translate":
      return [1, 0, 0, 1, args[0] ?? 0, args[1] ?? args[0] ?? 0];
    case "translatex":
      return [1, 0, 0, 1, args[0] ?? 0, 0];
    case "translatey":
      return [1, 0, 0, 1, 0, args[0] ?? 0];
    case "scale":
      return [args[0] ?? 1, 0, 0, args[1] ?? args[0] ?? 1, 0, 0];
    case "scalex":
      return [args[0] ?? 1, 0, 0, 1, 0, 0];
    case "scaley":
      return [1, 0, 0, args[0] ?? 1, 0, 0];
    case "rotate": {
      const rad = ((args[0] ?? 0) * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      if (args.length >= 3) {
        const cx = args[1];
        const cy = args[2];
        // translate(cx,cy) · rotate(a) · translate(-cx,-cy)
        return multiplyTransform(
          multiplyTransform([1, 0, 0, 1, cx, cy], [cos, sin, -sin, cos, 0, 0]),
          [1, 0, 0, 1, -cx, -cy],
        );
      }
      return [cos, sin, -sin, cos, 0, 0];
    }
    case "skewx":
      return [1, 0, Math.tan(((args[0] ?? 0) * Math.PI) / 180), 1, 0, 0];
    case "skewy":
      return [1, Math.tan(((args[0] ?? 0) * Math.PI) / 180), 0, 1, 0, 0];
    case "matrix":
      return [
        args[0] ?? 1,
        args[1] ?? 0,
        args[2] ?? 0,
        args[3] ?? 1,
        args[4] ?? 0,
        args[5] ?? 0,
      ];
    default:
      return null;
  }
}

/** Composes two 2D affine matrices as `A ∘ B`, i.e. `apply(multiply(A, B), p) === apply(A, apply(B, p))`. */
function multiplyTransform(
  a: readonly [number, number, number, number, number, number],
  b: readonly [number, number, number, number, number, number],
): readonly [number, number, number, number, number, number] {
  const [a1, b1, c1, d1, e1, f1] = a;
  const [a2, b2, c2, d2, e2, f2] = b;
  return [
    a1 * a2 + c1 * b2,
    b1 * a2 + d1 * b2,
    a1 * c2 + c1 * d2,
    b1 * c2 + d1 * d2,
    a1 * e2 + c1 * f2 + e1,
    b1 * e2 + d1 * f2 + f1,
  ];
}

function applyTransform(
  m: readonly [number, number, number, number, number, number],
  x: number,
  y: number,
): [number, number] {
  const [a, b, c, d, e, f] = m;
  return [a * x + c * y + e, b * x + d * y + f];
}

function rotatePoint(x: number, y: number, degrees: number): { x: number; y: number } {
  if (!degrees) return { x, y };
  const rad = (degrees * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return { x: cos * x - sin * y, y: sin * x + cos * y };
}

function parseFontSize(attrs: string): number {
  const attr = attrs.match(/font-size\s*=\s*"([\d.]+)"/i);
  if (attr) {
    const n = Number(attr[1]);
    if (Number.isFinite(n) && n > 0) return n;
  }
  const style = attrs.match(/style\s*=\s*"([^"]*)"/i);
  if (style) {
    const m = style[1].match(/font-size\s*:\s*([\d.]+)\s*px/i);
    if (m) {
      const n = Number(m[1]);
      if (Number.isFinite(n) && n > 0) return n;
    }
  }
  return 0;
}

function parseTextAnchor(attrs: string): "start" | "middle" | "end" {
  const m = attrs.match(/text-anchor\s*=\s*"([^"]+)"/i);
  const v = (m?.[1] ?? "start").toLowerCase();
  if (v === "middle") return "middle";
  if (v === "end") return "end";
  return "start";
}

function parseRotation(transformValue: string): number {
  if (!transformValue) return 0;
  const re = /rotate\s*\(\s*([^)]*)\s*\)/gi;
  let total = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(transformValue)) !== null) {
    const first = Number(match[1].split(/[\s,]+/)[0]);
    if (Number.isFinite(first)) total += first;
  }
  return total;
}