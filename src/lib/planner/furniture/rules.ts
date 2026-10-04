// Which real-furniture look each park element gets in the 3D view (pure, tested).
//
//   model       PiaT's build-guide model (src/data/guides/models/<slug>.json), repeated in
//               modules along the item the way PiaT counts it
//   gabion      wire baskets of stone, 12" x 12" x 48", one course (no guide model)
//   procedural  a simple, recognisable shape at real size (no PiaT guide)
//   block       today's plain block
//
// Plan view never uses any of this: it keeps the flat paper-pieces look.

import { ELEMENTS } from '../../../data/elements';
import type { GuideModel } from '../../guides3d/schema';
import { ft, type ModuleSpec } from './fit';

export interface ModelRule {
  kind: 'model';
  /** guide model slug */
  slug: string;
  repeatX: boolean;
  repeatY: boolean;
  under?: number;
  /** the stage: the whole 12' x 8' model, else 4' x 4' squares built the same way */
  squares?: number;
}

export type FurnitureRule = ModelRule | { kind: 'gabion' } | { kind: 'procedural' } | { kind: 'block' };

/** How each element with a PiaT build guide repeats (see `countAs` in src/data/elements.ts). */
const MODEL_RULES: Record<string, Omit<ModelRule, 'kind' | 'slug'>> = {
  // "4' modules"
  'gabion-bench': { repeatX: true, repeatY: false },
  'gabion-bench-8': { repeatX: true, repeatY: false },
  'bench-back': { repeatX: true, repeatY: false },
  'bench-4': { repeatX: true, repeatY: false },
  workbench: { repeatX: true, repeatY: false },
  // one each
  stool: { repeatX: false, repeatY: false },
  'table-2': { repeatX: false, repeatY: false },
  'table-4': { repeatX: false, repeatY: false },
  'table-6': { repeatX: false, repeatY: false },
  // boxes side by side (the guides also give 18" x 48" and 24" x 48" boxes)
  'planter-18': { repeatX: true, repeatY: true },
  'planter-24': { repeatX: true, repeatY: true },
  // "8' x 8' modules"; free-standing, so a drawn canopy may be larger than its modules
  'shade-canopy': { repeatX: true, repeatY: true, under: 0.5 },
  // the whole stage, or "4' x 4' squares of stage"
  stage: { repeatX: false, repeatY: false, squares: 4 },
};

/** Elements drawn as simple shapes of their own (no PiaT build guide). */
export const PROCEDURAL = new Set([
  'rain-barrel',
  'compost-bin',
  'raised-bed',
  'keyhole-garden',
  'cold-frame',
  'communal-table',
  'cafe-table',
  'event-tent',
  'flexible-seating',
  'birdbath',
  'bird-accessories',
  'shed',
  'hammock',
  'porch-swing',
  'solar-fountain',
  'outdoor-classroom',
  'nature-play',
  'gabion-table',
  'planting-square',
  'perennial',
  'shrub',
  'small-tree',
  'large-tree',
]);

export function furnitureRule(element: string): FurnitureRule {
  if (element === 'gabion-wall') return { kind: 'gabion' };
  const slug = ELEMENTS[element]?.guide;
  const r = MODEL_RULES[element];
  if (slug && r) return { kind: 'model', slug, ...r };
  if (PROCEDURAL.has(element)) return { kind: 'procedural' };
  return { kind: 'block' };
}

/**
 * A model's true size as a module (feet). Uses the size the parts actually build
 * (`asBuilt`) when the modeller gave one; x = length, z = depth, y = height.
 */
export function moduleOf(model: Pick<GuideModel, 'bounds' | 'asBuilt'>, rule: Pick<ModelRule, 'repeatX' | 'repeatY' | 'under'>): ModuleSpec {
  const b = model.asBuilt ?? model.bounds;
  return { lengthFt: ft(b.length), depthFt: ft(b.width), heightFt: ft(b.height), repeatX: rule.repeatX, repeatY: rule.repeatY, under: rule.under };
}

/** The stage's 4' x 4' square module (same height as the whole stage). */
export function stageSquareModule(model: Pick<GuideModel, 'bounds' | 'asBuilt'>, sizeFt: number): ModuleSpec {
  const b = model.asBuilt ?? model.bounds;
  return { lengthFt: sizeFt, depthFt: sizeFt, heightFt: ft(b.height), repeatX: true, repeatY: true };
}
