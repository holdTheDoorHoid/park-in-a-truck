// How the site's estimate differs from Park in a Truck's spreadsheet.
//
// The owner's decision (2026-10-04): fix the math — same PiaT prices and
// assumptions, but double counts removed and broken lines repaired.
// estimate(inputs, { mode: 'sheet' }) still reproduces the spreadsheet exactly
// (the LibreOffice fixture tests prove it); the default, mode 'corrected',
// applies every fix below. Each fix can be switched off on its own, which is
// how the widget shows the dollar effect of each one and how the tests prove
// each one changes what it should. docs/piat-spreadsheet-issues.md describes
// the problems for the PiaT team. The words are in the cost catalog
// (src/i18n/messages/en/cost.ts, fix.* and kept.*).

import { EN, type CostKey, type CostT } from './text';

export type FixId =
  | 'toolRentalOnce'
  | 'playAreaOnce'
  | 'edgesOnce'
  | 'edgeSupportsSplit'
  | 'edgeGabionConnections'
  | 'woodToppedGabions'
  | 'gabionTables'
  | 'porchSwings'
  | 'stageCutLists'
  | 'samePrice'
  | 'wholeUnits'
  | 'priceNeeded'
  | 'perennialsPerSquare'
  | 'guideMaterials'
  | 'orderList';

export interface FixMeta {
  id: FixId;
  /** Short, plain title */
  label: string;
  /** What the spreadsheet does and what the site does instead */
  detail: string;
  /** Changes only the order list, not the estimate's total */
  orderListOnly?: boolean;
}

/** In the order the widget lists them (and the order their dollar effects are added up). */
const FIX_ORDER: { id: FixId; orderListOnly?: true }[] = [
  { id: 'toolRentalOnce' },
  { id: 'playAreaOnce' },
  { id: 'edgesOnce' },
  { id: 'edgeSupportsSplit' },
  { id: 'edgeGabionConnections' },
  { id: 'woodToppedGabions' },
  { id: 'gabionTables' },
  { id: 'porchSwings' },
  { id: 'stageCutLists' },
  { id: 'samePrice' },
  { id: 'wholeUnits' },
  { id: 'priceNeeded' },
  { id: 'perennialsPerSquare' },
  { id: 'guideMaterials' },
  { id: 'orderList', orderListOnly: true },
];

/** A fix's title and explanation in the reader's language (cost catalog: fix.<id>.label / .detail). */
export function fixText(id: FixId, t: CostT = EN): { label: string; detail: string } {
  return { label: t(`fix.${id}.label`), detail: t(`fix.${id}.detail`) };
}

/** Every fix, in English. */
export const FIXES: FixMeta[] = FIX_ORDER.map((f) => ({ ...f, ...fixText(f.id) }));

export const ALL_FIXES: FixId[] = FIXES.map((f) => f.id);

/**
 * Perennials in one 4' x 4' planting square: 5 in Park in a Truck's four plant-list
 * spreadsheets (INSERT HERE, "# of squares" × 5) and the plant picker
 * (src/data/plants.ts PLANTS_PER_SQUARE; a test keeps the two equal), 4 in the
 * cost spreadsheet (INSERT HERE C30).
 */
export const PERENNIALS_PER_SQUARE = 5;

const KEPT: CostKey[] = ['kept.gravel', 'kept.extra175', 'kept.prices', 'kept.stakes', 'kept.gravelEdges', 'kept.trellis', 'kept.noGuide', 'kept.mulch', 'kept.raisedBeds'];

/** Assumptions kept as the spreadsheet has them (not clearly errors), in the reader's language. */
export function keptAssumptions(t: CostT = EN): string[] {
  return KEPT.map((k) => t(k));
}

/** Assumptions kept as the spreadsheet has them (not clearly errors). */
export const KEPT_ASSUMPTIONS: string[] = keptAssumptions();
