// The shade calendar (2026-10-04): when in the day one spot gets direct sun, month by month.
import { describe, expect, it } from 'vitest';
import {
  CAL_SPOT,
  calendarSamples,
  cellShares,
  cellState,
  compassIndex,
  dayClock,
  dayPattern,
  lotCalendar,
  monthDays,
  monthRuns,
  shownColumns,
  spotCalendar,
  summarise,
  traceState,
  type CalCell,
  type MonthGroup,
  type ShadeCal,
} from '../shadecal';
import { cellWords, clockTime, groupSentences, monthName, monthsLabel, shadeLang, shadeT } from '../shadewords';
import shade from '../../../i18n/messages/en/shade.ts';
import { getT } from '../../../i18n/t.ts';
import { registerBundle } from '../../../i18n/registry.ts';
import { lotCalGrid, shadeCalJob, shadeCalKey } from '../shadecalrun';
import { spotMonthly } from '../sunperiod';
import { lotGrid, shadeBuildings, shadeCrowns, spotInputFor } from '../sunstudy';
import type { Crown, Prism } from '../sunhours';
import { buildLocalSite, type LocalSite } from '../localsite';
import { siteToLocal } from '../rect';
import type { SiteContext } from '../site';
import { decodeGrid } from '../terrain/grid';
import dover from '../fixtures/dover.json';
import doverElev from '../fixtures/dover.elevation.json';
import greenway from '../fixtures/greenway.json';
import greenwayElev from '../fixtures/greenway.elevation.json';
import { expectUnder, fastestMs } from '../../__tests__/timing';

const PHL = { lat: 39.9526, lng: -75.1652 };
const en = shadeT('en');
const open = (buildings: Prism[] = [], crowns: Crown[] = []) => spotCalendar({ point: [0, 0], buildings, crowns, ...PHL });
/** a long wall: x0..x1 × y0..y1, `h` ft tall */
const wall = (x0: number, y0: number, x1: number, y1: number, h: number): Prism => ({ ring: [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], heightFt: h });
const col = (cal: ShadeCal, minutes: number) => (minutes - cal.startMin) / cal.stepMin;
const at = (cal: ShadeCal, month: number, minutes: number) => cal.cells[month - 1]![col(cal, minutes)]!;
const dayCols = (cal: ShadeCal, month: number) => cal.cells[month - 1]!.map((c, i) => (cellState(c) === 'night' ? -1 : i)).filter((i) => i >= 0);
const H = (h: number, m = 0) => h * 60 + m;

const ctxOf = (f: typeof dover | typeof greenway, elev: typeof doverElev | typeof greenwayElev) =>
  ({ lot: f.lot, ...f.surroundings, source: 'fixture', terrain: { grid: decodeGrid(elev.grid as never), steepSlope: elev.steepSlope } }) as unknown as SiteContext;
const middle = (site: LocalSite) => siteToLocal(site.frame, [site.frame.lengthFt / 2, site.frame.widthFt / 2]);

describe('which moments are traced', () => {
  it('spreads the days through each month', () => {
    expect(monthDays(7, 8)).toEqual([2, 6, 10, 14, 18, 22, 26, 30]);
    expect(monthDays(2, 8)).toEqual([2, 6, 9, 13, 16, 20, 23, 27]);
    expect(monthDays(6, 4)).toEqual([4, 12, 19, 27]);
  });

  it('uses Philadelphia clock time with daylight saving (also on the days it switches)', () => {
    expect(dayClock(7, 15)(H(12)).toISOString()).toBe('2026-07-15T16:00:00.000Z'); // EDT
    expect(dayClock(1, 15)(H(12)).toISOString()).toBe('2026-01-15T17:00:00.000Z'); // EST
    // 2026: daylight saving starts Sunday March 8 and ends Sunday November 1, at 2 am
    expect(dayClock(3, 8)(H(6)).toISOString()).toBe('2026-03-08T10:00:00.000Z');
    expect(dayClock(3, 7)(H(6)).toISOString()).toBe('2026-03-07T11:00:00.000Z');
    expect(dayClock(11, 1)(H(6)).toISOString()).toBe('2026-11-01T11:00:00.000Z');
    expect(dayClock(10, 31)(H(6)).toISOString()).toBe('2026-10-31T10:00:00.000Z');
  });

  it('traces 24 moments per half-hour square, 5 am to 9 pm', () => {
    const cs = calendarSamples(PHL.lat, PHL.lng);
    expect(cs.cols).toBe(32);
    expect(cs.perCell).toBe(24);
    expect(cs.samples).toHaveLength(12 * 32 * 24);
    expect(cs.cell[0]).toBe(0);
    expect(cs.cell[cs.samples.length - 1]).toBe(12 * 32 - 1);
    // samples remember their month and leaf state (bare in January, in leaf in July)
    expect(cs.samples[0]!.month).toBe(1);
    expect(cs.samples[0]!.leaf).toBe(0);
    expect(cs.samples.find((s) => s.month === 7)!.leaf).toBe(1);
  });
});

describe('what each square is', () => {
  it('a trace is direct sun (1), a building (0), or through tree crowns (in between)', () => {
    expect(traceState(1)).toBe('sun');
    expect(traceState(0)).toBe('building');
    expect(traceState(0.4)).toBe('tree');
    expect(traceState(0.7)).toBe('tree');
    expect(traceState(0.16)).toBe('tree');
  });

  it('an open spot: direct sun whenever the sun is up, and the sun is down before sunrise', () => {
    const cal = open();
    for (const row of cal.cells) for (const c of row) expect(c.tree + c.building).toBe(0);
    // 5 am in January: the sun is below the horizon for every trace
    const jan5 = at(cal, 1, H(5));
    expect(jan5.night).toBe(jan5.n);
    expect(cellState(jan5)).toBe('night');
    expect(cellState(at(cal, 1, H(12)))).toBe('sun');
    expect(cellState(at(cal, 12, H(17, 30)))).toBe('night'); // after a December sunset (about 4:40 pm)
    expect(cellState(at(cal, 6, H(20)))).toBe('sun'); // a June evening (sunset about 8:30 pm)
    // a square the sun comes up during is part night, part sun
    const s = cellShares(at(cal, 6, H(5, 30)));
    expect(s.night).toBeGreaterThan(0);
    expect(s.sun).toBeGreaterThan(0);
    expect(s.sun + s.night).toBeCloseTo(1, 9);
  });

  it('clock times shift with daylight saving: midday is about 1 pm in July and noon in December', () => {
    const cal = open();
    const mid = (m: number) => {
      const d = dayCols(cal, m);
      return (cal.startMin + d[0]! * cal.stepMin + cal.startMin + (d[d.length - 1]! + 1) * cal.stepMin) / 2;
    };
    expect(Math.abs(mid(7) - H(13, 5))).toBeLessThanOrEqual(30);
    expect(Math.abs(mid(12) - H(12, 5))).toBeLessThanOrEqual(30);
    // and the June day is about 5½ hours longer than December's
    expect(dayCols(cal, 6).length - dayCols(cal, 12).length).toBeGreaterThanOrEqual(10);
  });

  it('only shows the half-hours the sun is up in some month', () => {
    const [a, z] = shownColumns(open());
    expect(a).toBe(1); // 5:30 am (sunrise mid-June ≈ 5:32)
    expect(z).toBe(30); // 8 pm–8:30 pm (sunset late June ≈ 8:33)
  });
});

describe('where the shade comes from', () => {
  it('a tall wall to the west: sunny mornings, building shade in the afternoon, from the west', () => {
    const cal = open([wall(-8, -300, -6, 300, 60)]);
    const c = at(cal, 6, H(17));
    expect(cellState(c)).toBe('building');
    expect(compassIndex(c.bE, c.bN)).toBe(6);
    expect(cellState(at(cal, 6, H(10)))).toBe('sun');
    const d = dayPattern(cal, 5)!;
    expect(d.type).toBe('sun');
    expect(d.fromSunrise).toBe(true);
    expect(d.toSunset).toBe(false);
    expect(d.after).toMatchObject({ kind: 'building', dir: 6 });
    expect(d.before).toBeNull();
  });

  it('a tree crown to the east: dappled mornings, from the east', () => {
    const cal = open([], [{ x: 30, y: 0, z: 14, r: 14 }]);
    const c = at(cal, 3, H(8));
    expect(cellState(c)).toBe('tree');
    expect(compassIndex(c.tE, c.tN)).toBe(2);
    // bare branches in March let 70% through, leaves in July 40%
    expect(c.light / (c.n - c.night)).toBeCloseTo(0.7, 1);
    const jul = at(cal, 7, H(7, 30));
    expect(cellState(jul)).toBe('tree');
    expect(jul.light / (jul.n - jul.night)).toBeCloseTo(0.4, 1);
    const d = dayPattern(cal, 2)!;
    expect(d.before).toMatchObject({ kind: 'tree', dir: 2 });
  });

  it('a tall row of buildings to the south: no winter sun at all, and the summary says so', () => {
    const cal = open([wall(-300, -40, 300, -10, 45)]);
    const dec = dayPattern(cal, 11)!;
    expect(dec.type).toBe('none');
    expect(dec.allDay).toMatchObject({ kind: 'building', dir: 4 });
    expect(dayPattern(cal, 5)!.type).toBe('sun'); // the high June sun clears them at midday
    const groups = summarise(cal);
    // the winter group runs over the new year
    const winter = groups.find((g) => g.months.includes(1))!;
    expect(winter.day.type).toBe('none');
    expect(winter.months).toContain(12);
    expect(winter.months.indexOf(12)).toBeLessThan(winter.months.indexOf(1));
    expect(groups.flatMap((g) => g.months).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it('buildings and trees together are "mixed"', () => {
    // a low wall to the west takes the low evening sun, a big tree beyond it the afternoon sun
    const cal = open([wall(-20, -300, -18, 300, 12)], [{ x: -40, y: 0, z: 45, r: 20 }]);
    const d = dayPattern(cal, 6)!;
    expect(d.after?.kind).toBe('mixed');
    expect(d.after?.dir).toBe(6);
  });
});

describe('the summary in words (English)', () => {
  const day = (over: Partial<MonthGroup['day']>): MonthGroup['day'] => ({
    type: 'sun',
    windows: [[H(9), H(15)]],
    fromSunrise: false,
    toSunset: false,
    before: null,
    between: null,
    after: null,
    allDay: null,
    ...over,
  });
  const from = (kind: 'building' | 'tree' | 'mixed', dir: number) => ({ kind, dir, b: 1, t: 0, e: 0, nn: 0 });

  it('labels a group of months', () => {
    expect(monthsLabel(en, [6, 7, 8])).toBe('June to August');
    expect(monthsLabel(en, [11, 12, 1, 2])).toBe('November to February');
    expect(monthsLabel(en, [4, 5])).toBe('April and May');
    expect(monthsLabel(en, [9])).toBe('September');
    expect(monthsLabel(en, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])).toBe('All year');
  });

  it('says when the sun comes and what shades the spot, from which side', () => {
    expect(groupSentences(en, { months: [6, 7, 8], day: day({ after: from('building', 6) }) })).toBe(
      'Direct sun from about 9 AM to 3 PM. After that, shade from the buildings to the west.',
    );
    expect(groupSentences(en, { months: [11, 12, 1, 2], day: day({ type: 'none', windows: [], allDay: from('building', 4) }) })).toBe(
      'No direct sun: the buildings to the south block it all day.',
    );
    expect(groupSentences(en, { months: [5], day: day({ windows: [[H(8, 30), H(12)]], fromSunrise: true, before: null, after: from('tree', 5) }) })).toBe(
      'Direct sun from sunrise to about 12 PM. After that, dappled shade from trees to the southwest.',
    );
    expect(
      groupSentences(en, {
        months: [6],
        day: day({ windows: [[H(8), H(13)], [H(16), H(18)]], before: from('building', 2), between: from('mixed', 4), after: from('building', 6) }),
      }),
    ).toBe(
      'Direct sun from about 8 AM to 1 PM, and again from about 4 PM to 6 PM. Before that, shade from the buildings to the east. ' +
        'In between, shade from buildings and trees to the south. After that, shade from the buildings to the west.',
    );
    expect(groupSentences(en, { months: [7], day: day({ fromSunrise: true, toSunset: true }) })).toBe('Direct sun from sunrise to sunset.');
    expect(groupSentences(en, { months: [7], day: day({ windows: [[H(10, 30), H(20)]], toSunset: true }) })).toBe('Direct sun from about 10:30 AM until sunset.');
  });

  it('describes one square', () => {
    const cal = open([wall(-8, -300, -6, 300, 60)]);
    expect(cellWords(en, cal, 1, col(cal, H(5)))).toBe('January, 5 AM to 5:30 AM: the sun is down.');
    expect(cellWords(en, cal, 6, col(cal, H(10)))).toBe('June, 10 AM to 10:30 AM: direct sun 100% of the time.');
    expect(cellWords(en, cal, 6, col(cal, H(17)))).toBe('June, 5 PM to 5:30 PM: shade from the buildings to the west 100% of the time.');
  });

  it('writes months and times the language\'s own way', () => {
    expect(clockTime(en, H(15, 30))).toBe('3:30 PM');
    expect(clockTime(en, H(9))).toBe('9 AM');
    expect(monthName(getT('es', shade), 6)).toBe('junio');
    expect(monthName(getT('fr', shade), 1, 'short')).toBe('janv.');
    expect(clockTime(getT('ru', shade), H(15, 30))).toBe('15:30');
    // Haitian Creole: Intl has no data, so the names from locales.ts and a 24-hour clock
    expect(monthName(getT('ht', shade), 7)).toBe('jiyè');
    expect(clockTime(getT('ht', shade), H(15))).toBe('15:00');
  });

  it('stays all English (month names and times too) until the area is translated, then follows the language', () => {
    expect(shadeT('ar').locale).toBe('en');
    expect(shadeLang(shadeT('ar'))).toEqual({ lang: 'en', dir: 'ltr' });
    registerBundle('ar', { msgs: { shade: { 'months.range': 'من {from} إلى {to}' } }, data: {} });
    try {
      const ar = shadeT('ar');
      expect(ar.locale).toBe('ar');
      expect(shadeLang(ar)).toEqual({ lang: 'ar', dir: 'rtl' });
      // inserted values are isolated on right-to-left pages (src/i18n/format.ts interpolate)
      expect(monthsLabel(ar, [10, 11, 12])).toBe('من \u2068أكتوبر\u2069 إلى \u2068ديسمبر\u2069');
    } finally {
      delete globalThis.__PIAT_I18N__!.ar!.msgs.shade;
    }
  });
});

describe('the demo lots', () => {
  const doverSite = buildLocalSite(ctxOf(dover, doverElev));
  const greenSite = buildLocalSite(ctxOf(greenway, greenwayElev));
  // each lot's middle worked out once for all the tests below (keeps this file light: other files time themselves)
  const cals = new Map<LocalSite, ShadeCal>();
  const middleCal = (site: LocalSite) => {
    let c = cals.get(site);
    if (!c) cals.set(site, (c = spotCalendar(spotInputFor(site, [], middle(site)))));
    return c;
  };

  it('1322 N Dover St (narrow, between rowhouses): no direct sun in the middle of the lot from November to February', () => {
    const cal = middleCal(doverSite);
    for (const m of [11, 12, 1, 2]) {
      const d = dayPattern(cal, m - 1)!;
      expect(d.type).toBe('none');
      expect(d.allDay?.kind).toBe('building');
    }
    expect(dayPattern(cal, 5)!.type).not.toBe('none');
    const winter = summarise(cal).find((g) => g.months.includes(1))!;
    expect(groupSentences(en, winter)).toMatch(/^No direct sun: the buildings to the (south|southeast|southwest) block it all day\.$/);
  });

  it('2061 S 60th St (corner lot): direct sun in the middle of the lot every month', () => {
    const cal = middleCal(greenSite);
    for (let m = 0; m < 12; m++) expect(dayPattern(cal, m)!.type).not.toBe('none');
    expect(monthRuns(cal, 0).some((r) => r.state === 'sun' && r.to - r.from >= 5 * 60)).toBe(true);
  });

  it('agrees with the spot chart (same blocking model): hours of direct sun a day, month by month', () => {
    const cal = middleCal(doverSite);
    const chart = spotMonthly(spotInputFor(doverSite, [], middle(doverSite)));
    cal.cells.forEach((row, m) => {
      const hours = row.reduce((a, c: CalCell) => a + (c.light / c.n) * (cal.stepMin / 60), 0);
      expect(Math.abs(hours - chart[m]!.sunHours)).toBeLessThan(0.5);
    });
  });

  it('is quick enough to work out on a click (well under 300 ms once the place is known)', () => {
    middleCal(greenSite); // the place's sun positions are known now
    const input = spotInputFor(greenSite, [], middle(greenSite));
    // aim: under 300 ms; the fastest of a few runs, against a ceiling a busy machine still meets
    const ms = fastestMs((i) => spotCalendar({ ...input, point: [input.point[0] + 3 + i * 0.5, input.point[1]] }), 300);
    expectUnder(ms, 900);
  });

  it('the whole lot: share of the lot in direct sun per square, in a few seconds', () => {
    const t0 = performance.now();
    const grid = lotCalGrid(doverSite);
    const fine = lotGrid(doverSite);
    expect(grid.cellFt).toBe(2);
    const count = (m?: Uint8Array) => m!.reduce((a, v) => a + v, 0);
    expect(count(grid.mask) / count(fine.mask)).toBeGreaterThan(0.2);
    expect(count(grid.mask) / count(fine.mask)).toBeLessThan(0.3);
    const cal = lotCalendar({ grid, buildings: shadeBuildings(doverSite), crowns: shadeCrowns(doverSite), ...PHL });
    expectUnder(performance.now() - t0, 5000);
    expect(cal.kind).toBe('lot');
    const share = (m: number, min: number) => {
      const c = at(cal, m, min);
      return c.light / (c.n - c.night);
    };
    expect(share(6, H(12))).toBeGreaterThan(share(12, H(12)));
    expect(share(12, H(12))).toBeLessThan(0.2);
    // an open lot is all in sun
    const flat = lotCalendar({ grid: { origin: [0, 0], ux: [1, 0], uy: [0, 1], cellFt: 2, nx: 5, ny: 5 }, buildings: [], crowns: [], ...PHL });
    for (const row of flat.cells) for (const c of row) if (c.night < c.n) expect(c.light / (c.n - c.night)).toBeCloseTo(1, 6);
  });

  it('caches by spot and trees, and sends the worker plain data', () => {
    const p = middle(doverSite);
    expect(shadeCalKey(doverSite, [], 'spot', p)).toBe(shadeCalKey(doverSite, undefined, 'spot', [p[0] + 0.01, p[1]]));
    expect(shadeCalKey(doverSite, [], 'spot', p)).not.toBe(shadeCalKey(doverSite, [], 'spot', [p[0] + 1, p[1]]));
    expect(shadeCalKey(doverSite, [], 'lot', p)).toBe(shadeCalKey(doverSite, [], 'lot', [0, 0]));
    const job = shadeCalJob(doverSite, [], 'spot', p);
    expect(() => structuredClone(job)).not.toThrow();
    expect(job.kind === 'spot' && job.input.buildings.length).toBe(shadeBuildings(doverSite).length);
    expect(CAL_SPOT.offsets).toHaveLength(3);
  });
});
