// Terrain for the planner: ground heights under the lot and around it (USGS 3DEP lidar),
// the lot's datum, building bases, and the slope facts people see.
//
//   grid.ts   the elevation grid, the smooth ground function, the datum, fixture encoding
//   fetch.ts  one request per lot to 3DEP (+ the City's steep-slope zoning check)
//   slope.ts  slope summary and plain words, contour lines, drain arrows, building bases
//
// Fills the shared contract in ../ground.ts: LocalSite.ground / datumElevFt and Prism.baseFt.

import type { LotRecord, SiteSlopeFacts } from '../../types';
import type { LocalFrame, Vec2 } from '../geo';
import type { GroundFn } from '../ground';
import type { Edge, SiteFrame } from '../rect';
import { distanceToPolyline } from '../geo';
import { siteToLocal } from '../rect';
import { groundFromGrid, type ElevationGrid, type ElevationSource } from './grid';
import { fetchElevation, fetchSteepSlope, lotCenter } from './fetch';
import { describeSlope, slopeSummary, type SlopeSummary, type SlopeWords } from './slope';
import { pt, ptEnglish, type PlannerT } from '../words';

export type { ElevationGrid } from './grid';

/** What the terrain loader brings back for a lot. */
export interface TerrainData {
  grid: ElevationGrid;
  /** inside the City zoning map's Steep Slope Protection Area; null = could not check */
  steepSlope?: boolean | null;
}

/** Terrain as the planner uses it (LocalSite.terrain). */
export interface SiteTerrain {
  source: ElevationSource;
  datumElevFt: number;
  /** feet above sea level at a local point */
  elev: GroundFn;
  slope: SlopeSummary;
  /** the summary in the page's language */
  words: SlopeWords;
  /** the same in English: the summary saved with the project (extra.site.slope) */
  summaryEn: string;
  steepSlope?: boolean | null;
}

/** Live: one 3DEP request (and the City's steep-slope check alongside it). */
export async function fetchTerrain(lot: Pick<LotRecord, 'polygon' | 'lng' | 'lat'>): Promise<TerrainData> {
  const steep = lot.polygon?.length >= 3 ? fetchSteepSlope(lot.polygon).catch(() => null) : Promise.resolve(null);
  const grid = await fetchElevation(lotCenter(lot));
  return { grid, steepSlope: await steep };
}

/** The ground and datum for a lot from its elevation grid. */
export function makeGround(t: TerrainData, lf: LocalFrame, parcel: Vec2[]): { ground: GroundFn; datumElevFt: number; elev: GroundFn } {
  return groundFromGrid(t.grid, lf, parcel);
}

/** Street names along the lot's street edges, for "rain runs toward the front (N Dover St)". */
export function streetsByEdge(frame: SiteFrame, streets: { name?: string | null; line: Vec2[] }[]): Partial<Record<Edge, string>> {
  const out: Partial<Record<Edge, string>> = {};
  const mids: Record<Edge, Vec2> = {
    x0: siteToLocal(frame, [-6, frame.widthFt / 2]),
    x1: siteToLocal(frame, [frame.lengthFt + 6, frame.widthFt / 2]),
    y0: siteToLocal(frame, [frame.lengthFt / 2, -6]),
    y1: siteToLocal(frame, [frame.lengthFt / 2, frame.widthFt + 6]),
  };
  for (const e of frame.streetEdges) {
    let best = 60;
    for (const s of streets) {
      const d = distanceToPolyline(mids[e], s.line);
      if (s.name && d < best) {
        best = d;
        out[e] = s.name.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
      }
    }
  }
  return out;
}

export function siteTerrain(
  t: TerrainData,
  g: { ground: GroundFn; datumElevFt: number; elev: GroundFn },
  parcel: Vec2[],
  frame: SiteFrame,
  streets: { name?: string | null; line: Vec2[] }[],
): SiteTerrain {
  const slope = slopeSummary(g.ground, parcel, frame);
  const named = streetsByEdge(frame, streets);
  const en = describeSlope(slope, frame, named, ptEnglish());
  const words = pt().locale === 'en' ? en : describeSlope(slope, frame, named, pt());
  return {
    source: t.grid.source,
    datumElevFt: g.datumElevFt,
    elev: g.elev,
    slope,
    words,
    summaryEn: [en.headline, ...en.more].join(' '),
    steepSlope: t.steepSlope,
  };
}

/** The line people read about where these numbers come from and how far to trust them. */
export function accuracyNote(src: ElevationSource, t: PlannerT = pt()): string {
  const vars = { source: src.name, year: src.year ? String(src.year) : '', cell: src.cellM };
  return src.year ? t('slope.accuracy', vars) : t('slope.accuracyNoYear', vars);
}

/** What other pages may use (project.extra.site.slope). */
export function slopeFacts(t: SiteTerrain, lf: LocalFrame, lotRef: string): SiteSlopeFacts {
  const ll = (p: Vec2) => lf.toLngLat(p).map((v) => Number(v.toFixed(7))) as [number, number];
  const r1 = (v: number) => Math.round(v * 10) / 10;
  const s = t.slope;
  return {
    lotRef,
    fallFt: r1(s.fallFt),
    avgSlopePct: r1(s.avgPct),
    ...(s.steepest ? { steepestPct: r1(s.steepest.pct) } : {}),
    ...(s.downhill && s.toward ? { drainToward: s.toward, drainBearingDeg: Math.round(((Math.atan2(s.downhill[0], s.downhill[1]) * 180) / Math.PI + 360) % 360) } : {}),
    flat: s.flat,
    high: ll(s.high.p),
    low: ll(s.low.p),
    ...(s.dip ? { dip: { lngLat: ll(s.dip.p), depthFt: r1(s.dip.depthFt) } } : {}),
    ...(t.steepSlope != null ? { steepSlopeArea: t.steepSlope } : {}),
    datumElevFt: r1(t.datumElevFt),
    // saved data: English in every language (other pages can build their own words from the facts)
    summary: t.summaryEn,
    source: `${t.source.name}${t.source.year ? ` (${t.source.year})` : ''}, ${t.source.cellM} m grid`,
  };
}
