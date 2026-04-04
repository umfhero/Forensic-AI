# forensic-AI

A hybrid extension of Protocol SIFT that teaches the agent how a senior incident responder thinks: how to sequence an investigation, when to cross-validate between disk and memory, how to catch its own mistakes, and how to produce structured investigative reports rather than raw tool dumps.

Built for the [FIND EVIL! Hackathon](https://findevil.devpost.com/) (SANS Institute, Apr–Jun 2026).

**Team:** Majid, Yasmine, Kalid, Mauro

---

## Table of Contents

1. [What This Project Does](#what-this-project-does)
2. [Architecture](#architecture)
3. [Hackathon Context](#hackathon-context)
4. [Progress Tracker](#progress-tracker)
5. [Submission Checklist](#submission-checklist)
6. [Setup and Dependencies](#setup-and-dependencies)
7. [The Three Layers](#the-three-layers)
8. [Agent Triage Loop](#agent-triage-loop)
9. [Evidence and Case Data](#evidence-and-case-data)
10. [Key Resources](#key-resources)
11. [Open Questions and Unknowns](#open-questions-and-unknowns)
12. [Licence](#licence)

---

## What This Project Does

AI-powered attackers can go from initial access to full domain control in under 8 minutes, and the fastest observed breakout time from CrowdStrike sits at 7 minutes. Defenders are still looking up command-line flags during active incidents, which means the gap between offensive and defensive speed is growing in the wrong direction.

forensic-AI closes that gap by extending Protocol SIFT across three layers: a focused set of custom MCP functions for tools that produce output too large for the agent's context window, a structured reasoning framework (CLAUDE.md skill files) that encodes how a senior analyst sequences and cross-validates an investigation, and a self-correcting triage loop that detects its own errors and re-runs analysis with adjusted parameters.

The emphasis is on reasoning quality and self-correction rather than infrastructure. Protocol SIFT already connects the agent to 200+ SIFT tools via MCP. Our contribution is teaching the agent to think properly about what those tools return.

---

## Architecture

**Approach: Hybrid (Direct Agent Extension + Focused Custom MCP Server)**

```
┌───────────────────────────────────────────────────────────────┐
│                   Self-Correcting Triage Loop                  │
│  5-phase investigative sequence with max-iteration cap         │
│  Draws from team's dissertation work on anti-hallucination     │
│  and AI-assisted terminal workflows                            │
├───────────────────────────────────────────────────────────────┤
│                   Reasoning Framework                          │
│  Structured CLAUDE.md skill files encoding:                    │
│  - Senior analyst investigation sequencing                     │
│  - Disk ↔ memory cross-validation logic                        │
│  - Confidence classification (confirmed / inferred / uncertain)│
│  - Structured report templates                                 │
├───────────────────────────────────────────────────────────────┤
│            Focused Custom MCP Functions (5–8)                  │
│  Typed functions ONLY for tools where raw output is too        │
│  large for context window (Volatility, supertimelines, etc.)   │
│  Structured JSON output with pagination                        │
├───────────────────────────────────────────────────────────────┤
│                Protocol SIFT (foundation)                      │
│  Claude Code / OpenClaw connected to SIFT Workstation          │
│  200+ forensic tools accessible via existing MCP               │
│  CLAUDE.md forensic context files                              │
├───────────────────────────────────────────────────────────────┤
│                  SIFT Workstation                               │
│  Volatility, Autopsy CLI, log2timeline, MFTECmd, RECmd,        │
│  PECmd, and 200+ other forensic/IR tools                       │
├───────────────────────────────────────────────────────────────┤
│              Evidence Store (read-only)                         │
│  Disk images, memory captures, log files, network captures     │
└───────────────────────────────────────────────────────────────┘
```

**Why hybrid instead of pure Custom MCP Server:**

The hackathon's tiebreaker criterion is autonomous execution quality (reasoning, failure handling, self-correction), and IR accuracy is criterion #2. Building a full MCP server from scratch would mean spending most of our time on plumbing rather than on the reasoning that actually decides the winner. Protocol SIFT already gives the agent tool access; our contribution is making it think better about what those tools return.

The team's existing research directly applies here: Mauro's dissertation is an AI terminal that helps with command execution (the core problem Protocol SIFT solves), and Majid's dissertation is an AI-powered purple teaming tool with anti-hallucination mechanisms and structured reporting. Recoding the approaches for this context is straightforward since both are well understood.

We still get architectural guardrails to point to for criterion #4: the custom MCP functions enforce structured output for high-volume tools, the evidence store is read-only at the OS level, and the reasoning framework explicitly classifies findings by confidence level rather than letting the agent present inferences as confirmed facts.

**Security boundaries:**

- Evidence store is mounted read-only at the OS level, so no process can modify original data.
- Custom MCP functions for high-volume tools return structured, parsed JSON rather than raw dumps, preventing context window overload and reducing hallucination from truncated output.
- The reasoning framework enforces confidence classification: every finding must be tagged as CONFIRMED (traced to specific artefact), INFERRED (logical deduction from multiple sources), or UNCERTAIN (flagged for human review).
- Protocol SIFT's existing CLAUDE.md files provide baseline forensic discipline; our skill files extend this with investigation sequencing and cross-validation logic.
- For operations going through Protocol SIFT's existing shell access: the accuracy report will document what guardrails are prompt-based vs architectural, and include bypass testing results. The judges specifically want this honesty.

---

## Hackathon Context

| Detail                  | Value                                                                                                                                            |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Hackathon**           | FIND EVIL! (SANS Institute)                                                                                                                      |
| **URL**                 | https://findevil.devpost.com/                                                                                                                    |
| **Dates**               | 15 Apr – 15 Jun 2026 (submissions), judging 19 Jun – 3 Jul, winners ~8 Jul                                                                       |
| **Architecture**        | Hybrid: Direct Agent Extension (Protocol SIFT foundation) + Focused Custom MCP Server + Structured Reasoning Framework                           |
| **Prize pool**          | $22,000 total (1st $10k, 2nd $7.5k, 3rd $4.5k) + SANS courses and summit passes                                                                  |
| **Licence requirement** | MIT or Apache 2.0 (repo must be public)                                                                                                          |
| **Example submission**  | [Valhuntir by Steve Anson](https://github.com/AppliedIR/Valhuntir) (quality bar to meet/exceed, 280 commits, 79 MCP tools, full examiner portal) |
| **Judge**               | Rob T. Lee (CAIO, SANS Institute, creator of Protocol SIFT)                                                                                      |

**Judging criteria (equally weighted, #1 is tiebreaker):**

1. **Autonomous Execution Quality** (tiebreaker) — does the agent reason about next steps, handle failures, and self-correct in real time?
2. **IR Accuracy** — are findings correct, hallucinations caught and flagged, confirmed findings distinguished from inferences?
3. **Breadth/Depth of Analysis** — depth on fewer data types beats shallow coverage of many.
4. **Constraint Implementation** — are guardrails architectural or prompt-based, and were they tested for bypass?
5. **Audit Trail Quality** — can judges trace any finding back to the specific tool execution that produced it?
6. **Usability and Documentation** — can another practitioner deploy and build on this?

**Three mandatory capabilities every submission must demonstrate:**

1. Self-correction — the agent detects and resolves errors without human intervention.
2. Accuracy validation — all findings traceable to specific artefacts, files, offsets, or log entries.
3. Analytical reasoning — output is a structured investigative narrative, not a raw execution log.

**Our competitive edge on each criterion:**

| Criterion                            | How We Address It                                                                                                                                                                                                              |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| #1 Autonomous Execution (tiebreaker) | Self-correcting triage loop with 5 phases, drawing on Mauro's AI terminal dissertation and Majid's anti-hallucination work. This is where we spend most of our effort.                                                         |
| #2 IR Accuracy                       | Confidence classification system (CONFIRMED / INFERRED / UNCERTAIN), cross-validation between disk and memory, structured reporting that separates findings from speculation.                                                  |
| #3 Breadth/Depth                     | Focus on disk images + memory captures (our strongest forensic domains) rather than trying to cover everything. Depth beats breadth per the criteria.                                                                          |
| #4 Constraint Implementation         | Hybrid guardrails: architectural (custom MCP functions, read-only evidence, structured output parsing) + prompt-based (CLAUDE.md reasoning framework). Bypass testing documented honestly.                                     |
| #5 Audit Trail                       | Every finding traced to specific tool execution via the custom MCP function's structured output (function_call_id, timestamp, source artefact). For Protocol SIFT's shell commands: we capture execution logs with timestamps. |
| #6 Usability/Documentation           | Yasmine and Kali own this from week 1, including try-it-out instructions, architecture diagram, and accuracy report.                                                                                                           |

---

## Progress Tracker

### Phase 0: Pre-Hackathon Setup (before 15 Apr)

- [ ] Download and set up SIFT Workstation (all team members)
- [ ] Install Protocol SIFT on SIFT Workstation: `curl -fsSL https://raw.githubusercontent.com/teamdfir/protocol-sift/main/install.sh | bash`
- [ ] **CRITICAL: Inspect Protocol SIFT's internals** — read the CLAUDE.md files it installs, understand how the existing agent loop works, what tools it calls, how it handles errors (the "Ralph Wiggum Loop" self-correction described in Rob T. Lee's Substack)
- [ ] Run existing Protocol SIFT against sample evidence to understand baseline behaviour, document what it gets right and where it hallucinates
- [ ] Download starter case data from https://sansorg.egnyte.com/fl/HhH7crTYT4JK
- [ ] Review the [Protocol SIFT NotebookLM notebook](https://notebooklm.google.com/notebook/f0957a60-6fb2-452b-93d4-ecd73ba47779?authuser=1) — described as "the chief location to go to for asking questions on how to build it"
- [ ] Review [Valhuntir example submission](https://github.com/AppliedIR/Valhuntir) to understand the quality bar
- [ ] **DECISION: Custom MCP function language** — TypeScript vs Python (see [Open Questions](#open-questions-and-unknowns))
- [ ] **DECISION: API access** — close to start date, ask in Slack about sponsored credits. Plan: cheaper model for dev, Claude credits for final demo/testing, split costs 4 ways (see [Open Questions](#open-questions-and-unknowns))
- [ ] **DECISION: Which Volatility version** — check what SIFT ships and what Protocol SIFT uses
- [ ] Create GitHub repo, MIT licence, initial README, project structure
- [ ] Majid + Mauro: review each other's dissertation approaches, identify what transfers to this context, sketch out the self-correction loop and reasoning framework design
- [ ] Set up development environment on all team members' machines

### Phase 1: Foundation + Protocol SIFT Deep Dive — Weeks 1–2 (15–29 Apr)

**Owner: Majid + Mauro**

- [ ] Deep dive into Protocol SIFT's codebase: understand the existing CLAUDE.md files, MCP tool setup, how it invokes SIFT tools, how it handles errors, what its existing self-correction looks like
- [ ] Identify the specific tools where raw output overflows the context window — these are the candidates for custom MCP functions (likely: Volatility pslist/netscan on large memory images, log2timeline supertimelines, large EVTX log sets)
- [ ] Scaffold the custom MCP server for those focused functions
- [ ] Define the consistent JSON output schema (status, data, metadata with source artefact path and tool version and function_call_id, timestamp, pagination)
- [ ] Implement first 2–3 custom MCP functions for the highest-priority tools
- [ ] Begin drafting the CLAUDE.md reasoning framework: investigation sequencing logic, confidence classification system
- [ ] Get the agent calling custom MCP functions alongside Protocol SIFT's existing tools

**Owner: Yasmine + Kali**

- [ ] Set up SIFT Workstation and run through the existing Protocol SIFT against sample evidence
- [ ] Document Protocol SIFT baseline in detail: what it gets right, where it hallucinates, what it misses, how its existing self-correction works (or fails)
- [ ] Begin architecture diagram draft
- [ ] Explore the starter case data — document what's in each evidence set and what "ground truth" looks like
- [ ] Track all resources and announcements posted to the Slack

### Phase 2: Reasoning Framework + Self-Correction — Weeks 3–4 (30 Apr – 13 May)

**Owner: Majid + Mauro**

- [ ] Build the structured CLAUDE.md reasoning framework (the core novel contribution):
  - [ ] Investigation sequencing: how to decide what to run first, what to run next based on findings
  - [ ] Cross-validation logic: disk ↔ memory comparison rules, what discrepancies mean, when to flag vs when to resolve
  - [ ] Confidence classification: rules for when a finding is CONFIRMED, INFERRED, or UNCERTAIN
  - [ ] Anti-hallucination mechanisms: adapted from Majid's dissertation work — how the agent checks its own claims against the actual tool output
  - [ ] Structured report templates: final output format that the synthesis phase targets
- [ ] Build the self-correction loop (adapted from Mauro's AI terminal approach):
  - [ ] Phase 1 (initial survey) and Phase 2 (targeted deep-dive) of the triage loop
  - [ ] Error detection: agent evaluates its own output for gaps, contradictions, unsupported claims
  - [ ] Re-run logic: how the agent adjusts parameters and re-invokes tools
  - [ ] Max-iteration cap (3–5 cycles) with graceful degradation
- [ ] Implement remaining custom MCP functions as needed (only for tools where structured output genuinely helps)

**Owner: Yasmine + Kali**

- [ ] Run the agent against sample evidence as the reasoning framework develops
- [ ] Document every output — compare to Protocol SIFT baseline, note improvements and regressions
- [ ] Start building the accuracy report template (false positives, missed artefacts, hallucination tracking)
- [ ] Kali begins documenting local setup process (will become the try-it-out instructions)

### Phase 3: Cross-Validation + Refinement — Weeks 5–6 (14–27 May)

**Owner: Majid + Mauro**

- [ ] Build Phase 3 of triage loop: cross-validation between disk and memory findings (this is where our forensic experience matters most — we know what discrepancies between Autopsy and Volatility actually mean)
- [ ] Build Phase 4 of triage loop: full self-correction with documented iteration traces
- [ ] Build Phase 5: synthesis into structured investigative narrative with confidence classifications
- [ ] Build the structured execution logging system (timestamps, token usage, function call IDs, iteration traces)
- [ ] Refine the reasoning framework based on test results — which sequencing decisions work, which don't, what cross-validation rules catch real issues vs generate noise
- [ ] Prompt engineering refinement: iterate on the CLAUDE.md skill files based on actual agent behaviour

**Owner: Yasmine + Kali**

- [ ] Run full triage sequences and document self-correction behaviour — does the agent actually catch errors, does it improve on subsequent passes?
- [ ] Build the accuracy report with real data from test runs
- [ ] Update architecture diagram to reflect final component relationships and trust boundaries
- [ ] Test bypass scenarios: what happens when the agent tries to run destructive commands? What happens when it ignores the confidence classification instructions? Document the results honestly.
- [ ] Distinguish prompt-based vs architectural guardrails clearly in the diagram

### Phase 4: Polish, Demo, Submit — Weeks 7–8 (28 May – 15 Jun)

**Owner: Everyone**

- [ ] Full integration testing across multiple evidence sets
- [ ] Switch to Claude credits for final testing and demo recording
- [ ] Clean up and format execution logs for submission
- [ ] Record demo video (max 5 min, live terminal with audio narration, must show at least one self-correction sequence)
- [ ] Write the Devpost project story (What it does, How we built it, Challenges, What we learned, What's next — be specific about design decisions and the hybrid approach rationale)
- [ ] Finalise README with complete setup instructions
- [ ] Final accuracy report pass
- [ ] Finalise dataset documentation (what was tested, source of data, what the agent found)
- [ ] Ensure all execution logs are structured, timestamped, and traceable
- [ ] Final review: every finding in the demo traceable to a specific tool execution
- [ ] Clearly document what is novel contribution vs what is Protocol SIFT foundation (required by rules)
- [ ] **Submit by 15 June 23:45 EDT**

---

## Submission Checklist

All eight components are mandatory — missing any one results in elimination.

| #   | Deliverable                                          | Owner                            | Notes                                                                                                                                                                                                   |
| --- | ---------------------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Code Repository** (GitHub, public, MIT/Apache 2.0) | Majid + Mauro                    | Licence must be visible in repo About section. Novel contribution clearly documented.                                                                                                                   |
| 2   | **Demo Video** (5 min max)                           | Kali (production), All (content) | Live terminal screencast with audio narration, not slides or marketing. Must show at least one self-correction sequence.                                                                                |
| 3   | **Architecture Diagram**                             | Yasmine                          | Must identify the hybrid architectural pattern, document where security boundaries are enforced, clearly distinguish prompt-based vs architectural guardrails.                                          |
| 4   | **Written Project Description**                      | Yasmine + Majid                  | Devpost story format. Be specific about the hybrid approach rationale, dissertation research that informed the design, and tradeoffs made.                                                              |
| 5   | **Dataset Documentation**                            | Yasmine                          | What the agent was tested against, source of data, what it found. Reproducibility starts here.                                                                                                          |
| 6   | **Accuracy Report**                                  | Yasmine + Kali                   | False positives, missed artefacts, hallucinated claims. Evidence integrity approach documented. Bypass test results for both architectural and prompt-based guardrails. Honesty valued over perfection. |
| 7   | **Try-It-Out Instructions**                          | Kali                             | Step-by-step instructions to run on SIFT Workstation. All dependencies documented in README. Must include Protocol SIFT as prerequisite.                                                                |
| 8   | **Agent Execution Logs**                             | Mauro                            | Structured logs with timestamps and token usage. Every finding traceable to specific tool execution. Self-correction iteration traces showing how the agent's approach changed between passes.          |

---

## Setup and Dependencies

> **This section will be filled in as decisions are made and Protocol SIFT is inspected. Placeholder entries marked with ⚠️ need resolution.**

### Prerequisites

- SANS SIFT Workstation (download OVA from https://www.sans.org/tools/sift-workstation, credentials provided on download page)
- Protocol SIFT installed on top: `curl -fsSL https://raw.githubusercontent.com/teamdfir/protocol-sift/main/install.sh | bash`
- ⚠️ **Agentic framework** — Claude Code (requires Anthropic API key) or OpenClaw (open-source alternative). Plan: cheaper model for dev, Claude for final demo.
- ⚠️ **Custom MCP function runtime** — depends on language decision (Node.js for TypeScript, Python 3.10+ for Python)
- Git

### Installation

⚠️ **To be written once Protocol SIFT is inspected and the custom MCP server scaffold exists.**

```bash
# Placeholder — will be replaced with actual setup steps
# Step 1: SIFT Workstation + Protocol SIFT (prerequisite)
# Step 2: Clone this repo
git clone https://github.com/<org>/forensic-AI.git
cd forensic-AI
# Step 3: Install custom MCP functions
# Step 4: Deploy reasoning framework (CLAUDE.md skill files)
# Step 5: Configure agent
```

---

## The Three Layers

Our novel contribution sits in three layers on top of Protocol SIFT:

### Layer 1: Focused Custom MCP Functions (5–8 functions)

These are NOT a full MCP server wrapping all 200+ SIFT tools. They are typed functions specifically for tools where raw output is too large for the context window and needs structured parsing before the agent sees it.

**Candidates (to be confirmed after inspecting Protocol SIFT and testing with sample evidence):**

| Function                | Underlying Tool        | Why It Needs Custom MCP                                                                                                                                                   |
| ----------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `vol_pslist()`          | Volatility 3           | Process listings on large memory images can be thousands of lines. Structured JSON with filtering by PID, time range, or suspicious indicators prevents context overflow. |
| `vol_netscan()`         | Volatility 3           | Network connection tables are similarly large. Structured output with filtering by connection state, remote address, or PID.                                              |
| `vol_malfind()`         | Volatility 3           | Injected code detection output includes hex dumps that are massive. Structured summary with the key indicators (PID, protection flags, PE header presence) extracted.     |
| `build_supertimeline()` | log2timeline / plaso   | Supertimelines can be millions of entries. Structured output with time range filtering and aggregation is essential.                                                      |
| `parse_event_logs()`    | EvtxECmd / evtx parser | Large EVTX files produce enormous output. Structured parsing with filtering by event ID, time range, and source.                                                          |
| ⚠️ Others TBD           | TBD                    | Will be identified after testing Protocol SIFT with sample evidence — wherever we see context window overflow or the agent struggling with raw output.                    |

Every function returns a consistent JSON schema:

```json
{
  "status": "success | error | partial",
  "data": {},
  "metadata": {
    "source_artefact": "/path/to/evidence/file",
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

### Layer 2: Reasoning Framework (CLAUDE.md Skill Files)

This is the core novel contribution. Structured skill files that encode how a senior incident responder sequences and validates an investigation. Protocol SIFT's existing CLAUDE.md files provide tool knowledge and basic forensic discipline; ours extend that with investigative logic.

**Planned skill files:**

| Skill File                     | Purpose                                                                                                                                                                                                                                          |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `INVESTIGATION_SEQUENCING.md`  | Rules for what to run first, how to choose the next step based on findings, when to go broad vs when to go deep. Encodes the decision tree a senior analyst follows.                                                                             |
| `CROSS_VALIDATION.md`          | Disk ↔ memory comparison rules. What it means when Amcache shows an executable but Prefetch has no record. What it means when disk timestamps and memory process creation times don't align. When to flag discrepancies vs when to resolve them. |
| `CONFIDENCE_CLASSIFICATION.md` | Rules for tagging findings as CONFIRMED (traced to specific artefact with tool output), INFERRED (logical deduction from multiple sources, explicitly stated), or UNCERTAIN (flagged for human review with explanation of what's missing).       |
| `ANTI_HALLUCINATION.md`        | Adapted from Majid's dissertation. Mechanisms for the agent to check its own claims against actual tool output. Rules for what counts as evidence vs what is speculation. Explicit instructions to say "I don't know" rather than fabricate.     |
| `REPORT_STRUCTURE.md`          | Template for the final investigative narrative. Sections, ordering, how to present confirmed vs inferred findings, how to note gaps, how to trace claims to evidence.                                                                            |
| `SELF_CORRECTION.md`           | Adapted from Mauro's AI terminal work. The self-correction protocol: when to re-run, how to adjust parameters, how to document what changed between iterations, when to stop and flag as uncertain.                                              |

> **This is where the team's dissertation research directly transfers.** The concepts are well understood, the approaches are proven in their respective domains, and the recoding for a forensic context is straightforward. This is also the layer that most other teams are unlikely to have specific research backing for, which makes it our genuine competitive advantage.

### Layer 3: Self-Correcting Triage Loop

The agent execution layer that ties everything together. See [Agent Triage Loop](#agent-triage-loop) for the full five-phase sequence.

---

## Agent Triage Loop

The agent follows a structured five-phase analytical sequence:

| Phase | Name                   | What the Agent Does                                                                                                                                                                                                                                                                                                                           |
| ----- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | **Initial Survey**     | Runs broad-scope functions (pslist, supertimeline, event logs) to establish a baseline understanding of the system. Identifies time windows of interest and suspicious processes. Uses INVESTIGATION_SEQUENCING.md to decide what to run.                                                                                                     |
| 2     | **Targeted Deep-Dive** | Based on Phase 1 findings, selects specific functions for deeper analysis. If pslist flagged a suspicious PID, the agent runs malfind, handles, dlllist, and cmdline for that PID. If the timeline showed unusual activity in a specific window, the agent narrows event log parsing to that period.                                          |
| 3     | **Cross-Validation**   | Compares findings across data sources using CROSS_VALIDATION.md rules. If disk artefacts say a file was created at time X but memory shows the process started at time Y, the agent flags the discrepancy. If Amcache shows an executable but Prefetch has no record of it, the agent notes the gap and assesses what it means.               |
| 4     | **Self-Correction**    | The agent evaluates its own analysis using ANTI_HALLUCINATION.md and SELF_CORRECTION.md. Are there unexplained gaps? Did it make assumptions not supported by evidence? Are any claims tagged CONFIRMED that should be INFERRED? It re-runs targeted functions with adjusted parameters and documents what changed. Capped at 3–5 iterations. |
| 5     | **Synthesis**          | Produces a structured investigative narrative using REPORT_STRUCTURE.md. Confirmed findings separated from inferences, unresolved discrepancies noted, every claim traced to a specific tool execution. The output is a report a practitioner could actually use, not a log dump.                                                             |

The self-correction loop has a hard cap of 3–5 iterations to prevent runaway execution. If the agent cannot self-correct within the cap, it flags the finding as UNCERTAIN rather than claiming confidence. This is the behaviour the judges specifically want to see, and it directly addresses Protocol SIFT's known hallucination problem.

---

## Evidence and Case Data

### Starter Evidence

SANS provides sample disk images and memory captures for development and testing:

- **Download:** https://sansorg.egnyte.com/fl/HhH7crTYT4JK
- ⚠️ **Contents TBD** — the specific evidence sets and their ground truth will be documented once we've examined them
- ⚠️ **Additional evidence** may be posted to the Protocol SIFT Slack at launch — monitor the channel

### Evidence Integrity

Evidence is mounted read-only at the OS level (this is standard SIFT Workstation practice). For operations through our custom MCP functions, the functions only read evidence and return structured output. For operations through Protocol SIFT's existing shell access, the agent has theoretical write capability but the CLAUDE.md forensic discipline files instruct against it, and the evidence mount is read-only at the OS level regardless.

The accuracy report will honestly document which guardrails are architectural (read-only mount, structured MCP output) vs prompt-based (CLAUDE.md instructions), and will include bypass testing results. The judges value this honesty explicitly.

---

## Key Resources

### Hackathon

- **Hackathon page:** https://findevil.devpost.com/
- **Rules:** https://findevil.devpost.com/rules
- **Resources page:** https://findevil.devpost.com/resources
- **Protocol SIFT Slack:** https://join.slack.com/t/sansaihackathon/shared_invite/zt-3srjz86zo-bwHi_v1aKTg2IJAU4_4OwA
- **Contact:** aihackathon@sans.org

### Platform

- **SIFT Workstation download:** https://www.sans.org/tools/sift-workstation
- **SIFT GitHub:** https://github.com/teamdfir/sift
- **Protocol SIFT install script:** https://raw.githubusercontent.com/teamdfir/protocol-sift/main/install.sh
- **Starter case data:** https://sansorg.egnyte.com/fl/HhH7crTYT4JK
- **Protocol SIFT NotebookLM:** https://notebooklm.google.com/notebook/f0957a60-6fb2-452b-93d4-ecd73ba47779?authuser=1

### Reference

- **Example submission (quality bar):** [Valhuntir by Steve Anson](https://github.com/AppliedIR/Valhuntir) — full MCP gateway, 79 tools, examiner portal, case management, HMAC-signed approvals, forensic-rag with 22k records
- **Rob T. Lee's Substack on Protocol SIFT:** https://robtlee73.substack.com/p/introducing-protocol-sift-meeting
- **MCP specification:** https://modelcontextprotocol.io
- **Anthropic GTG-1002 report:** https://anthropic.com/news/disrupting-AI-espionage

### Technical

- **Volatility 3 docs:** https://volatility3.readthedocs.io/
- **log2timeline/plaso:** https://plaso.readthedocs.io/
- **Eric Zimmerman's tools (MFTECmd, PECmd, RECmd, etc.):** https://ericzimmerman.github.io/

---

## Open Questions and Unknowns

These are things we either have not decided yet or do not have enough information to resolve right now. Each one should be resolved and this section updated as we go.

### Decisions We Need to Make

| Question                          | Options                                                                                 | Notes                                                                                                                                                                                                                                     | Status                                  |
| --------------------------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| **Custom MCP function language**  | TypeScript or Python                                                                    | Only for the 5–8 custom functions, not a full server. Python has better Volatility integration (Volatility is Python). TypeScript has stronger typing. Valhuntir used Python.                                                             | ⚠️ OPEN                                 |
| **API access for development**    | Cheaper model (GPT-4o, Gemini, local model via OpenClaw) for dev, Claude for final demo | Ask in Slack about sponsored credits close to start date. Budget: split Claude credits 4 ways for final testing. MCP functions and reasoning framework are model-agnostic.                                                                | ⚠️ OPEN — ask about credits near 15 Apr |
| **Which Volatility version**      | Volatility 2 vs Volatility 3                                                            | SIFT ships both. V3 is actively maintained with cleaner API but some V2 plugins aren't ported. Check what Protocol SIFT uses after installing.                                                                                            | ⚠️ OPEN — resolve after SIFT install    |
| **Repo org vs personal**          | GitHub org or personal account with collaborators                                       | Org looks more professional on CVs but adds setup overhead.                                                                                                                                                                               | ⚠️ OPEN                                 |
| **How many custom MCP functions** | 5–8 as planned, or more/fewer                                                           | Depends entirely on what we find when testing Protocol SIFT with sample evidence. If the existing setup handles most tools fine, we might only need 3–4 custom functions. If context overflow is worse than expected, we might need more. | ⚠️ OPEN — resolve in Week 1             |

### Things We Do Not Know Yet

| Unknown                                                         | Why It Matters                                                                                                                                                                                      | How We'll Find Out                                                              |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| **What Protocol SIFT's internals actually look like**           | We're building on top of it — we need to understand the existing CLAUDE.md files, tool invocation patterns, error handling, and the "Ralph Wiggum Loop" self-correction before we can improve on it | Install and inspect in Phase 0 / Week 1                                         |
| **What specific evidence sets are in the starter data**         | Determines which custom MCP functions we prioritise and what ground truth we can validate against                                                                                                   | Download from the Egnyte link and examine                                       |
| **Whether SANS will provide sponsored API credits**             | Affects budget and development velocity                                                                                                                                                             | Ask in Slack close to launch, monitor announcements                             |
| **Exact tool versions on the current SIFT Workstation**         | Custom MCP function implementations need to match actual tool CLI flags and output formats                                                                                                          | Check after SIFT install (`vol --version`, `MFTECmd --version`, etc.)           |
| **How bad Protocol SIFT's hallucination problem actually is**   | The hackathon exists because Protocol SIFT "hallucinates more than we'd like." Understanding the baseline hallucination rate tells us what our self-correction loop needs to beat.                  | Run Protocol SIFT against sample evidence and document findings vs ground truth |
| **Whether the hackathon will release additional evidence sets** | More evidence = better accuracy report, better demo                                                                                                                                                 | Monitor Slack and the Devpost updates page                                      |
| **How the NotebookLM notebook structures its guidance**         | Could change our approach if there are preferred patterns or anti-patterns we haven't seen                                                                                                          | Work through the notebook before building                                       |
| **What other teams are building**                               | Helps us understand what's differentiated vs what everyone else is also doing                                                                                                                       | Monitor Slack, Devpost discussions, and project gallery as it populates         |

### Things to Watch For

- **Devpost updates page** (https://findevil.devpost.com/updates) — check weekly for announcements, rule clarifications, or additional resources
- **Slack #announcements channel** — primary source for launch-day information
- **Other teams' questions in Slack** — sometimes reveal requirements or edge cases we haven't considered
- **Valhuntir repo updates** — Steve Anson's example submission is actively developed (v0.5.4 as of Mar 2026, 280 commits), so the quality bar may continue to rise
- **Protocol SIFT repo updates** — the foundation we're building on may change during the hackathon period

---

## Licence

MIT — see [LICENCE](LICENCE)
