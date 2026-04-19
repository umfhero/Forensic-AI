# Tool Inventory

Every SIFT tool the agent can invoke, with version, purpose, and raw output format. Feeds the accuracy report (each finding links to a tool in this list) and the decision of which tools need custom MCP wrappers.

| Tool                 | Version       | Called for                                       | Raw output format   | MCP wrapper           | Notes                                           |
| -------------------- | ------------- | ------------------------------------------------ | ------------------- | --------------------- | ----------------------------------------------- |
| Volatility 3         | _TBD on SIFT_ | Memory analysis (pslist, netscan, malfind, etc.) | text tables         | `vol_pslist`, `vol_netscan`, `vol_malfind` (planned) | Confirm whether SIFT ships vol2 or vol3 |
| Plaso / `log2timeline` | _TBD_       | Super-timeline construction                      | CSV / JSON          | `build_supertimeline`  | Long-running; stream progress                  |
| Sleuthkit `fls`      | _TBD_         | File system listing / deleted entries            | text                | planned                | Wrap once filesystem triage phase lands         |
| `evtxdump`/EvtxECmd  | _TBD_         | Windows event log parsing                        | XML / JSON          | `parse_event_logs` (planned) |                                           |
| `strings` / `bulk_extractor` | _TBD_ | Artefact extraction from unallocated             | text                | possibly              | Only if indicator triage proves valuable        |
| `hashdeep` / `sha256sum` | _TBD_     | Evidence integrity hashing                       | text                | internal (not agent-facing) | Runs at ingest; logs to execution log |

Columns are filled as each SIFT tool is first used on the VM. _TBD_ values are resolved during Khalid's Phase 0 SIFT walkthrough.

## Why an MCP wrapper

A tool is wrapped when at least one of the following is true:

1. The raw output is unstructured and needs parsing before a finding can cite it.
2. The agent needs to reason over the output and would otherwise have to re-parse every invocation.
3. The tool can accept destructive flags that must be filtered out at schema level (see `governance/GUARDRAILS.md` EI-2).

Tools not meeting any of the three stay as shell invocations in the terminal, with their stdout captured into the execution log.

## Update log

| Date         | Change                          | By      |
| ------------ | ------------------------------- | ------- |
| 2026-04-19   | Initial template.               | Yasmine |
