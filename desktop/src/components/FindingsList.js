import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function FindingsList({ findings, onSelect }) {
    if (findings.length === 0) {
        return _jsx("div", { className: "empty", children: "No findings yet. Run a triage pass to begin." });
    }
    return (_jsx("div", { children: findings.map((f) => (_jsxs("button", { className: "finding", onClick: () => onSelect?.(f.id), style: { all: "unset", display: "block", width: "100%", cursor: "pointer" }, children: [_jsxs("div", { className: "row1", children: [_jsx("span", { className: `tag ${f.confidence}`, children: f.confidence }), _jsx("span", { className: "title", children: f.title })] }), _jsxs("div", { className: "meta", children: [f.source, " \u00B7 ", new Date(f.timestamp).toISOString().slice(11, 19)] })] }, f.id))) }));
}
