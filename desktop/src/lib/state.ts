export type Confidence = "confirmed" | "inferred" | "uncertain";

export interface Finding {
  id: string;
  title: string;
  confidence: Confidence;
  source: string; // e.g. "vol_pslist"
  functionCallId?: string;
  timestamp: string; // ISO-8601
  detail?: string;
}

export type PhaseId = 1 | 2 | 3 | 4 | 5;

export interface PhaseState {
  id: PhaseId;
  name: string;
  status: "pending" | "active" | "done";
  iteration: number;
}

export const INITIAL_PHASES: PhaseState[] = [
  { id: 1, name: "Initial Survey", status: "pending", iteration: 0 },
  { id: 2, name: "Targeted Deep-Dive", status: "pending", iteration: 0 },
  { id: 3, name: "Cross-Validation", status: "pending", iteration: 0 },
  { id: 4, name: "Self-Correction", status: "pending", iteration: 0 },
  { id: 5, name: "Synthesis", status: "pending", iteration: 0 },
];
