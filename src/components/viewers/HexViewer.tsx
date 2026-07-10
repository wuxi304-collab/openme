import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "../../i18n";
import "./HexViewer.css";

// 16 bytes per row is the universal "standard" hex view width (xxd, hexdump,
// HxD, 010 Editor all default to this). Wide enough to show patterns, narrow
// enough that the ASCII column stays legible.
const BYTES_PER_ROW = 16;

// 256 rows per screen = one full PageDown/PageUp. Combined with 16 bytes/row
// that's 4096 bytes per page -- matches the conventional "4 KiB hex page".
const ROWS_PER_PAGE = 256;

// Files larger than this stay fully loaded but only the first chunk renders.
// 256 KiB is enough to inspect most binary blobs (firmware headers, save
// files, logs) without freezing the renderer on multi-megabyte dumps.
const MAX_RENDERED_BYTES = 256 * 1024;

// Maximum number of search results we'll materialize. Beyond that we still
// report the count but don't keep the offsets in memory -- prevents a
// pathological query ("FF FF FF ...") from blowing the heap.
const MAX_TRACKED_MATCHES = 500;

interface Props {
  base64Data: string;
  fileName: string;
}

// One row of the dump. Plain data class (no methods) so React's reconciler
// can render thousands of these without per-row overhead.
interface HexRow {
  offset: number;
  bytes: Uint8Array;
}

function decodeBase64(base64: string): Uint8Array {
  const binary = atob(base64);
  const length = binary.length;
  const out = new Uint8Array(length);
  for (let index = 0; index < length; index += 1) {
    out[index] = binary.charCodeAt(index);
  }
  return out;
}

function formatOffset(value: number, width: number): string {
  // Pad with leading zeros so rows align cleanly. Width is computed from the
  // total file length so a 1-byte file still shows "00000000" and a 4 GB
  // file shows "FFFFFFFF".
  return value.toString(16).toUpperCase().padStart(width, "0");
}

function formatByte(byte: number): string {
  return byte.toString(16).toUpperCase().padStart(2, "0");
}

function asciiGlyph(byte: number): string {
  // Print ASCII as-is; otherwise show a dot so columns stay aligned. We
  // intentionally allow 0x7F (DEL) through -- some hex viewers gate it, but
  // it just renders as a control glyph and is harmless.
  return byte >= 0x20 && byte <= 0x7e ? String.fromCharCode(byte) : ".";
}

interface ParsedSearch {
  bytes: Uint8Array;
  valid: boolean;
}

function parseSearchQuery(raw: string): ParsedSearch {
  const trimmed = raw.trim();
  if (!trimmed) return { bytes: new Uint8Array(0), valid: false };

  // Hex mode: every whitespace-separated token is a pair of hex digits.
  // We tolerate up to 2 chars per token so users can type "504B" or "50 4B".
  const tokens = trimmed.split(/\s+/);
  if (tokens.every((token) => /^[0-9a-fA-F]{1,2}$/.test(token))) {
    const out = new Uint8Array(tokens.length);
    for (let index = 0; index < tokens.length; index += 1) {
      out[index] = parseInt(tokens[index], 16);
    }
    return { bytes: out, valid: true };
  }

  // Text mode: encode the literal string as UTF-8 bytes. CJK input gets
  // multi-byte sequences, which is exactly what users searching "钢铁" want.
  try {
    const encoded = new TextEncoder().encode(trimmed);
    return { bytes: encoded, valid: encoded.length > 0 };
  } catch {
    return { bytes: new Uint8Array(0), valid: false };
  }
}

function findMatches(buffer: Uint8Array, needle: Uint8Array, limit: number): number[] {
  if (needle.length === 0 || buffer.length < needle.length) return [];
  const out: number[] = [];
  // Boyer-Moore would be faster, but for buffers up to MAX_RENDERED_BYTES
  // (256 KiB) the naive indexOf loop runs in well under 1 ms. Keep it simple.
  outer: for (let cursor = 0; cursor <= buffer.length - needle.length; cursor += 1) {
    for (let offset = 0; offset < needle.length; offset += 1) {
      if (buffer[cursor + offset] !== needle[offset]) continue outer;
    }
    out.push(cursor);
    if (out.length >= limit) break;
  }
  return out;
}

export default function HexViewer({ base64Data, fileName }: Props) {
  const { t, tf } = useI18n();

  const buffer = useMemo(() => decodeBase64(base64Data), [base64Data]);

  // We keep the full buffer in memory (cheap for files we'd realistically
  // open as a single tab) but only render the first MAX_RENDERED_BYTES.
  // The "showing first X of Y" hint makes that limit visible to the user.
  const totalBytes = buffer.length;
  const renderedBuffer = useMemo(
    () => (totalBytes > MAX_RENDERED_BYTES ? buffer.slice(0, MAX_RENDERED_BYTES) : buffer),
    [buffer, totalBytes]
  );

  const offsetWidth = Math.max(8, totalBytes.toString(16).length);

  const rows = useMemo<HexRow[]>(() => {
    const out: HexRow[] = [];
    for (let offset = 0; offset < renderedBuffer.length; offset += BYTES_PER_ROW) {
      out.push({ offset, bytes: renderedBuffer.subarray(offset, offset + BYTES_PER_ROW) });
    }
    return out;
  }, [renderedBuffer]);

  const [topRowIndex, setTopRowIndex] = useState(0);
    const [searchQuery, setSearchQuery] = useState("");
  const [parsedSearch, setParsedSearch] = useState<ParsedSearch>({ bytes: new Uint8Array(0), valid: false });
  const [matches, setMatches] = useState<number[]>([]);
  const [matchIndex, setMatchIndex] = useState(-1);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Re-derive matches whenever the query or buffer changes. Done in an
  // effect (not a memo) because we want the count to surface even when the
  // user is mid-typing and the buffer hasn't changed.
  useEffect(() => {
    if (!parsedSearch.valid) {
      setMatches([]);
      setMatchIndex(-1);
      return;
    }
    const found = findMatches(renderedBuffer, parsedSearch.bytes, MAX_TRACKED_MATCHES);
    setMatches(found);
    setMatchIndex(found.length > 0 ? 0 : -1);
    if (found.length > 0) {
      const firstRow = Math.floor(found[0] / BYTES_PER_ROW);
      setTopRowIndex(Math.max(0, firstRow - 2));
    }
  }, [parsedSearch, renderedBuffer]);

  // Clamp topRowIndex when buffer length changes (e.g. user opens a smaller
  // file in the same viewer instance via tab switch).
  useEffect(() => {
    const maxStart = Math.max(0, rows.length - ROWS_PER_PAGE);
    if (topRowIndex > maxStart) setTopRowIndex(maxStart);
  }, [rows.length, topRowIndex]);

  const goToOffset = useCallback(
    (offset: number) => {
      const rowIndex = Math.floor(offset / BYTES_PER_ROW);
      setTopRowIndex(Math.max(0, Math.min(rows.length - 1, rowIndex - 2)));
    },
    [rows.length]
  );

  const handleSearchSubmit = useCallback(
    (event?: React.FormEvent) => {
      event?.preventDefault();
      setParsedSearch(parseSearchQuery(searchQuery));
    },
    [searchQuery]
  );

  const handleNextMatch = useCallback(() => {
    if (matches.length === 0) return;
    setMatchIndex((current) => {
      const next = (current + 1) % matches.length;
      goToOffset(matches[next]);
      return next;
    });
  }, [matches, goToOffset]);

  const handlePrevMatch = useCallback(() => {
    if (matches.length === 0) return;
    setMatchIndex((current) => {
      const prev = (current - 1 + matches.length) % matches.length;
      goToOffset(matches[prev]);
      return prev;
    });
  }, [matches, goToOffset]);

  // Global keyboard handler so PgUp/PgDn/Home/End work even when focus is
  // on the search input. We bail when an input/textarea is focused except
  // for "/" which forces a focus jump into the search bar.
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target;
      const isInput =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement;

      if (event.key === "/" && !isInput) {
        event.preventDefault();
              // Search bar is always visible in the toolbar; "/" just focuses it.
              const input = document.querySelector<HTMLInputElement>(".hex-search input");
              input?.focus();
              input?.select();
              return;
            }
      if (isInput) return;

      if (event.key === "PageDown") {
        event.preventDefault();
        setTopRowIndex((current) => Math.min(Math.max(0, rows.length - 1), current + ROWS_PER_PAGE));
      } else if (event.key === "PageUp") {
        event.preventDefault();
        setTopRowIndex((current) => Math.max(0, current - ROWS_PER_PAGE));
      } else if (event.key === "Home") {
        event.preventDefault();
        setTopRowIndex(0);
      } else if (event.key === "End") {
        event.preventDefault();
        setTopRowIndex(Math.max(0, rows.length - ROWS_PER_PAGE));
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [rows.length]);

  const handleCopyOffset = useCallback(
    async (offset: number) => {
      if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) return;
      try {
        await navigator.clipboard.writeText(`0x${formatOffset(offset, offsetWidth)}`);
        pushToastRef.current?.("success", tf("hexCopiedOffset", { offset: formatOffset(offset, offsetWidth) }));
      } catch {
        // Clipboard rejected (no user gesture, etc.) -- silently skip.
      }
    },
    [offsetWidth, tf]
  );

  // Toast bridge: HexViewer doesn't own the toast stack. We expose a ref so
  // the App-level wrapper can inject the pushToast callback without
  // changing the public props. Falls back to no-op if not wired.
  const pushToastRef = useRef<((kind: "success" | "error", message: string) => void) | null>(null);
  useEffect(() => {
    pushToastRef.current = (window as unknown as { __hexPushToast?: (kind: "success" | "error", message: string) => void }).__hexPushToast ?? null;
  }, []);

  const visibleRows = useMemo(() => {
    const end = Math.min(rows.length, topRowIndex + ROWS_PER_PAGE);
    return rows.slice(topRowIndex, end);
  }, [rows, topRowIndex]);

  if (totalBytes === 0) {
    return (
      <div className="hex-viewer-shell">
        <div className="hex-empty">{t("hexEmpty")}</div>
      </div>
    );
  }

  const truncated = totalBytes > MAX_RENDERED_BYTES;

  return (
    <div className="hex-viewer-shell">
      <div className="hex-toolbar">
        <span className="viewer-label">
          {t("hexLabel")}
          <small className="viewer-meta">{fileName}</small>
        </span>
        <form className="hex-search" onSubmit={handleSearchSubmit}>
          <label>
            <span className="sr-only">{t("hexSearchAria")}</span>
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={t("hexSearchPlaceholder")}
              title={t("hexSearchHint")}
              autoComplete="off"
            />
          </label>
          <button type="submit" disabled={!searchQuery.trim()}>
            {t("hexSearchSubmit")}
          </button>
          {parsedSearch.valid && matches.length > 0 && (
            <>
              <button type="button" onClick={handlePrevMatch} aria-label={t("hexSearchPrev")}>
                ↑
              </button>
              <button type="button" onClick={handleNextMatch} aria-label={t("hexSearchNext")}>
                ↓
              </button>
              <span className="hex-match-count" role="status">
                {matchIndex >= 0
                  ? tf("hexMatchCount", { count: `${matchIndex + 1}/${matches.length}${matches.length >= MAX_TRACKED_MATCHES ? "+" : ""}` })
                  : t("hexNoMatch")}
              </span>
            </>
          )}
          {parsedSearch.valid && matches.length === 0 && searchQuery.trim() && (
            <span className="hex-match-count" role="status">{t("hexNoMatch")}</span>
          )}
        </form>
        <div className="hex-toolbar-meta" aria-label={t("hexAddressAria")}>
          <span className="hex-address-pill">{t("hexAddressLabel")}: 0x{formatOffset(topRowIndex * BYTES_PER_ROW, offsetWidth)}</span>
        </div>
      </div>
      {truncated && (
        <div className="hex-truncated-banner" role="status">
          {tf("hexTruncated", { shown: renderedBuffer.length.toLocaleString(), total: totalBytes.toLocaleString() })}
        </div>
      )}
      <div className="hex-stage" ref={scrollRef} aria-label={t("hexAria")}>
        <div className="hex-row hex-row-header" aria-hidden="true">
          <span className="hex-col hex-col-offset">{t("hexAddressLabel")}</span>
          <span className="hex-col hex-col-bytes">
            {Array.from({ length: BYTES_PER_ROW }, (_, index) => formatByte(index)).join(" ")}
          </span>
          <span className="hex-col hex-col-ascii">ASCII</span>
        </div>
        {visibleRows.map((row) => {
          const matchStart = matches.find((offset) => offset >= row.offset && offset < row.offset + BYTES_PER_ROW);
          return (
            <div
              key={row.offset}
              className={`hex-row${matchStart !== undefined ? " has-match" : ""}`}
            >
              <button
                type="button"
                className="hex-col hex-col-offset hex-offset-button"
                onClick={() => handleCopyOffset(row.offset)}
                title={`0x${formatOffset(row.offset, offsetWidth)}`}
              >
                {formatOffset(row.offset, offsetWidth)}
              </button>
              <span className="hex-col hex-col-bytes">
                {Array.from(row.bytes, (byte, index) => {
                  const offset = row.offset + index;
                  const isMatch = matches.includes(offset);
                  return (
                    <span key={index} className={`hex-byte${isMatch ? " is-match" : ""}`}>
                      {formatByte(byte)}
                    </span>
                  );
                }).reduce<React.ReactNode[]>((acc, element, index) => {
                  if (index > 0) acc.push(<span key={`s-${index}`} className="hex-byte-sep"> </span>);
                  acc.push(element);
                  return acc;
                }, [])}
              </span>
              <span className="hex-col hex-col-ascii">
                {Array.from(row.bytes, (byte, index) => {
                  const offset = row.offset + index;
                  const isMatch = matches.includes(offset);
                  return (
                    <span key={index} className={`hex-ascii${isMatch ? " is-match" : ""}`}>
                      {asciiGlyph(byte)}
                    </span>
                  );
                })}
              </span>
            </div>
          );
        })}
      </div>
      <div className="hex-footer" role="status">
        <small>{t("hexKeyboardHint")}</small>
      </div>
    </div>
  );
}