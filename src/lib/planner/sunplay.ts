// "Play the day" and "Play the year" (shadows workstream, 2026-10-04): how far the clock
// or the calendar moves per frame. Pure, so the stepping is tested; the loop itself lives
// in SunPanel (it pauses while the 3D view is off screen or the tab is hidden).

export type PlayMode = 'off' | 'day' | 'year';
export type PlaySpeed = 'slow' | 'normal' | 'fast';

/** minutes of the day per second, days of the year per second */
export const PLAY_RATES: Record<PlaySpeed, { day: number; year: number }> = {
  slow: { day: 60, year: 5 },
  normal: { day: 120, year: 12 },
  fast: { day: 300, year: 30 },
};

const YEAR = 2026;

/** Day of the year (1–365) of a month/day. */
export function dayOfYear(month: number, day: number): number {
  return Math.round((Date.UTC(YEAR, month - 1, day) - Date.UTC(YEAR, 0, 1)) / 86400000) + 1;
}

/** Month/day of a day of the year (fractions are dropped, 1–365 wrap). */
export function dateOfDay(n: number): { month: number; day: number } {
  const d = ((Math.floor(n) - 1) % 365 + 365) % 365;
  const t = new Date(Date.UTC(YEAR, 0, 1 + d));
  return { month: t.getUTCMonth() + 1, day: t.getUTCDate() };
}

/** The clock after `dtMs` of playing the day: from just before sunrise to just after sunset, then round again. */
export function advanceDay(minutes: number, dtMs: number, speed: PlaySpeed, rise: number, set: number): number {
  let m = Math.max(minutes, rise - 10) + (PLAY_RATES[speed].day * dtMs) / 1000;
  if (m > set + 10) m = Math.max(0, rise - 10);
  return m;
}

/** The calendar after `dtMs` of playing the year (a fractional day of the year, 1 ≤ n < 366). */
export function advanceYear(n: number, dtMs: number, speed: PlaySpeed): number {
  let p = n + (PLAY_RATES[speed].year * dtMs) / 1000;
  while (p >= 366) p -= 365;
  return p;
}
