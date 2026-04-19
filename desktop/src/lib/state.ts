export type Confidence = "confirmed" | "inferred" | "uncertain";

// Mirrors mcp-server/src/schemas/output.ts::FindingSchema and
// desktop/electron/triage.ts::Finding. Any change must be made in all three.
export interface Finding {
  id: string;
  title: string;
  confidence: Confidence;
  phase: 1 | 2 | 3 | 4 | 5;
  source: string;
  function_call_ids: string[];
  source_artefacts: string[];
  kill_chain_stage?: string;
  timestamp: string;
  event_time?: string;
  evidence: string;
  reasoning?: string;
  alternatives?: string;
  gaps?: string;
  contradictions?: string;
  follow_up?: string;
  based_on?: string[];
}

export type PhaseId = 1 | 2 | 3 | 4 | 5;
export type PhaseStatus = "pending" | "active" | "done" | "error";

export interface PhaseState {
  id: PhaseId;
  name: string;
  status: PhaseStatus;
  iteration: number;
  note?: string;
}

export interface PhaseEvent {
  phase: PhaseId;
  name: string;
  status: PhaseStatus;
  iteration: number;
  timestamp: string;
  note?: string;
}

export const INITIAL_PHASES: PhaseState[] = [
  { id: 1, name: "Initial Survey", status: "pending", iteration: 0 },
  { id: 2, name: "Targeted Deep-Dive", status: "pending", iteration: 0 },
  { id: 3, name: "Cross-Validation", status: "pending", iteration: 0 },
  { id: 4, name: "Self-Correction", status: "pending", iteration: 0 },
  { id: 5, name: "Synthesis", status: "pending", iteration: 0 },
];
