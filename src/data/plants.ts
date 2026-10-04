// Plant lists + the Dream workbook's plant calculator, ported from the four
// theme plant-list spreadsheets (04_Dream_WORKBOOK_p20_<THEME>_PLANT_LIST).
// Data itself lives in plants.json (built by scripts/extract_plants.py from
// each sheet's "BACK-END" list; photos come from the "INSERT HERE" sheet's
// worked example, which is the only place the spreadsheets attach images).
//
// Owner: resources workstream. Consumed by PlantPicker and /plants.

import type { DesignTally, ThemeId } from '../lib/types';
import plantsData from './plants.json';

export type PlantType = 'large-tree' | 'small-tree' | 'shrub' | 'perennial';
/** 'both' = the workbook's plant list doesn't split this category by light
 * (every theme's "Large Trees" section, plus "Small Trees" in Nature/Event). */
export type Light = 'sun' | 'shade' | 'both';

export interface Plant {
  id: string;
  theme: ThemeId;
  botanical: string;
  common: string;
  type: PlantType;
  light: Light;
  matureSize: string | null;
  containerSize: string | null;
  unitCost: number | null;
  notes: string | null;
  photo: string | null;
}

export const PLANTS: Plant[] = plantsData as Plant[];

export const PLANT_TYPES: { id: PlantType; label: string }[] = [
  { id: 'large-tree', label: 'Large trees' },
  { id: 'small-tree', label: 'Small trees' },
  { id: 'shrub', label: 'Shrubs' },
  { id: 'perennial', label: 'Perennials' },
];

export function plantsFor(themes: ThemeId[]): Plant[] {
  return PLANTS.filter((p) => themes.includes(p.theme));
}

/** Plants in a type x light "bucket" (the picker's unit of counting), across
 * one or more themes. `light === 'both'` entries show up in either bucket,
 * since the source spreadsheet never split that category by sun/shade. */
export function plantsForBucket(themes: ThemeId[], type: PlantType, light: 'sun' | 'shade'): Plant[] {
  return PLANTS.filter((p) => themes.includes(p.theme) && p.type === type && (p.light === light || p.light === 'both'));
}

/** Small/large trees: the "Count your plants" page never splits these by sun
 * vs shade (one orange cell each), so the picker shows one combined bucket
 * regardless of light. */
export function plantsForType(themes: ThemeId[], type: PlantType): Plant[] {
  return PLANTS.filter((p) => themes.includes(p.theme) && p.type === type);
}

// ---------------------------------------------------------------------------
// The calculator, ported from each theme workbook's "INSERT HERE" sheet.
//
// The Dream workbook's "Count your plants" page (p.33) asks for: green
// squares in sun + in shade (perennials), shrubs in sun + in shade, small
// trees, and large trees. Every theme's spreadsheet does the same two things
// with those numbers:
//   - perennial squares x 5 = how many perennial PLANTS that is (a 4x4 ft
//     square holds 5 perennials/groundcover plants at typical spacing)
//   - shrubs / small trees / large trees are already plant counts, so they
//     pass straight through with no multiplier
// Then a "DOES THIS NUMBER MATCH YOUR TOTAL IN YOUR DESIGN?" cell compares
// that target against the sum of however many of each species you picked
// below it. The sheets never choose the species for you -- see `evenSplit`.
//
// Verified against the cached formula results (openpyxl data_only=True) in
// all four theme workbooks; see src/lib/__tests__/plants.test.ts.
// ---------------------------------------------------------------------------

export const PLANTS_PER_SQUARE = 5;

export interface PlantTargets {
  perennial: { sun: number; shade: number };
  shrub: { sun: number; shade: number };
  smallTree: number;
  largeTree: number;
}

export type TallyForPlants = Pick<DesignTally, 'plantingSquares' | 'shrubs' | 'smallTrees' | 'largeTrees'>;

/** How many plants of each kind the design needs, straight from the workbook's own math. */
export function plantCounts(tally: TallyForPlants): PlantTargets {
  return {
    perennial: {
      sun: tally.plantingSquares.sun * PLANTS_PER_SQUARE,
      shade: tally.plantingSquares.shade * PLANTS_PER_SQUARE,
    },
    shrub: { sun: tally.shrubs.sun, shade: tally.shrubs.shade },
    smallTree: tally.smallTrees,
    largeTree: tally.largeTrees,
  };
}

export interface PlantSelection {
  plantId: string;
  qty: number;
}

/**
 * The workbook leaves choosing WHICH species to people -- it only totals how
 * many plants each category needs (above) and checks your picks add up. This
 * spreads a target evenly across a set of candidate plants as a starting
 * point the person can then hand-adjust in the picker (largest remainder
 * first, so the count always adds up exactly to `target`).
 */
export function evenSplit(target: number, plantIds: string[]): PlantSelection[] {
  const n = plantIds.length;
  if (n === 0) return [];
  if (target <= 0) return plantIds.map((id) => ({ plantId: id, qty: 0 }));
  const base = Math.floor(target / n);
  let remainder = target - base * n;
  return plantIds.map((id) => {
    const extra = remainder > 0 ? 1 : 0;
    if (remainder > 0) remainder -= 1;
    return { plantId: id, qty: base + extra };
  });
}

export function selectionTotal(selections: PlantSelection[]): number {
  return selections.reduce((sum, s) => sum + s.qty, 0);
}

export function selectionCost(selections: PlantSelection[]): number {
  const byId = new Map(PLANTS.map((p) => [p.id, p]));
  return selections.reduce((sum, s) => sum + (byId.get(s.plantId)?.unitCost ?? 0) * s.qty, 0);
}

// ---------------------------------------------------------------------------
// project.extra.plants -- saved picker state (resources-owned key, see types.ts)
// ---------------------------------------------------------------------------

export interface PlantPickerState {
  v: 1;
  /** Theme(s) the person is choosing from (mixing two themes is allowed, per
   * the Dream workbook: "pick plants from both lists"). */
  themes: ThemeId[];
  /** plant id -> chosen quantity; absent/0 = not chosen. */
  qty: Record<string, number>;
  updatedAt: string;
}
