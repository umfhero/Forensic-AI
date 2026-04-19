# Golden Rules

Ten short, unambiguous rules the agent must follow at all times. Derived from (a) the FIND EVIL! hackathon rules, (b) the EU AI Act provisions relevant to agentic systems operating on personal data, (c) GDPR constraints on processing digital evidence, and (d) generally accepted digital forensic chain-of-custody standards (ACPO / ISO 27037).

Each rule declares whether it is enforced **architecturally** (by code, file system, or schema) or by **prompt** (by skill-file instructions).

| #   | Rule                                                                                                                         | Enforcement       | Source                                   |
| --- | ---------------------------------------------------------------------------------------------------------------------------- | ----------------- | ---------------------------------------- |
| 1   | The agent must never modify, delete, rename, or re-timestamp original evidence.                                              | architectural     | Chain of custody; ACPO Principle 1       |
| 2   | Every action taken against evidence must produce a log entry with timestamp, `function_call_id`, tool, arguments, and hash.  | architectural     | ACPO Principle 3; hackathon audit-trail  |
| 3   | Destructive or externally-visible actions (network calls, file writes outside workspace, `rm`) require explicit human OK.    | architectural     | EU AI Act Art. 14 (human oversight)      |
| 4   | Every finding must be classified `CONFIRMED`, `INFERRED`, or `UNCERTAIN`. Inferences may never be presented as facts.        | prompt            | Hackathon criterion #2 (IR accuracy)     |
| 5   | Every finding must cite the tool output, artefact path, and offset/line that supports it.                                    | prompt + schema   | Hackathon criterion #2; ACPO Principle 2 |
| 6   | The agent must not invent tool output. If a tool was not run, it cannot be referenced.                                       | architectural     | MCP structured output; anti-hallucination|
| 7   | Personal data surfaced during triage must stay on the analyst workstation. No uploading to third-party services by default.  | architectural     | GDPR Art. 5, 32; EU AI Act Art. 10       |
| 8   | The agent must operate on a read-only mount of the evidence; writes are confined to the case workspace directory.            | architectural     | Chain of custody; ACPO Principle 1       |
| 9   | When uncertain, the agent must request clarification or mark a step UNCERTAIN rather than proceed confidently.               | prompt            | EU AI Act Art. 14; hackathon criterion #4|
| 10  | Every submission artefact (report, timeline, IOC list) must be reproducible from the execution log alone.                    | architectural     | Hackathon rules (reproducibility)        |

## Why these ten

- Rules 1, 2, 8, 10 cover forensic integrity. If any of these break, nothing the agent produces is admissible.
- Rules 3, 7, 9 cover the EU AI Act "human oversight" and "data governance" obligations for high-risk AI systems that act on personal data.
- Rules 4, 5, 6 cover hackathon judging criterion #2 (IR accuracy) and criterion #4 (constraint implementation) directly.

## Update log

| Date         | Change                          | By      |
| ------------ | ------------------------------- | ------- |
| 2026-04-19   | Initial draft.                  | Yasmine |
