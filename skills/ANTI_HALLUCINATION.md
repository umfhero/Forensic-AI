# ANTI_HALLUCINATION

> How the agent avoids fabricating findings, inventing artefacts, or presenting
> inferences as confirmed facts. Ported from Majid's dissertation work on
> anti-hallucination mechanisms in AI-assisted security tooling and adapted to
> the forensic context.

This skill file is **mandatory**. Every claim the agent makes in a report,
finding, or intermediate reasoning step must pass the checks in this document.
If a claim cannot pass these checks, the agent must either downgrade its
confidence classification (see `CONFIDENCE_CLASSIFICATION.md`) or drop the
claim entirely.

---

## Core Principle

> **Evidence first. Language second.**

Every factual statement in an output must be traceable to one of:

1. A specific MCP tool result identified by `function_call_id`.
2. A specific shell command execution identified by its recorded command + exit
   code + stdout capture.
3. Another CONFIRMED finding already present in the current investigation.

If none of these apply, the statement is not a finding — it is a hypothesis,
and must be marked as `INFERRED` (with reasoning) or `UNCERTAIN` (with gaps
listed).

---

## Forbidden Behaviours

The agent MUST NOT:

1. **Invent artefact paths.** Do not name files, registry keys, event IDs, or
   process offsets that were not present in actual tool output. If the user
   asks about a specific artefact and it was not found, say so.
2. **Round numbers or dates silently.** If `vol_pslist` returned
   `2026-03-15T09:14:45.123456Z`, the finding must preserve that precision —
   never shorten to "around 09:15" without explicitly flagging the rounding.
3. **Fill context-window gaps with plausible-sounding data.** If a tool
   returned paginated output and a later page was not fetched, the agent must
   not describe entries from that un-fetched page.
4. **Conflate tool categories.** Do not present Prefetch evidence as Amcache
   evidence, or Sysmon evidence as Security.evtx evidence. Each source has
   different reliability characteristics (see `CROSS_VALIDATION.md`).
5. **Use weasel language to bridge an evidence gap.** Phrases like "it is
   likely that", "the attacker probably", and "standard behaviour suggests"
   are only acceptable inside an `[INFERRED]` block with explicit supporting
   CONFIRMED findings. They are never acceptable in a `[CONFIRMED]` block.
6. **Cite CLAUDE.md, skill files, or Protocol SIFT documentation as evidence.**
   Those are operating instructions. The agent's findings must be grounded in
   the evidence of the specific case under investigation.

---

## Required Self-Checks

Before emitting any finding, the agent must answer all of the following. If
any answer is "no" or "unclear", the finding is downgraded.

| Check                                                                     | Required answer |
| ------------------------------------------------------------------------- | --------------- |
| Can I name the tool invocation (MCP `function_call_id` or shell command)? | Yes             |
| Does the cited output literally contain the claim I am making?            | Yes             |
| If the claim is about a time, does that timestamp appear in the output?   | Yes             |
| If the claim is about a PID, is that PID in the output I am citing?       | Yes             |
| If I am comparing two sources, is each source cited independently?        | Yes             |
| Am I using `CONFIRMED` language only where all of the above hold?         | Yes             |

The answer "I remember this from earlier in the conversation" is NOT
sufficient. Memory is not evidence; the `function_call_id` from the original
MCP response is.

---

## Handling Absent Evidence

Absence of evidence is itself a finding and must be reported honestly.

- If `vol_pslist` returned no entry for a process the user named, the
  CONFIRMED finding is *"no process matching `<name>` was observed in the
  memory image at `<path>`"*. The finding *"the process never ran"* is an
  INFERRED claim, because the process may have exited before the memory
  capture.
- If the timeline has a gap, the CONFIRMED finding is *"no events from
  `<sourceType>` between `<start>` and `<end>` in the queried range"*. The
  finding *"nothing happened during this window"* is UNCERTAIN at best.

---

## Recovering From a Suspected Hallucination

If, during self-review (`SELF_CORRECTION.md`, owned by Mauro), the agent
identifies a claim it can no longer justify:

1. Locate every downstream finding or report section that depends on the
   suspect claim.
2. Either re-run the tool that was supposed to produce the supporting
   evidence, or demote the suspect claim to `UNCERTAIN` with a gap note.
3. Re-evaluate each downstream finding with the suspect claim removed. A
   finding that was `CONFIRMED` purely because of the suspect claim must be
   demoted at least one level.
4. Record the correction in the audit log with a short note explaining what
   was wrong and how it was resolved. The judges specifically want to see
   evidence that the agent catches its own mistakes.

---

## Connection to Other Skill Files

- `CONFIDENCE_CLASSIFICATION.md` defines the three levels used above.
- `CROSS_VALIDATION.md` defines the rules for when disk and memory evidence
  corroborate, contradict, or are orthogonal.
- `SELF_CORRECTION.md` (Mauro) defines the loop that invokes this file during
  review.
- `REPORT_STRUCTURE.md` defines the final-output format that separates
  CONFIRMED, INFERRED, and UNCERTAIN sections so the judges can see the
  distinction at a glance.
