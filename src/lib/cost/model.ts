// Park in a Truck's cost estimator, ported from its spreadsheet (Dream workbook
// p.18). The sheet has five tabs: INSERT HERE (orange answer cells + summary),
// QUANTITES PER ITEM ("QPI": quantities and costs per item), ORDER LIST (what
// to buy, merged by material), MATERIAL CALCULATIONS (lumber cut lists, only
// constants reach the estimate) and an empty Sheet5.
//
// estimate(inputs, { mode: 'sheet' }) reproduces the sheet cell for cell,
// including its mistakes. The default, estimate(inputs), fixes them (the owner's
// decision: same PiaT prices and assumptions, double counts removed, broken
// lines repaired) — every fix is listed in corrections.ts and can be switched
// off on its own. docs/cost-model.md explains every formula;
// docs/piat-spreadsheet-issues.md lists the problems for the PiaT team. Tests: src/lib/cost/__tests__ (expected values come from a
// LibreOffice recalculation of the original file, scripts/analyze_cost_model.py).

import { CONTINGENCY, LUMBER, PRICES, UNPRICED_LUMBER_LINKS, lumberPrice, vendorOf, type Price } from './prices';
import { buildMergedOrderList, buildOrderList, type OrderListResult, type QpiQuantities } from './orderList';
import { ALL_FIXES, FIXES, PERENNIALS_PER_SQUARE, fixText, type FixId } from './corrections';
import { GUIDES, SHADE_GUIDE_SQFT, STAGE_GUIDE_SQUARES, guideLines, type GuideSlug } from './guides';
import { EN, bare, money as moneyIn, percent, price as priceIn, type CostT } from './text';

/**
 * The answers the spreadsheet asks for — its orange cells on the INSERT HERE
 * tab, plus three answer cells the sheet reads but forgot to colour (B55, B64,
 * B67, D104). Each doc comment quotes the sheet's question and names its cell.
 */
export interface CostInputs {
  // ---- BASE DESIGN ----
  /** "How many feet is the LONG side of your park?" (B5) */
  longSideFt: number;
  /** "How many feet is the SHORT side of your park?" (B7) */
  shortSideFt: number;
  /** "How many squares of planting (green squares) do you have?" (B9) */
  plantingSquares: number;
  /** "If you have a Nature Play area, how many squares do you have?" (B11) */
  naturePlaySquares: number;

  // ---- EDGING ----
  /** "Tally your edges around gravel in feet (Hint each square is 4')" (F19) */
  gravelEdgeFt: number;
  /** "Of the total, how many are on top of hardscape (concrete, asphalt, ect?)" (F20) — the sheet does not use it */
  gravelEdgeOnHardscapeFt: number;
  /** "Of the total, how many are on top of softscape (earth, soil)" (F21) — the sheet does not use it */
  gravelEdgeOnSoftscapeFt: number;
  /** "Tally the outside edges of your park, of gravel or planting, you don't have a building or a gabion edge in feet" (F23) */
  outerEdgeFt: number;
  /** "Of the total, how many are on top of hardscape (concrete, asphalt, ect?)" (F24) — the sheet does not use it */
  outerEdgeOnHardscapeFt: number;
  /** "Of the total, how many are on top of softscape (earth, soil)" (F25) — the sheet does not use it */
  outerEdgeOnSoftscapeFt: number;
  /** "How many times do these edges connect to a gabion?" (F26) — the sheet does not use it */
  outerEdgeGabionConnections: number;

  // ---- HOW MANY PLANTS DO YOU HAVE? (perennials = 4 per planting square, C30) ----
  /** "SHRUBS" (C31) */
  shrubs: number;
  /** "TREES- SM" (C32) */
  smallTrees: number;
  /** "TREES- LG" (C33) */
  largeTrees: number;

  // ---- GABIONS, RAISED BEDS ----
  /** "HOW MANY 1' GABION BASKETS DO YOU HAVE?" (B37) — 1'x1'x4' baskets */
  gabionBaskets: number;
  /** "Do you have raised beds? How many feet are your wood edges?" (F44) — the sheet does not use it */
  raisedBedWoodEdgeFt: number;
  /** "How many connections to gabions do you have?" (F45) */
  raisedBedGabionConnections: number;

  // ---- FURNISHINGS ----
  /** "HOW MANY 4' 18" WOOD TOPPED GABIONS DO YOU HAVE?" (B51) — the answer cell is gone and the subtotal is #REF!, so $0 */
  woodToppedGabions: number;
  /** "HOW MANY WOOD BENCHES WITH BACKS AND ARMRESTS DO YOU HAVE?" (B55, not coloured orange) */
  benchesWithBackAndArms: number;
  /** "HOW MANY WOOD BENCHES WITH BACKS DO YOU HAVE?" (B58) */
  benchesWithBack: number;
  /** "HOW MANY WOOD BENCHES WITHOUT BACKS DO YOU HAVE?" (B61) */
  benchesNoBack: number;
  /** "HOW MANY SQUARE WOOD TABLES DO YOU HAVE?" (B64, not coloured orange) — priced as the 2' table */
  squareTables: number;
  /** "HOW MANY STOOLS DO YOU HAVE?" (B67, not coloured orange) */
  stools: number;
  /** "HOW MANY WOOD TOPPED GABIONS TABLES DO YOU HAVE" (B70) — worked out, but left out of the total */
  gabionTables: number;
  /** "HOW MANY SQUARES OF STAGE DO YOU HAVE?" (B73) — only 2, 3 or 4 squares (8', 12', 16') are priced */
  stageSquares: number;
  /** "HOW MANY 12x8 TRELLIS DO YOU HAVE?" (B77) */
  trellises: number;

  // ---- FURNISHINGS WITH A BUILD GUIDE BUT NO SPREADSHEET QUESTION (site-added) ----
  // Priced from the guide (corrections.ts guideMaterials). With that fix off, and
  // in sheet mode, they are answered the way the spreadsheet would take them:
  // 4' and 6' tables as long tables, an 8' gabion bench as two 4' wood-topped
  // gabions, shade structures as 12x8 trellises; planters and workbenches have
  // no line there.
  /** 8' wood-topped gabion benches (8' Gabion Bench guide) */
  gabionBenches8: number;
  /** 4' tables (4' Table guide) */
  tables4: number;
  /** 6' tables (6' Table guide) */
  tables6: number;
  /** 18" planter boxes (18" Planter Box guide, the 18"x18" box) */
  planters18: number;
  /** 24" planter boxes (24" Planter Box guide, the 24"x24" box) */
  planters24: number;
  /** Workbenches / standing tables (Workbench guide) */
  workbenches: number;
  /** 8'x8' shade structures (Shade guide) */
  shadeStructures: number;

  // ---- ADDITIONAL FURNISHINGS (approximate; no PiaT instructions) ----
  /** "HOW MANY LONG TABLES DO YOU HAVE?" (B87) */
  longTables: number;
  /** "HOW MANY COMPOST BINS DO YOU HAVE?" (B90) */
  compostBins: number;
  /** "HOW MANY KEYHOLE GARDENS DO YOU HAVE?" — LARGE (B94) */
  keyholeGardensLarge: number;
  /** "HOW MANY KEYHOLE GARDENS DO YOU HAVE?" — MEDIUM (C94) */
  keyholeGardensMedium: number;
  /** "HOW MANY KEYHOLE GARDENS DO YOU HAVE?" — SMALL (D94) */
  keyholeGardensSmall: number;

  // ---- OFF THE SHELF FURNISHINGS ----
  /** "HOW MANY SQUARES OF SHED DO YOU HAVE?" — 1 SQUARE (4'x4') (B104) */
  sheds4x4: number;
  /** "HOW MANY SQUARES OF SHED DO YOU HAVE?" — 2 SQUARES (4'x8') (D104, not coloured orange) */
  sheds4x8: number;
  /** "HOW MANY CISTERNS DO YOU HAVE?" — 1 SQUARE (4'x4') (B108) — the sheet's subtotal is a fixed $0 */
  cisterns4x4: number;
  /** "HOW MANY CISTERNS DO YOU HAVE?" — 2 SQUARES (4'x8') (D108) — the sheet's subtotal is a fixed $0 */
  cisterns4x8: number;
  /** "HOW MANY RAIN BARRELLS DO YOU HAVE?" (B111) — "FREE!" */
  rainBarrels: number;
  /** "HOW MANY CAFE TABLES AND CHAIRS DO YOU HAVE?" (B114) — the sheet's subtotal is a fixed $0 */
  cafeTableSets: number;
  /** "HOW MANY SQUARES OF COLD FRAMES DO YOU HAVE?" (B117) */
  coldFrameSquares: number;

  // ---- OFF THE SHELF OPTIONAL FURNISHINGS ("add in how many you would like under the 'NUMBER' column") ----
  /** "CAFE TABLES + CHAIRS" (D126) */
  optCafeTableSets: number;
  /** "FOUNTAIN WITH SOLAR PUMP" (D127) */
  fountains: number;
  /** "BIRD BATH" (D128) */
  birdBaths: number;
  /** "BIRD HOUSE" (D129) */
  birdHouses: number;
  /** "EVENT TENT" (D130) */
  eventTents: number;
  /** "ADORANDAK CHAIR" (D131) */
  adirondackChairs: number;
  /** "FREE-STANDING HAMMOCK" (D132) */
  hammocks: number;
  /** "PORCH SWING" (D133) — the sheet prices swings with the hammock count instead */
  porchSwings: number;
  /** "TRASH CAN" (D134) */
  trashCans: number;
  /** "SOLAR LIGHTS" (D135) */
  solarLights: number;

  // ---- TOTAL ----
  /** "ADD ANY OTHER ADDITIONAL COSTS YOU MIGHT NEED" (F145), dollars */
  otherCosts: number;
}

export type CostInputKey = keyof CostInputs;

/** Where each answer goes on the INSERT HERE tab (null: the sheet has no answer cell). */
export const INPUT_CELLS: Record<CostInputKey, string | null> = {
  longSideFt: 'B5',
  shortSideFt: 'B7',
  plantingSquares: 'B9',
  naturePlaySquares: 'B11',
  gravelEdgeFt: 'F19',
  gravelEdgeOnHardscapeFt: 'F20',
  gravelEdgeOnSoftscapeFt: 'F21',
  outerEdgeFt: 'F23',
  outerEdgeOnHardscapeFt: 'F24',
  outerEdgeOnSoftscapeFt: 'F25',
  outerEdgeGabionConnections: 'F26',
  shrubs: 'C31',
  smallTrees: 'C32',
  largeTrees: 'C33',
  gabionBaskets: 'B37',
  raisedBedWoodEdgeFt: 'F44',
  raisedBedGabionConnections: 'F45',
  woodToppedGabions: null,
  benchesWithBackAndArms: 'B55',
  benchesWithBack: 'B58',
  benchesNoBack: 'B61',
  squareTables: 'B64',
  stools: 'B67',
  gabionTables: 'B70',
  stageSquares: 'B73',
  trellises: 'B77',
  gabionBenches8: null,
  tables4: null,
  tables6: null,
  planters18: null,
  planters24: null,
  workbenches: null,
  shadeStructures: null,
  longTables: 'B87',
  compostBins: 'B90',
  keyholeGardensLarge: 'B94',
  keyholeGardensMedium: 'C94',
  keyholeGardensSmall: 'D94',
  sheds4x4: 'B104',
  sheds4x8: 'D104',
  cisterns4x4: 'B108',
  cisterns4x8: 'D108',
  rainBarrels: 'B111',
  cafeTableSets: 'B114',
  coldFrameSquares: 'B117',
  optCafeTableSets: 'D126',
  fountains: 'D127',
  birdBaths: 'D128',
  birdHouses: 'D129',
  eventTents: 'D130',
  adirondackChairs: 'D131',
  hammocks: 'D132',
  porchSwings: 'D133',
  trashCans: 'D134',
  solarLights: 'D135',
  otherCosts: 'F145',
};

export const INPUT_KEYS = Object.keys(INPUT_CELLS) as CostInputKey[];

/** Questions the site adds (furnishings with a build guide but no spreadsheet question). */
export const SITE_INPUTS: CostInputKey[] = ['gabionBenches8', 'tables4', 'tables6', 'planters18', 'planters24', 'workbenches', 'shadeStructures'];

/**
 * The site-added questions answered the way the spreadsheet would take them,
 * for its own lines (sheet mode, or the guideMaterials fix switched off).
 */
export function foldIntoSheet(i: CostInputs): CostInputs {
  return {
    ...i,
    longTables: i.longTables + i.tables4 + i.tables6,
    woodToppedGabions: i.woodToppedGabions + 2 * i.gabionBenches8,
    trellises: i.trellises + (i.shadeStructures > 0 ? roundUp((i.shadeStructures * SHADE_GUIDE_SQFT) / (12 * 8)) : 0),
    gabionBenches8: 0,
    tables4: 0,
    tables6: 0,
    shadeStructures: 0,
  };
}

/** Every answer zero. */
export const emptyInputs: CostInputs = Object.fromEntries(INPUT_KEYS.map((k) => [k, 0])) as unknown as CostInputs;

/** The example answers sitting in the orange cells of the downloaded sheet. */
export const defaultInputs: CostInputs = {
  ...emptyInputs,
  longSideFt: 27,
  shortSideFt: 56,
  plantingSquares: 7,
  naturePlaySquares: 0,
  shrubs: 10,
  smallTrees: 2,
  largeTrees: 0,
  gabionTables: 4,
  trellises: 2,
  longTables: 5,
};

// ---- output ------------------------------------------------------------------

export type CategoryId =
  | 'layout'
  | 'soil'
  | 'gravel'
  | 'playArea'
  | 'gravelEdge'
  | 'outerEdge'
  | 'planting'
  | 'gabions'
  | 'doubleCounted'
  | 'furnishings'
  | 'additional'
  | 'offTheShelf'
  | 'optional'
  | 'contingency';

export interface CategoryMeta {
  id: CategoryId;
  label: string;
  /** The INSERT HERE cell(s) this category's subtotal reproduces */
  sheet: string;
  /** Which of the sheet's totals it rolls into */
  part: 'base' | 'furnishings' | 'contingency';
}

const CATEGORY_CELLS: Omit<CategoryMeta, 'label'>[] = [
  { id: 'layout', sheet: 'F14', part: 'base' },
  { id: 'soil', sheet: 'F15', part: 'base' },
  { id: 'gravel', sheet: 'F16', part: 'base' },
  { id: 'playArea', sheet: 'F17', part: 'base' },
  { id: 'gravelEdge', sheet: 'F22', part: 'base' },
  { id: 'outerEdge', sheet: 'F27 = F46', part: 'base' },
  { id: 'planting', sheet: 'F34', part: 'base' },
  { id: 'gabions', sheet: 'F42', part: 'base' },
  { id: 'doubleCounted', sheet: 'F48', part: 'base' },
  { id: 'furnishings', sheet: 'F80', part: 'furnishings' },
  { id: 'additional', sheet: 'F97', part: 'furnishings' },
  { id: 'offTheShelf', sheet: 'F121', part: 'furnishings' },
  { id: 'optional', sheet: 'F136', part: 'furnishings' },
  { id: 'contingency', sheet: 'F143:F145', part: 'contingency' },
];

/** The categories, labelled in the reader's language (cost catalog: cat.<id>). */
export function categories(t: CostT = EN): CategoryMeta[] {
  return CATEGORY_CELLS.map((c) => ({ id: c.id, label: t(`cat.${c.id}`), sheet: c.sheet, part: c.part }));
}

/** The categories, in English. */
export const CATEGORIES: CategoryMeta[] = categories();

export interface CostLine {
  category: CategoryId;
  /** Sub-heading inside a category, e.g. "4' bench with back" */
  group?: string;
  item: string;
  /** The quantity the sheet multiplies by the unit price (not always a whole number — see notes) */
  qty: number;
  unit: string;
  unitPrice: number;
  total: number;
  vendor?: string;
  link?: string;
  notes?: string;
  /** false = shown for completeness, but the PiaT sheet leaves it out of its totals */
  inTotal: boolean;
  /** QUANTITES PER ITEM (or INSERT HERE) cells this line reproduces */
  cells?: { qty?: string; price?: string; total?: string };
  /** Same material = one order-list row ("lumber:2x4x8", "wood-screw", …) */
  material?: string;
  /** Corrected mode: the spreadsheet has no price for this line; the person can give one (PriceNeededItem id) */
  priceId?: string;
  /** No price yet: left out of the total */
  needsPrice?: boolean;
  /** The unit price is the person's own */
  userPrice?: boolean;
  /** Priced from this build guide (src/data/guides/<slug>.json) */
  guide?: GuideSlug;
}

/** The INSERT HERE summary cells, by name. */
export interface SheetSummary {
  layout: number; // F14
  soil: number; // F15
  gravel: number; // F16
  playArea: number; // F17
  gravelEdge: number; // F22
  outerEdge: number; // F27
  perennials: number; // C30
  planting: number; // F34
  gabions: number; // F42
  raisedBeds: number; // F46
  baseDesign: number; // F48
  /** F53: #REF! in the sheet (null); corrected, the QPI rows 90–97 subtotal */
  woodToppedGabions: number | null;
  benchesWithBackAndArms: number; // F56
  benchesWithBack: number; // F59
  benchesNoBack: number; // F62
  squareTables: number; // F65
  stools: number; // F68
  gabionTables: number; // F71
  stage: number; // F74
  trellises: number; // F78
  baseFurnishings: number; // F80
  longTables: number; // F88
  compostBins: number; // F91
  keyholeGardens: number; // F95
  additional: number; // F97
  sheds: number; // F105
  cisterns: number; // F109
  rainBarrels: number; // F112
  cafeTables: number; // F115
  coldFrames: number; // F118
  offTheShelf: number; // F121
  optCafeTables: number; // F126
  fountains: number; // F127
  birdBaths: number; // F128
  birdHouses: number; // F129
  eventTents: number; // F130
  adirondackChairs: number; // F131
  hammocks: number; // F132
  porchSwings: number; // F133
  trashCans: number; // F134
  solarLights: number; // F135
  optional: number; // F136
  totalCosts: number; // F142
  toolRental: number; // F143
  contingency: number; // F144
  otherCosts: number; // F145
  finalCost: number; // F146
}

export const SUMMARY_CELLS: Record<keyof SheetSummary, string> = {
  layout: 'F14',
  soil: 'F15',
  gravel: 'F16',
  playArea: 'F17',
  gravelEdge: 'F22',
  outerEdge: 'F27',
  perennials: 'C30',
  planting: 'F34',
  gabions: 'F42',
  raisedBeds: 'F46',
  baseDesign: 'F48',
  woodToppedGabions: 'F53',
  benchesWithBackAndArms: 'F56',
  benchesWithBack: 'F59',
  benchesNoBack: 'F62',
  squareTables: 'F65',
  stools: 'F68',
  gabionTables: 'F71',
  stage: 'F74',
  trellises: 'F78',
  baseFurnishings: 'F80',
  longTables: 'F88',
  compostBins: 'F91',
  keyholeGardens: 'F95',
  additional: 'F97',
  sheds: 'F105',
  cisterns: 'F109',
  rainBarrels: 'F112',
  cafeTables: 'F115',
  coldFrames: 'F118',
  offTheShelf: 'F121',
  optCafeTables: 'F126',
  fountains: 'F127',
  birdBaths: 'F128',
  birdHouses: 'F129',
  eventTents: 'F130',
  adirondackChairs: 'F131',
  hammocks: 'F132',
  porchSwings: 'F133',
  trashCans: 'F134',
  solarLights: 'F135',
  optional: 'F136',
  totalCosts: 'F142',
  toolRental: 'F143',
  contingency: 'F144',
  otherCosts: 'F145',
  finalCost: 'F146',
};

/** A line that the spreadsheet cannot price: the person types a unit price. */
export interface PriceNeededItem {
  /** Key for the saved price (costInputs.unitPrices), e.g. "lumber:4x4x6" */
  id: string;
  item: string;
  /** Total quantity across every line that uses this price */
  qty: number;
  unit: string;
  /** Where it is used ("4' bench with back", …) */
  usedIn: string[];
  /** The person's price, when they gave one */
  price?: number;
}

export interface CorrectionEffect {
  id: FixId;
  label: string;
  detail: string;
  /** Change to the final cost for these answers (0 for order-list-only fixes) */
  effect: number;
}

export interface CorrectionReport {
  /** The spreadsheet's FINAL COST for these answers */
  sheetTotal: number;
  /** Each fix, applied in order; the effects add up to (total − sheetTotal − pricesAdded) */
  fixes: CorrectionEffect[];
  /** What the prices the person filled in add */
  pricesAdded: number;
  /** The spreadsheet's own order-list total (ORDER LIST!O71) vs ours */
  sheetOrderListTotal: number;
  orderListTotal: number;
}

export interface Estimate {
  mode: 'sheet' | 'corrected';
  /** Every priced thing, grouped by category (what the subtotals add up) */
  lines: CostLine[];
  /** Category subtotals; they add up to `total` */
  subtotals: Record<CategoryId, number>;
  /** The INSERT HERE summary, cell by cell (corrected values in corrected mode) */
  summary: SheetSummary;
  /** FINAL COST: total costs + tool rental + contingency + other costs */
  total: number;
  /** What to buy, merged by material, with where and delivery times */
  orderList: OrderListResult;
  /** Things in these answers that the estimate cannot price or count properly, in plain words */
  warnings: string[];
  /** Lines with no price in the spreadsheet (corrected mode); unpriced ones are left out of the total */
  priceNeeded: PriceNeededItem[];
  /** Corrected mode: how this differs from the spreadsheet, fix by fix */
  corrections?: CorrectionReport;
}

export interface EstimateOptions {
  /** 'corrected' (default): the spreadsheet with its mistakes fixed. 'sheet': exactly as the spreadsheet computes it. */
  mode?: 'sheet' | 'corrected';
  /** Corrected mode only: which fixes to apply (default: all). For tests and the fix-by-fix breakdown. */
  fixes?: readonly FixId[];
  /** Corrected mode only: the person's unit prices for "price needed" lines, by PriceNeededItem id */
  unitPrices?: Record<string, number>;
  /** The language of the estimate's words (line names, notes, warnings, order list). Default: English. */
  t?: CostT;
}

// ---- spreadsheet arithmetic ----------------------------------------------------

/**
 * ROUNDUP(x, 0) as spreadsheets do it: away from zero, after rounding off
 * floating-point noise (LibreOffice's approxCeil works at 15 significant digits).
 */
export function roundUp(x: number): number {
  if (!Number.isFinite(x) || x === 0) return 0;
  const a = Number(Math.abs(x).toPrecision(15));
  return Math.sign(x) * Math.ceil(a);
}

const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

/** Fill in missing or invalid answers with 0. */
export function normaliseInputs(partial: Partial<CostInputs>): CostInputs {
  const out = { ...emptyInputs };
  for (const k of INPUT_KEYS) out[k] = n(partial[k]);
  return out;
}

// ---- the estimate ----------------------------------------------------------------

/**
 * The cost estimate. By default the spreadsheet's mistakes are fixed
 * (src/lib/cost/corrections.ts); `{ mode: 'sheet' }` reproduces the
 * spreadsheet exactly, mistakes included.
 */
export function estimate(inputs: Partial<CostInputs>, options: EstimateOptions = {}): Estimate {
  const i = normaliseInputs(inputs);
  const t = options.t ?? EN;
  if (options.mode === 'sheet') return compute(i, new Set(), {}, 'sheet', t);
  const chosen = new Set<FixId>(options.fixes ?? ALL_FIXES);
  const prices = Object.fromEntries(Object.entries(options.unitPrices ?? {}).filter(([, v]) => typeof v === 'number' && Number.isFinite(v) && v >= 0));
  const result = compute(i, chosen, prices, 'corrected', t);

  // Fix by fix: apply them in order and record what each changes (totals only: English is enough).
  const sheet = compute(i, new Set(), {}, 'sheet', EN);
  const applied = new Set<FixId>();
  let before = sheet.total;
  const fixes: CorrectionEffect[] = [];
  for (const f of FIXES) {
    if (!chosen.has(f.id)) continue;
    applied.add(f.id);
    const after = compute(i, applied, {}, 'corrected', EN).total;
    fixes.push({ id: f.id, ...fixText(f.id, t), effect: after - before });
    before = after;
  }
  result.corrections = {
    sheetTotal: sheet.total,
    fixes,
    pricesAdded: result.total - before,
    sheetOrderListTotal: sheet.orderList.total,
    orderListTotal: result.orderList.total,
  };
  return result;
}

function compute(answers: CostInputs, fixes: ReadonlySet<FixId>, userPrices: Record<string, number>, mode: 'sheet' | 'corrected', t: CostT): Estimate {
  const fx = (id: FixId) => fixes.has(id);
  /** Money in the estimate's words */
  const money = (v: number) => moneyIn(t, v);
  const price = (v: number) => priceIn(t, v);
  /** Several sentences of a note, in order */
  const sentences = (...xs: (string | false | undefined)[]) => xs.filter(Boolean).join(' ');
  /** Furniture with a build guide is priced from the guide; otherwise the site-added questions go to the spreadsheet's own. */
  const guides = fx('guideMaterials');
  const i = guides ? answers : foldIntoSheet(answers);
  /** Whole units for purchases the spreadsheet leaves fractional */
  const whole = (x: number) => (fx('wholeUnits') ? roundUp(x) : x);
  /** The corrected estimate works in cents, so the totals are the sums of the rounded lines. */
  const cents = (v: number) => (mode === 'corrected' ? Math.round(v * 100 + (v >= 0 ? 1e-7 : -1e-7)) / 100 : v);
  const lines: CostLine[] = [];
  const warnings: string[] = [];
  const needed = new Map<string, PriceNeededItem>();

  /** Adds a line; returns what it adds to the total (0 when left out). */
  function add(
    category: CategoryId,
    item: string,
    qty: number,
    unit: string,
    price: Price | number,
    total: number,
    o: {
      group?: string;
      notes?: string;
      inTotal?: boolean;
      link?: string;
      cells?: CostLine['cells'];
      keepZero?: boolean;
      /** Merge key for the order list (same material = one row) */
      material?: string;
      /** This line has no price in the spreadsheet: ask the person (corrected mode) */
      priceId?: string;
      guide?: GuideSlug;
    } = {},
  ): number {
    if (!o.keepZero && qty === 0 && total === 0) return 0;
    const p = typeof price === 'number' ? undefined : price;
    const link = o.link ?? p?.link;
    // a spreadsheet link to a different size than the item: say so on the line
    if (p?.wrongSize && link === p.link && mode === 'corrected')
      o = { ...o, notes: sentences(o.notes, t('note.wrongSize', { size: p.wrongSize })) };
    let unitPrice = typeof price === 'number' ? price : price.price;
    let inTotal = o.inTotal ?? true;
    let needsPrice: boolean | undefined;
    let userPrice: boolean | undefined;
    if (o.priceId && fx('priceNeeded')) {
      const given = userPrices[o.priceId];
      const entry = needed.get(o.priceId) ?? { id: o.priceId, item, qty: 0, unit, usedIn: [], price: given };
      entry.qty += qty;
      if (o.group && !entry.usedIn.includes(o.group)) entry.usedIn.push(o.group);
      needed.set(o.priceId, entry);
      if (given !== undefined) {
        unitPrice = given;
        total = qty * given;
        userPrice = true;
      } else {
        unitPrice = 0;
        total = 0;
        inTotal = false;
        needsPrice = true;
      }
    }
    total = cents(total);
    lines.push({
      category,
      group: o.group,
      item,
      qty,
      unit,
      unitPrice,
      total,
      vendor: vendorOf(link),
      link,
      notes: o.notes,
      inTotal,
      cells: o.cells,
      material: o.material,
      priceId: fx('priceNeeded') ? o.priceId : undefined,
      needsPrice,
      userPrice,
      guide: o.guide,
    });
    return inTotal ? total : 0;
  }
  const P = PRICES;
  const lumber = (size: string) => LUMBER[size] ?? { price: lumberPrice(size), unit: 'ea.', cells: [], link: UNPRICED_LUMBER_LINKS[size] };
  /** Options for a lumber line: merge by size; ask for a price when the sheet has none. */
  const wood = (size: string, extra: Parameters<typeof add>[6] = {}) => ({
    material: `lumber:${size}`,
    priceId: lumberPrice(size) === 0 ? `lumber:${size}` : undefined,
    notes: lumberPrice(size) === 0 && !fx('priceNeeded') ? t('note.noSizePrice') : undefined,
    ...extra,
  });

  // ---- QPI "BASE": park size ----
  const L = i.longSideFt;
  const W = i.shortSideFt;
  const area = L * W; // C5
  const perimeter = L * 2 + W * 2; // C12
  const greenSf = i.plantingSquares * 4 * 4; // C6, C18
  const playSf = i.naturePlaySquares * 4 * 4; // C7, C34

  // ---- LAYOUT (QPI "STAGING", rows 11–15) ----
  const squaresB11 = area / 4; // B11 — area/4, although a 4'x4' square is 16 sq ft (kept)
  const J12 = roundUp(perimeter / 100);
  const C13 = squaresB11 / 5;
  const J13 = whole(C13 / 25); // D13: the sheet does not round up
  const J14 = roundUp(area / 1000);
  let M15 = 0;
  M15 += add('layout', t('line.erosionControl'), J12, 'roll', P.erosionControl, P.erosionControl.price * J12, {
    notes: t('note.erosion'),
    material: 'erosion-control',
    cells: { qty: 'J12', price: 'L12', total: 'M12' },
  });
  M15 += add('layout', t('line.stakes'), J13, 'package', P.stakes, P.stakes.price * J13, {
    notes: fx('wholeUnits') ? t('note.stakes') : t('note.stakesSheet'),
    material: 'stakes',
    cells: { qty: 'J13', price: 'L13', total: 'M13' },
  });
  M15 += add('layout', t('line.markingPaint'), J14, 'can', P.markingPaint, P.markingPaint.price * J14, {
    notes: t('note.paint'),
    material: 'marking-paint',
    cells: { qty: 'J14', price: 'L14', total: 'M14' },
  });

  // ---- SOIL (rows 18–22) ----
  const J19 = roundUp((greenSf * 0.5) / 27); // 6" deep, cubic yards
  const J20 = roundUp((greenSf * 0.18) / 27); // 2" of mulch
  const C21 = whole((J20 + J19) / 18);
  let M22 = 0;
  M22 += add('soil', t('line.soil'), J19, 'CY', P.soil, P.soil.price * J19, { notes: t('note.soil'), material: 'soil', cells: { qty: 'J19', price: 'L19', total: 'M19' } });
  // The Create workbook (Phase 6: Plant) says "install 4" of mulch"; the spreadsheet buys 2". Kept, with a note
  // showing 4" at the spreadsheet's own 4" depth (0.33 ft, as for the play area).
  const mulch4 = roundUp((greenSf * 0.33) / 27);
  M22 += add('soil', t('line.mulch2'), J20, 'CY', P.mulch, P.mulch.price * J20, {
    material: 'mulch',
    cells: { qty: 'J20', price: 'L20', total: 'M20' },
    notes:
      greenSf > 0
        ? t('note.mulch4', { cy: mulch4, cost: money(mulch4 * P.mulch.price) })
        : undefined,
  });
  M22 += add('soil', t('line.delivery'), C21, 'load (18 CY)', P.soilDelivery, P.soilDelivery.price * C21, {
    notes: fx('wholeUnits') ? t('note.delivery') : t('note.deliverySheet'),
    material: 'soil-delivery',
    cells: { qty: 'C21', price: 'L21', total: 'M21' },
  });

  // ---- GRAVEL (rows 25–31) ----
  const H26 = (area * 0.17) / 27; // 2" over the whole park
  const J26 = roundUp(H26 * 1.4); // tons
  const H27 = (area * 0.17) / 27;
  const J27 = roundUp(H27 * 1.4);
  const J28 = roundUp(area / 400);
  const J29 = roundUp((area * 0.2) / 100);
  const J30 = roundUp((H26 + H27) / 24);
  const wholePark = t('note.wholePark');
  let M31 = 0;
  M31 += add('gravel', t('line.redTipple'), J26, 'TONS', P.redTipple, P.redTipple.price * J26, { notes: wholePark, material: 'red-tipple', cells: { qty: 'J26', price: 'L26', total: 'M26' } });
  M31 += add('gravel', t('line.cleanStone'), J27, 'TONS', P.cleanStone, P.cleanStone.price * J27, {
    notes: wholePark,
    material: 'clean-stone',
    cells: { qty: 'J27', price: 'L27', total: 'M27' },
  });
  M31 += add('gravel', t('line.filterFabric'), J28, 'ROLL', P.filterFabric, P.filterFabric.price * J28, { notes: t('note.filterFabric'), material: 'filter-fabric', cells: { qty: 'J28', price: 'L28', total: 'M28' } });
  M31 += add('gravel', t('line.staples'), J29, 'BOX', P.staples, P.staples.price * J29, { notes: t('note.staples'), material: 'staples', cells: { qty: 'J29', price: 'L29', total: 'M29' } });
  M31 += add('gravel', t('line.delivery'), J30, 'TRIP', P.gravelDelivery, P.gravelDelivery.price * J30, { notes: t('note.gravelDelivery'), material: 'gravel-delivery', cells: { qty: 'J30', price: 'L30', total: 'M30' } });

  // ---- PLAY AREA (rows 34–35) ----
  const J35 = roundUp((playSf * 0.33) / 27);
  const M35 = add('playArea', t('line.mulch4'), J35, 'CY', P.playMulch, P.playMulch.price * J35, { material: 'mulch', cells: { qty: 'J35', price: 'L35', total: 'M35' } });

  // ---- WOOD EDGE FOR GRAVEL (rows 64–74) ----
  const C64 = i.gravelEdgeFt;
  const C65 = C64 / 12;
  const D67 = C64 / 5;
  const C67 = roundUp(D67 / 3) / 8;
  const J65 = roundUp(C65 + C67);
  const J67 = roundUp(C67);
  const C68 = whole(D67);
  const C69 = C68 * 2;
  const C70 = C68 * 2;
  const perFive = fx('wholeUnits') ? t('note.perFive') : t('note.perFiveSheet');
  let M74 = 0;
  M74 += add('gravelEdge', t('line.boards', { size: '1x4x12' }), J65, 'EA', P.board1x4x12, P.board1x4x12.price * J65, {
    notes: t('note.board1x4x12'),
    material: 'lumber:1x4x12',
    cells: { qty: 'J65', price: 'L65', total: 'M65' },
  });
  M74 += add('gravelEdge', t('line.gravelEdgeSupport', { size: '2x4x8' }), J67, 'EA', P.edgeSupport2x4x8, P.edgeSupport2x4x8.price * J67, {
    notes: t('note.gravelEdgeSupport'),
    material: 'lumber:2x4x8',
    cells: { qty: 'J67', price: 'L67', total: 'M67' },
  });
  // The two edging blocks link different L-brackets (a 2" double-wide brace here, a 5" brace for the outer
  // edges) at the same price: separate order-list rows.
  M74 += add('gravelEdge', t('line.lBrackets'), C68, 'EA', P.lBracket, P.lBracket.price * C68, {
    notes: sentences(perFive, t('note.lBracket2in')),
    material: 'l-bracket-2in',
    cells: { qty: 'J68', price: 'L68', total: 'M68' },
  });
  const selfDrivingNote = t('note.selfDriving', { price: price(P.selfDrivingScrew.price) });
  M74 += add('gravelEdge', t('line.selfDrivingScrews'), C69, 'EA', P.selfDrivingScrew, P.selfDrivingScrew.price * C69, {
    notes: selfDrivingNote,
    material: 'self-driving-screw',
    cells: { qty: 'J69', price: 'L69', total: 'M69' },
  });
  M74 += add('gravelEdge', t('line.concreteScrews'), C70, 'EA', P.concreteScrew, P.concreteScrew.price * C70, { material: 'concrete-screw', cells: { qty: 'J70', price: 'L70', total: 'M70' } });

  // ---- RAISED BEDS - TO GABIONS = the outer edges (rows 76–87) ----
  const C76 = i.outerEdgeFt;
  const split = fx('edgeSupportsSplit') && i.outerEdgeOnHardscapeFt + i.outerEdgeOnSoftscapeFt > 0;
  const hardFt = split ? i.outerEdgeOnHardscapeFt : C76; // sheet: D79 = C76/5 (the whole edge)
  const softFt = split ? i.outerEdgeOnSoftscapeFt : C76; // sheet: D84 = D79
  const C77 = roundUp(C76 / 12);
  const D79 = hardFt / 5;
  const C79 = roundUp(D79 / 2 / 8);
  const C80 = whole(D79);
  const C81 = C80 * 2;
  const C82 = C80 * 2;
  const C84 = roundUp(softFt / 5 / 1.5 / 8);
  const connections = fx('edgeGabionConnections') ? i.outerEdgeGabionConnections + i.raisedBedGabionConnections : i.raisedBedGabionConnections;
  const J86 = roundUp(connections / 4);
  let M87 = 0;
  M87 += add('outerEdge', t('line.boards', { size: '1x6x12' }), C77, 'EA', P.board1x6x12Edge, P.board1x6x12Edge.price * C77, {
    notes: t('note.board1x6x12', { edge: price(P.board1x6x12Edge.price), list: price(lumberPrice('1x6x12')) }),
    material: 'lumber:1x6x12',
    cells: { qty: 'J77', price: 'L77', total: 'M77' },
  });
  M87 += add('outerEdge', t('line.supportHard', { size: '2x4x8' }), C79, 'EA', lumber('2x4x8'), lumberPrice('2x4x8') * C79, {
    notes: split ? t('note.fromHardFeet') : t('note.hardWhole'),
    material: 'lumber:2x4x8',
    cells: { qty: 'J79', price: 'L79', total: 'M79' },
  });
  M87 += add('outerEdge', t('line.lBrackets'), C80, 'EA', { ...P.lBracket, link: P.lBracket.alt }, P.lBracket.price * C80, {
    notes: sentences(perFive, split && t('note.onHardscape'), t('note.lBracket5in')),
    material: 'l-bracket-5in',
    cells: { qty: 'J80', price: 'L80', total: 'M80' },
  });
  M87 += add('outerEdge', t('line.selfDrivingScrews'), C81, 'EA', P.selfDrivingScrew, P.selfDrivingScrew.price * C81, {
    notes: selfDrivingNote,
    material: 'self-driving-screw',
    cells: { qty: 'J81', price: 'L81', total: 'M81' },
  });
  M87 += add('outerEdge', t('line.concreteScrews'), C82, 'EA', P.concreteScrew, P.concreteScrew.price * C82, { material: 'concrete-screw', cells: { qty: 'J82', price: 'L82', total: 'M82' } });
  M87 += add('outerEdge', t('line.supportSoft', { size: '2x4x8' }), C84, 'EA', lumber('2x4x8'), lumberPrice('2x4x8') * C84, {
    notes: split ? t('note.fromSoftFeet') : t('note.softWhole'),
    material: 'lumber:2x4x8',
    cells: { qty: 'J84', price: 'L84', total: 'M84' },
  });
  M87 += add('outerEdge', t('line.edgeToGabion', { size: '2x4x8' }), J86, 'EA', lumber('2x4x8'), lumberPrice('2x4x8') * J86, {
    notes: fx('edgeGabionConnections') ? t('note.edgeToGabion') : t('note.edgeToGabionSheet'),
    material: 'lumber:2x4x8',
    cells: { qty: 'J86', price: 'L86', total: 'M86' },
  });
  if (fx('edgeSupportsSplit') && C76 > 0 && !split) warnings.push(t('warn.edgeSplit'));
  if (split && Math.abs(i.outerEdgeOnHardscapeFt + i.outerEdgeOnSoftscapeFt - C76) > 1e-9)
    warnings.push(t('warn.edgeSplitSum', { split: i.outerEdgeOnHardscapeFt + i.outerEdgeOnSoftscapeFt, total: C76 }));

  // ---- PLANTING (rows 39–43) ----
  // INSERT HERE!C30 = squares x 4; PiaT's four plant-list spreadsheets count 5 per square (corrections.ts)
  const perSquare = fx('perennialsPerSquare') ? PERENNIALS_PER_SQUARE : 4;
  const C39 = i.plantingSquares * perSquare;
  let M43 = 0;
  M43 += add('planting', t('line.perennials'), C39, 'EA', P.perennial, P.perennial.price * C39, {
    notes: fx('perennialsPerSquare') ? t('note.perennials', { per: bare(t, perSquare) }) : t('note.perennialsSheet'),
    material: 'perennial',
    cells: { qty: 'J39', price: 'L39', total: 'M39' },
  });
  M43 += add('planting', t('line.shrubs'), i.shrubs, 'EA', P.shrub, P.shrub.price * i.shrubs, { material: 'shrub', cells: { qty: 'J40', price: 'L40', total: 'M40' } });
  M43 += add('planting', t('line.smallTrees'), i.smallTrees, 'EA', P.smallTree, P.smallTree.price * i.smallTrees, { material: 'tree-small', cells: { qty: 'J41', price: 'L41', total: 'M41' } });
  M43 += add('planting', t('line.largeTrees'), i.largeTrees, 'EA', P.largeTree, P.largeTree.price * i.largeTrees, {
    notes: t('note.largeTree', { large: price(P.largeTree.price), small: price(P.smallTree.price) }),
    material: 'tree-large',
    cells: { qty: 'J42', price: 'L42', total: 'M42' },
  });

  // ---- GABIONS 12" x 12" x 4' (rows 48–54) ----
  const C48 = i.gabionBaskets * 4 * 1; // cubic feet
  const J49 = i.gabionBaskets;
  const J50 = roundUp((C48 / 27) * 1.4);
  let M54 = 0;
  M54 += add('gabions', t('line.gabionBaskets1ft'), J49, 'EA', P.gabionBasket, P.gabionBasket.price * J49, {
    notes: t('note.gabionWall'),
    material: 'gabion-basket',
    cells: { qty: 'J49', price: 'L49', total: 'M49' },
  });
  M54 += add('gabions', t('line.stoneFill'), J50, 'TONS', P.stoneFill, P.stoneFill.price * J50, {
    notes: t('note.stoneFill'),
    material: 'stone-fill',
    cells: { qty: 'J50', price: 'L50', total: 'M50' },
  });

  // ---- base design total: F48 = F46+F42+F34+F16+F15+F14+F22+F17+F27+F17 ----
  // The sheet adds F17 (play area) twice, and F27 and F46 both point at QPI!M87.
  let F48 = M87 + M54 + M43 + M31 + M22 + M15 + M74 + M35;
  if (!fx('playAreaOnce'))
    F48 += add('doubleCounted', t('line.playAgain'), 1, '', M35, M35, {
      notes: t('note.playAgain'),
      cells: { total: 'M35' },
    });
  if (!fx('edgesOnce'))
    F48 += add('doubleCounted', t('line.edgesAgain'), 1, '', M87, M87, {
      notes: t('note.edgesAgain'),
      cells: { total: 'M87' },
    });

  // ---- FURNISHINGS ----
  /**
   * Furniture from its build guide (corrections.ts guideMaterials): the guide's own materials and hardware,
   * priced with the spreadsheet's prices, lumber checked against the cut list (guides.ts).
   */
  const fromGuide = (slug: GuideSlug, n: number, note?: string): number => {
    if (n <= 0) return 0;
    const g = GUIDES[slug];
    const name = t(g.keys.name);
    const group = n === 1 ? name : t('piece.times', { name, count: n });
    let sum = 0;
    guideLines(slug, n, t).forEach((gl, k) => {
      const notes = sentences(k === 0 && note, gl.notes, !gl.price && !fx('priceNeeded') && t('note.noPriceZero'));
      sum += add('furnishings', gl.item, gl.qty, gl.unit, gl.price ?? 0, (gl.price?.price ?? 0) * gl.qty, {
        group,
        notes: notes || undefined,
        material: gl.material,
        priceId: gl.price ? undefined : gl.priceId,
        link: gl.link,
        guide: slug,
      });
    });
    return sum;
  };
  let M97: number | null = null;
  let M106 = 0,
    M127 = 0,
    M138 = 0,
    M152 = 0,
    M165 = 0;
  /** Furnishings with a guide but no spreadsheet question (4' and 6' tables, planters, workbenches, 8' gabion benches, shade) */
  let guideOnly = 0;

  if (guides) {
    M97 = fromGuide('gabion-bench', i.woodToppedGabions);
    guideOnly += fromGuide('gabion-bench-8', i.gabionBenches8);
    // both of the spreadsheet's bench-with-back questions are the Bench + Back guide (it has armrests)
    M127 = fromGuide('bench-back', i.benchesWithBack + i.benchesWithBackAndArms);
    M138 = fromGuide('bench-4', i.benchesNoBack);
    M152 = fromGuide('table-2', i.squareTables);
    guideOnly += fromGuide('table-4', i.tables4);
    guideOnly += fromGuide('table-6', i.tables6);
    M165 = fromGuide('stool', i.stools);
    guideOnly += fromGuide('planter-18', i.planters18);
    guideOnly += fromGuide('planter-24', i.planters24);
    guideOnly += fromGuide('workbench', i.workbenches);
  } else {
    // 4' 18" wood-topped gabions (QPI rows 90–97): the answer cell is gone and F53 = #REF!.
    if (fx('woodToppedGabions')) {
      const b = i.woodToppedGabions;
      const group = t('piece.woodToppedGabion');
      const C92 = b * 4 * 2 * 1.5; // cubic feet
      const J94 = roundUp((C92 / 27) * 1.4);
      const C95 = roundUp(5.5 * b);
      const C96 = 36 * b;
      M97 = 0;
      M97 += add('furnishings', t('line.gabionBasket2x18x4'), b, 'EA', P.gabionBasket2x18x4, P.gabionBasket2x18x4.price * b, { group, material: 'gabion-basket-2x18x4' });
      M97 += add('furnishings', t('line.stoneFill'), J94, 'TONS', P.stoneFill, P.stoneFill.price * J94, { group, notes: t('note.stonePerGabion'), material: 'stone-fill' });
      M97 += add('furnishings', '2x4x8', C95, 'ea.', lumber('2x4x8'), lumberPrice('2x4x8') * C95, { group, ...wood('2x4x8') });
      M97 += add('furnishings', t('line.woodScrews'), C96, 'ea.', P.woodScrew, P.woodScrew.price * C96, { group, material: 'wood-screw' });
    } else if (i.woodToppedGabions > 0) warnings.push(t('warn.woodToppedGabions', { count: i.woodToppedGabions }));

    // Bench with back and arms (rows 100–106)
    {
      const b = i.benchesWithBackAndArms;
      const group = t('piece.benchBackArms');
      const C101 = whole(b * 7.5);
      const C102 = roundUp(88 * b);
      const C103 = 2 * b;
      const C104 = 6 * b;
      const C105 = 4 * b;
      const p101 = fx('samePrice') ? lumberPrice('2x4x8') : 0;
      M106 += add('furnishings', '2x4x8', C101, 'ea.', p101, p101 * C101, {
        group,
        notes: fx('samePrice') ? t('note.armsSamePrice') : t('note.noPriceSheet'),
        link: LUMBER['2x4x8']!.link,
        material: 'lumber:2x4x8',
        cells: { qty: 'J101' },
      });
      M106 += add('furnishings', t('line.woodScrews'), C102, 'ea.', P.woodScrew, P.woodScrew.price * C102, { group, material: 'wood-screw', cells: { qty: 'J102', price: 'L102', total: 'M102' } });
      M106 += add('furnishings', t('line.backrestBrackets'), C103, 'ea.', P.backrestBracket, P.backrestBracket.price * C103, { group, material: 'backrest-bracket', cells: { qty: 'J103', price: 'L103', total: 'M103' } });
      M106 += add('furnishings', t('line.lagScrews'), C104, 'ea.', P.lagScrew, P.lagScrew.price * C104, { group, material: 'lag-screw', cells: { qty: 'J104', price: 'L104', total: 'M104' } });
      M106 += add('furnishings', t('line.carriageBolts'), C105, 'ea.', P.carriageBolt, P.carriageBolt.price * C105, {
        group,
        material: 'carriage-bolt',
        cells: { qty: 'J105', price: 'L105', total: 'M105' },
      });
    }

    // Bench with back (rows 119–127); lumber counts from MATERIAL CALCULATIONS J75:J79, screws K80
    {
      const b = i.benchesWithBack;
      const group = t('piece.sheetBenchBack');
      const parts: [string, number, string][] = [
        ['4x4x6', 1 * b, 'C120'],
        ['2x10x8', whole(0.5 * b), 'C121'],
        ['2x4x8', roundUp(3 * b), 'C122'],
        ['2x6x8', 1 * b, 'C123'],
        ['2x8x8', whole(0.5 * b), 'C124'],
      ];
      for (const [size, qty, cell] of parts) {
        const row = cell.slice(1);
        M127 += add('furnishings', size, qty, 'ea.', lumber(size), lumberPrice(size) * qty, { group, ...wood(size), cells: { qty: cell, price: `L${row}`, total: `M${row}` } });
      }
      const C125 = 36 * b;
      const C126 = 2 * b;
      M127 += add('furnishings', t('line.woodScrews'), C125, 'ea.', P.woodScrew, P.woodScrew.price * C125, { group, material: 'wood-screw', cells: { qty: 'C125', price: 'L125', total: 'M125' } });
      M127 += add('furnishings', t('line.backrestBrackets'), C126, 'ea.', P.backrestBracket, P.backrestBracket.price * C126, { group, material: 'backrest-bracket', cells: { qty: 'C126', price: 'L126', total: 'M126' } });
    }

    // Bench without back (rows 135–138): only the 2x4s and screws are listed
    {
      const b = i.benchesNoBack;
      const group = t('piece.bench4');
      const C136 = 3 * b;
      const C137 = 34 * b;
      M138 += add('furnishings', '2x4x8', C136, 'ea.', lumber('2x4x8'), lumberPrice('2x4x8') * C136, {
        group,
        ...wood('2x4x8'),
        notes: t('note.benchNoBack'),
        cells: { qty: 'C136', price: 'L136', total: 'M136' },
      });
      M138 += add('furnishings', t('line.woodScrews'), C137, 'ea.', P.woodScrew, P.woodScrew.price * C137, { group, material: 'wood-screw', cells: { qty: 'C137', price: 'L137', total: 'M137' } });
    }

    // 2' table = "square wood table" (rows 149–152)
    {
      const b = i.squareTables;
      const group = t('piece.table2');
      const C150 = 6 * b;
      const C151 = 62 * b;
      M152 += add('furnishings', '2x4x8', C150, 'ea.', lumber('2x4x8'), lumberPrice('2x4x8') * C150, { group, ...wood('2x4x8'), cells: { qty: 'C150', price: 'L150', total: 'M150' } });
      M152 += add('furnishings', t('line.woodScrews'), C151, 'ea.', P.woodScrew, P.woodScrew.price * C151, { group, material: 'wood-screw', cells: { qty: 'C151', price: 'L151', total: 'M151' } });
    }

    // Stools (rows 162–165) — "TO BE UPDATED DESIGN AND MATERIALS"
    {
      const b = i.stools;
      const group = t('piece.stool');
      const C163 = roundUp(3.5 * b);
      const C164 = 80 * b;
      M165 += add('furnishings', '2x4x8', C163, 'ea.', lumber('2x4x8'), lumberPrice('2x4x8') * C163, { group, ...wood('2x4x8'), cells: { qty: 'C163', price: 'L163', total: 'M163' } });
      M165 += add('furnishings', t('line.woodScrews'), C164, 'ea.', P.woodScrew, P.woodScrew.price * C164, { group, material: 'wood-screw', cells: { qty: 'C164', price: 'L164', total: 'M164' } });
    }
  }

  // Gabion table (rows 175–182): the sheet works it out, but F71 points at the empty M180 and F80 leaves F71 out.
  let M182 = 0;
  let sheetM182 = 0;
  {
    const b = i.gabionTables;
    const group = t('piece.gabionTable');
    const counted = fx('gabionTables');
    const notCounted = counted ? undefined : t('note.notInSheetTotal');
    const C176 = 1 * b;
    const C177 = roundUp(4 * b);
    const C178 = roundUp(1 * b);
    const C180 = 2 * b;
    const J181 = roundUp(((8 * b) / 27) * 1.4);
    const p180 = fx('samePrice') ? lumberPrice('2x4x8') : 0;
    sheetM182 = P.weldedMesh.price * C176 + P.stoneFill.price * J181;
    const o = { group, inTotal: counted };
    const cut = counted ? t('note.cutFromMesh') : t('note.cutFromMeshNoPrice');
    M182 += add('furnishings', t('line.weldedMesh'), C176, 'EA', P.weldedMesh, P.weldedMesh.price * C176, {
      ...o,
      notes: notCounted,
      material: 'welded-mesh',
      cells: { qty: 'J176', price: 'L176', total: 'M176' },
    });
    M182 += add('furnishings', t('line.sidePanels'), C177, 'EA', 0, 0, { ...o, notes: cut, material: 'panel:22x24', cells: { qty: 'J177' } });
    M182 += add('furnishings', t('line.bottomPanel'), C178, 'EA', 0, 0, { ...o, notes: cut, material: 'panel:22x22', cells: { qty: 'J178' } });
    M182 += add('furnishings', fx('samePrice') ? '2x4x8' : '2x4', C180, 'EA', p180, p180 * C180, {
      ...o,
      notes: fx('samePrice') ? t('note.gabionTable2x4', { price: price(109) }) : t('note.gabionTable2x4Sheet', { price: price(109) }),
      link: fx('samePrice') ? LUMBER['2x4x8']!.link : undefined,
      material: 'lumber:2x4x8',
      cells: { qty: 'J180' },
    });
    M182 += add('furnishings', t('line.stoneFill'), J181, 'TONS', P.stoneFill, P.stoneFill.price * J181, { ...o, notes: notCounted, material: 'stone-fill', cells: { qty: 'J181', price: 'L181', total: 'M181' } });
    if (b > 0 && !counted) warnings.push(t('warn.gabionTables', { count: b, cost: money(sheetM182) }));
  }

  let M210 = 0;
  if (guides) {
    // Stage: the guide builds one 12'x8' deck = 6 of the spreadsheet's 4'x4' squares.
    const sq = i.stageSquares;
    const decks = Math.floor(sq / STAGE_GUIDE_SQUARES + 1e-9);
    const left = Math.round((sq - decks * STAGE_GUIDE_SQUARES) * 100) / 100;
    M210 += fromGuide('stage', decks, decks > 0 && left > 0 ? t('note.stageOfYours', { used: decks * STAGE_GUIDE_SQUARES, count: sq }) : undefined);
    if (left > 0) {
      const why = t('note.stageNoList', { count: left, per: bare(t, STAGE_GUIDE_SQUARES) });
      if (fx('priceNeeded'))
        M210 += add('furnishings', t('line.stageSquares', { count: left }), 1, 'stage', 0, 0, { group: t('piece.stageSquares', { count: left }), notes: why, priceId: 'stage-other' });
      else warnings.push(sentences(why, t('note.comeOutZero')));
    }
    guideOnly += fromGuide('shade', i.shadeStructures);
  } else {
    // Stage (rows 186–210): COUNTIF(length, 8|12|16) picks one of three cut lists.
    {
      const len = i.stageSquares * 4; // C186
      const group = t('piece.stageSheet', { count: i.stageSquares, length: len });
      const s8 = len === 8 ? 1 : 0;
      const s12 = len === 12 ? 1 : 0;
      const s16 = len === 16 ? 1 : 0;
      const own = fx('stageCutLists');
      const zeroG = t('note.stageZeroPrice');
      /** 16' lumber: the sheet's price lookup reads column G (always 0); fixed, it reads the order list's prices. */
      const p16 = (size: string): Price => (own ? lumber(size) : { ...lumber(size), price: 0 });
      type Row = [item: string, qty: number, price: Price, row: string, extra?: Parameters<typeof add>[6]];
      const rows: Row[] = [
        ['1x6x8', 17 * s8, lumber('1x6x8'), '188', wood('1x6x8')],
        ['2x4x8', 3 * s8, lumber('2x4x8'), '189', wood('2x4x8')],
        ['4x4x10', 1 * s8, lumber('4x4x10'), '190', wood('4x4x10')],
        // 8' screws: (MC E123 + E126) × 4 with E123 blank; the stage's own top + long sides: (17 + 6) × 4
        [t('line.woodScrews'), (own ? 92 : 24) * s8, P.woodScrew, '191', { material: 'wood-screw', notes: own && s8 ? t('note.stage8Screws') : undefined }],
        ['1x6x12', 16 * s12, lumber('1x6x12'), '194', wood('1x6x12')],
        ['2x4x12', 3 * s12, lumber('2x4x12'), '195', wood('2x4x12')],
        ['4x4x12', 1 * s12, lumber('4x4x12'), '196', wood('4x4x12')],
        ['2x4x8', 1 * s12, lumber('2x4x8'), '197', wood('2x4x8')],
        [t('line.woodScrews'), 34 * s12, P.woodScrew, '198', { material: 'wood-screw' }],
        [t('line.cornerBraces'), 16 * s12, P.cornerBrace, '199', { material: 'corner-brace' }],
        // 16': counts from MC L105:L108 (the sheet reads J91:J94, the bench rows), prices from the order list (the sheet reads its column G)
        ['1x6x16', (own ? 6 : 1) * s16, p16('1x6x16'), '203', own ? wood('1x6x16') : { material: 'lumber:1x6x16', notes: sentences(zeroG, t('note.stage16Boards')) }],
        ['2x4x16', 3 * s16, p16('2x4x16'), '204', own ? wood('2x4x16') : { material: 'lumber:2x4x16', notes: zeroG }],
        ['4x4x8', (own ? 2 : 1) * s16, p16('4x4x8'), '205', own ? wood('4x4x8') : { material: 'lumber:4x4x8', notes: zeroG }],
        ['2x4x10', (own ? 1 : 0.5) * s16, p16('2x4x10'), '206', own ? wood('2x4x10') : { material: 'lumber:2x4x10', notes: zeroG }],
        // 16' screws: the sheet adds rows of the 12' stage ((E109 + E111 + E112) × 4 = 124); its own top + long sides: (35 + 6) × 4
        [t('line.woodScrews'), (own ? 164 : 124) * s16, P.woodScrew, '207', { material: 'wood-screw', notes: own && s16 ? t('note.stage16Screws') : undefined }],
        // 16' corner braces: COUNTIF(C187, 15) tests an empty cell; fixed: 8 × 3 = 24 when the stage is 16'
        [t('line.cornerBraces'), (own ? 24 : 0) * s16, P.cornerBrace, '208', { material: 'corner-brace' }],
      ];
      for (const [item, qty, price, row, extra] of rows) {
        M210 += add('furnishings', item, qty, 'ea.', price, price.price * qty, { group, ...extra, cells: { qty: `C${row}`, price: `L${row}`, total: `M${row}` } });
      }
      if (i.stageSquares > 0 && !(s8 || s12 || s16)) {
        if (fx('priceNeeded'))
          M210 += add('furnishings', t('line.stageSquares', { count: i.stageSquares }), 1, 'stage', 0, 0, {
            group,
            notes: t('note.stageSizes'),
            priceId: 'stage-other',
          });
        else warnings.push(t('warn.stageSizes', { count: i.stageSquares }));
      }
      if (s16 && !own) warnings.push(t('warn.stage16'));
    }
  }

  // Trellis 12x8 (rows 221–228)
  let M226 = 0;
  {
    const b = i.trellises;
    const group = t('piece.trellis');
    const C222 = roundUp(18 * b);
    const C223 = roundUp(27 * b);
    const C224 = roundUp(200 * b);
    const M222 = add('furnishings', '2x4x8', C222, 'ea.', lumber('2x4x8'), lumberPrice('2x4x8') * C222, { group, ...wood('2x4x8'), cells: { qty: 'C222', price: 'L222', total: 'M222' } });
    const M223 = add('furnishings', '2x4x12', C223, 'ea.', lumber('2x4x12'), lumberPrice('2x4x12') * C223, { group, ...wood('2x4x12'), cells: { qty: 'C223', price: 'L223', total: 'M223' } });
    const M224 = add('furnishings', t('line.woodScrews'), C224, 'ea.', P.woodScrew, P.woodScrew.price * C224, { group, material: 'wood-screw', cells: { qty: 'C224', price: 'L224', total: 'M224' } });
    const base = M222 + M223 + M224;
    const M225 =
      b > 0 ? add('furnishings', t('line.plusPercent', { percent: percent(t, 0.2) }), 0.2, '', base, base * 0.2, { group, notes: t('note.trellis20'), cells: { total: 'M225' } }) : 0;
    M226 = base + M225;
  }

  // F80 = F68+F65+F59+F62+F56+F74+F78  (+ F53 and F71 when fixed)
  const F80 = M165 + M152 + M127 + M138 + M106 + M210 + M226 + (M97 ?? 0) + (fx('gabionTables') ? M182 : 0) + guideOnly;

  // ---- ADDITIONAL FURNISHINGS ----
  const M233 = add('additional', t('line.longTables'), i.longTables, 'EA', P.longTable, P.longTable.price * i.longTables, { material: 'long-table', cells: { qty: 'J233', price: 'L233', total: 'M233' } });
  const M240 = add('additional', t('line.compostBins'), i.compostBins, 'EA', P.compostChickenWire, P.compostChickenWire.price * i.compostBins, {
    notes: t('note.compost'),
    material: 'compost-bin',
    cells: { qty: 'J240', price: 'L240', total: 'M240' },
  });
  let M260 = 0;
  M260 += add('additional', t('line.keyholeLarge'), i.keyholeGardensLarge, 'EA', P.keyholeLarge, P.keyholeLarge.price * i.keyholeGardensLarge, { material: 'keyhole-large', cells: { qty: 'J256', price: 'L256', total: 'M256' } });
  M260 += add('additional', t('line.keyholeMedium'), i.keyholeGardensMedium, 'EA', P.keyholeMedium, P.keyholeMedium.price * i.keyholeGardensMedium, { material: 'keyhole-medium', cells: { qty: 'J257', price: 'L257', total: 'M257' } });
  M260 += add('additional', t('line.keyholeSmall'), i.keyholeGardensSmall, 'EA', P.keyholeSmall, P.keyholeSmall.price * i.keyholeGardensSmall, { material: 'keyhole-small', cells: { qty: 'J258', price: 'L258', total: 'M258' } });
  const F97 = M260 + M240 + M233;

  // ---- OFF THE SHELF ----
  let M266 = 0;
  M266 += add('offTheShelf', t('line.shed4x4'), i.sheds4x4, 'EA', P.shed4x4, P.shed4x4.price * i.sheds4x4, { material: 'shed-4x4', cells: { qty: 'J264', price: 'L264', total: 'M264' } });
  M266 += add('offTheShelf', t('line.shed4x8'), i.sheds4x8, 'EA', P.shed4x8, P.shed4x8.price * i.sheds4x8, { material: 'shed-4x8', cells: { qty: 'J265', price: 'L265', total: 'M265' } });
  let F109 = 0; // a fixed 0 in the sheet
  if (fx('priceNeeded')) {
    const notes = t('note.noPrice');
    F109 += add('offTheShelf', t('line.cistern4x4'), i.cisterns4x4, 'EA', 0, 0, { notes, priceId: 'cistern-4x4', material: 'cistern-4x4' });
    F109 += add('offTheShelf', t('line.cistern4x8'), i.cisterns4x8, 'EA', 0, 0, { notes, priceId: 'cistern-4x8', material: 'cistern-4x8' });
  } else {
    add('offTheShelf', t('line.cisterns'), i.cisterns4x4 + i.cisterns4x8, 'EA', 0, 0, { notes: t('note.cisternsSheet'), cells: { total: 'IH!F109' } });
    if (i.cisterns4x4 + i.cisterns4x8 > 0) warnings.push(t('warn.cisterns'));
  }
  const M268 = add('offTheShelf', t('line.rainBarrels'), i.rainBarrels, 'EA', P.rainBarrel, P.rainBarrel.price * i.rainBarrels, { notes: t('note.free'), material: 'rain-barrel', cells: { total: 'M268' } });
  const p115 = fx('samePrice') ? P.cafeSet.price : 0; // the sheet's F115 is a fixed 0
  const F115 = add('offTheShelf', t('line.cafeTables'), i.cafeTableSets, 'EA', fx('samePrice') ? P.cafeSet : 0, p115 * i.cafeTableSets, {
    notes: fx('samePrice') ? t('note.cafeSamePrice') : t('note.cafeSheet'),
    material: 'cafe-set',
    cells: fx('samePrice') ? undefined : { total: 'IH!F115' },
  });
  if (!fx('samePrice') && i.cafeTableSets > 0) warnings.push(t('warn.cafe'));
  const C273 = whole(i.coldFrameSquares / 2);
  const M273 = add('offTheShelf', t('line.coldFrames'), C273, 'EA', P.coldFrame, P.coldFrame.price * C273, {
    notes: fx('wholeUnits') ? t('note.coldFrames') : t('note.coldFramesSheet'),
    material: 'cold-frame',
    cells: { qty: 'J273', price: 'L273', total: 'M273' },
  });
  if (!fx('wholeUnits') && i.coldFrameSquares % 2 !== 0) warnings.push(t('warn.coldFrames'));
  const F121 = F115 + M268 + F109 + M266 + M273;

  // ---- OFF THE SHELF OPTIONAL ----
  const fountain = t('piece.fountain');
  const M276 = add('optional', t('line.optCafe'), i.optCafeTableSets, 'EA', P.cafeSet, P.cafeSet.price * i.optCafeTableSets, { material: 'cafe-set', cells: { qty: 'J276', price: 'L276', total: 'M276' } });
  const M279 = add('optional', t('line.bubbler'), i.fountains, 'EA', P.bubbler, P.bubbler.price * i.fountains, { group: fountain, material: 'bubbler', cells: { qty: 'J279', price: 'L279', total: 'M279' } });
  const M280 = add('optional', t('line.birdBath'), i.fountains, 'EA', P.birdBath, P.birdBath.price * i.fountains, { group: fountain, material: 'bird-bath', cells: { qty: 'J280', price: 'L280', total: 'M280' } });
  const M281 = M279 + M280;
  const M283 = add('optional', t('line.birdBath'), i.birdBaths, 'EA', P.birdBath, i.birdBaths * P.birdBath.price, { material: 'bird-bath', cells: { qty: 'J282', price: 'L282', total: 'M283' } });
  const M285 = add('optional', t('line.birdHouse'), i.birdHouses, 'EA', P.birdHouse, P.birdHouse.price * i.birdHouses, { material: 'bird-house', cells: { qty: 'J284', price: 'L284', total: 'M285' } });
  const M287 = add('optional', t('line.eventTent'), i.eventTents, 'EA', P.eventTent, P.eventTent.price * i.eventTents, { material: 'event-tent', cells: { qty: 'J286', price: 'L286', total: 'M287' } });
  const M289 = add('optional', t('line.adirondack'), i.adirondackChairs, 'EA', P.adirondackChair, P.adirondackChair.price * i.adirondackChairs, { material: 'adirondack-chair', cells: { qty: 'J288', price: 'L288', total: 'M289' } });
  const M291 = add('optional', t('line.hammock'), i.hammocks, 'EA', P.hammock, P.hammock.price * i.hammocks, { material: 'hammock', cells: { qty: 'J290', price: 'L290', total: 'M291' } });
  const C292 = fx('porchSwings') ? i.porchSwings : i.hammocks; // the sheet reads D132 (hammocks), not D133
  const M293 = add('optional', t('line.porchSwing'), C292, 'EA', P.porchSwing, P.porchSwing.price * C292, {
    notes: fx('porchSwings') ? undefined : i.porchSwings !== i.hammocks ? t('note.swingHammocks', { count: i.porchSwings }) : t('note.swingHammocksSame'),
    material: 'porch-swing',
    cells: { qty: 'J292', price: 'L292', total: 'M293' },
  });
  const M295 = add('optional', t('line.trashCan'), i.trashCans, 'EA', P.trashCan, P.trashCan.price * i.trashCans, { material: 'trash-can', cells: { qty: 'C294', price: 'L294', total: 'M295' } });
  const J296 = roundUp(i.solarLights / 16);
  const M297 = add('optional', t('line.solarLights'), J296, 'pack of 16', P.solarLightsPack, P.solarLightsPack.price * J296, {
    notes: t('note.solarLights', { count: i.solarLights }),
    material: 'solar-lights',
    cells: { qty: 'J296', price: 'L296', total: 'M297' },
  });
  if (!fx('porchSwings') && i.porchSwings !== i.hammocks && (i.porchSwings > 0 || i.hammocks > 0))
    warnings.push(t('warn.porchSwings', { hammocks: i.hammocks, swings: i.porchSwings }));
  const F136 = M276 + M281 + M283 + M285 + M287 + M289 + M291 + M293 + M295 + M297;

  // ---- totals ----
  const F142 = cents(F136 + F121 + F80 + F48 + F97);
  const F143 = cents(F142 * CONTINGENCY.toolRental);
  const F144 = cents(F142 * CONTINGENCY.contingency) + (fx('toolRentalOnce') ? 0 : F143);
  const F145 = cents(i.otherCosts);
  const F146 = F142 + F143 + F144 + F145;
  add('contingency', t('line.toolRental'), CONTINGENCY.toolRental, '', F142, F143, { keepZero: true, cells: { total: 'IH!F143' } });
  add('contingency', t('line.contingency', { percent: percent(t, CONTINGENCY.contingency) }), CONTINGENCY.contingency, '', F142, cents(F142 * CONTINGENCY.contingency), { keepZero: true });
  if (!fx('toolRentalOnce'))
    add('contingency', t('line.toolRentalAgain'), 1, '', F143, F143, {
      keepZero: true,
      notes: t('note.toolRentalAgain'),
    });
  if (F145 !== 0) add('contingency', t('line.otherCosts'), 1, '', F145, F145, { cells: { total: 'IH!F145' } });

  if (!fx('playAreaOnce') && i.naturePlaySquares > 0) warnings.push(t('warn.playTwice'));
  if (!fx('edgesOnce') && M87 > 0) warnings.push(t('warn.edgesTwice'));
  if (i.raisedBedWoodEdgeFt > 0) warnings.push(mode === 'sheet' ? t('warn.raisedBedsSheet') : t('warn.raisedBeds'));
  if (!fx('priceNeeded') && (i.benchesWithBackAndArms > 0 || i.benchesWithBack > 0)) warnings.push(t('warn.benchesBack'));

  const subtotals = Object.fromEntries(CATEGORIES.map((c) => [c.id, 0])) as Record<CategoryId, number>;
  for (const l of lines) if (l.inTotal) subtotals[l.category] += l.total;

  const summary: SheetSummary = {
    layout: M15,
    soil: M22,
    gravel: M31,
    playArea: M35,
    gravelEdge: M74,
    outerEdge: M87,
    perennials: C39,
    planting: M43,
    gabions: M54,
    raisedBeds: fx('edgesOnce') ? 0 : M87,
    baseDesign: F48,
    woodToppedGabions: M97,
    benchesWithBackAndArms: M106,
    benchesWithBack: M127,
    benchesNoBack: M138,
    squareTables: M152,
    stools: M165,
    gabionTables: fx('gabionTables') ? M182 : 0,
    stage: M210,
    trellises: M226,
    baseFurnishings: F80,
    longTables: M233,
    compostBins: M240,
    keyholeGardens: M260,
    additional: F97,
    sheds: M266,
    cisterns: F109,
    rainBarrels: M268,
    cafeTables: F115,
    coldFrames: M273,
    offTheShelf: F121,
    optCafeTables: M276,
    fountains: M281,
    birdBaths: M283,
    birdHouses: M285,
    eventTents: M287,
    adirondackChairs: M289,
    hammocks: M291,
    porchSwings: M293,
    trashCans: M295,
    solarLights: M297,
    optional: F136,
    totalCosts: F142,
    toolRental: F143,
    contingency: F144,
    otherCosts: F145,
    finalCost: F146,
  };

  let orderList: OrderListResult;
  if (fx('orderList')) {
    orderList = buildMergedOrderList(lines, i, t);
  } else {
    const qpi: QpiQuantities = {
      J12, J13, J14, J19, J20, J26, J27, J28, J29, J30, J35, J49, J50, J67, J77: C77, J79: C79, J84: C84, J86,
      J101: i.benchesWithBackAndArms * 7.5,
      J102: roundUp(88 * i.benchesWithBackAndArms),
      J103: 2 * i.benchesWithBackAndArms,
      J104: 6 * i.benchesWithBackAndArms,
      J105: 4 * i.benchesWithBackAndArms,
      J122: roundUp(3 * i.benchesWithBack),
      J125: 36 * i.benchesWithBack,
      J126: roundUp(2 * i.benchesWithBack),
      J136: 3 * i.benchesNoBack,
      J137: roundUp(34 * i.benchesNoBack),
      J150: 6 * i.squareTables,
      J151: 62 * i.squareTables,
      J163: roundUp(3.5 * i.stools),
      J164: 80 * i.stools,
      J176: i.gabionTables,
      J177: roundUp(4 * i.gabionTables),
      J178: roundUp(i.gabionTables),
      J181: roundUp(((8 * i.gabionTables) / 27) * 1.4),
      stageLength: i.stageSquares * 4,
      J222: roundUp(18 * i.trellises),
      J223: roundUp(27 * i.trellises),
      J224: roundUp(200 * i.trellises),
      J276: i.optCafeTableSets,
      J279: i.fountains,
      J280: i.fountains,
      J282: i.birdBaths,
      J284: i.birdHouses,
      J286: i.eventTents,
      J288: i.adirondackChairs,
      J290: i.hammocks,
      J292: C292,
      J294: i.trashCans,
      J296,
      M276, M279, M284: M285, M286: M287, M288: M289, M290: M291, M292: M293,
      plantingSubtotal: M43,
    };
    orderList = buildOrderList(qpi, i, t);
  }

  return { mode, lines, subtotals, summary, total: F146, orderList, warnings, priceNeeded: [...needed.values()] };
}

// Numbers and money are written in the reader's language by src/lib/cost/text.ts (money, bare, qtyUnit…).

export { inputsFromTally } from './fromTally';
export type { FromTally } from './fromTally';
export type { OrderListResult, OrderListRow } from './orderList';
