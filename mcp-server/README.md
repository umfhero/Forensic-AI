# forensic-ai MCP Server

Custom MCP server providing structured, paginated JSON output for forensic tools whose raw output overflows the LLM context window.

## Architecture

This server runs **alongside** Protocol SIFT — it does NOT replace it. Protocol SIFT gives the agent shell access to 200+ SIFT Workstation tools. This server adds structured-output alternatives for the 3 tools most likely to overflow context:

| MCP Tool | Underlying Tool | Problem Solved |
|---|---|---|
| `vol_pslist` | Volatility 3 `windows.pslist` | Process listings on large memory images: thousands of lines → paginated JSON |
| `vol_netscan` | Volatility 3 `windows.netscan` | Network connection tables → filtered, paginated JSON |
| `build_supertimeline` | log2timeline + psort | Supertimelines with millions of entries → time-filtered, paginated JSON |

## Quick Start

```bash
cd mcp-server
npm install
npm start
```

For development without a SIFT Workstation:
```bash
MOCK_MODE=1 npm start
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `VOL3_PATH` | `vol.py` | Path to Volatility 3 vol.py |
| `LOG2TIMELINE_PATH` | `log2timeline.py` | Path to log2timeline.py |
| `PSORT_PATH` | `psort.py` | Path to psort.py |
| `MOCK_MODE` | `0` | Set to `1` for built-in sample data (dev/testing) |

## Integration with Claude Code

Add to `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "forensic-ai": {
      "command": "npx",
      "args": ["tsx", "/path/to/forensic-ai/mcp-server/src/index.ts"],
      "env": {
        "VOL3_PATH": "/opt/volatility3-2.20.0/vol.py",
        "MOCK_MODE": "0"
      }
    }
  }
}
```

See `config/settings.json.example` for the full configuration.

## Output Schema

Every tool returns the same JSON structure:

```json
{
  "status": "success | error | partial",
  "data": [],
  "metadata": {
    "source_artefact": "/path/to/evidence",
    "tool": "tool_name",
    "tool_version": "x.y.z",
    "function_call_id": "uuid",
    "timestamp": "ISO-8601"
  },
  "pagination": {
    "total_results": 0,
    "returned": 0,
    "offset": 0,
    "has_more": false
  }
}
```

## Project Structure

```
mcp-server/
├── src/
│   ├── index.ts              # Server entry point (McpServer + stdio transport)
│   ├── schemas/
│   │   └── output.ts         # Shared Zod output schemas
│   ├── tools/
│   │   ├── vol-pslist.ts     # vol_pslist tool implementation
│   │   ├── vol-netscan.ts    # vol_netscan tool implementation
│   │   └── build-supertimeline.ts  # build_supertimeline tool implementation
│   └── utils/
│       ├── exec.ts           # Shell command executor
│       └── parse.ts          # Output parsers (Vol3 JSON, L2tCSV)
├── package.json
└── tsconfig.json
```
