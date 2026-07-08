import Editor, { OnMount } from "@monaco-editor/react";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "../../i18n";
import { useSettings } from "../../settings";

interface Props {
  content: string;
  language: string;
  onChange?: (v: string) => void;
}

export default function CodeEditor({ content, language, onChange }: Props) {
  const { t } = useI18n();
  const { settings } = useSettings();
  const [value, setValue] = useState(content);
  const editorRef = useRef<any>(null);

  useEffect(() => { setValue(content); }, [content]);

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monaco.editor.defineTheme("openme-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "comment",  foreground: "8B6BAE", fontStyle: "italic" },
        { token: "keyword",  foreground: "E52521" },
        { token: "string",   foreground: "43B047" },
        { token: "number",   foreground: "FBD000" },
        { token: "type",     foreground: "009AC7" },
        { token: "function", foreground: "5C94FC" },
      ],
      colors: {
        "editor.background":                 "#0F1B2D",
        "editor.foreground":                 "#E8EDF2",
        "editorLineNumber.foreground":       "#3D5A73",
        "editorLineNumber.activeForeground": "#FDD835",
        "editor.lineHighlightBackground":    "#162032",
        "editorCursor.foreground":           "#FDD835",
        "editor.selectionBackground":        "#FDD83530",
        "editor.inactiveSelectionBackground":"#FDD83518",
        "scrollbarSlider.background":        "#1E3448",
        "scrollbarSlider.hoverBackground":   "#FDD83550",
        "scrollbarSlider.activeBackground":  "#FDD83580",
      },
    });
    monaco.editor.setTheme("openme-dark");
  };

  const handleChange = (v: string | undefined) => {
    const newVal = v ?? "";
    setValue(newVal);
    onChange?.(newVal);
  };

  const mapLang = (l: string) => {
    const m: Record<string, string> = {
      javascript: "javascript", js: "javascript", typescript: "typescript", ts: "typescript",
      python: "python", py: "python", rust: "rust", go: "go", java: "java",
      cpp: "cpp", c: "c", html: "html", xml: "xml", json: "json",
      yaml: "yaml", yml: "yaml", css: "css", sql: "sql",
      bash: "shell", sh: "shell", batch: "bat", ps1: "powershell",
      markdown: "markdown", md: "markdown", ini: "ini", plaintext: "plaintext",
    };
    return m[l] ?? "plaintext";
  };

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ borderRadius: 16, overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.1)" }}>
      <div className="viewer-header">
          <span className="viewer-label">{t("codeEditorLabel")}</span>
        <span className="viewer-badge">{language.toUpperCase()}</span>
      </div>
      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          language={mapLang(language)}
          value={value}
          onChange={handleChange}
          onMount={handleMount}
          theme="openme-dark"
          options={{
            fontSize: 13,
            fontFamily: "'JetBrains Mono', 'Cascadia Code', 'Fira Code', Consolas, monospace",
            fontLigatures: true,
            lineHeight: 21,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            renderLineHighlight: "line",
            cursorBlinking: "smooth",
            cursorSmoothCaretAnimation: "on",
            smoothScrolling: true,
            tabSize: settings.tabSize,
            insertSpaces: true,
            wordWrap: settings.wordWrap,
            lineNumbers: settings.lineNumbers,
            automaticLayout: true,
            overviewRulerLanes: 0,
            hideCursorInOverviewRuler: true,
            scrollbar: { verticalScrollbarSize: 6, horizontalScrollbarSize: 6 },
            contextmenu: true,
            folding: true,
            foldingHighlight: false,
            bracketPairColorization: { enabled: true },
          }}
          loading={
            <div className="flex items-center justify-center h-full" style={{ background: "#0d1117" }}>
              <span className="text-[12px]" style={{ color: "var(--text-muted)" }}>{t("codeEditorLoading")}</span>
            </div>
          }
        />
      </div>
    </div>
  );
}

