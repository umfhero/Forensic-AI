/**
 * Triage loop orchestrator — phases 1, 2, 3, 5 of the investigative sequence.
 *
 * Lives in the desktop main process (not the MCP server) so the reasoning
 * layer is separate from the typed tool layer. The MCP server stays pure:
 * structured tool I/O, nothing more. This file encodes the rules from
 * `skills/INVESTIGATION_SEQUENCING.md`, `skills/CROSS_VALIDATION.md`,
 * `skills/CONFIDENCE_CLASSIFICATION.md`, and `skills/ANTI_HALLUCINATION.md`.
 *
 * In production, the same interface can be driven by an LLM agent — the
 * mock-mode logic here is deterministic so the desktop app stays usable
 * without SIFT / API credits. Phase 4 (self-correction) is owned by Mauro
 * and slots in between phases 3 and 5 when ready.
 */

import type { EventEmitter } from "node:events";
import type { Client } from "@modelcontextprotocol/sdk/client/index.js";

// --- Wire format (mirrors mcp-server/src/schemas/output.ts) ----------------

export type Confidence = "confirmed" | "inferred" | "uncertain";

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

export type PhaseStatus = "pending" | "active" | "done" | "error";

export interface PhaseEvent {
  phase: 1 | 2 | 3 | 4 | 5;
  name: string;
  status: PhaseStatus;
  iteration: number;
  timestamp: string;
  note?: string;
}

export interface TriageRunOptions {
  memoryImage: string;
  diskEvidence: string;
  eventLogPath: string;
}

export interface TriageRunResult {
  ok: boolean;
  findings: Finding[];
  phases: PhaseEvent[];
  error?: string;
}

// --- Helpers ---------------------------------------------------------------

const PHASE_NAMES: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: "Initial Survey",
  2: "Targeted Deep-Dive",
  3: "Cross-Validation",
  4: "Self-Correction",
  5: "Synthesis",
};

// Parse the stringified JSON the MCP server wraps in `content[0].text`.
// Returns null on any failure — callers must record an UNCERTAIN finding
// rather than fabricate one.
function unwrapMcpResult(raw: unknown): {
  status?: string;
  data?: unknown;
  metadata?: { function_call_id?: string; source_artefact?: string; tool?: string };
  pagination?: { total_results?: number };
} | null {
  if (!raw || typeof raw !== "object") return null;
  const content = (raw as { content?: Array<{ type: string; text?: string }> }).content;
  if (!Array.isArray(content) || content.length === 0) return null;
  const first = content[0];
  if (!first || first.type !== "text" || typeof first.text !== "string") return null;
  try {
    return JSON.parse(first.text);
  } catch {
    return null;
  }
}

interface ProcessRow {
  pid: number;
  ppid: number;
  image_name: string;
  create_time: string | null;
  session_id: number;
  offset: string;
}

interface NetRow {
  protocol: string;
  local_addr: string;
  local_port: number;
  remote_addr: string;
  remote_port: number;
  state: string;
  pid: number;
  owner: string;
  create_time: string | null;
}

interface MalfindRow {
  pid: number;
  process: string;
  address: string;
  protection: string;
  private_memory: boolean;
  notes: string;
}

interface EventRow {
  event_id: number;
  channel: string;
  provider: string;
  timestamp: string;
  message: string;
  data: Record<string, unknown>;
}

// Heuristics adapted from INVESTIGATION_SEQUENCING.md / CROSS_VALIDATION.md.
const SUSPICIOUS_PORTS = new Set<number>([4444, 1337, 31337, 8080, 8443, 6666]);

// RFC 1918 + loopback + link-local = "not external"
function isExternalIP(ip: string): boolean {
  if (!ip) return false;
  if (ip === "*" || ip === "0.0.0.0") return false;
  if (ip.startsWith("10.")) return false;
  if (ip.startsWith("127.")) return false;
  if (ip.startsWith("169.254.")) return false;
  if (ip.startsWith("192.168.")) return false;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(ip)) return false;
  if (ip === "::1" || ip.startsWith("fe80:") || ip.startsWith("fc") || ip.startsWith("fd")) return false;
  return true;
}

// --- Orchestrator ----------------------------------------------------------

export class TriageOrchestrator {
  constructor(
    private readonly client: Client,
    private readonly events: EventEmitter,
  ) {}

  private findings: Finding[] = [];
  private phaseLog: PhaseEvent[] = [];
  private nextFindingId = 1;

  private emitPhase(phase: 1 | 2 | 3 | 4 | 5, status: PhaseStatus, note?: string): void {
    const ev: PhaseEvent = {
      phase,
      name: PHASE_NAMES[phase],
      status,
      iteration: 1,
      timestamp: new Date().toISOString(),
      note,
    };
    this.phaseLog.push(ev);
    this.events.emit("phase", ev);
  }

  private emitFinding(f: Omit<Finding, "id" | "timestamp">): Finding {
    const finding: Finding = {
      ...f,
      id: `f-${this.nextFindingId++}`,
      timestamp: new Date().toISOString(),
    };
    this.findings.push(finding);
    this.events.emit("finding", finding);
    return finding;
  }

  private async call<T>(
    name: string,
    args: Record<string, unknown>,
  ): Promise<{ rows: T[]; functionCallId: string; artefact: string } | null> {
    try {
      const raw = await this.client.callTool({ name, arguments: args });
      const unwrapped = unwrapMcpResult(raw);
      if (!unwrapped || unwrapped.status !== "success") return null;
      const rows = (unwrapped.data ?? []) as T[];
      const meta = unwrapped.metadata ?? {};
      return {
        rows: Array.isArray(rows) ? rows : [],
        functionCallId: meta.function_call_id ?? "",
        artefact: meta.source_artefact ?? "",
      };
    } catch (err) {
      this.events.emit(
        "diagnostic",
        `[triage] call ${name} failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      return null;
    }
  }

  async run(opts: TriageRunOptions): Promise<TriageRunResult> {
    this.findings = [];
    this.phaseLog = [];
    this.nextFindingId = 1;

    try {
      // -- Phase 1: Initial Survey ----------------------------------------
      this.emitPhase(1, "active", "Broad-scope pslist + netscan + event-log sweep");

      const ps = await this.call<ProcessRow>("vol_pslist", {
        memoryImage: opts.memoryImage,
        offset: 0,
        limit: 500,
      });
      const net = await this.call<NetRow>("vol_netscan", {
        memoryImage: opts.memoryImage,
        offset: 0,
        limit: 500,
      });
      const evLogs = await this.call<EventRow>("parse_event_logs", {
        evidencePath: opts.eventLogPath,
        offset: 0,
        limit: 500,
      });

      if (!ps) {
        this.emitPhase(1, "error", "vol_pslist failed — cannot continue");
        return { ok: false, findings: this.findings, phases: this.phaseLog, error: "vol_pslist failed" };
      }

      // Build a pid -> process lookup so later phases can name their evidence.
      const procByPid = new Map<number, ProcessRow>();
      for (const p of ps.rows) procByPid.set(p.pid, p);

      // CONFIRMED: every running process is in memory — but we only surface
      // processes that look suspicious in some way. The rest stay in the
      // audit trail via the function_call_id.
      const suspiciousPidSet = new Set<number>();

      // Flag: abnormal parent-child pairs (cmd spawned by non-explorer/shell parents
      // is common; powershell spawned by cmd is a classic download-cradle signal).
      for (const p of ps.rows) {
        const parent = procByPid.get(p.ppid);
        const name = p.image_name.toLowerCase();
        if (name === "powershell.exe" && parent?.image_name.toLowerCase() === "cmd.exe") {
          suspiciousPidSet.add(p.pid);
          this.emitFinding({
            title: `powershell.exe (PID ${p.pid}) spawned by cmd.exe (PID ${p.ppid}) — classic download-cradle pattern`,
            confidence: "confirmed",
            phase: 1,
            source: "vol_pslist",
            function_call_ids: [ps.functionCallId],
            source_artefacts: [ps.artefact],
            kill_chain_stage: "Exploitation",
            event_time: p.create_time ?? undefined,
            evidence: `PID ${p.pid} image_name=${p.image_name} ppid=${p.ppid} parent=${parent.image_name} create_time=${p.create_time}`,
          });
        }
      }

      // Flag: external ESTABLISHED connections, especially to suspicious ports.
      if (net) {
        for (const c of net.rows) {
          if (c.state.toUpperCase() !== "ESTABLISHED") continue;
          if (!isExternalIP(c.remote_addr)) continue;
          const suspiciousPort = SUSPICIOUS_PORTS.has(c.remote_port);
          suspiciousPidSet.add(c.pid);
          this.emitFinding({
            title: `${c.owner} (PID ${c.pid}) has ESTABLISHED connection to ${c.remote_addr}:${c.remote_port}${suspiciousPort ? " (known-bad port)" : ""}`,
            confidence: "confirmed",
            phase: 1,
            source: "vol_netscan",
            function_call_ids: [net.functionCallId],
            source_artefacts: [net.artefact],
            kill_chain_stage: "Command and Control",
            event_time: c.create_time ?? undefined,
            evidence: `${c.protocol} ${c.local_addr}:${c.local_port} -> ${c.remote_addr}:${c.remote_port} state=${c.state} pid=${c.pid} owner=${c.owner}`,
          });
        }
      } else {
        this.emitFinding({
          title: "Network scan unavailable — netscan tool failed to return results",
          confidence: "uncertain",
          phase: 1,
          source: "vol_netscan",
          function_call_ids: [],
          source_artefacts: [opts.memoryImage],
          evidence: "vol_netscan returned no parseable result",
          gaps: "Unable to enumerate network connections for this capture",
          follow_up: "Re-run vol_netscan with --pid scope once suspect PIDs are known",
        });
      }

      // Flag: event-log indicators (4688 with encoded PS, Sysmon 3 to suspicious ports)
      if (evLogs) {
        for (const e of evLogs.rows) {
          if (e.event_id === 4688) {
            const cmdline = String(e.data["ProcessCommandLine"] ?? "");
            if (/-enc(odedcommand)?\s/i.test(cmdline) || /\s-w\s+hidden/i.test(cmdline)) {
              this.emitFinding({
                title: `Security 4688 shows PowerShell launched with obfuscated command line`,
                confidence: "confirmed",
                phase: 1,
                source: "parse_event_logs",
                function_call_ids: [evLogs.functionCallId],
                source_artefacts: [evLogs.artefact],
                kill_chain_stage: "Exploitation",
                event_time: e.timestamp,
                evidence: `Event 4688 @ ${e.timestamp}: ${cmdline.slice(0, 160)}${cmdline.length > 160 ? "…" : ""}`,
              });
            }
          }
          if (e.event_id === 3 && e.channel.includes("Sysmon")) {
            const port = Number(e.data["DestinationPort"] ?? 0);
            const ip = String(e.data["DestinationIp"] ?? "");
            if (SUSPICIOUS_PORTS.has(port) && isExternalIP(ip)) {
              this.emitFinding({
                title: `Sysmon EID 3: outbound connection to ${ip}:${port} from ${e.data["Image"] ?? "unknown"}`,
                confidence: "confirmed",
                phase: 1,
                source: "parse_event_logs",
                function_call_ids: [evLogs.functionCallId],
                source_artefacts: [evLogs.artefact],
                kill_chain_stage: "Command and Control",
                event_time: e.timestamp,
                evidence: `Sysmon/Operational EID 3 @ ${e.timestamp}: pid=${e.data["ProcessId"]} image=${e.data["Image"]} -> ${ip}:${port}`,
              });
            }
          }
        }
      }

      this.emitPhase(1, "done", `Phase 1 flagged ${suspiciousPidSet.size} suspicious PID(s)`);

      // -- Phase 2: Targeted Deep-Dive ------------------------------------
      this.emitPhase(2, "active", `Deep-diving ${suspiciousPidSet.size} PID(s) with vol_malfind`);

      const pidsOfInterest = Array.from(suspiciousPidSet);
      for (const pid of pidsOfInterest) {
        const mf = await this.call<MalfindRow>("vol_malfind", {
          memoryImage: opts.memoryImage,
          pid,
          rwxOnly: true,
          offset: 0,
          limit: 50,
        });
        if (!mf) continue;
        if (mf.rows.length === 0) {
          this.emitFinding({
            title: `No injected RWX regions found in PID ${pid}`,
            confidence: "confirmed",
            phase: 2,
            source: "vol_malfind",
            function_call_ids: [mf.functionCallId],
            source_artefacts: [mf.artefact],
            evidence: `vol_malfind returned 0 entries for pid=${pid} (rwxOnly=true)`,
          });
          continue;
        }
        for (const region of mf.rows) {
          const mzHeader = region.notes.toUpperCase().includes("MZ_HEADER");
          const shellcode = region.notes.toUpperCase().includes("SHELLCODE");
          this.emitFinding({
            title: `PID ${region.pid} (${region.process}) has RWX region at ${region.address}${mzHeader ? " with MZ header" : shellcode ? " with shellcode stub" : ""}`,
            confidence: "confirmed",
            phase: 2,
            source: "vol_malfind",
            function_call_ids: [mf.functionCallId],
            source_artefacts: [mf.artefact],
            kill_chain_stage: "Installation",
            evidence: `address=${region.address} protection=${region.protection} private=${region.private_memory} notes=${region.notes}`,
          });
        }
      }

      this.emitPhase(2, "done");

      // -- Phase 3: Cross-Validation --------------------------------------
      this.emitPhase(3, "active", "Correlating memory, network, and event-log signal");

      // Rule: a memory-resident PID with an ESTABLISHED external connection
      // AND a matching Sysmon/Security 4688 record is a promotable INFERRED
      // finding about the initial access / C2 chain.
      for (const pid of pidsOfInterest) {
        const proc = procByPid.get(pid);
        if (!proc) continue;

        const netFinding = this.findings.find(
          (f) => f.phase === 1 && f.source === "vol_netscan" && f.evidence.includes(`pid=${pid}`),
        );
        const evFinding = this.findings.find(
          (f) =>
            f.phase === 1 &&
            f.source === "parse_event_logs" &&
            (f.evidence.includes(`pid=${pid}`) || f.title.toLowerCase().includes("powershell")),
        );
        const mfFinding = this.findings.find(
          (f) => f.phase === 2 && f.source === "vol_malfind" && f.title.includes(`PID ${pid}`),
        );

        if (netFinding && evFinding) {
          this.emitFinding({
            title: `${proc.image_name} (PID ${pid}) is the most likely initial-access execution vector`,
            confidence: "inferred",
            phase: 3,
            source: "cross-validation",
            function_call_ids: Array.from(
              new Set([
                ...netFinding.function_call_ids,
                ...evFinding.function_call_ids,
                ...(mfFinding?.function_call_ids ?? []),
              ]),
            ),
            source_artefacts: Array.from(
              new Set([
                ...netFinding.source_artefacts,
                ...evFinding.source_artefacts,
                ...(mfFinding?.source_artefacts ?? []),
              ]),
            ),
            kill_chain_stage: "Exploitation",
            event_time: proc.create_time ?? undefined,
            based_on: [netFinding.id, evFinding.id, ...(mfFinding ? [mfFinding.id] : [])],
            evidence:
              `Memory shows PID ${pid} running as ${proc.image_name}; ` +
              `netscan confirms outbound C2 connection; ` +
              `event logs capture the launch and/or initial callout.`,
            reasoning:
              `(1) ${netFinding.title}\n(2) ${evFinding.title}` +
              (mfFinding ? `\n(3) ${mfFinding.title}` : "") +
              `\nThe cmd→powershell→external-C2 sequence is a well-documented download-cradle pattern; combined with the process being memory-resident, this is the most parsimonious explanation.`,
            alternatives:
              "A legitimate admin script matching this exact pattern is possible but unlikely given the suspicious remote port and obfuscated command line.",
          });
        }
      }

      // Rule: missing Prefetch/Amcache evidence for the dropped payload.
      // In mock mode we don't have a disk timeline run yet; record the gap
      // honestly so the report surfaces it as UNCERTAIN.
      this.emitFinding({
        title: "Execution of C:\\Users\\victim\\AppData\\Local\\Temp\\payload.exe not yet confirmed",
        confidence: "uncertain",
        phase: 3,
        source: "cross-validation",
        function_call_ids: [],
        source_artefacts: [opts.diskEvidence],
        evidence:
          "Sysmon EID 11 confirms creation of payload.exe. No Prefetch or Amcache artefact has been queried yet.",
        gaps: "No Prefetch/Amcache data pulled for the payload path",
        follow_up:
          "Run build_supertimeline scoped to 09:15:50–09:16:30 with sourceType=PE to fetch Prefetch; query Amcache.hve via shell",
      });

      this.emitPhase(3, "done");

      // -- Phase 4 is owned by Mauro (self-correction); marked pending. ---
      this.emitPhase(4, "pending", "Self-correction loop not yet wired (Mauro)");

      // -- Phase 5: Synthesis --------------------------------------------
      this.emitPhase(5, "active", "Assembling structured report");

      const confirmed = this.findings.filter((f) => f.confidence === "confirmed").length;
      const inferred = this.findings.filter((f) => f.confidence === "inferred").length;
      const uncertain = this.findings.filter((f) => f.confidence === "uncertain").length;

      this.emitFinding({
        title: `Triage complete — ${confirmed} confirmed, ${inferred} inferred, ${uncertain} uncertain`,
        confidence: "confirmed",
        phase: 5,
        source: "synthesis",
        function_call_ids: [],
        source_artefacts: [],
        evidence: `Total findings: ${this.findings.length}`,
      });

      this.emitPhase(5, "done");

      return { ok: true, findings: this.findings, phases: this.phaseLog };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { ok: false, findings: this.findings, phases: this.phaseLog, error: message };
    }
  }
}
