// The sun step's extra state (shadows workstream, 2026-10-04): which period the sun-hours
// map shows, that period's result (worked out in a Web Worker, never saved), the spot whose
// year is charted, and the play state. The growing-season study (store.$sunGrid) is still
// the one that is saved and feeds the counts.

import { atom, computed, type ReadableAtom } from 'nanostores';
import type { DesignState } from '../types';
import type { LocalSite } from './localsite';
import type { Vec2 } from './geo';
import { siteToLocal } from './rect';
import type { GridSpec } from './sunhours';
import { GROWING, periodKey, type SunPeriod } from './sunperiod';
import { crownsKey, runPeriodStudy, shadeCrowns, type PeriodResult } from './sunstudy';
import type { PlayMode, PlaySpeed } from './sunplay';

interface Deps {
  $site: ReadableAtom<LocalSite | null>;
  $design: ReadableAtom<DesignState | null>;
  $sunTime: ReadableAtom<{ month: number; day: number; minutes: number }>;
  $sunData: ReadableAtom<{ spec: GridSpec; hours: Float32Array } | null>;
}

export function createSunView({ $site, $design, $sunTime, $sunData }: Deps) {
  /** what the sun-hours map shows */
  const $period = atom<SunPeriod>(GROWING);
  const $result = atom<PeriodResult | null>(null);
  const $job = atom<{ progress: number } | null>(null);
  /** the spot whose sun through the year is charted (local feet); null = the middle of the lot */
  const $spot = atom<Vec2 | null>(null);
  const $play = atom<{ mode: PlayMode; speed: PlaySpeed }>({ mode: 'off', speed: 'normal' });

  /** the map to draw: the saved growing-season study, or the chosen period's result once it is in */
  const $heat: ReadableAtom<{ spec: GridSpec; hours: Float32Array } | null> = computed([$period, $result, $sunData], (p, r, g) =>
    p.kind === 'growing' ? g : r && periodKey(r.period) === periodKey(p) ? { spec: r.spec, hours: r.hours } : null,
  );
  const $spotAt: ReadableAtom<Vec2 | null> = computed([$spot, $site], (p, site) =>
    p ?? (site ? siteToLocal(site.frame, [site.frame.lengthFt / 2, site.frame.widthFt / 2]) : null),
  );

  let job: { cancel: () => void } | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;

  function cancel() {
    clearTimeout(timer);
    job?.cancel();
    job = null;
    $job.set(null);
  }

  const treesNow = () => {
    const site = $site.get();
    return site ? crownsKey(shadeCrowns(site, $design.get()?.existing)) : '';
  };

  /** is the result on hand for this period and these trees? */
  const fresh = (p: SunPeriod) => {
    const r = $result.get();
    return Boolean(r && periodKey(r.period) === periodKey(p) && r.treesKey === treesNow());
  };

  function run() {
    const p = $period.get();
    const site = $site.get();
    cancel();
    if (p.kind === 'growing' || !site || fresh(p)) return;
    $job.set({ progress: 0 });
    const r = runPeriodStudy(site, $design.get()?.existing, p, (f) => {
      if (job === r) $job.set({ progress: f });
    });
    job = r;
    r.promise
      .then((res) => {
        if (job !== r) return;
        job = null;
        $job.set(null);
        $result.set(res);
      })
      .catch((e) => {
        if (job === r) {
          job = null;
          $job.set(null);
        }
        if (String(e?.message) !== 'cancelled') console.error(e);
      });
  }

  /** work the period out again soon (a newer request replaces an older one) */
  function schedule(ms = 0) {
    clearTimeout(timer);
    timer = setTimeout(run, ms);
  }

  function setPeriod(p: SunPeriod) {
    $period.set(p);
    if (p.kind === 'growing') cancel();
    else schedule(0);
  }

  const unsubs = [
    // "this day" follows the date (not while the year plays: it would never keep up)
    $sunTime.listen((t) => {
      const p = $period.get();
      if (p.kind !== 'day' || (p.month === t.month && p.day === t.day)) return;
      $period.set({ kind: 'day', month: t.month, day: t.day });
      if ($play.get().mode !== 'year') schedule(450);
      else cancel();
    }),
    $play.listen((s) => {
      if (s.mode === 'off' && $period.get().kind !== 'growing' && !fresh($period.get())) schedule(150);
    }),
    // trees added, moved, resized, removed or switched evergreen: the period map is out of date
    $design.listen(() => {
      const p = $period.get();
      if (p.kind !== 'growing' && $result.get() && !fresh(p) && $play.get().mode === 'off') schedule(600);
    }),
    $site.listen(() => {
      cancel();
      $result.set(null);
      $spot.set(null);
      if ($period.get().kind !== 'growing') schedule(0);
    }),
  ];

  return {
    $period,
    $result,
    $job,
    $spot,
    $spotAt,
    $play,
    $heat,
    setPeriod,
    /** work the chosen period out again now */
    recompute: () => schedule(0),
    destroy() {
      cancel();
      unsubs.forEach((u) => u());
    },
  };
}

export type SunView = ReturnType<typeof createSunView>;
