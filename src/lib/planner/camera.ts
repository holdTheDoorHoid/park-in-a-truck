// Where the 3D camera may go (fix round 2026-10-04, novice-phone F3). Pure, tested.
//
// Orbiting low on a phone used to put the camera inside a neighbour's house or flat
// against its wall, and the screen filled with grey. The camera now stays above eye
// height over the ground and never goes inside a building: over a building's footprint
// (and a little round it) it rides just above the roof. Buildings that still stand
// between the camera and the lot are drawn see-through (scene/xray.ts).

import type { GroundFn } from './ground';
import { bbox, distanceToRing, pointInPolygon, type Vec2 } from './geo';
import type { Prism } from './sunhours';

/** Lowest the camera may be over open ground: about eye height. */
export const EYE_FT = 5.5;
/** How far round a building the camera keeps off its walls, and how far above its roof it rides. */
export const WALL_CLEAR_FT = 2;
export const ROOF_CLEAR_FT = 3;

export interface CameraFloor {
  /** lowest height (feet above the datum) the camera may be at a local point */
  at(p: Vec2): number;
}

/** The camera's floor over the ground and the neighbours' roofs. */
export function cameraFloor(ground: GroundFn, buildings: Prism[]): CameraFloor {
  const boxes = buildings.map((b) => {
    const bb = bbox(b.ring);
    return { b, x0: bb.minX - WALL_CLEAR_FT, y0: bb.minY - WALL_CLEAR_FT, x1: bb.maxX + WALL_CLEAR_FT, y1: bb.maxY + WALL_CLEAR_FT };
  });
  return {
    at(p: Vec2): number {
      const g = ground(p[0], p[1]);
      let floor = (Number.isFinite(g) ? g : 0) + EYE_FT;
      for (const { b, x0, y0, x1, y1 } of boxes) {
        if (p[0] < x0 || p[0] > x1 || p[1] < y0 || p[1] > y1) continue;
        if (!pointInPolygon(p, b.ring) && distanceToRing(p, b.ring) > WALL_CLEAR_FT) continue;
        floor = Math.max(floor, (b.baseFt ?? 0) + b.heightFt + ROOF_CLEAR_FT);
      }
      return floor;
    },
  };
}

/** How far the camera may pull back, and how far the point it turns round may wander from the lot. */
export function cameraLimits(extentFt: number, lot: { lengthFt: number; widthFt: number }) {
  const span = Math.max(lot.lengthFt, lot.widthFt);
  return {
    maxDistance: Math.max(220, Math.min(700, extentFt * 1.8)),
    maxTargetRadius: Math.max(60, span / 2 + 60),
  };
}
