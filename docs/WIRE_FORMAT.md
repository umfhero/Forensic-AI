# Wire Format — Findings, Phase Events, and MCP Tool Results

> The contract between the MCP server, the triage orchestrator, and the
> Electron desktop app. If you change a field here, change it in all three
> locations listed below.

## Single-source-of-truth locations

| Shape           | Canonical definition                                                                 |
| --------------- | ------------------------------------------------------------------------------------ |
| `Finding`       | `mcp-server/src/schemas/output.ts` → `FindingSchema`                                 |
| `Finding` (TS)  | `desktop/electron/triage.ts` and `desktop/src/lib/state.ts` (must mirror the above)  |
| `PhaseEvent`    | `mcp-server/src/schemas/output.ts` → `PhaseEventSchema`                              |
| Tool result envelope | `mcp-server/src/schemas/output.ts` → `ForensicToolResult<T>`, `buildResult` helper |

---

## `Finding`

Emitted by the triage orchestrator (`desktop/electron/triage.ts`) and rendered
by `desktop/src/components/ReportView.tsx` and `FindingsList.tsx`. The MCP
server defines the schema so an LLM agent can produce conforming findings
directly when it replaces the deterministic mock orchestrator.

```ts
interface Finding {
  id: string;                       // "f-1", "f-2", … stable within a triage run
  title: string;                    // one-line finding statement
  confidence: "confirmed" | "inferred" | "uncertain";
  phase: 1 | 2 | 3 | 4 | 5;         // which triage phase produced it
  source: string;                   // tool name or "cross-validation" / "synthesis"
  function_call_ids: string[];      // every MCP invocation that contributed
  source_artefacts: string[];       // evidence paths referenced
  kill_chain_stage?: string;        // Lockheed-Martin stage; omitted if unclassified
  timestamp: string;                // ISO-8601 — when the finding was recorded
  event_time?: string;              // ISO-8601 — when the underlying event occurred
  evidence: string;                 // verbatim or near-verbatim tool-output excerpt
  reasoning?: string;               // REQUIRED for INFERRED — explicit chain
  alternatives?: string;            // INFERRED — other plausible explanations
  gaps?: string;                    // UNCERTAIN — what is missing
  contradictions?: string;          // UNCERTAIN — conflicting evidence
  follow_up?: string;               // UNCERTAIN — specific next step
  based_on?: string[];              // INFERRED — finding IDs this depends on
}
```

**Rules** (enforced by `skills/ANTI_HALLUCINATION.md` and
`skills/CONFIDENCE_CLASSIFICATION.md`):

- `confidence === "confirmed"` ⇒ `function_call_ids.length ≥ 1`.
- `confidence === "inferred"` ⇒ `reasoning` present AND `based_on.length ≥ 2`.
- `confidence === "uncertain"` ⇒ `gaps` present AND `follow_up` present.
- `kill_chain_stage` uses exact Lockheed-Martin stage names
  (`Reconnaissance`, `Weaponisation`, `Delivery`, `Exploitation`,
  `Installation`, `Command and Control`, `Actions on Objectives`) so the
  report renderer groups them correctly.

---

## `PhaseEvent`

Streamed from the orchestrator to the desktop UI while a triage run is in
progress. One event per phase transition.

```ts
interface PhaseEvent {
  phase: 1 | 2 | 3 | 4 | 5;
  name: string;                     // "Initial Survey", …
  status: "pending" | "active" | "done" | "error";
  iteration: number;                // >= 1 for active/done; 0 for pending
  timestamp: string;                // ISO-8601
  note?: string;                    // optional short explanation
}
```

Phase names come from `skills/INVESTIGATION_SEQUENCING.md`:

1. Initial Survey
2. Targeted Deep-Dive
3. Cross-Validation
4. Self-Correction (Mauro — currently stays `pending`)
5. Synthesis

---

## IPC Channels (desktop)

The main process bridges MCP + triage to the renderer through
`desktop/electron/preload.cjs`, exposing `window.forensicAI`.

| Channel             | Direction | Payload                                                    |
| ------------------- | --------- | ---------------------------------------------------------- |
| `mcp:start`         | invoke    | `{ mockMode?: boolean }` → `{ ok, error? }`                |
| `mcp:stop`          | invoke    | none → `{ ok }`                                            |
| `mcp:status`        | invoke    | none → `McpStatus`                                         |
| `mcp:listTools`     | invoke    | none → `Array<{ name, description? }>`                     |
| `mcp:callTool`      | invoke    | `{ name, args }` → `{ ok, result?, error? }`               |
| `mcp:runTriage`     | invoke    | `TriageRunOptions` → `TriageRunResult`                     |
| `mcp:diagnostic`    | push      | `string` — stderr line from server or bridge               |
| `mcp:statusChange`  | push      | `McpStatus`                                                |
| `mcp:finding`       | push      | `Finding` — streamed one-by-one during triage              |
| `mcp:phase`         | push      | `PhaseEvent` — streamed on each phase transition           |

---

## MCP Tool Result Envelope

Every MCP tool returns its payload wrapped in `ForensicToolResult<T>`:

```ts
interface ForensicToolResult<T> {
  status: "success" | "error" | "partial";
  data: T;                          // always present on success
  metadata: {
    source_artefact: string;
    tool: string;                   // fully-qualified plugin name
    tool_version: string;
    function_call_id: string;       // UUID — cite this in every derived finding
    timestamp: string;              // ISO-8601 UTC
  };
  pagination: {
    total_results: number;
    returned: number;
    offset: number;
    has_more: boolean;
  };
}
```

The orchestrator (or any agent replacing it) MUST cite
`metadata.function_call_id` on every `CONFIRMED` finding it produces
from this output.
