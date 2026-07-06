interface Props { activeTab: { name: string; size?: number; content?: string } | null; }
export default function StatusBar({ activeTab }: Props) {
  const lines = activeTab?.content ? activeTab.content.split("\n").length : 0;
  return <footer className="status-bar"><div className="status-left"><span className="status-ready"><i aria-hidden="true" /> READY</span><span className="status-file">{activeTab?.name ?? "等待打开文件"}</span>{lines > 0 && <span className="status-meta">{lines.toLocaleString()} 行</span>}</div><div className="status-right"><span>UTF-8</span><span className="status-lives" aria-label="本地处理">× 1</span></div></footer>;
}
