// Sun hours for any stretch of the year (shadows workstream, 2026-10-04): one day, a
// month, a season, the growing season or the whole year, plus the month-by-month sun at
// one spot. The growing season is still the study that feeds the counts and the Assess
// summary; the other periods are for looking only.

import type { Vec2 } from './geo';
import { DEFAULT_SEASON, seasonSamples, type SeasonOptions, type SunSample } from './sun';
import { computeSunHours, type Crown, type GridSpec, type Prism } from './sunhours';

export type SeasonName = 'spring' | 'summer' | 'fall' | 'winter';

export type SunPeriod =
  | { kind: 'growing' }
  | { kind: 'year' }
  | { kind: 'season'; season: SeasonName }
  | { kind: 'month'; month: number }
  | { kind: 'day'; month: number; day: number };

export const GROWING: SunPeriod = { kind: 'growing' };

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/** Astronomical seasons (equinoxes and solstices, rounded to the usual dates). */
export const SEASONS: Record<SeasonName, { label: string; from: string; to: string }> = {
  spring: { label: 'Spring', from: '03-20', to: '06-20' },
  summer: { label: 'Summer', from: '06-21', to: '09-21' },
  fall: { label: 'Fall', from: '09-22', to: '12-20' },
  winter: { label: 'Winter', from: '12-21', to: '03-19' },
};

const pad = (n: number) => String(n).padStart(2, '0');

function mmdd(s: string): string {
  const [m, d] = s.split('-').map(Number) as [number, number];
  return `${MONTHS_SHORT[m - 1]} ${d}`;
}

/** Which days and how often the sun is sampled for a period (more often for short periods). */
export function periodOptions(p: SunPeriod): SeasonOptions {
  switch (p.kind) {
    case 'growing':
      return DEFAULT_SEASON;
    case 'year':
      return { from: '01-01', to: '12-31', everyDays: 10, everyMinutes: 15 };
    case 'season':
      return { from: SEASONS[p.season].from, to: SEASONS[p.season].to, everyDays: 7, everyMinutes: 15 };
    case 'month':
      return { from: `${pad(p.month)}-01`, to: `${pad(p.month)}-${DAYS_IN_MONTH[p.month - 1]}`, everyDays: 3, everyMinutes: 15 };
    case 'day':
      return { from: `${pad(p.month)}-${pad(p.day)}`, to: `${pad(p.month)}-${pad(p.day)}`, everyDays: 1, everyMinutes: 5 };
  }
}

export function periodKey(p: SunPeriod): string {
  switch (p.kind) {
    case 'growing':
    case 'year':
      return p.kind;
    case 'season':
      return `season:${p.season}`;
    case 'month':
      return `month:${p.month}`;
    case 'day':
      return `day:${p.month}-${p.day}`;
  }
}

export function parsePeriodKey(k: string, today?: { month: number; day: number }): SunPeriod {
  if (k === 'year') return { kind: 'year' };
  const [kind, v] = k.split(':');
  if (kind === 'season' && v && v in SEASONS) return { kind: 'season', season: v as SeasonName };
  if (kind === 'month' && v && Number(v) >= 1 && Number(v) <= 12) return { kind: 'month', month: Number(v) };
  if (kind === 'day') {
    const [m, d] = (v ?? '').split('-').map(Number);
    if (m && d) return { kind: 'day', month: m, day: d };
    if (today) return { kind: 'day', ...today };
  }
  return GROWING;
}

/** "the growing season (Apr 15 – Oct 15)", "June", "winter (Dec 21 – Mar 19)", "Jun 21", "the whole year" */
export function periodLabel(p: SunPeriod): string {
  switch (p.kind) {
    case 'growing':
      return `the growing season (${mmdd(DEFAULT_SEASON.from)} – ${mmdd(DEFAULT_SEASON.to)})`;
    case 'year':
      return 'the whole year';
    case 'season':
      return `${SEASONS[p.season].label.toLowerCase()} (${mmdd(SEASONS[p.season].from)} – ${mmdd(SEASONS[p.season].to)})`;
    case 'month':
      return MONTHS[p.month - 1]!;
    case 'day':
      return `${MONTHS_SHORT[p.month - 1]} ${p.day}`;
  }
}

export function periodSamples(lat: number, lng: number, p: SunPeriod): { samples: SunSample[]; days: number } {
  return seasonSamples(lat, lng, periodOptions(p));
}

// ---- one spot, month by month ------------------------------------------------------

export interface MonthSun {
  month: number;
  /** average hours of direct sun a day at the spot */
  sunHours: number;
  /** average hours the sun is up (above the 0.5° the study counts) */
  daylightHours: number;
}

const monthCache = new Map<string, { samples: SunSample[]; days: number }[]>();

/** Sun positions for each month (every 4th day, every 15 minutes), cached per place. */
export function monthSamples(lat: number, lng: number): { samples: SunSample[]; days: number }[] {
  const key = `${lat.toFixed(3)},${lng.toFixed(3)}`;
  let m = monthCache.get(key);
  if (!m) {
    m = Array.from({ length: 12 }, (_, i) =>
      seasonSamples(lat, lng, { from: `${pad(i + 1)}-01`, to: `${pad(i + 1)}-${DAYS_IN_MONTH[i]}`, everyDays: 4, everyMinutes: 15 }),
    );
    monthCache.set(key, m);
    if (monthCache.size > 8) monthCache.delete(monthCache.keys().next().value!);
  }
  return m;
}

export interface SpotInput {
  point: Vec2;
  /** ground at the spot, ft above the lot's datum */
  groundFt?: number;
  buildings: Prism[];
  crowns: Crown[];
  lat: number;
  lng: number;
}

/**
 * Average direct-sun hours per day for each month at one spot (1 ft above the ground),
 * with the same blocking model as the map. Cheap enough to run on a click: one point,
 * about 2,700 sun positions.
 */
export function spotMonthly(input: SpotInput): MonthSun[] {
  const [x, y] = input.point;
  const grid: GridSpec = {
    origin: [x - 0.5, y - 0.5],
    ux: [1, 0],
    uy: [0, 1],
    cellFt: 1,
    nx: 1,
    ny: 1,
    ...(input.groundFt ? { groundFt: new Float32Array([input.groundFt]) } : {}),
  };
  return monthSamples(input.lat, input.lng).map(({ samples, days }, i) => {
    const h = computeSunHours({ grid, buildings: input.buildings, crowns: input.crowns, samples, days });
    const daylight = samples.reduce((s, x) => s + (x.altitudeDeg > 0.5 ? x.weight : 0), 0) / Math.max(1, days);
    return { month: i + 1, sunHours: h[0]!, daylightHours: daylight };
  });
}
