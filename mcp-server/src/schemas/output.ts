import { z } from "zod";

// --- Metadata & Pagination (shared across all tool results) ---

export const MetadataSchema = z.object({
  source_artefact: z.string().describe("Path to the evidence file analysed"),
  tool: z.string().describe("Name of the underlying forensic tool"),
  tool_version: z.string().describe("Version of the forensic tool"),
  function_call_id: z.string().uuid().describe("Unique ID for this invocation"),
  timestamp: z.string().datetime().describe("ISO-8601 UTC timestamp of execution"),
});

export const PaginationSchema = z.object({
  total_results: z.number().int().nonnegative(),
  returned: z.number().int().nonnegative(),
  offset: z.number().int().nonnegative(),
  has_more: z.boolean(),
});

export type Metadata = z.infer<typeof MetadataSchema>;
export type Pagination = z.infer<typeof PaginationSchema>;

// --- Tool-specific data schemas ---

export const ProcessEntrySchema = z.object({
  pid: z.number().int(),
  ppid: z.number().int(),
  image_name: z.string(),
  create_time: z.string().nullable(),
  exit_time: z.string().nullable(),
  threads: z.number().int(),
  handles: z.number().int(),
  session_id: z.number().int(),
  wow64: z.boolean(),
  offset: z.string().describe("Virtual offset in memory image"),
});

export const NetworkConnectionSchema = z.object({
  protocol: z.string(),
  local_addr: z.string(),
  local_port: z.number().int(),
  remote_addr: z.string(),
  remote_port: z.number().int(),
  state: z.string(),
  pid: z.number().int(),
  owner: z.string(),
  create_time: z.string().nullable(),
  offset: z.string().describe("Virtual offset in memory image"),
});

export const TimelineEntrySchema = z.object({
  datetime: z.string().describe("ISO-8601 timestamp of the event"),
  timestamp_desc: z.string().describe("Description of what this timestamp represents"),
  source: z.string().describe("Source plugin that generated this entry"),
  source_long: z.string().describe("Full source description"),
  message: z.string().describe("Short description of the event"),
  filename: z.string().describe("Source file path"),
  inode: z.string(),
  format: z.string(),
  extra: z.array(z.record(z.string(), z.unknown())).optional(),
});

export const MalfindEntrySchema = z.object({
  pid: z.number().int(),
  process: z.string().describe("Image name of the owning process"),
  address: z.string().describe("Virtual address of the suspicious region"),
  vad_tag: z.string().describe("Virtual Address Descriptor tag (e.g. VadS)"),
  protection: z.string().describe("Memory protection (e.g. PAGE_EXECUTE_READWRITE)"),
  commit_charge: z.number().int(),
  private_memory: z.boolean(),
  hexdump: z.string().describe("First bytes of the region (hex, truncated)"),
  disasm: z.string().describe("Short disassembly of the region's start (ASCII)"),
  notes: z.string().describe("Heuristic flag summary (e.g. MZ_HEADER, RWX_REGION)"),
});

export const EventLogEntrySchema = z.object({
  record_id: z.number().int(),
  event_id: z.number().int(),
  provider: z.string(),
  channel: z.string().describe("Event log channel (Security, System, Sysmon/Operational, …)"),
  level: z.string(),
  computer: z.string(),
  user_sid: z.string().nullable(),
  timestamp: z.string().describe("ISO-8601 UTC timestamp"),
  message: z.string(),
  data: z.record(z.string(), z.unknown()).describe("Parsed EventData / UserData fields"),
});

export type ProcessEntry = z.infer<typeof ProcessEntrySchema>;
export type NetworkConnection = z.infer<typeof NetworkConnectionSchema>;
export type TimelineEntry = z.infer<typeof TimelineEntrySchema>;
export type MalfindEntry = z.infer<typeof MalfindEntrySchema>;
export type EventLogEntry = z.infer<typeof EventLogEntrySchema>;

// --- Finding wire format (shared with desktop app) ---
//
// The desktop app's Report pane, Findings list, and audit trail consume this
// shape directly. Every finding emitted by the triage loop MUST conform.
// Mirrored at desktop/src/lib/state.ts — keep the two in sync.

export const ConfidenceSchema = z.enum(["confirmed", "inferred", "uncertain"]);
export type Confidence = z.infer<typeof ConfidenceSchema>;

export const FindingSchema = z.object({
  id: z.string().describe("Stable ID for this finding within a triage run"),
  title: z.string().describe("One-line finding statement"),
  confidence: ConfidenceSchema,
  phase: z.number().int().min(1).max(5).describe("Triage phase that produced the finding"),
  source: z.string().describe("Tool name or 'cross-validation'"),
  function_call_ids: z.array(z.string()).describe("All tool invocations that contributed"),
  source_artefacts: z.array(z.string()).describe("Evidence paths referenced"),
  kill_chain_stage: z.string().optional(),
  timestamp: z.string().describe("ISO-8601 — when the finding was recorded"),
  event_time: z.string().optional().describe("ISO-8601 — when the underlying event occurred"),
  evidence: z.string().describe("Verbatim or near-verbatim tool-output excerpt"),
  reasoning: z.string().optional().describe("Required for INFERRED findings"),
  alternatives: z.string().optional().describe("Alternative explanations (INFERRED)"),
  gaps: z.string().optional().describe("What is missing (UNCERTAIN)"),
  contradictions: z.string().optional().describe("Conflicting evidence (UNCERTAIN)"),
  follow_up: z.string().optional().describe("Recommended next step (UNCERTAIN)"),
  based_on: z.array(z.string()).optional().describe("Finding IDs this depends on (INFERRED)"),
});

export type Finding = z.infer<typeof FindingSchema>;

// --- Triage phase progression (shared with desktop app) ---

export const PhaseStatusSchema = z.enum(["pending", "active", "done", "error"]);
export type PhaseStatus = z.infer<typeof PhaseStatusSchema>;

export const PhaseEventSchema = z.object({
  phase: z.number().int().min(1).max(5),
  name: z.string(),
  status: PhaseStatusSchema,
  iteration: z.number().int().nonnegative(),
  timestamp: z.string(),
  note: z.string().optional(),
});

export type PhaseEvent = z.infer<typeof PhaseEventSchema>;

// --- Generic forensic tool result ---

export interface ForensicToolResult<T> {
  status: "success" | "error" | "partial";
  data: T;
  metadata: Metadata;
  pagination: Pagination;
}

/**
 * Build a successful paginated ForensicToolResult from a full dataset.
 * Applies offset/limit slicing and populates pagination fields.
 */
export function buildResult<T>(
  allItems: T[],
  offset: number,
  limit: number,
  metadata: Omit<Metadata, "function_call_id" | "timestamp">,
): ForensicToolResult<T[]> {
  const sliced = allItems.slice(offset, offset + limit);
  return {
    status: "success",
    data: sliced,
    metadata: {
      ...metadata,
      function_call_id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    },
    pagination: {
      total_results: allItems.length,
      returned: sliced.length,
      offset,
      has_more: offset + limit < allItems.length,
    },
  };
}

/**
 * Build an error ForensicToolResult.
 */
export function buildErrorResult(
  message: string,
  metadata: Omit<Metadata, "function_call_id" | "timestamp">,
): ForensicToolResult<null> {
  return {
    status: "error",
    data: null,
    metadata: {
      ...metadata,
      function_call_id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    },
    pagination: {
      total_results: 0,
      returned: 0,
      offset: 0,
      has_more: false,
    },
  };
}
