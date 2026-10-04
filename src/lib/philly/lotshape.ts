// Turn a parcel outline into what the workbooks ask about: long and short edge,
// area, which edges face a street, lot type (mid-block / corner / alley), and the
// park-local frame the pieces and planner use (DESIGN.md §6):
//
//   x runs along the LONG edge; x0 is the short edge on the street the lot is
//   addressed to (the entrance). Standing at x0 looking toward +x, y1 is on your
//   LEFT and y0 on your right. corner-left = a street along y1, corner-right =
//   a street along y0.
//
// "Faces a street" = a street centerline lies straight out from that side,
// roughly parallel to it, with no other parcel in between (streets and sidewalks
// are not parcels in the City's PWD parcel layer). When neighbouring parcels are
// unknown we fall back to "centerline within 45 ft".

import type { LngLat, LotKind } from '../types';
import { fitSize } from '../sizing';
import {
  bearingOf,
  centroid,
  distToPolyline,
  lineAngleDiff,
  makeProjector,
  minAreaRect,
  pointInRing,
  rayHitsSegment,
  roundTo,
  signedArea,
  simplifyRing,
  type XY,
} from './geo';
import type { EdgeId, LotGeometry, LotType, ParcelEdge, StreetSide } from './types';
import { titleCase } from './plain';

export interface ShapeStreet {
  line: LngLat[];
  name: string;
  class?: number;
}

export interface ShapeInput {
  polygon: LngLat[];
  /** Street of the lot's address, e.g. "N DOVER ST" (AIS street_full) */
  addressStreet?: string | null;
  streets: ShapeStreet[];
  /** Other parcels near the lot (outer rings). null/undefined = not known. */
  neighbours?: LngLat[][] | null;
  /** OPA building description, e.g. "VACANT LAND RESIDE < ACRE" */
  buildingDesc?: string | null;
}

/** Street classes that are not streets a lot can front (ramps, walkways, city boundary). */
const NOT_FRONTAGE = new Set([9, 10, 14, 15]);
const MAX_STREET_FT = 90;
const MAX_STREET_FT_NO_NEIGHBOURS = 45;
/** Narrower than this and long → a breezeway / alley lot */
const ALLEY_MAX_WIDTH = 11;

export const normStreet = (s: string | null | undefined) =>
  (s ?? '').toUpperCase().replace(/\s+/g, ' ').trim();

interface Side {
  key: 'endA' | 'endB' | 'sideA' | 'sideB';
  short: boolean;
  mid: XY;
  /** unit outward normal */
  n: XY;
  /** unit direction along the side */
  d: XY;
  half: number;
  street: { name: string; distanceFt: number } | null;
  blocked: boolean;
}

export function analyseLot(input: ShapeInput): LotGeometry | null {
  const poly = input.polygon;
  if (!poly || poly.length < 3) return null;
  const origin: LngLat = [
    poly.reduce((s, p) => s + p[0], 0) / poly.length,
    poly.reduce((s, p) => s + p[1], 0) / poly.length,
  ];
  const pr = makeProjector(origin);
  let ring = poly.map(pr.toXY);
  if (signedArea(ring) < 0) ring = ring.reverse();
  const areaSqFt = Math.abs(signedArea(ring));
  const rect = minAreaRect(ring);
  if (rect.length < 1 || rect.width < 0.5) return null;

  const { center: c, u, v, length: L, width: W } = rect;
  const add = (p: XY, q: XY, k = 1): XY => [p[0] + q[0] * k, p[1] + q[1] * k];
  const neg = (p: XY): XY => [-p[0], -p[1]];

  const sides: Side[] = [
    { key: 'endA', short: true, mid: add(c, u, -L / 2), n: neg(u), d: v, half: W / 2, street: null, blocked: false },
    { key: 'endB', short: true, mid: add(c, u, L / 2), n: u, d: v, half: W / 2, street: null, blocked: false },
    { key: 'sideA', short: false, mid: add(c, v, -W / 2), n: neg(v), d: u, half: L / 2, street: null, blocked: false },
    { key: 'sideB', short: false, mid: add(c, v, W / 2), n: v, d: u, half: L / 2, street: null, blocked: false },
  ];

  // Neighbouring parcels in feet; drop any that is really the lot itself (centre inside it).
  const neighbours = input.neighbours
    ? input.neighbours
        .filter((r) => r.length >= 3)
        .map((r) => r.map(pr.toXY))
        .filter((r) => !pointInRing(centroid(r), ring))
    : null;
  const streets = input.streets
    .filter((s) => s.line.length >= 2 && !NOT_FRONTAGE.has(s.class ?? 5))
    .map((s) => ({ name: normStreet(s.name), line: s.line.map(pr.toXY) }));
  const maxFt = neighbours ? MAX_STREET_FT : MAX_STREET_FT_NO_NEIGHBOURS;

  const inNeighbour = (p: XY) => (neighbours ?? []).some((r) => pointInRing(p, r));

  for (const s of sides) {
    // three probes along the side: centre and quarter points
    const probes = [0, -0.5, 0.5].map((k) => add(s.mid, s.d, k * s.half));
    let best: { name: string; distanceFt: number } | null = null;
    let blockedCount = 0;
    for (const p of probes) {
      let hit: { name: string; t: number } | null = null;
      for (const st of streets) {
        for (let i = 0; i < st.line.length - 1; i++) {
          const a = st.line[i]!;
          const b = st.line[i + 1]!;
          if (lineAngleDiff([b[0] - a[0], b[1] - a[1]], s.d) > 35) continue;
          const t = rayHitsSegment(p, s.n, a, b);
          if (t !== null && t <= maxFt && (!hit || t < hit.t)) hit = { name: st.name, t };
        }
      }
      // Anything parcelled between the side and the street (or within 8 ft when no street)?
      const reach = hit ? Math.max(3, hit.t - 8) : 8;
      let blocked = false;
      for (let d = 3; d <= reach; d += 4) {
        if (inNeighbour(add(p, s.n, d))) {
          blocked = true;
          break;
        }
      }
      if (blocked) blockedCount++;
      else if (hit && (!best || hit.t < best.distanceFt)) best = { name: hit.name, distanceFt: hit.t };
    }
    s.blocked = blockedCount >= 2;
    s.street = !s.blocked && best ? { name: best.name, distanceFt: roundTo(best.distanceFt, 1) } : null;
  }

  // ---- choose the entrance edge x0 ----------------------------------------------------
  const addr = normStreet(input.addressStreet);
  const ends = sides.filter((s) => s.short);
  const longs = sides.filter((s) => !s.short);
  const nearest = (list: Side[]) => list.slice().sort((a, b) => a.street!.distanceFt - b.street!.distanceFt)[0];
  let x0: Side | undefined =
    nearest(ends.filter((s) => s.street && addr && s.street.name === addr)) ?? nearest(ends.filter((s) => s.street));
  if (!x0) {
    const streetLong = nearest(longs.filter((s) => s.street && addr && s.street.name === addr)) ?? nearest(longs.filter((s) => s.street));
    if (streetLong) {
      // Only a long side touches a street: pick x0 so that side becomes y0 (on your right).
      x0 = streetLong.key === 'sideA' ? sides[0] : sides[1];
    } else {
      // No street found next to the lot: x0 = the short side nearest the address street.
      const addrLines = streets.filter((st) => st.name === addr);
      const d = (s: Side) => (addrLines.length ? Math.min(...addrLines.map((st) => distToPolyline(s.mid, st.line))) : 0);
      x0 = d(ends[0]!) <= d(ends[1]!) ? ends[0] : ends[1];
    }
  }
  const x1 = x0!.key === 'endA' ? sides[1]! : sides[0]!;
  const ux: XY = neg(x0!.n); // +x points into the lot from x0
  const left: XY = [-ux[1], ux[0]];
  const y1 = longs.find((s) => s.n[0] * left[0] + s.n[1] * left[1] > 0)!;
  const y0 = longs.find((s) => s !== y1)!;
  const byId: Record<EdgeId, Side> = { x0: x0!, x1, y0, y1 };

  const streetEdges = (['x0', 'x1', 'y0', 'y1'] as EdgeId[]).filter((k) => byId[k].street);
  const streetSides: StreetSide[] = streetEdges.map((k) => ({ side: k, name: byId[k].street!.name, distanceFt: byId[k].street!.distanceFt }));
  const lotKind: LotKind = streetEdges.includes('y1') ? 'corner-left' : streetEdges.includes('y0') ? 'corner-right' : 'interior';

  // ---- lot type --------------------------------------------------------------------------
  const desc = (input.buildingDesc ?? '').toUpperCase();
  const endsOnStreet = streetEdges.filter((k) => k === 'x0' || k === 'x1');
  const longsOnStreet = streetEdges.filter((k) => k === 'y0' || k === 'y1');
  const names = [...new Set(streetSides.map((s) => s.name))].map(title);
  const listNames = (n: string[]) => (n.length > 1 ? `${n.slice(0, -1).join(', ')} and ${n[n.length - 1]}` : n[0] ?? '');
  // Width where the lot meets each street end (a crooked strip can have a wide rectangle).
  const endWidth = (k: EdgeId) => {
    const s = byId[k];
    let w = 0;
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i]!;
      const b = ring[(i + 1) % ring.length]!;
      const mid: XY = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      const off = Math.abs((mid[0] - s.mid[0]) * s.n[0] + (mid[1] - s.mid[1]) * s.n[1]);
      if (off < 2 && lineAngleDiff([b[0] - a[0], b[1] - a[1]], s.d) < 20) w += Math.hypot(b[0] - a[0], b[1] - a[1]);
    }
    return w || W;
  };
  let lotType: LotType;
  let lotTypeReason: string;
  if (W < ALLEY_MAX_WIDTH && L / W >= 4) {
    lotType = 'alley';
    lotTypeReason = `Long and very narrow (${fmtFt(W)} wide, ${fmtFt(L)} long), like a breezeway or alley.`;
  } else if (endsOnStreet.length && longsOnStreet.length) {
    lotType = 'corner';
    lotTypeReason = `Streets on two sides: ${listNames(names)}.`;
  } else if (endsOnStreet.length === 2 && Math.max(endWidth('x0'), endWidth('x1')) <= 20) {
    lotType = 'alley';
    lotTypeReason = `A narrow strip that reaches streets at both ends (${listNames(names)}), like a passage across the block.`;
  } else if (/ALLEY|DRIVEWAY|PASSAGE/.test(desc)) {
    lotType = 'alley';
    lotTypeReason = 'City records describe it as an alley or passage.';
  } else if (endsOnStreet.length === 2) {
    lotType = 'mid-block';
    lotTypeReason = `Runs through the block, with streets at both ends (${listNames(names)}).`;
  } else if (streetSides.length) {
    lotType = 'mid-block';
    lotTypeReason = `Faces one street (${listNames(names)}) with neighbors on the other sides.`;
  } else {
    lotType = 'unknown';
    lotTypeReason = "We couldn't find a street right next to this lot — it may be reached by a driveway or alley.";
  }
  const irregular = areaSqFt / (L * W) < 0.8;
  if (irregular) lotTypeReason += ' Its shape is irregular, so the size is for the rectangle around it.';

  // ---- rectangle corners and the measuring start point --------------------------------------
  const cx0 = add(c, ux, -L / 2);
  const cx1 = add(c, ux, L / 2);
  const corner = (xEnd: XY, yLeft: boolean): XY => add(xEnd, left, yLeft ? W / 2 : -W / 2);
  const rc = [corner(cx0, false), corner(cx1, false), corner(cx1, true), corner(cx0, true)];
  // Start at the street corner of the entrance edge: on the y1 side when y1 is a street.
  const startRect = streetEdges.includes('y1') && !streetEdges.includes('y0') ? rc[3]! : rc[0]!;

  // ---- measured polygon edges ----------------------------------------------------------------
  let simple = simplifyRing(ring, 0.5);
  let si = 0;
  let sd = Infinity;
  simple.forEach((p, i) => {
    const d = Math.hypot(p[0] - startRect[0], p[1] - startRect[1]);
    if (d < sd) {
      sd = d;
      si = i;
    }
  });
  simple = [...simple.slice(si), ...simple.slice(0, si)];
  // walk the long side first, like the workbook's "Diagram your lot"
  const firstDir: XY = [simple[1]![0] - simple[0]![0], simple[1]![1] - simple[0]![1]];
  if (lineAngleDiff(firstDir, ux) > 45) simple = [simple[0]!, ...simple.slice(1).reverse()];

  const sideOf = (a: XY, b: XY): EdgeId | null => {
    const mid: XY = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const dir: XY = [b[0] - a[0], b[1] - a[1]];
    let bestK: EdgeId | null = null;
    let bestD = Infinity;
    for (const k of ['x0', 'x1', 'y0', 'y1'] as EdgeId[]) {
      const s = byId[k];
      if (lineAngleDiff(dir, s.d) > 20) continue;
      const off = Math.abs((mid[0] - s.mid[0]) * s.n[0] + (mid[1] - s.mid[1]) * s.n[1]);
      if (off < Math.max(1.5, 0.15 * W) && off < bestD) {
        bestD = off;
        bestK = k;
      }
    }
    return bestK;
  };

  const edges: ParcelEdge[] = simple.map((a, i) => {
    const b = simple[(i + 1) % simple.length]!;
    const side = sideOf(a, b);
    return {
      from: pr.toLngLat(a),
      to: pr.toLngLat(b),
      lengthFt: roundTo(Math.hypot(b[0] - a[0], b[1] - a[1]), 1),
      bearingDeg: roundTo(bearingOf(b[0] - a[0], b[1] - a[1]), 1),
      side,
      street: side && byId[side].street ? byId[side].street!.name : null,
    };
  });

  const fit = fitSize(L, W);
  return {
    lengthFt: roundTo(L, 1),
    widthFt: roundTo(W, 1),
    areaSqFt: Math.round(areaSqFt),
    rect: { center: pr.toLngLat(c), bearingDeg: roundTo(bearingOf(ux[0], ux[1]), 2) },
    rectCorners: rc.map(pr.toLngLat),
    rectangularity: roundTo(areaSqFt / (L * W), 3),
    irregular,
    edges,
    streetEdges,
    streets: streetSides,
    lotKind,
    lotType,
    lotTypeReason,
    size: { id: fit.size, exact: fit.exact, tooSmall: fit.tooSmall, tooBig: fit.tooBig },
    startCorner: pr.toLngLat(simple[0]!),
  };
}

function fmtFt(n: number) {
  return `${Math.round(n)} ft`;
}

const title = titleCase;
