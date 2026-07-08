import { FileTabState } from "../../types";
import { useI18n } from "../../i18n";
import { detectCategory } from "../../utils/fileTypeDetector";
import FileTypeIcon from "../FileTypeIcon";

interface Props { tabs: FileTabState[]; activeId: string | null; onSelect: (id: string) => void; onClose: (id: string) => void; }
export default function FileTabs({ tabs, activeId, onSelect, onClose }: Props) {
  const { t, tf } = useI18n();
  if (!tabs.length) return null;
  const move = (index: number, direction: number, event: React.KeyboardEvent<HTMLButtonElement>) => { const next = (index + direction + tabs.length) % tabs.length; onSelect(tabs[next].id); requestAnimationFrame(() => event.currentTarget.closest("[role=tablist]")?.querySelectorAll<HTMLButtonElement>("[role=tab]")[next]?.focus()); };
  return (
    <nav className="file-tabs" aria-label={t("fileTabsAria")}>
      <span className="tabs-label">{t("workspaceSet")}</span>
      <div className="tabs-scroll" role="tablist">
        {tabs.map((tab, index) => {
          const active = tab.id === activeId;
          return (
            <div key={tab.id} className={`file-tab ${active ? "is-active" : ""}`}>
              <button
                type="button"
                role="tab"
                className="tab-main"
                aria-selected={active}
                tabIndex={active ? 0 : -1}
                onKeyDown={(event) => {
                  if (event.key === "ArrowRight") move(index, 1, event);
                  if (event.key === "ArrowLeft") move(index, -1, event);
                }}
                onClick={() => onSelect(tab.id)}
              >
                <FileTypeIcon type={detectCategory(tab.path)} size={17} extension={tab.sourceFile?.extension} />
                <span>{tab.name}</span>
                {tab.isDirty && <i className="dirty-dot" aria-label={t("unsaved")} />}
              </button>
              <button
                type="button"
                className="tab-close"
                aria-label={tf("closeTabAria", { name: tab.name })}
                onClick={() => onClose(tab.id)}
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
    </nav>
  );
}
