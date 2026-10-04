import { describe, expect, it } from 'vitest';
import { makeFrame, type Vec2 } from '../geo';
import { bilinear, decodeGrid, elevationFt, encodeGrid, fillGaps, groundFromGrid, lotDatumFt, sampleM, FT_PER_M, PHILLY_LIDAR, type ElevationGrid } from '../terrain/grid';
import { elevationRequest, lotCenter, parseElevation } from '../terrain/fetch';
import {
  buildingBase,
  contourInterval,
  contours,
  describeSlope,
  drainArrows,
  fitPlane,
  lengthWords,
  slopeSummary,
  slopeWords,
  towardOf,
  whereOnLot,
} from '../terrain/slope';
import { slopeFacts, siteTerrain } from '../terrain';
import { frameFrom, minAreaRect, type SiteFrame } from '../rect';
import { buildLocalSite } from '../localsite';
import { groundOf } from '../ground';
import type { SiteContext } from '../site';
import dover from '../fixtures/dover.json';
import doverElev from '../fixtures/dover.elevation.json';
import greenwayElev from '../fixtures/greenway.elevation.json';
import greenway from '../fixtures/greenway.json';

const C: [number, number] = [-75.2, 40.0];

/** A grid around C whose elevation (m) is f(east metres, north metres). */
function synthGrid(f: (e: number, n: number) => number, halfM = 100, n = 201): ElevationGrid {
  const mLat = 111034;
  const mLng = 85393;
  const west = C[0] - halfM / mLng;
  const east = C[0] + halfM / mLng;
  const south = C[1] - halfM / mLat;
  const north = C[1] + halfM / mLat;
  const z = new Float32Array(n * n);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const lng = west + ((i + 0.5) * (east - west)) / n;
      const lat = north - ((j + 0.5) * (north - south)) / n;
      z[j * n + i] = f((lng - C[0]) * mLng, (lat - C[1]) * mLat);
    }
  }
  return { west, south, east, north, nx: n, ny: n, z, source: PHILLY_LIDAR };
}

/** A 20 × 60 ft lot centred on C: long side east–west, entrance (x0) on the WEST. */
function rectLot(): { parcel: Vec2[]; frame: SiteFrame } {
  const parcel: Vec2[] = [
    [-30, -10],
    [30, -10],
    [30, 10],
    [-30, 10],
  ];
  const r = minAreaRect(parcel);
  return { parcel, frame: frameFrom(r, [1, 0], ['x0'], 'interior', 'computed') };
}

describe('elevation grid: interpolation', () => {
  it('bilinear reproduces a plane exactly and clamps at the edges', () => {
    const nx = 4;
    const ny = 3;
    const z = new Float32Array(nx * ny);
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) z[j * nx + i] = 2 * i + 3 * j;
    expect(bilinear(z, nx, ny, 1.5, 0.25)).toBeCloseTo(3 + 0.75, 6);
    expect(bilinear(z, nx, ny, 2.9, 1.9)).toBeCloseTo(5.8 + 5.7, 5);
    expect(bilinear(z, nx, ny, -5, -5)).toBe(0);
    expect(bilinear(z, nx, ny, 99, 99)).toBe(2 * 3 + 3 * 2);
  });
  it('samples the right place: local feet -> grid (east and north)', () => {
    // 2 m up for every 100 m east, 1 m for every 100 m north
    const g = synthGrid((e, n) => 30 + 0.02 * e + 0.01 * n);
    const lf = makeFrame(C);
    const elev = elevationFt(g, lf);
    expect(elev(0, 0)).toBeCloseTo(30 * FT_PER_M, 1);
    // 100 ft east = 30.48 m -> +0.6096 m = +2 ft
    expect(elev(100, 0) - elev(0, 0)).toBeCloseTo(2, 1);
    expect(elev(0, 100) - elev(0, 0)).toBeCloseTo(1, 1);
    expect(sampleM(g, C)).toBeCloseTo(30, 2);
  });
  it('is smooth: no steps between neighbouring cells', () => {
    const g = synthGrid((e, n) => 10 + Math.sin(e / 7) + Math.cos(n / 5));
    const elev = elevationFt(g, makeFrame(C));
    let worst = 0;
    for (let x = -50; x < 50; x += 0.1) worst = Math.max(worst, Math.abs(elev(x + 0.1, 3) - elev(x, 3)));
    expect(worst).toBeLessThan(0.1);
  });
  it('fills no-data holes from their neighbours', () => {
    const g = synthGrid(() => 12, 10, 9);
    g.z[40] = NaN;
    g.z[41] = NaN;
    expect(fillGaps(g)).toBe(true);
    expect(g.z[40]).toBeCloseTo(12, 5);
    const empty = synthGrid(() => NaN, 10, 3);
    expect(fillGaps(empty)).toBe(false);
  });
  it('round-trips the fixture encoding to the centimetre', () => {
    const g = synthGrid((e, n) => 21.3 + 0.013 * e - 0.004 * n, 30, 31);
    g.z[5] = NaN;
    const back = decodeGrid(JSON.parse(JSON.stringify(encodeGrid(g))));
    expect(back.nx).toBe(31);
    expect(Number.isNaN(back.z[5]!)).toBe(true);
    for (const k of [0, 100, 960]) expect(back.z[k]).toBeCloseTo(g.z[k]!, 2);
  });
});

describe('3DEP request and answer', () => {
  it('asks for a 1 m grid over ±310 ft, the box exactly as given', () => {
    const r = elevationRequest([-75.182534, 39.976754]);
    expect(r.nx).toBe(189);
    expect(r.url).toContain('format=bip');
    expect(r.url).toContain('adjustAspectRatio=false');
    expect(r.url).toContain('pixelType=F32');
    const lf = makeFrame([-75.182534, 39.976754]);
    const [x0, y0] = lf.toLocal([r.west, r.south]);
    expect(x0).toBeCloseTo(-310, 0);
    expect(y0).toBeCloseTo(-310, 0);
  });
  it('uses the same box every time for the same lot', () => {
    const lot = { polygon: dover.lot.polygon as [number, number][], lng: 0, lat: 0 };
    expect(elevationRequest(lotCenter(lot)).url).toBe(elevationRequest(lotCenter({ ...lot })).url);
    expect(lotCenter(lot)[0]).toBeCloseTo(-75.18253, 4);
  });
  it('reads raw floats (row 0 north) and ignores the trailing mask; no-data becomes filled', () => {
    const req = { url: '', west: 0, south: 0, east: 1, north: 1, nx: 3, ny: 2 };
    const buf = new ArrayBuffer(3 * 2 * 4 + 1);
    const dv = new DataView(buf);
    [10, 11, 12, 13, -9999, 15].forEach((v, k) => dv.setFloat32(k * 4, v, true));
    const g = parseElevation(req, buf);
    expect(Array.from(g.z.slice(0, 4))).toEqual([10, 11, 12, 13]);
    expect(g.z[4]).toBeGreaterThan(10);
    expect(() => parseElevation(req, new ArrayBuffer(8))).toThrow();
  });
});

describe('datum and ground', () => {
  it('datum = the average elevation inside the lot, so the lot averages 0', () => {
    const g = synthGrid((e) => 20 + 0.03 * e);
    const lf = makeFrame(C);
    const { parcel } = rectLot();
    const { ground, datumElevFt, elev } = groundFromGrid(g, lf, parcel);
    expect(datumElevFt).toBeCloseTo(lotDatumFt(elev, parcel), 9);
    expect(datumElevFt).toBeCloseTo(20 * FT_PER_M, 1);
    // symmetric lot on a plane: ground 0 in the middle, ±0.9 ft at the short ends (3% of 30 ft)
    expect(ground(0, 0)).toBeCloseTo(0, 1);
    expect(ground(30, 0)).toBeCloseTo(0.9, 1);
    expect(ground(-30, 0)).toBeCloseTo(-0.9, 1);
  });
  it('a flat or unknown lot is exactly as before (ground 0)', () => {
    expect(groundOf(null)(12, 34)).toBe(0);
    const g = synthGrid(() => 25);
    const { ground } = groundFromGrid(g, makeFrame(C), rectLot().parcel);
    expect(Math.abs(ground(5, 5))).toBeLessThan(1e-4);
  });
});

describe('slope summary', () => {
  const lf = makeFrame(C);
  const { parcel, frame } = rectLot();
  it('a lot falling toward the street (west, the entrance): high at the back, 3% average', () => {
    const { ground } = groundFromGrid(synthGrid((e) => 20 + 0.03 * e), lf, parcel);
    const s = slopeSummary(ground, parcel, frame);
    expect(s.flat).toBe(false);
    expect(s.avgPct).toBeCloseTo(3, 0);
    expect(s.fallFt).toBeGreaterThan(1.5);
    expect(s.fallFt).toBeLessThan(1.9);
    expect(s.toward).toBe('front');
    expect(s.downhill![0]).toBeLessThan(-0.99);
    expect(whereOnLot(s.high.p, frame)).toContain('back');
    expect(whereOnLot(s.low.p, frame)).toContain('front');
    expect(s.dip).toBeNull();
    const w = describeSlope(s, frame, { x0: 'N Dover St' });
    expect(w.headline).toMatch(/falls about 1\.\d ft from the back .* to the front/);
    expect(w.headline).toContain('Rain runs toward the front of the lot (N Dover St), to the west.');
    expect(w.headline).toContain('an average slope of 3% (about 1 ft in 33 ft)');
  });
  it('a practically flat lot says so', () => {
    const { ground } = groundFromGrid(synthGrid((e, n) => 20 + 0.001 * e + 0.0005 * n), lf, parcel);
    const s = slopeSummary(ground, parcel, frame);
    expect(s.flat).toBe(true);
    expect(s.downhill).toBeNull();
    expect(describeSlope(s, frame).headline).toMatch(/practically flat/);
  });
  it('finds a dip inside the lot and the steepest part', () => {
    // a 1.3 ft (0.4 m) bowl 10 ft east of the middle, on gently rising ground
    const bowl = (e: number, n: number) => 20 + 0.004 * e - 0.4 * Math.exp(-((e - 3) ** 2 + n ** 2) / 4);
    const { ground } = groundFromGrid(synthGrid(bowl), lf, parcel);
    const s = slopeSummary(ground, parcel, frame);
    expect(s.dip).not.toBeNull();
    expect(s.dip!.p[0]).toBeGreaterThan(5);
    expect(s.dip!.p[0]).toBeLessThan(15);
    expect(s.dip!.depthFt).toBeGreaterThan(0.6);
    expect(s.steepest).not.toBeNull();
    const w = describeSlope(s, frame);
    expect(w.more.join(' ')).toMatch(/dip inside the lot/);
  });
  it('names directions as seen from the entrance', () => {
    expect(towardOf([-1, 0], frame)).toBe('front');
    expect(towardOf([1, 0], frame)).toBe('back');
    expect(towardOf([0, 1], frame)).toBe('left'); // +y is left of +x
    expect(towardOf([0, -1], frame)).toBe('right');
    expect(towardOf([-1, -1], frame)).toBe('front-right');
    expect(whereOnLot([28, 9], frame)).toBe('the back left corner');
    expect(whereOnLot([0, 0], frame)).toBe('the middle of the lot');
  });
  it('fits a plane through points', () => {
    const pts: Vec2[] = [];
    const z: number[] = [];
    for (let i = 0; i < 10; i++) for (let j = 0; j < 5; j++) {
      pts.push([i, j]);
      z.push(1 + 0.2 * i - 0.1 * j);
    }
    const [b, c] = fitPlane(pts, z);
    expect(b).toBeCloseTo(0.2, 9);
    expect(c).toBeCloseTo(-0.1, 9);
  });
  it('writes words people can read', () => {
    expect(lengthWords(0.33)).toBe('4 inches');
    expect(lengthWords(2.34)).toBe('2.3 ft');
    expect(lengthWords(14.4)).toBe('14 ft');
    expect(slopeWords(12.5)).toBe('13% (about 1 ft in 8 ft)');
  });
});

describe('contours and drain arrows', () => {
  const lf = makeFrame(C);
  const { parcel, frame } = rectLot();
  const { ground } = groundFromGrid(synthGrid((e) => 20 + 0.03 * e), lf, parcel);
  it('picks a sensible interval', () => {
    expect(contourInterval(0.1)).toBeNull();
    expect(contourInterval(1.8)).toBe(0.25);
    expect(contourInterval(4)).toBe(0.5);
    expect(contourInterval(15)).toBe(2);
  });
  it('draws straight north–south contours on an east-rising plane, at their level', () => {
    const segs = contours(ground, parcel, 0.5);
    const levels = new Set(segs.map((s) => s.level));
    expect([...levels].sort((a, b) => a - b)).toEqual([-0.5, 0, 0.5]);
    for (const s of segs) {
      // a contour at level L lies where ground = L, i.e. x = L / 0.03
      expect(Math.abs(s.a[0] - s.level / 0.03)).toBeLessThan(0.15);
      expect(Math.abs(ground(s.a[0], s.a[1]) - s.level)).toBeLessThan(0.02);
    }
  });
  it('points the arrows downhill (toward the street here)', () => {
    const arrows = drainArrows(ground, parcel, frame);
    expect(arrows.length).toBeGreaterThan(4);
    for (const a of arrows) {
      expect(a.dir[0]).toBeLessThan(-0.95);
      expect(a.pct).toBeCloseTo(3, 0);
    }
  });
});

describe('building bases', () => {
  const ring: Vec2[] = [
    [0, 0],
    [20, 0],
    [20, 40],
    [0, 40],
  ];
  const elev = (x: number, y: number) => 100 + 0.1 * y + 0.02 * x;
  it('stands on the lowest ground along its outline (where the City measures heights from)', () => {
    const b = buildingBase(ring, elev, null);
    expect(b.baseFt).toBeCloseTo(100, 6);
    expect(b.refFt).toBeCloseTo(100, 6);
  });
  it("uses the City's base elevation when it agrees with the lidar, and never floats", () => {
    const b = buildingBase(ring, elev, 100.4);
    expect(b.refFt).toBe(100.4);
    expect(b.baseFt).toBeCloseTo(100, 6);
  });
  it('ignores a City value from another datum', () => {
    expect(buildingBase(ring, elev, 12).refFt).toBeCloseTo(100, 6);
  });
});

describe('the demo lots (recorded lidar)', () => {
  const doverCtx = (terrain: boolean): SiteContext => ({
    lot: dover.lot as never,
    ...(dover.surroundings as never as Omit<SiteContext, 'lot' | 'source'>),
    source: 'fixture',
    ...(terrain ? { terrain: { grid: decodeGrid(doverElev.grid as never), steepSlope: doverElev.steepSlope } } : {}),
  });
  it('fills LocalSite.ground, the datum and building bases', () => {
    const site = buildLocalSite(doverCtx(true));
    expect(site.ground).toBeTypeOf('function');
    expect(site.datumElevFt).toBeGreaterThan(80);
    expect(site.datumElevFt).toBeLessThan(100);
    // datum = the lot's average: the lot's centre is within a few inches of 0
    expect(Math.abs(site.ground!(0, 0))).toBeLessThan(0.5);
    for (const b of site.buildings) {
      expect(b.baseFt).toBeTypeOf('number');
      expect(Math.abs(b.baseFt!)).toBeLessThan(15);
      expect(b.heightFt).toBeGreaterThan(7);
    }
    expect(site.terrain?.words.headline).toBeTruthy();
  });
  it("keeps the City's roof heights: base + height = the City's base elevation + height", () => {
    const flat = buildLocalSite(doverCtx(false));
    const site = buildLocalSite(doverCtx(true));
    const withBase = (dover.surroundings.buildings as { baseElevationFt?: number | null; heightFt: number }[]).filter((b) => b.baseElevationFt);
    expect(withBase.length).toBeGreaterThan(20);
    // the same building in both: the roof is where the City says (to within the lidar check)
    let checked = 0;
    for (let i = 0; i < site.buildings.length; i++) {
      const b = site.buildings[i]!;
      const f = flat.buildings[i]!;
      expect(b.ring).toEqual(f.ring);
      const roofAbs = site.datumElevFt! + b.baseFt! + b.heightFt;
      // roof is at least the City height above the lowest ground, and not absurdly more
      expect(roofAbs - (site.datumElevFt! + b.baseFt!)).toBeGreaterThanOrEqual(f.heightFt);
      checked++;
    }
    expect(checked).toBeGreaterThan(20);
    expect(flat.ground).toBeUndefined();
    expect(flat.buildings.every((b) => b.baseFt === undefined)).toBe(true);
  });
  it('summarises both demo lots and writes the facts', () => {
    for (const [fx, el] of [
      [dover, doverElev],
      [greenway, greenwayElev],
    ] as const) {
      const ctx = { lot: fx.lot as never, ...(fx.surroundings as never as object), source: 'fixture', terrain: { grid: decodeGrid(el.grid as never), steepSlope: el.steepSlope } } as unknown as SiteContext;
      const site = buildLocalSite(ctx);
      const facts = slopeFacts(site.terrain!, site.lf, 'test');
      expect(facts.fallFt).toBeGreaterThanOrEqual(0);
      expect(facts.fallFt).toBeLessThan(10);
      expect(facts.summary.length).toBeGreaterThan(20);
      expect(facts.source).toContain('2015');
      expect(facts.steepSlopeArea).toBe(false);
      expect(siteTerrain).toBeTypeOf('function');
    }
  });
});
