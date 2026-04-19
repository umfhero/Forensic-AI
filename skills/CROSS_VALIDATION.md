# CROSS_VALIDATION

> Rules for comparing disk evidence and memory evidence, reconciling
> timestamps across sources, and deciding when a discrepancy is signal vs.
> noise. Invoked during Phase 3 of the triage loop.

This skill file is **mandatory** for any finding that depends on more than
one source of evidence. Single-source findings default to INFERRED at best
(see `CONFIDENCE_CLASSIFICATION.md`) — cross-validation is what promotes
them to CONFIRMED.

---

## Why Cross-Validation Matters

Every forensic artefact has a reliability profile: who writes it, when, and
how easily it can be tampered with. A finding corroborated by two
independent sources with different tampering characteristics is substantially
stronger than a finding from a single source, even if that single source is
a "trusted" one. The judges reward audit trail quality (criterion #5) and
IR accuracy (criterion #2); both lean on this skill file.

---

## Source Reliability Profile

Use this table when deciding how much weight each source carries and which
sources meaningfully corroborate each other. Two sources from the same
reliability tier provide weaker corroboration than two sources from
different tiers.

| Source                       | Written by          | Tampering difficulty | Typical latency    | Primary value                              |
| ---------------------------- | ------------------- | -------------------- | ------------------ | ------------------------------------------ |
| Memory (`vol_pslist` etc.)   | Kernel, live state  | Very high (live RAM) | Real time          | Ground truth at capture moment             |
| MFT / `$MFT`                 | NTFS driver         | High                 | Real time          | File existence, creation/modification time |
| USN Journal / `$LogFile`     | NTFS driver         | High                 | Real time          | Recent file operations                     |
| Prefetch (`.pf`)             | Cache Manager       | Medium               | Seconds–minutes    | Execution of user-mode PE files            |
| Amcache (`Amcache.hve`)      | PCA / Compat stack  | Medium               | Minutes            | First-seen record for PE files             |
| Shimcache (`AppCompatCache`) | Compatibility stack | Medium               | Boot / shutdown    | Execution or inspection of PE files        |
| Security.evtx (4688, 4624)   | LSA                 | Medium-low           | Real time          | Process creation, logons (if audited)      |
| Sysmon                       | Sysmon driver       | Low (if installed)   | Real time          | Rich process, network, file events         |
| Registry hives (UserAssist)  | Explorer.exe        | Low                  | Minutes            | User-initiated executions                  |
| Supertimeline (plaso)        | Derived             | —                    | Derived            | Cross-source temporal view                 |

"Tampering difficulty" is a relative scale. Memory and `$MFT` are the
hardest to forge without being detectable; registry values and event logs
are the easiest for an attacker with sufficient privileges to manipulate.

---

## Disk ↔ Memory Comparison Rules

### Rule 1: A process in memory without a corresponding disk trace

**Scenario:** `vol_pslist` shows a running process, but there is no MFT
record for its image file and no Prefetch entry for the executable.

- **Most likely cause:** Process hollowing, reflective DLL injection, or
  fileless execution. The process exists in memory but was not loaded from
  disk in the usual way.
- **Classification:** The process's existence is `CONFIRMED` (memory is
  authoritative). The *execution chain* is `UNCERTAIN` until `vol_malfind`
  confirms injected code or the parent process is traced.
- **Next step:** Run `vol_malfind` with `pid` filter on the suspicious PID,
  run `vol_dlllist` (shell) to look for unsigned / unusually-located DLLs,
  run `vol_cmdline` for the launch arguments.

### Rule 2: A disk trace without a corresponding process in memory

**Scenario:** Prefetch or Amcache shows an executable ran, but memory shows
no matching process.

- **Most likely cause (benign):** The process exited before the memory
  capture.
- **Most likely cause (malicious):** Short-lived dropper that executed,
  launched a child, and exited.
- **Classification:** The execution record is `CONFIRMED` (Prefetch/Amcache
  literally shows it). The current-state inference "the process is no
  longer running" is `INFERRED` (memory is a point-in-time snapshot).
- **Next step:** Check the supertimeline for the execution timestamp; look
  for child processes created within a few seconds of the parent's
  execution; check Sysmon EventID 1 around that timestamp for the command
  line.

### Rule 3: Amcache entry present, Prefetch entry absent

**Scenario:** `Amcache.hve` has a first-seen record for an executable, but
no `.pf` file exists in `C:\Windows\Prefetch\`.

- **Possible causes:**
  1. Prefetch is disabled (server SKUs, SSDs with aggressive policies).
  2. The file was staged but never executed (Amcache tracks PE inspection,
     not only execution).
  3. Prefetch was deleted by the attacker.
- **Classification:** *"The file was present on disk"* is `CONFIRMED` by
  Amcache. *"The file was executed"* is `UNCERTAIN` without corroboration.
- **Next step:** Check Shimcache (execution indicator on older systems),
  MFT for `.pf` deletion traces, USN journal for recent deletions, event
  log for Prefetch service changes.

### Rule 4: Prefetch entry present, Amcache entry absent

**Scenario:** `.pf` file exists for an executable but `Amcache.hve` has no
record.

- **Possible causes:**
  1. Amcache hive was tampered with or truncated.
  2. The executable was executed from a mounted volume / network path that
     is not tracked by Amcache.
  3. PCA / Application Experience service was disabled.
- **Classification:** *"The executable ran"* is `CONFIRMED` by Prefetch.
  The *source of the executable* is `UNCERTAIN`.
- **Next step:** Inspect the `.pf` internals (`PECmd`) for the file paths
  the prefetcher saw, correlate with network drives in `HKU\...\Network`.

### Rule 5: Timestamp disagreement

Timestamps rarely align to the second across sources. Use these tolerances
before flagging a disagreement as suspicious:

| Comparison                               | Tolerance        |
| ---------------------------------------- | ---------------- |
| MFT CreateTime vs Prefetch last-run      | ± 5 seconds      |
| Sysmon EventID 1 vs memory `CreateTime`  | ± 2 seconds      |
| Security 4688 vs memory `CreateTime`     | ± 2 seconds      |
| Amcache first-seen vs MFT CreateTime     | ± 2 minutes      |
| Supertimeline entry vs underlying source | Exact (derived)  |

Disagreements larger than the tolerance are flagged in the report. Before
calling the disagreement malicious, rule out:

1. Timezone drift (was the system clock set correctly? check
   `HKLM\System\CurrentControlSet\Control\TimeZoneInformation`).
2. UTC-vs-local conversion errors inside the parsing pipeline.
3. NTFS tunneling (files deleted and recreated within 15 seconds can inherit
   old timestamps).

---

## Amcache vs Prefetch Logic (Quick Reference)

This is the single highest-signal disk-only corroboration available on
Windows. Always run both when the target is a suspicious PE file.

```
                Amcache has entry      Amcache missing
              ┌──────────────────────┬──────────────────────┐
Prefetch      │  CONFIRMED:          │  CONFIRMED:          │
has entry     │  file present AND    │  file executed       │
              │  executed            │  UNCERTAIN: source    │
              │                      │  (Amcache tampering?)│
              ├──────────────────────┼──────────────────────┤
Prefetch      │  CONFIRMED:          │  NO DISK-ONLY        │
missing       │  file present        │  EVIDENCE OF         │
              │  UNCERTAIN:          │  EXECUTION.          │
              │  executed            │  Check memory,       │
              │                      │  Shimcache, Sysmon.  │
              └──────────────────────┴──────────────────────┘
```

---

## Phase 3 Procedure (Agent-Facing)

For every finding surfaced by Phases 1 and 2, the agent runs the following
against the cross-validation rules above:

1. Identify the finding's primary source (memory, disk, log).
2. Identify the source(s) that should independently corroborate the finding
   if it is real (use the reliability profile table).
3. Run the corresponding MCP tool or shell command to fetch that
   corroborating evidence, scoping to the specific PID, file, or time
   window at issue.
4. Apply the comparison rules:
   - If the corroborating evidence agrees, **promote** the finding to
     `CONFIRMED` and record both `function_call_id`s in the audit trail.
   - If the corroborating evidence disagrees, apply the
     disagreement-resolution checklist and document the result. If the
     disagreement cannot be resolved, **demote** the finding to
     `UNCERTAIN` with a "Contradictions" note.
   - If the corroborating source is unavailable (tool failed, data missing),
     record the attempt and leave the finding at its current classification
     with a gap note.
5. Feed the updated findings into Phase 4 (Self-Correction) for the agent
   to review its own reasoning chain.

Cross-validation is not a one-shot. When a Phase 2 deep-dive produces new
findings, rerun this phase against them before synthesis.
