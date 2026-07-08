import { useEffect, useState } from "react";
import { marked } from "marked";
import { useI18n } from "../../i18n";
import { useSettings } from "../../settings";

marked.setOptions({ breaks: true, gfm: true });

interface Props {
  content: string;
  onChange?: (v: string) => void;
}

type ViewMode = "split" | "edit" | "preview";

const MODE_LABEL_KEYS: Record<ViewMode, string> = {
  edit: "mdModeEdit",
  split: "mdModeSplit",
  preview: "mdModePreview",
};

export default function MarkdownViewer({ content, onChange }: Props) {
  const { t } = useI18n();
  const { settings } = useSettings();
  const [value, setValue] = useState(content);
  const [mode, setMode] = useState<ViewMode>("split");

  useEffect(() => { setValue(content); }, [content]);

  const html = (() => {
    try { return marked.parse(value) as string; }
    catch { return `<p style='color:var(--error)'>${t("mdRenderError")}</p>`; }
  })();

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ borderRadius: 16, overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.1)", background: "#fff" }}>
      <div className="viewer-header">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#E52521" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          <span className="viewer-label">Markdown</span>
        </div>
        <div className="flex items-center gap-1.5">
          {(["edit", "split", "preview"] as ViewMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                fontFamily: "'Nunito', sans-serif",
                fontWeight: 700,
                fontSize: 11,
                padding: "4px 12px",
                borderRadius: 50,
                background: mode === m
                  ? "linear-gradient(135deg, #FF5252, #E52521)"
                  : "transparent",
                color: mode === m ? "#fff" : "#90A4AE",
                border: mode === m ? "none" : "1.5px solid rgba(0,0,0,0.1)",
                cursor: "pointer",
                boxShadow: mode === m ? "0 2px 8px rgba(229,37,33,0.3)" : "none",
                transition: "transform var(--dur-press) var(--ease-out), color var(--dur-fast) var(--ease-out), background-color var(--dur-fast) var(--ease-out)",
              }}
            >
              {t(MODE_LABEL_KEYS[m])}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-1 overflow-hidden">
        {(mode === "edit" || mode === "split") && (
          <div className={mode === "split" ? "flex-1 border-r" : "flex-1"} style={{ borderColor: "rgba(0,0,0,0.06)" }}>
            <textarea
              value={value}
              onChange={(e) => { setValue(e.target.value); onChange?.(e.target.value); }}
              className="w-full h-full p-4 resize-none outline-none bg-transparent"
              style={{ color: "#455A64", fontFamily: "var(--font-mono)", fontSize: "13px", lineHeight: "1.7" }}
              wrap={settings.wordWrap === "off" ? "off" : "soft"}
              spellCheck={false}
            />
          </div>
        )}
        {(mode === "preview" || mode === "split") && (
          <div className="flex-1 overflow-auto p-5" style={{ fontFamily: "var(--font-sans)" }}>
            <iframe className="markdown-preview-frame" title={t("mdPreviewFrameTitle")} sandbox="" srcDoc={`<!doctype html><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'"><style>body{margin:0;padding:4px 8px;color:#263238;font:14px/1.7 system-ui,sans-serif;overflow-wrap:anywhere}pre,code{font-family:Consolas,monospace}pre{padding:12px;background:#f3f1ea;border-radius:8px;overflow:auto}img{max-width:100%}table{border-collapse:collapse}th,td{border:1px solid #ddd;padding:5px 8px}a{color:#1565c0}</style>${html}`} />
          </div>
        )}
      </div>
    </div>
  );
}

