// Sun position for the lot (SunCalc v2: degrees, azimuth clockwise from north) and the
// growing-season sampling used by the sun-hours study.

import { getPosition, getTimes } from 'suncalc';

export const PHILLY_TZ = 'America/New_York';

export interface SunPos {
  altitudeDeg: number;
  /** degrees clockwise from north */
  azimuthDeg: number;
  /** unit vector TOWARD the sun in local feet: [east, north, up] */
  dir: [number, number, number];
}

export function sunPosition(date: Date, lat: number, lng: number): SunPos {
  const p = getPosition(date, lat, lng);
  const alt = (p.altitude * Math.PI) / 180;
  const az = (p.azimuth * Math.PI) / 180;
  return {
    altitudeDeg: p.altitude,
    azimuthDeg: p.azimuth,
    dir: [Math.cos(alt) * Math.sin(az), Math.cos(alt) * Math.cos(az), Math.sin(alt)],
  };
}

/** Minutes east of UTC for a time zone at an instant (e.g. -240 for EDT). */
export function tzOffsetMinutes(at: Date, timeZone = PHILLY_TZ): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(at);
  const g = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(g('year'), g('month') - 1, g('day'), g('hour'), g('minute'), g('second'));
  return Math.round((asUtc - Math.floor(at.getTime() / 1000) * 1000) / 60000);
}

/** The instant of a Philadelphia wall-clock time. month is 1–12. */
export function phillyTime(year: number, month: number, day: number, minutes: number, timeZone = PHILLY_TZ): Date {
  const guess = Date.UTC(year, month - 1, day, 0, minutes);
  let off = tzOffsetMinutes(new Date(guess), timeZone);
  let t = guess - off * 60000;
  // second pass handles the DST switch day
  off = tzOffsetMinutes(new Date(t), timeZone);
  t = guess - off * 60000;
  return new Date(t);
}

/** Wall-clock minutes after midnight in Philadelphia for an instant. */
export function phillyMinutes(at: Date, timeZone = PHILLY_TZ): number {
  const off = tzOffsetMinutes(at, timeZone);
  const local = new Date(at.getTime() + off * 60000);
  return local.getUTCHours() * 60 + local.getUTCMinutes();
}

export function sunTimes(year: number, month: number, day: number, lat: number, lng: number) {
  const noonLocal = phillyTime(year, month, day, 12 * 60);
  const t = getTimes(noonLocal, lat, lng);
  return { sunrise: t.sunrise, sunset: t.sunset, solarNoon: t.solarNoon };
}

export interface SeasonOptions {
  /** inclusive, 'MM-DD' */
  from: string;
  to: string;
  everyDays: number;
  everyMinutes: number;
  year?: number;
}

export const DEFAULT_SEASON: SeasonOptions = { from: '04-15', to: '10-15', everyDays: 10, everyMinutes: 15 };

export interface SunSample {
  azimuthDeg: number;
  altitudeDeg: number;
  /** hours this sample stands for */
  weight: number;
}

/**
 * Sun positions across the growing season: every `everyDays` days from `from` to `to`,
 * every `everyMinutes` minutes between sunrise and sunset (sampled at the middle of each
 * step). Returns the samples and the number of days, so hours can be averaged per day.
 */
export function seasonSamples(lat: number, lng: number, opts: SeasonOptions = DEFAULT_SEASON): { samples: SunSample[]; days: number } {
  const year = opts.year ?? 2026;
  const [fm, fd] = opts.from.split('-').map(Number) as [number, number];
  const [tm, td] = opts.to.split('-').map(Number) as [number, number];
  const start = Date.UTC(year, fm - 1, fd);
  const end = Date.UTC(year, tm - 1, td);
  const samples: SunSample[] = [];
  let days = 0;
  for (let t = start; t <= end; t += opts.everyDays * 86400000) {
    const d = new Date(t);
    const { sunrise, sunset } = sunTimes(year, d.getUTCMonth() + 1, d.getUTCDate(), lat, lng);
    days++;
    if (!sunrise || !sunset) continue;
    const step = opts.everyMinutes * 60000;
    for (let s = sunrise.getTime(); s < sunset.getTime(); s += step) {
      const span = Math.min(step, sunset.getTime() - s);
      const p = getPosition(new Date(s + span / 2), lat, lng);
      if (p.altitude <= 0) continue;
      samples.push({ azimuthDeg: p.azimuth, altitudeDeg: p.altitude, weight: span / 3600000 });
    }
  }
  return { samples, days };
}
