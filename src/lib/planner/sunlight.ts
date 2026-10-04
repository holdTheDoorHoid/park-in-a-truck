// Where the 3D view's sun light stands and how deep its shadow camera reaches (far shade,
// 2026-10-04). Pure (no three) so it is tested.
//
// The shadow map is drawn from a light placed `distanceFt` from the lot, towards the sun. Its
// camera stays only as WIDE as the lot (set by the scene), so shadows on the lot stay sharp:
// any building that shades the lot lies along the line from the lot to the sun, so it projects
// onto that narrow window however far away it stands. What has to grow is the DEPTH: the light
// must stand beyond the farthest building that can shade the lot (a building behind the light
// casts no shadow), and the camera must reach from there to just past the lot.

import type { Vec2 } from './geo';
import type { Prism } from './sunhours';

/** The light's distance when every building is close by (as before far shade). */
export const LIGHT_MIN_DISTANCE_FT = 600;
/** How far past the lot (away from the sun) the shadow camera still sees ground. */
export const LIGHT_BEYOND_FT = 800;
/** Room between the farthest building and the light. */
const LIGHT_MARGIN_FT = 60;
/** The depth bias that suited the original 1,399-ft-deep shadow camera, in feet (kept the same in feet). */
const BIAS_FT = 0.0004 * 1399;

export interface SunLightRange {
  /** the light's distance from the lot's centre, ft */
  distanceFt: number;
  /** shadow camera near and far planes, ft from the light */
  near: number;
  far: number;
  /** shadow depth bias for that depth range (three.js units: a share of far − near) */
  bias: number;
}

/**
 * The light's distance and the shadow camera's depth for buildings around a lot. `target` is
 * the point the light looks at (the lot's centre, local feet, ground level 0).
 */
export function sunLightRange(prisms: Prism[], target: Vec2 = [0, 0]): SunLightRange {
  let max = 0;
  for (const b of prisms) {
    const top = (b.baseFt ?? 0) + b.heightFt;
    for (const [x, y] of b.ring) max = Math.max(max, Math.hypot(x - target[0], y - target[1], top));
  }
  const distanceFt = Math.max(LIGHT_MIN_DISTANCE_FT, Math.ceil((max + LIGHT_MARGIN_FT) / 50) * 50);
  const near = 1;
  const far = distanceFt + LIGHT_BEYOND_FT;
  return { distanceFt, near, far, bias: -BIAS_FT / (far - near) };
}

/**
 * Where the scene's fog has hidden everything (ft from the camera), given the far buildings
 * drawn: far enough that the farthest still shows as a pale shape, never so far that the edge
 * of the plain ground (3,000 ft out) shows. No far buildings: as before (4 × the scene's extent).
 */
export function fogFarFt(prisms: Prism[], extentFt: number, target: Vec2 = [0, 0]): number {
  let max = 0;
  for (const b of prisms) for (const [x, y] of b.ring) max = Math.max(max, Math.hypot(x - target[0], y - target[1]));
  return max ? Math.max(extentFt * 4, Math.min(2200, Math.ceil(max + 800))) : extentFt * 4;
}
