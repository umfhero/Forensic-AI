import type { Finding, PhaseEvent } from "../lib/state";

export interface TriageRunResult {
  ok: boolean;
  findings: Finding[];
  phases: PhaseEvent[];
  error?: string;
}

export interface TriageRunOptions {
  memoryImage: string;
  diskEvidence: string;
  eventLogPath: string;
}

export interface McpApi {
  start(opts?: { mockMode?: boolean }): Promise<{ ok: boolean; error?: string }>;
  stop(): Promise<{ ok: boolean }>;
  status(): Promise<"idle" | "starting" | "ready" | "error">;
  listTools(): Promise<Array<{ name: string; description?: string }>>;
  callTool(
    name: string,
    args: Record<string, unknown>,
  ): Promise<{ ok: boolean; result?: unknown; error?: string }>;
  runTriage(opts: TriageRunOptions): Promise<TriageRunResult>;
  onDiagnostic(cb: (line: string) => void): () => void;
  onStatusChange(cb: (status: string) => void): () => void;
  onFinding(cb: (finding: Finding) => void): () => void;
  onPhase(cb: (event: PhaseEvent) => void): () => void;
}

declare global {
  interface Window {
    forensicAI: McpApi;
  }
}

export {};
export interface McpApi {
  start(opts?: { mockMode?: boolean }): Promise<{ ok: boolean; error?: string }>;
  stop(): Promise<{ ok: boolean }>;
  status(): Promise<"idle" | "starting" | "ready" | "error">;
  listTools(): Promise<Array<{ name: string; description?: string }>>;
  callTool(
    name: string,
    args: Record<string, unknown>,
  ): Promise<{ ok: boolean; result?: unknown; error?: string }>;
  onDiagnostic(cb: (line: string) => void): () => void;
  onStatusChange(cb: (status: string) => void): () => void;
}

declare global {
  interface Window {
    forensicAI: McpApi;
  }
}

export {};
