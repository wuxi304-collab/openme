// Reusable info glyph for app toast (info kind).
//
// A simple stroked circle with a lowercase "i" inside — vertical bar
// (the stem) and a dot above it (the tittle). Sized to match CheckIcon
// and AlertIcon so the toast row keeps consistent visual weight.

interface InfoIconProps {
  className?: string;
  size?: number;
  strokeWidth?: number;
}

export function InfoIcon({ className, size = 12, strokeWidth = 1.5 }: InfoIconProps) {
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
      <circle cx="8" cy="8" r="6.25" fill="none" strokeWidth={strokeWidth} />
      <circle cx="8" cy="5" r="0.85" fill="currentColor" stroke="none" />
      <path d="M8 7v4.25" strokeWidth={strokeWidth + 0.25} />
    </svg>
  );
}