# INVESTIGATION_SEQUENCING

> How to sequence a forensic investigation: what to run first, what to run next based on findings, and when to transition between phases.

This skill file encodes the decision tree a senior incident responder follows when choosing investigative steps. The agent MUST follow this sequencing rather than running tools arbitrarily.

---

## Phase 1: Initial Survey (Broad Scope)

**Goal:** Establish a baseline understanding of the system. Identify time windows of interest and suspicious indicators.

**Run these first — always, in this order:**

1. **Process listing** → `vol_pslist` (MCP tool)
   - Run against the memory image with NO filters (full listing)
   - Look for: unusual process names, processes with unexpected parent-child relationships (e.g. cmd.exe spawned by explorer.exe is normal; cmd.exe spawned by iexplore.exe is suspicious), processes with abnormal thread/handle counts, recently created processes near the incident timeframe
   - Flag: any PID that looks suspicious for Phase 2 deep-dive

2. **Network connections** → `vol_netscan` (MCP tool)
   - Run against the memory image with NO filters (full listing)
   - Look for: ESTABLISHED connections to external IPs (especially on non-standard ports like 4444, 8080, 1337), connections from processes that shouldn't be network-active (notepad.exe, calc.exe), connections to known-bad IPs/ranges
   - Cross-reference: PIDs from suspicious connections with the process listing output

3. **Supertimeline** → `build_supertimeline` (MCP tool)
   - If a time window of interest was identified from steps 1–2, scope the query to that window (±2 hours)
   - If no time window yet, start with the most recent 24 hours
   - Look for: clusters of activity (file creation, registry modification, event log entries) that suggest an attack sequence
   - Flag: specific time windows for Phase 2 narrowing

4. **Event logs** → Protocol SIFT shell access (EvtxECmd or evtx parser)
   - Query Security.evtx for EventID 4688 (process creation), 4624/4625 (logon events), 4672 (special privilege logon)
   - Query Sysmon logs (if available) for EventID 1 (process create), 3 (network connection), 11 (file create)
   - Scope to the time windows identified in steps 1–3

**Transition to Phase 2 when:**
- At least one suspicious PID has been identified
- OR a time window of interest has been established
- OR specific artefacts (files, registry keys) have been flagged

---

## Phase 2: Targeted Deep-Dive

**Goal:** Investigate specific suspicious indicators from Phase 1 in depth.

**Choose actions based on what Phase 1 found:**

### If a suspicious PID was identified:
1. `vol_pslist` with `pid` filter → confirm process details, check parent chain
2. Volatility `windows.malfind` (shell) → check for injected code in that PID's memory space
3. Volatility `windows.dlllist` (shell) → list loaded DLLs for that PID, look for unsigned/unusual DLLs
4. Volatility `windows.handles` (shell) → check what resources the process has open (files, registry keys, mutexes)
5. Volatility `windows.cmdline` (shell) → get the full command line used to launch the process
6. `vol_netscan` with `pid` filter → check network activity for that specific process

### If a suspicious time window was identified:
1. `build_supertimeline` with tight `timeRangeStart`/`timeRangeEnd` → get dense activity for that window
2. Event log parsing scoped to the window → look for the specific attack stage indicators
3. MFT analysis (MFTECmd via shell) → check file creation/modification in the time window
4. Prefetch analysis (PECmd via shell) → check what executables ran in the window
5. Registry analysis (RECmd via shell) → check for persistence mechanisms set in the window

### If a suspicious file was identified:
1. File hash calculation (sha256sum via shell) → get the hash for threat intel lookup
2. YARA scan (yara via shell) → scan the file against known malware signatures
3. AmcacheParser (via shell) → check when the file was first seen on the system
4. Prefetch check → was this file executed?
5. MFT timeline → when was it created, modified, accessed?

**Transition to Phase 3 (Cross-Validation) when:**
- Specific findings have been established from at least two different data sources
- OR the deep-dive has produced contradictory information that needs cross-validation

---

## Phase 3: Cross-Validation

> Covered by `CROSS_VALIDATION.md` (Phase 2 build)

The agent compares findings between disk and memory, flags discrepancies, and assesses their meaning.

---

## Phase 4: Self-Correction

> Covered by `SELF_CORRECTION.md` (Phase 2 build)

The agent evaluates its own analysis for gaps and unsupported claims.

---

## Phase 5: Synthesis

> Covered by `REPORT_STRUCTURE.md` (Phase 2 build)

The agent produces a structured investigative narrative.

---

## Rules

1. **NEVER skip Phase 1.** The initial survey provides the context needed to make good decisions in Phase 2. Running targeted tools without baseline context leads to tunnel vision.

2. **Use the MCP tools (`vol_pslist`, `vol_netscan`, `build_supertimeline`) instead of raw shell commands** for Volatility process listing, network scanning, and supertimelines. The MCP tools return structured, paginated JSON that prevents context window overflow. Use Protocol SIFT's shell access for everything else.

3. **Always scope time ranges.** Unfiltered supertimeline queries return millions of entries. Use the time windows from Phase 1 to scope Phase 2 queries. If running `build_supertimeline` without a time range, use a limit of 500 or less.

4. **Document what you are looking for and why** before running each tool. This creates the audit trail the judges need (criterion #5).

5. **If a tool fails, read the error, adjust parameters, and retry** before moving on. Common issues: wrong memory image path, incorrect Volatility plugin name, time format errors.

6. **Cross-reference across sources.** A PID flagged by pslist should be checked in netscan and the timeline. A time window from the timeline should be checked in process creation and event logs. Single-source findings are INFERRED at best (see `CONFIDENCE_CLASSIFICATION.md`).

7. **Record every function_call_id** from MCP tool results. Findings must be traceable to the specific tool invocation that produced them.
