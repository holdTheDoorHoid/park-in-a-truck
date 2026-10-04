/** @jsxImportSource preact */
import { useEffect, useState } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import type { PlannerStore } from '../../lib/planner/store';
import { phillyMinutes, phillyTime, sunPosition, sunTimes } from '../../lib/planner/sun';

const YEAR = 2026;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const COMPASS = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'];

function dayOfYear(m: number, d: number) {
  return Math.round((Date.UTC(YEAR, m - 1, d) - Date.UTC(YEAR, 0, 1)) / 86400000) + 1;
}
function fromDayOfYear(n: number) {
  const t = new Date(Date.UTC(YEAR, 0, n));
  return { month: t.getUTCMonth() + 1, day: t.getUTCDate() };
}
export function clock(min: number) {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  const ap = h >= 12 ? 'pm' : 'am';
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${ap}`;
}

const PRESETS: [string, number, number][] = [
  ['First day of spring', 3, 20],
  ['Longest day', 6, 21],
  ['First day of fall', 9, 22],
  ['Shortest day', 12, 21],
];

export function SunPanel({ store }: { store: PlannerStore }) {
  const site = useStore(store.$site);
  const t = useStore(store.$sunTime);
  const grid = useStore(store.$sunGrid);
  const job = useStore(store.$sunJob);
  const show = useStore(store.$show);
  const design = useStore(store.$design);
  const [playing, setPlaying] = useState(false);
  const lat = site?.lf.origin[1] ?? 39.95;
  const lng = site?.lf.origin[0] ?? -75.16;
  const times = sunTimes(YEAR, t.month, t.day, lat, lng);
  const rise = times.sunrise ? phillyMinutes(times.sunrise) : 6 * 60;
  const set = times.sunset ? phillyMinutes(times.sunset) : 20 * 60;
  const pos = sunPosition(phillyTime(YEAR, t.month, t.day, t.minutes), lat, lng);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      const cur = store.$sunTime.get();
      let m = cur.minutes + 10;
      if (m > set + 10) m = Math.max(0, rise - 10);
      store.$sunTime.set({ ...cur, minutes: m });
    }, 90);
    return () => clearInterval(id);
  }, [playing, rise, set]);

  // The saved study may be older than the trees on the lot.
  const stale = grid && design && Date.parse(design.updatedAt) > Date.parse(grid.computedAt) && (design.existing ?? []).length > 0;
  const pct = (f: number) => `${Math.round(f * 100)}%`;
  const CLASS_TEXT: Record<string, string> = {
    'full-sun': 'Full sun — almost all of the lot gets 6 or more hours of direct sun a day.',
    'mostly-sun': 'Mostly sunny — at least half the lot gets 6 or more hours a day.',
    'mostly-shade': 'Mostly shady — less than half the lot gets 6 hours a day.',
    'deep-shade': 'Deep shade — very little of the lot gets 6 hours of sun a day.',
  };

  return (
    <section class="pl-section">
      <h3 class="pl-h">Sun and shade</h3>
      <p class="pl-small">Watch the shadows of the buildings and trees around your lot move through the day and the year.</p>
      <label class="pl-field">
        <span class="pl-small">
          <strong>
            {MONTHS[t.month - 1]} {t.day}
          </strong>
        </span>
        <input
          type="range"
          min={1}
          max={365}
          value={dayOfYear(t.month, t.day)}
          aria-label="Day of the year"
          aria-valuetext={`${MONTHS[t.month - 1]} ${t.day}`}
          onInput={(e) => store.$sunTime.set({ ...t, ...fromDayOfYear(Number((e.target as HTMLInputElement).value)) })}
        />
      </label>
      <div class="pl-chips">
        {PRESETS.map(([name, m, d]) => (
          <button type="button" class="pl-chip" aria-pressed={t.month === m && t.day === d} onClick={() => store.$sunTime.set({ ...t, month: m, day: d })}>
            {name}
          </button>
        ))}
      </div>
      <label class="pl-field">
        <span class="pl-small">
          <strong>{clock(t.minutes)}</strong> <span class="muted">(sunrise {clock(rise)}, sunset {clock(set)})</span>
        </span>
        <input
          type="range"
          min={Math.floor(rise / 15) * 15 - 15}
          max={Math.ceil(set / 15) * 15 + 15}
          step={15}
          value={t.minutes}
          aria-label="Time of day"
          aria-valuetext={clock(t.minutes)}
          onInput={(e) => store.$sunTime.set({ ...t, minutes: Number((e.target as HTMLInputElement).value) })}
        />
      </label>
      <div class="pl-row">
        <button type="button" class="btn btn-small" aria-pressed={playing} onClick={() => setPlaying(!playing)}>
          {playing ? '❚❚ Stop' : '▶ Play the day'}
        </button>
        <span class="pl-small muted">
          {pos.altitudeDeg > 0
            ? `The sun is ${Math.round(pos.altitudeDeg)}° up, in the ${COMPASS[Math.round(pos.azimuthDeg / 45) % 8]}.`
            : 'The sun is down.'}
        </span>
      </div>

      <h4 class="pl-h4">Sun hours over the growing season</h4>
      <p class="pl-small">
        Works out how many hours of direct sun each square foot of the lot gets on an average day from mid-April to mid-October,
        from the neighbors' building heights and the trees (a tree's leaves are counted as blocking 60% of the sun).
      </p>
      {job ? (
        <div class="pl-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(job.progress * 100)}>
          <span style={{ width: `${Math.round(job.progress * 100)}%` }} />
          <em>Working it out… {Math.round(job.progress * 100)}%</em>
        </div>
      ) : (
        <button type="button" class="btn btn-small btn-primary" onClick={() => store.computeSun()}>
          {grid ? 'Work it out again' : 'Work out sun hours'}
        </button>
      )}
      {stale && !job && <p class="pl-small pl-warn">You've changed what's on the lot since this was worked out — work it out again to include it.</p>}
      {grid && (
        <div class="pl-sunsum">
          <ul class="pl-legend">
            <li>
              <span class="pl-key pl-key-sun" /> Sun — 6 hours or more: <strong>{pct(grid.summary.sun)}</strong> of the lot
            </li>
            <li>
              <span class="pl-key pl-key-part" /> Part sun — 3 to 6 hours: <strong>{pct(grid.summary.part)}</strong>
            </li>
            <li>
              <span class="pl-key pl-key-shade" /> Shade — under 3 hours: <strong>{pct(grid.summary.shade)}</strong>
            </li>
          </ul>
          <p class="pl-small">{CLASS_TEXT[grid.sunClass]}</p>
          <label class="pl-check">
            <input type="checkbox" checked={show.heat} onChange={() => store.$show.set({ ...show, heat: !show.heat })} /> Show it on the map
          </label>
          <p class="pl-small muted">The counts treat part sun as shade, like the workbook's sun/shade plant count.</p>
        </div>
      )}
    </section>
  );
}
