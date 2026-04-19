import type { Finding } from "../lib/state";

interface Props {
  findings: Finding[];
  onSelect?: (id: string) => void;
}

export function FindingsList({ findings, onSelect }: Props) {
  if (findings.length === 0) {
    return <div className="empty">No findings yet. Run a triage pass to begin.</div>;
  }
  return (
    <div>
      {findings.map((f) => (
        <button
          key={f.id}
          className="finding"
          onClick={() => onSelect?.(f.id)}
          style={{ all: "unset", display: "block", width: "100%", cursor: "pointer" }}
        >
          <div className="row1">
            <span className={`tag ${f.confidence}`}>{f.confidence}</span>
            <span className="title">{f.title}</span>
          </div>
          <div className="meta">
            <span style={{ fontFamily: "var(--font-mono)" }}>p{f.phase}</span>
            {" · "}
            {f.source}
            {" · "}
            {new Date(f.timestamp).toISOString().slice(11, 19)}
            {f.kill_chain_stage ? ` · ${f.kill_chain_stage}` : ""}
          </div>
        </button>
      ))}
    </div>
  );
}
