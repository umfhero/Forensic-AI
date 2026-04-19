import type { PhaseState } from "../lib/state";
import { IconCircle, IconCheck, IconChip } from "./icons";

interface Props {
  phases: PhaseState[];
}

export function PhaseIndicator({ phases }: Props) {
  return (
    <div className="phases" role="list">
      {phases.map((p) => (
        <div
          key={p.id}
          role="listitem"
          className={`phase ${p.status === "active" ? "active" : ""} ${
            p.status === "done" ? "done" : ""
          } ${p.status === "error" ? "error" : ""}`}
          title={p.note ?? ""}
        >
          <span aria-hidden="true" style={{ display: "inline-flex" }}>
            {p.status === "done" ? (
              <IconCheck />
            ) : p.status === "active" ? (
              <IconChip />
            ) : (
              <IconCircle />
            )}
          </span>
          <span>
            <span className="num" style={{ marginRight: 6 }}>
              0{p.id}
            </span>
            {p.name}
          </span>
          <span className="iter">
            {p.status === "error" ? "err" : p.iteration > 0 ? `i${p.iteration}` : "—"}
          </span>
        </div>
      ))}
    </div>
  );
}
