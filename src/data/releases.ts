// Curated changelog shown inside the About dialog. Each release entry
// references i18n keys (no raw user-facing strings here) so the section
// stays locale-driven and doesnt drift from the rest of the chrome.
//
// The list is hand-curated rather than auto-generated from git log so we
// can group small fixes under a coherent theme ("chrome polish",
// "audio codecs") instead of dumping commit subjects.
//
// We only render the LATEST_LIMIT most-recent entries. Anything older
// gets culled to keep the About dialog readable. The AboutDialog owns
// the rendering; this module is pure data + lookup helpers.

export interface ReleaseEntry {
  /** Stable identifier — "v0.1.0", "v0.1.1", etc. Used as React key. */
  id: string;
  /** Human-readable version, surfaced in the version pill. */
  version: string;
  /** YYYY-MM-DD release date. ISO 8601 so it sorts lexicographically. */
  date: string;
  /** Single-sentence headline for the release. Maps to aboutReleaseHeadline{id}. */
  headlineKey: string;
  /** Bullet keys for the highlights list. Each maps to aboutReleaseBullet{id}{i}. */
  bulletKeys: ReadonlyArray<string>;
}

// Newest first — append to this array as new versions ship. The dialog
// culls anything older than LATEST_LIMIT entries, so the underlying list
// can be longer than what users see at once.
const RELEASES: ReadonlyArray<ReleaseEntry> = [
  {
    id: "v0.1.0",
    version: "v0.1.0",
    date: "2026-01-10",
    headlineKey: "aboutReleaseHeadlineV010",
    bulletKeys: [
      "aboutReleaseV010Bullet1",
      "aboutReleaseV010Bullet2",
      "aboutReleaseV010Bullet3",
      "aboutReleaseV010Bullet4",
      "aboutReleaseV010Bullet5",
      "aboutReleaseV010Bullet6",
    ],
  },
  {
    id: "v0.0.7",
    version: "v0.0.7",
    date: "2025-12-22",
    headlineKey: "aboutReleaseHeadlineV007",
    bulletKeys: [
      "aboutReleaseV007Bullet1",
      "aboutReleaseV007Bullet2",
      "aboutReleaseV007Bullet3",
      "aboutReleaseV007Bullet4",
    ],
  },
  {
    id: "v0.0.6",
    version: "v0.0.6",
    date: "2025-12-08",
    headlineKey: "aboutReleaseHeadlineV006",
    bulletKeys: [
      "aboutReleaseV006Bullet1",
      "aboutReleaseV006Bullet2",
      "aboutReleaseV006Bullet3",
    ],
  },
  {
    id: "v0.0.5",
    version: "v0.0.5",
    date: "2025-11-18",
    headlineKey: "aboutReleaseHeadlineV005",
    bulletKeys: [
      "aboutReleaseV005Bullet1",
      "aboutReleaseV005Bullet2",
      "aboutReleaseV005Bullet3",
    ],
  },
  {
    id: "v0.0.4",
    version: "v0.0.4",
    date: "2025-10-30",
    headlineKey: "aboutReleaseHeadlineV004",
    bulletKeys: [
      "aboutReleaseV004Bullet1",
      "aboutReleaseV004Bullet2",
      "aboutReleaseV004Bullet3",
    ],
  },
  {
    id: "v0.0.3",
    version: "v0.0.3",
    date: "2025-10-12",
    headlineKey: "aboutReleaseHeadlineV003",
    bulletKeys: [
      "aboutReleaseV003Bullet1",
      "aboutReleaseV003Bullet2",
    ],
  },
];

export const LATEST_LIMIT = 5;

export function getLatestRelease(): ReleaseEntry | null {
  return RELEASES[0] ?? null;
}

export function getRecentReleases(): ReadonlyArray<ReleaseEntry> {
  return RELEASES.slice(0, LATEST_LIMIT);
}
