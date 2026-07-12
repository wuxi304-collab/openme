import { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "../../i18n";
import type { FileInfo } from "../../types";

interface Position {
  x: number;
  y: number;
}

export interface RecentFileContextMenuProps {
  open: boolean;
  position: Position | null;
  file: FileInfo | null;
  onClose: () => void;
  onOpen: (file: FileInfo) => void;
  onReveal: (file: FileInfo) => void;
  onCopyPath: (file: FileInfo) => Promise<boolean>;
  onOpenInSystem: (file: FileInfo) => void;
  onRemove: (file: FileInfo) => void;
}

interface MenuItem {
  key: string;
  label: string;
  destructive?: boolean;
  separator?: false;
  onSelect: () => void;
}

export default function RecentFileContextMenu({
  open,
  position,
  file,
  onClose,
  onOpen,
  onReveal,
  onCopyPath,
  onOpenInSystem,
  onRemove,
}: RecentFileContextMenuProps) {
  const { t } = useI18n();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const restoredFocusRef = useRef<HTMLElement | null>(null);
  const [copyFlash, setCopyFlash] = useState<"" | "ok" | "fail">("");
  const [focusedIndex, setFocusedIndex] = useState(0);

  // Capture focus before mounting so we can restore it when the menu closes.
  useEffect(() => {
    if (!open) return;
    if (typeof document === "undefined") return;
    const active = document.activeElement;
    restoredFocusRef.current = active instanceof HTMLElement ? active : null;
    setCopyFlash("");
    setFocusedIndex(0);
  }, [open]);

  // After the menu mounts on each open, focus the first item so the user can
  // immediately drive the menu with ArrowUp/Down. Without this, the menu
  // satisfies role="menu" but is unusable from the keyboard alone.
  useEffect(() => {
    if (!open) return undefined;
    // Defer to next macrotask so React has committed the items; the previous
    // Sidebar keynav pattern used requestAnimationFrame but jsdom never
    // flushes rAF, breaking tests. setTimeout(0) always flushes in jsdom.
    const id = window.setTimeout(() => {
      itemRefs.current[focusedIndex]?.focus();
    }, 0);
    return () => window.clearTimeout(id);
  }, [open, focusedIndex]);

  // Close on Escape; ArrowDown/Up navigate the items; Home/End jump to first/
  // last. Outside-click handled below via mousedown capture.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent) => {
      // Don't double-handle Enter / Space — the menuitems are <button>s and
      // those keys already activate them via native click handling.
      const targetInMenu = menuRef.current?.contains(document.activeElement ?? null);
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (!targetInMenu) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedIndex((prev) => {
          const next = (prev + 1) % itemRefs.current.length;
          itemRefs.current[next]?.focus();
          return next;
        });
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedIndex((prev) => {
          const length = itemRefs.current.length;
          const next = (prev - 1 + length) % length;
          itemRefs.current[next]?.focus();
          return next;
        });
      } else if (e.key === "Home") {
        e.preventDefault();
        setFocusedIndex(0);
        itemRefs.current[0]?.focus();
      } else if (e.key === "End") {
        e.preventDefault();
        const last = itemRefs.current.length - 1;
        setFocusedIndex(last);
        itemRefs.current[last]?.focus();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, onClose]);

  // Outside-click close using mousedown capture so React event stopPropagation
  // in child menus doesn't accidentally swallow the dismissal.
  useEffect(() => {
    if (!open) return undefined;
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (menuRef.current && target && !menuRef.current.contains(target)) {
        onClose();
      }
    };
    window.addEventListener("mousedown", onMouseDown, true);
    return () => window.removeEventListener("mousedown", onMouseDown, true);
  }, [open, onClose]);

  // Restore focus to whatever had it before opening once we unmount.
  useEffect(() => {
    return () => {
      const previous = restoredFocusRef.current;
      if (previous && typeof previous.focus === "function") {
        previous.focus();
      }
      restoredFocusRef.current = null;
    };
  }, []);

  // Auto-clear copy feedback after 1.4 s so the menu returns to its resting state.
  useEffect(() => {
    if (copyFlash === "") return undefined;
    const id = window.setTimeout(() => setCopyFlash(""), 1400);
    return () => window.clearTimeout(id);
  }, [copyFlash]);

  const handleCopyPath = useCallback(async () => {
    if (!file) return;
    const ok = await onCopyPath(file);
    setCopyFlash(ok ? "ok" : "fail");
  }, [file, onCopyPath]);

  if (!open || !file || !position) return null;

  const items: MenuItem[] = [
    { key: "open", label: t("recentMenuOpen"), onSelect: () => onOpen(file) },
    { key: "reveal", label: t("recentMenuReveal"), onSelect: () => onReveal(file) },
    { key: "copy", label: copyFlash === "ok" ? t("recentMenuCopied") : copyFlash === "fail" ? t("recentMenuCopyPathFailed") : t("recentMenuCopyPath"), onSelect: () => { void handleCopyPath(); } },
    { key: "system", label: t("recentMenuOpenWithSystem"), onSelect: () => onOpenInSystem(file) },
    { key: "remove", label: t("recentMenuRemove"), destructive: true, onSelect: () => onRemove(file) },
  ];

  // Position the menu but keep it on-screen — flip horizontally if it would
  // overflow the right edge, and clamp to the viewport top.
  const MENU_WIDTH = 240;
  const MENU_HEIGHT = 220;
  const maxX = typeof window !== "undefined" ? window.innerWidth - MENU_WIDTH - 8 : position.x;
  const maxY = typeof window !== "undefined" ? window.innerHeight - MENU_HEIGHT - 8 : position.y;
  const left = Math.max(8, Math.min(position.x, maxX));
  const top = Math.max(8, Math.min(position.y, maxY));

  return (
    <div
      ref={menuRef}
      className="recent-context-menu"
      role="menu"
      aria-label={t("recentMenuOpen")}
      style={{ left: `${left}px`, top: `${top}px` }}
    >
      <ul className="recent-context-menu-list">
        {items.map((item, index) => (
          <li key={item.key} role="none">
            <button
              ref={(el) => {
                itemRefs.current[index] = el;
              }}
              type="button"
              role="menuitem"
              // Roving tabindex: only the currently focused item is in the
              // tab sequence, so Tab leaves the menu instead of stepping
              // through every action.
              tabIndex={index === focusedIndex ? 0 : -1}
              className={`recent-context-menu-item${item.destructive ? " is-destructive" : ""}${item.key === "copy" && copyFlash === "ok" ? " is-success" : ""}${item.key === "copy" && copyFlash === "fail" ? " is-error" : ""}${index === focusedIndex ? " is-focused" : ""}`}
              onClick={(event) => {
                event.stopPropagation();
                item.onSelect();
                // Only close for terminal actions — copy-path keeps the menu open
                // for the feedback flash.
                if (item.key !== "copy") onClose();
              }}
              onMouseEnter={(event) => {
                // Hover moves focus marker so visual state and keyboard state agree
                setFocusedIndex(index);
                event.currentTarget.focus({ preventScroll: true });
              }}
              onFocus={() => setFocusedIndex(index)}
            >
              <span className="recent-context-menu-item-label">{item.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}