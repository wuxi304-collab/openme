import { FileInfo } from "../types";

interface Props {
  file: FileInfo | null;
  textContent: string | null;
  loading: boolean;
}

export default function PreviewPane({ file, textContent, loading }: Props) {
  if (!file) return null;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 rounded-xl border" style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}>
        <div
          className="w-8 h-8 rounded-full border-2 flex-shrink-0"
          style={{ borderColor: "var(--accent)", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p className="mt-3 text-[12px]" style={{ color: "var(--text-muted)" }}>正在加载...</p>
      </div>
    );
  }

  if (textContent !== null) {
    return (
      <div className="flex flex-col flex-1 min-h-0 rounded-xl border overflow-hidden" style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}>
        <div className="px-4 py-2.5 border-b flex items-center gap-2" style={{ borderColor: "var(--border-muted)" }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.8">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="3" y1="9" x2="21" y2="9" />
            <line x1="9" y1="21" x2="9" y2="9" />
          </svg>
          <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>内容预览</span>
          <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded" style={{ background: "var(--bg-elevated)", color: "var(--text-muted)" }}>
            {textContent.split("\n").length} 行
          </span>
        </div>
        <pre
          className="flex-1 overflow-auto p-4 text-[12px] leading-relaxed"
          style={{
            fontFamily: "var(--font-mono)",
            color: "var(--text-secondary)",
            whiteSpace: "pre-wrap",
            wordBreak: "break-all",
          }}
        >
          {textContent.slice(0, 20000)}
        </pre>
      </div>
    );
  }

  const placeholders: Record<string, { icon: React.ReactNode; title: string; sub: string }> = {
    pdf: {
      title: "PDF 预览功能即将到来",
      sub: "点击上方按钮使用系统默认程序查看",
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f85149" strokeWidth="1.5">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      ),
    },
    image: {
      title: "图片预览功能即将到来",
      sub: "点击上方按钮使用系统默认程序查看",
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#a371f7" strokeWidth="1.5">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
      ),
    },
  };

  const p = placeholders[file.file_type] ?? {
    title: "该文件类型暂不支持内置预览",
    sub: "点击上方按钮使用系统默认程序查看",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
    ),
  };

  return (
    <div className="flex flex-col items-center justify-center flex-1 rounded-xl border" style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}>
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)" }}>
        {p.icon}
      </div>
      <p className="text-[13px] font-medium mb-1" style={{ color: "var(--text-secondary)" }}>{p.title}</p>
      <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>{p.sub}</p>
    </div>
  );
}
