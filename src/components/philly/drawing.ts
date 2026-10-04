// The lot in "drawing" coordinates (feet; X right, Y down), turned so its long
// side runs across the page like the Assess workbook's "Diagram your lot":
// the entrance edge (x0) at the left and the right-hand side (y0) at the bottom.
// When the side street is on the LEFT (corner-left: street along y1) the drawing
// is turned half way round, so that street is at the bottom instead — a
// rotation, never a mirror, so the north arrow stays true.

import type { LngLat, LotRecord } from '../../lib/types';
import type { LotGeometry, ParcelEdge } from '../../lib/philly/types';
import { makeProjector } from '../../lib/philly/geo';
import { lotGeometry } from '../../lib/philly/choose';
import { feet } from '../../lib/philly/plain';

export type P = [number, number];

export interface DrawnEdge extends ParcelEdge {
  n: number;
  a: P;
  b: P;
  mid: P;
  /** outward unit normal (drawing coords) */
  out: P;
}

export interface LotDrawing {
  g: LotGeometry;
  flip: boolean;
  toDraw(ll: LngLat): P;
  polygon: P[];
  edges: DrawnEdge[];
  start: P;
  /** clockwise angle of north from "up" on the page, degrees */
  northDeg: number;
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
}

export function lotDrawing(lot: LotRecord | null): LotDrawing | null {
  const g = lotGeometry(lot);
  if (!lot || !g || lot.polygon.length < 3) return null;
  const pr = makeProjector(g.rect.center);
  const b = (g.rect.bearingDeg * Math.PI) / 180;
  const ux: P = [Math.sin(b), Math.cos(b)];
  const left: P = [-ux[1], ux[0]];
  const flip = g.streetEdges.includes('y1') && !g.streetEdges.includes('y0');
  const s = flip ? -1 : 1;
  const raw = (ll: LngLat): P => {
    const [x, y] = pr.toXY(ll);
    const px = x * ux[0] + y * ux[1];
    const py = x * left[0] + y * left[1];
    return [s * px, -s * py];
  };
  const pts = lot.polygon.map(raw);
  const minX = Math.min(...pts.map((p) => p[0]));
  const minY = Math.min(...pts.map((p) => p[1]));
  const toDraw = (ll: LngLat): P => {
    const [x, y] = raw(ll);
    return [x - minX, y - minY];
  };
  const polygon = lot.polygon.map(toDraw);
  const maxX = Math.max(...polygon.map((p) => p[0]));
  const maxY = Math.max(...polygon.map((p) => p[1]));
  // centroid for "outward"
  const cx = polygon.reduce((a, p) => a + p[0], 0) / polygon.length;
  const cy = polygon.reduce((a, p) => a + p[1], 0) / polygon.length;
  const edges: DrawnEdge[] = g.edges.map((e, i) => {
    const a = toDraw(e.from);
    const bb = toDraw(e.to);
    const mid: P = [(a[0] + bb[0]) / 2, (a[1] + bb[1]) / 2];
    const len = Math.hypot(bb[0] - a[0], bb[1] - a[1]) || 1;
    let out: P = [(bb[1] - a[1]) / len, -(bb[0] - a[0]) / len];
    if ((mid[0] - cx) * out[0] + (mid[1] - cy) * out[1] < 0) out = [-out[0], -out[1]];
    return { ...e, n: i + 1, a, b: bb, mid, out };
  });
  // north (0,1) in park coords is (ux·N, left·N) = (ux[1], left[1])
  const nx = s * ux[1];
  const ny = -s * left[1];
  const northDeg = (Math.atan2(nx, -ny) * 180) / Math.PI;
  return {
    g,
    flip,
    toDraw,
    polygon,
    edges,
    start: toDraw(g.startCorner),
    northDeg,
    bounds: { minX: 0, minY: 0, maxX, maxY },
  };
}

/** Rotation (deg) that keeps text along an edge readable (never upside down). */
export function textAngle(a: P, b: P): number {
  let ang = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
  if (ang > 90) ang -= 180;
  if (ang < -90) ang += 180;
  return ang;
}

/** "14.0 ft", in the page's language (see feet() in src/lib/philly/plain.ts). */
export const fmtFt = (n: number) => feet(n, 1);
