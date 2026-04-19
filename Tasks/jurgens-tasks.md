# Jurgen's Tasks — forensic-AI

**Role:** Testing & Accuracy Validation — runs the agent against evidence, feeds accuracy data to Yasmine, verifies every finding traces back to a tool execution.

---

## Now — In Flight

- [ ] Install SIFT Workstation + Protocol SIFT locally
- [ ] Clone the repo and run the desktop app in mock mode (`cd desktop && npm run dev`) to get familiar with the UI
- [ ] Read `overview.md` so the three-layer architecture and five-phase triage loop are clear before testing

## Baseline Testing

- [ ] Run Protocol SIFT against the starter case data (https://sansorg.egnyte.com/fl/HhH7crTYT4JK)
- [ ] Record baseline results in Yasmine's accuracy tracker: what was found, missed, hallucinated, presented as confirmed when actually uncertain
- [ ] Note the SIFT tools Protocol SIFT calls and their versions (feeds Yasmine's tool inventory)
- [ ] Document starter evidence sets — artefact types, time periods, apparent ground truth

## Desktop App + Agent Testing

- [ ] Run the desktop app against the same evidence and record outputs in the same accuracy tracker format
- [ ] For each finding in the Findings panel, verify:
  - Confidence tag is correct (CONFIRMED / INFERRED / UNCERTAIN)
  - `function_call_id` in the Diagnostics log matches a real tool execution
  - Source artefact path points to an actual file
- [ ] Flag any finding that cannot be traced back to a specific tool call — these are the failures criterion #5 checks for

## Regression Testing Across Phases

- [ ] As Majid and Mauro ship new skill files, re-run the same evidence set and check:
  - Did confidence classification improve?
  - Did self-correction actually trigger?
  - Did the second pass improve the output?
- [ ] Feed observations back to Majid quickly — the skill files are still being written

## Audit Trail Verification

- [ ] For each demo-quality finding, trace: UI → `function_call_id` → execution log → tool call → source artefact
- [ ] Any break in that chain is a blocker; report to Mauro

## Bypass Testing Support

- [ ] Assist Yasmine: run prompts that push the agent toward destructive actions or try to get it to present uncertain findings as confirmed
- [ ] Record whether architectural guardrails hold vs prompt-based ones

## Submit

- [ ] Final pass on accuracy report numbers (FP rate, FN rate, hallucination rate)
- [ ] Run Khalid's setup instructions as a fresh user, flag every gap
- [ ] Support the final submission checklist review

## Submission Components Owned

| # | Deliverable | Role |
|---|---|---|
| 6 | Accuracy Report | Contributor (data collection + validation) |
| 7 | Try-It-Out Instructions | Reviewer (fresh-user testing) |
| 8 | Agent Execution Logs | Verifier (audit trail tracing) |

## If Stuck

If the agent does something unexpected and it's unclear whether it's a bug or expected behaviour, bring it to Majid with a specific log excerpt — faster than diagnosing alone.
# Jurgen's Tasks — forensic-AI

**Role: Testing & Accuracy Validation**

This role sits in the QA and testing track alongside Yasmine, with specific ownership of running the agent against evidence and contributing to the accuracy report. The work done in phases 2 and 3 directly feeds judging criteria #2 (IR Accuracy) and #5 (Audit Trail Quality), and having dedicated testing coverage alongside Yasmine means those criteria are consistently tracked rather than being squeezed in at the end.

---

## Phase 0 — Pre-Hackathon Setup (before 15 Apr)

- [ ] Install SIFT Workstation and run through the Protocol SIFT install: `curl -fsSL https://raw.githubusercontent.com/teamdfir/protocol-sift/main/install.sh | bash`
- [ ] Run Protocol SIFT against the starter case data (https://sansorg.egnyte.com/fl/HhH7crTYT4JK) and familiarise with what the agent does and what its output looks like at baseline
- [ ] Read through the `overview.md` file and make sure there is understanding of the three-layer architecture and the five-phase triage loop, since the job is to verify that the agent is actually doing what the architecture says it should
- [ ] Join the Protocol SIFT Slack and monitor it for any additional evidence sets or announcements

---

## Phase 1 — Foundation (Weeks 1–2, 15–29 Apr)

- [ ] Work with Yasmine to set up the accuracy tracking document — a consistent format is needed before starting testing, since comparing outputs across phases only works if the same fields are recorded each time
- [ ] Run Protocol SIFT baseline tests against the starter evidence and record findings in the accuracy tracker: what the agent found, what it missed, what it hallucinated, what it got right
- [ ] Take notes on the starter evidence sets themselves: what artefact types are present, what time periods are covered, what the apparent ground truth is, since Yasmine needs this for the dataset documentation
- [ ] Document the SIFT tools the agent calls during baseline runs, specifically the tool name and version, since this feeds into Yasmine's tool inventory

---

## Phase 2 — Reasoning Framework Testing (Weeks 3–4, 30 Apr–13 May)

- [ ] Run the agent against sample evidence as Majid and Mauro build the reasoning framework, recording every output in the accuracy tracker and comparing against the Protocol SIFT baseline
- [ ] Track specifically: did the agent correctly classify findings as CONFIRMED, INFERRED, or UNCERTAIN? Did it flag hallucinated claims rather than present them as facts? Did it trigger self-correction and did the second pass improve the output?
- [ ] Feed observations back to Majid quickly when the agent is seen making wrong sequencing decisions or applying confidence classifications incorrectly, since he needs this to adjust the CLAUDE.md skill files while they're still being built
- [ ] Contribute findings data to the accuracy report template Yasmine is building

---

## Phase 3 — Full Testing + Audit Trail Verification (Weeks 5–6, 14–27 May)

- [ ] Run complete triage sequences across all available evidence sets and document results thoroughly in the accuracy report
- [ ] Specifically focus on **audit trail verification** — for each finding the agent produces, trace it back to the specific tool execution and function_call_id in Mauro's execution logs, and flag any finding that cannot be traced to a source, since those are exactly the failures the judges check for
- [ ] Assist Yasmine with the bypass testing: run prompts designed to push the agent toward destructive actions or to present uncertain findings as confirmed, and record whether the guardrails hold
- [ ] Produce a summary of which test scenarios passed and which failed, with specific log references, for inclusion in the accuracy report

---

## Phase 4 — Polish & Submit (Weeks 7–8, 28 May–15 Jun)

- [ ] Final pass over the accuracy report data to make sure all test results are included and the summary numbers (false positive rate, missed artefact rate, hallucination rate) are accurate
- [ ] Support Khalid with the try-it-out instructions by running through them as a fresh user and noting where they break or where knowledge is assumed but not written down
- [ ] Support the final submission checklist review

---

## Submission Components Owned

| # | Deliverable | Role |
|---|-------------|-----------|
| 6 | Accuracy Report | Contributor (data collection and validation) |
| 7 | Try-It-Out Instructions | Reviewer (fresh-user testing) |
| 8 | Agent Execution Logs | Verifier (audit trail tracing) |

---

## Key Files Being Contributed To

- `/docs/ACCURACY_REPORT.md` — test data populates this
- The accuracy tracking spreadsheet or document (coordinate format with Yasmine in week 1)

---

## What to Do If Stuck

If the agent is doing something unexpected during testing and it is not sure whether it's a bug or expected behaviour, bring it to Majid with a specific log excerpt rather than trying to diagnose it independently — the faster he knows about it, the faster it gets fixed while the relevant code is still fresh.