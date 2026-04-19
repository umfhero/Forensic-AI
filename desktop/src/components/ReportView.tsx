import type { Finding } from "../lib/state.js";

interface Props {
  findings: Finding[];
}

export function ReportView({ findings }: Props) {
  const confirmed = findings.filter((f) => f.confidence === "confirmed");
  const inferred = findings.filter((f) => f.confidence === "inferred");
  const uncertain = findings.filter((f) => f.confidence === "uncertain");

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
          {findings.length} total · {confirmed.length} confirmed · {inferred.length} inferred ·{" "}
          {uncertain.length} uncertain
        </dd>
      </dl>

      <h2>Confirmed</h2>
      {confirmed.length === 0 ? (
        <p>No confirmed findings yet.</p>
      ) : (
        confirmed.map((f) => <FindingBlock key={f.id} finding={f} />)
      )}

      <h2>Inferred</h2>
      {inferred.length === 0 ? (
        <p>No inferences yet.</p>
      ) : (
        inferred.map((f) => <FindingBlock key={f.id} finding={f} />)
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
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <span className={`tag ${finding.confidence}`}>{finding.confidence}</span>
        <strong style={{ fontWeight: 500 }}>{finding.title}</strong>
      </div>
      <p style={{ color: "var(--fg-1)", margin: "6px 0 4px" }}>
        {finding.detail ?? "No detail recorded."}
      </p>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-2)" }}>
        source: {finding.source}
        {finding.functionCallId ? ` · call_id: ${finding.functionCallId}` : ""}
        {` · t: ${finding.timestamp}`}
      </div>
    </div>
  );
}
