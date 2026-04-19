import { useEffect, useMemo, useState } from "react";
import {
  INITIAL_PHASES,
  type Finding,
  type PhaseEvent,
  type PhaseState,
} from "./lib/state";
import { PhaseIndicator } from "./components/PhaseIndicator";
import { FindingsList } from "./components/FindingsList";
import { TerminalView } from "./components/TerminalView";
import { ReportView } from "./components/ReportView";
import {
  IconPlay,
  IconStop,
  IconRefresh,
  IconTerminal,
  IconReport,
  IconList,
  IconChip,
} from "./components/icons";

type McpStatus = "idle" | "starting" | "ready" | "error";

// Mock-mode default case. In real-mode these become user-selectable evidence
// paths (not yet wired — single source of truth so Yasmine/Khalid can repoint).
const DEFAULT_CASE = {
  memoryImage: "/evidence/mock/memory.dmp",
  diskEvidence: "/evidence/mock/disk.E01",
  eventLogPath: "/evidence/mock/evtx",
};

export function App() {
  const [status, setStatus] = useState<McpStatus>("idle");
  const [tools, setTools] = useState<Array<{ name: string; description?: string }>>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [phases, setPhases] = useState<PhaseState[]>(INITIAL_PHASES);
  const [diag, setDiag] = useState<string[]>([]);
  const [triageRunning, setTriageRunning] = useState(false);

  const bridge = typeof window !== "undefined" ? window.forensicAI : undefined;

  useEffect(() => {
    if (!bridge) {
      setDiag((prev) => [
        ...prev,
        "[ui] window.forensicAI is undefined — preload failed to load",
      ]);
      return;
    }
    const off1 = bridge.onStatusChange((s) => setStatus(s as McpStatus));
    const off2 = bridge.onDiagnostic((line) =>
      setDiag((prev) => [...prev.slice(-200), line]),
    );
    const off3 = bridge.onFinding((f: Finding) =>
      setFindings((prev) => [...prev, f]),
    );
    const off4 = bridge.onPhase((ev: PhaseEvent) =>
      setPhases((prev) =>
        prev.map((p) =>
          p.id === ev.phase
            ? {
                ...p,
                status: ev.status,
                iteration: ev.iteration,
                note: ev.note,
              }
            : p,
        ),
      ),
    );
    void bridge.status().then((s) => setStatus(s));
    return () => {
      off1();
      off2();
      off3();
      off4();
    };
  }, [bridge]);

  const startServer = async () => {
    if (!bridge) return;
    const res = await bridge.start({ mockMode: true });
    if (res.ok) {
      const list = await bridge.listTools();
      setTools(list);
    }
  };

  const stopServer = async () => {
    if (!bridge) return;
    await bridge.stop();
    setTools([]);
  };

  const runTriage = async () => {
    if (!bridge || triageRunning) return;
    setTriageRunning(true);
    setFindings([]);
    setPhases(INITIAL_PHASES);
    try {
      const res = await bridge.runTriage(DEFAULT_CASE);
      if (!res.ok) {
        setDiag((prev) => [
          ...prev.slice(-200),
          `[triage] failed: ${res.error ?? "unknown"}`,
        ]);
      }
    } finally {
      setTriageRunning(false);
    }
  };

  const runTool = async (name: string) => {
    if (!bridge) return;
    // Minimal argument sets per tool so manual exploration still works
    // without running the full triage loop.
    const argsByTool: Record<string, Record<string, unknown>> = {
      vol_pslist: { memoryImage: DEFAULT_CASE.memoryImage, offset: 0, limit: 50 },
      vol_netscan: { memoryImage: DEFAULT_CASE.memoryImage, offset: 0, limit: 50 },
      vol_malfind: { memoryImage: DEFAULT_CASE.memoryImage, offset: 0, limit: 50 },
      build_supertimeline: {
        evidencePath: DEFAULT_CASE.diskEvidence,
        offset: 0,
        limit: 200,
      },
      parse_event_logs: {
        evidencePath: DEFAULT_CASE.eventLogPath,
        offset: 0,
        limit: 200,
      },
    };
    const res = await bridge.callTool(name, argsByTool[name] ?? {});
    if (res.ok) {
      setDiag((prev) => [...prev.slice(-200), `[ui] ${name} ok`]);
    } else {
      setDiag((prev) => [
        ...prev.slice(-200),
        `[ui] ${name} error: ${res.error ?? "unknown"}`,
      ]);
    }
  };

  const statusDotClass = useMemo(() => {
    if (status === "ready") return "dot ready";
    if (status === "starting") return "dot starting";
    if (status === "error") return "dot error";
    return "dot";
  }, [status]);

  return (
    <div className="app">
      <header className="titlebar">
        <div className="brand">
          <span className="mark" aria-hidden="true" />
          <span>forensic-ai</span>
          <span className="meta">v0.1.0</span>
        </div>
        <div className="meta">
          {status === "ready"
            ? "mcp: ready"
            : status === "starting"
            ? "mcp: starting…"
            : status === "error"
            ? "mcp: error"
            : "mcp: idle"}
        </div>
      </header>

      <aside className="sidebar">
        <div className="section">
          <div className="section-header">
            <span>Triage</span>
            <button
              onClick={runTriage}
              disabled={status !== "ready" || triageRunning}
              style={{ padding: "2px 8px", fontSize: 11 }}
            >
              <span style={{ display: "inline-flex", verticalAlign: "-2px", marginRight: 4 }}>
                <IconChip />
              </span>
              {triageRunning ? "running…" : "run"}
            </button>
          </div>
          <div className="section-body">
            <PhaseIndicator phases={phases} />
          </div>
        </div>

        <div className="section">
          <div className="section-header">
            <span>MCP Server</span>
          </div>
          <div className="section-body" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button
              onClick={startServer}
              disabled={status === "ready" || status === "starting"}
            >
              <span style={{ display: "inline-flex", verticalAlign: "-2px", marginRight: 4 }}>
                <IconPlay />
              </span>
              start (mock)
            </button>
            <button onClick={stopServer} disabled={status !== "ready"}>
              <span style={{ display: "inline-flex", verticalAlign: "-2px", marginRight: 4 }}>
                <IconStop />
              </span>
              stop
            </button>
            <button
              onClick={async () => bridge && setTools(await bridge.listTools())}
              disabled={status !== "ready"}
            >
              <span style={{ display: "inline-flex", verticalAlign: "-2px", marginRight: 4 }}>
                <IconRefresh />
              </span>
              list tools
            </button>
          </div>
        </div>

        <div className="section" style={{ flex: 1, overflow: "auto" }}>
          <div className="section-header">
            <span>Tools</span>
            <span style={{ fontFamily: "var(--font-mono)" }}>{tools.length}</span>
          </div>
          {tools.length === 0 ? (
            <div className="empty">Start the MCP server to list tools.</div>
          ) : (
            tools.map((t) => (
              <button
                key={t.name}
                onClick={() => runTool(t.name)}
                style={{
                  all: "unset",
                  display: "block",
                  width: "100%",
                  cursor: "pointer",
                  padding: "8px 12px",
                  borderBottom: "1px solid var(--border-1)",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-2)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{t.name}</div>
                {t.description ? (
                  <div style={{ color: "var(--fg-2)", fontSize: 11, marginTop: 2 }}>
                    {t.description}
                  </div>
                ) : null}
              </button>
            ))
          )}
        </div>
      </aside>

      <main className="main">
        <section className="pane">
          <div className="pane-header">
            <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
              <IconTerminal />
              Agent Terminal
            </span>
            <span className="actions">
              <span style={{ color: "var(--fg-2)" }}>xterm</span>
            </span>
          </div>
          <div className="pane-body">
            <TerminalView
              onInput={(line) =>
                setDiag((prev) => [...prev.slice(-200), `[term] $ ${line}`])
              }
            />
          </div>
        </section>

        <section className="pane">
          <div className="pane-header">
            <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
              <IconReport />
              Report
            </span>
            <span className="actions">
              <span style={{ color: "var(--fg-2)" }}>
                {findings.length} finding{findings.length === 1 ? "" : "s"}
              </span>
            </span>
          </div>
          <div className="pane-body">
            <ReportView findings={findings} />
          </div>
        </section>
      </main>

      <aside className="inspector">
        <div className="section">
          <div className="section-header">
            <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
              <IconList />
              Findings
            </span>
            <span style={{ fontFamily: "var(--font-mono)" }}>{findings.length}</span>
          </div>
          <FindingsList findings={findings} />
        </div>
        <div
          className="section"
          style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}
        >
          <div className="section-header">
            <span>Diagnostics</span>
            <button onClick={() => setDiag([])} style={{ padding: "2px 6px", fontSize: 10 }}>
              clear
            </button>
          </div>
          <div className="diag" style={{ flex: 1, maxHeight: "none" }}>
            {diag.length === 0 ? (
              <span style={{ color: "var(--fg-3)" }}>No output.</span>
            ) : (
              diag.map((line, i) => (
                <div key={i} className={line.includes("error") ? "err" : "line"}>
                  {line}
                </div>
              ))
            )}
          </div>
        </div>
      </aside>

      <footer className="statusbar">
        <div className="left">
          <span className={statusDotClass} aria-hidden="true" />
          <span>mcp {status}</span>
          <span>·</span>
          <span>tools {tools.length}</span>
          <span>·</span>
          <span>findings {findings.length}</span>
          <span>·</span>
          <span>
            phase{" "}
            {phases.find((p) => p.status === "active")?.id ??
              (phases.every((p) => p.status === "done") ? 5 : "—")}
          </span>
        </div>
        <div className="right">
          <span>electron + vite</span>
          <span>·</span>
          <span>forensic-ai/0.1.0</span>
        </div>
      </footer>
    </div>
  );
}
