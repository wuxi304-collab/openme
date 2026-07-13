import { useRef, useState } from "react";
import { FileTabState } from "../../types";
import { useI18n } from "../../i18n";
import { detectCategory } from "../../utils/fileTypeDetector";
import FileTypeIcon from "../FileTypeIcon";

interface Props {
  tabs: FileTabState[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
}

type DropEdge = "before" | "after" | null;

export default function FileTabs({ tabs, activeId, onSelect, onClose, onReorder }: Props) {
  const { t, tf } = useI18n();
  const draggingIdRef = useRef<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ index: number; edge: DropEdge } | null>(null);
  const reorderAnnouncement = useRef("");
  const [, setAnnounceTick] = useState(0);
  const announce = (message: string) => {
    reorderAnnouncement.current = message;
    setAnnounceTick((tick) => tick + 1);
  };

  if (!tabs.length) return null;

  const focusTab = (index: number) => {
    requestAnimationFrame(() => {
      const list = document.querySelector<HTMLDivElement>(".file-tabs .tabs-scroll");
      const target = list?.querySelectorAll<HTMLButtonElement>("[role=tab]")[index];
      target?.focus();
    });
  };

  const moveFocus = (index: number, direction: number, event: React.KeyboardEvent<HTMLButtonElement>) => {
    const next = (index + direction + tabs.length) % tabs.length;
    onSelect(tabs[next].id);
    focusTab(next);
    event.preventDefault();
  };

  const moveTab = (index: number, direction: number, event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.ctrlKey || event.metaKey) {
      const target = Math.max(0, Math.min(tabs.length - 1, index + direction));
      if (target === index) return;
      const toIndex = direction > 0 ? target + 1 : target;
      onReorder(index, toIndex);
      announce(
        direction > 0
          ? tf("tabMovedRightAnnounce", { name: tabs[index].name })
          : tf("tabMovedLeftAnnounce", { name: tabs[index].name })
      );
      focusTab(target);
      event.preventDefault();
      event.stopPropagation();
    } else {
      moveFocus(index, direction, event);
    }
  };

  const handleDragStart = (event: React.DragEvent<HTMLDivElement>, index: number) => {
    const tab = tabs[index];
    draggingIdRef.current = tab.id;
    setDraggingId(tab.id);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", tab.id);
  };

  const handleDragOverTab = (event: React.DragEvent<HTMLDivElement>, index: number) => {
    if (!draggingIdRef.current) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    const rect = event.currentTarget.getBoundingClientRect();
    const midpoint = rect.left + rect.width / 2;
    const edge: DropEdge = event.clientX < midpoint ? "before" : "after";
    if (dropTarget?.index === index && dropTarget.edge === edge) return;
    setDropTarget({ index, edge });
  };

  const handleDragLeaveTab = (event: React.DragEvent<HTMLDivElement>) => {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
    setDropTarget(null);
  };

  const handleDropTab = (event: React.DragEvent<HTMLDivElement>, index: number) => {
    event.preventDefault();
    const draggedId = draggingIdRef.current;
    if (!draggedId) return;
    const fromIndex = tabs.findIndex((tab) => tab.id === draggedId);
    if (fromIndex < 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const midpoint = rect.left + rect.width / 2;
    const edge: DropEdge = event.clientX < midpoint ? "before" : "after";
    let toIndex = edge === "after" ? index + 1 : index;
    if (toIndex > fromIndex) toIndex -= 1;
    if (toIndex !== fromIndex) onReorder(fromIndex, toIndex);
    draggingIdRef.current = null;
    setDraggingId(null);
    setDropTarget(null);
  };

  const handleDragEnd = () => {
    draggingIdRef.current = null;
    setDraggingId(null);
    setDropTarget(null);
  };

  return (
    <nav className="file-tabs" aria-label={t("fileTabsAria")}>
      <span className="tabs-label">{t("workspaceSet")}</span>
      <div className="tabs-scroll" role="tablist" aria-describedby="file-tabs-reorder-hint">
        {tabs.map((tab, index) => {
          const active = tab.id === activeId;
          const dragging = tab.id === draggingId;
          const dropBefore = dropTarget?.index === index && dropTarget.edge === "before";
          const dropAfter = dropTarget?.index === index && dropTarget.edge === "after";
          const loading = !!tab.isLoading;
          const errored = !!tab.error;
          const tabClass = [
            "file-tab",
            active ? "is-active" : "",
            dragging ? "is-dragging" : "",
            loading ? "is-loading" : "",
            errored ? "is-error" : "",
            dropBefore ? "drop-before" : "",
            dropAfter ? "drop-after" : "",
          ].filter(Boolean).join(" ");
          // aria-label appends a state hint so screen-reader users hear
          // "Drag to reorder X (loading)" / "(load failed)" rather than
          // having to guess why the active tab is showing the loading card.
          let ariaLabel = tf("tabDragHandleAria", { name: tab.name });
          if (loading) ariaLabel += " " + t("tabLoadingAriaSuffix");
          else if (errored) ariaLabel += " " + t("tabErrorAriaSuffix");
          return (
            <div
              key={tab.id}
              className={tabClass}
              draggable
              onDragStart={(event) => handleDragStart(event, index)}
              onDragOver={(event) => handleDragOverTab(event, index)}
              onDragLeave={handleDragLeaveTab}
              onDrop={(event) => handleDropTab(event, index)}
              onDragEnd={handleDragEnd}
              data-tab-index={index}
            >
              <button
                type="button"
                role="tab"
                className="tab-main"
                aria-selected={active}
                aria-busy={loading || undefined}
                aria-invalid={errored || undefined}
                aria-grabbed={dragging || undefined}
                aria-label={ariaLabel}
                tabIndex={active ? 0 : -1}
                onKeyDown={(event) => {
                  if (event.key === "ArrowRight") moveTab(index, 1, event);
                  if (event.key === "ArrowLeft") moveTab(index, -1, event);
                  if (event.key === "Home") { onSelect(tabs[0].id); focusTab(0); event.preventDefault(); }
                  if (event.key === "End") { onSelect(tabs[tabs.length - 1].id); focusTab(tabs.length - 1); event.preventDefault(); }
                }}
                onAuxClick={(event) => {
                  if (event.button === 1) {
                    event.preventDefault();
                    onClose(tab.id);
                  }
                }}
                onClick={() => onSelect(tab.id)}
              >
                <FileTypeIcon type={detectCategory(tab.path)} size={17} extension={tab.sourceFile?.extension} />
                <span>{tab.name}</span>
                {loading && (
                  <span
                    className="tab-loading-spinner"
                    role="presentation"
                    aria-hidden="true"
                  >
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                      <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.4" strokeDasharray="6 22" strokeLinecap="round" />
                    </svg>
                  </span>
                )}
                {errored && (
                  <span
                    className="tab-error-mark"
                    role="img"
                    aria-label={tf("tabStateErrorAria", { name: tab.name })}
                    title={t("tabErrorBadge")}
                  >
                    !
                  </span>
                )}
                {tab.isDirty && <i className="dirty-dot" aria-label={t("unsaved")} />}
              </button>
              <button
                type="button"
                className="tab-close"
                aria-label={tf("closeTabAria", { name: tab.name })}
                onAuxClick={(event) => {
                  if (event.button === 1) event.preventDefault();
                }}
                onClick={() => onClose(tab.id)}
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
      <span id="file-tabs-reorder-hint" className="sr-only">
        {t("tabReorderHint")}
      </span>
      <span role="status" aria-live="polite" className="sr-only">
        {reorderAnnouncement.current}
      </span>
    </nav>
  );
}
