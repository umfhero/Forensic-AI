import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { execForensicTool, resolveToolPath, isMockMode } from "../utils/exec.js";
import { parseVolatility3Json } from "../utils/parse.js";
import {
  buildResult,
  buildErrorResult,
  type MalfindEntry,
  type ForensicToolResult,
} from "../schemas/output.js";

const DEFAULT_LIMIT = 100;

// --- Mock data for development without SIFT Workstation ---
// Mirrors the suspicious PowerShell chain shown in the pslist/netscan fixtures
// so the triage loop produces a coherent scenario end-to-end.
const MOCK_MALFIND: MalfindEntry[] = [
  {
    pid: 2112,
    process: "powershell.exe",
    address: "0x0000022f1a8e0000",
    vad_tag: "VadS",
    protection: "PAGE_EXECUTE_READWRITE",
    commit_charge: 64,
    private_memory: true,
    hexdump:
      "4d 5a 90 00 03 00 00 00 04 00 00 00 ff ff 00 00  MZ..............\n" +
      "b8 00 00 00 00 00 00 00 40 00 00 00 00 00 00 00  ........@.......",
    disasm:
      "0x0000022f1a8e0000  dec ebp\n" +
      "0x0000022f1a8e0001  pop edx\n" +
      "0x0000022f1a8e0002  nop\n" +
      "0x0000022f1a8e0003  add [ebx], al",
    notes: "MZ_HEADER;RWX_REGION;PRIVATE_MEMORY",
  },
  {
    pid: 2112,
    process: "powershell.exe",
    address: "0x0000022f1ab40000",
    vad_tag: "VadS",
    protection: "PAGE_EXECUTE_READWRITE",
    commit_charge: 8,
    private_memory: true,
    hexdump:
      "e8 00 00 00 00 58 83 c0 19 ff e0 00 00 00 00 00  .....X..........",
    disasm:
      "0x0000022f1ab40000  call 0x0000022f1ab40005\n" +
      "0x0000022f1ab40005  pop eax\n" +
      "0x0000022f1ab40006  add eax, 0x19\n" +
      "0x0000022f1ab40009  jmp eax",
    notes: "SHELLCODE_STUB;RWX_REGION;PRIVATE_MEMORY",
  },
];

interface RawVolMalfindEntry {
  PID: number;
  Process: string;
  Start: string;
  Tag: string;
  Protection: string;
  CommitCharge: number;
  PrivateMemory: number | boolean;
  Hexdump: string;
  Disasm: string;
  Notes?: string;
  [key: string]: unknown;
}

function mapVolMalfindEntry(raw: RawVolMalfindEntry): MalfindEntry {
  return {
    pid: raw.PID,
    process: raw.Process ?? "unknown",
    address: String(raw.Start ?? "0x0"),
    vad_tag: raw.Tag ?? "",
    protection: raw.Protection ?? "",
    commit_charge: Number(raw.CommitCharge ?? 0),
    private_memory: Boolean(raw.PrivateMemory),
    hexdump: raw.Hexdump ?? "",
    disasm: raw.Disasm ?? "",
    notes: raw.Notes ?? "",
  };
}

function filterMalfind(
  entries: MalfindEntry[],
  opts: { pid?: number; rwxOnly?: boolean },
): MalfindEntry[] {
  let filtered = entries;
  if (opts.pid !== undefined) {
    filtered = filtered.filter((e) => e.pid === opts.pid);
  }
  if (opts.rwxOnly) {
    filtered = filtered.filter((e) => e.protection.toUpperCase().includes("EXECUTE_READWRITE"));
  }
  return filtered;
}

export function registerVolMalfind(server: McpServer): void {
  server.tool(
    "vol_malfind",
    "Scan a memory image for injected code regions using Volatility 3 windows.malfind. Flags RWX private memory regions that contain MZ headers or plausible shellcode. Returns structured, paginated JSON — always prefer this over raw shell output because malfind results include binary hexdumps that easily overflow the context window.",
    {
      memoryImage: z.string().describe("Absolute path to the memory image file"),
      pid: z.number().int().optional().describe("Filter by specific PID"),
      rwxOnly: z.boolean().optional().describe("Only return regions with PAGE_EXECUTE_READWRITE"),
      offset: z.number().int().nonnegative().default(0).describe("Pagination offset"),
      limit: z.number().int().positive().max(500).default(DEFAULT_LIMIT).describe("Max results (1–500)"),
    },
    async (params): Promise<CallToolResult> => {
      const { memoryImage, pid, rwxOnly, offset, limit } = params;

      const toolMeta = {
        source_artefact: memoryImage,
        tool: "volatility3.windows.malfind.Malfind",
        tool_version: "2.x",
      };

      let entries: MalfindEntry[];

      if (isMockMode()) {
        entries = MOCK_MALFIND;
      } else {
        const volPath = resolveToolPath("VOL3_PATH", "vol.py");

        const args = [volPath, "-f", memoryImage, "-r", "json", "windows.malfind.Malfind"];
        if (pid !== undefined) {
          args.push("--pid", String(pid));
        }

        const exec = await execForensicTool("python3", args);

        if (exec.exitCode !== 0) {
          const errResult = buildErrorResult(
            `Volatility malfind failed (exit ${exec.exitCode}): ${exec.stderr.slice(0, 500)}`,
            toolMeta,
          );
          return {
            content: [{ type: "text", text: JSON.stringify(errResult, null, 2) }],
            isError: true,
          };
        }

        const raw = parseVolatility3Json<RawVolMalfindEntry>(exec.stdout);
        entries = raw.map(mapVolMalfindEntry);
      }

      const filtered = filterMalfind(entries, { pid, rwxOnly });

      const result: ForensicToolResult<MalfindEntry[]> = buildResult(
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
