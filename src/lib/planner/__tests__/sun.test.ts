import { describe, expect, it } from 'vitest';
import { getTimes } from 'suncalc';
import { sunPosition, phillyTime, phillyMinutes, seasonSamples, tzOffsetMinutes } from '../sun';
import { computeSunHours, classify, encodeHours, decodeHours, summarise, lotSunClass, hoursAt, type GridSpec } from '../sunhours';

const PHL = { lat: 39.9526, lng: -75.1652 };

function noonAltitude(y: number, m: number, d: number) {
  const t = getTimes(new Date(Date.UTC(y, m - 1, d, 17)), PHL.lat, PHL.lng);
  return sunPosition(t.solarNoon, PHL.lat, PHL.lng).altitudeDeg;
}

describe('sun position in Philadelphia', () => {
  it('June solstice solar-noon altitude is about 73.5°', () => {
    expect(noonAltitude(2026, 6, 21)).toBeCloseTo(73.5, 0);
  });
  it('December solstice solar-noon altitude is about 26.6°', () => {
    expect(noonAltitude(2026, 12, 21)).toBeCloseTo(26.6, 0);
  });
  it('the sun is due south at solar noon and the direction vector points up and south', () => {
    const t = getTimes(new Date(Date.UTC(2026, 5, 21, 17)), PHL.lat, PHL.lng);
    const p = sunPosition(t.solarNoon, PHL.lat, PHL.lng);
    expect(p.azimuthDeg).toBeCloseTo(180, 0);
    expect(p.dir[1]).toBeLessThan(0);
    expect(p.dir[2]).toBeGreaterThan(0.9);
    expect(Math.hypot(...p.dir)).toBeCloseTo(1, 9);
  });
  it('converts Philadelphia wall-clock time (EDT in summer, EST in winter)', () => {
    const summer = phillyTime(2026, 7, 1, 13 * 60 + 15);
    expect(summer.toISOString()).toBe('2026-07-01T17:15:00.000Z');
    expect(tzOffsetMinutes(summer)).toBe(-240);
    const winter = phillyTime(2026, 1, 15, 9 * 60);
    expect(winter.toISOString()).toBe('2026-01-15T14:00:00.000Z');
    expect(phillyMinutes(winter)).toBe(9 * 60);
  });
  it('samples the growing season (Apr 15 - Oct 15) with 13-15 hours of daylight per day', () => {
    const { samples, days } = seasonSamples(PHL.lat, PHL.lng);
    expect(days).toBe(19);
    const total = samples.reduce((s, x) => s + x.weight, 0) / days;
    expect(total).toBeGreaterThan(12.5);
    expect(total).toBeLessThan(14.5);
  });
});

describe('sun hours', () => {
  // grid 40 ft x 40 ft centred on a 40 ft tall east-west wall at y = 0..2
  const grid: GridSpec = { origin: [-20, -20], ux: [1, 0], uy: [0, 1], cellFt: 2, nx: 20, ny: 20 };
  const wall = { ring: [[-100, 0], [100, 0], [100, 2], [-100, 2]] as [number, number][], heightFt: 40 };
  // the default growing season (Apr 15 - Oct 15): in June a cell 13 ft north of a 40 ft wall
  // still sees the noon sun, in spring and fall it does not
  const season = seasonSamples(PHL.lat, PHL.lng);

  it('cells north of a tall wall get fewer hours than cells south of it', () => {
    const h = computeSunHours({ grid, buildings: [wall], crowns: [], ...season });
    const at = (x: number, y: number) => hoursAt(grid, h, [x, y]);
    const south = at(0, -9);
    const north = at(0, 9);
    expect(south).toBeGreaterThan(9);
    expect(north).toBeLessThan(south - 3);
    expect(classify(north)).not.toBe('sun');
    // cells inside the wall's footprint get none
    expect(at(0, 1)).toBe(0);
  });
  it('an open lot gets every daylight hour, and a tree crown blocks 60%', () => {
    const open = computeSunHours({ grid, buildings: [], crowns: [], ...season });
    const daylight = season.samples.filter((x) => x.altitudeDeg > 0.5).reduce((s, x) => s + x.weight, 0) / season.days;
    expect(hoursAt(grid, open, [0, 0])).toBeCloseTo(daylight, 3);
    // a huge crown overhead: every ray passes through it
    const shaded = computeSunHours({ grid, buildings: [], crowns: [{ x: 0, y: 0, z: 30, r: 500 }], ...season });
    expect(hoursAt(grid, shaded, [0, 0])).toBeCloseTo(daylight * 0.4, 3);
  });
  it('respects the lot mask and encodes compactly', () => {
    const mask = new Uint8Array(grid.nx * grid.ny).fill(1);
    mask[0] = 0;
    const h = computeSunHours({ grid: { ...grid, mask }, buildings: [wall], crowns: [], ...season });
    expect(Number.isNaN(h[0])).toBe(true);
    const back = decodeHours(encodeHours(h));
    expect(Number.isNaN(back[0])).toBe(true);
    for (let i = 1; i < h.length; i++) expect(Math.abs(back[i]! - h[i]!)).toBeLessThanOrEqual(0.051);
    const s = summarise(h);
    expect(s.sun + s.part + s.shade).toBeCloseTo(1, 9);
  });
  it('classes the whole lot', () => {
    expect(lotSunClass({ sun: 0.85, part: 0.1, shade: 0.05 })).toBe('full-sun');
    expect(lotSunClass({ sun: 0.6, part: 0.2, shade: 0.2 })).toBe('mostly-sun');
    expect(lotSunClass({ sun: 0.3, part: 0.2, shade: 0.5 })).toBe('mostly-shade');
    expect(lotSunClass({ sun: 0.1, part: 0.2, shade: 0.7 })).toBe('deep-shade');
  });
});
