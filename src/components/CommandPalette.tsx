import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";

export type CommandItem = {
  id: string;
  label: string;
  detail: string;
  shortcut?: string;
  disabled?: boolean;
  kind?: "file" | "tab" | "workspace" | "system" | "recent";
  keywords?: string[];
  run: () => void;
};

interface Props {
  open: boolean;
  commands: CommandItem[];
  onClose: () => void;
}

export default function CommandPalette({ open, commands, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  const filtered = useMemo(() => {
    const tokens = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
    if (!tokens.length) return commands;
    return commands.filter((command) => {
      const haystack = [command.label, command.detail, command.shortcut, command.kind, ...(command.keywords ?? [])].filter(Boolean).join(" ").toLocaleLowerCase();
      return tokens.every((token) => haystack.includes(token));
    });
  }, [commands, query]);

  useEffect(() => {
    if (!open) return;
    previousFocus.current = document.activeElement as HTMLElement;
    setQuery("");
    setSelected(0);
    requestAnimationFrame(() => inputRef.current?.focus());
    return () => previousFocus.current?.focus();
  }, [open]);

  useEffect(() => {
    setSelected((value) => Math.min(value, Math.max(0, filtered.length - 1)));
  }, [filtered.length]);

  if (!open) return null;

  const execute = (command: CommandItem | undefined) => {
    if (!command || command.disabled) return;
    onClose();
    command.run();
  };

  const moveSelection = (direction: 1 | -1) => {
    if (!filtered.length) return;
    setSelected((value) => {
      for (let step = 1; step <= filtered.length; step += 1) {
        const next = (value + direction * step + filtered.length) % filtered.length;
        if (!filtered[next]?.disabled) return next;
      }
      return value;
    });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape") onClose();
    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveSelection(1);
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      moveSelection(-1);
    }
    if (event.key === "Enter") {
      event.preventDefault();
      execute(filtered[selected]);
    }
    if (event.key === "Tab") {
      const focusable = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('input,button:not(:disabled)'));
      if (!focusable.length) return;
      const current = focusable.indexOf(document.activeElement as HTMLElement);
      const next = event.shiftKey ? (current - 1 + focusable.length) % focusable.length : (current + 1) % focusable.length;
      event.preventDefault();
      focusable[next].focus();
    }
  };

  return (
    <div className="command-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="command-palette" role="dialog" aria-modal="true" aria-label="命令面板" onKeyDown={handleKeyDown}>
        <label className="command-search">
          <span aria-hidden="true">›_</span>
          <span className="sr-only">搜索命令</span>
          <input ref={inputRef} value={query} onChange={(event) => { setQuery(event.target.value); setSelected(0); }} placeholder="输入命令、文件名或快捷键…" autoComplete="off" />
        </label>
        <div className="command-list" role="listbox" aria-label="可用命令">
          {filtered.length ? filtered.map((command, index) => (
            <button type="button" role="option" aria-selected={index === selected} key={command.id} disabled={command.disabled} className={index === selected ? "is-selected" : ""} onMouseEnter={() => setSelected(index)} onClick={() => execute(command)}>
              <span>
                <strong>{command.label}</strong>
                <small>{command.detail}</small>
              </span>
              <em>{command.kind ?? "command"}</em>
              {command.shortcut && <kbd>{command.shortcut}</kbd>}
            </button>
          )) : <div className="command-empty">没有匹配命令</div>}
        </div>
        <footer><span>{filtered.length} / {commands.length} 项</span><span>↑↓ 选择</span><span>Enter 执行</span><span>Esc 关闭</span></footer>
      </section>
    </div>
  );
}
