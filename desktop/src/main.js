import { jsx as _jsx } from "react/jsx-runtime";
import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App.js";
import "./styles/tokens.css";
import "./styles/app.css";
import "@xterm/xterm/css/xterm.css";
const root = document.getElementById("root");
if (!root)
    throw new Error("root element not found");
ReactDOM.createRoot(root).render(_jsx(React.StrictMode, { children: _jsx(App, {}) }));
