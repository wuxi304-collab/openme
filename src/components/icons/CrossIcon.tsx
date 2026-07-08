// Reusable cross / X glyph. Used in:
//  - capability grid "unsupported" cells
//  - (any future place that needs an "X")
//
// Single SVG path: two equal-length diagonal lines drawn from corner to
// corner. viewBox is 16x16; pass `size` to scale. strokeWidth defaults
// to 1.5 to match CheckIcon and the window-control family.

interface CrossIconProps {
  className?: string;
  size?: number;
  strokeWidth?: number;
}

export function CrossIcon({ className, size = 12, strokeWidth = 1.5 }: CrossIconProps) {
  return (
    <svg
      className={className}
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 16 16"
      strokeLinecap="round"
    >
      <path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" strokeWidth={strokeWidth} />
    </svg>
  );
}
