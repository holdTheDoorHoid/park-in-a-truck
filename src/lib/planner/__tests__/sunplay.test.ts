// Shadows workstream (2026-10-04): stepping "Play the day" / "Play the year", and the spot chart's words.
import { describe, expect, it } from 'vitest';
import { PLAY_RATES, advanceDay, advanceYear, dateOfDay, dayOfYear } from '../sunplay';
import { fullSunMonths } from '../../../components/planner/SpotChart';
import type { MonthSun } from '../sunperiod';

describe('play the day', () => {
  const rise = 6 * 60;
  const set = 20 * 60;
  it('moves the clock at the chosen speed', () => {
    expect(advanceDay(12 * 60, 1000, 'normal', rise, set)).toBeCloseTo(12 * 60 + PLAY_RATES.normal.day, 6);
    expect(advanceDay(12 * 60, 500, 'fast', rise, set)).toBeCloseTo(12 * 60 + PLAY_RATES.fast.day / 2, 6);
    expect(PLAY_RATES.slow.day).toBeLessThan(PLAY_RATES.normal.day);
    expect(PLAY_RATES.normal.day).toBeLessThan(PLAY_RATES.fast.day);
  });
  it('starts again just before sunrise after sunset, and skips the night', () => {
    expect(advanceDay(set + 5, 1000, 'normal', rise, set)).toBe(rise - 10);
    expect(advanceDay(2 * 60, 33, 'normal', rise, set)).toBeGreaterThanOrEqual(rise - 10);
  });
});

describe('play the year', () => {
  it('moves the date at the chosen speed and wraps at New Year', () => {
    expect(advanceYear(100, 1000, 'normal')).toBeCloseTo(100 + PLAY_RATES.normal.year, 6);
    const p = advanceYear(364.5, 1000, 'fast');
    expect(p).toBeGreaterThanOrEqual(1);
    expect(p).toBeLessThan(366);
    expect(dateOfDay(p).month).toBe(1);
  });
  it('day-of-year and dates round-trip', () => {
    for (const [m, d] of [[1, 1], [2, 28], [3, 1], [6, 21], [12, 31]] as const) expect(dateOfDay(dayOfYear(m, d))).toEqual({ month: m, day: d });
    expect(dateOfDay(365.7)).toEqual({ month: 12, day: 31 });
    expect(dateOfDay(366)).toEqual({ month: 1, day: 1 });
  });
});

describe('spot chart words', () => {
  const months = (hours: number[]): MonthSun[] => hours.map((h, i) => ({ month: i + 1, sunHours: h, daylightHours: 12 }));
  it('names the months with 6 or more hours', () => {
    expect(fullSunMonths(months([1, 2, 3, 4, 6, 7, 8, 6.5, 5, 3, 2, 1]))).toBe('May to August');
    expect(fullSunMonths(months([1, 2, 3, 6, 6, 1, 1, 1, 6, 1, 1, 1]))).toBe('April, May and September');
    expect(fullSunMonths(months([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]))).toBe('');
    expect(fullSunMonths(months([0, 0, 0, 0, 0, 7, 0, 0, 0, 0, 0, 0]))).toBe('June');
  });
});
