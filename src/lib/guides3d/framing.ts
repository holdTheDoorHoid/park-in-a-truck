// Camera framing for the assembly viewer: the direction for a model's `view`
// hint and the distance that fits a box on screen. Pure maths.

import type { V3 } from './layout';

/** Default pleasant 3/4 view: from the front-left, a little above. */
export const DEFAULT_VIEW = { azimuthDeg: -35, elevationDeg: 26 };

/** Unit vector from the target to the camera. Azimuth 0 = from the front (+z), positive turns toward +x. */
export function viewDirection(azimuthDeg: number, elevationDeg: number): V3 {
  const az = (azimuthDeg * Math.PI) / 180;
  const el = (elevationDeg * Math.PI) / 180;
  return [Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)];
}

const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a: V3): V3 => {
  const l = Math.hypot(...a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

/**
 * Target (box centre) and distance so a perspective camera looking along
 * −`dir` sees every corner of the box, with `margin` (fraction of the view) to spare.
 */
export function fitBox(min: V3, max: V3, dir: V3, vfovDeg: number, aspect: number, margin = 0.08): { target: V3; distance: number } {
  const target: V3 = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2];
  const d = norm(dir);
  const fwd: V3 = [-d[0], -d[1], -d[2]];
  let right = cross(fwd, [0, 1, 0]);
  if (Math.hypot(...right) < 1e-6) right = [1, 0, 0];
  right = norm(right);
  const up = cross(right, fwd);
  const tanV = Math.tan((vfovDeg * Math.PI) / 360) * (1 - margin);
  const tanH = tanV * aspect;
  let distance = 0;
  for (const x of [min[0], max[0]])
    for (const y of [min[1], max[1]])
      for (const z of [min[2], max[2]]) {
        const p = sub([x, y, z], target);
        const depth = dot(p, d); // toward the camera
        distance = Math.max(distance, depth + Math.abs(dot(p, right)) / tanH, depth + Math.abs(dot(p, up)) / tanV);
      }
  return { target, distance };
}
