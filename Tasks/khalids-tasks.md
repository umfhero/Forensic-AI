# Khalid's Tasks — forensic-AI

**Role: Demo Lead, Setup & Deployment Owner**

Ownership areas are the demo video, the try-it-out instructions, and local setup, which might sound like support work but are actually central to the judging. Criterion #6 (Usability and Documentation) is equally weighted with the other five criteria, and the demo video is the first thing the judges watch before they look at anything else. Getting those two things right is a real contribution.

On top of that, ownership of the deployment pipeline is given, which means being the person who actually verifies that the setup instructions work on a clean SIFT Workstation install and that the repo is reproducible by someone who wasn't on the team. This matters because the judges need to be able to run it themselves.

This is also a chance to go deep on something technical, so as the setup and testing process is worked through, interactions with Protocol SIFT, the SIFT Workstation tools, and the MCP layer will build understanding of the whole system.

---

## Phase 0 — Pre-Hackathon Setup (before 15 Apr)

- [ ] Install SIFT Workstation and follow the Protocol SIFT install script: `curl -fsSL https://raw.githubusercontent.com/teamdfir/protocol-sift/main/install.sh | bash`
- [ ] Document every step taken during the install, including errors hit and how they were resolved, since this becomes the foundation of the try-it-out instructions later
- [ ] Run Protocol SIFT against the starter case data and get a feel for how the agent behaves — there is no need to analyse the forensic output deeply at this stage, but it should be understood what the agent is doing at a high level
- [ ] Review the Valhuntir submission (https://github.com/AppliedIR/Valhuntir) and pay attention to how their try-it-out instructions and demo video are structured, since that's the quality bar being matched

---

## Phase 1 — Foundation (Weeks 1–2, 15–29 Apr)

- [ ] Keep a running log of every setup decision and dependency that Majid and Mauro make, since these need to be reflected in the try-it-out instructions — ask them directly if something is unclear
- [ ] Draft the local setup document early, even as a rough skeleton, covering: prerequisites (SIFT Workstation, Protocol SIFT, API key, runtime dependencies), repo clone, MCP server setup, reasoning framework deployment, and how to point the agent at an evidence set
- [ ] Set up screen recording software on the machine and get comfortable with it, since the demo needs to be a live terminal recording with audio narration, not slides or a pre-baked video
- [ ] Identify the specific moment in the triage loop where self-correction is most clearly visible, since the demo must show at least one self-correction sequence and it must be known exactly where to point the camera

---

## Phase 2 — Reasoning Framework Phase (Weeks 3–4, 30 Apr–13 May)

- [ ] Work with Yasmine on the accuracy report, specifically running the agent against evidence sets and recording outputs systematically, since both will be doing this across phases 2 and 3
- [ ] Start building the demo script: what evidence set is used, what the agent is doing in each phase of the triage loop, and how the self-correction moment will be narrated clearly for a judge who may not be familiar with forensic tool output
- [ ] As the reasoning framework develops, run the agent against sample evidence to explain what it's doing from own understanding, not just from reading someone else's notes
- [ ] Update the setup document as Mauro finalises the MCP server dependencies and Majid finalises the CLAUDE.md skill file locations

---

## Phase 3 — Refinement (Weeks 5–6, 14–27 May)

- [ ] Run the try-it-out instructions end-to-end on a clean SIFT Workstation install — not a development machine, a clean install — and document every place where the instructions fail or require knowledge that isn't written down
- [ ] Fix those gaps and re-run until someone starting from scratch can follow the instructions without needing to ask the team anything
- [ ] Finalise the demo script and do at least one full dry run of the recording, timing it against the 5-minute limit
- [ ] Work with Yasmine to make sure the accuracy report data from test runs is being captured correctly

---

## Phase 4 — Demo & Submit (Weeks 7–8, 28 May–15 Jun)

- [ ] Record the final demo video using Claude API credits for the live run (confirm with Majid when to switch)
- [ ] The demo must show: (1) the agent starting a triage run on an evidence set, (2) at least one self-correction sequence where the agent detects an issue and adjusts, (3) the final structured report output with confidence classifications
- [ ] Narrate clearly what the agent is doing at each phase — the judges are senior IR practitioners so technical knowledge can be assumed, but the narration should connect the agent's behaviour to the judging criteria explicitly (e.g. "here the agent flags this finding as INFERRED because the Prefetch record is absent")
- [ ] Keep the video under 5 minutes — this is a hard limit
- [ ] Finalise the try-it-out instructions and make sure they're linked from the README
- [ ] Support Yasmine on the final submission checklist review

---

## Submission Components Owned

| #   | Deliverable             | Role                   |
| --- | ----------------------- | ---------------------- |
| 2   | Demo Video              | Lead                   |
| 6   | Accuracy Report         | Co-lead (with Yasmine) |
| 7   | Try-It-Out Instructions | Lead                   |

---

## Key Files Being Built

- `/docs/SETUP.md` or `INSTALL.md` — the try-it-out instructions, from prerequisites through to running the agent against evidence
- Demo video recording (live terminal + audio narration, max 5 minutes)
- Demo script (working document before recording)

---

## Learning as You Go

Familiarity with Protocol SIFT, the SIFT Workstation tools, and MCP-based agent architectures will be built by working through the setup and testing process deeply rather than having it explained, which is the fastest way to understand the system well enough to narrate a demo confidently and answer judge questions accurately.

If something is not understood, bring it to Majid or Mauro early rather than guessing, since a wrong assumption in the setup instructions or demo narration is worse than asking.
