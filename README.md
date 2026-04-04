<p align="center">
  <img src="https://img.shields.io/badge/FIND_EVIL!-Hackathon_2026-red?style=for-the-badge" alt="FIND EVIL! Hackathon 2026"/>
  <img src="https://img.shields.io/badge/SANS-Institute-blue?style=for-the-badge" alt="SANS Institute"/>
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge" alt="MIT License"/>
</p>

<h1 align="center">forensic-ai</h1>

<p align="center">
  <strong>An autonomous forensic triage agent that thinks like a senior incident responder.</strong>
  <br/>
  Built on Protocol SIFT · Powered by MCP · Self-correcting by design
</p>

---

## What This Is

forensic-ai extends [Protocol SIFT](https://www.sans.org/tools/sift-workstation) with a structured reasoning framework and self-correcting triage loop, teaching the agent how to sequence an investigation, cross-validate findings between disk and memory, catch its own mistakes, and produce investigative reports rather than raw tool dumps.

Built for the [FIND EVIL! Hackathon](https://findevil.devpost.com/) (SANS Institute, Apr–Jun 2026).

## Architecture

```
  Self-Correcting Triage Loop (5 phases, max-iteration cap)
                        ▼
  Reasoning Framework (CLAUDE.md skill files)
  Investigation sequencing · Cross-validation · Confidence classification
  Anti-hallucination · Structured reporting · Self-correction protocol
                        ▼
  Focused Custom MCP Functions (5–8)
  Typed output for high-volume tools (Volatility, supertimelines, EVTX)
                        ▼
  Protocol SIFT (foundation)
  Claude Code / OpenClaw · 200+ SIFT Workstation tools via MCP
                        ▼
  Evidence Store (read-only)
  Disk images · Memory captures · Log files · Network captures
```

**Three layers of novel contribution on top of Protocol SIFT:**

1. **Focused Custom MCP Functions** for tools where raw output overflows the context window (Volatility, log2timeline, large EVTX sets). Typed, structured JSON with pagination.
2. **Reasoning Framework** encoded as CLAUDE.md skill files: investigation sequencing, disk-to-memory cross-validation, confidence classification (CONFIRMED / INFERRED / UNCERTAIN), anti-hallucination checks, and structured report templates.
3. **Self-Correcting Triage Loop** that detects errors in its own analysis, re-runs with adjusted parameters, and documents what changed between iterations. Capped at 3–5 cycles with graceful degradation.

## Getting Started

> ⚠️ **This project is under active development.** Setup instructions will be finalised during the hackathon period (15 Apr – 15 Jun 2026).

### Prerequisites

- [SANS SIFT Workstation](https://www.sans.org/tools/sift-workstation) (download the OVA)
- Protocol SIFT installed on SIFT Workstation:
  ```bash
  curl -fsSL https://raw.githubusercontent.com/teamdfir/protocol-sift/main/install.sh | bash
  ```
- Claude Code or OpenClaw (agentic framework)
- Git

### Installation

```bash
git clone https://github.com/umfhero/forensic-ai.git
cd forensic-ai
# Further setup steps TBD
```

## How It Works

The agent follows a structured five-phase triage sequence:

| Phase | What Happens |
|---|---|
| **1. Initial Survey** | Broad-scope analysis (process listing, supertimeline, event logs) to establish a baseline and identify time windows of interest. |
| **2. Targeted Deep-Dive** | Focused analysis on suspicious findings from Phase 1, using the appropriate tools for the specific artefact type. |
| **3. Cross-Validation** | Compares findings across disk and memory sources, flags discrepancies, and assesses what they mean. |
| **4. Self-Correction** | Evaluates its own analysis for gaps, unsupported assumptions, and contradictions. Re-runs targeted functions and documents what changed. |
| **5. Synthesis** | Produces a structured investigative narrative with confirmed findings separated from inferences and every claim traced to a specific tool execution. |

Every finding is classified as **CONFIRMED** (traced to specific artefact), **INFERRED** (logical deduction, explicitly stated), or **UNCERTAIN** (flagged for human review).

## Project Status

See [overview.md](overview.md) for the full project plan, progress tracker, submission checklist, and open questions.

| Milestone | Target | Status |
|---|---|---|
| SIFT Workstation + Protocol SIFT setup | Before 15 Apr | 🔲 Not started |
| Custom MCP function scaffold | Weeks 1–2 | 🔲 Not started |
| Reasoning framework (CLAUDE.md skill files) | Weeks 3–4 | 🔲 Not started |
| Self-correction loop | Weeks 3–4 | 🔲 Not started |
| Cross-validation + refinement | Weeks 5–6 | 🔲 Not started |
| Demo, polish, submit | Weeks 7–8 | 🔲 Not started |
| **Submission deadline** | **15 Jun 2026** | ⏳ |

## Contributors

<table>
  <tr>
    <td align="center">
      <a href="https://github.com/umfhero">
        <img src="https://github.com/umfhero.png" width="100px;" alt="Majid"/>
        <br/>
        <sub><b>Majid</b></sub>
      </a>
      <br/>
      <sub>Lead Dev · MCP + Reasoning Framework</sub>
    </td>
    <td align="center">
      <a href="https://github.com/Disc0nnect3d17">
        <img src="https://github.com/Disc0nnect3d17.png" width="100px;" alt="Mauro"/>
        <br/>
        <sub><b>Mauro</b></sub>
      </a>
      <br/>
      <sub>Lead Dev · Agent + Self-Correction</sub>
    </td>
    <td align="center">
      <a href="https://github.com/Yaso-cyber">
        <img src="https://github.com/Yaso-cyber.png" width="100px;" alt="Yasmine"/>
        <br/>
        <sub><b>Yasmine</b></sub>
      </a>
      <br/>
      <sub>Documentation · QA · Accuracy Report</sub>
    </td>
    <td align="center">
      <a href="https://github.com/kali-fz">
        <img src="https://github.com/kali-fz.png" width="100px;" alt="Kali"/>
        <br/>
        <sub><b>Kali</b></sub>
      </a>
      <br/>
      <sub>Demo · DevOps · Try-It-Out</sub>
    </td>
  </tr>
</table>

## Hackathon

| | |
|---|---|
| **Event** | [FIND EVIL!](https://findevil.devpost.com/) — AI threats strike in minutes. Build the defender that responds in seconds. |
| **Sponsor** | [SANS Institute](https://sans.org) |
| **Period** | 15 April – 15 June 2026 |
| **Platform** | [SIFT Workstation](https://www.sans.org/tools/sift-workstation) + [Protocol SIFT](https://raw.githubusercontent.com/teamdfir/protocol-sift/main/install.sh) |

## Licence

[MIT](LICENCE)
