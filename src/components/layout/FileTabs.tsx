import { FileTabState } from "../../types";
import { detectCategory } from "../../utils/fileTypeDetector";
import FileTypeIcon from "../FileTypeIcon";

interface Props { tabs: FileTabState[]; activeId: string | null; onSelect: (id: string) => void; onClose: (id: string) => void; }
export default function FileTabs({ tabs, activeId, onSelect, onClose }: Props) {
  if (!tabs.length) return null;
  return <nav className="file-tabs" aria-label="打开的文件"><span className="tabs-label">工作集</span><div className="tabs-scroll">{tabs.map((tab) => {
    const active = tab.id === activeId;
    return <div key={tab.id} className={`file-tab ${active ? "is-active" : ""}`}><button type="button" className="tab-main" aria-current={active ? "page" : undefined} onClick={() => onSelect(tab.id)}><FileTypeIcon type={detectCategory(tab.path)} size={17} /><span>{tab.name}</span>{tab.isDirty && <i className="dirty-dot" aria-label="未保存" />}</button><button type="button" className="tab-close" aria-label={`关闭 ${tab.name}`} onClick={() => onClose(tab.id)}>×</button></div>;
  })}</div></nav>;
}
