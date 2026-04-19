# CONFIDENCE_CLASSIFICATION

> Rules for tagging every finding as CONFIRMED, INFERRED, or UNCERTAIN. The agent MUST classify every finding. Never present an inference as a confirmed fact.

This is the foundation of IR accuracy (judging criterion #2). The judges will check whether findings are correctly classified, and will penalise any submission that presents speculation as fact.

---

## Classification Levels

### CONFIRMED

A finding is CONFIRMED when it is directly traced to a specific artefact with tool output that explicitly shows the finding.

**Requirements — ALL must be met:**
- The finding references a specific file, offset, registry key, log entry, or memory address
- A tool was run that produced output directly showing the claimed fact
- The `function_call_id` or shell command execution is recorded in the audit trail
- The source artefact path is documented

**Examples:**
- "Process powershell.exe (PID 2112) was running at 2026-03-15T09:14:45Z" → CONFIRMED if `vol_pslist` returned this PID with that create_time, and the function_call_id is recorded
- "A TCP connection from PID 2112 to 185.220.101.34:4444 was ESTABLISHED" → CONFIRMED if `vol_netscan` returned this exact connection entry
- "File payload.exe was created at C:\Users\victim\AppData\Local\Temp\ on 2026-03-15T09:16:00Z" → CONFIRMED if MFT analysis or timeline shows this exact entry

**Format:**
```
[CONFIRMED] <finding statement>
Source: <tool name> | function_call_id: <uuid> | artefact: <path>
Evidence: <specific output that supports the finding>
```

---

### INFERRED

A finding is INFERRED when it is a logical deduction from multiple confirmed findings, but no single artefact directly proves it. The reasoning chain MUST be explicitly stated.

**Requirements — ALL must be met:**
- Based on two or more CONFIRMED findings
- The logical reasoning connecting them is explicitly stated
- Alternative explanations are acknowledged where they exist
- The inference is consistent with known attack patterns or system behaviour

**Examples:**
- "PowerShell was likely used as the initial execution vector" → INFERRED because: (1) CONFIRMED that cmd.exe (PID 2048) spawned powershell.exe (PID 2112) at 09:14:45, (2) CONFIRMED that PID 2112 established connection to suspicious external IP at 09:15:33, (3) the sequence (cmd → powershell → outbound connection) is consistent with a download cradle pattern
- "The attacker likely achieved initial access via the victim user account" → INFERRED because: (1) CONFIRMED the suspicious processes run under session 1 (interactive logon), (2) CONFIRMED event log shows successful logon for victim account at 09:14, (3) no evidence of privilege escalation from a different account

**Format:**
```
[INFERRED] <finding statement>
Based on:
  1. [CONFIRMED] <supporting finding 1> (function_call_id: <uuid>)
  2. [CONFIRMED] <supporting finding 2> (function_call_id: <uuid>)
Reasoning: <explicit logical chain connecting the confirmed findings>
Alternative explanations: <what else could explain this, if anything>
```

---

### UNCERTAIN

A finding is UNCERTAIN when the evidence is insufficient, contradictory, or ambiguous. The agent MUST use UNCERTAIN rather than guessing or fabricating.

**Requirements:**
- At least one of: insufficient evidence, contradictory evidence, ambiguous artefact, tool failure preventing verification
- A clear statement of WHAT is missing or contradictory
- A recommendation for what additional analysis would resolve the uncertainty

**Examples:**
- "It is unclear whether payload.exe was executed after being dropped" → UNCERTAIN because: Amcache shows the file was present, but Prefetch has no matching entry, and the process listing from memory does not show it running. The file may have been executed and already exited before the memory capture, or it may never have been executed.
- "The source of the initial cmd.exe execution is uncertain" → UNCERTAIN because: the process tree shows cmd.exe with PPID pointing to a process that had already exited at the time of memory capture. Event logs for that time window show multiple logon events that could be the trigger.

**Format:**
```
[UNCERTAIN] <finding statement>
What we know: <available evidence>
What is missing: <specific gaps>
Contradictions: <if any conflicting evidence exists>
Recommended next steps: <what analysis would resolve this>
```

---

## Promotion and Demotion Rules

### Promoting INFERRED → CONFIRMED
An inference can be promoted to CONFIRMED when:
- Additional tool output is obtained that directly proves the inferred claim
- The new evidence is from a different source than the original inference basis
- Example: "PowerShell was the initial execution vector" can be promoted from INFERRED to CONFIRMED if event log analysis reveals a specific EventID 4688 entry showing powershell.exe being launched with a download cradle command line

### Promoting UNCERTAIN → INFERRED
An uncertain finding can be promoted to INFERRED when:
- Additional analysis resolves the ambiguity or provides corroborating evidence
- The remaining uncertainty is about details, not about the core finding
- Example: "Whether payload.exe was executed" can be promoted from UNCERTAIN to INFERRED if Shimcache analysis shows the file was shimmed (indicating execution), even though Prefetch is absent

### Demoting CONFIRMED → INFERRED
A confirmed finding should be demoted when:
- The original tool output is found to be potentially unreliable (e.g., timestamps in a timezone-shifted system)
- Contradictory evidence emerges from a different source
- The artefact could have been planted or manipulated

### Demoting any level → UNCERTAIN
Any finding should be demoted to UNCERTAIN when:
- Contradictory evidence is found with no clear resolution
- A tool failure prevented verification of a key supporting claim
- The agent realises it made an assumption that is not supported by actual evidence

---

## Anti-Hallucination Rules

1. **If you cannot cite a specific function_call_id or tool execution that produced a finding, the finding is NOT CONFIRMED.** At best it is INFERRED; more likely it is UNCERTAIN.

2. **Never fill in gaps with assumed knowledge.** If the timeline has a gap between 09:15 and 09:20, do NOT assume what happened. State the gap and classify any claims about that period as UNCERTAIN.

3. **If a tool returns no results, that is a finding itself** — document the absence. "Prefetch analysis found no entry for payload.exe" is a CONFIRMED finding (the absence is confirmed). The interpretation of that absence ("therefore the file was never executed") is INFERRED at best.

4. **Check your own output.** Before finalising any finding, verify: Does the classification match the evidence? Is every CONFIRMED finding backed by a specific tool output? Is every INFERRED finding based on 2+ confirmed findings with stated reasoning?

5. **When in doubt, classify as UNCERTAIN.** The judges value honesty over confidence. An honest UNCERTAIN is better than a wrong CONFIRMED.
