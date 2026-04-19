# Accuracy Report

This document compares the baseline behaviour of **Protocol SIFT** against **forensic-AI** (Protocol SIFT + our custom MCP functions + reasoning framework + governance layer + desktop app) on the same evidence sets.

It also documents bypass-testing results: whether each architectural and prompt-based guardrail held when adversarially prompted.

Honesty > optimism. False positives and missed artefacts are logged verbatim, not softened.

---

## 1. Method

- Every triage run is recorded as a JSONL execution log under `case-workspace/logs/<case-id>.jsonl`.
- Findings are auto-extracted from the log and classified against the apparent ground truth for each evidence set (see `docs/DATASET_DOCUMENTATION.md`).
- Each finding is tagged:
  - `TP` — true positive (real artefact, correctly surfaced, correct confidence).
  - `FP` — false positive (artefact claimed but not present, or present but mis-attributed).
  - `FN` — false negative (artefact present in ground truth, not surfaced).
  - `HALL` — hallucination (claim with no corresponding tool output).
  - `MIS-CONF` — correct claim but wrong confidence classification.
- Runs are repeated **three times per evidence set** to catch non-determinism.

## 2. Baseline — Protocol SIFT (stock)

| Evidence set | Runs | TP | FP | FN | HALL | MIS-CONF | Notes |
| ------------ | ---- | -- | -- | -- | ---- | -------- | ----- |
| starter-01   |      |    |    |    |      |          |       |
| starter-02   |      |    |    |    |      |          |       |

_Fill after Phase 1 baseline runs._

## 3. forensic-AI

| Evidence set | Runs | TP | FP | FN | HALL | MIS-CONF | Δ vs baseline | Notes |
| ------------ | ---- | -- | -- | -- | ---- | -------- | ------------- | ----- |
| starter-01   |      |    |    |    |      |          |               |       |
| starter-02   |      |    |    |    |      |          |               |       |

_Fill after Phase 2 / 3 runs. The Δ column is the point of the report._

### Improvements over baseline

- [ ] Confidence classification: how often did the agent tag CONFIRMED vs INFERRED correctly? Baseline typically presents everything as fact.
- [ ] Self-correction: how often did the loop actually trigger a correction, and did the corrected output match ground truth?
- [ ] Citations: every finding carries a citation, vs baseline where reports are paragraphs of prose.

## 4. Bypass testing

For each guardrail in `governance/GUARDRAILS.md`, results of the four bypass attempts:

| Guardrail | Direct prompt | Indirect prompt | Output injection | Escalation | Held? | Notes |
| --------- | ------------- | --------------- | ---------------- | ---------- | ----- | ----- |
| EI-1      |               |                 |                  |            |       |       |
| EI-2      |               |                 |                  |            |       |       |
| EI-3      |               |                 |                  |            |       |       |
| EI-4      |               |                 |                  |            |       |       |
| AA-1      |               |                 |                  |            |       |       |
| AA-2      |               |                 |                  |            |       |       |
| AA-3      |               |                 |                  |            |       |       |
| AA-4      |               |                 |                  |            |       |       |
| OD-1      |               |                 |                  |            |       |       |
| OD-2      |               |                 |                  |            |       |       |
| OD-3      |               |                 |                  |            |       |       |
| OD-4      |               |                 |                  |            |       |       |
| HO-1      |               |                 |                  |            |       |       |
| HO-2      |               |                 |                  |            |       |       |
| HO-3      |               |                 |                  |            |       |       |
| DP-1      |               |                 |                  |            |       |       |
| DP-2      |               |                 |                  |            |       |       |
| DP-3      |               |                 |                  |            |       |       |

Columns use `PASS` / `FAIL` / `n/a`. "Held?" is the overall conclusion for that guardrail.

### Architectural vs prompt-based

A key finding the judges will look for: of the guardrails that held under bypass, how many were architectural vs prompt-based?

- Architectural guardrails that held: _TBD_
- Prompt-based guardrails that held: _TBD_
- Prompt-based guardrails that failed: _TBD_

This feeds judging criterion #4 directly.

## 5. Limitations and honest caveats

- Evidence sets are limited to Protocol SIFT starter cases plus whatever additional material SANS releases mid-hackathon. Findings may not generalise.
- Non-determinism in agent reasoning means N=3 runs is a weak statistical sample. Disagreements between runs are flagged, not averaged.
- Ground truth for starter evidence is inferred from provided write-ups; if those are wrong, our baseline and our results are wrong together.

## Update log

| Date         | Change                          | By      |
| ------------ | ------------------------------- | ------- |
| 2026-04-19   | Initial template.               | Yasmine |
