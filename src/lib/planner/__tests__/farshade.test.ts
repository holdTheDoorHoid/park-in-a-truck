// Far shade (2026-10-04): taller buildings farther away whose shadow can reach the lot are
// loaded with one extra query, counted by every sun calculation, drawn in 3D, and the 3D
// sun light stands beyond them.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { makeProjector } from '../../philly/geo';
import { setFetch } from '../../philly/http';
import {
  FAR_SHADE_MAX_FT,
  FAR_SHADE_MIN_QUERY_HEIGHT_FT,
  farQueryMinHeight,
  fetchTallBuildings,
  reachPerFoot,
  selectFarShade,
} from '../../philly/surroundings';
import type { SurroundingBuilding } from '../../philly/types';
import type { LngLat, LotRecord } from '../../types';
import { FAR_QUERY_TIMEOUT_MS, FAR_WAIT_AFTER_NEAR_MS, farShadeFailedNote, SURROUNDINGS_RADIUS_FT, loadSiteContext, type SiteContext } from '../site';
import { buildLocalSite } from '../localsite';
import { buildingsChanged, buildingsKey, litFractionAt, shadeBuildings, spotMonthlyFor } from '../sunstudy';
import { computeSunHours, type GridSpec, type Prism, type SunGrid } from '../sunhours';
import { phillyTime, sunPosition } from '../sun';
import { LIGHT_MIN_DISTANCE_FT, fogFarFt, sunLightRange } from '../sunlight';
import { decodeGrid } from '../terrain/grid';
import { centroid } from '../geo';
import { cameraFloor } from '../camera';
import { FLAT_GROUND } from '../ground';
import dover from '../fixtures/dover.json';
import doverElev from '../fixtures/dover.elevation.json';
import greenway from '../fixtures/greenway.json';

const CENTER: LngLat = [-75.16, 39.97];
const pr = makeProjector(CENTER);
const rect = (x0: number, y0: number, x1: number, y1: number): LngLat[] => [pr.toLngLat([x0, y0]), pr.toLngLat([x1, y0]), pr.toLngLat([x1, y1]), pr.toLngLat([x0, y1])];
/** a 20 × 40 ft lot centred on CENTER */
const LOT = { lat: CENTER[1], lng: CENTER[0], polygon: rect(-10, -20, 10, 20) };
const bldg = (x0: number, y0: number, x1: number, y1: number, heightFt: number, baseElevationFt: number | null = 100): SurroundingBuilding => ({
  polygon: rect(x0, y0, x1, y1),
  heightFt,
  baseElevationFt,
});
const ctxOf = (f: typeof dover | typeof greenway, extra: Partial<SiteContext> = {}) => ({ lot: f.lot, ...f.surroundings, source: 'fixture', ...extra }) as unknown as SiteContext;
const doverTerrain = { grid: decodeGrid(doverElev.grid as never), steepSlope: doverElev.steepSlope };

afterEach(() => setFetch(null));

describe('which far buildings can shade the lot', () => {
  it('a building throws its shadow about 5.7 × its height when the sun is 10° up', () => {
    expect(reachPerFoot(10)).toBeCloseTo(5.671, 3);
    expect(reachPerFoot(45)).toBeCloseTo(1, 6);
  });

  it('asks only for buildings tall enough to reach the lot from beyond the near radius', () => {
    // a 20 × 40 lot reaches 22.4 ft from its centre: (260 − 22.4) / 5.67 = 41.9
    expect(farQueryMinHeight(LOT, 260)).toBe(41);
    // the demo lot on Dover St is about as small (14 × 50 ft)
    expect(farQueryMinHeight(dover.lot as never, SURROUNDINGS_RADIUS_FT)).toBe(40);
    // a very big lot never asks for everything
    expect(farQueryMinHeight({ ...LOT, polygon: rect(-150, -150, 150, 150) }, 260)).toBe(FAR_SHADE_MIN_QUERY_HEIGHT_FT);
  });

  it('keeps a building only when its shadow can reach the lot, counting the ground it stands on', () => {
    const near = [bldg(10, -20, 26, 20, 30, 100)]; // next door: the lot's ground is about 100 ft
    // south of the lot, its north face 300 ft from the lot's south edge
    const south = (h: number, base: number | null) => bldg(-20, -360, 20, -320, h, base);
    const kept = (b: SurroundingBuilding) => selectFarShade(LOT, near, [b]).length === 1;
    expect(kept(south(60, 100))).toBe(true); // 60 × 5.67 = 340 ≥ 300
    expect(kept(south(45, 100))).toBe(false); // 255 < 300
    expect(kept(south(45, 115))).toBe(true); // on ground 15 ft higher: 60 ft above the lot
    expect(kept(south(60, 70))).toBe(false); // 30 ft lower: only 30 ft above the lot
    expect(kept(south(45, null))).toBe(false); // no base elevation: its own height only
    // the same building the near query already has is not counted twice
    expect(selectFarShade(LOT, [...near, south(60, 100)], [south(60, 100)])).toHaveLength(0);
    // no lot outline: nothing to shade
    expect(selectFarShade({ lat: LOT.lat, lng: LOT.lng }, near, [south(300, 100)])).toHaveLength(0);
  });

  it("the demo fixtures hold exactly what the live filter keeps (Dover: 4 buildings; Greenway: none can reach)", () => {
    const far = dover.surroundings.farBuildings as SurroundingBuilding[];
    expect(far.map((b) => b.heightFt).sort((a, b) => a - b)).toEqual([41, 45, 47, 64]);
    expect(selectFarShade(dover.lot as never, dover.surroundings.buildings as SurroundingBuilding[], far)).toHaveLength(far.length);
    expect(greenway.surroundings.farBuildings).toEqual([]);
  });
});

describe('the far query', () => {
  it('is one light request: a height filter, two fields, generalised outlines', async () => {
    const urls: string[] = [];
    setFetch(async (url) => {
      urls.push(url);
      const body = {
        type: 'FeatureCollection',
        features: [
          { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[...rect(-20, -360, 20, -320), rect(-20, -360, 20, -320)[0]]] }, properties: { approx_hgt: 64, base_elevation: 91 } },
          { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[...rect(0, 400, 20, 420), rect(0, 400, 20, 420)[0]]] }, properties: { approx_hgt: null, base_elevation: 90 } },
        ],
      };
      const text = JSON.stringify(body);
      return { ok: true, status: 200, json: async () => JSON.parse(text), text: async () => text };
    });
    const r = await fetchTallBuildings(LOT, { minHeightFt: 41 });
    expect(urls).toHaveLength(1);
    const q = new URL(urls[0]!).searchParams;
    expect(q.get('where')).toBe('approx_hgt >= 41');
    expect(q.get('distance')).toBe(String(FAR_SHADE_MAX_FT));
    expect(q.get('outFields')).toBe('approx_hgt,base_elevation');
    expect(q.get('geometryPrecision')).toBe('6');
    expect(Number(q.get('maxAllowableOffset'))).toBeGreaterThan(0);
    expect(Number(q.get('resultRecordCount'))).toBeGreaterThan(0);
    // a building without a height is skipped
    expect(r.buildings).toHaveLength(1);
    expect(r.buildings[0]).toMatchObject({ heightFt: 64, baseElevationFt: 91 });
  });

  it('the planner loads the near surroundings and the far buildings together; a failed far query leaves a note', async () => {
    const lot = { address: '1 TEST ST', opa: '1', pwdParcelId: 990001, lat: LOT.lat, lng: LOT.lng, polygon: LOT.polygon } as unknown as LotRecord;
    const feature = (ring: LngLat[], props: object) => ({ type: 'Feature', geometry: { type: 'Polygon', coordinates: [[...ring, ring[0]]] }, properties: props });
    let farFails = false;
    setFetch(async (url) => {
      const q = new URL(url).searchParams;
      let body: unknown = { type: 'FeatureCollection', features: [] };
      if (url.includes('LI_BUILDING_FOOTPRINTS') && q.get('where')?.startsWith('approx_hgt')) {
        if (farFails) return { ok: false, status: 503, json: async () => ({}), text: async () => '' };
        body = { type: 'FeatureCollection', features: [feature(rect(-20, -360, 20, -320), { approx_hgt: 64, base_elevation: 100 }), feature(rect(-20, 1000, 20, 1040), { approx_hgt: 50, base_elevation: 100 })] };
      } else if (url.includes('LI_BUILDING_FOOTPRINTS')) {
        body = { type: 'FeatureCollection', features: [feature(rect(10, -20, 26, 20), { address: '3 TEST ST', approx_hgt: 30, max_hgt: 34, base_elevation: 100 })] };
      }
      const text = JSON.stringify(body);
      return { ok: true, status: 200, json: async () => JSON.parse(text), text: async () => text };
    });
    const ctx = await loadSiteContext(lot);
    expect(ctx.source).toBe('city');
    expect(ctx.buildings).toHaveLength(1);
    // the 64-ft building 300 ft south can shade the lot; the 50-ft one 1,000 ft north can't
    expect(ctx.farBuildings?.map((b) => b.heightFt)).toEqual([64]);
    expect(ctx.note).toBeUndefined();

    farFails = true;
    // (another place: the City answers are cached per request)
    const p2 = makeProjector([CENTER[0] + 0.01, CENTER[1]]);
    const lot2 = { ...lot, pwdParcelId: 990002, address: '2 TEST ST', lng: CENTER[0] + 0.01, polygon: LOT.polygon.map((p) => p2.toLngLat(pr.toXY(p))) } as LotRecord;
    const ctx2 = await loadSiteContext(lot2);
    expect(ctx2.buildings).toHaveLength(1);
    expect(ctx2.farBuildings).toBeUndefined();
    expect(ctx2.note).toBe(farShadeFailedNote());
    expect(ctx2.note).toMatch(/^Couldn't load the taller buildings farther from your lot/);
  });

  it('a slow far query (past the 20 s other lookups get) does not hold the lot up: its buildings come later', async () => {
    vi.useFakeTimers();
    try {
      const p3 = makeProjector([CENTER[0] - 0.01, CENTER[1]]);
      const lot = { address: '3 TEST ST', opa: '3', pwdParcelId: 990003, lat: LOT.lat, lng: CENTER[0] - 0.01, polygon: LOT.polygon.map((p) => p3.toLngLat(pr.toXY(p))) } as unknown as LotRecord;
      const feature = (ring: LngLat[], props: object) => ({ type: 'Feature', geometry: { type: 'Polygon', coordinates: [[...ring, ring[0]]] }, properties: props });
      const box = (x0: number, y0: number, x1: number, y1: number) => [p3.toLngLat([x0, y0]), p3.toLngLat([x1, y0]), p3.toLngLat([x1, y1]), p3.toLngLat([x0, y1])] as LngLat[];
      setFetch(async (url, init) => {
        const q = new URL(url).searchParams;
        let body: unknown = { type: 'FeatureCollection', features: [] };
        if (url.includes('LI_BUILDING_FOOTPRINTS') && q.get('where')?.startsWith('approx_hgt')) {
          // the City takes 30 s to answer (unless the planner gives up first)
          await new Promise<void>((ok, fail) => {
            const t = setTimeout(ok, 30_000);
            init?.signal?.addEventListener('abort', () => (clearTimeout(t), fail(new Error('aborted'))));
          });
          body = { type: 'FeatureCollection', features: [feature(box(-20, -360, 20, -320), { approx_hgt: 64, base_elevation: 100 })] };
        } else if (url.includes('LI_BUILDING_FOOTPRINTS')) {
          body = { type: 'FeatureCollection', features: [feature(box(10, -20, 26, 20), { address: '5 TEST ST', approx_hgt: 30, max_hgt: 34, base_elevation: 100 })] };
        }
        const text = JSON.stringify(body);
        return { ok: true, status: 200, json: async () => JSON.parse(text), text: async () => text };
      });
      const late: SiteContext[] = [];
      const loading = loadSiteContext(lot, (c) => late.push(c));
      await vi.advanceTimersByTimeAsync(FAR_WAIT_AFTER_NEAR_MS + 50);
      const ctx = await loading;
      expect(ctx.buildings).toHaveLength(1);
      expect(ctx.farBuildings).toBeUndefined();
      expect(ctx.note).toBeUndefined();
      expect(late).toHaveLength(0);
      await vi.advanceTimersByTimeAsync(30_000);
      expect(late).toHaveLength(1);
      expect(late[0]!.farBuildings?.map((b) => b.heightFt)).toEqual([64]);
      expect(late[0]!.note).toBeUndefined();
      expect(FAR_QUERY_TIMEOUT_MS).toBeGreaterThanOrEqual(45_000);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('far buildings in the site and the sun maths', () => {
  const near = buildLocalSite(ctxOf(dover, { farBuildings: undefined }));
  const withFar = buildLocalSite(ctxOf(dover));

  it('become prisms of their own; street edges, neighbours and the lot frame ignore them', () => {
    expect(withFar.farBuildings).toHaveLength(4);
    expect(near.farBuildings).toBeUndefined();
    expect(withFar.buildings).toEqual(near.buildings);
    expect(withFar.frame).toEqual(near.frame);
    expect(shadeBuildings(withFar)).toHaveLength(withFar.buildings.length + 4);
    expect(shadeBuildings(near)).toBe(near.buildings);
  });

  it('stand on the ground: the lidar on the grid, the City base elevation beyond it', () => {
    const site = buildLocalSite(ctxOf(dover, { terrain: doverTerrain }));
    const grid = doverTerrain.grid;
    const src = dover.surroundings.farBuildings as SurroundingBuilding[];
    site.farBuildings!.forEach((p, i) => {
      const b = src[i]!;
      const onGrid = b.polygon.every(([x, y]) => x >= grid.west && x <= grid.east && y >= grid.south && y <= grid.north);
      const top = p.baseFt! + p.heightFt;
      if (!onGrid) {
        // roof = the City's ground + its height, above the lot's datum
        expect(top).toBeCloseTo(b.baseElevationFt! + b.heightFt - site.datumElevFt!, 6);
        expect(p.baseFt).toBeCloseTo(b.baseElevationFt! - site.datumElevFt! - 0.3, 6);
      } else expect(top).toBeGreaterThan(b.heightFt - 20);
    });
  });

  it('a tall far building south of a spot takes its low winter sun: the map, the chart and "in sun now" all see it', () => {
    // a 300-ft tower 500 ft south of a lot with nothing else around
    const tower: Prism = { ring: [[-60, -560], [60, -560], [60, -500], [-60, -500]], heightFt: 300 };
    const lot = { ...near, buildings: [], trees: [] };
    const towered = { ...lot, farBuildings: [tower] };
    const spot: [number, number] = [0, 0];
    const a = spotMonthlyFor(lot, [], spot);
    const b = spotMonthlyFor(towered, [], spot);
    expect(b[11]!.sunHours).toBeLessThan(a[11]!.sunHours - 0.5); // December
    expect(b[5]!.sunHours).toBeCloseTo(a[5]!.sunHours, 1); // June: the sun is high at noon
    // noon on the shortest day: the sun is 27° up and due south, the tower's shadow is 600 ft long
    const p = sunPosition(phillyTime(2026, 12, 21, 12 * 60), lot.lf.origin[1], lot.lf.origin[0]);
    expect(litFractionAt(lot, [], p.altitudeDeg, p.azimuthDeg, 0)).toBe(1);
    expect(litFractionAt(towered, [], p.altitudeDeg, p.azimuthDeg, 0)).toBe(0);
    // the worker's maths (one cell, the same sample)
    const grid: GridSpec = { origin: [-0.5, -0.5], ux: [1, 0], uy: [0, 1], cellFt: 1, nx: 1, ny: 1 };
    const s = [{ ...p, weight: 1 }];
    expect(computeSunHours({ grid, buildings: shadeBuildings(towered), crowns: [], samples: s, days: 1 })[0]).toBe(0);
  });
});

describe('a saved study made before the far buildings were counted', () => {
  const site = buildLocalSite(ctxOf(dover));
  const grid = (inputs: SunGrid['inputs']) => ({ inputs }) as SunGrid;

  it('the buildings key does not change when ground heights arrive, but does when a building changes', () => {
    const k = buildingsKey(site);
    expect(buildingsKey(buildLocalSite(ctxOf(dover, { terrain: doverTerrain })))).toBe(k);
    const far = dover.surroundings.farBuildings as SurroundingBuilding[];
    const taller = buildLocalSite(ctxOf(dover, { farBuildings: [{ ...far[0]!, heightFt: far[0]!.heightFt + 10 }, ...far.slice(1)] } as never));
    expect(buildingsKey(taller)).not.toBe(k);
    // the order buildings come back in does not matter
    expect(buildingsKey(buildLocalSite(ctxOf(dover, { farBuildings: [...far].reverse() } as never)))).toBe(k);
  });

  it('says so: older studies (no key) when far buildings are now counted, and any study whose buildings changed', () => {
    expect(buildingsChanged(grid({ buildings: 195, trees: 3 }), site)).toBe('far-added');
    expect(buildingsChanged(grid({ buildings: 199, trees: 3, buildingsKey: buildingsKey(site) }), site)).toBeNull();
    expect(buildingsChanged(grid({ buildings: 199, trees: 3, buildingsKey: '1:abc', farBuildings: 4 }), site)).toBe('changed');
    // worked out while the far buildings could not be loaded: they are what's new
    expect(buildingsChanged(grid({ buildings: 195, trees: 3, buildingsKey: '195:abc' }), site)).toBe('far-added');
    // no far buildings around this lot: an older study is still right
    const g = buildLocalSite(ctxOf(greenway));
    expect(buildingsChanged(grid({ buildings: 120, trees: 3 }), g)).toBeNull();
    // the far buildings could not be loaded this time: can't tell, say nothing
    const failed = buildLocalSite(ctxOf(dover, { farBuildings: undefined }));
    expect(buildingsChanged(grid({ buildings: 195, trees: 3 }), failed)).toBeNull();
    expect(buildingsChanged(null, site)).toBeNull();
  });
});

describe('the 3D sun light', () => {
  it('stays where it was (600 ft, 1,400-ft-deep shadow camera) when every building is close by', () => {
    const site = buildLocalSite(ctxOf(greenway));
    const r = sunLightRange(site.buildings);
    expect(r.distanceFt).toBe(LIGHT_MIN_DISTANCE_FT);
    expect(r.near).toBe(1);
    expect(r.far).toBe(1400);
    expect(r.bias).toBeCloseTo(-0.0004, 6);
    expect(fogFarFt([], site.extentFt)).toBe(site.extentFt * 4);
  });

  it('stands beyond the farthest building that can shade the lot, so a low sun behind it still casts its shadow', () => {
    const tower: Prism = { ring: [[-60, -1480], [60, -1480], [60, -1420], [-60, -1420]], heightFt: 280, baseFt: 5 };
    const r = sunLightRange([tower]);
    // the sun 10° up, due south: the tower's roof lies on the line from the lot to the light, closer than the light
    const alt = (10 * Math.PI) / 180;
    const dir = [0, -Math.cos(alt), Math.sin(alt)];
    for (const [x, y] of tower.ring) {
      const along = x * dir[0]! + y * dir[1]! + (tower.baseFt! + tower.heightFt) * dir[2]!;
      expect(along).toBeLessThan(r.distanceFt - 30);
    }
    expect(r.distanceFt).toBeGreaterThan(1450);
    // the camera reaches from the light to well past the lot
    expect(r.far).toBeGreaterThan(r.distanceFt + 500);
    // the depth bias is the same in feet as before
    expect(r.bias * (r.far - r.near)).toBeCloseTo(-0.0004 * 1399, 6);
    // the fog lets the farthest building show, but never the edge of the plain ground
    const fog = fogFarFt([tower], 200);
    expect(fog).toBeGreaterThan(Math.hypot(...centroid(tower.ring)));
    expect(fog).toBeLessThanOrEqual(2200);
  });

  it('the camera rides over a far building as it does over a neighbour (the scene gives it both)', () => {
    const site = buildLocalSite(ctxOf(dover));
    const tallest = site.farBuildings!.reduce((a, b) => (a.heightFt > b.heightFt ? a : b));
    const floor = cameraFloor(FLAT_GROUND, shadeBuildings(site));
    expect(floor.at(centroid(tallest.ring))).toBeGreaterThan((tallest.baseFt ?? 0) + tallest.heightFt);
  });

  it('on the Dover demo lot the light moves out to the far buildings', () => {
    const site = buildLocalSite(ctxOf(dover));
    const all = shadeBuildings(site);
    const r = sunLightRange(all);
    let max = 0;
    for (const b of site.farBuildings!) for (const [x, y] of b.ring) max = Math.max(max, Math.hypot(x, y));
    expect(r.distanceFt).toBeGreaterThan(max);
    expect(sunLightRange(site.buildings).distanceFt).toBe(LIGHT_MIN_DISTANCE_FT);
  });
});
