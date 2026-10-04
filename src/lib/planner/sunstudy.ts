// Running the sun-hours study for a lot (in a Web Worker) and turning the result into
// the saved grid (project.extra.sunGrid) and a sunAt() lookup for the tally.

import type { ExistingItem, SunClass } from '../types';
import type { LocalSite } from './localsite';
import { pointInPolygon, distanceToRing, type Vec2 } from './geo';
import { siteToLocal } from './rect';
import { DEFAULT_SEASON, seasonSamples, type SeasonOptions } from './sun';
import {
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
  type SunGrid,
} from './sunhours';
import type { SunJob } from './sun.worker';

/** Grid over the lot's oriented rectangle: 1 ft cells (2 ft on big lots). */
export function lotGrid(site: LocalSite): GridSpec {
  const f = site.frame;
  const cellFt = f.lengthFt * f.widthFt > 8000 ? 2 : 1;
  const nx = Math.max(1, Math.ceil(f.lengthFt / cellFt));
  const ny = Math.max(1, Math.ceil(f.widthFt / cellFt));
  const mask = new Uint8Array(nx * ny);
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const p = siteToLocal(f, [(i + 0.5) * cellFt, (j + 0.5) * cellFt]);
      if (pointInPolygon(p, site.parcel) || distanceToRing(p, site.parcel) < cellFt * 0.35) mask[j * nx + i] = 1;
    }
  }
  return { origin: f.corner, ux: f.u, uy: f.v, cellFt, nx, ny, mask };
}

/** Tree crowns that shade the lot: City trees off the lot, plus kept trees on it. */
export function shadeCrowns(site: LocalSite, existing: ExistingItem[] = []): Crown[] {
  const crowns: Crown[] = [];
  for (const t of site.trees) {
    if (t.onLot) continue; // on-lot City trees are in `existing`, with keep/remove
    crowns.push({ x: t.x, y: t.y, z: Math.max(t.crownR + 4, t.heightFt - t.crownR), r: t.crownR });
  }
  for (const e of existing) {
    if (e.element !== 'existing-tree' || e.keep === false || !e.lngLat) continue;
    const [x, y] = site.lf.toLocal(e.lngLat);
    const r = e.radiusFt ?? 8;
    const city = e.cityKey ? site.trees.find((t) => t.key === e.cityKey) : undefined;
    const h = city?.heightFt ?? Math.max(15, r * 2.4);
    crowns.push({ x, y, z: Math.max(r + 4, h - r), r });
  }
  return crowns;
}

/** A short fingerprint of the trees that shade the lot (to tell when a saved study is out of date). */
export function crownsKey(crowns: Crown[]): string {
  let h = 0;
  for (const c of crowns) {
    for (const v of [c.x, c.y, c.r]) h = (Math.imul(h, 31) + Math.round(v * 2)) | 0;
  }
  return `${crowns.length}:${(h >>> 0).toString(36)}`;
}

export interface SunStudyResult {
  grid: SunGrid;
  hours: Float32Array;
}

export function runSunStudy(
  site: LocalSite,
  existing: ExistingItem[] | undefined,
  onProgress: (f: number) => void,
  season: SeasonOptions = DEFAULT_SEASON,
): { promise: Promise<SunStudyResult>; cancel: () => void } {
  const spec = lotGrid(site);
  const crowns = shadeCrowns(site, existing);
  const job: SunJob = {
    grid: spec,
    buildings: site.buildings,
    crowns,
    lat: site.lf.origin[1],
    lng: site.lf.origin[0],
    season,
  };
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
      const { samples, days } = seasonSamples(job.lat, job.lng, season);
      resolve(computeSunHours({ grid: spec, buildings: job.buildings, crowns, samples, days }, onProgress));
    }
  }).then((hours) => {
    if (cancelled) throw new Error('cancelled');
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
      thresholds: { sunMinHours: SUN_HOURS.sun, partMinHours: SUN_HOURS.part },
      summary,
      sunClass: lotSunClass(summary),
      computedAt: new Date().toISOString(),
      inputs: { buildings: site.buildings.length, trees: crowns.length, treesKey: crownsKey(crowns) },
    };
    return { grid, hours };
  });
  return {
    promise,
    cancel: () => {
      cancelled = true;
      (worker as Worker | null)?.terminate();
    },
  };
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

/** Share of the lot in direct sun at one moment (tree crowns let 40% through). */
export function litFractionAt(site: LocalSite, existing: ExistingItem[] | undefined, altitudeDeg: number, azimuthDeg: number): number {
  if (altitudeDeg <= 0.5) return 0;
  let spec = gridCache.get(site);
  if (!spec) {
    spec = lotGrid(site);
    gridCache.set(site, spec);
  }
  const lit = computeSunHours({
    grid: spec,
    buildings: site.buildings,
    crowns: shadeCrowns(site, existing),
    samples: [{ altitudeDeg, azimuthDeg, weight: 1 }],
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
