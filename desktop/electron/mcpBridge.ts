import { EventEmitter } from "node:events";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// desktop/dist-electron/mcpBridge.js -> ../../mcp-server
const MCP_SERVER_ROOT = path.resolve(__dirname, "..", "..", "mcp-server");

export type McpStatus = "idle" | "starting" | "ready" | "error";

export class McpBridge extends EventEmitter {
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;
  private _status: McpStatus = "idle";

  status(): McpStatus {
    return this._status;
  }

  private setStatus(s: McpStatus): void {
    this._status = s;
    this.emit("statusChange", s);
  }

  async start(opts: { mockMode?: boolean }): Promise<{ ok: boolean; error?: string }> {
    if (this._status === "ready" || this._status === "starting") {
      return { ok: true };
    }
    this.setStatus("starting");
    try {
      this.transport = new StdioClientTransport({
        command: process.platform === "win32" ? "npx.cmd" : "npx",
        args: ["tsx", "src/index.ts"],
        cwd: MCP_SERVER_ROOT,
        env: {
          ...process.env,
          MOCK_MODE: opts.mockMode ? "1" : "0",
        },
        stderr: "pipe",
      });

      // Forward stderr diagnostic output to the UI
      const stderr = this.transport.stderr as NodeJS.ReadableStream | null;
      if (stderr) {
        stderr.setEncoding("utf8");
        stderr.on("data", (chunk: string) => {
          for (const line of chunk.split(/\r?\n/)) {
            if (line.trim().length > 0) this.emit("diagnostic", line);
          }
        });
      }

      this.client = new Client(
        { name: "forensic-ai-desktop", version: "0.1.0" },
        { capabilities: {} },
      );
      await this.client.connect(this.transport);
      this.setStatus("ready");
      this.emit("diagnostic", "[bridge] MCP server connected");
      return { ok: true };
    } catch (err) {
      this.setStatus("error");
      const message = err instanceof Error ? err.message : String(err);
      this.emit("diagnostic", `[bridge] start failed: ${message}`);
      return { ok: false, error: message };
    }
  }

  async stop(): Promise<{ ok: boolean }> {
    try {
      await this.client?.close();
    } catch {
      // ignore
    }
    try {
      await this.transport?.close();
    } catch {
      // ignore
    }
    this.client = null;
    this.transport = null;
    this.setStatus("idle");
    return { ok: true };
  }

  async listTools(): Promise<Array<{ name: string; description?: string }>> {
    if (!this.client) return [];
    const res = await this.client.listTools();
    return res.tools.map((t) => ({ name: t.name, description: t.description }));
  }

  async callTool(
    name: string,
    args: Record<string, unknown>,
  ): Promise<{ ok: boolean; result?: unknown; error?: string }> {
    if (!this.client) return { ok: false, error: "MCP server not running" };
    try {
      const res = await this.client.callTool({ name, arguments: args });
      return { ok: true, result: res };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { ok: false, error: message };
    }
  }
}
