# Mauro's Tasks — forensic-AI

**Role:** Backend Developer & Execution Systems Lead — owns the MCP server, the execution logging system, the self-correction loop, and the AI terminal inside the desktop app.

---

## Now — In Flight

- [ ] Review the MCP server scaffold in `mcp-server/` and the `McpBridge` in `desktop/electron/mcpBridge.ts`
- [ ] Review the xterm `TerminalView` in `desktop/src/components/TerminalView.tsx`
- [ ] Confirm the stdio transport works end-to-end (start server → list tools → call tool from the UI)

## Desktop App — AI Terminal (port dissertation work)

- [ ] Wire the embedded xterm terminal to a real AI agent session (Claude Code subprocess or Anthropic API direct)
- [ ] Route terminal input → agent → tool calls (via the existing MCP bridge) → terminal output
- [ ] Add an "agent is thinking" indicator in the status bar (dot turns `accent-active`)
- [ ] Add command history + up-arrow recall in the terminal
- [ ] Port anti-hallucination guardrails from the dissertation as visible UI signals (confidence badges, blocked-command warnings)

## MCP Tools (backend)

- [ ] Replace mock data in `vol_pslist`, `vol_netscan`, `build_supertimeline` with real execution once SIFT VM is set up
- [ ] Validate CLI flags and output formats against the actual Volatility 3 / log2timeline versions SIFT ships
- [ ] Add `vol_malfind` tool (pair with Majid)
- [ ] Add `parse_event_logs` tool (pair with Majid)
- [ ] Lock in a single shared error-result format across all tools

## Self-Correction Loop

- [ ] Draft `skills/SELF_CORRECTION.md` — port the AI-terminal re-run logic: when to retry, how to adjust params, what to do at the iteration cap
- [ ] Build Phase 4 of the triage loop in code (evaluates own analysis, re-runs with adjusted params, caps at 3–5 iterations)
- [ ] Surface each iteration in the desktop app's phase indicator (`i1`, `i2`, `i3`…)

## Execution Logging System

- [ ] Define a structured log schema: `{ timestamp, phase, iteration, function_call_id, tool, args, status, source_artefact, reasoning }`
- [ ] Write logs to `mcp-server/logs/<session-id>.jsonl` during every run
- [ ] Expose a log viewer pane in the desktop app (or pipe into the existing Diagnostics panel)
- [ ] Agree the "Why Log" format with Yasmine so chain-of-custody entries and execution logs line up

## Packaging

- [ ] Add `electron-builder` config to `desktop/` for Linux AppImage (SIFT VM target)
- [ ] Verify the packaged app launches on a clean SIFT Workstation install
- [ ] Add macOS DMG + Windows installer targets as stretch goals for local dev machines

## Testing

- [ ] End-to-end test: desktop app → MCP bridge → MCP server → mock tool → UI update → log entry written
- [ ] Trace every finding in a demo run back to its `function_call_id` in the logs (this is what criterion #5 checks)
- [ ] Verify self-correction iterations actually change the output between passes

## Submit

- [ ] Clean execution logs for submission (strip noise, keep structure)
- [ ] Support Khalid on setup instructions for the desktop app + MCP server
- [ ] Final review of the code repo before submission

## Submission Components Owned

| # | Deliverable | Role |
|---|---|---|
| 1 | Code Repository | Co-lead (with Majid) |
| 8 | Agent Execution Logs | Lead |

## Key Files & Components

- `mcp-server/src/tools/*.ts` — all 5 MCP tools
- `skills/SELF_CORRECTION.md`
- Execution logging (new, under `mcp-server/src/utils/logging.ts`)
- `desktop/electron/mcpBridge.ts` + AI agent wiring inside `TerminalView`
- Triage loop phases 1, 2, 4 (alongside Majid)
# Mauro's Tasks — forensic-AI

**Role: Backend Developer & Execution Systems Lead**

The dissertation is an AI terminal that handles command execution, which maps directly onto two of the hardest parts of this build: the custom MCP functions and the self-correction loop. Majid is leading the reasoning framework from his side, and the technical implementation is co-led with him, but specific components are owned outright, specifically the MCP server scaffold, the execution logging system, and `SELF_CORRECTION.md`. The agent execution logs are also owned as a submission deliverable.

---

## Phase 0 — Pre-Hackathon Setup (before 15 Apr)

- [ ] Set up SIFT Workstation locally and install Protocol SIFT: `curl -fsSL https://raw.githubusercontent.com/teamdfir/protocol-sift/main/install.sh | bash`
- [ ] Read through Protocol SIFT's codebase carefully, focusing on how it invokes SIFT tools, what the MCP layer looks like under the hood, and what the existing error handling and self-correction behaviour actually does
- [ ] Run Protocol SIFT against the starter case data and note where it produces raw output that overflows context or causes the agent to make bad decisions downstream — these are the custom MCP function targets
- [ ] Sit down with Majid and map how the AI terminal dissertation work translates to the self-correction loop here — specifically the re-run logic, parameter adjustment on retry, and graceful degradation when the cap is hit
- [ ] Check tool versions on SIFT after install: `vol --version`, `MFTECmd --version`, `log2timeline.py --version`, since the MCP function implementations need to match exact CLI flags and output formats

---

## Phase 1 — Foundation + Protocol SIFT Deep Dive (Weeks 1–2, 15–29 Apr)

- [ ] Deep dive into Protocol SIFT's codebase alongside Majid, take ownership of understanding the MCP tool invocation layer specifically
- [ ] Confirm which tools produce context-overflowing output when run against the sample evidence, then lock in the final list of custom MCP functions (targeting 5–8)
- [ ] Scaffold the custom MCP server with the agreed JSON output schema (status, data, metadata with source artefact path and tool version and function_call_id, timestamp, pagination)
- [ ] Implement `vol_pslist()` as the first function — it's the most predictable starting point and getting its JSON schema right sets the pattern for everything else
- [ ] Implement `build_supertimeline()` second, since supertimelines are the most severe context overflow case
- [ ] Confirm the agent can call custom MCP functions alongside Protocol SIFT's existing tools in the same session without conflicts
- [ ] Decide language for the MCP server (Python recommended for Volatility integration) and document the decision in `overview.md` Open Questions

---

## Phase 2 — Reasoning Framework + Self-Correction (Weeks 3–4, 30 Apr–13 May)

- [ ] Build `SELF_CORRECTION.md` — adapted from the AI terminal dissertation. This needs to encode: when the agent should trigger a re-run (unexplained gaps, contradictions between sources, a claim it cannot trace to a specific artefact), how it adjusts parameters on retry, how it documents what changed between iterations, and what it does when the iteration cap is hit (output UNCERTAIN, stop, do not fabricate)
- [ ] Build Phase 1 and Phase 2 of the triage loop alongside Majid: Initial Survey (broad-scope runs using `INVESTIGATION_SEQUENCING.md` to decide what to call) and Targeted Deep-Dive (following up on flagged PIDs, time windows, or suspicious indicators with the appropriate MCP functions)
- [ ] Implement `vol_netscan()`, `vol_malfind()`, and `parse_event_logs()` as needed based on what the test runs reveal
- [ ] Begin the execution logging system: every tool call needs a timestamp, the function name and parameters, the response status, the source artefact path, and a function_call_id so any finding can be traced back to the exact call that produced it

---

## Phase 3 — Cross-Validation + Refinement (Weeks 5–6, 14–27 May)

- [ ] Build Phase 4 of the triage loop: the full self-correction protocol, where the agent evaluates its own analysis for gaps and unsupported claims, re-runs targeted functions with adjusted parameters, documents what changed, and caps at 3–5 iterations
- [ ] Complete the execution logging system to cover the entire triage loop including self-correction iterations — the judges need to see the agent's reasoning change between passes, not just the final output
- [ ] Refine `SELF_CORRECTION.md` based on what the test runs reveal: which re-run triggers work, which parameter adjustments actually improve results, where the cap should realistically be set
- [ ] Work with Yasmine on the "Why Log" format so the chain-of-custody output and the execution logs are consistent with each other
- [ ] Review bypass test results with Majid and patch any issues in the MCP function layer

---

## Phase 4 — Polish, Demo, Submit (Weeks 7–8, 28 May–15 Jun)

- [ ] Full integration testing, focusing on the execution logging output, since the logs are a mandatory submission component and need to be clean and structured
- [ ] Clean up and format the agent execution logs for submission, ensuring every finding in the demo video is traceable in the logs
- [ ] Make sure the self-correction iteration traces are visible in the logs, showing how the agent's approach changed between passes, since this is what the judges specifically want to see
- [ ] Support Kali with the try-it-out instructions for anything MCP-server-specific (setup steps, dependencies, environment variables)

---

## Submission Components Owned

| # | Deliverable | Role |
|---|-------------|-----------|
| 1 | Code Repository | Co-lead (with Majid) |
| 8 | Agent Execution Logs | Lead |

---

## Key Files and Components Being Built

- Custom MCP server scaffold + all custom functions (`vol_pslist()`, `build_supertimeline()`, `vol_netscan()`, `vol_malfind()`, `parse_event_logs()`)
- `SELF_CORRECTION.md` — the self-correction protocol skill file
- Execution logging system (structured, timestamped, function_call_id linked)
- Triage loop phases 1, 2, and 4 (alongside Majid)

---

## Decisions Required

- Confirm language for MCP server after Protocol SIFT inspection (resolve Week 1, update Open Questions in `overview.md`)
- Confirm which Volatility version SIFT ships and which Protocol SIFT uses (check after install)
- Lock in the final JSON output schema for MCP functions before implementing anything beyond `vol_pslist()`, so the pattern is consistent across all functions