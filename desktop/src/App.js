import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { INITIAL_PHASES } from "./lib/state.js";
import { PhaseIndicator } from "./components/PhaseIndicator.js";
import { FindingsList } from "./components/FindingsList.js";
import { TerminalView } from "./components/TerminalView.js";
import { ReportView } from "./components/ReportView.js";
import { IconPlay, IconStop, IconRefresh, IconTerminal, IconReport, IconList } from "./components/icons.js";
export function App() {
    const [status, setStatus] = useState("idle");
    const [tools, setTools] = useState([]);
    const [findings, setFindings] = useState([]);
    const [phases] = useState(INITIAL_PHASES);
    const [diag, setDiag] = useState([]);
    useEffect(() => {
        const off1 = window.forensicAI.onStatusChange((s) => setStatus(s));
        const off2 = window.forensicAI.onDiagnostic((line) => setDiag((prev) => [...prev.slice(-200), line]));
        void window.forensicAI.status().then((s) => setStatus(s));
        return () => {
            off1();
            off2();
        };
    }, []);
    const startServer = async () => {
        const res = await window.forensicAI.start({ mockMode: true });
        if (res.ok) {
            const list = await window.forensicAI.listTools();
            setTools(list);
        }
    };
    const stopServer = async () => {
        await window.forensicAI.stop();
        setTools([]);
    };
    const runTool = async (name) => {
        const res = await window.forensicAI.callTool(name, {
            memoryImage: "/evidence/mock.dmp",
            offset: 0,
            limit: 50,
        });
        if (res.ok && res.result) {
            const now = new Date().toISOString();
            setFindings((prev) => [
                ...prev,
                {
                    id: `${name}-${Date.now()}`,
                    title: `${name} executed`,
                    confidence: "inferred",
                    source: name,
                    timestamp: now,
                    detail: "Mock result received. Structured output returned by the MCP server.",
                },
            ]);
            setDiag((prev) => [...prev.slice(-200), `[ui] ${name} ok`]);
        }
        else {
            setDiag((prev) => [...prev.slice(-200), `[ui] ${name} error: ${res.error ?? "unknown"}`]);
        }
    };
    const statusDotClass = useMemo(() => {
        if (status === "ready")
            return "dot ready";
        if (status === "starting")
            return "dot starting";
        if (status === "error")
            return "dot error";
        return "dot";
    }, [status]);
    return (_jsxs("div", { className: "app", children: [_jsxs("header", { className: "titlebar", children: [_jsxs("div", { className: "brand", children: [_jsx("span", { className: "mark", "aria-hidden": "true" }), _jsx("span", { children: "forensic-ai" }), _jsx("span", { className: "meta", children: "v0.1.0" })] }), _jsx("div", { className: "meta", children: status === "ready" ? "mcp: ready" : status === "starting" ? "mcp: starting…" : status === "error" ? "mcp: error" : "mcp: idle" })] }), _jsxs("aside", { className: "sidebar", children: [_jsxs("div", { className: "section", children: [_jsx("div", { className: "section-header", children: _jsx("span", { children: "Triage" }) }), _jsx("div", { className: "section-body", children: _jsx(PhaseIndicator, { phases: phases }) })] }), _jsxs("div", { className: "section", children: [_jsx("div", { className: "section-header", children: _jsx("span", { children: "MCP Server" }) }), _jsxs("div", { className: "section-body", style: { display: "flex", gap: 6, flexWrap: "wrap" }, children: [_jsxs("button", { onClick: startServer, disabled: status === "ready" || status === "starting", children: [_jsx("span", { style: { display: "inline-flex", verticalAlign: "-2px", marginRight: 4 }, children: _jsx(IconPlay, {}) }), "start (mock)"] }), _jsxs("button", { onClick: stopServer, disabled: status !== "ready", children: [_jsx("span", { style: { display: "inline-flex", verticalAlign: "-2px", marginRight: 4 }, children: _jsx(IconStop, {}) }), "stop"] }), _jsxs("button", { onClick: async () => setTools(await window.forensicAI.listTools()), disabled: status !== "ready", children: [_jsx("span", { style: { display: "inline-flex", verticalAlign: "-2px", marginRight: 4 }, children: _jsx(IconRefresh, {}) }), "list tools"] })] })] }), _jsxs("div", { className: "section", style: { flex: 1, overflow: "auto" }, children: [_jsxs("div", { className: "section-header", children: [_jsx("span", { children: "Tools" }), _jsx("span", { style: { fontFamily: "var(--font-mono)" }, children: tools.length })] }), tools.length === 0 ? (_jsx("div", { className: "empty", children: "Start the MCP server to list tools." })) : (tools.map((t) => (_jsxs("button", { onClick: () => runTool(t.name), style: {
                                    all: "unset",
                                    display: "block",
                                    width: "100%",
                                    cursor: "pointer",
                                    padding: "8px 12px",
                                    borderBottom: "1px solid var(--border-1)",
                                }, onMouseEnter: (e) => (e.currentTarget.style.background = "var(--bg-2)"), onMouseLeave: (e) => (e.currentTarget.style.background = "transparent"), children: [_jsx("div", { style: { fontFamily: "var(--font-mono)", fontSize: 12 }, children: t.name }), t.description ? (_jsx("div", { style: { color: "var(--fg-2)", fontSize: 11, marginTop: 2 }, children: t.description })) : null] }, t.name))))] })] }), _jsxs("main", { className: "main", children: [_jsxs("section", { className: "pane", children: [_jsxs("div", { className: "pane-header", children: [_jsxs("span", { style: { display: "inline-flex", gap: 6, alignItems: "center" }, children: [_jsx(IconTerminal, {}), "Agent Terminal"] }), _jsx("span", { className: "actions", children: _jsx("span", { style: { color: "var(--fg-2)" }, children: "xterm" }) })] }), _jsx("div", { className: "pane-body", children: _jsx(TerminalView, { onInput: (line) => setDiag((prev) => [...prev.slice(-200), `[term] $ ${line}`]) }) })] }), _jsxs("section", { className: "pane", children: [_jsxs("div", { className: "pane-header", children: [_jsxs("span", { style: { display: "inline-flex", gap: 6, alignItems: "center" }, children: [_jsx(IconReport, {}), "Report"] }), _jsx("span", { className: "actions", children: _jsxs("span", { style: { color: "var(--fg-2)" }, children: [findings.length, " finding", findings.length === 1 ? "" : "s"] }) })] }), _jsx("div", { className: "pane-body", children: _jsx(ReportView, { findings: findings }) })] })] }), _jsxs("aside", { className: "inspector", children: [_jsxs("div", { className: "section", children: [_jsxs("div", { className: "section-header", children: [_jsxs("span", { style: { display: "inline-flex", gap: 6, alignItems: "center" }, children: [_jsx(IconList, {}), "Findings"] }), _jsx("span", { style: { fontFamily: "var(--font-mono)" }, children: findings.length })] }), _jsx(FindingsList, { findings: findings })] }), _jsxs("div", { className: "section", style: { flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }, children: [_jsxs("div", { className: "section-header", children: [_jsx("span", { children: "Diagnostics" }), _jsx("button", { onClick: () => setDiag([]), style: { padding: "2px 6px", fontSize: 10 }, children: "clear" })] }), _jsx("div", { className: "diag", style: { flex: 1, maxHeight: "none" }, children: diag.length === 0 ? (_jsx("span", { style: { color: "var(--fg-3)" }, children: "No output." })) : (diag.map((line, i) => (_jsx("div", { className: line.includes("error") ? "err" : "line", children: line }, i)))) })] })] }), _jsxs("footer", { className: "statusbar", children: [_jsxs("div", { className: "left", children: [_jsx("span", { className: statusDotClass, "aria-hidden": "true" }), _jsxs("span", { children: ["mcp ", status] }), _jsx("span", { children: "\u00B7" }), _jsxs("span", { children: ["tools ", tools.length] }), _jsx("span", { children: "\u00B7" }), _jsxs("span", { children: ["findings ", findings.length] })] }), _jsxs("div", { className: "right", children: [_jsx("span", { children: "electron + vite" }), _jsx("span", { children: "\u00B7" }), _jsx("span", { children: "forensic-ai/0.1.0" })] })] })] }));
}
