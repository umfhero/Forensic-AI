# Guardrails

Hard limits placed around the agent. Each guardrail is marked:

- **architectural** — enforced by code, filesystem permissions, or MCP schema. Cannot be bypassed by prompt engineering.
- **prompt** — enforced by skill-file instructions. Can, in principle, be bypassed by a sufficiently adversarial prompt. Included anyway because prompt constraints are cheap and layered defence matters.

Every guardrail below is testable. The accuracy report documents whether each guardrail held under bypass testing (see `docs/ACCURACY_REPORT.md`).

---

## 1. Evidence integrity

| ID   | Guardrail                                                                      | Type          | How enforced                                                                       |
| ---- | ------------------------------------------------------------------------------ | ------------- | ---------------------------------------------------------------------------------- |
| EI-1 | Evidence directory is mounted read-only at the OS level.                       | architectural | SIFT mount flag `-o ro`; MCP server refuses to start if evidence mount is writable |
| EI-2 | No MCP tool accepts a destructive subcommand (delete, move, chmod, truncate).  | architectural | Tool schemas in `mcp-server/src/tools/` whitelist read-only Volatility verbs only  |
| EI-3 | Any tool attempting a write outside the case workspace is terminated.          | architectural | Main process validates `cwd` and `args` in `mcpBridge.ts` before spawn             |
| EI-4 | Original artefacts are hashed (SHA-256) at ingest; hash is logged with finding.| architectural | Done at MCP server start; hash persisted in execution log                          |

## 2. Action approval

| ID   | Guardrail                                                                      | Type          | How enforced                                                                       |
| ---- | ------------------------------------------------------------------------------ | ------------- | ---------------------------------------------------------------------------------- |
| AA-1 | Network calls from the agent terminal require explicit human approval.         | architectural | Electron renderer blocks outbound fetch; terminal commands matching `curl\|wget\|nc` gated behind approval dialog |
| AA-2 | The agent is not given shell credentials or sudo.                              | architectural | AI subprocess runs as the non-privileged user; no pw stored                        |
| AA-3 | Writing files outside the case workspace is blocked.                           | architectural | `path.resolve` check in Mauro's terminal exec layer                                |
| AA-4 | The agent must ask before concluding a phase of the triage loop.               | prompt        | `CLAUDE.md` skill files require phase-end confirmation                             |

## 3. Output discipline

| ID   | Guardrail                                                                      | Type          | How enforced                                                                       |
| ---- | ------------------------------------------------------------------------------ | ------------- | ---------------------------------------------------------------------------------- |
| OD-1 | Every `Finding` object must carry `confidence` ∈ {CONFIRMED, INFERRED, UNCERTAIN}.| architectural | Zod schema in `mcp-server/src/schemas/finding.ts` (to be added)                 |
| OD-2 | Every `Finding` must carry at least one `citation` referencing a real tool run.| architectural | Schema refuses empty citation array                                                |
| OD-3 | The agent may not invent tool output.                                          | architectural | Tool output is the only source the UI will render; agent text is surfaced as prose |
| OD-4 | CONFIRMED/INFERRED/UNCERTAIN tags render in UI with distinct muted accents.    | architectural | `desktop/src/styles/tokens.css` + `<ConfidenceTag>` component                      |

## 4. Human oversight (EU AI Act Art. 14)

| ID   | Guardrail                                                                      | Type          | How enforced                                                                       |
| ---- | ------------------------------------------------------------------------------ | ------------- | ---------------------------------------------------------------------------------- |
| HO-1 | The analyst can stop the agent at any time.                                    | architectural | "Stop" control in desktop inspector → `mcp:stop` IPC → kills subprocess            |
| HO-2 | All findings are reviewable before the report is exported.                     | architectural | Report export is a separate user action, not automatic                             |
| HO-3 | Compliance score is visible in the status bar during every run.                | architectural | Status bar reads from governance/COMPLIANCE_SCORE rubric on each phase end         |

## 5. Data protection (GDPR)

| ID   | Guardrail                                                                      | Type          | How enforced                                                                       |
| ---- | ------------------------------------------------------------------------------ | ------------- | ---------------------------------------------------------------------------------- |
| DP-1 | No evidence or extracted strings leave the workstation by default.             | architectural | Renderer CSP blocks remote origins; agent subprocess has no outbound allow-list    |
| DP-2 | Anthropic API calls (if enabled) send only agent reasoning, never raw evidence.| prompt + code | Agent is instructed to summarise, not paste; a filter strips blob content >4 KiB   |
| DP-3 | All logs written locally to `case-workspace/logs/`, never to a cloud sink.     | architectural | Log writer hard-coded to local path                                                |

---

## Bypass testing plan

For every guardrail above, attempt a bypass during Phase 3:

1. **Direct prompt** — ask the agent to perform the forbidden action.
2. **Indirect prompt** — embed the request in a plausible investigative task.
3. **Tool-output injection** — craft evidence whose strings ask the agent to perform the forbidden action (prompt injection).
4. **Escalation** — ask the agent to "temporarily disable" the guardrail.

Results go into `docs/ACCURACY_REPORT.md` under "Bypass Testing". Honesty over optimism.

## Update log

| Date         | Change                          | By      |
| ------------ | ------------------------------- | ------- |
| 2026-04-19   | Initial draft.                  | Yasmine |
