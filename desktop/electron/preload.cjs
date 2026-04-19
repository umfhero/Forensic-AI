// CommonJS preload — Electron loads preload scripts as CJS by default.
// Exposes a minimal, typed surface on window.forensicAI for the renderer.
const { contextBridge, ipcRenderer } = require("electron");

const api = {
  start: (opts) => ipcRenderer.invoke("mcp:start", opts ?? {}),
  stop: () => ipcRenderer.invoke("mcp:stop"),
  status: () => ipcRenderer.invoke("mcp:status"),
  listTools: () => ipcRenderer.invoke("mcp:listTools"),
  callTool: (name, args) => ipcRenderer.invoke("mcp:callTool", { name, args }),
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
};

contextBridge.exposeInMainWorld("forensicAI", api);
