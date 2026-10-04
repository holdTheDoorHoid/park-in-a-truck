// What the planner needs to draw and offer each park element: a footprint, a height,
// a simple shape and a palette group. Names and ids come from src/data/elements.ts
// (owned by the pieces workstream); the numbers here are planner defaults used when an
// element has no footprint of its own. Plain words — the people using this are
// neighbours, not designers.

import { ELEMENTS } from '../../data/elements';

export type Shape = 'box' | 'bench' | 'table' | 'tree-small' | 'tree-large' | 'shrub' | 'square' | 'flat' | 'post' | 'barrel' | 'canopy';

export interface CatalogEntry {
  id: string;
  name: string;
  /** length (x) × width (y) in feet */
  w: number;
  h: number;
  heightFt: number;
  shape: Shape;
  group: PaletteGroup;
  /** fallback colour when the item has no theme */
  color: string;
}

export type PaletteGroup = 'Seating' | 'Tables' | 'Plants' | 'Planting & play' | 'Shade & stage' | 'Water & wildlife' | 'Garden tools';

export const PALETTE_GROUPS: PaletteGroup[] = ['Seating', 'Tables', 'Plants', 'Planting & play', 'Shade & stage', 'Water & wildlife', 'Garden tools'];

const WOOD = '#b98a5a';
const GABION = '#8d8f91';
const GREEN = '#4fae5c';

const D: Record<string, Omit<CatalogEntry, 'id' | 'name'>> = {
  'gabion-wall': { w: 6, h: 1.5, heightFt: 2.5, shape: 'box', group: 'Shade & stage', color: GABION },
  'gabion-bench': { w: 6, h: 2, heightFt: 1.5, shape: 'bench', group: 'Seating', color: GABION },
  'gabion-bench-8': { w: 8, h: 2, heightFt: 1.5, shape: 'bench', group: 'Seating', color: GABION },
  'bench-back': { w: 4, h: 2, heightFt: 3, shape: 'bench', group: 'Seating', color: WOOD },
  'bench-4': { w: 4, h: 1.5, heightFt: 1.5, shape: 'bench', group: 'Seating', color: WOOD },
  stool: { w: 1.25, h: 1.25, heightFt: 1.5, shape: 'box', group: 'Seating', color: WOOD },
  'flexible-seating': { w: 2, h: 2, heightFt: 2.5, shape: 'box', group: 'Seating', color: WOOD },
  'table-2': { w: 2, h: 2, heightFt: 2.5, shape: 'table', group: 'Tables', color: WOOD },
  'table-4': { w: 4, h: 2.5, heightFt: 2.5, shape: 'table', group: 'Tables', color: WOOD },
  'table-6': { w: 6, h: 2.5, heightFt: 2.5, shape: 'table', group: 'Tables', color: WOOD },
  'communal-table': { w: 8, h: 3, heightFt: 2.5, shape: 'table', group: 'Tables', color: WOOD },
  workbench: { w: 4, h: 2, heightFt: 3.5, shape: 'table', group: 'Tables', color: WOOD },
  'planter-18': { w: 1.5, h: 1.5, heightFt: 1.5, shape: 'box', group: 'Planting & play', color: WOOD },
  'planter-24': { w: 2, h: 2, heightFt: 2, shape: 'box', group: 'Planting & play', color: WOOD },
  'raised-bed': { w: 8, h: 4, heightFt: 1.5, shape: 'box', group: 'Planting & play', color: WOOD },
  'cold-frame': { w: 6, h: 3, heightFt: 1.5, shape: 'box', group: 'Garden tools', color: '#cfe6ee' },
  'planting-square': { w: 4, h: 4, heightFt: 0.4, shape: 'square', group: 'Planting & play', color: GREEN },
  'nature-play': { w: 4, h: 4, heightFt: 0.6, shape: 'flat', group: 'Planting & play', color: '#c9a36a' },
  'outdoor-classroom': { w: 12, h: 8, heightFt: 1.5, shape: 'bench', group: 'Seating', color: WOOD },
  'shade-canopy': { w: 8, h: 8, heightFt: 9, shape: 'canopy', group: 'Shade & stage', color: '#e9e4d8' },
  'event-tent': { w: 10, h: 10, heightFt: 9, shape: 'canopy', group: 'Shade & stage', color: '#ffffff' },
  stage: { w: 12, h: 8, heightFt: 2, shape: 'box', group: 'Shade & stage', color: WOOD },
  shed: { w: 6, h: 4, heightFt: 7, shape: 'box', group: 'Garden tools', color: '#9aa7ad' },
  'compost-bin': { w: 3, h: 3, heightFt: 3, shape: 'box', group: 'Garden tools', color: '#5b4a3a' },
  'rain-barrel': { w: 2, h: 2, heightFt: 3, shape: 'barrel', group: 'Water & wildlife', color: '#2f6f8f' },
  birdbath: { w: 1.5, h: 1.5, heightFt: 3, shape: 'barrel', group: 'Water & wildlife', color: '#b9c3c7' },
  'bird-accessories': { w: 1, h: 1, heightFt: 6, shape: 'post', group: 'Water & wildlife', color: '#6b5a4a' },
  perennial: { w: 1, h: 1, heightFt: 1.5, shape: 'shrub', group: 'Plants', color: '#6cc070' },
  shrub: { w: 3, h: 3, heightFt: 3, shape: 'shrub', group: 'Plants', color: '#d9c94a' },
  'small-tree': { w: 8, h: 8, heightFt: 15, shape: 'tree-small', group: 'Plants', color: '#3e9b52' },
  'large-tree': { w: 14, h: 14, heightFt: 28, shape: 'tree-large', group: 'Plants', color: '#2e8a45' },
};

export function catalogEntry(id: string): CatalogEntry {
  const meta = ELEMENTS[id];
  const d = D[id] ?? { w: 2, h: 2, heightFt: 2, shape: 'box' as Shape, group: 'Garden tools' as PaletteGroup, color: '#999999' };
  const fp = meta?.footprintFt;
  return {
    id,
    name: meta?.name ?? id.replace(/-/g, ' '),
    ...d,
    ...(fp ? { w: fp[0], h: fp[1] } : {}),
    ...(meta?.heightFt ? { heightFt: meta.heightFt } : {}),
  };
}

/** Elements a person can add from the palette, grouped. */
export function palette(): { group: PaletteGroup; items: CatalogEntry[] }[] {
  const ids = Object.keys(D);
  return PALETTE_GROUPS.map((group) => ({ group, items: ids.map(catalogEntry).filter((e) => e.group === group) })).filter(
    (g) => g.items.length,
  );
}

// ---- existing conditions (Assess) --------------------------------------------

export type ExistingKind = 'existing-tree' | 'downspout' | 'wet-area' | 'hydrant' | 'utility-pole' | 'utility-line' | 'old-pavement';

export interface ExistingMeta {
  id: ExistingKind;
  name: string;
  hint: string;
  /** what size control to show */
  size: 'canopy' | 'radius' | 'length' | 'rect' | 'none';
  defaults: { radiusFt?: number; lengthFt?: number; widthFt?: number };
  color: string;
}

export const EXISTING: ExistingMeta[] = [
  { id: 'existing-tree', name: 'Tree already there', hint: 'Set how wide its branches spread.', size: 'canopy', defaults: { radiusFt: 8 }, color: '#2e8a45' },
  { id: 'downspout', name: "Neighbor's downspout", hint: 'Where roof water comes out onto the lot.', size: 'none', defaults: {}, color: '#2f6f8f' },
  { id: 'wet-area', name: 'Area that gets wet', hint: 'Puddles or soggy ground after rain.', size: 'radius', defaults: { radiusFt: 5 }, color: '#3a8fd1' },
  { id: 'hydrant', name: 'Fire hydrant', hint: 'Keep it clear.', size: 'none', defaults: {}, color: '#d0342c' },
  { id: 'utility-pole', name: 'Utility pole', hint: 'Electric or phone pole.', size: 'none', defaults: {}, color: '#6b5a4a' },
  { id: 'utility-line', name: 'Overhead wires', hint: 'Wires crossing over the lot — no tall trees under them.', size: 'length', defaults: { lengthFt: 30 }, color: '#333333' },
  { id: 'old-pavement', name: 'Old pavement', hint: 'Concrete or asphalt still on the ground.', size: 'rect', defaults: { lengthFt: 10, widthFt: 8 }, color: '#9b9b95' },
];

export function existingMeta(id: string): ExistingMeta {
  return EXISTING.find((e) => e.id === id) ?? EXISTING[0]!;
}

/** Rough crown size from trunk diameter (DBH, inches) for City trees. */
export function treeFromDbh(dbhIn: number | null | undefined, heightFt?: number | null): { heightFt: number; crownR: number } {
  const d = Math.max(1, Math.min(60, dbhIn ?? 8));
  const crownR = Math.max(3, Math.min(30, 2 + 0.75 * d));
  const h = heightFt ?? Math.max(12, Math.min(85, 12 + 1.4 * d));
  return { heightFt: h, crownR };
}
