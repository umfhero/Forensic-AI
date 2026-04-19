import { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";

interface Props {
  onInput?: (data: string) => void;
  onReady?: (term: Terminal) => void;
}

/**
 * Embedded xterm terminal. The outer pane sets the host dimensions;
 * we use FitAddon to snap rows/cols to the container on mount and resize.
 *
 * For now this is a display-only terminal: input is emitted upward via onInput
 * so the app can route it through the AI agent (and/or the MCP server).
 * Wiring to a real PTY / agent happens in a follow-up step.
 */
export function TerminalView({ onInput, onReady }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);

  useEffect(() => {
    if (!hostRef.current) return;

    const term = new Terminal({
      fontFamily:
        "'JetBrains Mono', 'IBM Plex Mono', Menlo, Consolas, 'Liberation Mono', monospace",
      fontSize: 12,
      lineHeight: 1.25,
      cursorStyle: "block",
      cursorBlink: false,
      allowProposedApi: true,
      theme: {
        background: "#1a1a1a",
        foreground: "#e6e6e6",
        cursor: "#e6e6e6",
        selectionBackground: "#333333",
        black: "#0e0e0e",
        red: "#c77d7d",
        green: "#8fbf7f",
        yellow: "#d4b266",
        blue: "#7fa8c9",
        magenta: "#a58fbf",
        cyan: "#7fbfb4",
        white: "#b3b3b3",
        brightBlack: "#4d4d4d",
        brightRed: "#d49898",
        brightGreen: "#a8cf9b",
        brightYellow: "#dfc488",
        brightBlue: "#9ec0d4",
        brightMagenta: "#b9a8cf",
        brightCyan: "#9acfc4",
        brightWhite: "#e6e6e6",
      },
    });

    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(hostRef.current);
    try {
      fit.fit();
    } catch {
      // ignore initial fit race
    }
    termRef.current = term;
    onReady?.(term);

    term.writeln("\x1b[2mforensic-ai desktop — local agent terminal\x1b[0m");
    term.writeln("\x1b[2mtype a command or invoke an mcp tool from the sidebar\x1b[0m");
    term.write("\r\n$ ");

    let line = "";
    const onData = term.onData((data) => {
      for (const ch of data) {
        if (ch === "\r") {
          term.write("\r\n");
          if (line.trim().length > 0) onInput?.(line);
          line = "";
          term.write("$ ");
        } else if (ch === "\u007f") {
          if (line.length > 0) {
            line = line.slice(0, -1);
            term.write("\b \b");
          }
        } else {
          line += ch;
          term.write(ch);
        }
      }
    });

    const ro = new ResizeObserver(() => {
      try {
        fit.fit();
      } catch {
        // ignore
      }
    });
    ro.observe(hostRef.current);

    return () => {
      onData.dispose();
      ro.disconnect();
      term.dispose();
      termRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={hostRef} className="terminal-host" />;
}
