// The shade calendar (2026-10-04): for one spot, WHEN in the day it gets direct sun, month by
// month — a grid of 12 months × half-hours of Philadelphia clock time (with daylight saving).
// Each square is a typical day of that month at that half-hour: several days and several
// instants inside the half-hour are traced, and the square counts how often the sun was
// direct, came through tree crowns (dappled), was behind a building, or was down.
//
// Same blocking model and inputs as the spot chart and the maps: the sun maths in
// sunhours.ts (computeSunHours + its per-sample hook), buildings near and far, tree crowns by
// leaf season, ground heights. Pure (no DOM, no text) so it runs in a Web Worker and in tests;
// the words are in shadewords.ts.

import { getPosition } from 'suncalc';
import { leafFraction } from './treemodel';
import { phillyTime, tzOffsetMinutes, type SunSample } from './sun';
import { computeSunHours, type Crown, type GridSpec, type Prism } from './sunhours';
import { spotGrid, type SpotInput } from './sunperiod';

/** the year the sun is worked out for (as everywhere in the planner; the geometry barely changes between years) */
export const CAL_YEAR = 2026;

export interface CalOptions {
  /** clock minutes (Philadelphia) where the first column starts … */
  startMin: number;
  /** … and where the last one ends */
  endMin: number;
  stepMin: number;
  /** days traced per month, spread evenly through it */
  daysPerMonth: number;
  /** instants traced inside each column, minutes after its start */
  offsets: number[];
}

/** one spot: 8 days a month × 3 instants a half-hour = 24 traces per square (about 9,200 in all) */
export const CAL_SPOT: CalOptions = { startMin: 5 * 60, endMin: 21 * 60, stepMin: 30, daysPerMonth: 8, offsets: [5, 15, 25] };
/** the whole lot: 4 days × 2 instants per square, on the lot's grid */
export const CAL_LOT: CalOptions = { startMin: 5 * 60, endMin: 21 * 60, stepMin: 30, daysPerMonth: 4, offsets: [10, 20] };

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/** The days traced in a month (1–12): `count` days spread evenly, e.g. 2, 6, 10 … 30 for 8 in July. */
export function monthDays(month: number, count: number): number[] {
  const len = DAYS_IN_MONTH[month - 1]!;
  return Array.from({ length: count }, (_, i) => Math.floor(((i + 0.5) * len) / count) + 1);
}

/**
 * The instant of a Philadelphia clock time on a day, quickly: daylight saving switches at 2 am,
 * outside the calendar's hours, so one offset per day (taken at noon) is exact for 5 am – 9 pm.
 */
export function dayClock(month: number, day: number): (minutes: number) => Date {
  const off = tzOffsetMinutes(phillyTime(CAL_YEAR, month, day, 12 * 60));
  const midnight = Date.UTC(CAL_YEAR, month - 1, day) - off * 60000;
  return (minutes) => new Date(midnight + minutes * 60000);
}

export interface CalSamples {
  opts: CalOptions;
  cols: number;
  /** every traced instant (also those with the sun down: computeSunHours skips them) */
  samples: SunSample[];
  /** the square each sample belongs to: month index (0–11) × cols + column */
  cell: Uint16Array;
  /** samples per square */
  perCell: number;
}

const sampleCache = new Map<string, CalSamples>();

/** The sun positions the calendar traces, cached per place. */
export function calendarSamples(lat: number, lng: number, opts: CalOptions = CAL_SPOT): CalSamples {
  const key = `${lat.toFixed(3)},${lng.toFixed(3)}|${opts.startMin},${opts.endMin},${opts.stepMin},${opts.daysPerMonth},${opts.offsets.join(',')}`;
  const hit = sampleCache.get(key);
  if (hit) return hit;
  const cols = Math.round((opts.endMin - opts.startMin) / opts.stepMin);
  const samples: SunSample[] = [];
  const cell: number[] = [];
  const weight = opts.stepMin / opts.offsets.length / 60;
  for (let m = 1; m <= 12; m++) {
    for (const d of monthDays(m, opts.daysPerMonth)) {
      const at = dayClock(m, d);
      const leaf = leafFraction(m, d);
      for (let c = 0; c < cols; c++) {
        for (const o of opts.offsets) {
          const p = getPosition(at(opts.startMin + c * opts.stepMin + o), lat, lng);
          samples.push({ azimuthDeg: p.azimuth, altitudeDeg: p.altitude, weight, leaf, month: m });
          cell.push((m - 1) * cols + c);
        }
      }
    }
  }
  const out: CalSamples = { opts, cols, samples, cell: Uint16Array.from(cell), perCell: opts.daysPerMonth * opts.offsets.length };
  sampleCache.set(key, out);
  if (sampleCache.size > 6) sampleCache.delete(sampleCache.keys().next().value!);
  return out;
}

// ---- the calendar ----------------------------------------------------------------------

export type CellState = 'sun' | 'tree' | 'building' | 'night';

/** One square: how its traces came out. */
export interface CalCell {
  /** traces in the square */
  n: number;
  /** traces with direct sun / through tree crowns / behind a building / the sun down (below 0.5°, as the maps count it) */
  sun: number;
  tree: number;
  building: number;
  night: number;
  /** light summed over the traces with the sun up (1 = direct sun; through crowns 0.4 in leaf, 0.7 bare; 0 = building) */
  light: number;
  /** unit vectors toward the sun (east, north) summed over traces blocked by a building / by tree crowns */
  bE: number;
  bN: number;
  tE: number;
  tN: number;
}

export interface ShadeCal {
  /** 'spot': one spot, every square classified; 'lot': the whole lot, `light` = share of the lot in direct sun */
  kind: 'spot' | 'lot';
  startMin: number;
  stepMin: number;
  cols: number;
  /** [month 0–11][column] */
  cells: CalCell[][];
}

const emptyCell = (n: number): CalCell => ({ n, sun: 0, tree: 0, building: 0, night: n, light: 0, bE: 0, bN: 0, tE: 0, tN: 0 });

function emptyCal(kind: ShadeCal['kind'], cs: CalSamples): ShadeCal {
  return {
    kind,
    startMin: cs.opts.startMin,
    stepMin: cs.opts.stepMin,
    cols: cs.cols,
    cells: Array.from({ length: 12 }, () => Array.from({ length: cs.cols }, () => emptyCell(cs.perCell))),
  };
}

/** a trace's light → what it is: 1 direct sun, 0 a building, in between tree crowns */
export function traceState(light: number): Exclude<CellState, 'night'> {
  return light >= 0.999 ? 'sun' : light <= 0 ? 'building' : 'tree';
}

/** The shade calendar for one spot (1 ft above its ground), with the spot chart's inputs (sunstudy.spotInputFor). */
export function spotCalendar(input: SpotInput, opts: CalOptions = CAL_SPOT): ShadeCal {
  const cs = calendarSamples(input.lat, input.lng, opts);
  const cal = emptyCal('spot', cs);
  const flat = cal.cells.flat();
  computeSunHours({
    grid: spotGrid(input),
    buildings: input.buildings,
    crowns: input.crowns,
    samples: cs.samples,
    days: 1,
    onSample: (si, lit) => {
      const c = flat[cs.cell[si]!]!;
      const l = lit[0]!;
      const s = cs.samples[si]!;
      c.night--;
      c.light += l;
      const state = traceState(l);
      c[state]++;
      if (state !== 'sun') {
        const az = (s.azimuthDeg * Math.PI) / 180;
        if (state === 'building') {
          c.bE += Math.sin(az);
          c.bN += Math.cos(az);
        } else {
          c.tE += Math.sin(az);
          c.tN += Math.cos(az);
        }
      }
    },
  });
  return cal;
}

/**
 * The lot's grid with cells `factor` times bigger (each new cell: the middle of a block of old
 * ones, in the lot when half the block or more is, at the block's average ground height). The
 * whole-lot calendar traces about 3,000 sun positions for every cell, so it uses 2-ft cells where
 * the maps use 1 ft.
 */
export function coarseGrid(g: GridSpec, factor: number): GridSpec {
  if (factor <= 1) return g;
  const nx = Math.ceil(g.nx / factor);
  const ny = Math.ceil(g.ny / factor);
  const mask = new Uint8Array(nx * ny);
  const groundFt = g.groundFt ? new Float32Array(nx * ny) : undefined;
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      let n = 0;
      let inLot = 0;
      let ground = 0;
      let grounds = 0;
      for (let b = j * factor; b < Math.min(g.ny, (j + 1) * factor); b++) {
        for (let a = i * factor; a < Math.min(g.nx, (i + 1) * factor); a++) {
          const k = b * g.nx + a;
          n++;
          if (!g.mask || g.mask[k]) inLot++;
          const z = g.groundFt?.[k];
          if (z !== undefined && Number.isFinite(z)) {
            ground += z;
            grounds++;
          }
        }
      }
      mask[j * nx + i] = inLot * 2 >= n ? 1 : 0;
      if (groundFt) groundFt[j * nx + i] = grounds ? ground / grounds : 0;
    }
  }
  return { origin: g.origin, ux: g.ux, uy: g.uy, cellFt: g.cellFt * factor, nx, ny, mask, ...(groundFt ? { groundFt } : {}) };
}

export interface LotCalInput {
  grid: GridSpec;
  buildings: Prism[];
  crowns: Crown[];
  lat: number;
  lng: number;
}

/**
 * The whole lot: for each square, the share of the lot in direct sun (trees count for the light
 * they let through, as "in direct sun now" does), averaged over the traces with the sun up.
 */
export function lotCalendar(input: LotCalInput, onProgress?: (f: number) => void, opts: CalOptions = CAL_LOT): ShadeCal {
  const cs = calendarSamples(input.lat, input.lng, opts);
  const cal = emptyCal('lot', cs);
  const flat = cal.cells.flat();
  const mask = input.grid.mask;
  const N = input.grid.nx * input.grid.ny;
  let inLot = 0;
  for (let k = 0; k < N; k++) if (!mask || mask[k]) inLot++;
  computeSunHours(
    {
      grid: input.grid,
      buildings: input.buildings,
      crowns: input.crowns,
      samples: cs.samples,
      days: 1,
      onSample: (si, lit) => {
        let sum = 0;
        for (let k = 0; k < N; k++) if (!mask || mask[k]) sum += lit[k]!;
        const c = flat[cs.cell[si]!]!;
        c.night--;
        c.light += inLot ? sum / inLot : 0;
      },
    },
    onProgress,
  );
  return cal;
}

// ---- reading a square ------------------------------------------------------------------

/** traces with the sun up */
export const dayTraces = (c: CalCell) => c.n - c.night;
/** the sun is up for at least half the square */
export const isDay = (c: CalCell) => c.night * 2 < c.n;
/** share of the sun-up traces with direct sun (spot) or of the lot in direct sun (lot) */
export const sunShare = (c: CalCell, kind: ShadeCal['kind'] = 'spot') => {
  const d = dayTraces(c);
  return d ? (kind === 'lot' ? c.light : c.sun) / d : 0;
};

/**
 * What a square mostly is: 'night' unless the sun is up for half of it or more; then 'sun' when
 * half or more of those traces get direct sun; otherwise whichever shade is commoner (a tie goes
 * to trees: their light still gets through).
 */
export function cellState(c: CalCell): CellState {
  if (!isDay(c)) return 'night';
  if (c.sun * 2 >= dayTraces(c)) return 'sun';
  return c.tree >= c.building ? 'tree' : 'building';
}

/** Each kind's share of the square, for drawing it (adds up to 1). */
export function cellShares(c: CalCell): Record<CellState, number> {
  const n = c.n || 1;
  return { sun: c.sun / n, tree: c.tree / n, building: c.building / n, night: c.night / n };
}

/** Compass point (0 = north, 1 = northeast … 7 = northwest) of a direction given as east/north parts. */
export function compassIndex(e: number, n: number): number {
  const az = (Math.atan2(e, n) * 180) / Math.PI;
  return Math.round((((az % 360) + 360) % 360) / 45) % 8;
}

// ---- the summary -----------------------------------------------------------------------

export type ShadeKind = 'building' | 'tree' | 'mixed';

/** Where a stretch of shade comes from. */
export interface ShadeFrom {
  /** buildings, trees, or both (each at least 30% of the blocked traces) */
  kind: ShadeKind;
  /** compass point toward the sun while it is blocked: where the shade comes from (0 = north … 7 = northwest) */
  dir: number;
  /** what it was worked out from (so months can be added together) */
  b: number;
  t: number;
  e: number;
  nn: number;
}

/** A typical day of one month (or a group of months) at the spot. */
export interface DayPattern {
  /** 'none': no direct sun at all; 'sun': one or two spells of sun; 'patchy': three or more */
  type: 'none' | 'sun' | 'patchy';
  /** spells of direct sun, clock minutes [from, to) */
  windows: [number, number][];
  /** the first spell starts when the sun comes up / the last ends when it goes down */
  fromSunrise: boolean;
  toSunset: boolean;
  /** shade before the first spell, between two spells, after the last; for 'none', `allDay` */
  before: ShadeFrom | null;
  between: ShadeFrom | null;
  after: ShadeFrom | null;
  allDay: ShadeFrom | null;
}

function shadeFrom(b: number, t: number, e: number, nn: number): ShadeFrom | null {
  if (b + t <= 0) return null;
  const share = b / (b + t);
  return { kind: share >= 0.7 ? 'building' : share <= 0.3 ? 'tree' : 'mixed', dir: compassIndex(e, nn), b, t, e, nn };
}

function shadeOver(row: CalCell[], a: number, z: number): ShadeFrom | null {
  let b = 0;
  let t = 0;
  let e = 0;
  let nn = 0;
  for (let i = a; i <= z; i++) {
    const c = row[i]!;
    b += c.building;
    t += c.tree;
    e += c.bE + c.tE;
    nn += c.bN + c.tN;
  }
  return shadeFrom(b, t, e, nn);
}

/**
 * A month's typical day, read from its row: the half-hours that are mostly sun (cellState) make
 * the spells (a single half-hour of shade between two spells doesn't split them), and the shade
 * around them says what blocks the sun and from which side.
 */
export function dayPattern(cal: ShadeCal, monthIndex: number): DayPattern | null {
  const row = cal.cells[monthIndex]!;
  const day = row.map(isDay);
  const fd = day.indexOf(true);
  const ld = day.lastIndexOf(true);
  if (fd < 0) return null;
  const runs: [number, number][] = [];
  for (let i = fd; i <= ld; i++) {
    if (cellState(row[i]!) !== 'sun') continue;
    const last = runs[runs.length - 1];
    if (last && i - last[1] <= 2) last[1] = i;
    else runs.push([i, i]);
  }
  const at = (i: number) => cal.startMin + i * cal.stepMin;
  if (!runs.length) {
    return { type: 'none', windows: [], fromSunrise: false, toSunset: false, before: null, between: null, after: null, allDay: shadeOver(row, fd, ld) };
  }
  const first = runs[0]!;
  const last = runs[runs.length - 1]!;
  return {
    type: runs.length <= 2 ? 'sun' : 'patchy',
    windows: runs.map(([a, z]) => [at(a), at(z + 1)]),
    fromSunrise: first[0] === fd,
    toSunset: last[1] === ld,
    before: first[0] > fd ? shadeOver(row, fd, first[0] - 1) : null,
    between: runs.length === 2 ? shadeOver(row, first[1] + 1, last[0] - 1) : null,
    after: last[1] < ld ? shadeOver(row, last[1] + 1, ld) : null,
    allDay: null,
  };
}

/** months in a group: two patterns are told together when their times are within an hour */
const SAME_TIME_MIN = 60;

const dirClose = (a: number, b: number) => {
  const d = Math.abs(a - b) % 8;
  return Math.min(d, 8 - d) <= 1;
};
const sameShade = (a: ShadeFrom | null, b: ShadeFrom | null) => (!a || !b ? a === b : a.kind === b.kind && dirClose(a.dir, b.dir));

export function similarDays(a: DayPattern, b: DayPattern): boolean {
  if (a.type !== b.type || a.windows.length !== b.windows.length) return false;
  if (a.type === 'none') return sameShade(a.allDay, b.allDay);
  if (a.fromSunrise !== b.fromSunrise || a.toSunset !== b.toSunset) return false;
  for (let i = 0; i < a.windows.length; i++) {
    const [f1, t1] = a.windows[i]!;
    const [f2, t2] = b.windows[i]!;
    if (Math.abs(f1 - f2) > SAME_TIME_MIN || Math.abs(t1 - t2) > SAME_TIME_MIN) return false;
  }
  return sameShade(a.before, b.before) && sameShade(a.between, b.between) && sameShade(a.after, b.after);
}

function addShades(list: (ShadeFrom | null)[]): ShadeFrom | null {
  const s = list.filter((x): x is ShadeFrom => Boolean(x));
  if (!s.length) return null;
  return shadeFrom(
    s.reduce((a, x) => a + x.b, 0),
    s.reduce((a, x) => a + x.t, 0),
    s.reduce((a, x) => a + x.e, 0),
    s.reduce((a, x) => a + x.nn, 0),
  );
}

const round30 = (m: number) => Math.round(m / 30) * 30;

/** One typical day standing for several months: average times (to the half-hour), shade added together. */
export function mergeDays(days: DayPattern[]): DayPattern {
  const d0 = days[0]!;
  return {
    ...d0,
    windows: d0.windows.map((_, i) => [
      round30(days.reduce((a, d) => a + d.windows[i]![0], 0) / days.length),
      round30(days.reduce((a, d) => a + d.windows[i]![1], 0) / days.length),
    ]),
    before: addShades(days.map((d) => d.before)),
    between: addShades(days.map((d) => d.between)),
    after: addShades(days.map((d) => d.after)),
    allDay: addShades(days.map((d) => d.allDay)),
  };
}

export interface MonthGroup {
  /** months 1–12 in calendar order; a group may run over the new year (11, 12, 1, 2) */
  months: number[];
  day: DayPattern;
}

/**
 * The calendar in a few lines: months next to each other whose typical days are alike are told
 * together (December–February may be one group), each with one merged typical day.
 */
export function summarise(cal: ShadeCal): MonthGroup[] {
  const days = cal.cells.map((_, i) => dayPattern(cal, i));
  const groups: { months: number[]; days: DayPattern[] }[] = [];
  days.forEach((d, i) => {
    if (!d) return;
    const g = groups[groups.length - 1];
    if (g && g.months[g.months.length - 1] === i && similarDays(g.days[0]!, d)) {
      g.months.push(i + 1);
      g.days.push(d);
    } else groups.push({ months: [i + 1], days: [d] });
  });
  // round the new year: December's group and January's are one when they are alike
  if (groups.length > 1) {
    const first = groups[0]!;
    const last = groups[groups.length - 1]!;
    if (first.months[0] === 1 && last.months[last.months.length - 1] === 12 && similarDays(last.days[0]!, first.days[0]!)) {
      groups.pop();
      first.months = [...last.months, ...first.months];
      first.days = [...last.days, ...first.days];
    }
  }
  return groups.map((g) => ({ months: g.months, day: mergeDays(g.days) }));
}

/** Runs of one state along a month's row: [state, from, to) in clock minutes (for the table). */
export function monthRuns(cal: ShadeCal, monthIndex: number): { state: CellState; from: number; to: number }[] {
  const out: { state: CellState; from: number; to: number }[] = [];
  cal.cells[monthIndex]!.forEach((c, i) => {
    const state = cellState(c);
    const from = cal.startMin + i * cal.stepMin;
    const last = out[out.length - 1];
    if (last && last.state === state) last.to = from + cal.stepMin;
    else out.push({ state, from, to: from + cal.stepMin });
  });
  return out;
}

/** The columns worth showing: from the first half-hour the sun is up in any month to the last. */
export function shownColumns(cal: ShadeCal): [number, number] {
  let a = cal.cols;
  let z = -1;
  for (const row of cal.cells) {
    row.forEach((c, i) => {
      if (c.night < c.n) {
        if (i < a) a = i;
        if (i > z) z = i;
      }
    });
  }
  return z < 0 ? [0, cal.cols - 1] : [a, z];
}
