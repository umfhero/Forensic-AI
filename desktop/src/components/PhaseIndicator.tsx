import type { PhaseState } from "../lib/state.js";
import { IconCircle, IconCheck, IconChip } from "./icons.js";

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
          }`}
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
            {p.iteration > 0 ? `i${p.iteration}` : "—"}
          </span>
        </div>
      ))}
    </div>
  );
}
