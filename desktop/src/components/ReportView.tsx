import type { Finding } from "../lib/state";

interface Props {
  findings: Finding[];
}

// Lockheed-Martin kill-chain order, per skills/REPORT_STRUCTURE.md.
const KILL_CHAIN_ORDER = [
  "Reconnaissance",
  "Weaponisation",
  "Delivery",
  "Exploitation",
  "Installation",
  "Command and Control",
  "Actions on Objectives",
];

function groupByStage(findings: Finding[]): Array<[string, Finding[]]> {
  const groups = new Map<string, Finding[]>();
  for (const f of findings) {
    const key = f.kill_chain_stage ?? "Unclassified";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(f);
  }
  const ordered: Array<[string, Finding[]]> = [];
  for (const stage of KILL_CHAIN_ORDER) {
    if (groups.has(stage)) {
      ordered.push([stage, groups.get(stage)!]);
      groups.delete(stage);
    }
  }
  // Any remaining stages go at the end in insertion order.
  for (const [stage, items] of groups) ordered.push([stage, items]);
  return ordered;
}

export function ReportView({ findings }: Props) {
  const confirmed = findings.filter((f) => f.confidence === "confirmed");
  const inferred = findings.filter((f) => f.confidence === "inferred");
  const uncertain = findings.filter((f) => f.confidence === "uncertain");

  const executiveSummary = confirmed
    .filter((f) => f.phase <= 3) // phase-5 synthesis summary bullet excluded
    .slice(0, 7);

  const allCallIds = Array.from(
    new Set(findings.flatMap((f) => f.function_call_ids)),
  );
  const allArtefacts = Array.from(
    new Set(findings.flatMap((f) => f.source_artefacts)),
  );

  return (
    <div className="report">
      <h1>Investigation Report</h1>
      <dl className="kvs">
        <dt>case</dt>
        <dd>untitled</dd>
        <dt>generated</dt>
        <dd>{new Date().toISOString()}</dd>
        <dt>findings</dt>
        <dd>
          {findings.length} total · {confirmed.length} confirmed ·{" "}
          {inferred.length} inferred · {uncertain.length} uncertain
        </dd>
        <dt>artefacts</dt>
        <dd>{allArtefacts.length} referenced</dd>
        <dt>tool calls</dt>
        <dd>{allCallIds.length} recorded</dd>
      </dl>

      <h2>Executive Summary</h2>
      {executiveSummary.length === 0 ? (
        <p>No confirmed findings yet.</p>
      ) : (
        <ul>
          {executiveSummary.map((f) => (
            <li key={f.id}>{f.title}</li>
          ))}
        </ul>
      )}

      <h2>Confirmed Findings</h2>
      {confirmed.length === 0 ? (
        <p>No confirmed findings yet.</p>
      ) : (
        groupByStage(confirmed).map(([stage, items]) => (
          <section key={stage}>
            <h3>{stage}</h3>
            {items.map((f) => (
              <FindingBlock key={f.id} finding={f} />
            ))}
          </section>
        ))
      )}

      <h2>Inferred Findings</h2>
      {inferred.length === 0 ? (
        <p>No inferences yet.</p>
      ) : (
        groupByStage(inferred).map(([stage, items]) => (
          <section key={stage}>
            <h3>{stage}</h3>
            {items.map((f) => (
              <FindingBlock key={f.id} finding={f} />
            ))}
          </section>
        ))
      )}

      <h2>Flagged for Review</h2>
      {uncertain.length === 0 ? (
        <p>Nothing flagged.</p>
      ) : (
        uncertain.map((f) => <FindingBlock key={f.id} finding={f} />)
      )}
    </div>
  );
}

function FindingBlock({ finding }: { finding: Finding }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <span className={`tag ${finding.confidence}`}>{finding.confidence}</span>
        <strong style={{ fontWeight: 500 }}>{finding.title}</strong>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--fg-2)",
          }}
        >
          phase {finding.phase}
        </span>
      </div>

      <pre
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--fg-1)",
          background: "var(--bg-2)",
          border: "1px solid var(--border-1)",
          padding: "6px 8px",
          margin: "6px 0",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {finding.evidence}
      </pre>

      {finding.reasoning ? (
        <div style={{ margin: "4px 0", color: "var(--fg-1)" }}>
          <div style={{ fontWeight: 500, fontSize: 12 }}>Reasoning</div>
          <div style={{ fontSize: 12, whiteSpace: "pre-wrap" }}>{finding.reasoning}</div>
          {finding.alternatives ? (
            <div style={{ fontSize: 11, color: "var(--fg-2)", marginTop: 2 }}>
              Alternatives: {finding.alternatives}
            </div>
          ) : null}
        </div>
      ) : null}

      {finding.gaps || finding.contradictions || finding.follow_up ? (
        <div style={{ margin: "4px 0", fontSize: 12 }}>
          {finding.gaps ? (
            <div>
              <span style={{ color: "var(--fg-2)" }}>Gaps: </span>
              {finding.gaps}
            </div>
          ) : null}
          {finding.contradictions ? (
            <div>
              <span style={{ color: "var(--fg-2)" }}>Contradictions: </span>
              {finding.contradictions}
            </div>
          ) : null}
          {finding.follow_up ? (
            <div>
              <span style={{ color: "var(--fg-2)" }}>Follow-up: </span>
              {finding.follow_up}
            </div>
          ) : null}
        </div>
      ) : null}

      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--fg-2)",
        }}
      >
        source: {finding.source}
        {finding.function_call_ids.length > 0
          ? ` · calls: ${finding.function_call_ids.map((id) => id.slice(0, 8)).join(", ")}`
          : ""}
        {finding.event_time ? ` · event: ${finding.event_time}` : ""}
        {` · recorded: ${finding.timestamp}`}
      </div>
    </div>
  );
}
