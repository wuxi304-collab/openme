// Reusable settings / gear glyph for icon buttons (e.g. CAD assistant).
//
// A classic 8-tooth gear inside a 16x16 viewBox:
//  - Center hole: a circle with currentColor stroke
//  - 8 trapezoidal teeth around the perimeter, drawn as a single path
//    with 8 line segments
//
// strokeWidth defaults to 1.25 to match the titlebar window-control
// family. Pass `size` to scale; the gear is intentionally slightly
// wider than tall (16x15 effective area) so the teeth read clearly
// at small sizes.

interface CogIconProps {
  className?: string;
  size?: number;
  strokeWidth?: number;
}

export function CogIcon({ className, size = 13, strokeWidth = 1.25 }: CogIconProps) {
  // 8 teeth. Each tooth is a small trapezoid at 45° increments.
  // Inner radius (tooth root): 4.25; outer radius (tooth tip): 6.25.
  // Tooth half-width: 0.9 along the tangent.
  const teeth: string[] = [];
  for (let i = 0; i < 8; i += 1) {
    const angle = (i * Math.PI) / 4;
    const a = angle - 0.18; // tooth leading edge
    const b = angle - 0.05; // tooth tip leading corner
    const c = angle + 0.05; // tooth tip trailing corner
    const d = angle + 0.18; // tooth trailing edge
    const r1 = 4.25;
    const r2 = 6.25;
    teeth.push(
      `${(8 + r2 * Math.cos(b)).toFixed(2)},${(8 + r2 * Math.sin(b)).toFixed(2)} ` +
      `${(8 + r2 * Math.cos(c)).toFixed(2)},${(8 + r2 * Math.sin(c)).toFixed(2)} ` +
      `${(8 + r1 * Math.cos(d)).toFixed(2)},${(8 + r1 * Math.sin(d)).toFixed(2)} ` +
      `${(8 + r1 * Math.cos(a)).toFixed(2)},${(8 + r1 * Math.sin(a)).toFixed(2)}`,
    );
  }
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
      <path d={`M${teeth.join(" L")} Z`} fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeWidth={strokeWidth} />
      <circle cx="8" cy="8" r="1.85" fill="none" stroke="currentColor" strokeWidth={strokeWidth} />
    </svg>
  );
}
