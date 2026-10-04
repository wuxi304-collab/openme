import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { normalizeCadSvg, shouldInlineCadSvg, type CadCanvasBackground } from "../../cad/normalizeCadSvg";
import { compactForSearch, extractCadText, pickCadTextAt } from "../../cad/extractCadText";
import { useI18n } from "../../i18n";
import Tooltip from "../Tooltip";
import CadTextList from "./CadTextList";

interface Props {
  svgText: string;
  fileName: string;
  /** Optional summary shown next to the file name (e.g. "20 实体 · 9 图层"). */
  cadSummary?: string | null;
  /** Engine description (e.g. "ACadSharp 3.6.35" or "LibreDWG Web 兼容预览"). */
  engineLabel: string;
  /** True when the preview is a degraded fallback rather than the native engine. */
  isFallback?: boolean;
  /** Optional callback when the user clicks "open in system app". */
  onOpenInSystem?: () => void;
}

// Zoom bounds for user-initiated zoom. MIN_SCALE has to be small: an XREF-heavy
// architectural sheet can be 7600 drawing units wide and still have to fit a
// ~430 px canvas, i.e. ~0.05. Clamping the floor at 0.1 made those sheets
// overflow and look "broken" instead of simply small.
const MIN_SCALE = 0.002;
const MAX_SCALE = 64;
const ZOOM_STEP = 1.18;
/** Floor used when computing a fit, to keep degenerate viewBoxes from producing 0/NaN. */
const FIT_FLOOR = 1e-4;
/**
 * Whether a real DWG writer is wired up. Until ODA / RealDWG is integrated the
 * editor is preview-only, and the UI says so — silently claiming to have saved
 * a DWG we never wrote would be the worst possible bug in this product.
 */
const CAN_PERSIST = false;

/** ISO A-series sheet sizes in millimetres (short edge, long edge). */
const PAPER_MM = { a4: [210, 297], a3: [297, 420], a2: [420, 594] } as const;
export type PaperSize = "auto" | keyof typeof PAPER_MM;
/** Pointer travel below which a pointerup counts as a click, not a pan. */
const CLICK_SLOP_PX = 4;
/** CSS-pixel radius around a label's origin that still counts as a click on it. */
const CLICK_HIT_TOLERANCE_PX = 24;
/** Fallback tolerance (CSS px) for the inline-path DOM-distance hit test. */
const INLINE_DOM_FALLBACK_PX = 32;

/**
 * Inline, sanitised, zoomable/pannable CAD canvas.
 *
 * What it does that the old `<img src={objectUrl}>` could not:
 *   1. `normalizeCadSvg` repairs ACadSharp's four well-known defects (mm stroke
 *      widths, broken font shorthand, invisible white-on-light colours, absolute
 *      root dimensions) before the SVG touches the DOM.
 *   2. Wheel zoom is anchored to the cursor so the point under the mouse stays
 *      under the mouse at every scale.
 *   3. Drag pans the drawing; "Fit" resets to viewBox-anchored 100%; "1:1"
 *      shows drawing units at 1 px each.
 *   4. Background toggle swaps the injected sheet colour without re-fetching.
 */
export default function CadSvgCanvas({
  svgText,
  fileName,
  cadSummary,
  engineLabel,
  isFallback,
  onOpenInSystem,
}: Props) {
  const { t, tf } = useI18n();
  const [background, setBackground] = useState<CadCanvasBackground>("light");
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const [transformReady, setTransformReady] = useState(false);
/** Cursor position in drawing units, shown in the status readout. */
const [cursorUnits, setCursorUnits] = useState<{ x: number; y: number } | null>(null);
/** Text label highlighted via the text panel. */
const [activeTextId, setActiveTextId] = useState<string | null>(null);
/** Sheet the drawing is presented on. Defaults to A4 so a DWG reads like paper. */
const [paper, setPaper] = useState<PaperSize>("a4");
/** Inner viewport size (the .cad-svg-main area, excluding toolbar/statusbar). */
const [viewportSize, setViewportSize] = useState<{ w: number; h: number } | null>(null);
const [findQuery, setFindQuery] = useState("");
const [replaceQuery, setReplaceQuery] = useState("");
/**
 * Pending text edits keyed by label id. Applied to the preview DOM only — see
 * `canPersist` below. Once a DWG writer exists this map is exactly the payload
 * it needs (id + replacement string).
 */
const [pendingEdits, setPendingEdits] = useState<Map<string, string>>(new Map());
  const hostRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const markerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; tx: number; ty: number } | null>(null);

  // Normalise, then enumerate the labels. extractCadText returns the same SVG with
// data-cad-text-id added, so the tagged markup is what reaches the DOM and the
// list stays in sync with what is on screen.
const normalized = useMemo(() => {
  const result = normalizeCadSvg(svgText, { background });
  const extraction = extractCadText(result.svg);
  return { ...result, svg: extraction.svg, textItems: extraction.items };
}, [svgText, background]);

  // Large drawings go through <img> (see shouldInlineCadSvg / CAD_SVG_INLINE_BYTE_LIMIT).
  const useInline = shouldInlineCadSvg(svgText.length);
  const objectUrl = useMemo(() => {
    if (useInline) return null;
    return URL.createObjectURL(new Blob([normalized.svg], { type: "image/svg+xml" }));
  }, [useInline, normalized.svg]);

  useEffect(() => {
    if (!objectUrl) return;
    return () => URL.revokeObjectURL(objectUrl);
  }, [objectUrl]);

  /**
   * Applies a scale and re-centres the drawing. Shared by fit / fit-to-axis /
   * 1:1 so all three agree on the coordinate maths.
   *
   * Centring identity:
   *   img path – the <img> sits at its natural viewBox size, so shift by half the
   *              leftover space: (host - vb * s) / 2.
   *   inline   – the stage fills the host, so scaling by s leaves host*(1-s) of
   *              slack; shifting the viewBox centre by (1-s) centres it.
   */
  const applyCentredScale = useCallback(
    (s: number) => {
      const host = hostRef.current;
      const vb = normalized.viewBox;
      if (!host || !vb) return;
      setScale(s);
      if (useInline) {
        setTx((1 - s) * (vb.x + vb.width / 2));
        setTy((1 - s) * (vb.y + vb.height / 2));
      } else {
        setTx((host.clientWidth - vb.width * s) / 2);
        setTy((host.clientHeight - vb.height * s) / 2);
      }
    },
    [normalized.viewBox, useInline],
  );

  /** Scale that fits the drawing, optionally constrained to a single axis. */
  const fitScale = useCallback(
    (axis: "both" | "width" | "height") => {
      const host = hostRef.current;
      const vb = normalized.viewBox;
      if (!host || !vb) return 1;
      const padding = 16;
      const hostW = Math.max(1, host.clientWidth);
      const hostH = Math.max(1, host.clientHeight);
      // inline: content spans host*s px, so only the padding is free.
      // img   : content spans vb*s px, so the whole host minus padding is free.
      const sx = useInline ? (hostW - padding * 2) / hostW : (hostW - padding * 2) / vb.width;
      const sy = useInline ? (hostH - padding * 2) / hostH : (hostH - padding * 2) / vb.height;
      const raw = axis === "width" ? sx : axis === "height" ? sy : Math.min(sx, sy);
      return Math.max(FIT_FLOOR, Math.min(MAX_SCALE, raw));
    },
    [normalized.viewBox, useInline],
  );

  // Fit-to-window whenever the SVG (or container size) changes.
  const fitToWindow = useCallback(() => {
    const host = hostRef.current;
    if (!host || !normalized.viewBox) {
      setScale(1);
      setTx(0);
      setTy(0);
      setTransformReady(true);
      return;
    }
    applyCentredScale(fitScale("both"));
    setTransformReady(true);
  }, [applyCentredScale, fitScale, normalized.viewBox]);

  /**
   * Fit to one axis. A 7611 x 1260 architectural sheet fitted "both" is tiny in a
   * portrait canvas; fitting to width is what a drafter actually wants there.
   */
  const fitToAxis = useCallback(
    (axis: "width" | "height") => {
      if (!normalized.viewBox) return;
      applyCentredScale(fitScale(axis));
    },
    [applyCentredScale, fitScale, normalized.viewBox],
  );

  useEffect(() => {
    fitToWindow();
  }, [fitToWindow]);

  // Apply pan/zoom transform to the inner <g> wrapper created by normalizeCadSvg.
  // Done in a layout effect so the transform is in place before the browser paints,
  // and runs whenever the SVG is rebuilt (background toggle, new file).
  useLayoutEffect(() => {
    const target = useInline
      ? stageRef.current?.querySelector<SVGGElement>(".cad-svg-stage-g")
      : imgRef.current;
    if (!target) return;
    target.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
    target.style.transformOrigin = "0 0";
  }, [tx, ty, scale, normalized.svg, useInline]);

  // Re-fit when the panel resizes (e.g. sidebar opens, window resize).
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    // ResizeObserver is absent in some non-browser hosts (jsdom under test).
    // Skip the subscription rather than throwing inside a passive effect, which
    // would surface as an unhandled error and take the whole render down.
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => fitToWindow());
    observer.observe(host);
    return () => observer.disconnect();
  }, [fitToWindow]);

  // Measure the available area (the host's parent, .cad-svg-main) so the paper
  // box can be sized to the largest sheet that fits. Only the parent's size
  // matters here; resizing the host itself (because the page box changed) does
  // not change the parent, so this observer never loops.
  useEffect(() => {
    const parent = hostRef.current?.parentElement;
    if (!parent) return;
    const measure = () => {
      const w = parent.clientWidth;
      const h = parent.clientHeight;
      if (!w || !h) return;
      setViewportSize((prev) => (prev && prev.w === w && prev.h === h ? prev : { w, h }));
    };
    measure();
    // Same guard as the fit observer above — the one-shot measure() above is
    // still useful without ResizeObserver, only the live subscription is lost.
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(parent);
    return () => observer.disconnect();
  }, []);

  /**
   * Zoom about a point given in host-local CSS pixels. Shared by the wheel, the
   * +/- buttons and the keyboard shortcuts so all three anchor identically.
   */
  const zoomAt = useCallback((factor: number, anchorX: number, anchorY: number) => {
    setScale((prevScale) => {
      const nextScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, prevScale * factor));
      const k = nextScale / prevScale;
      if (k === 1) return prevScale;
      setTx((prevTx) => anchorX * (1 - k) + prevTx * k);
      setTy((prevTy) => anchorY * (1 - k) + prevTy * k);
      return nextScale;
    });
  }, []);

  const zoomAtCentre = useCallback(
    (factor: number) => {
      const host = hostRef.current;
      if (!host) return;
      zoomAt(factor, host.clientWidth / 2, host.clientHeight / 2);
    },
    [zoomAt],
  );

  const onWheel = useCallback(
    (event: React.WheelEvent<HTMLDivElement>) => {
      event.preventDefault();
      const host = hostRef.current;
      if (!host) return;
      const rect = host.getBoundingClientRect();
      zoomAt(
        event.deltaY > 0 ? 1 / ZOOM_STEP : ZOOM_STEP,
        event.clientX - rect.left,
        event.clientY - rect.top,
      );
    },
    [zoomAt],
  );

  /**
   * Inverse of the pan/zoom transform: converts host-local CSS pixels back to
   * drawing units, so the readout can report real coordinates.
   */
  const hostToUnits = useCallback(
    (hostX: number, hostY: number): { x: number; y: number } | null => {
      const host = hostRef.current;
      const vb = normalized.viewBox;
      if (!host || !vb || !scale) return null;
      if (useInline) {
        // The SVG fills the host, so undo that mapping first.
        const sx = Math.max(1, host.clientWidth) / vb.width;
        const sy = Math.max(1, host.clientHeight) / vb.height;
        return { x: (hostX / sx + vb.x - tx) / scale, y: (hostY / sy + vb.y - ty) / scale };
      }
      return { x: (hostX - tx) / scale, y: (hostY - ty) / scale };
    },
    [normalized.viewBox, scale, tx, ty, useInline],
  );

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const target = event.currentTarget;
    target.setPointerCapture(event.pointerId);
    dragRef.current = { startX: event.clientX, startY: event.clientY, tx, ty };
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const host = hostRef.current;
    if (host) {
      const rect = host.getBoundingClientRect();
      setCursorUnits(hostToUnits(event.clientX - rect.left, event.clientY - rect.top));
    }
    const drag = dragRef.current;
    if (!drag) return;
    setTx(drag.tx + (event.clientX - drag.startX));
    setTy(drag.ty + (event.clientY - drag.startY));
  };

  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    const drag = dragRef.current;
    dragRef.current = null;
    // Treat as a click only if the pointer barely moved — otherwise it was a pan.
    if (!drag) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (Math.hypot(dx, dy) <= CLICK_SLOP_PX) {
      handleCanvasClick(event);
    }
  };

  // Labels with pending replacements applied, so the list and the canvas agree.
const displayItems = useMemo(
  () =>
    normalized.textItems.map((item) => {
      const edited = pendingEdits.get(item.id);
      return edited === undefined
        ? { id: item.id, text: item.text }
        : { id: item.id, text: edited, edited: true };
    }),
  [normalized.textItems, pendingEdits],
);

const matches = useMemo(() => {
  const needle = compactForSearch(findQuery.trim().toLowerCase());
  if (!needle) return [];
  return displayItems.filter((item) => compactForSearch(item.text.toLowerCase()).includes(needle));
}, [displayItems, findQuery]);

const activeMatchIndex = useMemo(
  () => matches.findIndex((item) => item.id === activeTextId),
  [matches, activeTextId],
);

/**
 * Constrains the canvas to a real sheet when a paper size is chosen. Orientation
 * follows the drawing, so a wide model lands on a landscape sheet instead of
 * being letterboxed into a tall portrait page.
 *
 * The box is computed as the largest paper-proportioned rectangle that fits the
 * viewport, with a margin and room for the status bar. We derive explicit pixel
 * width/height rather than relying on `aspect-ratio` + `max-*`: when one axis
 * hits its max, plain `aspect-ratio` lets the other axis stay over-constrained
 * and silently breaks the proportion (a CAD sheet must keep its true ratio).
 */
const pageStyle = useMemo(() => {
  if (paper === "auto" || !normalized.viewBox || !viewportSize) return undefined;
  const [shortMm, longMm] = PAPER_MM[paper];
  const landscape = normalized.viewBox.width >= normalized.viewBox.height;
  const ratio = landscape ? longMm / shortMm : shortMm / longMm; // sheet width / height
  const margin = 16;
  const statusBar = 26;
  const availW = Math.max(1, viewportSize.w - margin * 2);
  const availH = Math.max(1, viewportSize.h - statusBar - margin * 2);
  let w = availW;
  let h = w / ratio;
  if (h > availH) {
    h = availH;
    w = h * ratio;
  }
  return { width: `${Math.round(w)}px`, height: `${Math.round(h)}px` };
}, [paper, normalized.viewBox, viewportSize]);

/**
   * Pan/zoom so the chosen label sits in the middle at a legible size. Uses the
   * same anchor maths as zoomAt: keep the label where it is while scaling, then
   * shift the remainder so it lands at the host centre. Pure CSS-transform
   * maths, so it works identically for the inline and <img> paths.
   */
  const locateText = useCallback(
    (id: string) => {
      const host = hostRef.current;
      if (!host) return;
      const node = host.querySelector<SVGTextElement>(`[data-cad-text-id="${id}"]`);
      if (!node) return;
      const hostRect = host.getBoundingClientRect();
      const rect = node.getBoundingClientRect();
      const px = rect.left + rect.width / 2 - hostRect.left;
      const py = rect.top + rect.height / 2 - hostRect.top;
      // Aim for ~24 px tall text; fall back to zooming in if the node has no size.
      const unitHeight = scale > 0 ? rect.height / scale : 0;
      const next = unitHeight > 0.5
        ? Math.max(MIN_SCALE, Math.min(MAX_SCALE, 24 / unitHeight))
        : Math.max(scale, 1);
      const k = next / scale;
      const cx = host.clientWidth / 2;
      const cy = host.clientHeight / 2;
      setScale(next);
      setTx(px * (1 - k) + tx * k + (cx - px));
      setTy(py * (1 - k) + ty * k + (cy - py));
      setActiveTextId(id);
    },
    [scale, tx, ty],
  );

  const stepMatch = useCallback(
    (delta: number) => {
      if (matches.length === 0) return;
      const base = activeMatchIndex >= 0 ? activeMatchIndex : delta > 0 ? -1 : 0;
      const next = (base + delta + matches.length) % matches.length;
      locateText(matches[next].id);
    },
    [matches, activeMatchIndex, locateText],
  );

  const onReplaceCurrent = useCallback(() => {
    const target = activeMatchIndex >= 0 ? matches[activeMatchIndex] : matches[0];
    if (!target || !replaceQuery) return;
    setPendingEdits((prev) => new Map(prev).set(target.id, replaceQuery));
  }, [activeMatchIndex, matches, replaceQuery]);

  const onReplaceAll = useCallback(() => {
    if (!replaceQuery || matches.length === 0) return;
    setPendingEdits((prev) => {
      const next = new Map(prev);
      for (const item of matches) next.set(item.id, replaceQuery);
      return next;
    });
  }, [matches, replaceQuery]);

  // Push pending replacements into the live DOM. Runs again when the SVG is
  // rebuilt (e.g. background toggle) so edits are not lost on re-render.
  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host || pendingEdits.size === 0) return;
    for (const [id, text] of pendingEdits) {
      const node = host.querySelector(`[data-cad-text-id="${id}"]`);
      if (!node) continue;
      const tspans = node.querySelectorAll("tspan");
      if (tspans.length > 0) {
        tspans[0].textContent = text;
        for (let i = 1; i < tspans.length; i += 1) tspans[i].textContent = "";
      } else {
        node.textContent = text;
      }
    }
  }, [pendingEdits, normalized.svg]);

/**
 * Convert a host-local CSS pixel coordinate into the same user-space units the
 * labels were extracted in. Only used by the `<img>`-path click handler.
 *
 * The root `<svg transform="scale(1,-1)">` causes the browser to apply a CSS
 * flip of the svg's box about its vertical centre, so the visible y axis is
 * the mirror of the viewBox y axis. This routine undoes that mirror: a visual
 * y of 0 (top of the image) corresponds to user y = vb.y + vb.height.
 */
const hostPxToUnitsForImg = useCallback(
  (hx: number, hy: number): { x: number; y: number } | null => {
    const vb = normalized.viewBox;
    if (!vb || !scale) return null;
    const px = (hx - tx) / scale;
    const flippedY = (hy - ty) / scale;
    return { x: vb.x + px, y: vb.y + vb.height - flippedY };
  },
  [normalized.viewBox, scale, tx, ty],
);

/**
 * Reverse of the list→canvas direction: a click on the canvas picks the
 * nearest label and makes it the active one. Inline uses DOM `closest` for
 * exact hits and falls back to nearest-DOM-node distance for whitespace
 * clicks; the `<img>` path has no DOM so it falls straight through to the
 * drawing-space pick tester. An empty click clears the active selection.
 */
const handleCanvasClick = useCallback(
  (event: React.PointerEvent<HTMLDivElement>) => {
    const host = hostRef.current;
    if (!host) return;
    const rect = host.getBoundingClientRect();
    const hx = event.clientX - rect.left;
    const hy = event.clientY - rect.top;
    let id: string | null = null;
    if (useInline) {
      const target = event.target as Element | null;
      id = target?.closest?.("[data-cad-text-id]")?.getAttribute("data-cad-text-id") ?? null;
      if (!id) {
        // Whitespace click: find the nearest labelled node by rect distance.
        let bestDist = INLINE_DOM_FALLBACK_PX;
        const nodes = host.querySelectorAll<SVGTextElement>("[data-cad-text-id]");
        for (const node of nodes) {
          const r = node.getBoundingClientRect();
          const cx = r.left + r.width / 2 - rect.left;
          const cy = r.top + r.height / 2 - rect.top;
          const dist = Math.hypot(cx - hx, cy - hy);
          if (dist <= bestDist) {
            bestDist = dist;
            id = node.getAttribute("data-cad-text-id");
          }
        }
      }
    } else {
      const point = hostPxToUnitsForImg(hx, hy);
      if (point) {
        id = pickCadTextAt(normalized.textItems, point, {
          tolerance: Math.max(CLICK_HIT_TOLERANCE_PX / scale, 1),
        });
      }
    }
    setActiveTextId(id);
  },
  [useInline, hostPxToUnitsForImg, normalized.textItems, scale, setActiveTextId],
);

// Inline-path highlight: add a CSS class to the active <text> node so the
// browser's own layout tracks the glyphs exactly. The class is removed from
// any node that previously carried it (cheap: O(matches) but matches ≤ #items,
// and the DOM query is scoped to the host subtree).
useLayoutEffect(() => {
  if (!useInline) return;
  const host = hostRef.current;
  if (!host) return;
  host
    .querySelectorAll("[data-cad-text-id].is-cad-active")
    .forEach((node) => node.classList.remove("is-cad-active"));
  if (activeTextId) {
    const node = host.querySelector(`[data-cad-text-id="${activeTextId}"]`);
    node?.classList.add("is-cad-active");
  }
}, [activeTextId, normalized.svg, useInline]);

// `<img>`-path highlight: position the marker overlay from the label's
// captured geometry. The vertical mirror of the root transform is handled by
// hostPxToUnitsForImg in reverse here, so the box lands on the visible glyphs.
useLayoutEffect(() => {
  const marker = markerRef.current;
  if (!marker) return;
  const vb = normalized.viewBox;
  if (!vb || !scale || !activeTextId) {
    marker.style.display = "none";
    return;
  }
  const item = normalized.textItems.find((it) => it.id === activeTextId);
  const g = item?.geom;
  if (!g) {
    marker.style.display = "none";
    return;
  }
  const heightUnits = g.height > 0 ? g.height : 1;
  const widthUnits = Math.max(heightUnits, heightUnits * 0.6 * Math.max(1, item!.text.length));
  const leftUnits = g.textAnchor === "middle" ? g.x - widthUnits / 2 : g.textAnchor === "end" ? g.x - widthUnits : g.x;
  const topUnits = g.y; // baseline; the box extends downward in user-space glyph terms
  const left = tx + scale * (leftUnits - vb.x);
  const top = ty + scale * (vb.y + vb.height - topUnits - heightUnits);
  const width = widthUnits * scale;
  const height = heightUnits * scale;
  if (width <= 1 || height <= 1) {
    marker.style.display = "none";
    return;
  }
  marker.style.left = `${left}px`;
  marker.style.top = `${top}px`;
  marker.style.width = `${width}px`;
  marker.style.height = `${height}px`;
  marker.style.display = "block";
}, [activeTextId, normalized.textItems, normalized.viewBox, scale, tx, ty]);

  const resetOneToOne = useCallback(() => {
    const vb = normalized.viewBox;
    const host = hostRef.current;
    if (!vb || !host) {
      setScale(1);
      setTx(0);
      setTy(0);
      return;
    }
    const hostW = Math.max(1, host.clientWidth);
    const hostH = Math.max(1, host.clientHeight);
    // 1:1 means one drawing unit == one CSS pixel.
    //   img path : the <img> is already at viewBox size, so s = 1.
    //   inline   : the SVG fills the host, so its own scale is
    //              min(hostW/vbW, hostH/vbH); undo that to reach true 1:1.
    applyCentredScale(useInline ? Math.max(vb.width / hostW, vb.height / hostH) : 1);
  }, [applyCentredScale, normalized.viewBox, useInline]);

  /** Keyboard navigation: +/-, 0 or F to fit, 1 for 1:1, arrows to pan (Shift = faster). */
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const panStep = event.shiftKey ? 160 : 48;
    switch (event.key) {
      case "+": case "=":
        event.preventDefault(); zoomAtCentre(ZOOM_STEP); return;
      case "-": case "_":
        event.preventDefault(); zoomAtCentre(1 / ZOOM_STEP); return;
      case "0": case "f": case "F":
        event.preventDefault(); fitToWindow(); return;
      case "1":
        event.preventDefault(); resetOneToOne(); return;
      case "ArrowUp":
        event.preventDefault(); setTy((v) => v + panStep); return;
      case "ArrowDown":
        event.preventDefault(); setTy((v) => v - panStep); return;
      case "ArrowLeft":
        event.preventDefault(); setTx((v) => v + panStep); return;
      case "ArrowRight":
        event.preventDefault(); setTx((v) => v - panStep); return;
      default: return;
    }
  };

  return (
    <div className="cad-svg-canvas">
      <div className="cad-svg-toolbar" aria-label={t("cadSvgToolbarAria")}>
        <Tooltip content={fileName}>
          <span className="cad-svg-label">
            <i aria-hidden="true" />
            {fileName}
            <em className={isFallback ? "is-fallback" : ""}>
              {engineLabel}
              {cadSummary ? ` · ${cadSummary}` : ""}
            </em>
            {!useInline && (
              <Tooltip content={t("cadSvgBitmapModeTooltip")}>
                <em className="cad-svg-note">{t("cadSvgBitmapMode")}</em>
              </Tooltip>
            )}
          </span>
        </Tooltip>
        <div className="cad-svg-toolbar-group">
          <Tooltip content={t("cadSvgFitWindowTooltip")}>
            <button type="button" onClick={fitToWindow} disabled={!transformReady}>{t("cadSvgFitWindow")}</button>
          </Tooltip>
          <Tooltip content={t("cadSvgFitWidthTooltip")}>
            <button type="button" onClick={() => fitToAxis("width")}>{t("cadSvgFitWidth")}</button>
          </Tooltip>
          <Tooltip content={t("cadSvgFitHeightTooltip")}>
            <button type="button" onClick={() => fitToAxis("height")}>{t("cadSvgFitHeight")}</button>
          </Tooltip>
          <Tooltip content={t("cadSvgActualSizeTooltip")}>
            <button type="button" onClick={resetOneToOne}>{t("cadSvgActualSize")}</button>
          </Tooltip>
          <span className="cad-svg-tool-separator" />
          <span className="cad-svg-paper" role="group" aria-label={t("cadSvgPaperSize")}>
            {(["auto", "a4", "a3", "a2"] as PaperSize[]).map((size) => (
              <Tooltip
                key={size}
                content={size === "auto" ? t("cadSvgPaperAutoTooltip") : tf("cadSvgPaperTooltip", { size: size.toUpperCase() })}
              >
                <button
                  type="button"
                  aria-pressed={paper === size}
                  onClick={() => setPaper(size)}
                >
                  {size === "auto" ? t("cadSvgPaperAuto") : size.toUpperCase()}
                </button>
              </Tooltip>
            ))}
          </span>
          <span className="cad-svg-tool-separator" />
          <Tooltip content={t("cadSvgZoomOutTooltip")}>
            <button type="button" onClick={() => zoomAtCentre(1 / ZOOM_STEP)}>−</button>
          </Tooltip>
          <span className="cad-svg-zoom-readout" aria-live="polite">{Math.round(scale * 100)}%</span>
          <Tooltip content={t("cadSvgZoomInTooltip")}>
            <button type="button" onClick={() => zoomAtCentre(ZOOM_STEP)}>+</button>
          </Tooltip>
          <span className="cad-svg-tool-separator" />
          <button
            type="button"
            aria-pressed={background === "light"}
            onClick={() => setBackground("light")}
          >
            {t("cadSvgLightBackground")}
          </button>
          <button
            type="button"
            aria-pressed={background === "dark"}
            onClick={() => setBackground("dark")}
          >
            {t("cadSvgDarkBackground")}
          </button>
          {onOpenInSystem && (
            <>
              <span className="cad-svg-tool-separator" />
              <button type="button" onClick={onOpenInSystem}>{t("cadSvgOpenInSystem")}</button>
            </>
          )}
        </div>
      </div>
      <div className="cad-svg-body">
      <CadTextList
        items={displayItems}
        activeId={activeTextId}
        onLocate={locateText}
        findQuery={findQuery}
        onFindChange={setFindQuery}
        replaceQuery={replaceQuery}
        onReplaceChange={setReplaceQuery}
        activeMatchIndex={activeMatchIndex}
        onStepMatch={stepMatch}
        onReplaceCurrent={onReplaceCurrent}
        onReplaceAll={onReplaceAll}
        canPersist={CAN_PERSIST}
      />
      <div className="cad-svg-main">
      <div className="cad-svg-statusbar" aria-live="polite">
        <span>
          {normalized.viewBox
            ? tf("cadSvgRangeUnits", {
                width: Math.round(normalized.viewBox.width),
                height: Math.round(normalized.viewBox.height),
              })
            : t("cadSvgRangeUnknown")}
        </span>
        <span className="cad-svg-statusbar-sep" />
        <Tooltip content={t("cadSvgCursorTooltip")}>
          <span>
            {cursorUnits
              ? tf("cadSvgCursor", { x: cursorUnits.x.toFixed(1), y: cursorUnits.y.toFixed(1) })
              : t("cadSvgCursorEmpty")}
          </span>
        </Tooltip>
        <span className="cad-svg-statusbar-sep" />
        <span className="cad-svg-statusbar-hint">{t("cadSvgStatusHint")}</span>
      </div>
      <div
        ref={hostRef}
        className={`cad-svg-host is-${background} ${pageStyle ? "is-page" : ""}`}
        style={pageStyle}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={() => setCursorUnits(null)}
        onKeyDown={onKeyDown}
        tabIndex={0}
        role="application"
        aria-label={tf("cadSvgCanvasAria", { fileName })}
      >
        {useInline ? (
          <div
            className="cad-svg-stage"
            // Stage fills the host so the SVG fills the host via its own
            // width/height of 100%. The g transform handles all pan/zoom; the root
            // <svg>'s own `transform="scale(1,-1)"` (set by ACadSharp) is preserved
            // because the CSS transform lives on this inner <g>, not on the SVG.
            ref={stageRef}
            dangerouslySetInnerHTML={{ __html: normalized.svg }}
          />
        ) : (
          <img
            ref={imgRef}
            className="cad-svg-image"
            src={objectUrl ?? undefined}
            alt={tf("cadSvgImageAlt", { fileName })}
            // The bitmap path renders through <img>, whose native image-drag would
            // hijack the pointer gesture and break our own pan; the upstream canvas
            // had this too and the port dropped it.
            draggable={false}
            // Explicit natural size: the SVG inside carries width/height 100%,
            // which has no meaning until the <img> itself is sized.
            style={{
              width: normalized.viewBox ? `${normalized.viewBox.width}px` : undefined,
              height: normalized.viewBox ? `${normalized.viewBox.height}px` : undefined,
            }}
          />
        )}
        {!useInline && <div ref={markerRef} className="cad-text-marker" aria-hidden="true" />}
      </div>
      </div>
      </div>
    </div>
  );
}