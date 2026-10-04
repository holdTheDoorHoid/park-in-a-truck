/** @jsxImportSource preact */
// Sun through the year at one spot (shadows workstream, 2026-10-04): average hours of
// direct sun a day for each month (dark column) inside the hours the sun is up (pale
// track), with the workbook's 6-hour "full sun" line. Hover a month for its numbers; the
// same numbers are in the table below the chart.
import { useState } from 'preact/hooks';
import type { MonthSun } from '../../lib/planner/sunperiod';
import { MONTHS, MONTHS_SHORT } from '../../lib/planner/sunperiod';
import { SUN_HOURS } from '../../lib/planner/sunhours';

const W = 340;
const H = 190;
const M = { l: 28, r: 40, t: 16, b: 22 };
const MAX_H = 16;
const PW = W - M.l - M.r;
const PH = H - M.t - M.b;
const band = PW / 12;
const barW = Math.min(18, band * 0.62);
const y = (h: number) => M.t + PH - (Math.max(0, Math.min(MAX_H, h)) / MAX_H) * PH;
const fmt = (h: number) => (Math.round(h * 10) / 10).toFixed(1);

/** a column from the baseline up to `h`, with a 4px rounded top */
function column(cx: number, h: number): string {
  const x0 = cx - barW / 2;
  const x1 = cx + barW / 2;
  const top = y(h);
  const base = y(0);
  const r = Math.min(4, barW / 2, Math.max(0, base - top));
  return `M${x0},${base}V${top + r}Q${x0},${top} ${x0 + r},${top}H${x1 - r}Q${x1},${top} ${x1},${top + r}V${base}Z`;
}

/** "May to August", "April, May and September" — the months with 6 or more hours */
export function fullSunMonths(data: MonthSun[]): string {
  const ok = data.filter((m) => m.sunHours >= SUN_HOURS.sun).map((m) => m.month);
  if (!ok.length) return '';
  const runs: [number, number][] = [];
  for (const m of ok) {
    const last = runs[runs.length - 1];
    if (last && last[1] === m - 1) last[1] = m;
    else runs.push([m, m]);
  }
  // three or more months in a row read as a span; one or two are named
  const words = runs.flatMap(([a, b]) => (b - a >= 2 ? [`${MONTHS[a - 1]} to ${MONTHS[b - 1]}`] : MONTHS.slice(a - 1, b)));
  return words.length === 1 ? words[0]! : `${words.slice(0, -1).join(', ')} and ${words.at(-1)}`;
}

export function SpotChart({ data, where, month }: { data: MonthSun[]; where: string; month: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const best = data.reduce((a, b) => (b.sunHours > a.sunHours ? b : a), data[0]!);
  const worst = data.reduce((a, b) => (b.sunHours < a.sunHours ? b : a), data[0]!);
  const full = fullSunMonths(data);
  const label =
    `Average hours of direct sun a day ${where}, month by month: most in ${MONTHS[best.month - 1]} (${fmt(best.sunHours)} hours), ` +
    `least in ${MONTHS[worst.month - 1]} (${fmt(worst.sunHours)} hours). ` +
    (full ? `6 hours or more in ${full}.` : 'No month reaches 6 hours.');
  const h = hover != null ? data[hover] : null;
  const cur = data[month - 1];

  return (
    <figure class="pl-spot">
      <div class="pl-spot-plot">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} onPointerLeave={() => setHover(null)}>
          {[3, 9, 12, 15].map((v) => (
            <line class="pl-spot-grid" x1={M.l} x2={W - M.r} y1={y(v)} y2={y(v)} />
          ))}
          {[0, 3, 6, 9, 12, 15].map((v) => (
            <text class={`pl-spot-tick${v === SUN_HOURS.sun ? ' is-six' : ''}`} x={M.l - 5} y={y(v) + 3.5} text-anchor="end">
              {v}
            </text>
          ))}
          <line class="pl-spot-base" x1={M.l} x2={W - M.r} y1={y(0)} y2={y(0)} />
          {data.map((m, i) => {
            const cx = M.l + band * (i + 0.5);
            return (
              <g class={`pl-spot-col${hover === i ? ' is-hover' : ''}`}>
                <path class="pl-spot-track" d={column(cx, m.daylightHours)} />
                {m.sunHours > 0.05 && <path class="pl-spot-bar" d={column(cx, m.sunHours)} />}
                <text class={`pl-spot-x${i === month - 1 ? ' is-now' : ''}`} x={cx} y={H - 6} text-anchor="middle">
                  {MONTHS_SHORT[i]![0]}
                </text>
                <rect x={cx - band / 2} y={M.t} width={band} height={PH + 4} fill="transparent" onPointerEnter={() => setHover(i)} onPointerDown={() => setHover(i)} />
              </g>
            );
          })}
          {/* the workbook's line: 6 hours of direct sun = full sun */}
          <line class="pl-spot-six" x1={M.l} x2={W - M.r + 2} y1={y(SUN_HOURS.sun)} y2={y(SUN_HOURS.sun)} />
          <text class="pl-spot-six-label" x={W - M.r + 4} y={y(SUN_HOURS.sun) - 2}>
            <tspan x={W - M.r + 4}>full</tspan>
            <tspan x={W - M.r + 4} dy="11">sun</tspan>
          </text>
          {cur && hover == null && (
            <text class="pl-spot-value" x={M.l + band * (month - 0.5)} y={y(cur.sunHours) - 5} text-anchor="middle">
              {fmt(cur.sunHours)}
            </text>
          )}
        </svg>
        {h && (
          <div class="pl-spot-tip" style={{ left: `${Math.min(80, Math.max(20, ((M.l + band * (hover! + 0.5)) / W) * 100))}%` }} role="presentation">
            <strong>{MONTHS[h.month - 1]}</strong>
            <span>{fmt(h.sunHours)} h of direct sun a day</span>
            <span class="muted">the sun is up {fmt(h.daylightHours)} h</span>
          </div>
        )}
      </div>
      <figcaption class="pl-small">
        <span class="pl-spot-key pl-spot-key-bar" aria-hidden="true" /> direct sun {where}{' '}
        <span class="pl-spot-key pl-spot-key-track" aria-hidden="true" /> hours the sun is up. Hours a day, averaged over each month.
        <br />
        {full ? (
          <>
            6 hours or more (full sun) in <strong>{full}</strong>.
          </>
        ) : (
          <>No month reaches 6 hours of direct sun here.</>
        )}
      </figcaption>
      <details class="pl-spot-table">
        <summary>Show as a table</summary>
        <table class="pl-table">
          <thead>
            <tr>
              <th scope="col">Month</th>
              <th scope="col">Direct sun</th>
              <th scope="col">Sun is up</th>
            </tr>
          </thead>
          <tbody>
            {data.map((m) => (
              <tr>
                <th scope="row">{MONTHS[m.month - 1]}</th>
                <td>{fmt(m.sunHours)} h</td>
                <td>{fmt(m.daylightHours)} h</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
