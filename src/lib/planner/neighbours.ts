// Is there a building next door? (fix round 2026-10-04, veteran S6). Pure, tested.
//
// "Mid-block" used to say "buildings on both sides" whatever stood there. This looks at
// the City's building footprints just outside the lot's two long sides instead.

import { distanceToRing, pointInPolygon, type Vec2 } from './geo';
import { siteToLocal, type SiteFrame } from './rect';

export interface SideNeighbours {
  /** a building stands along the side on your left / right as you walk in from the entrance */
  left: boolean;
  right: boolean;
}

/**
 * A side "has a building" when footprints cover at least a quarter of a line 3 ft
 * outside it (the lot's middle 90%, so a corner of a building across an alley doesn't count).
 */
export function sideNeighbours(frame: SiteFrame, buildings: Vec2[][], outFt = 3): SideNeighbours {
  const covered = (y: number) => {
    const n = 20;
    let hit = 0;
    for (let i = 0; i < n; i++) {
      const x = frame.lengthFt * (0.05 + (0.9 * (i + 0.5)) / n);
      const p = siteToLocal(frame, [x, y]);
      if (buildings.some((r) => pointInPolygon(p, r) || distanceToRing(p, r) < 0.75)) hit++;
    }
    return hit / n >= 0.25;
  };
  // site frame: +y is on your left as you walk in from the entrance edge (x0)
  return { left: covered(frame.widthFt + outFt), right: covered(-outFt) };
}

/** The words for a mid-block lot. */
export function midBlockWords(n: SideNeighbours): string {
  if (n.left && n.right) return 'Mid-block (buildings on both sides)';
  if (n.left) return 'Mid-block (a building on your left as you walk in, none on your right)';
  if (n.right) return 'Mid-block (a building on your right as you walk in, none on your left)';
  return 'Mid-block (no buildings right next to it)';
}
