/** @jsxImportSource preact */
// The sun step: the sun at any moment (date, time, play the day or the year), sun hours
// for any period on the map, the year at one spot, and what the map assumes.
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import type { PlannerStore } from '../../lib/planner/store';
import { phillyMinutes, phillyTime, sunPosition, sunTimes } from '../../lib/planner/sun';
import { buildingsChanged, crownsKey, litFractionAt, shadeCrowns, spotMonthlyFor } from '../../lib/planner/sunstudy';
import { FAR_SHADE_MAX_FT, SURROUNDINGS_RADIUS_FT } from '../../lib/planner/site';
import { leafFraction, leafWords, LEAF_SEASON } from '../../lib/planner/treemodel';
import { BARE_CROWN_BLOCKING, CROWN_BLOCKING } from '../../lib/planner/sunhours';
import { MONTHS, MONTHS_SHORT, SEASONS, parsePeriodKey, periodKey, periodLabel, type MonthSun, type SeasonName } from '../../lib/planner/sunperiod';
import { PLAY_RATES, SPEED_LABEL, advanceDay, advanceYear, dateOfDay, dayOfYear, type PlayMode, type PlaySpeed } from '../../lib/planner/sunplay';
import { parkToLocal } from '../../lib/planner/placement';
import { catalogEntry, existingMeta } from '../../lib/planner/catalog';
import type { Vec2 } from '../../lib/planner/geo';
import { SpotChart } from './SpotChart';

const YEAR = 2026;
const COMPASS = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'];

export function clock(min: number) {
  const h = Math.floor(min / 60) % 24;
  const m = Math.floor(min % 60);
  const ap = h >= 12 ? 'pm' : 'am';
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${ap}`;
}

const PRESETS: [string, number, number][] = [
  ['First day of spring', 3, 20],
  ['Longest day', 6, 21],
  ['First day of fall', 9, 22],
  ['Shortest day', 12, 21],
];

const mmdd = (s: string) => {
  const [m, d] = s.split('-').map(Number) as [number, number];
  return `${MONTHS_SHORT[m - 1]} ${d}`;
};
const pct = (f: number) => `${Math.round(f * 100)}%`;

/** where the picked thing stands, local feet */
function selectionPoint(store: PlannerStore): { p: Vec2; name: string } | null {
  const sel = store.$selection.get();
  const site = store.$site.get();
  if (!sel || !site) return null;
  if (sel.kind === 'item') {
    const it = store.$layout.get()?.items.find((x) => x.id === sel.id);
    const pl = store.$placement.get();
    return it && pl ? { p: parkToLocal(pl, site.frame, [it.x, it.y]), name: catalogEntry(it.element).name.toLowerCase() } : null;
  }
  const e = store.$design.get()?.existing?.find((x) => x.id === sel.id);
  return e?.lngLat ? { p: site.lf.toLocal(e.lngLat), name: existingMeta(e.element).name.toLowerCase() } : null;
}

export function SunPanel({ store }: { store: PlannerStore }) {
  const site = useStore(store.$site);
  const t = useStore(store.$sunTime);
  const grid = useStore(store.$sunGrid);
  const job = useStore(store.$sunJob);
  const show = useStore(store.$show);
  const design = useStore(store.$design);
  const sel = useStore(store.$selection);
  const period = useStore(store.sun.$period);
  const periodResult = useStore(store.sun.$result);
  const periodJob = useStore(store.sun.$job);
  const spot = useStore(store.sun.$spot);
  const spotAt = useStore(store.sun.$spotAt);
  const play = useStore(store.sun.$play);
  const root = useRef<HTMLElement>(null);
  const [spotName, setSpotName] = useState('at the middle of the lot');
  const lat = site?.lf.origin[1] ?? 39.95;
  const lng = site?.lf.origin[0] ?? -75.16;
  const times = sunTimes(YEAR, t.month, t.day, lat, lng);
  const rise = times.sunrise ? phillyMinutes(times.sunrise) : 6 * 60;
  const set = times.sunset ? phillyMinutes(times.sunset) : 20 * 60;
  const pos = sunPosition(phillyTime(YEAR, t.month, t.day, t.minutes), lat, lng);
  const leaf = leafFraction(t.month, t.day);
  const litNow = useMemo(
    () => (site ? litFractionAt(site, design?.existing, pos.altitudeDeg, pos.azimuthDeg, leaf) : 0),
    [site, design?.existing, Math.round(pos.altitudeDeg * 10), Math.round(pos.azimuthDeg * 10), leaf],
  );

  // ---- playing the day or the year ----
  const setPlay = (mode: PlayMode, speed: PlaySpeed = play.speed) => store.sun.$play.set({ mode, speed });
  useEffect(() => () => store.sun.$play.set({ ...store.sun.$play.get(), mode: 'off' }), []);
  useEffect(() => {
    if (play.mode === 'off') return;
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    let onScreen = true;
    const cur0 = store.$sunTime.get();
    let yearPos = dayOfYear(cur0.month, cur0.day);
    const days = new Map<string, { rise: number; set: number }>();
    const riseSet = (m: number, d: number) => {
      const k = `${m}-${d}`;
      let v = days.get(k);
      if (!v) {
        const st = sunTimes(YEAR, m, d, lat, lng);
        v = { rise: st.sunrise ? phillyMinutes(st.sunrise) : 360, set: st.sunset ? phillyMinutes(st.sunset) : 1200 };
        days.set(k, v);
      }
      return v;
    };
    // pause while the 3D view is scrolled off screen (and while the tab is hidden: no frames)
    const view = root.current?.closest('.pl-root')?.querySelector('.pl-viewport');
    const io = view && typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver((es) => (onScreen = es.some((e) => e.isIntersecting))) : null;
    if (io && view) io.observe(view);
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(100, now - last);
      last = now;
      if (!onScreen) return;
      acc += dt;
      if (acc < 33) return; // about 30 steps a second is smooth and kind to old laptops
      const step = acc;
      acc = 0;
      const cur = store.$sunTime.get();
      if (play.mode === 'day') {
        const rs = riseSet(cur.month, cur.day);
        store.$sunTime.set({ ...cur, minutes: advanceDay(cur.minutes, step, play.speed, rs.rise, rs.set) });
      } else {
        // the person may have moved the date slider meanwhile
        if (dayOfYear(cur.month, cur.day) !== Math.floor(yearPos)) yearPos = dayOfYear(cur.month, cur.day) + (yearPos % 1);
        yearPos = advanceYear(yearPos, step, play.speed);
        const d = dateOfDay(yearPos);
        if (d.month !== cur.month || d.day !== cur.day) store.$sunTime.set({ ...cur, ...d });
      }
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      io?.disconnect();
    };
  }, [play.mode, play.speed, lat, lng]);

  // ---- the spot whose year is charted: a click on the ground, or the picked thing ----
  useEffect(() => {
    const p = selectionPoint(store);
    if (p) {
      store.sun.$spot.set(p.p);
      setSpotName(`where the ${p.name} is`);
    }
  }, [sel?.id]);
  useEffect(() => {
    if (!spot) setSpotName('at the middle of the lot');
    else if (!sel) setSpotName('at the spot you picked');
  }, [spot]);
  const [spotData, setSpotData] = useState<MonthSun[] | null>(null);
  useEffect(() => {
    if (!site || !spotAt) return;
    // a moment later, so the click that picked the spot is answered first
    const id = setTimeout(() => setSpotData(spotMonthlyFor(site, design?.existing, spotAt)), 30);
    return () => clearTimeout(id);
  }, [site, design?.existing, spotAt?.[0], spotAt?.[1]]);

  // The saved study may be older than the trees on the lot.
  const nowKey = useMemo(() => (site ? crownsKey(shadeCrowns(site, design?.existing)) : ''), [site, design?.existing]);
  const stale = Boolean(grid?.inputs.treesKey && nowKey && grid.inputs.treesKey !== nowKey);
  // … or than the buildings around it (far shade: older studies left out the taller ones farther away)
  const buildingsStale = useMemo(() => buildingsChanged(grid, site), [grid, site]);
  const CLASS_TEXT: Record<string, string> = {
    'full-sun': 'Full sun — almost all of the lot gets 6 or more hours of direct sun a day.',
    'mostly-sun': 'Mostly sunny — at least half the lot gets 6 or more hours a day.',
    'mostly-shade': 'Mostly shady — less than half the lot gets 6 hours a day.',
    'deep-shade': 'Deep shade — very little of the lot gets 6 hours of sun a day.',
  };

  const growing = period.kind === 'growing';
  const summary = growing ? grid?.summary : periodResult && periodKey(periodResult.period) === periodKey(period) ? periodResult.summary : null;
  const pickPeriod = (k: string) => {
    store.sun.setPeriod(parsePeriodKey(k, { month: t.month, day: t.day }));
    if (k !== 'growing' && !show.heat) store.$show.set({ ...show, heat: true });
  };
  const hasGround = Boolean(site?.ground);
  const quiet = play.mode === 'off' ? undefined : ('off' as const);

  return (
    <section class="pl-section" ref={root}>
      <h3 class="pl-h">Sun and shade</h3>
      <p class="pl-small">Watch the shadows of the buildings and trees around your lot move through the day and the year.</p>
      <label class="pl-field">
        {/* while playing, the moving date and clock are not read out 30 times a second */}
        <span class="pl-small" aria-live={quiet}>
          <strong class="pl-sun-date">
            {MONTHS[t.month - 1]} {t.day}
          </strong>{' '}
          <span class="muted">· {leafWords(t.month, t.day)}</span>
        </span>
        <input
          type="range"
          min={1}
          max={365}
          value={dayOfYear(t.month, t.day)}
          aria-label="Day of the year"
          aria-valuetext={`${MONTHS[t.month - 1]} ${t.day}`}
          onInput={(e) => store.$sunTime.set({ ...t, ...dateOfDay(Number((e.target as HTMLInputElement).value)) })}
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
        <span class="pl-small" aria-live={quiet}>
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
      <div class="pl-row pl-play">
        <button type="button" class="btn btn-small" aria-pressed={play.mode === 'day'} onClick={() => setPlay(play.mode === 'day' ? 'off' : 'day')}>
          {play.mode === 'day' ? '❚❚ Pause' : '▶ Play the day'}
        </button>
        <button
          type="button"
          class="btn btn-small"
          aria-pressed={play.mode === 'year'}
          title="Same time of day, through the year"
          onClick={() => setPlay(play.mode === 'year' ? 'off' : 'year')}
        >
          {play.mode === 'year' ? '❚❚ Pause' : '▶ Play the year'}
        </button>
        <span class="pl-seg pl-seg-small" role="group" aria-label="Speed">
          {(Object.keys(PLAY_RATES) as PlaySpeed[]).map((s) => (
            <button type="button" aria-pressed={play.speed === s} onClick={() => setPlay(play.mode, s)}>
              <span class="pl-small">{SPEED_LABEL[s]}</span>
            </button>
          ))}
        </span>
      </div>
      {play.mode === 'year' && <p class="pl-small muted">The date moves through the year at {clock(t.minutes)} each day.</p>}
      <p class="pl-small muted" aria-live={quiet}>
        {pos.altitudeDeg > 0
          ? `The sun is ${Math.round(pos.altitudeDeg)}° up, in the ${COMPASS[Math.round(pos.azimuthDeg / 45) % 8]}.`
          : 'The sun is down.'}
      </p>
      {pos.altitudeDeg > 0 && (
        <p class="pl-now" aria-live={quiet ?? 'polite'}>
          <span class="pl-now-bar" aria-hidden="true">
            <span style={{ width: `${Math.round(litNow * 100)}%` }} />
          </span>
          At this moment about <strong>{Math.round(litNow * 100)}%</strong> of the lot is in direct sun.
        </p>
      )}

      <h4 class="pl-h4">Sun hours on the map</h4>
      <label class="pl-field">
        <span class="pl-small">Average hours of direct sun a day over</span>
        <select value={periodKey(period)} onChange={(e) => pickPeriod((e.target as HTMLSelectElement).value)}>
          <option value="growing">the growing season, Apr 15 – Oct 15</option>
          <option value={`day:${t.month}-${t.day}`}>this day only ({MONTHS_SHORT[t.month - 1]} {t.day})</option>
          <optgroup label="A season">
            {(Object.keys(SEASONS) as SeasonName[]).map((s) => (
              <option value={`season:${s}`}>
                {SEASONS[s].label} ({mmdd(SEASONS[s].from)} – {mmdd(SEASONS[s].to)})
              </option>
            ))}
          </optgroup>
          <optgroup label="A month">
            {MONTHS.map((m, i) => (
              <option value={`month:${i + 1}`}>{m}</option>
            ))}
          </optgroup>
          <option value="year">the whole year</option>
        </select>
      </label>
      {growing ? (
        job ? (
          <div class="pl-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(job.progress * 100)}>
            <span style={{ width: `${Math.round(job.progress * 100)}%` }} />
            <em>Working it out… {Math.round(job.progress * 100)}%</em>
          </div>
        ) : (
          <button type="button" class="btn btn-small btn-primary" onClick={() => store.computeSun()}>
            {grid ? 'Work it out again' : 'Work out sun hours'}
          </button>
        )
      ) : periodJob ? (
        <div class="pl-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(periodJob.progress * 100)}>
          <span style={{ width: `${Math.round(periodJob.progress * 100)}%` }} />
          <em>Working out {periodLabel(period)}… {Math.round(periodJob.progress * 100)}%</em>
        </div>
      ) : (
        !summary && (
          <button type="button" class="btn btn-small btn-primary" onClick={() => store.sun.recompute()}>
            Work out sun hours for {periodLabel(period)}
          </button>
        )
      )}
      {growing && stale && !job && <p class="pl-small pl-warn">You've changed what's on the lot since this was worked out — work it out again to include it.</p>}
      {growing && buildingsStale && !job && (
        <p class="pl-small pl-warn">
          {buildingsStale === 'far-added'
            ? 'Sun hours now also count the shade of taller buildings farther away. This was worked out before that — work it out again to include them (the counts update too).'
            : "The City's buildings around the lot have changed since this was worked out — work it out again to include them."}
        </p>
      )}
      {summary && (
        <div class="pl-sunsum">
          <ul class="pl-legend">
            <li>
              <span class="pl-key pl-key-sun" /> Sun — 6 hours or more: <strong>{pct(summary.sun)}</strong> of the lot
            </li>
            <li>
              <span class="pl-key pl-key-part" /> Part sun — 3 to 6 hours: <strong>{pct(summary.part)}</strong>
            </li>
            <li>
              <span class="pl-key pl-key-shade" /> Shade — under 3 hours: <strong>{pct(summary.shade)}</strong>
            </li>
          </ul>
          {growing && grid && <p class="pl-small">{CLASS_TEXT[grid.sunClass]}</p>}
          <label class="pl-check">
            <input type="checkbox" checked={show.heat} onChange={() => store.$show.set({ ...show, heat: !show.heat })} /> Show it on the map
          </label>
          {growing ? (
            <p class="pl-small muted">The counts treat part sun as shade, like the workbook's sun/shade plant count.</p>
          ) : (
            <p class="pl-small muted">
              This map shows {periodLabel(period)}. The counts and the Assess summary always use the growing season{grid ? '' : ' (not worked out yet)'}.
            </p>
          )}
        </div>
      )}

      <h4 class="pl-h4">Sun through the year at one spot</h4>
      <p class="pl-small">
        Click or tap a spot on the lot, or pick something on it, to see its sun month by month.{' '}
        <button type="button" class="pl-link" onClick={() => store.sun.$spot.set(null)}>
          Middle of the lot
        </button>
        {sel && (
          <>
            {' · '}
            <button
              type="button"
              class="pl-link"
              onClick={() => {
                const p = selectionPoint(store);
                if (p) {
                  store.sun.$spot.set(p.p);
                  setSpotName(`where the ${p.name} is`);
                }
              }}
            >
              Where the picked thing is
            </button>
          </>
        )}
      </p>
      {spotData && <SpotChart data={spotData} where={spotName} month={t.month} />}

      <details class="pl-assume">
        <summary>What the sun maps and chart count</summary>
        <ul class="pl-small">
          <li>Only direct sun: the hours when nothing stands between the sun and a point 1 ft above the ground. Cloudy days and light bouncing off walls are not counted.</li>
          <li>
            Buildings: every building within about {SURROUNDINGS_RADIUS_FT} ft of the lot, plus taller buildings up to {FAR_SHADE_MAX_FT.toLocaleString('en-US')} ft
            away whose shadow can reach it{site?.farBuildings?.length ? ` (${site.farBuildings.length} for this lot)` : ''}. Their outlines and heights are the
            City's, measured from the air (lidar) to the main roof; pitched roofs, chimneys and things like walls, fences, billboards and the El aren't in the data.
          </li>
          <li>
            Trees are the City's street and park trees (their size worked out from trunk width) and the trees marked on the lot. A tree in leaf blocks about{' '}
            {pct(CROWN_BLOCKING)} of the sun; bare branches about {pct(BARE_CROWN_BLOCKING)}.
          </li>
          <li>
            Leaves come out between {mmdd(LEAF_SEASON.outFrom)} and {mmdd(LEAF_SEASON.outTo)} and fall between {mmdd(LEAF_SEASON.dropFrom)} and{' '}
            {mmdd(LEAF_SEASON.dropTo)}. Evergreens (pines, spruces, hollies, southern magnolias…) keep theirs all year.
          </li>
          <li>{hasGround ? 'The slope of the ground is included.' : 'The ground is taken as flat (its heights are not known for this lot).'}</li>
        </ul>
      </details>
    </section>
  );
}
