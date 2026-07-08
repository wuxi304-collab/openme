// Reusable alert / error glyph for app toast (error kind).
//
// Composed of three pieces inside a 16x16 viewBox:
//  1. An equilateral triangle outline (alert shape, points up)
//  2. A vertical bar in the middle (the "!")
//  3. A small dot at the bottom (the "." under the "!")
//
// strokeWidth defaults to 1.5 to match CheckIcon / CrossIcon, but the
// toast usually wants a slightly bolder feel — pass strokeWidth={1.75}
// or 2 for that. The bar and dot use filled circles / rounded rects
// so they look chunky at small sizes.

interface AlertIconProps {
  className?: string;
  size?: number;
  strokeWidth?: number;
}

export function AlertIcon({ className, size = 12, strokeWidth = 1.5 }: AlertIconProps) {
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
      <path d="M8 2.25L14.5 13.25H1.5L8 2.25z" fill="none" strokeWidth={strokeWidth} />
      <path d="M8 6.5v3.25" strokeWidth={strokeWidth + 0.25} />
      <circle cx="8" cy="11.6" r="0.85" fill="currentColor" stroke="none" />
    </svg>
  );
}
