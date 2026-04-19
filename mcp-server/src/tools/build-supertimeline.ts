import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { execForensicTool, resolveToolPath, isMockMode } from "../utils/exec.js";
import { parseL2tCsv } from "../utils/parse.js";
import {
  buildResult,
  buildErrorResult,
  type TimelineEntry,
  type ForensicToolResult,
} from "../schemas/output.js";

const DEFAULT_LIMIT = 500;

// --- Mock data for development without SIFT Workstation ---
const MOCK_TIMELINE: TimelineEntry[] = [
  { datetime: "2026-03-15T08:00:00Z", timestamp_desc: "Creation Time", source: "FILE", source_long: "NTFS $MFT", message: "Windows system boot - ntoskrnl.exe accessed", filename: "/Windows/System32/ntoskrnl.exe", inode: "27456", format: "mft", extra: [] },
  { datetime: "2026-03-15T09:14:30Z", timestamp_desc: "Creation Time", source: "REG", source_long: "Registry Key", message: "UserAssist entry - cmd.exe executed", filename: "/NTUSER.DAT", inode: "-", format: "winreg/userassist", extra: [] },
  { datetime: "2026-03-15T09:14:33Z", timestamp_desc: "Last Executed Time", source: "PE", source_long: "Prefetch File", message: "CMD.EXE-4A81B364.pf last run", filename: "/Windows/Prefetch/CMD.EXE-4A81B364.pf", inode: "78234", format: "prefetch", extra: [] },
  { datetime: "2026-03-15T09:14:45Z", timestamp_desc: "Last Executed Time", source: "PE", source_long: "Prefetch File", message: "POWERSHELL.EXE-022A1004.pf last run", filename: "/Windows/Prefetch/POWERSHELL.EXE-022A1004.pf", inode: "78235", format: "prefetch", extra: [] },
  { datetime: "2026-03-15T09:15:01Z", timestamp_desc: "Creation Time", source: "LOG", source_long: "WinEvtx", message: "EventID 4688 - New process created: powershell.exe", filename: "/Windows/System32/winevt/Logs/Security.evtx", inode: "-", format: "winevtx", extra: [] },
  { datetime: "2026-03-15T09:15:33Z", timestamp_desc: "Creation Time", source: "LOG", source_long: "WinEvtx", message: "EventID 3 - Network connection detected: 185.220.101.34:4444", filename: "/Windows/System32/winevt/Logs/Microsoft-Windows-Sysmon%4Operational.evtx", inode: "-", format: "winevtx", extra: [] },
  { datetime: "2026-03-15T09:16:00Z", timestamp_desc: "Modification Time", source: "FILE", source_long: "NTFS $MFT", message: "Suspicious file created: C:\\Users\\victim\\AppData\\Local\\Temp\\payload.exe", filename: "/Users/victim/AppData/Local/Temp/payload.exe", inode: "95432", format: "mft", extra: [] },
  { datetime: "2026-03-15T09:16:05Z", timestamp_desc: "Key Last Written Time", source: "REG", source_long: "Registry Key", message: "AmcacheParser - payload.exe first seen", filename: "/Windows/AppCompat/Programs/Amcache.hve", inode: "-", format: "winreg/amcache", extra: [] },
];

function mapL2tCsvToTimeline(raw: Record<string, string>): TimelineEntry {
  // L2tCSV columns: date,time,timezone,MACB,source,sourcetype,type,user,host,short,desc,version,filename,inode,notes,format,extra
  const dateStr = raw.date ?? "";
  const timeStr = raw.time ?? "";
  const tz = raw.timezone ?? "UTC";

  let datetime: string;
  if (dateStr && timeStr) {
    datetime = new Date(`${dateStr}T${timeStr}${tz === "UTC" ? "Z" : ""}`).toISOString();
  } else {
    datetime = "";
  }

  return {
    datetime,
    timestamp_desc: raw.type ?? "",
    source: raw.source ?? "",
    source_long: raw.sourcetype ?? "",
    message: raw.short ?? raw.desc ?? "",
    filename: raw.filename ?? "",
    inode: raw.inode ?? "",
    format: raw.format ?? "",
  };
}

function filterTimeline(
  entries: TimelineEntry[],
  opts: { timeRangeStart?: string; timeRangeEnd?: string; sourceType?: string },
): TimelineEntry[] {
  let filtered = entries;

  if (opts.timeRangeStart) {
    const start = new Date(opts.timeRangeStart).getTime();
    filtered = filtered.filter(
      (e) => !e.datetime || new Date(e.datetime).getTime() >= start,
    );
  }

  if (opts.timeRangeEnd) {
    const end = new Date(opts.timeRangeEnd).getTime();
    filtered = filtered.filter(
      (e) => !e.datetime || new Date(e.datetime).getTime() <= end,
    );
  }

  if (opts.sourceType) {
    const src = opts.sourceType.toUpperCase();
    filtered = filtered.filter(
      (e) =>
        e.source.toUpperCase().includes(src) ||
        e.source_long.toUpperCase().includes(src),
    );
  }

  return filtered;
}

export function registerBuildSupertimeline(server: McpServer): void {
  server.tool(
    "build_supertimeline",
    "Build or query a supertimeline from disk evidence using log2timeline/psort. Returns structured, paginated JSON instead of raw L2tCSV output. Essential for preventing context window overflow — supertimelines can contain millions of entries. Always use time range filters to scope the query.",
    {
      evidencePath: z.string().describe("Absolute path to the evidence file (E01, raw image, or mounted directory)"),
      timeRangeStart: z.string().optional().describe("ISO-8601 start time — strongly recommended to avoid millions of unfiltered entries"),
      timeRangeEnd: z.string().optional().describe("ISO-8601 end time — strongly recommended"),
      sourceType: z.string().optional().describe("Filter by source type (e.g. FILE, REG, LOG, PE)"),
      offset: z.number().int().nonnegative().default(0).describe("Pagination offset"),
      limit: z.number().int().positive().max(5000).default(DEFAULT_LIMIT).describe("Max results to return (1–5000)"),
    },
    async (params): Promise<CallToolResult> => {
      const { evidencePath, timeRangeStart, timeRangeEnd, sourceType, offset, limit } = params;

      const toolMeta = {
        source_artefact: evidencePath,
        tool: "log2timeline/psort",
        tool_version: "20230717", // placeholder — updated after SIFT inspection
      };

      let entries: TimelineEntry[];

      if (isMockMode()) {
        entries = MOCK_TIMELINE;
      } else {
        // Step 1: Run log2timeline to build the plaso storage file (if not already built)
        const log2timelinePath = resolveToolPath("LOG2TIMELINE_PATH", "log2timeline.py");
        const psortPath = resolveToolPath("PSORT_PATH", "psort.py");
        const plasoFile = `${evidencePath}.plaso`;

        // Build the plaso file — this is the expensive step
        // In production, check if plasoFile already exists to avoid re-processing
        const l2tExec = await execForensicTool("python3", [
          log2timelinePath,
          "--storage-file", plasoFile,
          evidencePath,
        ], { timeoutMs: 600_000 }); // 10 min timeout for large images

        if (l2tExec.exitCode !== 0) {
          const errResult = buildErrorResult(
            `log2timeline failed (exit ${l2tExec.exitCode}): ${l2tExec.stderr.slice(0, 500)}`,
            toolMeta,
          );
          return {
            content: [{ type: "text", text: JSON.stringify(errResult, null, 2) }],
            isError: true,
          };
        }

        // Step 2: Run psort to extract timeline with filters
        const psortArgs = [
          psortPath,
          "-o", "l2tcsv", // L2tCSV output format
          "--storage-file", plasoFile,
        ];

        // Add time range filter if provided
        if (timeRangeStart || timeRangeEnd) {
          const dateFilter = buildPlasoDateFilter(timeRangeStart, timeRangeEnd);
          if (dateFilter) {
            psortArgs.push("--date-filter", dateFilter);
          }
        }

        const psortExec = await execForensicTool("python3", psortArgs, {
          timeoutMs: 300_000, // 5 min timeout
        });

        if (psortExec.exitCode !== 0) {
          const errResult = buildErrorResult(
            `psort failed (exit ${psortExec.exitCode}): ${psortExec.stderr.slice(0, 500)}`,
            toolMeta,
          );
          return {
            content: [{ type: "text", text: JSON.stringify(errResult, null, 2) }],
            isError: true,
          };
        }

        const rawEntries = parseL2tCsv(psortExec.stdout);
        entries = rawEntries.map(mapL2tCsvToTimeline);
      }

      const filtered = filterTimeline(entries, { timeRangeStart, timeRangeEnd, sourceType });

      const result: ForensicToolResult<TimelineEntry[]> = buildResult(
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

/**
 * Build a plaso date filter string from ISO-8601 start/end times.
 * Plaso format: "date > 'YYYY-MM-DD HH:MM:SS' AND date < 'YYYY-MM-DD HH:MM:SS'"
 */
function buildPlasoDateFilter(start?: string, end?: string): string | undefined {
  const parts: string[] = [];

  if (start) {
    const d = new Date(start);
    parts.push(`date > '${d.toISOString().replace("T", " ").replace("Z", "")}'`);
  }

  if (end) {
    const d = new Date(end);
    parts.push(`date < '${d.toISOString().replace("T", " ").replace("Z", "")}'`);
  }

  return parts.length > 0 ? parts.join(" AND ") : undefined;
}
