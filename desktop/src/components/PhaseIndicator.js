import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { IconCircle, IconCheck, IconChip } from "./icons.js";
export function PhaseIndicator({ phases }) {
    return (_jsx("div", { className: "phases", role: "list", children: phases.map((p) => (_jsxs("div", { role: "listitem", className: `phase ${p.status === "active" ? "active" : ""} ${p.status === "done" ? "done" : ""}`, children: [_jsx("span", { "aria-hidden": "true", style: { display: "inline-flex" }, children: p.status === "done" ? (_jsx(IconCheck, {})) : p.status === "active" ? (_jsx(IconChip, {})) : (_jsx(IconCircle, {})) }), _jsxs("span", { children: [_jsxs("span", { className: "num", style: { marginRight: 6 }, children: ["0", p.id] }), p.name] }), _jsx("span", { className: "iter", children: p.iteration > 0 ? `i${p.iteration}` : "—" })] }, p.id))) }));
}
