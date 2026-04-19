import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { execForensicTool, resolveToolPath, isMockMode } from "../utils/exec.js";
import { parseVolatility3Json } from "../utils/parse.js";
import {
  buildResult,
  buildErrorResult,
  type NetworkConnection,
  type ForensicToolResult,
} from "../schemas/output.js";

const DEFAULT_LIMIT = 200;

// --- Mock data for development without SIFT Workstation ---
const MOCK_NETSCAN: NetworkConnection[] = [
  { protocol: "TCPv4", local_addr: "0.0.0.0", local_port: 445, remote_addr: "0.0.0.0", remote_port: 0, state: "LISTENING", pid: 4, owner: "System", create_time: null, offset: "0x3e2b6010" },
  { protocol: "TCPv4", local_addr: "10.0.0.50", local_port: 49352, remote_addr: "10.0.0.1", remote_port: 443, state: "ESTABLISHED", pid: 2112, owner: "powershell.exe", create_time: "2026-03-15T09:15:01Z", offset: "0x3e4ca980" },
  { protocol: "TCPv4", local_addr: "10.0.0.50", local_port: 49355, remote_addr: "185.220.101.34", remote_port: 4444, state: "ESTABLISHED", pid: 2112, owner: "powershell.exe", create_time: "2026-03-15T09:15:33Z", offset: "0x3e4cb440" },
  { protocol: "TCPv4", local_addr: "10.0.0.50", local_port: 49360, remote_addr: "93.184.216.34", remote_port: 80, state: "CLOSE_WAIT", pid: 1284, owner: "svchost.exe", create_time: "2026-03-15T08:30:12Z", offset: "0x3e3d1a00" },
  { protocol: "UDPv4", local_addr: "0.0.0.0", local_port: 5355, remote_addr: "*", remote_port: 0, state: "", pid: 1284, owner: "svchost.exe", create_time: null, offset: "0x3e2c0500" },
];

interface RawVolNetscanEntry {
  Proto: string;
  LocalAddr: string;
  LocalPort: number;
  ForeignAddr: string;
  ForeignPort: number;
  State: string;
  PID: number;
  Owner: string;
  Created: string | null;
  Offset: string;
  [key: string]: unknown;
}

function mapVolNetscanEntry(raw: RawVolNetscanEntry): NetworkConnection {
  return {
    protocol: raw.Proto ?? "unknown",
    local_addr: raw.LocalAddr ?? "",
    local_port: raw.LocalPort ?? 0,
    remote_addr: raw.ForeignAddr ?? "",
    remote_port: raw.ForeignPort ?? 0,
    state: raw.State ?? "",
    pid: raw.PID ?? 0,
    owner: raw.Owner ?? "",
    create_time: raw.Created ?? null,
    offset: String(raw.Offset ?? "0x0"),
  };
}

function filterConnections(
  entries: NetworkConnection[],
  opts: { pid?: number; state?: string; remoteAddr?: string },
): NetworkConnection[] {
  let filtered = entries;

  if (opts.pid !== undefined) {
    filtered = filtered.filter((e) => e.pid === opts.pid);
  }

  if (opts.state) {
    const s = opts.state.toUpperCase();
    filtered = filtered.filter((e) => e.state.toUpperCase() === s);
  }

  if (opts.remoteAddr) {
    filtered = filtered.filter((e) => e.remote_addr.includes(opts.remoteAddr!));
  }

  return filtered;
}

export function registerVolNetscan(server: McpServer): void {
  server.tool(
    "vol_netscan",
    "Scan network connections from a memory image using Volatility 3 windows.netscan. Returns structured JSON with pagination. Use this instead of raw Volatility shell commands to avoid context window overflow on large connection tables.",
    {
      memoryImage: z.string().describe("Absolute path to the memory image file"),
      pid: z.number().int().optional().describe("Filter by owning PID"),
      state: z.string().optional().describe("Filter by connection state (e.g. ESTABLISHED, LISTENING, CLOSE_WAIT)"),
      remoteAddr: z.string().optional().describe("Filter by remote address (substring match)"),
      offset: z.number().int().nonnegative().default(0).describe("Pagination offset"),
      limit: z.number().int().positive().max(1000).default(DEFAULT_LIMIT).describe("Max results to return (1–1000)"),
    },
    async (params): Promise<CallToolResult> => {
      const { memoryImage, pid, state, remoteAddr, offset, limit } = params;

      const toolMeta = {
        source_artefact: memoryImage,
        tool: "volatility3.windows.netscan.NetScan",
        tool_version: "2.x",
      };

      let entries: NetworkConnection[];

      if (isMockMode()) {
        entries = MOCK_NETSCAN;
      } else {
        const volPath = resolveToolPath("VOL3_PATH", "vol.py");

        const exec = await execForensicTool("python3", [
          volPath,
          "-f", memoryImage,
          "-r", "json",
          "windows.netscan.NetScan",
        ]);

        if (exec.exitCode !== 0) {
          const errResult = buildErrorResult(
            `Volatility netscan failed (exit ${exec.exitCode}): ${exec.stderr.slice(0, 500)}`,
            toolMeta,
          );
          return {
            content: [{ type: "text", text: JSON.stringify(errResult, null, 2) }],
            isError: true,
          };
        }

        const raw = parseVolatility3Json<RawVolNetscanEntry>(exec.stdout);
        entries = raw.map(mapVolNetscanEntry);
      }

      const filtered = filterConnections(entries, { pid, state, remoteAddr });

      const result: ForensicToolResult<NetworkConnection[]> = buildResult(
        filtered,
        offset,
        limit,
        toolMeta,
      );

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    },
  );
}
