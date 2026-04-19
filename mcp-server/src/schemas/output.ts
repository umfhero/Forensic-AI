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

export type ProcessEntry = z.infer<typeof ProcessEntrySchema>;
export type NetworkConnection = z.infer<typeof NetworkConnectionSchema>;
export type TimelineEntry = z.infer<typeof TimelineEntrySchema>;

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
