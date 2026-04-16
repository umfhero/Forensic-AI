# Majid's Tasks — forensic-AI

**Role: Lead Developer & Project Lead**

Wlead the technical build while keeping everything coherent across the group. The self-correcting triage loop and the reasoning framework are the two things that win this hackathon, and both draw directly from the dissertation, making the role the right fit to drive them. Alongside building, architectural decisions must be made and everyone else unblocked when stuck.

---

## Phase 0 — Pre-Hackathon Setup (before 15 Apr)

- [ ] Set up SIFT Workstation locally and install Protocol SIFT: `curl -fsSL https://raw.githubusercontent.com/teamdfir/protocol-sift/main/install.sh | bash`
- [ ] Do a thorough read of Protocol SIFT's internals, specifically the existing CLAUDE.md files, how it invokes SIFT tools, what the "Ralph Wiggum Loop" actually looks like in code, and where it visibly fails
- [ ] Run Protocol SIFT against the starter case data (https://sansorg.egnyte.com/fl/HhH7crTYT4JK) and note where it hallucinates, misses artefacts, or produces raw output that floods the context
- [ ] Go through the Protocol SIFT NotebookLM notebook (link in overview.md) and take notes on anything that changes the approach
- [ ] Review Valhuntir (https://github.com/AppliedIR/Valhuntir) to understand the quality bar being built to
- [ ] Sit down with Mauro and map out how the two dissertations translate to this context — the anti-hallucination mechanisms into `ANTI_HALLUCINATION.md`, the AI terminal approach into `SELF_CORRECTION.md`
- [ ] Create the GitHub repo, add MIT licence, set up the initial folder structure
- [ ] **Decide: TypeScript vs Python for the custom MCP functions** (Python recommended for Volatility integration, but make the call after seeing Protocol SIFT's internals)
- [ ] Ask in the Protocol SIFT Slack about sponsored API credits before committing to any spend

---

## Phase 1 — Foundation + Protocol SIFT Deep Dive (Weeks 1–2, 15–29 Apr)

- [ ] Lead the deep dive into Protocol SIFT's codebase with Mauro, assign specific components for each to own
- [ ] Identify every tool where raw output overflows the context window — these are the custom MCP function candidates (pslist, netscan, malfind on large memory images; supertimelines; large EVTX sets)
- [ ] Design the consistent JSON output schema for all custom MCP functions (status, data, metadata with source artefact path and tool version and function_call_id, timestamp, pagination)
- [ ] Scaffold the custom MCP server and implement the first 2–3 functions: `vol_pslist()` and `build_supertimeline()` should be the priority since they're the most likely to overflow
- [ ] Begin drafting `INVESTIGATION_SEQUENCING.md` — the decision tree a senior analyst follows when choosing what to run next
- [ ] Begin drafting `CONFIDENCE_CLASSIFICATION.md` — rules for CONFIRMED, INFERRED, UNCERTAIN tagging
- [ ] Verify the agent can call custom MCP functions alongside Protocol SIFT's existing tools and that both return cleanly

---

## Phase 2 — Reasoning Framework + Self-Correction (Weeks 3–4, 30 Apr–13 May)

- [ ] Build the full CLAUDE.md reasoning framework, drawing directly from the dissertation:
  - [ ] `ANTI_HALLUCINATION.md` — adapt the anti-hallucination mechanisms to forensic context, including explicit rules for what counts as evidence vs speculation, and instructions to output UNCERTAIN rather than fabricate
  - [ ] `CROSS_VALIDATION.md` — disk/memory comparison rules: what it means when Amcache shows an executable but Prefetch has no record, when timestamps don't align between disk and memory, when to flag a discrepancy vs resolve it
  - [ ] `REPORT_STRUCTURE.md` — the final output template, including how to separate confirmed findings from inferences and how to trace every claim back to a specific tool execution
- [ ] Build Phase 1 and Phase 2 of the triage loop (Initial Survey and Targeted Deep-Dive), with the agent using `INVESTIGATION_SEQUENCING.md` to choose what to run
- [ ] Implement remaining custom MCP functions (add `vol_netscan()`, `vol_malfind()`, `parse_event_logs()` as needed based on test results)
- [ ] Review Yasmine and Kali's test outputs and adjust the reasoning framework where the agent is making the wrong sequencing decisions

---

## Phase 3 — Cross-Validation + Refinement (Weeks 5–6, 14–27 May)

- [ ] Build Phase 3 of the triage loop: cross-validation between disk and memory findings using `CROSS_VALIDATION.md`
- [ ] Build Phase 4: full self-correction loop with documented iteration traces, error detection, re-run logic, and the hard cap at 3–5 iterations
- [ ] Build Phase 5: synthesis into the structured investigative narrative via `REPORT_STRUCTURE.md`, with confidence classifications on every finding
- [ ] Build the structured execution logging system — every finding needs a timestamp, a function_call_id, and a source artefact path so judges can trace it
- [ ] Iterate on all CLAUDE.md skill files based on what the test runs reveal: which sequencing rules work, which cross-validation logic catches real issues vs generates noise
- [ ] Work through Yasmine's bypass test results with Mauro and patch any guardrail weaknesses before the final phase

---

## Phase 4 — Polish, Demo, Submit (Weeks 7–8, 28 May–15 Jun)

- [ ] Full integration testing across all available evidence sets
- [ ] Switch to Claude API credits for final testing and demo recording
- [ ] Co-write the Devpost project description with Yasmine — be specific about the hybrid approach rationale, how the dissertations informed the design, and what tradeoffs were made
- [ ] Final review of every submission component before Yasmine checks them off the checklist
- [ ] **Submit by 15 June 23:45 EDT**

---

## Submission Components Owned

| #   | Deliverable                 | Role                     |
| --- | --------------------------- | ------------------------ |
| 1   | Code Repository             | Lead (with Mauro)        |
| 4   | Written Project Description | Co-author (with Yasmine) |

---

## Key Files Being Built

- `INVESTIGATION_SEQUENCING.md`
- `CONFIDENCE_CLASSIFICATION.md`
- `ANTI_HALLUCINATION.md`
- `CROSS_VALIDATION.md`
- `REPORT_STRUCTURE.md`
- Custom MCP functions (Python or TypeScript, TBD)
- Triage loop phases 1–5

---

## Decisions Needed

- TypeScript vs Python for MCP functions (resolve in Week 1)
- How many custom MCP functions are actually needed (resolve after Protocol SIFT inspection)
- Which Volatility version to target (check after SIFT install)
- GitHub org vs personal account with collaborators

All of these are logged in the Open Questions section of `overview.md` — update it once each one is resolved.
