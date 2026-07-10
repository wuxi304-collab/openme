import Editor, { OnMount } from "@monaco-editor/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "../../i18n";
import { useSettings } from "../../settings";
import "./CodeEditor.css";

interface Props {
  content: string;
  language: string;
  onChange?: (v: string) => void;
}

interface CursorState {
  ln: number;
  col: number;
}

type EolKind = "lf" | "crlf" | "cr" | "mixed" | "none";

// Heuristic line-ending detection. Scans up to 64 KiB of the file (the first
// chunk most editors sample) and tallies LF, CRLF and lone CR. If only one
// kind appears it's reported verbatim; if two or more appear we mark it
// "mixed" because that almost always indicates a file that was concatenated
// across platforms (or one with intentional Mac-style CR endings + a stray
// Windows paste).
function detectEol(content: string): EolKind {
  if (!content) return "none";
  const sample = content.slice(0, 64 * 1024);
  let crlf = 0;
  let lf = 0;
  let cr = 0;
  for (let i = 0; i < sample.length; i++) {
    const ch = sample.charCodeAt(i);
    if (ch === 13) {
      if (sample.charCodeAt(i + 1) === 10) { crlf++; i++; }
      else { cr++; }
    } else if (ch === 10) {
      lf++;
    }
  }
  const total = crlf + lf + cr;
  if (total === 0) return "none";
  if (crlf > 0 && (lf > 0 || cr > 0)) return "mixed";
  if (lf > 0 && cr > 0) return "mixed";
  if (crlf === total) return "crlf";
  if (cr === total) return "cr";
  return "lf";
}

const LANG_MAP: Record<string, string> = {
  javascript: "javascript", js: "javascript",
  typescript: "typescript", ts: "typescript", tsx: "typescript", jsx: "javascript",
  python: "python", py: "python",
  rust: "rust", rs: "rust",
  go: "go",
  java: "java",
  cpp: "cpp", cxx: "cpp", cc: "cpp",
  c: "c", h: "c",
  html: "html", htm: "html", xml: "xml", svg: "xml",
  json: "json",
  yaml: "yaml", yml: "yaml",
  css: "css", scss: "css", less: "css",
  sql: "sql",
  bash: "shell", sh: "shell", zsh: "shell",
  batch: "bat", bat: "bat", cmd: "bat",
  ps1: "powershell", powershell: "powershell",
  markdown: "markdown", md: "markdown",
  ini: "ini", toml: "ini", conf: "ini",
  plaintext: "plaintext", text: "plaintext", txt: "plaintext",
};

export default function CodeEditor({ content, language, onChange }: Props) {
  const { t, tf } = useI18n();
  const { settings, update } = useSettings();
  const [value, setValue] = useState(content);
  const [cursor, setCursor] = useState<CursorState>({ ln: 1, col: 1 });
  const editorRef = useRef<unknown>(null);

  // Keep local state in sync if the parent reloads the file (e.g. after save).
  useEffect(() => { setValue(content); }, [content]);

  const isDirty = value !== content;

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

    editor.onDidChangeCursorPosition((e: { position: { lineNumber: number; column: number } }) => {
      setCursor({ ln: e.position.lineNumber, col: e.position.column });
    });
  };

  const handleChange = (v: string | undefined) => {
    const newVal = v ?? "";
    setValue(newVal);
    onChange?.(newVal);
  };

  const totalLines = useMemo(
    () => (value === "" ? 0 : value.split("\n").length),
    [value],
  );
  const charCount = value.length;

  const eolKind = useMemo(() => detectEol(value), [value]);
  const eolLabel = useMemo(() => {
    switch (eolKind) {
      case "lf":    return t("codeEditorEolLF");
      case "crlf":  return t("codeEditorEolCRLF");
      case "cr":    return t("codeEditorEolCR");
      case "mixed": return t("codeEditorEolMixed");
      default:      return "—";
    }
  }, [eolKind, t]);

  const toggleWrap = useCallback(() => {
    update("wordWrap", settings.wordWrap === "on" ? "off" : "on");
  }, [settings.wordWrap, update]);

  const toggleLineNumbers = useCallback(() => {
    update("lineNumbers", settings.lineNumbers === "on" ? "off" : "on");
  }, [settings.lineNumbers, update]);

  const resetEditorSettings = useCallback(() => {
    update("wordWrap", "off");
    update("lineNumbers", "on");
  }, [update]);

  const mapLang = (l: string) => LANG_MAP[l] ?? "plaintext";

  return (
    <div
      className="flex flex-col h-full overflow-hidden code-editor"
      style={{ borderRadius: 16, overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.1)" }}
    >
      <div className="viewer-header">
        <span className="viewer-label">{t("codeEditorLabel")}</span>
        {isDirty && (
          <span
            className="code-editor-dirty-badge"
            role="status"
            aria-label={t("codeEditorDirty")}
            title={t("codeEditorDirty")}
          >●</span>
        )}
        <span className="viewer-badge">{language.toUpperCase()}</span>
      </div>

      <div
        className="code-editor-toolbar"
        role="toolbar"
        aria-label={t("codeEditorToolbarAria")}
      >
        <button
          type="button"
          className={`code-editor-toolbar-btn${settings.wordWrap === "on" ? " is-active" : ""}`}
          onClick={toggleWrap}
          aria-label={t("codeEditorToggleWrapAria")}
          aria-pressed={settings.wordWrap === "on"}
        >
          <span aria-hidden="true">{t("codeEditorToggleWrap")}</span>
        </button>
        <button
          type="button"
          className={`code-editor-toolbar-btn${settings.lineNumbers === "on" ? " is-active" : ""}`}
          onClick={toggleLineNumbers}
          aria-label={t("codeEditorToggleLineNumbersAria")}
          aria-pressed={settings.lineNumbers === "on"}
        >
          <span aria-hidden="true">{t("codeEditorToggleLineNumbers")}</span>
        </button>
        <button
          type="button"
          className="code-editor-toolbar-btn code-editor-toolbar-btn-ghost"
          onClick={resetEditorSettings}
          aria-label={t("codeEditorResetAria")}
        >
          <span aria-hidden="true">{t("codeEditorReset")}</span>
        </button>
        <span className="code-editor-toolbar-hint" aria-hidden="true">
          {t("codeEditorKeyboardHint")}
        </span>
      </div>

      <div
        className="flex-1 min-h-0"
        aria-label={tf("codeEditorEditorAria", { language: language.toUpperCase() })}
      >
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

      <div className="code-editor-footer" aria-hidden="true">
        <span className="code-editor-footer-cell">{tf("codeEditorFooterLnCol", { ln: cursor.ln, col: cursor.col })}</span>
        <span className="code-editor-footer-sep">·</span>
        <span className="code-editor-footer-cell">{tf("codeEditorFooterTotalLines", { n: totalLines })}</span>
        <span className="code-editor-footer-sep">·</span>
        <span className="code-editor-footer-cell">{tf("codeEditorFooterChars", { n: charCount })}</span>
        <span className="code-editor-footer-sep">·</span>
        <span className="code-editor-footer-cell">{tf("codeEditorFooterLineEnding", { eol: eolLabel })}</span>
      </div>
    </div>
  );
}