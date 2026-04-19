# REPORT_STRUCTURE

> The final-output template the Phase 5 synthesis step targets. Matches the
> Report pane in the desktop app (see `desktop/src/components/ReportView.tsx`)
> and the wire format in `docs/WIRE_FORMAT.md`.

Reports are structured, not narrative. Every claim is tagged with its
confidence classification, every claim is traceable to a specific tool
invocation, and the sections are ordered so a reader can see the confirmed
facts first and the speculation last.

---

## Top-Level Structure

Every report has exactly these sections, in this order. Missing data in a
section is stated explicitly rather than silently omitted.

1. **Case Header** — case ID, evidence inventory, analyst (agent version),
   investigation start / end timestamps, summary counts.
2. **Executive Summary** — three to seven bullet points, each one a
   `CONFIRMED` finding, plain English, no jargon. No inferences here.
3. **Confirmed Findings** — every `CONFIRMED` finding, grouped by kill-chain
   stage.
4. **Inferred Findings** — every `INFERRED` finding, each with its reasoning
   chain pointing at the confirmed findings it depends on.
5. **Flagged for Review (Uncertain)** — every `UNCERTAIN` finding, with the
   specific evidence gap and the follow-up that would resolve it.
6. **Timeline** — chronological merged view of the CONFIRMED findings and
   any INFERRED findings that have a clear timestamp.
7. **Artefact Inventory** — every source artefact touched during the
   investigation (path, hash if computed, and the `function_call_id`s that
   referenced it).
8. **Tool Invocations** — the audit trail: every MCP call and every shell
   command, with parameters, exit codes, and links to the findings they
   produced.
9. **Open Questions and Recommendations** — what the agent could not
   resolve, what human follow-up is suggested, and any guardrails the agent
   hit.

---

## Kill-Chain Grouping

Within **Confirmed Findings** and **Inferred Findings**, group by the
stage of the intrusion the finding belongs to. Use the Lockheed Martin kill
chain for consistency with Protocol SIFT's existing terminology:

1. Reconnaissance
2. Weaponisation
3. Delivery
4. Exploitation
5. Installation
6. Command and Control
7. Actions on Objectives

Findings that do not map cleanly to a stage go under a trailing
**Unclassified Activity** subsection rather than being forced into a stage.

---

## Finding Rendering Rules

Every finding, regardless of section, renders with the same shape. This is
the contract the desktop's Report pane and the MCP wire format both honour.

```
[CONFIRMED | INFERRED | UNCERTAIN] <one-line finding statement>

Phase            : <1–5>
Source           : <tool name or "cross-validation">
Function call IDs: <uuid>[, <uuid>, ...]
Source artefacts : <path>[, <path>, ...]
Kill chain stage : <stage name, or "n/a">
Timestamp        : <ISO-8601>   (only when the finding is about a moment in time)

Evidence:
    <verbatim or near-verbatim excerpt of the tool output that supports the claim>

Reasoning:         (INFERRED only)
    <explicit chain of CONFIRMED findings that produce this inference>
    Alternative explanations: <enumerated, or "none identified">

Gaps:              (UNCERTAIN only)
    What we know  : <facts established so far>
    What is missing: <specific gaps>
    Contradictions: <if any>
    Recommended follow-up: <specific tool or artefact to inspect>
```

Rules:

1. Every `CONFIRMED` finding must list at least one `function_call_id` or
   shell command ID. No exceptions.
2. Every `INFERRED` finding must reference two or more other findings (which
   may themselves be CONFIRMED or INFERRED) in its reasoning block.
3. Every `UNCERTAIN` finding must name the specific follow-up that would
   resolve the uncertainty. "Needs more investigation" is not acceptable.
4. Evidence blocks are verbatim where possible. Where an excerpt is
   truncated for length, the truncation is marked with `[…]` and the
   `function_call_id` is sufficient to retrieve the full record.

---

## Executive Summary Rules

- Three to seven bullets. Fewer is fine; more is noise.
- Each bullet is `CONFIRMED`. The executive summary is not the place for
  speculation.
- Write in past tense, active voice, naming the acting process or user
  where known. Example: *"powershell.exe (PID 2112) established an
  outbound TLS connection to 185.220.101.34:4444 at 09:15:33 UTC on
  2026-03-15."*
- If there are no `CONFIRMED` findings yet, the Executive Summary states
  so in one line and the report proceeds to the Uncertain section.

---

## Tool Invocations Audit Trail

Every MCP tool call and every shell command executed during the
investigation is recorded in this section, in chronological order. The
desktop app populates this automatically from the structured output
metadata; the report template below is what judges see.

```
id:          <function_call_id>
tool:        <tool name>
arguments:   <JSON of arguments passed>
started_at:  <ISO-8601>
exit_code:   <int>
produced:    <list of finding IDs this call contributed to>
notes:       <anything exceptional, e.g. timeout, retry, reduced-scope rerun>
```

This is the section that satisfies judging criterion #5 (audit trail
quality). A judge should be able to pick any finding in the report, find
its `function_call_id` in this section, and understand exactly how that
finding was produced.

---

## Anti-Hallucination Hooks in the Report

Before emitting a report, the agent runs the self-checks from
`ANTI_HALLUCINATION.md` across every finding. Any finding that fails a
check is either demoted or removed, and the demotion is recorded in the
Tool Invocations section with a note explaining what triggered it. The
final report is allowed to contain fewer findings than were seen during
the investigation; it is not allowed to contain findings that cannot be
justified.

---

## Open Questions and Recommendations

The last section is an honest statement of the limits of this
investigation. It includes:

- Uncertainties that the agent could not close within its iteration cap.
- Artefacts the agent was unable to access (permission errors, missing
  evidence, unsupported file formats).
- Guardrails the agent hit (e.g. refused to modify evidence, refused to
  exfiltrate artefacts) and what the user asked that triggered them.
- Suggested next steps for a human analyst, specific enough to be
  actionable (which artefact, which tool, which time window).

This section is part of the submission value, not a weakness. The
hackathon judges explicitly asked for honesty about limits (judging
criterion #4).
