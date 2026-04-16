# Yasmine's Tasks — forensic-AI

**Role: QA, Compliance & Documentation Lead**

This role covers three things that are genuinely important for winning this, not just finishing it. First, running the tests and building the accuracy report, which feeds directly into judging criterion #2 (IR Accuracy). Second, building the governance layer, which covers criterion #4 (Constraint Implementation) and gives the submission something most other teams won't have. Third, owning the architecture diagram and the dataset documentation, which criterion #6 (Usability and Documentation) depends on. All of these sit in the `overview.md` submission checklist under this role.

Planned ideas around legal guardrails, false positive testing, and the compliance scoring system have been incorporated below, mapped to where they actually fit in the project timeline and submission requirements.

---

## Phase 0 — Pre-Hackathon Setup (before 15 Apr)

- [ ] Install SIFT Workstation and run Protocol SIFT against the starter case data (https://sansorg.egnyte.com/fl/HhH7crTYT4JK)
- [ ] Go through the Protocol SIFT NotebookLM notebook (link in `overview.md`) to understand what Protocol SIFT is and how it works before starting to test it
- [ ] Review the Valhuntir submission (https://github.com/AppliedIR/Valhuntir) — look specifically at the architecture diagram format and the accuracy documentation to understand the quality bar
- [ ] Join the Protocol SIFT Slack, monitor #announcements, and track any additional evidence sets or rule clarifications that get posted
- [ ] Go to https://findevil.devpost.com/rules and read the full rules section, then check if anything creates compliance risks for the submission format

---

## Phase 1 — Foundation + Protocol SIFT Deep Dive (Weeks 1–2, 15–29 Apr)

**Testing & Baseline Documentation**

- [ ] Run Protocol SIFT against the starter evidence sets and document what it gets right and where it fails, specifically: hallucinated findings (claimed something that isn't there), missed artefacts (missed something that is there), and incorrect confidence (presented an inference as a confirmed fact)
- [ ] Record this as the baseline, since the accuracy report needs to show improvement over Protocol SIFT's default behaviour
- [ ] Explore the starter case data thoroughly and document what evidence types are present, what the apparent ground truth is, and which SIFT tools the agent uses against each evidence type

**Architecture Diagram (start early)**

- [ ] Begin the architecture diagram draft, showing the three-layer stack (Protocol SIFT foundation, custom MCP functions, reasoning framework) and the self-correcting triage loop above it
- [ ] Mark trust boundaries: what's read-only, where structured output enforcement happens, where confidence classification happens
- [ ] Use the architecture section of `overview.md` as the source of truth for what to show

**Governance Layer (novel contribution beyond QA)**

- [ ] Create a `/governance` folder in the repo
- [ ] Draft 5–10 "Golden Rules" that the agent must follow, derived from a combination of: (1) the hackathon rules at https://findevil.devpost.com/rules, (2) the EU AI Act requirements relevant to agentic systems, (3) GDPR constraints on evidence handling, and (4) forensic chain of custody standards. Keep these as short, unambiguous rules, not lengthy policy text.
- [ ] Write a `GUARDRAILS.md` file that documents the hard limits, specifically: the agent must not delete or modify original evidence, the agent must not take destructive actions without explicit human approval, and all actions must be logged. This maps to criterion #4.
- [ ] Identify which of these guardrails are architectural (enforced by the read-only evidence mount and the MCP function output schema) and which are prompt-based (enforced by the CLAUDE.md skill files), since the judges explicitly ask for this distinction

**Tool & MCP Inventory**

- [ ] List every SIFT tool the agent invokes during Protocol SIFT baseline testing, the tool version, what it's called for, and what its raw output format looks like, since this feeds into decisions on which tools need custom MCP functions and also feeds into the dataset documentation

---

## Phase 2 — Reasoning Framework + QA (Weeks 3–4, 30 Apr–13 May)

- [ ] Run the agent against sample evidence as Majid and Mauro build out the reasoning framework, and document every output for comparison against the Protocol SIFT baseline
- [ ] Track: did confidence classification improve? Did the agent stop presenting inferences as confirmed facts? Did self-correction actually trigger and change the output?
- [ ] Start building the accuracy report template with columns for: evidence set, finding, correct/incorrect, false positive/false negative, hallucination flag, which guardrail caught it (if any)
- [ ] Build the Compliance Scoring System (0–100 scale) based on the Golden Rules from the governance folder, so the demo has a quantifiable output rather than just claiming "it's compliant." Score by category: Legal (EU AI Act / GDPR), Hackathon Rules, Forensic Standards. The score updates based on which rules passed and which triggered during a given run.
- [ ] Build the "Why Log" schema for chain-of-custody output: every agent action should produce a structured log entry with the action taken, the reasoning, the evidence cited, and the confidence classification. Work with Mauro on the log format since he's building the execution logging system.

---

## Phase 3 — Refinement + Bypass Testing (Weeks 5–6, 14–27 May)

- [ ] Run full triage sequences across multiple evidence sets and record: does the self-correction loop actually trigger, does it improve the output on subsequent passes, does the agent correctly classify findings as CONFIRMED / INFERRED / UNCERTAIN?
- [ ] Run the accuracy report with real data: false positives, missed artefacts, hallucinated claims
- [ ] **Bypass testing** — this is important for criterion #4: test what happens when the agent is prompted to take a destructive action (delete a file, modify evidence), and document whether the architectural guardrails hold or whether only the prompt-based guardrails stop it. Document the results honestly in the accuracy report, since the judges value honesty about this specifically.
- [ ] Update the architecture diagram to reflect the final component relationships and show clearly which boundaries are architectural vs prompt-based
- [ ] Update the `/governance` folder with the bypass test results so it's part of the documented governance record

---

## Phase 4 — Polish, Demo, Submit (Weeks 7–8, 28 May–15 Jun)

- [ ] Finalise the accuracy report with all test data from phases 2–3
- [ ] Finalise the dataset documentation: what evidence sets were tested, what the sources were, what the agent found, what it missed
- [ ] Finalise the architecture diagram to submission quality
- [ ] Co-write the Devpost project description with Majid
- [ ] **Final submission checklist review** — go through every one of the 8 mandatory components and confirm each is complete before submission

---

## Submission Components Owned

| # | Deliverable | Role |
|---|-------------|-----------|
| 3 | Architecture Diagram | Lead |
| 4 | Written Project Description | Co-author (with Majid) |
| 5 | Dataset Documentation | Lead |
| 6 | Accuracy Report | Co-lead (with Kali) |

---

## Key Files and Folders Being Built

- `/governance/GOLDEN_RULES.md` — the 5–10 rules derived from hackathon rules, EU AI Act, GDPR, forensic standards
- `/governance/GUARDRAILS.md` — hard limits on destructive actions and logging requirements
- `/governance/COMPLIANCE_SCORE.md` — the 0–100 scoring system with category breakdown
- `/docs/ARCHITECTURE_DIAGRAM.{png|svg}` — the submission-ready architecture diagram
- `/docs/DATASET_DOCUMENTATION.md` — evidence sets, sources, findings
- `/docs/ACCURACY_REPORT.md` — false positives, missed artefacts, hallucinations, bypass test results
- `/docs/TOOL_INVENTORY.md` — every SIFT tool the agent touches, version, and raw output format

---

## Things to Watch

- Monitor the Protocol SIFT Slack, specifically for additional evidence sets, rule clarifications, and any announcements about API credits
- Track other teams' questions in Slack since they often reveal requirements or edge cases not considered
- Keep an eye on the Devpost updates page (https://findevil.devpost.com/updates) weekly