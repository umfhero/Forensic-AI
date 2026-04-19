import { app, BrowserWindow, ipcMain } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { McpBridge } from "./mcpBridge.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;

let mainWindow: BrowserWindow | null = null;
const mcp = new McpBridge();

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: "#0e0e0e",
    title: "Forensic-AI",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (DEV_SERVER_URL) {
    void mainWindow.loadURL(DEV_SERVER_URL);
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    void mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// IPC: MCP bridge
ipcMain.handle("mcp:start", async (_event, opts: { mockMode?: boolean }) => {
  return mcp.start({ mockMode: opts?.mockMode ?? true });
});

ipcMain.handle("mcp:stop", async () => {
  return mcp.stop();
});

ipcMain.handle("mcp:status", () => mcp.status());

ipcMain.handle(
  "mcp:callTool",
  async (_event, payload: { name: string; args: Record<string, unknown> }) => {
    return mcp.callTool(payload.name, payload.args);
  },
);

ipcMain.handle("mcp:listTools", async () => mcp.listTools());

// Diagnostic events pushed from the bridge
mcp.on("diagnostic", (line: string) => {
  mainWindow?.webContents.send("mcp:diagnostic", line);
});

mcp.on("statusChange", (status: string) => {
  mainWindow?.webContents.send("mcp:statusChange", status);
});

void app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  void mcp.stop();
  if (process.platform !== "darwin") app.quit();
});
