import type { DocsSequence } from "@/lib/docs/types";

// A sequence diagram drawn as SVG from data (participants + ordered steps),
// in the site's own theme tokens so it follows light/dark like the rest of
// the page. Layout is a plain grid: participants are evenly spaced columns,
// every step gets one fixed-height row, so a diagram is just a list.
const W = 840;
const ROW = 66;
const TOP = 96;
const HEADER_Y = 10;
const HEADER_H = 50;
const MARK = "seq-arrow";

export function SequenceDiagram({ sequence }: { sequence: DocsSequence }) {
  const { participants, steps, frames = [], summary } = sequence;
  const columnX = new Map(participants.map((p, i) => [p.id, (W * (i + 0.5)) / participants.length]));
  const x = (id: string) => columnX.get(id) ?? 0;
  const rowTop = (i: number) => TOP + i * ROW;
  const height = TOP + steps.length * ROW + 16;
  const boxW = Math.min(200, W / participants.length - 40);

  // Numbered arrows only - notes are annotations, not steps in the flow.
  let messageNumber = 0;

  return (
    <figure className="nb-docs-sequence" data-testid="sequence-diagram">
      <svg viewBox={`0 0 ${W} ${height}`} role="img" aria-label={summary}>
        <defs>
          <marker id={MARK} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" className="nb-arch-arrow" />
          </marker>
        </defs>

        {frames.map((frame) => (
          <g key={frame.label}>
            <rect
              x={16}
              y={rowTop(frame.from) + 2}
              width={W - 32}
              height={(frame.to - frame.from + 1) * ROW - 4}
              rx={6}
              className="nb-seq-frame"
            />
            <text x={26} y={rowTop(frame.from) + 16} className="nb-seq-frame-label">
              {frame.label}
            </text>
          </g>
        ))}

        {participants.map((p) => (
          <g key={p.id}>
            <line x1={x(p.id)} x2={x(p.id)} y1={HEADER_Y + HEADER_H} y2={height - 8} className="nb-seq-lifeline" />
            <rect x={x(p.id) - boxW / 2} y={HEADER_Y} width={boxW} height={HEADER_H} rx={4} className="nb-arch-node" />
            <text x={x(p.id)} y={HEADER_Y + (p.sub ? 20 : HEADER_H / 2)} textAnchor="middle" dominantBaseline="central" className="nb-arch-text">
              {p.label}
            </text>
            {p.sub && (
              <text x={x(p.id)} y={HEADER_Y + 37} textAnchor="middle" dominantBaseline="central" className="nb-seq-sub">
                {p.sub}
              </text>
            )}
          </g>
        ))}

        {steps.map((step, i) => {
          const top = rowTop(i);
          if (step.kind === "note") {
            const cx = x(step.at);
            const noteW = 260;
            return (
              <g key={i}>
                <rect x={cx - noteW / 2} y={top + 12} width={noteW} height={ROW - 24} rx={4} className="nb-seq-note" />
                <text x={cx} y={top + ROW / 2} textAnchor="middle" dominantBaseline="central" className="nb-seq-note-text">
                  {step.text}
                </text>
              </g>
            );
          }
          messageNumber += 1;
          const dir = x(step.to) > x(step.from) ? 1 : -1;
          const x1 = x(step.from) + dir * 4;
          const x2 = x(step.to) - dir * 4;
          const y = top + 36;
          const mid = (x1 + x2) / 2;
          return (
            <g key={i}>
              <line x1={x1} x2={x2} y1={y} y2={y} className={step.dashed ? "nb-arch-edge nb-seq-return" : "nb-arch-edge nb-arch-edge-main"} markerEnd={`url(#${MARK})`} strokeDasharray={step.dashed ? "5 4" : undefined} />
              <text x={mid} y={y - 10} textAnchor="middle" dominantBaseline="central" className="nb-seq-text">
                {messageNumber}. {step.text}
              </text>
              {step.detail && (
                <text x={mid} y={y + 12} textAnchor="middle" dominantBaseline="central" className="nb-seq-sub">
                  {step.detail}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </figure>
  );
}
