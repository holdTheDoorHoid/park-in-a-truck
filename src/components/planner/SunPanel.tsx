/** @jsxImportSource preact */
// The sun step: the sun at any moment (date, time, play the day or the year), sun hours
// for any period on the map, the year at one spot, and what the map assumes.
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import type { PlannerStore } from '../../lib/planner/store';
import { phillyMinutes, phillyTime, sunPosition, sunTimes } from '../../lib/planner/sun';
import { buildingsChanged, crownsKey, litFractionAt, shadeCrowns, spotMonthlyFor } from '../../lib/planner/sunstudy';
import { FAR_SHADE_MAX_FT, SURROUNDINGS_RADIUS_FT } from '../../lib/planner/site';
import { leafFraction, LEAF_SEASON } from '../../lib/planner/treemodel';
import { BARE_CROWN_BLOCKING, CROWN_BLOCKING } from '../../lib/planner/sunhours';
import { SEASONS, parsePeriodKey, periodKey, type MonthSun, type SeasonName } from '../../lib/planner/sunperiod';
import { PLAY_RATES, advanceDay, advanceYear, dateOfDay, dayOfYear, type PlayMode, type PlaySpeed } from '../../lib/planner/sunplay';
import { parkToLocal } from '../../lib/planner/placement';
import { catalogEntry, existingMeta } from '../../lib/planner/catalog';
import type { Vec2 } from '../../lib/planner/geo';
import { DEFAULT_SEASON } from '../../lib/planner/sun';
import { SEASON_LABEL, clock, compassWord, leafWords, mmdd, monthDay, monthDayShort, monthName, periodLabel, pt, type PlannerKey } from '../../lib/planner/words';
import { SpotChart } from './SpotChart';

const YEAR = 2026;

const PRESETS: [PlannerKey, number, number][] = [
  ['sun.presetSpring', 3, 20],
  ['sun.presetLongest', 6, 21],
  ['sun.presetFall', 9, 22],
  ['sun.presetShortest', 12, 21],
];

const SPEED_LABEL: Record<PlaySpeed, PlannerKey> = { slow: 'sun.speedSlow', normal: 'sun.speedNormal', fast: 'sun.speedFast' };

const CLASS_TEXT: Record<string, PlannerKey> = {
  'full-sun': 'sun.classFullSun',
  'mostly-sun': 'sun.classMostlySun',
  'mostly-shade': 'sun.classMostlyShade',
  'deep-shade': 'sun.classDeepShade',
};

/** 0.29 → 29 (shown as "29%") */
const pct = (f: number) => Math.round(f * 100);

/** where the picked thing stands, local feet, and what to call it ("where the stool is") */
function selectionPoint(store: PlannerStore): { p: Vec2; name: string } | null {
  const sel = store.$selection.get();
  const site = store.$site.get();
  if (!sel || !site) return null;
  if (sel.kind === 'item') {
    const it = store.$layout.get()?.items.find((x) => x.id === sel.id);
    const pl = store.$placement.get();
    return it && pl ? { p: parkToLocal(pl, site.frame, [it.x, it.y]), name: lower(catalogEntry(it.element).name) } : null;
  }
  const e = store.$design.get()?.existing?.find((x) => x.id === sel.id);
  return e?.lngLat ? { p: site.lf.toLocal(e.lngLat), name: lower(existingMeta(e.element).name) } : null;
}

const lower = (s: string) => s.toLocaleLowerCase(pt().lang);

export function SunPanel({ store }: { store: PlannerStore }) {
  const w = pt();
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
  const [spotName, setSpotName] = useState(() => w('spot.middle'));
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
      setSpotName(w('spot.thing', { name: p.name }));
    }
  }, [sel?.id]);
  useEffect(() => {
    if (!spot) setSpotName(w('spot.middle'));
    else if (!sel) setSpotName(w('spot.picked'));
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
      <h3 class="pl-h">{w('sun.title')}</h3>
      <p class="pl-small">{w('sun.intro')}</p>
      <label class="pl-field">
        {/* while playing, the moving date and clock are not read out 30 times a second */}
        <span class="pl-small" aria-live={quiet}>
          <strong class="pl-sun-date">{monthDay(t.month, t.day, w)}</strong>{' '}
          <span class="muted">· {leafWords(t.month, t.day, w)}</span>
        </span>
        <input
          type="range"
          min={1}
          max={365}
          value={dayOfYear(t.month, t.day)}
          aria-label={w('sun.dayOfYear')}
          aria-valuetext={monthDay(t.month, t.day, w)}
          onInput={(e) => store.$sunTime.set({ ...t, ...dateOfDay(Number((e.target as HTMLInputElement).value)) })}
        />
      </label>
      <div class="pl-chips">
        {PRESETS.map(([name, m, d]) => (
          <button type="button" class="pl-chip" aria-pressed={t.month === m && t.day === d} onClick={() => store.$sunTime.set({ ...t, month: m, day: d })}>
            {w(name)}
          </button>
        ))}
      </div>
      <label class="pl-field">
        <span class="pl-small" aria-live={quiet}>
          <strong>{clock(t.minutes, w)}</strong> <span class="muted">{w('sun.riseSet', { rise: clock(rise, w), set: clock(set, w) })}</span>
        </span>
        <input
          type="range"
          min={Math.floor(rise / 15) * 15 - 15}
          max={Math.ceil(set / 15) * 15 + 15}
          step={15}
          value={t.minutes}
          aria-label={w('sun.timeOfDay')}
          aria-valuetext={clock(t.minutes, w)}
          onInput={(e) => store.$sunTime.set({ ...t, minutes: Number((e.target as HTMLInputElement).value) })}
        />
      </label>
      <div class="pl-row pl-play">
        <button type="button" class="btn btn-small" aria-pressed={play.mode === 'day'} onClick={() => setPlay(play.mode === 'day' ? 'off' : 'day')}>
          {w(play.mode === 'day' ? 'sun.pause' : 'sun.playDay')}
        </button>
        <button
          type="button"
          class="btn btn-small"
          aria-pressed={play.mode === 'year'}
          title={w('sun.playYearTitle')}
          onClick={() => setPlay(play.mode === 'year' ? 'off' : 'year')}
        >
          {w(play.mode === 'year' ? 'sun.pause' : 'sun.playYear')}
        </button>
        <span class="pl-seg pl-seg-small" role="group" aria-label={w('sun.speed')}>
          {(Object.keys(PLAY_RATES) as PlaySpeed[]).map((s) => (
            <button type="button" aria-pressed={play.speed === s} onClick={() => setPlay(play.mode, s)}>
              <span class="pl-small">{w(SPEED_LABEL[s])}</span>
            </button>
          ))}
        </span>
      </div>
      {play.mode === 'year' && <p class="pl-small muted">{w('sun.yearAt', { time: clock(t.minutes, w) })}</p>}
      <p class="pl-small muted" aria-live={quiet}>
        {pos.altitudeDeg > 0 ? w('sun.position', { deg: Math.round(pos.altitudeDeg), compass: compassWord(pos.azimuthDeg, w) }) : w('sun.down')}
      </p>
      {pos.altitudeDeg > 0 && (
        <p class="pl-now" aria-live={quiet ?? 'polite'}>
          <span class="pl-now-bar" aria-hidden="true">
            <span style={{ width: `${Math.round(litNow * 100)}%` }} />
          </span>
          <span dangerouslySetInnerHTML={{ __html: w.html('sun.litNow', { pct: Math.round(litNow * 100) }) }} />
        </p>
      )}

      <h4 class="pl-h4">{w('sun.mapTitle')}</h4>
      <label class="pl-field">
        <span class="pl-small">{w('sun.over')}</span>
        <select value={periodKey(period)} onChange={(e) => pickPeriod((e.target as HTMLSelectElement).value)}>
          <option value="growing">{w('sun.optGrowing', { from: mmdd(DEFAULT_SEASON.from, w), to: mmdd(DEFAULT_SEASON.to, w) })}</option>
          <option value={`day:${t.month}-${t.day}`}>{w('sun.optDay', { date: monthDayShort(t.month, t.day, w) })}</option>
          <optgroup label={w('sun.optSeasons')}>
            {(Object.keys(SEASONS) as SeasonName[]).map((s) => (
              <option value={`season:${s}`}>{w('period.range', { season: w(SEASON_LABEL[s]), from: mmdd(SEASONS[s].from, w), to: mmdd(SEASONS[s].to, w) })}</option>
            ))}
          </optgroup>
          <optgroup label={w('sun.optMonths')}>
            {Array.from({ length: 12 }, (_, i) => (
              <option value={`month:${i + 1}`}>{monthName(i + 1, w)}</option>
            ))}
          </optgroup>
          <option value="year">{w('sun.optYear')}</option>
        </select>
      </label>
      {growing ? (
        job ? (
          <div class="pl-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(job.progress * 100)}>
            <span style={{ width: `${Math.round(job.progress * 100)}%` }} />
            <em>{w('sun.working', { pct: Math.round(job.progress * 100) })}</em>
          </div>
        ) : (
          <button type="button" class="btn btn-small btn-primary" onClick={() => store.computeSun()}>
            {w(grid ? 'sun.workOutAgain' : 'sun.workOut')}
          </button>
        )
      ) : periodJob ? (
        <div class="pl-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(periodJob.progress * 100)}>
          <span style={{ width: `${Math.round(periodJob.progress * 100)}%` }} />
          <em>{w('sun.workingPeriod', { period: periodLabel(period, w), pct: Math.round(periodJob.progress * 100) })}</em>
        </div>
      ) : (
        !summary && (
          <button type="button" class="btn btn-small btn-primary" onClick={() => store.sun.recompute()}>
            {w('sun.workOutPeriod', { period: periodLabel(period, w) })}
          </button>
        )
      )}
      {growing && stale && !job && <p class="pl-small pl-warn">{w('sun.staleTrees')}</p>}
      {growing && buildingsStale && !job && <p class="pl-small pl-warn">{w(buildingsStale === 'far-added' ? 'sun.staleFar' : 'sun.staleBuildings')}</p>}
      {summary && (
        <div class="pl-sunsum">
          <ul class="pl-legend">
            <li>
              <span class="pl-key pl-key-sun" /> <span dangerouslySetInnerHTML={{ __html: w.html('sun.legendSun', { pct: pct(summary.sun) }) }} />
            </li>
            <li>
              <span class="pl-key pl-key-part" /> <span dangerouslySetInnerHTML={{ __html: w.html('sun.legendPart', { pct: pct(summary.part) }) }} />
            </li>
            <li>
              <span class="pl-key pl-key-shade" /> <span dangerouslySetInnerHTML={{ __html: w.html('sun.legendShade', { pct: pct(summary.shade) }) }} />
            </li>
          </ul>
          {growing && grid && CLASS_TEXT[grid.sunClass] && <p class="pl-small">{w(CLASS_TEXT[grid.sunClass]!)}</p>}
          <label class="pl-check">
            <input type="checkbox" checked={show.heat} onChange={() => store.$show.set({ ...show, heat: !show.heat })} /> {w('sun.showOnMap')}
          </label>
          {growing ? (
            <p class="pl-small muted">{w('sun.countsTreat')}</p>
          ) : (
            <p class="pl-small muted">{w(grid ? 'sun.mapShows' : 'sun.mapShowsNotYet', { period: periodLabel(period, w) })}</p>
          )}
        </div>
      )}

      <h4 class="pl-h4">{w('sun.spotTitle')}</h4>
      <p class="pl-small">
        {w('sun.spotHelp')}{' '}
        <button type="button" class="pl-link" onClick={() => store.sun.$spot.set(null)}>
          {w('sun.spotMiddle')}
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
                  setSpotName(w('spot.thing', { name: p.name }));
                }
              }}
            >
              {w('sun.spotPicked')}
            </button>
          </>
        )}
      </p>
      {spotData && <SpotChart data={spotData} where={spotName} month={t.month} />}

      <details class="pl-assume">
        <summary>{w('sun.assumeTitle')}</summary>
        <ul class="pl-small">
          <li>{w('sun.assumeDirect')}</li>
          <li>
            {site?.farBuildings?.length
              ? w('sun.assumeBuildingsCount', { near: SURROUNDINGS_RADIUS_FT, far: FAR_SHADE_MAX_FT, count: site.farBuildings.length })
              : w('sun.assumeBuildings', { near: SURROUNDINGS_RADIUS_FT, far: FAR_SHADE_MAX_FT })}{' '}
            {w('sun.assumeBuildings2')}
          </li>
          <li>{w('sun.assumeTrees', { inLeaf: pct(CROWN_BLOCKING), bare: pct(BARE_CROWN_BLOCKING) })}</li>
          <li>
            {w('sun.assumeLeaves', {
              outFrom: mmdd(LEAF_SEASON.outFrom, w),
              outTo: mmdd(LEAF_SEASON.outTo, w),
              dropFrom: mmdd(LEAF_SEASON.dropFrom, w),
              dropTo: mmdd(LEAF_SEASON.dropTo, w),
            })}
          </li>
          <li>{w(hasGround ? 'sun.assumeGround' : 'sun.assumeFlat')}</li>
        </ul>
      </details>
    </section>
  );
}
