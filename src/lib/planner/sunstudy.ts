// Running the sun-hours study for a lot (in a Web Worker) and turning the result into
// the saved grid (project.extra.sunGrid) and a sunAt() lookup for the tally.

import type { ExistingItem, SunClass } from '../types';
import type { LocalSite } from './localsite';
import { pointInPolygon, distanceToRing, type Vec2 } from './geo';
import { siteToLocal } from './rect';
import { groundOf } from './ground';
import { DEFAULT_SEASON, seasonSamples, type SeasonOptions } from './sun';
import { LEAF_SEASON, crownCenterFt, existingTreeLook, treeLook } from './treemodel';
import { periodSamples, spotMonthly, type MonthSun, type SunPeriod } from './sunperiod';
import {
  BARE_CROWN_BLOCKING,
  CROWN_BLOCKING,
  SUN_HOURS,
  classify,
  computeSunHours,
  decodeHours,
  encodeHours,
  gridSpecFromSaved,
  hoursAt,
  lotSunClass,
  summarise,
  type Crown,
  type GridSpec,
  type Prism,
  type SunGrid,
} from './sunhours';
import type { SunJob } from './sun.worker';

/**
 * Grid over the lot's oriented rectangle: 1 ft cells (2 ft on big lots). When the ground's
 * heights are known (site.ground), each cell carries its own ground height.
 */
export function lotGrid(site: LocalSite): GridSpec {
  const f = site.frame;
  const cellFt = f.lengthFt * f.widthFt > 8000 ? 2 : 1;
  const nx = Math.max(1, Math.ceil(f.lengthFt / cellFt));
  const ny = Math.max(1, Math.ceil(f.widthFt / cellFt));
  const mask = new Uint8Array(nx * ny);
  const groundFt = site.ground ? new Float32Array(nx * ny) : undefined;
  const ground = groundOf(site);
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const p = siteToLocal(f, [(i + 0.5) * cellFt, (j + 0.5) * cellFt]);
      if (pointInPolygon(p, site.parcel) || distanceToRing(p, site.parcel) < cellFt * 0.35) mask[j * nx + i] = 1;
      if (groundFt) groundFt[j * nx + i] = ground(p[0], p[1]);
    }
  }
  return { origin: f.corner, ux: f.u, uy: f.v, cellFt, nx, ny, mask, ...(groundFt ? { groundFt } : {}) };
}

/**
 * Tree crowns that shade the lot: City trees off the lot, plus kept trees on it. Each crown
 * stands on the ground under its trunk and knows whether it keeps its leaves in winter.
 */
export function shadeCrowns(site: LocalSite, existing: ExistingItem[] = []): Crown[] {
  const crowns: Crown[] = [];
  const ground = groundOf(site);
  for (const t of site.trees) {
    if (t.onLot) continue; // on-lot City trees are in `existing`, with keep/remove
    const c: Crown = { x: t.x, y: t.y, z: ground(t.x, t.y) + crownCenterFt(t.heightFt, t.crownR), r: t.crownR };
    if (treeLook(t.species).evergreen) c.evergreen = true;
    crowns.push(c);
  }
  for (const e of existing) {
    if (e.element !== 'existing-tree' || e.keep === false || !e.lngLat) continue;
    const [x, y] = site.lf.toLocal(e.lngLat);
    const r = e.radiusFt ?? 8;
    const city = e.cityKey ? site.trees.find((t) => t.key === e.cityKey) : undefined;
    const h = city?.heightFt ?? Math.max(15, r * 2.4);
    const c: Crown = { x, y, z: ground(x, y) + crownCenterFt(h, r), r };
    if (existingTreeLook({ ...e, species: e.species ?? city?.species }).evergreen) c.evergreen = true;
    crowns.push(c);
  }
  return crowns;
}

/** A short fingerprint of the trees that shade the lot (to tell when a saved study is out of date). */
export function crownsKey(crowns: Crown[]): string {
  let h = 0;
  for (const c of crowns) {
    // evergreens add to the key; an all-deciduous set keys as it did before leaf seasons
    for (const v of c.evergreen ? [c.x, c.y, c.r, 1] : [c.x, c.y, c.r]) h = (Math.imul(h, 31) + Math.round(v * 2)) | 0;
  }
  return `${crowns.length}:${(h >>> 0).toString(36)}`;
}

/**
 * Every building that shades the lot: the neighbours within SURROUNDINGS_RADIUS_FT plus the
 * taller ones farther out whose shadow can reach it (LocalSite.farBuildings). The maps, the
 * spot chart, "in sun now" and the saved growing-season study all use this.
 */
export function shadeBuildings(site: LocalSite): Prism[] {
  return site.farBuildings?.length ? [...site.buildings, ...site.farBuildings] : site.buildings;
}

/**
 * A short fingerprint of the City buildings around the lot (to tell when a saved study is out
 * of date). Built from the City's outlines and heights, not the ground under them, so it
 * doesn't change when ground heights arrive after the lot; order doesn't matter.
 */
export function buildingsKey(site: LocalSite): string {
  const all = [...site.ctx.buildings, ...(site.ctx.farBuildings ?? [])];
  let h = 0;
  for (const b of all) {
    const p = b.polygon[0];
    if (!p) continue;
    let v = 0;
    for (const n of [p[0] * 1e6, p[1] * 1e6, b.heightFt * 2]) v = (Math.imul(v, 31) + Math.round(n)) | 0;
    h = (h + v) | 0;
  }
  return `${all.length}:${(h >>> 0).toString(36)}`;
}

/**
 * Is a saved study older than the buildings it should count? A study saved before far
 * buildings were counted (no buildingsKey) is out of date when the lot now has some. When
 * the far buildings could not be loaded this time, it says nothing (it can't tell).
 */
export function buildingsChanged(grid: SunGrid | null | undefined, site: LocalSite | null | undefined): 'far-added' | 'changed' | null {
  if (!grid || !site || !site.ctx.farBuildings) return null;
  if (!grid.inputs.buildingsKey) return site.ctx.farBuildings.length ? 'far-added' : null;
  return grid.inputs.buildingsKey === buildingsKey(site) ? null : 'changed';
}

export interface SunStudyResult {
  grid: SunGrid;
  hours: Float32Array;
}

/** Run one sun-hours job in a Web Worker (or here, if workers are unavailable). */
function runJob(job: SunJob, onProgress: (f: number) => void): { promise: Promise<Float32Array>; cancel: () => void } {
  let worker: Worker | null = null;
  let cancelled = false;
  const promise = new Promise<Float32Array>((resolve, reject) => {
    try {
      worker = new Worker(new URL('./sun.worker.ts', import.meta.url), { type: 'module' });
      worker.onmessage = (e) => {
        if (e.data.type === 'progress') onProgress(e.data.f);
        else if (e.data.type === 'done') {
          resolve(e.data.hours as Float32Array);
          worker?.terminate();
        }
      };
      worker.onerror = (err) => {
        worker?.terminate();
        reject(err);
      };
      worker.postMessage(job);
    } catch {
      // No worker support: do it here (blocks briefly).
      const { samples, days } = job.period ? periodSamples(job.lat, job.lng, job.period) : seasonSamples(job.lat, job.lng, job.season ?? DEFAULT_SEASON);
      resolve(computeSunHours({ grid: job.grid, buildings: job.buildings, crowns: job.crowns, samples, days }, onProgress));
    }
  }).then((hours) => {
    if (cancelled) throw new Error('cancelled');
    return hours;
  });
  return {
    promise,
    cancel: () => {
      cancelled = true;
      (worker as Worker | null)?.terminate();
    },
  };
}

/** Buildings as the sun maths needs them (plain data that can go to the worker). */
function prisms(site: LocalSite) {
  return shadeBuildings(site).map((b) => ({ ring: b.ring, heightFt: b.heightFt, ...(b.baseFt ? { baseFt: b.baseFt } : {}) }));
}

/** The growing-season study: it is saved (project.extra.sunGrid) and feeds the counts. */
export function runSunStudy(
  site: LocalSite,
  existing: ExistingItem[] | undefined,
  onProgress: (f: number) => void,
  season: SeasonOptions = DEFAULT_SEASON,
): { promise: Promise<SunStudyResult>; cancel: () => void } {
  const spec = lotGrid(site);
  const crowns = shadeCrowns(site, existing);
  const run = runJob({ grid: spec, buildings: prisms(site), crowns, lat: site.lf.origin[1], lng: site.lf.origin[0], season }, onProgress);
  const promise = run.promise.then((hours) => {
    const summary = summarise(hours);
    const grid: SunGrid = {
      v: 1,
      origin: site.lf.toLngLat(spec.origin).map((v) => Number(v.toFixed(8))) as [number, number],
      bearingDeg: Number(site.frame.bearingDeg.toFixed(3)),
      cellFt: spec.cellFt,
      nx: spec.nx,
      ny: spec.ny,
      hoursX10: encodeHours(hours),
      season: { from: season.from, to: season.to, everyDays: season.everyDays, everyMinutes: season.everyMinutes },
      crownBlocking: CROWN_BLOCKING,
      bareCrownBlocking: BARE_CROWN_BLOCKING,
      leafSeason: { ...LEAF_SEASON },
      thresholds: { sunMinHours: SUN_HOURS.sun, partMinHours: SUN_HOURS.part },
      summary,
      sunClass: lotSunClass(summary),
      computedAt: new Date().toISOString(),
      inputs: {
        buildings: site.buildings.length + (site.farBuildings?.length ?? 0),
        trees: crowns.length,
        treesKey: crownsKey(crowns),
        buildingsKey: buildingsKey(site),
        ...(site.farBuildings?.length ? { farBuildings: site.farBuildings.length } : {}),
      },
    };
    return { grid, hours };
  });
  return { promise, cancel: run.cancel };
}

export interface PeriodResult {
  period: SunPeriod;
  spec: GridSpec;
  hours: Float32Array;
  summary: SunGrid['summary'];
  /** the trees it was worked out with (crownsKey) */
  treesKey: string;
}

/** Sun hours for any period, for the map only (never saved, never counted). */
export function runPeriodStudy(
  site: LocalSite,
  existing: ExistingItem[] | undefined,
  period: SunPeriod,
  onProgress: (f: number) => void,
): { promise: Promise<PeriodResult>; cancel: () => void } {
  const spec = lotGrid(site);
  const crowns = shadeCrowns(site, existing);
  const run = runJob({ grid: spec, buildings: prisms(site), crowns, lat: site.lf.origin[1], lng: site.lf.origin[0], period }, onProgress);
  return {
    promise: run.promise.then((hours) => ({ period, spec, hours, summary: summarise(hours), treesKey: crownsKey(crowns) })),
    cancel: run.cancel,
  };
}

/** Month-by-month direct sun at one spot on the lot (local feet). */
export function spotMonthlyFor(site: LocalSite, existing: ExistingItem[] | undefined, point: Vec2): MonthSun[] {
  return spotMonthly({
    point,
    groundFt: groundOf(site)(point[0], point[1]),
    buildings: shadeBuildings(site),
    crowns: shadeCrowns(site, existing),
    lat: site.lf.origin[1],
    lng: site.lf.origin[0],
  });
}

/** A sunAt(x, y) for the tally from a saved grid; `toLocal` maps park-local feet to local feet. */
export function makeSunAt(grid: SunGrid | null | undefined, site: LocalSite, toLocal: (p: Vec2) => Vec2): ((x: number, y: number) => SunClass) | undefined {
  if (!grid) return undefined;
  const spec = gridSpecFromSaved(grid, site.lf);
  const hours = decodeHours(grid.hoursX10);
  return (x, y) => {
    const h = hoursAt(spec, hours, toLocal([x, y]));
    return Number.isNaN(h) ? 'sun' : classify(h);
  };
}

const gridCache = new WeakMap<LocalSite, GridSpec>();

/**
 * Share of the lot in direct sun at one moment. `leaf` = how far into leaf deciduous trees
 * are that day (1 = full leaf: crowns let 40% through; 0 = bare: 70%).
 */
export function litFractionAt(site: LocalSite, existing: ExistingItem[] | undefined, altitudeDeg: number, azimuthDeg: number, leaf = 1): number {
  if (altitudeDeg <= 0.5) return 0;
  let spec = gridCache.get(site);
  if (!spec) {
    spec = lotGrid(site);
    gridCache.set(site, spec);
  }
  const lit = computeSunHours({
    grid: spec,
    buildings: shadeBuildings(site),
    crowns: shadeCrowns(site, existing),
    samples: [{ altitudeDeg, azimuthDeg, weight: 1, leaf }],
    days: 1,
  });
  let sum = 0;
  let n = 0;
  for (const v of lit) {
    if (Number.isNaN(v)) continue;
    sum += v;
    n++;
  }
  return n ? sum / n : 0;
}
