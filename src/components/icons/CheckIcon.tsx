// Reusable check / tick glyph. Used in:
//  - app toast (success kind) — bold weight, larger size
//  - capability grid "supported" cells — thin weight, smaller size
//  - (any future place that needs a tick)
//
// Single SVG path: a two-segment check drawn from bottom-left up through
// the bend and out to the top-right. The viewBox is 16x16; pass `size`
// to scale. `strokeWidth` defaults to 1.5 (matches the window-control
// family) but callers can bump it to 2 for a toastier feel.

interface CheckIconProps {
  className?: string;
  size?: number;
  strokeWidth?: number;
}

export function CheckIcon({ className, size = 12, strokeWidth = 1.5 }: CheckIconProps) {
  return (
    <svg
      className={className}
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 16 16"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3.25 8.5l3.5 3.5L12.75 5" fill="none" stroke="currentColor" strokeWidth={strokeWidth} />
    </svg>
  );
}
