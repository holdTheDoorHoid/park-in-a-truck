// Built furniture keeps its true built size (fix round 2026-10-04, build-lead A7/A2).
//
// The printed park pieces are drawings: the same 4' gabion bench is drawn 4 x 1.75,
// 3.75 x 2 or 5 x 1.75 ft, a café set 3.25–3.5 x 1.75–2.25 ft, a stool 1.5 or 2 ft
// square. A builder reading a size off the planner must get the size they will BUILD,
// so items that are built to a fixed size take it from src/data/elements.ts, turned the
// way the drawing runs. Things counted in modules keep their number of modules but each
// module is its true size: stages in 4' x 4' squares, shade canopies in 8' x 8'
// modules (a canopy drawn 8' x 4' is one 8' x 8' module). Planting, gravel and other
// surfaces still stretch with the seams; sized-to-fit things (raised beds, keyhole
// gardens, sheds, communal tables, compost bins …) keep the size they are drawn at.
// Owner: pieces workstream.

import { ELEMENTS } from '../../data/elements';

/** Elements built to one fixed size (a PiaT build guide, or a product drawn at its real size). */
export const FIXED_SIZE = new Set([
  'gabion-bench',
  'gabion-bench-8',
  'bench-back',
  'bench-4',
  'stool',
  'table-2',
  'table-4',
  'table-6',
  'workbench',
  'planter-18',
  'planter-24',
  // a 2-ft table with a chair pulled up at each side (the 3D view draws it at this size)
  'cafe-table',
  'rain-barrel',
]);

/** Elements counted in whole modules: the module's size along each axis, feet. */
export const MODULE_FT: Record<string, number> = {
  // "4' x 4' squares of stage"
  stage: 4,
  // "8' x 8' modules"
  'shade-canopy': 8,
};

/**
 * Whole modules along a drawn length: the nearest whole number, at least one; exactly
 * half way goes down (a canopy drawn 12 ft deep is one 8-ft module, not two), as the 3D
 * view lays them.
 */
export function wholeModules(len: number, module: number): number {
  return Math.max(1, Math.ceil(len / module - 0.5 - 1e-6));
}

/**
 * The footprint an item is built at, from the size it is drawn (or saved) at:
 * [w along the item's own x, h along its own y], feet. Returns the drawn size unchanged
 * for things that are sized to fit.
 */
export function builtSize(element: string, w: number, h: number): [number, number] {
  const fp = ELEMENTS[element]?.footprintFt;
  if (FIXED_SIZE.has(element) && fp) {
    const [long, short] = fp[0] >= fp[1] ? fp : [fp[1], fp[0]];
    // keep the drawing's direction: its longer side is the item's length
    return h > w + 1e-6 ? [short, long] : [long, short];
  }
  const m = MODULE_FT[element];
  if (m) return [wholeModules(w, m) * m, wholeModules(h, m) * m];
  return [w, h];
}
