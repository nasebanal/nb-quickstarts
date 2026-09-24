"use client";

import { useState } from "react";
import type { DocsChart } from "@/lib/docs/types";

// Success rate and failure rate over time from cumulative counts, as two
// lines on one 0-100% axis (they always sum to 100%, so this is one
// measure, not two scales). Success/failure are states, so they wear the
// fixed status colors (green/red - see --nb-chart-* in globals.css) and are
// also named in the legend, direct-labeled at the line ends, and available
// as a table, so identity never rests on color alone.
const W = 520;
const H = 290;
const M = { top: 16, right: 84, bottom: 48, left: 46 };
const PLOT_W = W - M.left - M.right;
const PLOT_H = H - M.top - M.bottom;
const Y_TICKS = [0, 25, 50, 75, 100];

interface Sample {
  t: number;
  requests: number;
  failures: number;
  success: number;
  failure: number;
}

function toSamples(points: DocsChart["points"]): Sample[] {
  return points
    .filter(([, requests]) => requests > 0)
    .map(([t, requests, failures]) => ({
      t,
      requests,
      failures,
      failure: (failures / requests) * 100,
      success: ((requests - failures) / requests) * 100,
    }));
}

const pct = (value: number) => `${value.toFixed(1)}%`;

export function TimeSeriesChart({ chart }: { chart: DocsChart }) {
  const samples = toSamples(chart.points);
  const [hover, setHover] = useState<number | null>(null);
  const { labels, xMax } = chart;

  const x = (t: number) => M.left + (t / xMax) * PLOT_W;
  const y = (v: number) => M.top + (1 - v / 100) * PLOT_H;
  const line = (pick: (s: Sample) => number) =>
    samples.map((s, i) => `${i === 0 ? "M" : "L"}${x(s.t).toFixed(1)},${y(pick(s)).toFixed(1)}`).join(" ");

  const xTicks: number[] = [];
  for (let t = 0; t <= xMax; t += 10) xTicks.push(t);

  const last = samples[samples.length - 1];
  const active = hover === null ? null : samples[hover];

  const onMove = (event: React.MouseEvent<SVGRectElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const t = ((event.clientX - rect.left) / rect.width) * xMax;
    let best = 0;
    samples.forEach((s, i) => {
      if (Math.abs(s.t - t) < Math.abs(samples[best].t - t)) best = i;
    });
    setHover(best);
  };

  // Direct labels sit at the line ends; nudge them apart if the two rates are close.
  const labelYs = (() => {
    const a = y(last.success);
    const b = y(last.failure);
    if (Math.abs(a - b) >= 36) return [a, b];
    return a < b ? [a - 18, b + 18] : [a + 18, b - 18];
  })();

  return (
    <figure className="nb-docs-chart" data-testid="time-series-chart">
      <figcaption className="nb-docs-chart-title">
        <strong>{chart.title}</strong>
        {chart.subtitle && <span>{chart.subtitle}</span>}
      </figcaption>
      <div className="nb-docs-chart-plot">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={labels.summary}>
          {Y_TICKS.map((tick) => (
            <g key={tick}>
              <line x1={M.left} x2={M.left + PLOT_W} y1={y(tick)} y2={y(tick)} className="nb-chart-grid" />
              <text x={M.left - 8} y={y(tick)} textAnchor="end" dominantBaseline="central" className="nb-chart-tick">
                {tick}%
              </text>
            </g>
          ))}
          {xTicks.map((tick) => (
            <text key={tick} x={x(tick)} y={M.top + PLOT_H + 20} textAnchor="middle" className="nb-chart-tick">
              {tick}
            </text>
          ))}
          <text x={M.left + PLOT_W / 2} y={H - 4} textAnchor="middle" className="nb-chart-axis-title">
            {labels.time}
          </text>

          <path d={line((s) => s.success)} className="nb-chart-line nb-chart-success" />
          <path d={line((s) => s.failure)} className="nb-chart-line nb-chart-failure" />

          {/* Direct labels: a short mark in the series color, the text in text ink. */}
          {[
            { text: labels.success, value: last.success, cls: "nb-chart-success", ly: labelYs[0] },
            { text: labels.failure, value: last.failure, cls: "nb-chart-failure", ly: labelYs[1] },
          ].map((item) => (
            <g key={item.text}>
              <line x1={x(last.t) + 6} x2={x(last.t) + 16} y1={item.ly} y2={item.ly} className={`nb-chart-line ${item.cls}`} />
              <text x={x(last.t) + 20} y={item.ly - 8} dominantBaseline="central" className="nb-chart-label">
                {item.text}
              </text>
              <text x={x(last.t) + 20} y={item.ly + 9} dominantBaseline="central" className="nb-chart-label nb-chart-label-value">
                {pct(item.value)}
              </text>
            </g>
          ))}

          {active && (
            <g pointerEvents="none">
              <line x1={x(active.t)} x2={x(active.t)} y1={M.top} y2={M.top + PLOT_H} className="nb-chart-crosshair" />
              <circle cx={x(active.t)} cy={y(active.success)} r={4} className="nb-chart-marker nb-chart-success-fill" />
              <circle cx={x(active.t)} cy={y(active.failure)} r={4} className="nb-chart-marker nb-chart-failure-fill" />
            </g>
          )}
          <rect
            x={M.left}
            y={M.top}
            width={PLOT_W}
            height={PLOT_H}
            fill="transparent"
            onMouseMove={onMove}
            onMouseLeave={() => setHover(null)}
          />
        </svg>
        {active && (
          <div
            className="nb-docs-chart-tooltip"
            style={{ left: `${(x(active.t) / W) * 100}%`, top: `${(M.top / H) * 100}%` }}
            data-flip={active.t > xMax * 0.6 ? "left" : "right"}
          >
            <strong>
              {labels.time.replace(/\s*\(.*\)$/, "")} {active.t}
            </strong>
            <span>
              {labels.success}: {pct(active.success)}
            </span>
            <span>
              {labels.failure}: {pct(active.failure)}
            </span>
            <span className="nb-docs-chart-tooltip-muted">
              {labels.requests}: {active.requests.toLocaleString("en-US")} / {labels.failures}: {active.failures.toLocaleString("en-US")}
            </span>
          </div>
        )}
      </div>
      <details className="nb-docs-chart-table">
        <summary>{labels.showTable}</summary>
        <table>
          <thead>
            <tr>
              <th>{labels.time}</th>
              <th>{labels.requests}</th>
              <th>{labels.failures}</th>
              <th>{labels.success}</th>
              <th>{labels.failure}</th>
            </tr>
          </thead>
          <tbody>
            {samples.map((s) => (
              <tr key={s.t}>
                <td>{s.t}</td>
                <td>{s.requests.toLocaleString("en-US")}</td>
                <td>{s.failures.toLocaleString("en-US")}</td>
                <td>{pct(s.success)}</td>
                <td>{pct(s.failure)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
