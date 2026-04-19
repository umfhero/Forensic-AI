#!/usr/bin/env node

/**
 * forensic-ai MCP Server
 *
 * Focused custom MCP server providing structured, paginated JSON output for
 * forensic tools whose raw output overflows the LLM context window.
 *
 * Runs alongside Protocol SIFT's existing shell-based tool access — does NOT
 * replace it. Registered via Claude Code's mcpServers configuration.
 *
 * Transport: stdio (spawned as child process by Claude Code on SIFT Workstation)
 *
 * Tools:
 *   - vol_pslist:          Volatility 3 process listing with filtering and pagination
 *   - vol_netscan:         Volatility 3 network connections with filtering and pagination
 *   - build_supertimeline: log2timeline/psort supertimeline with time range filtering and pagination
 *
 * Environment variables:
 *   VOL3_PATH           Path to Volatility 3 vol.py      (default: "vol.py")
 *   LOG2TIMELINE_PATH   Path to log2timeline.py           (default: "log2timeline.py")
 *   PSORT_PATH          Path to psort.py                  (default: "psort.py")
 *   MOCK_MODE           Set to "1" for development without SIFT Workstation
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerVolPslist } from "./tools/vol-pslist.js";
import { registerVolNetscan } from "./tools/vol-netscan.js";
import { registerBuildSupertimeline } from "./tools/build-supertimeline.js";

const server = new McpServer({
  name: "forensic-ai",
  version: "0.1.0",
}, {
  instructions: [
    "This server provides structured, paginated access to forensic tools whose",
    "raw output is too large for the context window. Use these tools INSTEAD OF",
    "raw shell commands for Volatility process listings, network scans, and",
    "supertimelines. For other forensic tools, continue using Protocol SIFT's",
    "existing shell access.",
    "",
    "Every result includes metadata (source_artefact, function_call_id, timestamp)",
    "for audit trail traceability. Use the pagination parameters (offset, limit)",
    "to navigate large result sets without overflowing context.",
    "",
    "Set MOCK_MODE=1 to use built-in sample data for development and testing.",
  ].join("\n"),
});

// Register all forensic tools
registerVolPslist(server);
registerVolNetscan(server);
registerBuildSupertimeline(server);

// Connect via stdio transport (Claude Code spawns this as a child process)
const transport = new StdioServerTransport();
await server.connect(transport);

// Diagnostics to stderr only — stdout is the MCP transport
console.error("[forensic-ai] MCP server started (stdio transport)");
console.error(`[forensic-ai] Mock mode: ${process.env.MOCK_MODE === "1" ? "ON" : "OFF"}`);
