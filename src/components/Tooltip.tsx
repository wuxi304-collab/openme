import {
  Children,
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import type { CSSProperties, FocusEvent, MouseEvent, ReactElement, ReactNode } from "react";

interface TooltipProps {
  /** The trigger element (typically a button or span). Must be a single React element. */
  children: ReactElement;
  /** Tooltip body — string or any rich content. */
  content: ReactNode;
  /** Preferred side. "auto" (default) flips based on viewport space. */
  position?: "top" | "bottom" | "auto";
  /** Delay in ms before showing on hover. Default 400 — instant feels cheap. */
  delay?: number;
  /** When true the tooltip never appears (useful for narrow viewports or motion-sensitive users). */
  disabled?: boolean;
  /** Optional explicit id; otherwise auto-generated via useId. */
  id?: string;
}

interface Coords {
  top: number;
  left: number;
  actualPosition: "top" | "bottom";
}

/**
 * Lightweight, dependency-free tooltip.
 *
 * - Wraps a single trigger element. Clones it to attach hover/focus handlers and a ref.
 * - Shows after delay ms on hover; instantly on focus (keyboard users get the same affordance).
 * - Hides on mouseleave / blur / Escape.
 * - position="auto" (default) prefers top, flips to bottom when there is not enough room.
 * - Uses position: fixed so it overlays the trigger regardless of stacking context.
 * - aria-describedby is set on the trigger only while the tooltip is visible, so screen
 *   readers do not get a redundant description when the user is just passing through.
 * - prefers-reduced-motion skips the fade-in animation.
 */export default function Tooltip({
  children,
  content,
  position = "auto",
  delay = 400,
  disabled = false,
  id: idProp,
}: TooltipProps) {
  const generatedId = useId();
  const id = idProp ?? `tooltip-${generatedId}`;
  const triggerRef = useRef<HTMLElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const showTimerRef = useRef<number | null>(null);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<Coords | null>(null);

  const clearTimer = () => {
    if (showTimerRef.current !== null) {
      window.clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }
  };

  const measure = useCallback(() => {
    if (disabled) return;
    const triggerEl = triggerRef.current;
    if (!triggerEl) return;
    const rect = triggerEl.getBoundingClientRect();
    const tooltipEl = tooltipRef.current;
    const tooltipHeight = tooltipEl?.offsetHeight ?? 30;
    const tooltipWidth = tooltipEl?.offsetWidth ?? 120;
    const margin = 8;
    const spaceAbove = rect.top;
    const spaceBelow = window.innerHeight - rect.bottom;
    let actualPosition: "top" | "bottom";
    if (position === "top") actualPosition = "top";
    else if (position === "bottom") actualPosition = "bottom";
    else
      actualPosition =
        spaceAbove >= tooltipHeight + margin || spaceAbove > spaceBelow ? "top" : "bottom";

    let left = rect.left + rect.width / 2 - tooltipWidth / 2;
    left = Math.max(margin, Math.min(left, window.innerWidth - tooltipWidth - margin));
    const top =
      actualPosition === "top"
        ? rect.top - tooltipHeight - margin
        : rect.bottom + margin;
    setCoords({ top, left, actualPosition });
  }, [disabled, position]);
  const handleShow = useCallback(() => {
    clearTimer();
    if (disabled) return;
    showTimerRef.current = window.setTimeout(() => {
      showTimerRef.current = null;
      setOpen(true);
    }, delay);
  }, [delay, disabled]);

  const handleHide = useCallback(() => {
    clearTimer();
    setOpen(false);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") handleHide();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, handleHide]);

  useEffect(() => {
    if (!open) return;
    const raf = window.requestAnimationFrame(measure);
    return () => window.cancelAnimationFrame(raf);
  }, [open, measure]);

  useEffect(() => {
    if (!open) return undefined;
    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [open, measure]);

  const child = Children.only(children);
  if (!isValidElement(child)) return child;

  type ChildProps = {
    ref?: ((node: HTMLElement | null) => void) | { current: HTMLElement | null };
    onMouseEnter?: (event: MouseEvent) => void;
    onMouseLeave?: (event: MouseEvent) => void;
    onFocus?: (event: FocusEvent) => void;
    onBlur?: (event: FocusEvent) => void;
    [key: string]: unknown;
  };  const childProps = child.props as ChildProps;
  const userRef = childProps.ref;

  const setRef = (node: HTMLElement | null) => {
    triggerRef.current = node;
    if (typeof userRef === "function") userRef(node);
    else if (userRef && typeof userRef === "object") userRef.current = node;
  };
  const trigger = cloneElement(child, {
    ref: setRef,
    "aria-describedby": open ? id : undefined,
    onMouseEnter: (event: MouseEvent) => {
      handleShow();
      childProps.onMouseEnter?.(event);
    },
    onMouseLeave: (event: MouseEvent) => {
      handleHide();
      childProps.onMouseLeave?.(event);
    },
    onFocus: (event: FocusEvent) => {
      handleShow();
      childProps.onFocus?.(event);
    },
    onBlur: (event: FocusEvent) => {
      handleHide();
      childProps.onBlur?.(event);
    },
  } as Partial<ChildProps>);
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const tooltipStyle: CSSProperties = coords
    ? {
        position: "fixed",
        top: `${coords.top}px`,
        left: `${coords.left}px`,
        animation: prefersReducedMotion
          ? undefined
          : "app-tooltip-fade-in 140ms var(--ease-out)",
      }
    : { position: "fixed", visibility: "hidden", top: 0, left: 0 };

  return (
    <>
      {trigger}
      <div
        ref={tooltipRef}
        id={id}
        role="tooltip"
        className={`app-tooltip app-tooltip-${coords?.actualPosition ?? "top"}${open ? " is-open" : ""}`}
        style={tooltipStyle}
      >
        {content}
      </div>
    </>
  );
}