// The site in local feet: the lot outline, its oriented rectangle/site frame, and
// neighbouring buildings and City trees ready for the 3D scene and the sun study.

import type { GroundFn } from './ground';
import { buildingBase } from './terrain/slope';
import { makeGround, siteTerrain, type SiteTerrain } from './terrain';
import type { SiteFacts } from '../types';
import { area, centroid, distanceToRing, distanceToSegment, makeFrame, openRing, pointInPolygon, signedArea, type LocalFrame, type Vec2 } from './geo';
import { siteFrameFromFacts, type SiteFrame } from './rect';
import { treeFromDbh } from './catalog';
import type { Prism } from './sunhours';
import type { SiteContext } from './site';

export interface LocalTree {
  /** stable key for City trees: rounded lng,lat */
  key: string;
  x: number;
  y: number;
  heightFt: number;
  crownR: number;
  species?: string | null;
  dbhIn?: number | null;
  /** trunk stands on (or within 2 ft of) the lot */
  onLot: boolean;
}

export interface LocalSite {
  ctx: SiteContext;
  lf: LocalFrame;
  parcel: Vec2[];
  areaSqFt: number;
  frame: SiteFrame;
  buildings: Prism[];
  /**
   * Taller buildings farther away whose shadow can reach the lot (SiteContext.farBuildings).
   * They count for the sun (see shadeBuildings in sunstudy.ts) and are drawn plainer in 3D;
   * nothing else (street edges, neighbours, the camera) looks at them.
   */
  farBuildings?: Prism[];
  trees: LocalTree[];
  parcels: Vec2[][];
  streets: { name?: string | null; line: Vec2[] }[];
  /** half-size of the square the scene covers, ft */
  extentFt: number;
  /** ground height (ft above the lot's datum) at a local point; absent = flat. See ground.ts */
  ground?: GroundFn;
  /** elevation of the datum, ft above sea level (NAVD88), when terrain is known */
  datumElevFt?: number;
  /** ground heights' source, the slope summary and its words (terrain; absent = flat/unknown) */
  terrain?: SiteTerrain;
}

/** Keep the part of `ring` on the left of the directed line a→b (Sutherland–Hodgman, one edge). */
export function clipHalfPlane(ring: Vec2[], a: Vec2, b: Vec2): Vec2[] {
  const side = (p: Vec2) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
  const out: Vec2[] = [];
  for (let i = 0; i < ring.length; i++) {
    const p = ring[i]!;
    const q = ring[(i + 1) % ring.length]!;
    const sp = side(p);
    const sq = side(q);
    if (sp >= 0) out.push(p);
    if (sp >= 0 !== sq >= 0) {
      const t = sp / (sp - sq);
      out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
    }
  }
  return out;
}

/**
 * City building footprints and parcel lines don't always agree by a few feet. The lot is
 * vacant, so a neighbour's footprint that pokes into it is trimmed back to the lot line
 * nearest the building (otherwise walls stand in the park and shade cells wrongly).
 */
export function trimToLot(ring: Vec2[], parcel: Vec2[]): Vec2[] {
  const probe = (r: Vec2[]) => r.flatMap((p, i) => {
    const q = r[(i + 1) % r.length]!;
    return [p, [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2] as Vec2];
  });
  const inside = (p: Vec2, r: Vec2[]) => pointInPolygon(p, r) && distanceToRing(p, r) > 0.3;
  const overlaps = probe(ring).some((p) => inside(p, parcel)) || probe(parcel).some((p) => inside(p, ring));
  if (!overlaps) return ring;
  const ccw = signedArea(parcel) > 0;
  const c = centroid(ring);
  let best = -1;
  let bestD = Infinity;
  for (let i = 0; i < parcel.length; i++) {
    const a = parcel[i]!;
    const b = parcel[(i + 1) % parcel.length]!;
    const d = distanceToSegment(c, a, b);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  const a = parcel[best]!;
  const b = parcel[(best + 1) % parcel.length]!;
  // outside of a CCW ring is to the right of each edge, i.e. the left of b→a
  return ccw ? clipHalfPlane(ring, b, a) : clipHalfPlane(ring, a, b);
}

export function cityTreeKey(lngLat: [number, number]): string {
  return `${lngLat[0].toFixed(6)},${lngLat[1].toFixed(6)}`;
}

export function buildLocalSite(ctx: SiteContext, facts?: SiteFacts): LocalSite {
  const ring0 = openRing(ctx.lot.polygon);
  const n = ring0.length || 1;
  const origin: [number, number] = [ring0.reduce((s, p) => s + p[0], 0) / n, ring0.reduce((s, p) => s + p[1], 0) / n];
  const lf0 = makeFrame(origin);
  // re-centre on the true centroid so the lot sits at (0,0)
  const c = centroid(ring0.map(lf0.toLocal));
  const lf = makeFrame(lf0.toLngLat(c));
  const parcel = ring0.map(lf.toLocal);

  // Ground heights (terrain): datum = the lot's average elevation, so 0 on a flat lot
  const g = ctx.terrain ? makeGround(ctx.terrain, lf, parcel) : null;

  const buildings: Prism[] = [];
  for (const b of ctx.buildings) {
    const ring = openRing(b.polygon).map(lf.toLocal);
    if (ring.length < 3) continue;
    // A footprint that sits on the lot is a building that has since come down (the lot is
    // vacant): leave it out.
    const bc = centroid(ring);
    if (pointInPolygon(bc, parcel) && area(ring) > 30) continue;
    const trimmed = trimToLot(ring, parcel);
    if (trimmed.length < 3 || area(trimmed) < 4) continue;
    const heightFt = Math.max(8, b.heightFt || 25);
    if (g) {
      // City heights are measured from the lowest ground along the outline (see buildingBase);
      // the walls reach down to the lowest ground, a little into it so no gap shows.
      const { baseFt, refFt } = buildingBase(ring, g.elev, b.baseElevationFt);
      const base = baseFt - g.datumElevFt - 0.3;
      buildings.push({ ring: trimmed, heightFt: refFt - g.datumElevFt + heightFt - base, baseFt: base });
    } else buildings.push({ ring: trimmed, heightFt });
  }
  const farBuildings: Prism[] = [];
  const box = ctx.terrain?.grid;
  for (const b of ctx.farBuildings ?? []) {
    const ring = openRing(b.polygon).map(lf.toLocal);
    if (ring.length < 3) continue;
    const heightFt = Math.max(8, b.heightFt || 25);
    if (!g) {
      farBuildings.push({ ring, heightFt });
      continue;
    }
    // On the lidar grid: the same rule as the neighbours. Beyond it (the grid is about ±310 ft)
    // the City's own base elevation; the lidar's nearest edge only when the City has none.
    const onGrid = box && b.polygon.every(([x, y]) => x >= box.west && x <= box.east && y >= box.south && y <= box.north);
    const city = b.baseElevationFt != null && Number.isFinite(b.baseElevationFt) ? b.baseElevationFt : null;
    const { baseFt, refFt } = onGrid || city === null ? buildingBase(ring, g.elev, onGrid ? city : null) : { baseFt: city, refFt: city };
    const base = baseFt - g.datumElevFt - 0.3;
    farBuildings.push({ ring, heightFt: refFt - g.datumElevFt + heightFt - base, baseFt: base });
  }
  const parcels = ctx.parcels.map((p) => openRing(p.polygon).map(lf.toLocal)).filter((r) => r.length >= 3);
  const streets = ctx.streets.map((s) => ({ name: s.name, line: s.line.map(lf.toLocal) }));
  const trees: LocalTree[] = ctx.trees.map((t) => {
    const [x, y] = lf.toLocal(t.lngLat);
    const { heightFt, crownR } = treeFromDbh(t.dbhIn, t.heightFt);
    const onLot = pointInPolygon([x, y], parcel) || distanceToRing([x, y], parcel) < 2;
    // (tree bases are raised onto the ground by the tree drawing and the sun maths, from groundOf(site))
    return { key: cityTreeKey(t.lngLat), x, y, heightFt, crownR, species: t.species, dbhIn: t.dbhIn, onLot };
  });
  const frame = siteFrameFromFacts(facts, lf, { parcel, parcels, buildings: buildings.map((b) => b.ring), streets, address: ctx.lot.address });
  const extentFt = Math.max(180, Math.min(300, Math.max(frame.lengthFt, frame.widthFt) * 2 + 140));
  const site: LocalSite = { ctx, lf, parcel, areaSqFt: area(parcel), frame, buildings, trees, parcels, streets, extentFt };
  if (farBuildings.length) site.farBuildings = farBuildings;
  if (g && ctx.terrain) {
    site.ground = g.ground;
    site.datumElevFt = g.datumElevFt;
    site.terrain = siteTerrain(ctx.terrain, g, parcel, frame, streets);
  }
  return site;
}
