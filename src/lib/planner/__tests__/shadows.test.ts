// Shadows workstream (2026-10-04): leaf seasons, evergreens, periods, slopes, one spot's year.
import { describe, expect, it } from 'vitest';
import { seasonSamples, DEFAULT_SEASON } from '../sun';
import { computeSunHours, hoursAt, BARE_CROWN_BLOCKING, CROWN_BLOCKING, type Crown, type GridSpec, type Prism } from '../sunhours';
import { autumnTint, crownCenterFt, existingTreeLook, leafFraction, leafWords, treeLook } from '../treemodel';
import { MONTHS, parsePeriodKey, periodKey, periodLabel, periodOptions, periodSamples, spotMonthly, type SunPeriod } from '../sunperiod';
import { crownsKey, lotGrid, shadeCrowns, spotMonthlyFor } from '../sunstudy';
import { buildLocalSite, type LocalSite } from '../localsite';
import type { SiteContext } from '../site';
import type { ExistingItem } from '../../types';
import dover from '../fixtures/dover.json';
import greenway from '../fixtures/greenway.json';

const PHL = { lat: 39.9526, lng: -75.1652 };
const ctx = (f: typeof dover | typeof greenway) => ({ lot: f.lot, ...f.surroundings, source: 'fixture' }) as unknown as SiteContext;
const daylightOf = (s: { samples: { altitudeDeg: number; weight: number }[]; days: number }) =>
  s.samples.filter((x) => x.altitudeDeg > 0.5).reduce((a, x) => a + x.weight, 0) / s.days;

describe('leaf season (Philadelphia)', () => {
  it('deciduous trees are bare in winter and in full leaf in summer', () => {
    expect(leafFraction(1, 15)).toBe(0);
    expect(leafFraction(3, 31)).toBe(0);
    expect(leafFraction(5, 1)).toBe(1);
    expect(leafFraction(7, 4)).toBe(1);
    expect(leafFraction(10, 24)).toBe(1);
    expect(leafFraction(11, 20)).toBe(0);
    expect(leafFraction(12, 21)).toBe(0);
  });
  it('leaves come out across April and fall across November, about half-way mid-month', () => {
    expect(leafFraction(4, 15)).toBeGreaterThan(0.4);
    expect(leafFraction(4, 15)).toBeLessThan(0.55);
    expect(leafFraction(11, 7)).toBeGreaterThan(0.4);
    expect(leafFraction(11, 7)).toBeLessThan(0.6);
    // monotonic through each window
    let prev = -1;
    for (let d = 1; d <= 30; d++) {
      const f = leafFraction(4, d);
      expect(f).toBeGreaterThanOrEqual(prev);
      prev = f;
    }
  });
  it('fall colour only around late October, and plain words for each phase', () => {
    expect(autumnTint(7, 1)).toBe(0);
    expect(autumnTint(10, 30)).toBe(1);
    expect(autumnTint(1, 10)).toBe(0);
    expect(leafWords(7, 1)).toMatch(/in leaf/);
    expect(leafWords(1, 10)).toMatch(/bare/);
    expect(leafWords(4, 15)).toMatch(/coming out/);
    expect(leafWords(11, 8)).toMatch(/falling/);
  });
  it('every growing-season and period sample carries its day\'s leaf state', () => {
    const g = seasonSamples(PHL.lat, PHL.lng);
    expect(g.samples.every((s) => typeof s.leaf === 'number' && s.month! >= 4 && s.month! <= 10)).toBe(true);
    const jan = periodSamples(PHL.lat, PHL.lng, { kind: 'month', month: 1 });
    expect(jan.samples.every((s) => s.leaf === 0)).toBe(true);
    const jul = periodSamples(PHL.lat, PHL.lng, { kind: 'month', month: 7 });
    expect(jul.samples.every((s) => s.leaf === 1)).toBe(true);
  });
});

describe('evergreen or deciduous, from the City tree inventory', () => {
  const cases: [string | null | undefined, boolean, boolean][] = [
    // live ppr_tree_inventory_2025 names: "GENUS SPECIES - COMMON NAME"
    ['PINUS STROBUS - EASTERN WHITE PINE', true, true],
    ['PICEA SPECIES - NORWAY SPRUCE', true, true],
    ['JUNIPERUS VIRGINIANA - EASTERN REDCEDAR', true, true],
    ['THUJA OCCIDENTALIS - ARBORVITAE', true, true],
    ['TSUGA CANADENSIS - EASTERN HEMLOCK', true, true],
    ['ILEX OPACA - AMERICAN HOLLY', true, false],
    ['MAGNOLIA GRANDIFLORA - SOUTHERN MAGNOLIA', true, false],
    ['PRUNUS CAROLINIANA - LAUREL CHERRY', true, false],
    ['MAGNOLIA SOULANGIANA - SAUCER MAGNOLIA', false, false],
    ['PLATANUS X ACERIFOLIA - LONDON PLANETREE', false, false],
    ['ACER RUBRUM - RED MAPLE', false, false],
    // needle trees that drop their needles
    ['TAXODIUM DISTICHUM - BALDCYPRESS', false, true],
    ['METASEQUOIA GLYPTOSTROBOIDES - DAWN REDWOOD', false, true],
    ['LARIX DECIDUA - COMMON LARCH', false, true],
    // "cedar" in the genus but not a cedar
    ['CEDRELLA SINENSIS - CHINESE TOON', false, false],
    ['ACER TRIFLORUM – THREE FLOWERED MAPLE', false, false],
    // plain common names (the demo fixtures)
    ['Eastern White Pine', true, true],
    ['Bald Cypress', false, true],
    ['American Holly', true, false],
    ['Crimson King Norway Maple', false, false],
    ['Pin Oak', false, false],
    ['Amur Maple', false, false],
    // unknown
    ['UNKNOWN UNKNOWN - UNKNOWN', false, false],
    ['', false, false],
    [null, false, false],
    [undefined, false, false],
  ];
  it.each(cases)('%s', (name, evergreen, conifer) => {
    expect(treeLook(name)).toEqual({ evergreen, conifer });
  });
  it('the person\'s choice wins for trees on the lot; trees added by hand default to deciduous', () => {
    expect(existingTreeLook({})).toEqual({ evergreen: false, conifer: false });
    expect(existingTreeLook({ leafHabit: 'evergreen' })).toEqual({ evergreen: true, conifer: true });
    expect(existingTreeLook({ species: 'ILEX OPACA - AMERICAN HOLLY', leafHabit: 'evergreen' })).toEqual({ evergreen: true, conifer: false });
    expect(existingTreeLook({ species: 'PINUS STROBUS - EASTERN WHITE PINE', leafHabit: 'deciduous' })).toEqual({ evergreen: false, conifer: false });
    expect(existingTreeLook({ species: 'PINUS STROBUS - EASTERN WHITE PINE' })).toEqual({ evergreen: true, conifer: true });
  });
});

describe('seasonal crown blocking', () => {
  const grid: GridSpec = { origin: [-2, -2], ux: [1, 0], uy: [0, 1], cellFt: 4, nx: 1, ny: 1 };
  // a huge crown overhead: every ray passes through it
  const big = (evergreen = false): Crown => ({ x: 0, y: 0, z: 30, r: 500, ...(evergreen ? { evergreen } : {}) });
  const run = (p: SunPeriod, crowns: Crown[]) => {
    const s = periodSamples(PHL.lat, PHL.lng, p);
    return { h: computeSunHours({ grid, buildings: [], crowns, ...s })[0]!, daylight: daylightOf(s) };
  };
  it('a bare deciduous crown blocks 30% in January; in leaf it blocks 60% in July', () => {
    const jan = run({ kind: 'month', month: 1 }, [big()]);
    expect(jan.h).toBeCloseTo(jan.daylight * (1 - BARE_CROWN_BLOCKING), 3);
    const jul = run({ kind: 'month', month: 7 }, [big()]);
    expect(jul.h).toBeCloseTo(jul.daylight * (1 - CROWN_BLOCKING), 3);
  });
  it('an evergreen blocks 60% all year', () => {
    for (const month of [1, 4, 7, 11]) {
      const r = run({ kind: 'month', month }, [big(true)]);
      expect(r.h).toBeCloseTo(r.daylight * (1 - CROWN_BLOCKING), 3);
    }
  });
  it('in the growing season a deciduous crown blocks a little less than 60% (the leaves are still coming out on Apr 15 and 25)', () => {
    const r = run({ kind: 'growing' }, [big()]);
    const blocked = 1 - r.h / r.daylight;
    expect(blocked).toBeLessThan(CROWN_BLOCKING);
    expect(blocked).toBeGreaterThan(CROWN_BLOCKING - 0.02);
  });
  it('samples without a leaf state still count crowns as in leaf (as before)', () => {
    const s = seasonSamples(PHL.lat, PHL.lng);
    const plain = s.samples.map(({ altitudeDeg, azimuthDeg, weight }) => ({ altitudeDeg, azimuthDeg, weight }));
    const h = computeSunHours({ grid, buildings: [], crowns: [big()], samples: plain, days: s.days })[0]!;
    expect(h).toBeCloseTo(daylightOf(s) * 0.4, 3);
  });
});

describe('periods', () => {
  it('has a key, a label and a sampling plan for every period', () => {
    const ps: SunPeriod[] = [
      { kind: 'growing' },
      { kind: 'year' },
      { kind: 'season', season: 'winter' },
      { kind: 'month', month: 6 },
      { kind: 'day', month: 6, day: 21 },
    ];
    for (const p of ps) expect(parsePeriodKey(periodKey(p))).toEqual(p);
    expect(periodLabel({ kind: 'growing' })).toBe('the growing season (Apr 15 – Oct 15)');
    expect(periodLabel({ kind: 'season', season: 'winter' })).toBe('winter (Dec 21 – Mar 19)');
    expect(periodLabel({ kind: 'month', month: 2 })).toBe('February');
    expect(periodLabel({ kind: 'day', month: 6, day: 21 })).toBe('Jun 21');
    expect(periodOptions({ kind: 'growing' })).toBe(DEFAULT_SEASON);
    expect(parsePeriodKey('nonsense')).toEqual({ kind: 'growing' });
  });
  it('the growing season period is exactly the saved study\'s sampling', () => {
    const a = periodSamples(PHL.lat, PHL.lng, { kind: 'growing' });
    const b = seasonSamples(PHL.lat, PHL.lng);
    expect(a.days).toBe(b.days);
    expect(a.samples).toEqual(b.samples);
  });
  it('samples the right days: a month, a season that runs past New Year, the whole year, one day', () => {
    const june = periodSamples(PHL.lat, PHL.lng, { kind: 'month', month: 6 });
    expect(june.days).toBe(10); // Jun 1, 4, … 28
    expect(june.samples.every((s) => s.month === 6)).toBe(true);
    expect(daylightOf(june)).toBeGreaterThan(14.5);
    const winter = periodSamples(PHL.lat, PHL.lng, { kind: 'season', season: 'winter' });
    const months = new Set(winter.samples.map((s) => s.month));
    expect([...months].sort((a, b) => a! - b!)).toEqual([1, 2, 3, 12]);
    expect(daylightOf(winter)).toBeLessThan(11);
    const year = periodSamples(PHL.lat, PHL.lng, { kind: 'year' });
    expect(year.days).toBe(37);
    expect(daylightOf(year)).toBeGreaterThan(11.6);
    expect(daylightOf(year)).toBeLessThan(12.6);
    const day = periodSamples(PHL.lat, PHL.lng, { kind: 'day', month: 12, day: 21 });
    expect(day.days).toBe(1);
    expect(daylightOf(day)).toBeGreaterThan(9);
    expect(daylightOf(day)).toBeLessThan(9.6);
  });
});

describe('slopes (ground heights)', () => {
  // 40 ft tall east-west wall at y = 0..2, sun from the south: cells north of it are in its shadow
  const wall: Prism = { ring: [[-100, 0], [100, 0], [100, 2], [-100, 2]], heightFt: 40 };
  const grid: GridSpec = { origin: [-20, -20], ux: [1, 0], uy: [0, 1], cellFt: 2, nx: 20, ny: 20 };
  const season = seasonSamples(PHL.lat, PHL.lng);
  const groundGrid = (g: (x: number, y: number) => number): GridSpec => {
    const groundFt = new Float32Array(grid.nx * grid.ny);
    for (let j = 0; j < grid.ny; j++) for (let i = 0; i < grid.nx; i++) groundFt[j * grid.nx + i] = g(-20 + (i + 0.5) * 2, -20 + (j + 0.5) * 2);
    return { ...grid, groundFt };
  };
  const at = (spec: GridSpec, h: Float32Array, x: number, y: number) => hoursAt(spec, h, [x, y]);

  it('flat ground data gives exactly the same answer as no ground data', () => {
    const none = computeSunHours({ grid, buildings: [wall], crowns: [{ x: 0, y: 12, z: 20, r: 6 }], ...season });
    const flat = computeSunHours({ grid: groundGrid(() => 0), buildings: [{ ...wall, baseFt: 0 }], crowns: [{ x: 0, y: 12, z: 20, r: 6 }], ...season });
    expect(Array.from(flat)).toEqual(Array.from(none));
  });
  it('a cell uphill of a wall gets more sun than the same cell on flat ground', () => {
    const flat = computeSunHours({ grid, buildings: [wall], crowns: [], ...season });
    // ground rising to the north, 1 ft per 4 ft; the wall stands on the ground at y = 0
    const up = groundGrid((_x, y) => Math.max(0, y) * 0.25);
    const hilly = computeSunHours({ grid: up, buildings: [wall], crowns: [], ...season });
    expect(at(up, hilly, 0, 9)).toBeGreaterThan(at(grid, flat, 0, 9) + 0.1);
    expect(at(up, hilly, 0, 15)).toBeGreaterThan(at(grid, flat, 0, 15) + 0.1);
    // south of the wall nothing changes
    expect(at(up, hilly, 0, -9)).toBeCloseTo(at(grid, flat, 0, -9), 5);
  });
  it('a cell downhill of a wall gets less sun', () => {
    const flat = computeSunHours({ grid, buildings: [wall], crowns: [], ...season });
    const down = groundGrid((_x, y) => -Math.max(0, y) * 0.25);
    const h = computeSunHours({ grid: down, buildings: [wall], crowns: [], ...season });
    expect(at(down, h, 0, 15)).toBeLessThan(at(grid, flat, 0, 15) - 0.1);
  });
  it('a building standing on higher ground (baseFt) throws a longer shadow', () => {
    const flat = computeSunHours({ grid, buildings: [wall], crowns: [], ...season });
    const raised = computeSunHours({ grid, buildings: [{ ...wall, baseFt: 6 }], crowns: [], ...season });
    expect(at(grid, raised, 0, 15)).toBeLessThan(at(grid, flat, 0, 15) - 0.1);
  });
  it('a roof below the cell no longer shades it', () => {
    const low: Prism = { ...wall, heightFt: 10 };
    const up = groundGrid(() => 12); // the whole grid sits on a 12 ft rise above the wall's ground
    const h = computeSunHours({ grid: up, buildings: [low], crowns: [], ...season });
    const open = computeSunHours({ grid, buildings: [], crowns: [], ...season });
    expect(at(up, h, 0, 9)).toBeCloseTo(at(grid, open, 0, 9), 5);
  });
});

describe('trees and slopes on a real lot', () => {
  const site = buildLocalSite(ctx(dover));
  it('with no ground data the lot grid and crowns are as before', () => {
    expect(lotGrid(site).groundFt).toBeUndefined();
    const crowns = shadeCrowns(site);
    for (const c of crowns) {
      const t = site.trees.find((x) => x.x === c.x && x.y === c.y)!;
      expect(c.z).toBe(Math.max(t.crownR + 4, t.heightFt - t.crownR));
      expect(c.z).toBe(crownCenterFt(t.heightFt, t.crownR));
    }
  });
  it('crowns and grid cells follow a sloped ground', () => {
    const sloped: LocalSite = { ...site, ground: (x) => 0.05 * x };
    const g = lotGrid(sloped);
    expect(g.groundFt).toBeInstanceOf(Float32Array);
    const k = g.mask!.findIndex((m) => m === 1);
    const i = k % g.nx;
    const j = Math.floor(k / g.nx);
    const cx = g.origin[0] + (i + 0.5) * g.cellFt * g.ux[0] + (j + 0.5) * g.cellFt * g.uy[0];
    expect(g.groundFt![k]).toBeCloseTo(0.05 * cx, 4);
    const flat = shadeCrowns(site);
    const up = shadeCrowns(sloped);
    up.forEach((c, n) => expect(c.z - flat[n]!.z).toBeCloseTo(0.05 * c.x, 6));
  });
  it('kept trees on the lot use the person\'s evergreen choice, and it marks the study out of date', () => {
    const tree: ExistingItem = { id: 't1', element: 'existing-tree', x: 0, y: 0, rotationDeg: 0, lngLat: site.lf.toLngLat([0, 0]), radiusFt: 8, keep: true, origin: 'person' };
    const dec = shadeCrowns(site, [tree]);
    const ever = shadeCrowns(site, [{ ...tree, leafHabit: 'evergreen' }]);
    expect(dec.at(-1)!.evergreen).toBeUndefined();
    expect(ever.at(-1)!.evergreen).toBe(true);
    expect(crownsKey(dec)).not.toBe(crownsKey(ever));
    // all-deciduous sets key exactly as they did before
    expect(crownsKey(dec)).toBe(crownsKey(dec.map(({ evergreen: _e, ...c }) => c)));
  });
});

describe('one spot through the year', () => {
  it('an open spot gets every daylight hour, more in June than in December', () => {
    const m = spotMonthly({ point: [0, 0], buildings: [], crowns: [], ...PHL });
    expect(m).toHaveLength(12);
    expect(m.map((x) => x.month)).toEqual(MONTHS.map((_, i) => i + 1));
    for (const x of m) expect(x.sunHours).toBeCloseTo(x.daylightHours, 3);
    expect(m[5]!.sunHours).toBeGreaterThan(14.5);
    expect(m[11]!.sunHours).toBeLessThan(9.8);
  });
  it('north of a tall wall the spot loses the low winter sun first', () => {
    const wall: Prism = { ring: [[-100, 0], [100, 0], [100, 2], [-100, 2]], heightFt: 40 };
    const m = spotMonthly({ point: [0, 15], buildings: [wall], crowns: [], ...PHL });
    const share = m.map((x) => x.sunHours / x.daylightHours);
    expect(share[11]!).toBeLessThan(share[5]! - 0.2);
    expect(m[11]!.sunHours).toBeLessThan(m[5]!.sunHours);
  });
  it('a deciduous tree overhead takes more sun in summer than in winter; an evergreen the same share all year', () => {
    const dec = spotMonthly({ point: [0, 0], buildings: [], crowns: [{ x: 0, y: 0, z: 30, r: 500 }], ...PHL });
    expect(dec[0]!.sunHours / dec[0]!.daylightHours).toBeCloseTo(0.7, 3);
    expect(dec[6]!.sunHours / dec[6]!.daylightHours).toBeCloseTo(0.4, 3);
    const ever = spotMonthly({ point: [0, 0], buildings: [], crowns: [{ x: 0, y: 0, z: 30, r: 500, evergreen: true }], ...PHL });
    for (const x of ever) expect(x.sunHours / x.daylightHours).toBeCloseTo(0.4, 3);
  });
  it('matches the map for that month at that cell', () => {
    const wall: Prism = { ring: [[-100, 0], [100, 0], [100, 2], [-100, 2]], heightFt: 40 };
    const grid: GridSpec = { origin: [-0.5, 9.5], ux: [1, 0], uy: [0, 1], cellFt: 1, nx: 1, ny: 1 };
    const spot = spotMonthly({ point: [0, 10], buildings: [wall], crowns: [], ...PHL });
    // the spot uses every 4th day; a month map uses every 3rd: close, not identical
    const map = computeSunHours({ grid, buildings: [wall], crowns: [], ...periodSamples(PHL.lat, PHL.lng, { kind: 'month', month: 3 }) })[0]!;
    expect(spot[2]!.sunHours).toBeCloseTo(map, 0);
  });
  it('is quick enough to run on a click on a real lot', () => {
    const site = buildLocalSite(ctx(greenway));
    spotMonthlyFor(site, [], [0, 0]); // warm the per-place sample cache
    const t0 = performance.now();
    const m = spotMonthlyFor(site, [], [0, 0]);
    const ms = performance.now() - t0;
    expect(m).toHaveLength(12);
    expect(ms).toBeLessThan(250);
  });
});
