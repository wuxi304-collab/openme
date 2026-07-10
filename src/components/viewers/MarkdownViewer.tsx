import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { marked } from "marked";
import { useI18n } from "../../i18n";
import { useSettings } from "../../settings";
import "./markdown-viewer.css";

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

interface SelectionEdit {
  value: string;
  selectionStart: number;
  selectionEnd: number;
}

// Wrap the textarea selection (or insert at the caret) with the given
// before/after markers. When no text is selected, falls back to a
// placeholder so the user can see what was inserted and continue typing.
function applyWrap(
  textarea: HTMLTextAreaElement,
  before: string,
  after: string = before,
  placeholder: string = "",
): SelectionEdit {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const value = textarea.value;
  const selected = value.slice(start, end) || placeholder;
  const next = value.slice(0, start) + before + selected + after + value.slice(end);
  return {
    value: next,
    selectionStart: start + before.length,
    selectionEnd: start + before.length + selected.length,
  };
}

// Prefix each line in the current selection with the given string. If no
// selection, prefix the current line. Used by the heading + list buttons.
function applyPrefixLines(textarea: HTMLTextAreaElement, prefix: string): SelectionEdit {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const value = textarea.value;
  const lineStart = value.lastIndexOf("\n", start - 1) + 1;
  const lineEndIdx = value.indexOf("\n", end);
  const lineEnd = lineEndIdx === -1 ? value.length : lineEndIdx;
  const block = value.slice(lineStart, lineEnd);
  const prefixed = block
    .split("\n")
    .map((line) => (line.startsWith(prefix) ? line : prefix + line))
    .join("\n");
  const next = value.slice(0, lineStart) + prefixed + value.slice(lineEnd);
  return { value: next, selectionStart: lineStart, selectionEnd: lineStart + prefixed.length };
}

export default function MarkdownViewer({ content, onChange }: Props) {
  const { t, tf } = useI18n();
  const { settings } = useSettings();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = useState(content);
  const pendingSelection = useRef<{ start: number; end: number } | null>(null);
  const [mode, setMode] = useState<ViewMode>("split");
  const [copyState, setCopyState] = useState<"html" | null>(null);
  const copyTimer = useRef<number | null>(null);

  const html = useMemo(() => {
    try {
      return marked.parse(value) as string;
    } catch {
      return `<p style='color:var(--error)'>${t("mdRenderError")}</p>`;
    }
  }, [value, t]);

  const stats = useMemo(() => {
    const trimmed = value.trim();
    const words = trimmed === "" ? 0 : trimmed.split(/\s+/).length;
    return { words, chars: value.length };
  }, [value]);

  // Run an action that mutates the textarea selection, then re-render the
  // surrounding text by updating React state. We restore the new caret /
  // selection after React commits the new value to the DOM.
  const applyEdit = useCallback(
    (action: (ta: HTMLTextAreaElement) => SelectionEdit) => {
      const ta = textareaRef.current;
      if (!ta) return;
      const result = action(ta);
      pendingSelection.current = {
        start: result.selectionStart,
        end: result.selectionEnd,
      };
      setValue(result.value);
      onChange?.(result.value);
    },
    [onChange],
  );

  // Whenever value changes (including after a toolbar action), restore the
    // selection that the action recorded. Using useLayoutEffect keeps the
    // selection in sync before the browser paints and avoids cross-test RAF
    // bleed-through in jsdom.
    useLayoutEffect(() => {
      const sel = pendingSelection.current;
      const ta = textareaRef.current;
      if (!sel || !ta) return;
      pendingSelection.current = null;
      ta.focus();
      ta.setSelectionRange(sel.start, sel.end);
    }, [value]);

  const handleWrap = useCallback(
    (before: string, after: string, placeholder: string) => () =>
      applyEdit((ta) => applyWrap(ta, before, after, placeholder)),
    [applyEdit],
  );

  const handleHeading = useCallback(
    (level: number) => () => applyEdit((ta) => applyPrefixLines(ta, "#".repeat(level) + " ")),
    [applyEdit],
  );

  const handleLink = useCallback(() => {
      const ta = textareaRef.current;
      if (!ta) return;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const v = ta.value;
      const selected = v.slice(start, end) || "link text";
      const inserted = `[${selected}](https://)`;
      const next = v.slice(0, start) + inserted + v.slice(end);
      const urlStart = start + selected.length + 3;
      const urlEnd = urlStart + "https://".length;
      pendingSelection.current = { start: urlStart, end: urlEnd };
      setValue(next);
      onChange?.(next);
    }, [onChange]);

  const handleList = useCallback(
    (prefix: string) => () => applyEdit((ta) => applyPrefixLines(ta, prefix)),
    [applyEdit],
  );

  const handleCopyHtml = useCallback(async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(html);
      } else {
        const ta = document.createElement("textarea");
        ta.value = html;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopyState("html");
      if (copyTimer.current !== null) window.clearTimeout(copyTimer.current);
      copyTimer.current = window.setTimeout(() => {
        setCopyState(null);
        copyTimer.current = null;
      }, 1400);
    } catch {
      // Silent: button label does not change so the user can retry.
    }
  }, [html]);

  // Keyboard shortcuts: Ctrl/Cmd + B / I / K.
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return undefined;
    const handler = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      const key = event.key.toLowerCase();
      if (key === "b") { event.preventDefault(); handleWrap("**", "**", "bold text")(); }
      else if (key === "i") { event.preventDefault(); handleWrap("*", "*", "italic text")(); }
      else if (key === "k") { event.preventDefault(); handleLink(); }
    };
    ta.addEventListener("keydown", handler);
    return () => ta.removeEventListener("keydown", handler);
  }, [handleWrap, handleLink]);

  useEffect(() => () => {
    if (copyTimer.current !== null) window.clearTimeout(copyTimer.current);
  }, []);

  const previewSrcDoc = useMemo(
    () =>
      `<!doctype html><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'"><style>body{margin:0;padding:4px 8px;color:#263238;font:14px/1.7 system-ui,sans-serif;overflow-wrap:anywhere}pre,code{font-family:Consolas,monospace}pre{padding:12px;background:#f3f1ea;border-radius:8px;overflow:auto}img{max-width:100%}table{border-collapse:collapse}th,td{border:1px solid #ddd;padding:5px 8px}a{color:#1565c0}</style>${html}`,
    [html],
  );

  return (
    <div className="md-viewer">
      <div className="md-toolbar" role="toolbar" aria-label={t("mdToolbarAria")}>
        <div className="md-toolbar-group" role="group" aria-label={t("mdToolbarAria")}>
          <button
            type="button"
            className="md-toolbar-btn"
            aria-label={t("mdToolbarBoldAria")}
            title={t("mdToolbarBoldAria")}
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleWrap("**", "**", "bold text")}
          >
            <strong>B</strong>
          </button>
          <button
            type="button"
            className="md-toolbar-btn"
            aria-label={t("mdToolbarItalicAria")}
            title={t("mdToolbarItalicAria")}
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleWrap("*", "*", "italic text")}
          >
            <em>I</em>
          </button>
          <button
            type="button"
            className="md-toolbar-btn"
            aria-label={t("mdToolbarStrikethroughAria")}
            title={t("mdToolbarStrikethroughAria")}
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleWrap("~~", "~~", "strikethrough")}
          >
            <s>S</s>
          </button>
          <span className="md-toolbar-sep" aria-hidden="true" />
          <button
            type="button"
            className="md-toolbar-btn"
            aria-label={t("mdToolbarHeading1")}
            title={t("mdToolbarHeading1")}
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleHeading(1)}
          >
            H1
          </button>
          <button
            type="button"
            className="md-toolbar-btn"
            aria-label={t("mdToolbarHeading2")}
            title={t("mdToolbarHeading2")}
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleHeading(2)}
          >
            H2
          </button>
          <button
            type="button"
            className="md-toolbar-btn"
            aria-label={t("mdToolbarHeading3")}
            title={t("mdToolbarHeading3")}
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleHeading(3)}
          >
            H3
          </button>
          <span className="md-toolbar-sep" aria-hidden="true" />
          <button
            type="button"
            className="md-toolbar-btn"
            aria-label={t("mdToolbarLinkAria")}
            title={t("mdToolbarLinkAria")}
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleLink}
          >
            🔗
          </button>
          <button
            type="button"
            className="md-toolbar-btn"
            aria-label={t("mdToolbarInlineCode")}
            title={t("mdToolbarInlineCode")}
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleWrap("`", "`", "code")}
          >
            {"</>"}
          </button>
          <button
            type="button"
            className="md-toolbar-btn"
            aria-label={t("mdToolbarCodeBlock")}
            title={t("mdToolbarCodeBlock")}
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleWrap("\n```\n", "\n```\n", "code block")}
          >
            {"{ }"}
          </button>
          <span className="md-toolbar-sep" aria-hidden="true" />
          <button
            type="button"
            className="md-toolbar-btn"
            aria-label={t("mdToolbarBulletList")}
            title={t("mdToolbarBulletList")}
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleList("- ")}
          >
            •
          </button>
          <button
            type="button"
            className="md-toolbar-btn"
            aria-label={t("mdToolbarNumberedList")}
            title={t("mdToolbarNumberedList")}
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleList("1. ")}
          >
            1.
          </button>
          <button
            type="button"
            className="md-toolbar-btn"
            aria-label={t("mdToolbarQuote")}
            title={t("mdToolbarQuote")}
            onMouseDown={(e) => e.preventDefault()}
                      onClick={handleWrap("> ", "", "quote")}
          >
            ❝
          </button>
        </div>
        <span className="md-toolbar-stats" aria-live="polite">
          {tf("mdToolbarStats", { words: stats.words, chars: stats.chars })}
        </span>
        <div className="md-toolbar-actions">
          <button
            type="button"
            className={`md-toolbar-btn md-toolbar-copy${copyState === "html" ? " is-copied" : ""}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleCopyHtml}
            aria-live="polite"
          >
            {copyState === "html" ? t("mdToolbarCopyHtmlCopied") : t("mdToolbarCopyHtml")}
          </button>
          <span className="md-toolbar-sep" aria-hidden="true" />
          {(["edit", "split", "preview"] as ViewMode[]).map((m) => (
            <button
              key={m}
              type="button"
              className={`md-mode-btn${mode === m ? " is-active" : ""}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setMode(m)}
              aria-pressed={mode === m}
            >
              {t(MODE_LABEL_KEYS[m])}
            </button>
          ))}
        </div>
      </div>
      <div className="md-stage">
        {(mode === "edit" || mode === "split") && (
          <div className={mode === "split" ? "md-pane md-pane-split" : "md-pane md-pane-edit"}>
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                onChange?.(e.target.value);
              }}
              className="md-textarea"
              wrap={settings.wordWrap === "off" ? "off" : "soft"}
              spellCheck={false}
              aria-label={t("mdPreviewFrameTitle")}
            />
          </div>
        )}
        {(mode === "preview" || mode === "split") && (
          <div className={mode === "split" ? "md-pane md-pane-preview md-pane-split" : "md-pane md-pane-preview"}>
            <iframe
              className="markdown-preview-frame"
              title={t("mdPreviewFrameTitle")}
              sandbox=""
              srcDoc={previewSrcDoc}
            />
          </div>
        )}
      </div>
    </div>
  );
}