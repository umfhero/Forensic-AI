# MCP-Analyst

A purpose-built MCP server that wraps the SANS SIFT Workstation's forensic tools as typed, safe functions, paired with a self-correcting triage agent that reasons over those functions like a senior incident responder.

Built for the [FIND EVIL! Hackathon](https://findevil.devpost.com/) (SANS Institute, Apr–Jun 2026).

**Team:** Majid, Mauro, Yasmine, Kalid

---

## Table of Contents

1. [What This Project Does](#what-this-project-does)
2. [Architecture](#architecture)
3. [Hackathon Context](#hackathon-context)
4. [Progress Tracker](#progress-tracker)
5. [Submission Checklist](#submission-checklist)
6. [Setup and Dependencies](#setup-and-dependencies)
7. [MCP Server Function Reference](#mcp-server-function-reference)
8. [Agent Triage Loop](#agent-triage-loop)
9. [Evidence and Case Data](#evidence-and-case-data)
10. [Key Resources](#key-resources)
11. [Open Questions and Unknowns](#open-questions-and-unknowns)
12. [Licence](#licence)

---

## What This Project Does

AI-powered attackers can go from initial access to full domain control in under 8 minutes, and the fastest observed breakout time from CrowdStrike sits at 7 minutes. Defenders are still looking up command-line flags during active incidents, which means the gap between offensive and defensive speed is growing in the wrong direction.

MCP-Analyst closes that gap by giving an AI agent structured, typed access to the SIFT Workstation's 200+ forensic tools through a custom MCP server, and then layering a self-correcting triage loop on top so the agent can reason about evidence the way a senior analyst would.

The MCP server enforces safety architecturally: the agent physically cannot run destructive commands because the server does not expose them. This is a deliberate contrast to prompt-based guardrails where a sufficiently persistent model can simply ignore instructions. Every function has defined input schemas, structured output formats, and built-in output parsing so large forensic dumps do not overflow the agent's context window.

---

## Architecture

```
┌──────────────────────────────────────────────────────┐
│                    Agent Layer                         │
│  Claude Code / OpenClaw                               │
│  Self-correcting triage loop (5 phases)               │
│  Structured investigative narrative output             │
├──────────────────────────────────────────────────────┤
│                  MCP Server (cortex)                   │
│  Typed forensic functions, structured JSON output      │
│  No shell access, no write operations, no destructive  │
│  commands exposed                                      │
├──────────────────────────────────────────────────────┤
│                  SIFT Workstation                      │
│  200+ forensic tools (Volatility, Autopsy CLI,         │
│  log2timeline, MFTECmd, RECmd, Prefetch parsers, etc.) │
├──────────────────────────────────────────────────────┤
│              Evidence Store (read-only)                │
│  Disk images, memory captures, log files,              │
│  network captures                                      │
└──────────────────────────────────────────────────────┘
```

**Security boundaries (architectural, not prompt-based):**

- Evidence store is mounted read-only at the OS level, so no process can modify original data regardless of what the agent attempts.
- The MCP server only exposes analytical functions: no shell access, no file write operations, no network-modifying tools.
- Every agent claim in the final report is traceable to a specific MCP function call with a specific return value.

---

## Hackathon Context

| Detail                  | Value                                                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Hackathon**           | FIND EVIL! (SANS Institute)                                                                                                                         |
| **URL**                 | https://findevil.devpost.com/                                                                                                                       |
| **Dates**               | 15 Apr – 15 Jun 2026 (submissions), judging 19 Jun – 3 Jul, winners ~8 Jul                                                                          |
| **Architecture**        | Custom MCP Server (one of four supported approaches, and the one the hackathon documentation calls "the most sound architecture in the evaluation") |
| **Prize pool**          | $22,000 total (1st $10k, 2nd $7.5k, 3rd $4.5k) + SANS courses and summit passes                                                                     |
| **Licence requirement** | MIT or Apache 2.0 (repo must be public)                                                                                                             |
| **Example submission**  | [Valhuntir by Steve Anson](https://github.com/AppliedIR/Valhuntir) (this is the quality bar to meet/exceed)                                         |
| **Judge**               | Rob T. Lee (CAIO, SANS Institute)                                                                                                                   |

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

---

## Progress Tracker

### Phase 0: Pre-Hackathon Setup (before 15 Apr)

- [ ] Download and set up SIFT Workstation (all team members)
- [ ] Install Protocol SIFT on SIFT Workstation: `curl -fsSL https://raw.githubusercontent.com/teamdfir/protocol-sift/main/install.sh | bash`
- [ ] Run existing Protocol SIFT against sample evidence to understand baseline behaviour
- [ ] Join Protocol SIFT Slack (done) — monitor for starter resources, sample case data, and any announcements about sponsored API credits
- [ ] Download starter case data from https://sansorg.egnyte.com/fl/HhH7crTYT4JK
- [ ] Review the [Protocol SIFT NotebookLM notebook](https://notebooklm.google.com/notebook/f0957a60-6fb2-452b-93d4-ecd73ba47779?authuser=1) for architecture guidance and Q&A
- [ ] Review [Valhuntir example submission](https://github.com/AppliedIR/Valhuntir) to understand the quality bar (280 commits, full MCP gateway architecture, examiner portal, CLI tooling, case management, HMAC-signed approvals)
- [ ] **DECISION: MCP server language** — TypeScript vs Python (see [Open Questions](#open-questions-and-unknowns))
- [ ] **DECISION: API access** — sort out Anthropic API credits / Claude Code subscription / OpenClaw fallback (see [Open Questions](#open-questions-and-unknowns))
- [ ] Create GitHub repo, MIT licence, initial README, project structure
- [ ] Set up development environment on all team members' machines

### Phase 1: MCP Server Foundation — Weeks 1–2 (15–29 Apr)

**Owner: Majid + Mauro**

- [ ] Scaffold the MCP server (chosen language, project structure, build tooling)
- [ ] Define the consistent JSON output schema for all functions (status, data, metadata with source artefact path and tool version, timestamp)
- [ ] Implement disk analysis functions:
  - [ ] `extract_mft_timeline()` — parse NTFS MFT, return structured timeline entries
  - [ ] `get_amcache()` — extract application execution history from Amcache hive
  - [ ] `analyse_prefetch()` — parse Prefetch files for execution counts and timing
  - [ ] `parse_event_logs()` — structured EVTX parsing with filtering by event ID, time range, source
- [ ] Get a basic agent loop calling the MCP server and returning results
- [ ] Write unit tests for each function against known-good sample data

**Owner: Yasmine + Kali**

- [ ] Set up SIFT Workstation and run through the existing Protocol SIFT
- [ ] Document Protocol SIFT baseline: what it gets right, where it hallucinates, what it misses
- [ ] Begin architecture diagram draft (use the structure from the [Architecture](#architecture) section)
- [ ] Explore the starter case data — understand what "ground truth" looks like for the evidence sets
- [ ] Track all resources and announcements posted to the Slack

### Phase 2: Memory Layer + Agent Reasoning — Weeks 3–4 (30 Apr – 13 May)

**Owner: Majid + Mauro**

- [ ] Implement memory analysis functions:
  - [ ] `vol_pslist()` — list processes with PID, PPID, creation time, command line
  - [ ] `vol_netscan()` — extract network connections and listening ports
  - [ ] `vol_malfind()` — scan for potentially injected code in process memory
  - [ ] `vol_handles()` — list open handles per process (files, registry keys, mutexes)
  - [ ] `vol_dlllist()` — list loaded DLLs per process with full paths
  - [ ] `vol_cmdline()` — extract command-line arguments per process
  - [ ] `vol_filescan()` — scan memory for file objects (including deleted files)
- [ ] Build Phase 1 of triage loop: initial broad survey
- [ ] Build Phase 2 of triage loop: targeted deep-dive based on Phase 1 findings
- [ ] Implement output parsing/pagination for large result sets (context window management)

**Owner: Yasmine + Kali**

- [ ] Run the agent against sample evidence as functions come online
- [ ] Document every output — what matches manual analysis, what diverges
- [ ] Start building the accuracy report template (false positives, missed artefacts, hallucination tracking)
- [ ] Kali begins documenting local setup process (will become the try-it-out instructions)

### Phase 3: Self-Correction + Cross-Validation — Weeks 5–6 (14–27 May)

**Owner: Majid + Mauro**

- [ ] Implement remaining utility functions:
  - [ ] `get_shellbags()` — folder access history from ShellBags registry entries
  - [ ] `extract_registry_key()` — targeted registry hive querying (SYSTEM, SOFTWARE, SAM, NTUSER)
  - [ ] `build_supertimeline()` — log2timeline/plaso comprehensive timeline with time range filtering
- [ ] Build Phase 3 of triage loop: cross-validation between disk and memory findings
- [ ] Build Phase 4 of triage loop: self-correction (agent evaluates its own analysis, re-runs with adjusted parameters, documents what changed)
- [ ] Build the structured execution logging system (timestamps, token usage, function call IDs)
- [ ] Build Phase 5: synthesis into structured investigative narrative
- [ ] Prompt engineering for analytical reasoning quality
- [ ] Implement max-iteration cap for self-correction (3–5 cycles) with graceful degradation

**Owner: Yasmine + Kali**

- [ ] Run full triage sequences and document self-correction behaviour — does the agent actually catch errors, does it improve on subsequent passes?
- [ ] Build the accuracy report with real data from test runs
- [ ] Update architecture diagram to reflect final component relationships and trust boundaries
- [ ] Test bypass scenarios: what happens when the agent requests operations the MCP server does not expose? Document the results.
- [ ] Distinguish prompt-based vs architectural guardrails clearly in the diagram (judges specifically look for this)

### Phase 4: Polish, Demo, Submit — Weeks 7–8 (28 May – 15 Jun)

**Owner: Everyone**

- [ ] Full integration testing across multiple evidence sets
- [ ] Clean up and format execution logs for submission
- [ ] Record demo video (max 5 min, live terminal with audio narration, must show at least one self-correction sequence)
- [ ] Write the Devpost project story (What it does, How we built it, Challenges, What we learned, What's next)
- [ ] Finalise README with complete setup instructions
- [ ] Final accuracy report pass
- [ ] Finalise dataset documentation (what was tested, source of data, what the agent found)
- [ ] Ensure all execution logs are structured, timestamped, and traceable
- [ ] Final review: every finding in the demo traceable to a specific function call
- [ ] **Submit by 15 June 23:45 EDT**

---

## Submission Checklist

All eight components are mandatory — missing any one results in elimination.

| #   | Deliverable                                          | Owner                            | Notes                                                                                                                                                                                        |
| --- | ---------------------------------------------------- | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Code Repository** (GitHub, public, MIT/Apache 2.0) | Majid + Mauro                    | Licence must be visible in repo About section                                                                                                                                                |
| 2   | **Demo Video** (5 min max)                           | Kali (production), All (content) | Live terminal screencast with audio narration, not slides or marketing. Must show at least one self-correction sequence                                                                      |
| 3   | **Architecture Diagram**                             | Yasmine                          | Must identify architectural pattern, document where security boundaries are enforced, clearly distinguish prompt-based vs architectural guardrails                                           |
| 4   | **Written Project Description**                      | Yasmine + Majid                  | Devpost story format: What it does, How we built it, Challenges, What we learned, What's next. Must be specific about design decisions and tradeoffs                                         |
| 5   | **Dataset Documentation**                            | Yasmine                          | What the agent was tested against, source of data, what it found. Reproducibility starts here                                                                                                |
| 6   | **Accuracy Report**                                  | Yasmine + Kali                   | False positives, missed artefacts, hallucinated claims. Evidence integrity approach documented. Bypass test results included. Honesty valued over perfection                                 |
| 7   | **Try-It-Out Instructions**                          | Kali                             | Live URL or step-by-step instructions to run on SIFT Workstation. All dependencies documented in README                                                                                      |
| 8   | **Agent Execution Logs**                             | Mauro                            | Structured logs with timestamps and token usage. Every finding traceable to specific tool execution. For the self-correction loop: iteration traces showing how the agent's approach changed |

---

## Setup and Dependencies

> **This section will be filled in as decisions are made. Placeholder entries marked with ⚠️ need resolution.**

### Prerequisites

- SANS SIFT Workstation (download OVA from https://www.sans.org/tools/sift-workstation, credentials provided on download page)
- Protocol SIFT installed on top: `curl -fsSL https://raw.githubusercontent.com/teamdfir/protocol-sift/main/install.sh | bash`
- ⚠️ **MCP server runtime** — depends on language decision (Node.js for TypeScript, Python 3.10+ for Python)
- ⚠️ **Anthropic API key** — required for Claude Code / OpenClaw agent. Pricing TBD, check Slack for sponsored credits
- Git

### Installation

⚠️ **To be written once the MCP server scaffold exists.**

```bash
# Placeholder — will be replaced with actual setup steps
git clone https://github.com/<org>/MCP-Analyst.git
cd MCP-Analyst
# ... install dependencies
# ... start MCP server
# ... configure agent
```

---

## MCP Server Function Reference

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

### Disk Analysis

| Function                 | Underlying Tool            | Purpose                                                                                                              |
| ------------------------ | -------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `extract_mft_timeline()` | MFTECmd                    | Parse NTFS MFT, return structured timeline entries with timestamps, file paths, MFT entry numbers                    |
| `get_amcache()`          | RECmd / Amcache parser     | Extract application execution history: executable paths, SHA1 hashes, first execution timestamps, publisher metadata |
| `analyse_prefetch()`     | PECmd / Prefetch parser    | Parse Prefetch files: execution counts, last run times, referenced file paths                                        |
| `parse_event_logs()`     | EvtxECmd / evtx parser     | Structured EVTX parsing with filtering by event ID, time range, source. Returns normalised JSON                      |
| `get_shellbags()`        | ShellBags Explorer / RECmd | Folder access history from ShellBags registry entries                                                                |
| `extract_registry_key()` | RECmd                      | Targeted registry hive querying for SYSTEM, SOFTWARE, SAM, NTUSER                                                    |
| `build_supertimeline()`  | log2timeline / plaso       | Comprehensive timeline across all artefact sources with time range filtering                                         |

### Memory Analysis

| Function         | Underlying Tool | Purpose                                                                                            |
| ---------------- | --------------- | -------------------------------------------------------------------------------------------------- |
| `vol_pslist()`   | Volatility 3    | List running processes: PID, PPID, creation time, command line arguments                           |
| `vol_netscan()`  | Volatility 3    | Network connections and listening ports: local/remote addresses, PIDs, connection states           |
| `vol_malfind()`  | Volatility 3    | Scan for potentially injected code: memory regions with suspicious protection flags and PE headers |
| `vol_handles()`  | Volatility 3    | Open handles per process: files, registry keys, mutexes, events                                    |
| `vol_dlllist()`  | Volatility 3    | Loaded DLLs per process with full paths (DLL sideloading/injection detection)                      |
| `vol_cmdline()`  | Volatility 3    | Command-line arguments per process                                                                 |
| `vol_filescan()` | Volatility 3    | Scan memory for file objects, including files deleted from disk but still resident in memory       |

> **Scope note:** This is the initial function set. We may add more functions if time permits, but depth and reliability on these core functions matters more than breadth. The Valhuntir example submission uses 79 MCP tools across 7 backends — we are not trying to match that scope, but rather to nail the typed-function approach and self-correction quality for a focused subset.

---

## Agent Triage Loop

The agent follows a structured five-phase analytical sequence:

| Phase | Name                   | What the Agent Does                                                                                                                                                                                                                                                                                  |
| ----- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | **Initial Survey**     | Runs broad-scope functions (pslist, supertimeline, event logs) to establish a baseline understanding of the system. Identifies time windows of interest and suspicious processes                                                                                                                     |
| 2     | **Targeted Deep-Dive** | Based on Phase 1 findings, selects specific functions for deeper analysis. If pslist flagged a suspicious PID, the agent runs malfind, handles, dlllist, and cmdline for that PID. If the timeline showed unusual activity in a specific window, the agent narrows event log parsing to that period  |
| 3     | **Cross-Validation**   | Compares findings across data sources. If disk artefacts say a file was created at time X but memory shows the process started at time Y, the agent flags the discrepancy. If Amcache shows an executable but Prefetch has no record of it, the agent notes the gap                                  |
| 4     | **Self-Correction**    | The agent evaluates its own analysis for logical consistency: unexplained gaps, unsupported assumptions, contradictions. It re-runs targeted functions with adjusted parameters (different time ranges, different processes, different artefact types) and documents what changed between iterations |
| 5     | **Synthesis**          | Produces a structured investigative narrative that distinguishes confirmed findings from inferences, notes unresolved discrepancies, and traces every claim to a specific function call                                                                                                              |

The self-correction loop has a hard cap of 3–5 iterations to prevent runaway execution. If the agent cannot self-correct within the cap, it flags the finding as uncertain rather than claiming confidence, which is the behaviour the judges specifically want to see.

---

## Evidence and Case Data

### Starter Evidence

SANS provides sample disk images and memory captures for development and testing:

- **Download:** https://sansorg.egnyte.com/fl/HhH7crTYT4JK
- ⚠️ **Contents TBD** — the specific evidence sets and their ground truth will be documented once we've examined them
- ⚠️ **Additional evidence** may be posted to the Protocol SIFT Slack at launch — monitor the channel

### Evidence Integrity

All evidence is mounted read-only at the OS level. The MCP server has no functions that write to the evidence store. This is enforced architecturally:

- The server binary/script simply does not include any write operations
- There is no `execute_shell_cmd` function or equivalent
- Each function takes a read path as input and returns structured data as output
- If the agent attempts an operation outside the server's function set, it receives a "function not found" error, not a degraded or partial result

The accuracy report will include documentation of bypass testing: what happens when the agent tries to invoke functions that do not exist, and whether it ever attempts to circumvent the MCP server layer.

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

| Question                     | Options                                                                                                     | Notes                                                                                                                                                                                                                                                                        | Status  |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| **MCP server language**      | TypeScript or Python                                                                                        | TypeScript has stronger typing (aligns with "typed, safe functions" philosophy). Python has better forensic library support (Volatility is Python, many SIFT tools have Python bindings). Valhuntir used Python. Decide on day 1, do not let this become a week-long debate. | ⚠️ OPEN |
| **Anthropic API access**     | Paid API credits, Claude Code subscription, OpenClaw (open-source), cheaper model for dev + Claude for demo | Check Slack for sponsored credits. The self-correction loop makes multiple API calls per triage run, so free tiers likely won't last through two months of iterative development. OpenClaw is explicitly supported by the hackathon as an alternative.                       | ⚠️ OPEN |
| **Which Volatility version** | Volatility 2 vs Volatility 3                                                                                | SIFT Workstation ships both. Volatility 3 is actively maintained and has a cleaner API, but some plugins are only available in V2. Protocol SIFT's existing integration may favour one over the other — check after installing.                                              | ⚠️ OPEN |
| **MCP transport**            | stdio vs HTTP (streamable-http)                                                                             | stdio is simpler and what Protocol SIFT uses with Claude Code. HTTP is what Valhuntir uses for its gateway. For our scope, stdio is probably sufficient — we are not building a multi-examiner gateway.                                                                      | ⚠️ OPEN |
| **Repo org vs personal**     | Create a GitHub org or use a personal account                                                               | An org looks more professional on CVs but adds setup overhead. Personal account with collaborators is simpler.                                                                                                                                                               | ⚠️ OPEN |

### Things We Do Not Know Yet

| Unknown                                                                       | Why It Matters                                                                                                              | How We'll Find Out                                                                                              |
| ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| **What specific evidence sets are in the starter data**                       | Determines which MCP functions we prioritise and what ground truth we can validate against                                  | Download from the Egnyte link and examine                                                                       |
| **Whether SANS will provide sponsored API credits**                           | Directly affects our budget and development velocity                                                                        | Monitor Slack announcements, ask in the channel if nothing appears by launch                                    |
| **What Protocol SIFT's existing MCP server looks like under the hood**        | We need to understand the baseline to know what we're improving on, and to avoid duplicating work                           | Install and inspect after SIFT setup                                                                            |
| **Exact tool versions on the current SIFT Workstation**                       | Function implementations need to match the actual tool versions and their CLI flags                                         | Check after SIFT install (`vol --version`, `MFTECmd --version`, etc.)                                           |
| **Whether the hackathon will release additional evidence sets**               | More evidence = better accuracy report, better demo                                                                         | Monitor Slack and the Devpost updates page                                                                      |
| **How Protocol SIFT's "Ralph Wiggum Loop" self-correction works**             | Rob T. Lee describes this in his Substack — understanding the existing self-correction approach tells us what to improve on | Read the install output and CLAUDE.md files after Protocol SIFT install, cross-reference with the Substack post |
| **Whether the NotebookLM notebook has architecture guidance we haven't seen** | Could change our approach if there are preferred patterns or anti-patterns                                                  | Work through the notebook before building                                                                       |

### Things to Watch For

- **Devpost updates page** (https://findevil.devpost.com/updates) — check weekly for new announcements, rule clarifications, or additional resources
- **Slack #announcements channel** — primary source for launch-day information
- **Other teams' questions in Slack** — sometimes reveal requirements or edge cases we haven't considered
- **Valhuntir repo updates** — Steve Anson's example submission is actively developed (v0.5.4 as of Mar 2026, 280 commits), so the quality bar may continue to rise

---

## Licence

MIT — see [LICENCE](LICENCE)
