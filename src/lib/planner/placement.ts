// Where the park rectangle sits on the lot.
//
// Park-local feet (ParkLayout): x along the park's length from its entrance, y across
// it. The park is placed in the site frame (rect.ts) with an optional mirror (flip),
// quarter turns and a small shift, then the site frame maps to local feet (ENU).

import type { DesignState, LngLat } from '../types';
import { bearingOf, distanceToRing, pointInPolygon, type LocalFrame, type Vec2 } from './geo';
import { siteToLocal, localToSite, type SiteFrame } from './rect';

export type Turn = 0 | 1 | 2 | 3;

export interface ParkPlacement {
  parkL: number;
  parkW: number;
  turn: Turn;
  flip: boolean;
  /** park -> site: site = M·park + t  (M row-major [a, b, c, d]) */
  m: [number, number, number, number];
  t: Vec2;
}

export function makePlacement(
  frame: Pick<SiteFrame, 'lengthFt' | 'widthFt'>,
  parkL: number,
  parkW: number,
  turn: Turn = 0,
  flip = false,
  shift: Vec2 = [0, 0],
): ParkPlacement {
  const Ls = frame.lengthFt;
  const Ws = frame.widthFt;
  // F mirrors y about the park's long centre line; R turns by 90°·turn (counter-clockwise).
  const f = flip ? -1 : 1;
  const cos = [1, 0, -1, 0][turn]!;
  const sin = [0, 1, 0, -1][turn]!;
  // M = R·F
  const m: [number, number, number, number] = [cos, -sin * f, sin, cos * f];
  // Where the park's centre goes: keep the entrance on the site's entrance edge when
  // the park runs the same way as the lot; centre it otherwise.
  const anchor: Vec2 =
    turn === 0 ? [parkL / 2, Ws / 2] : turn === 2 ? [Ls - parkL / 2, Ws / 2] : [Ls / 2, Ws / 2];
  anchor[0] += shift[0];
  anchor[1] += shift[1];
  const c: Vec2 = [parkL / 2, parkW / 2];
  const t: Vec2 = [anchor[0] - (m[0] * c[0] + m[1] * c[1]), anchor[1] - (m[2] * c[0] + m[3] * c[1])];
  return { parkL, parkW, turn, flip, m, t };
}

export function parkToSite(pl: ParkPlacement, [x, y]: Vec2): Vec2 {
  const [a, b, c, d] = pl.m;
  return [a * x + b * y + pl.t[0], c * x + d * y + pl.t[1]];
}

export function siteToPark(pl: ParkPlacement, [sx, sy]: Vec2): Vec2 {
  const [a, b, c, d] = pl.m;
  const det = a * d - b * c; // ±1
  const x = sx - pl.t[0];
  const y = sy - pl.t[1];
  return [(d * x - b * y) / det, (-c * x + a * y) / det];
}

export function parkToLocal(pl: ParkPlacement, frame: SiteFrame, p: Vec2): Vec2 {
  return siteToLocal(frame, parkToSite(pl, p));
}
export function localToPark(pl: ParkPlacement, frame: SiteFrame, p: Vec2): Vec2 {
  return siteToPark(pl, localToSite(frame, p));
}

/** Direction (local feet) of a park-local direction vector. */
export function parkDirToLocal(pl: ParkPlacement, frame: SiteFrame, [dx, dy]: Vec2): Vec2 {
  const [a, b, c, d] = pl.m;
  const sx = a * dx + b * dy;
  const sy = c * dx + d * dy;
  return [sx * frame.u[0] + sy * frame.v[0], sx * frame.u[1] + sy * frame.v[1]];
}

/** The value saved as DesignState.placement for other workstreams. */
export function placementSummary(pl: ParkPlacement, frame: SiteFrame, lf: LocalFrame): NonNullable<DesignState['placement']> {
  const o = parkToLocal(pl, frame, [0, 0]);
  const dir = parkDirToLocal(pl, frame, [1, 0]);
  const origin: LngLat = lf.toLngLat(o);
  return {
    originLngLat: [Number(origin[0].toFixed(7)), Number(origin[1].toFixed(7))],
    bearingDeg: Number(bearingOf(dir).toFixed(2)),
    flip: pl.flip || undefined,
  };
}

// ---- overhang: parts of the park that fall outside the parcel ---------------

export interface Overhang {
  /** 1-ft cells of the park rectangle (row-major, y rows of x): 1 = outside the lot */
  mask: Uint8Array;
  nx: number;
  ny: number;
  /** square feet of park outside the lot */
  outsideSqFt: number;
  /** ids of items that stick out past the lot line */
  items: string[];
}

export function computeOverhang(
  pl: ParkPlacement,
  frame: SiteFrame,
  parcelLocal: Vec2[],
  items: { id: string; x: number; y: number; w: number; h: number; rotationDeg: number }[] = [],
  tolerance = 0.4,
): Overhang {
  const ring = parcelLocal.map((p) => localToPark(pl, frame, p));
  const nx = Math.max(1, Math.ceil(pl.parkL));
  const ny = Math.max(1, Math.ceil(pl.parkW));
  const mask = new Uint8Array(nx * ny);
  let outside = 0;
  const out = (p: Vec2) => !pointInPolygon(p, ring) && distanceToRing(p, ring) > tolerance;
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const p: Vec2 = [Math.min(i + 0.5, pl.parkL), Math.min(j + 0.5, pl.parkW)];
      if (out(p)) {
        mask[j * nx + i] = 1;
        outside += Math.min(1, pl.parkL - i) * Math.min(1, pl.parkW - j);
      }
    }
  }
  const ids: string[] = [];
  for (const it of items) {
    const r = (it.rotationDeg * Math.PI) / 180;
    const c = Math.cos(r);
    const s = Math.sin(r);
    const pts: Vec2[] = [
      [0, 0],
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ].map(([a, b]) => {
      const dx = (a! * it.w) / 2;
      const dy = (b! * it.h) / 2;
      return [it.x + dx * c - dy * s, it.y + dx * s + dy * c] as Vec2;
    });
    if (pts.some(out)) ids.push(it.id);
  }
  return { mask, nx, ny, outsideSqFt: Math.round(outside), items: ids };
}
