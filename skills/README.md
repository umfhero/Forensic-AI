# Reasoning Framework — Skill Files

CLAUDE.md skill files encoding how a senior incident responder sequences and validates an investigation.

These files are deployed to `~/.claude/skills/forensic-ai/` on the SIFT Workstation so Claude Code loads them alongside Protocol SIFT's existing skill files.

## Files

| File | Purpose | Status |
|---|---|---|
| `INVESTIGATION_SEQUENCING.md` | Decision tree for investigation phases: what to run first, when to transition between phases | Draft |
| `CONFIDENCE_CLASSIFICATION.md` | Rules for CONFIRMED / INFERRED / UNCERTAIN tagging of every finding | Draft |
| `CROSS_VALIDATION.md` | Disk ↔ memory comparison rules | Phase 2 |
| `ANTI_HALLUCINATION.md` | Self-checking mechanisms adapted from Majid's dissertation | Phase 2 |
| `SELF_CORRECTION.md` | Re-run and parameter adjustment protocol adapted from Mauro's dissertation | Phase 2 |
| `REPORT_STRUCTURE.md` | Final output template for structured investigative narrative | Phase 2 |

## Deployment

```bash
mkdir -p ~/.claude/skills/forensic-ai
cp skills/*.md ~/.claude/skills/forensic-ai/
```

Then add the routing table entries from `config/CLAUDE.md.patch` to the global `~/.claude/CLAUDE.md`.
