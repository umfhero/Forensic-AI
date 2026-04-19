// CommonJS preload — Electron loads preload scripts as CJS by default.
// Exposes a minimal, typed surface on window.forensicAI for the renderer.
const { contextBridge, ipcRenderer } = require("electron");

const api = {
  start: (opts) => ipcRenderer.invoke("mcp:start", opts ?? {}),
  stop: () => ipcRenderer.invoke("mcp:stop"),
  status: () => ipcRenderer.invoke("mcp:status"),
  listTools: () => ipcRenderer.invoke("mcp:listTools"),
  callTool: (name, args) => ipcRenderer.invoke("mcp:callTool", { name, args }),
  runTriage: (opts) => ipcRenderer.invoke("mcp:runTriage", opts ?? {}),
  onDiagnostic: (cb) => {
    const handler = (_e, line) => cb(line);
    ipcRenderer.on("mcp:diagnostic", handler);
    return () => ipcRenderer.removeListener("mcp:diagnostic", handler);
  },
  onStatusChange: (cb) => {
    const handler = (_e, status) => cb(status);
    ipcRenderer.on("mcp:statusChange", handler);
    return () => ipcRenderer.removeListener("mcp:statusChange", handler);
  },
  onFinding: (cb) => {
    const handler = (_e, finding) => cb(finding);
    ipcRenderer.on("mcp:finding", handler);
    return () => ipcRenderer.removeListener("mcp:finding", handler);
  },
  onPhase: (cb) => {
    const handler = (_e, phase) => cb(phase);
    ipcRenderer.on("mcp:phase", handler);
    return () => ipcRenderer.removeListener("mcp:phase", handler);
  },
};

contextBridge.exposeInMainWorld("forensicAI", api);
