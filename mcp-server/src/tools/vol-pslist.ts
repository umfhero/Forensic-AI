import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { execForensicTool, resolveToolPath, isMockMode } from "../utils/exec.js";
import { parseVolatility3Json } from "../utils/parse.js";
import {
  buildResult,
  buildErrorResult,
  type ProcessEntry,
  type ForensicToolResult,
} from "../schemas/output.js";

const DEFAULT_LIMIT = 200;

// --- Mock data for development without SIFT Workstation ---
const MOCK_PSLIST: ProcessEntry[] = [
  { pid: 4, ppid: 0, image_name: "System", create_time: "2026-03-15T08:00:00Z", exit_time: null, threads: 164, handles: 2456, session_id: 0, wow64: false, offset: "0x858b7a00" },
  { pid: 344, ppid: 4, image_name: "smss.exe", create_time: "2026-03-15T08:00:01Z", exit_time: null, threads: 2, handles: 29, session_id: 0, wow64: false, offset: "0x868c1040" },
  { pid: 476, ppid: 344, image_name: "csrss.exe", create_time: "2026-03-15T08:00:05Z", exit_time: null, threads: 10, handles: 554, session_id: 0, wow64: false, offset: "0x86a08d40" },
  { pid: 564, ppid: 344, image_name: "wininit.exe", create_time: "2026-03-15T08:00:06Z", exit_time: null, threads: 3, handles: 77, session_id: 0, wow64: false, offset: "0x86a55030" },
  { pid: 588, ppid: 564, image_name: "services.exe", create_time: "2026-03-15T08:00:07Z", exit_time: null, threads: 6, handles: 218, session_id: 0, wow64: false, offset: "0x86a5d4e8" },
  { pid: 1284, ppid: 588, image_name: "svchost.exe", create_time: "2026-03-15T08:00:12Z", exit_time: null, threads: 18, handles: 467, session_id: 0, wow64: false, offset: "0x86bea030" },
  { pid: 2048, ppid: 1284, image_name: "cmd.exe", create_time: "2026-03-15T09:14:33Z", exit_time: null, threads: 1, handles: 23, session_id: 1, wow64: false, offset: "0x87123d40" },
  { pid: 2112, ppid: 2048, image_name: "powershell.exe", create_time: "2026-03-15T09:14:45Z", exit_time: null, threads: 12, handles: 389, session_id: 1, wow64: false, offset: "0x8716a030" },
];

interface RawVolPslistEntry {
  PID: number;
  PPID: number;
  ImageFileName: string;
  CreateTime: string | null;
  ExitTime: string | null;
  Threads: number;
  Handles: number;
  SessionId: number;
  Wow64: boolean;
  Offset: string;
  // Vol3 may include extra fields we don't need
  [key: string]: unknown;
}

function mapVolPslistEntry(raw: RawVolPslistEntry): ProcessEntry {
  return {
    pid: raw.PID,
    ppid: raw.PPID,
    image_name: raw.ImageFileName ?? "unknown",
    create_time: raw.CreateTime ?? null,
    exit_time: raw.ExitTime ?? null,
    threads: raw.Threads ?? 0,
    handles: raw.Handles ?? 0,
    session_id: raw.SessionId ?? -1,
    wow64: raw.Wow64 ?? false,
    offset: String(raw.Offset ?? "0x0"),
  };
}

function filterProcesses(
  entries: ProcessEntry[],
  opts: { pid?: number; timeRangeStart?: string; timeRangeEnd?: string },
): ProcessEntry[] {
  let filtered = entries;

  if (opts.pid !== undefined) {
    filtered = filtered.filter((e) => e.pid === opts.pid);
  }

  if (opts.timeRangeStart) {
    const start = new Date(opts.timeRangeStart).getTime();
    filtered = filtered.filter(
      (e) => !e.create_time || new Date(e.create_time).getTime() >= start,
    );
  }

  if (opts.timeRangeEnd) {
    const end = new Date(opts.timeRangeEnd).getTime();
    filtered = filtered.filter(
      (e) => !e.create_time || new Date(e.create_time).getTime() <= end,
    );
  }

  return filtered;
}

export function registerVolPslist(server: McpServer): void {
  server.tool(
    "vol_pslist",
    "List running processes from a memory image using Volatility 3 windows.pslist. Returns structured JSON with pagination. Use this instead of raw Volatility shell commands to avoid context window overflow on large process listings.",
    {
      memoryImage: z.string().describe("Absolute path to the memory image file"),
      pid: z.number().int().optional().describe("Filter by specific PID"),
      timeRangeStart: z.string().optional().describe("ISO-8601 start time filter for process creation"),
      timeRangeEnd: z.string().optional().describe("ISO-8601 end time filter for process creation"),
      offset: z.number().int().nonnegative().default(0).describe("Pagination offset"),
      limit: z.number().int().positive().max(1000).default(DEFAULT_LIMIT).describe("Max results to return (1–1000)"),
    },
    async (params): Promise<CallToolResult> => {
      const { memoryImage, pid, timeRangeStart, timeRangeEnd, offset, limit } = params;

      const toolMeta = {
        source_artefact: memoryImage,
        tool: "volatility3.windows.pslist.PsList",
        tool_version: "2.x", // updated at runtime if possible
      };

      let entries: ProcessEntry[];

      if (isMockMode()) {
        entries = MOCK_PSLIST;
      } else {
        const volPath = resolveToolPath("VOL3_PATH", "vol.py");

        const exec = await execForensicTool("python3", [
          volPath,
          "-f", memoryImage,
          "-r", "json",
          "windows.pslist.PsList",
        ]);

        if (exec.exitCode !== 0) {
          const errResult = buildErrorResult(
            `Volatility pslist failed (exit ${exec.exitCode}): ${exec.stderr.slice(0, 500)}`,
            toolMeta,
          );
          return {
            content: [{ type: "text", text: JSON.stringify(errResult, null, 2) }],
            isError: true,
          };
        }

        const raw = parseVolatility3Json<RawVolPslistEntry>(exec.stdout);
        entries = raw.map(mapVolPslistEntry);
      }

      // Apply filters
      const filtered = filterProcesses(entries, { pid, timeRangeStart, timeRangeEnd });

      // Build paginated result
      const result: ForensicToolResult<ProcessEntry[]> = buildResult(
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
