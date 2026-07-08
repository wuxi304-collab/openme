// Pure-SVG glyphs used by the desktop title bar.
// Sized 13x13 to read slightly larger than the 11x11 window control glyphs
// while still feeling part of the same icon family. All strokes use
// currentColor + 1.25 stroke-width to match the existing window controls.

interface IconProps { className?: string; }

export function SunIcon({ className }: IconProps) {
  // Shown in dark mode — clicking switches to light.
  // 8-pointed sun: filled center disc + 8 rays.
  return (
    <svg
      className={className}
      aria-hidden="true"
      width="13"
      height="13"
      viewBox="0 0 16 16"
    >
      <circle cx="8" cy="8" r="2.75" />
      <path d="M8 1.25v1.75M8 13v1.75M1.25 8h1.75M13 8h1.75M3.05 3.05l1.25 1.25M11.7 11.7l1.25 1.25M3.05 12.95l1.25-1.25M11.7 4.3l1.25-1.25" strokeLinecap="round" />
    </svg>
  );
}

export function MoonIcon({ className }: IconProps) {
  // Shown in light mode — clicking switches to dark.
  // Filled crescent: a 5.5-radius circle with a 6.5-radius bite taken out.
  return (
    <svg
      className={className}
      aria-hidden="true"
      width="13"
      height="13"
      viewBox="0 0 16 16"
    >
      <path
        d="M13.25 9.5A5.5 5.5 0 0 1 6.5 2.75a5.5 5.5 0 1 0 6.75 6.75z"
        strokeLinejoin="round"
      />
    </svg>
  );
}
