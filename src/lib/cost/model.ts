// Park in a Truck's cost estimator, ported from its spreadsheet (Dream workbook
// p.18). The sheet has five tabs: INSERT HERE (orange answer cells + summary),
// QUANTITES PER ITEM ("QPI": quantities and costs per item), ORDER LIST (what
// to buy, merged by material), MATERIAL CALCULATIONS (lumber cut lists, only
// constants reach the estimate) and an empty Sheet5.
//
// estimate() reproduces the sheet cell for cell, including its mistakes: where
// the sheet double-counts, drops or misreads something, the line or warning
// says so instead of silently fixing it. docs/cost-model.md explains every
// formula. Tests: src/lib/cost/__tests__ (expected values come from a
// LibreOffice recalculation of the original file, scripts/analyze_cost_model.py).

import { CONTINGENCY, LUMBER, PRICES, UNPRICED_LUMBER_LINKS, lumberPrice, vendorOf, type Price } from './prices';
import { buildOrderList, type OrderListResult, type QpiQuantities } from './orderList';

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

export const CATEGORIES: CategoryMeta[] = [
  { id: 'layout', label: 'Layout + protection', sheet: 'F14', part: 'base' },
  { id: 'soil', label: 'Soil + mulch', sheet: 'F15', part: 'base' },
  { id: 'gravel', label: 'Gravel', sheet: 'F16', part: 'base' },
  { id: 'playArea', label: 'Nature play area', sheet: 'F17', part: 'base' },
  { id: 'gravelEdge', label: 'Wood edge around gravel', sheet: 'F22', part: 'base' },
  { id: 'outerEdge', label: 'Outer edges + raised beds', sheet: 'F27 = F46', part: 'base' },
  { id: 'planting', label: 'Plants', sheet: 'F34', part: 'base' },
  { id: 'gabions', label: 'Gabion baskets', sheet: 'F42', part: 'base' },
  { id: 'doubleCounted', label: 'Counted twice by the spreadsheet', sheet: 'F48', part: 'base' },
  { id: 'furnishings', label: 'Base furnishings', sheet: 'F80', part: 'furnishings' },
  { id: 'additional', label: 'Additional furnishings', sheet: 'F97', part: 'furnishings' },
  { id: 'offTheShelf', label: 'Off-the-shelf furnishings', sheet: 'F121', part: 'furnishings' },
  { id: 'optional', label: 'Optional off-the-shelf furnishings', sheet: 'F136', part: 'furnishings' },
  { id: 'contingency', label: 'Tool rental, contingency + other costs', sheet: 'F143:F145', part: 'contingency' },
];

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
  /** F53 is #REF! in the sheet */
  woodToppedGabions: null;
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

export interface Estimate {
  /** Every priced thing, grouped by category (what the sheet's subtotals add up) */
  lines: CostLine[];
  /** Category subtotals; they add up to `total` */
  subtotals: Record<CategoryId, number>;
  /** The INSERT HERE summary, cell by cell */
  summary: SheetSummary;
  /** FINAL COST (INSERT HERE!F146): total costs + tool rental + contingency + other costs */
  total: number;
  /** The sheet's ORDER LIST tab: combined quantities to order, where, and delivery times */
  orderList: OrderListResult;
  /** Spreadsheet quirks that change this particular estimate, in plain words */
  warnings: string[];
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

export function estimate(inputs: Partial<CostInputs>): Estimate {
  const i = normaliseInputs(inputs);
  const lines: CostLine[] = [];
  const warnings: string[] = [];

  function add(
    category: CategoryId,
    item: string,
    qty: number,
    unit: string,
    price: Price | number,
    total: number,
    o: { group?: string; notes?: string; inTotal?: boolean; link?: string; cells?: CostLine['cells']; keepZero?: boolean } = {},
  ) {
    if (!o.keepZero && qty === 0 && total === 0) return;
    const p = typeof price === 'number' ? undefined : price;
    const link = o.link ?? p?.link;
    lines.push({
      category,
      group: o.group,
      item,
      qty,
      unit,
      unitPrice: typeof price === 'number' ? price : price.price,
      total,
      vendor: vendorOf(link),
      link,
      notes: o.notes,
      inTotal: o.inTotal ?? true,
      cells: o.cells,
    });
  }
  const P = PRICES;
  const lumber = (size: string) => LUMBER[size] ?? { price: lumberPrice(size), unit: 'ea.', cells: [], link: UNPRICED_LUMBER_LINKS[size] };

  // ---- QPI "BASE": park size ----
  const L = i.longSideFt;
  const W = i.shortSideFt;
  const area = L * W; // C5
  const perimeter = L * 2 + W * 2; // C12
  const greenSf = i.plantingSquares * 4 * 4; // C6, C18
  const playSf = i.naturePlaySquares * 4 * 4; // C7, C34

  // ---- LAYOUT (QPI "STAGING", rows 11–15) ----
  const squaresB11 = area / 4; // B11 — area/4, although a 4'x4' square is 16 sq ft
  const J12 = roundUp(perimeter / 100);
  const M12 = P.erosionControl.price * J12;
  const C13 = squaresB11 / 5;
  const J13 = C13 / 25; // D13, not rounded up
  const M13 = P.stakes.price * J13;
  const J14 = roundUp(area / 1000);
  const M14 = P.markingPaint.price * J14;
  const M15 = M12 + M13 + M14;
  add('layout', 'Erosion control', J12, 'roll', P.erosionControl, M12, { notes: 'One roll per 100 ft of park edge.', cells: { qty: 'J12', price: 'L12', total: 'M12' } });
  add('layout', 'Stakes', J13, 'package', P.stakes, M13, {
    notes: 'One stake per 20 sq ft, 25 to a package; the sheet does not round up to whole packages.',
    cells: { qty: 'J13', price: 'L13', total: 'M13' },
  });
  add('layout', 'Marking paint', J14, 'can', P.markingPaint, M14, { notes: 'One can per 1,000 sq ft.', cells: { qty: 'J14', price: 'L14', total: 'M14' } });

  // ---- SOIL (rows 18–22) ----
  const H19 = (greenSf * 0.5) / 27; // 6" deep, cubic yards
  const J19 = roundUp(H19);
  const M19 = P.soil.price * J19;
  const H20 = (greenSf * 0.18) / 27; // 2" of mulch
  const J20 = roundUp(H20);
  const M20 = P.mulch.price * J20;
  const C21 = (J20 + J19) / 18;
  const M21 = P.soilDelivery.price * C21;
  const M22 = M19 + M20 + M21;
  add('soil', 'Soil, 6" deep', J19, 'CY', P.soil, M19, { notes: 'Over the planting squares.', cells: { qty: 'J19', price: 'L19', total: 'M19' } });
  add('soil', 'Mulch, 2"', J20, 'CY', P.mulch, M20, { cells: { qty: 'J20', price: 'L20', total: 'M20' } });
  add('soil', 'Delivery', C21, 'load (18 CY)', P.soilDelivery, M21, {
    notes: 'The sheet charges a fraction of a delivery (cubic yards ÷ 18) instead of whole trips.',
    cells: { qty: 'C21', price: 'L21', total: 'M21' },
  });

  // ---- GRAVEL (rows 25–31) ----
  const H26 = (area * 0.17) / 27; // 2" over the whole park
  const J26 = roundUp(H26 * 1.4); // tons
  const M26 = P.redTipple.price * J26;
  const H27 = (area * 0.17) / 27;
  const J27 = roundUp(H27 * 1.4);
  const M27 = P.cleanStone.price * J27;
  const J28 = roundUp(area / 400);
  const M28 = P.filterFabric.price * J28;
  const J29 = roundUp((area * 0.2) / 100);
  const M29 = P.staples.price * J29;
  const H30 = H26 + H27;
  const J30 = roundUp(H30 / 24);
  const M30 = P.gravelDelivery.price * J30;
  const M31 = M26 + M27 + M28 + M29 + M30;
  const wholePark = 'Worked out for the whole park (long × short side), planting squares included.';
  add('gravel', '3/8" red tipple, 2" deep', J26, 'TONS', P.redTipple, M26, { notes: wholePark, cells: { qty: 'J26', price: 'L26', total: 'M26' } });
  add('gravel', '3/4" clean stone aggregate base, 2" deep', J27, 'TONS', P.cleanStone, M27, { notes: wholePark, cells: { qty: 'J27', price: 'L27', total: 'M27' } });
  add('gravel', 'Filter fabric', J28, 'ROLL', P.filterFabric, M28, { notes: 'One roll per 400 sq ft.', cells: { qty: 'J28', price: 'L28', total: 'M28' } });
  add('gravel', '3.5" staples', J29, 'BOX', P.staples, M29, { notes: 'One staple per 5 sq ft, boxes of 100.', cells: { qty: 'J29', price: 'L29', total: 'M29' } });
  add('gravel', 'Delivery', J30, 'TRIP', P.gravelDelivery, M30, { notes: 'One trip per 24 CY of stone.', cells: { qty: 'J30', price: 'L30', total: 'M30' } });

  // ---- PLAY AREA (rows 34–35) ----
  const J35 = roundUp((playSf * 0.33) / 27);
  const M35 = P.playMulch.price * J35;
  add('playArea', 'Mulch, 4"', J35, 'CY', P.playMulch, M35, { cells: { qty: 'J35', price: 'L35', total: 'M35' } });

  // ---- WOOD EDGE FOR GRAVEL (rows 64–74) ----
  const C64 = i.gravelEdgeFt;
  const C65 = C64 / 12;
  const D67 = C64 / 5;
  const C67 = roundUp(D67 / 3) / 8;
  const J65 = roundUp(C65 + C67);
  const M65 = P.board1x4x12.price * J65;
  const J67 = roundUp(C67);
  const M67 = P.edgeSupport2x4x8.price * J67;
  const C68 = D67;
  const M68 = P.lBracket.price * C68;
  const C69 = C68 * 2;
  const M69 = P.selfDrivingScrew.price * C69;
  const C70 = C68 * 2;
  const M70 = P.concreteScrew.price * C70;
  const M74 = M65 + M67 + M68 + M69 + M70;
  const unusedSplit = 'The hardscape/softscape split is not used by the sheet.';
  add('gravelEdge', '1x4x12 boards', J65, 'EA', P.board1x4x12, M65, {
    notes: 'One per 12 ft; the sheet also adds the 2x4 count to the board count.',
    cells: { qty: 'J65', price: 'L65', total: 'M65' },
  });
  add('gravelEdge', '2x4x8 (hardscape support)', J67, 'EA', P.edgeSupport2x4x8, M67, { notes: unusedSplit, cells: { qty: 'J67', price: 'L67', total: 'M67' } });
  add('gravelEdge', 'L-brackets', C68, 'EA', P.lBracket, M68, { notes: 'One per 5 ft (not rounded).', cells: { qty: 'J68', price: 'L68', total: 'M68' } });
  add('gravelEdge', '2 1/2" self-driving screws', C69, 'EA', P.selfDrivingScrew, M69, { cells: { qty: 'J69', price: 'L69', total: 'M69' } });
  add('gravelEdge', '2" concrete screws', C70, 'EA', P.concreteScrew, M70, { cells: { qty: 'J70', price: 'L70', total: 'M70' } });

  // ---- RAISED BEDS - TO GABIONS = the outer edges (rows 76–87) ----
  const C76 = i.outerEdgeFt;
  const C77 = roundUp(C76 / 12);
  const M77 = P.board1x6x12Edge.price * C77;
  const D79 = C76 / 5;
  const C79 = roundUp(D79 / 2 / 8);
  const M79 = lumberPrice('2x4x8') * C79;
  const C80 = D79;
  const M80 = P.lBracket.price * C80;
  const C81 = C80 * 2;
  const M81 = P.selfDrivingScrew.price * C81;
  const C82 = C80 * 2;
  const M82 = P.concreteScrew.price * C82;
  const C84 = roundUp(D79 / 1.5 / 8);
  const M84 = lumberPrice('2x4x8') * C84;
  const J86 = roundUp(i.raisedBedGabionConnections / 4);
  const M86 = lumberPrice('2x4x8') * J86;
  const M87 = M77 + M79 + M80 + M81 + M82 + M84 + M86;
  add('outerEdge', '1x6x12 boards', C77, 'EA', P.board1x6x12Edge, M77, {
    notes: 'One per 12 ft. $4 here, while the order list prices 1x6x12 at $10.',
    cells: { qty: 'J77', price: 'L77', total: 'M77' },
  });
  add('outerEdge', '2x4x8 (supports, hardscape)', C79, 'EA', lumber('2x4x8'), M79, {
    notes: 'Worked out from the whole outer edge; the sheet does not use the hardscape/softscape split.',
    cells: { qty: 'J79', price: 'L79', total: 'M79' },
  });
  add('outerEdge', 'L-brackets', C80, 'EA', { ...P.lBracket, link: P.lBracket.alt }, M80, { notes: 'One per 5 ft (not rounded).', cells: { qty: 'J80', price: 'L80', total: 'M80' } });
  add('outerEdge', '2 1/2" self-driving screws', C81, 'EA', P.selfDrivingScrew, M81, { cells: { qty: 'J81', price: 'L81', total: 'M81' } });
  add('outerEdge', '2" concrete screws', C82, 'EA', P.concreteScrew, M82, { cells: { qty: 'J82', price: 'L82', total: 'M82' } });
  add('outerEdge', '2x4x8 (supports, softscape)', C84, 'EA', lumber('2x4x8'), M84, {
    notes: 'Also worked out from the whole outer edge, so both kinds of support are always counted.',
    cells: { qty: 'J84', price: 'L84', total: 'M84' },
  });
  add('outerEdge', '2x4x8 (edge to gabion)', J86, 'EA', lumber('2x4x8'), M86, {
    notes: 'From the raised-bed question “How many connections to gabions do you have?”.',
    cells: { qty: 'J86', price: 'L86', total: 'M86' },
  });

  // ---- PLANTING (rows 39–43) ----
  const C39 = i.plantingSquares * 4; // INSERT HERE!C30
  const M39 = P.perennial.price * C39;
  const M40 = P.shrub.price * i.shrubs;
  const M41 = P.smallTree.price * i.smallTrees;
  const M42 = P.largeTree.price * i.largeTrees;
  const M43 = M39 + M40 + M41 + M42;
  add('planting', 'Perennials', C39, 'EA', P.perennial, M39, { notes: '4 per planting square.', cells: { qty: 'J39', price: 'L39', total: 'M39' } });
  add('planting', 'Shrubs', i.shrubs, 'EA', P.shrub, M40, { cells: { qty: 'J40', price: 'L40', total: 'M40' } });
  add('planting', 'Trees, small', i.smallTrees, 'EA', P.smallTree, M41, { cells: { qty: 'J41', price: 'L41', total: 'M41' } });
  add('planting', 'Trees, large', i.largeTrees, 'EA', P.largeTree, M42, {
    notes: 'The sheet prices a large tree ($75) below a small one ($100).',
    cells: { qty: 'J42', price: 'L42', total: 'M42' },
  });

  // ---- GABIONS 12" x 12" x 4' (rows 48–54) ----
  const C48 = i.gabionBaskets * 4 * 1; // cubic feet
  const J49 = i.gabionBaskets;
  const M49 = P.gabionBasket.price * J49;
  const J50 = roundUp((C48 / 27) * 1.4);
  const M50 = P.stoneFill.price * J50;
  const M54 = M49 + M50;
  add('gabions', "1'x1'x4' 5 gauge baskets", J49, 'EA', P.gabionBasket, M49, { cells: { qty: 'J49', price: 'L49', total: 'M49' } });
  add('gabions', '1-3" stone fill', J50, 'TONS', P.stoneFill, M50, { notes: '4 cu ft per basket, 1.4 tons per cubic yard.', cells: { qty: 'J50', price: 'L50', total: 'M50' } });

  // ---- base design total: F48 = F46+F42+F34+F16+F15+F14+F22+F17+F27+F17 ----
  // F17 (play area) appears twice; F27 and F46 both point at QPI!M87.
  add('doubleCounted', 'Nature play mulch, again', 1, '', M35, M35, {
    notes: 'The base-design total (F48) adds the play-area subtotal twice.',
    cells: { total: 'M35' },
  });
  add('doubleCounted', 'Outer edges + raised beds, again', 1, '', M87, M87, {
    notes: 'The sheet’s “outer edges” (F27) and “raised beds” (F46) subtotals are the same cell, and the base-design total adds both.',
    cells: { total: 'M87' },
  });
  const F48 = M87 + M54 + M43 + M31 + M22 + M15 + M74 + M35 + M87 + M35;

  // ---- FURNISHINGS ----
  // 4' 18" wood-topped gabions: the answer cell is gone, F53 = #REF!, not in F80.
  if (i.woodToppedGabions > 0)
    warnings.push(
      `Wood-topped gabions (${fmtN(i.woodToppedGabions)}): the PiaT spreadsheet’s subtotal for these is broken (#REF!), so they add $0 to the estimate.`,
    );

  let M106 = 0, M127 = 0, M138 = 0, M152 = 0, M165 = 0;

  // Bench with back and arms (rows 100–106)
  {
    const b = i.benchesWithBackAndArms;
    const group = "4' bench with back and armrests";
    const C101 = b * 7.5;
    const C102 = roundUp(88 * b);
    const M102 = P.woodScrew.price * C102;
    const C103 = 2 * b;
    const M103 = P.backrestBracket.price * C103;
    const C104 = 6 * b;
    const M104 = P.lagScrew.price * C104;
    const C105 = 4 * b;
    const M105 = P.carriageBolt.price * C105;
    add('furnishings', '2x4x8', C101, 'ea.', 0, 0, { group, notes: 'No price in the sheet (counted as $0).', link: LUMBER['2x4x8']!.link, cells: { qty: 'J101' } });
    add('furnishings', '2.5" wood screws', C102, 'ea.', P.woodScrew, M102, { group, cells: { qty: 'J102', price: 'L102', total: 'M102' } });
    add('furnishings', 'Backrest brackets', C103, 'ea.', P.backrestBracket, M103, { group, cells: { qty: 'J103', price: 'L103', total: 'M103' } });
    add('furnishings', '1/4" x 1 1/2" lag screws', C104, 'ea.', P.lagScrew, M104, { group, cells: { qty: 'J104', price: 'L104', total: 'M104' } });
    add('furnishings', '1/4" x 2 1/2" exterior carriage bolts + nuts + washers', C105, 'ea.', P.carriageBolt, M105, { group, cells: { qty: 'J105', price: 'L105', total: 'M105' } });
    M106 = M102 + M103 + M104 + M105;
  }

  // Bench with back (rows 119–127); lumber counts from MATERIAL CALCULATIONS J75:J79, screws K80
  {
    const b = i.benchesWithBack;
    const group = "4' bench with back";
    const parts: [string, number, string, number, boolean][] = [
      // size, qty, qty cell, price, rounded qty for ordering
      ['4x4x6', 1 * b, 'C120', lumberPrice('4x4x6'), false],
      ['2x10x8', 0.5 * b, 'C121', lumberPrice('2x10x8'), false],
      ['2x4x8', roundUp(3 * b), 'C122', lumberPrice('2x4x8'), false],
      ['2x6x8', 1 * b, 'C123', lumberPrice('2x6x8'), false],
      ['2x8x8', 0.5 * b, 'C124', lumberPrice('2x8x8'), false],
    ];
    let sum = 0;
    for (const [size, qty, cell, price] of parts) {
      const row = cell.slice(1);
      const M = price * qty;
      sum += M;
      add('furnishings', size, qty, 'ea.', lumber(size), M, {
        group,
        notes: price === 0 ? 'No price for this size in the sheet (counted as $0).' : undefined,
        cells: { qty: cell, price: `L${row}`, total: `M${row}` },
      });
    }
    const C125 = 36 * b;
    const M125 = P.woodScrew.price * C125;
    const C126 = 2 * b;
    const M126 = P.backrestBracket.price * C126;
    add('furnishings', '2.5" wood screws', C125, 'ea.', P.woodScrew, M125, { group, cells: { qty: 'C125', price: 'L125', total: 'M125' } });
    add('furnishings', 'Backrest brackets', C126, 'ea.', P.backrestBracket, M126, { group, cells: { qty: 'C126', price: 'L126', total: 'M126' } });
    M127 = sum + M125 + M126;
  }

  // Bench without back (rows 135–138): only the 2x4s and screws are listed
  {
    const b = i.benchesNoBack;
    const group = "4' bench without back";
    const C136 = 3 * b;
    const M136 = lumberPrice('2x4x8') * C136;
    const C137 = 34 * b;
    const M137 = P.woodScrew.price * C137;
    add('furnishings', '2x4x8', C136, 'ea.', lumber('2x4x8'), M136, {
      group,
      notes: 'The sheet lists only the 2x4s and screws for this bench (no legs or seat boards).',
      cells: { qty: 'C136', price: 'L136', total: 'M136' },
    });
    add('furnishings', '2.5" wood screws', C137, 'ea.', P.woodScrew, M137, { group, cells: { qty: 'C137', price: 'L137', total: 'M137' } });
    M138 = M136 + M137;
  }

  // 2' table = "square wood table" (rows 149–152)
  {
    const b = i.squareTables;
    const group = "2' table";
    const C150 = 6 * b;
    const M150 = lumberPrice('2x4x8') * C150;
    const C151 = 62 * b;
    const M151 = P.woodScrew.price * C151;
    add('furnishings', '2x4x8', C150, 'ea.', lumber('2x4x8'), M150, { group, cells: { qty: 'C150', price: 'L150', total: 'M150' } });
    add('furnishings', '2.5" wood screws', C151, 'ea.', P.woodScrew, M151, { group, cells: { qty: 'C151', price: 'L151', total: 'M151' } });
    M152 = M150 + M151;
  }

  // Stools (rows 162–165) — "TO BE UPDATED DESIGN AND MATERIALS"
  {
    const b = i.stools;
    const group = 'Stool';
    const C163 = roundUp(3.5 * b);
    const M163 = lumberPrice('2x4x8') * C163;
    const C164 = 80 * b;
    const M164 = P.woodScrew.price * C164;
    add('furnishings', '2x4x8', C163, 'ea.', lumber('2x4x8'), M163, { group, cells: { qty: 'C163', price: 'L163', total: 'M163' } });
    add('furnishings', '2.5" wood screws', C164, 'ea.', P.woodScrew, M164, { group, cells: { qty: 'C164', price: 'L164', total: 'M164' } });
    M165 = M163 + M164;
  }

  // Gabion table (rows 175–182): worked out, but F71 points at the empty M180 and F80 leaves F71 out.
  let M182 = 0;
  {
    const b = i.gabionTables;
    const group = 'Wood-topped gabion table';
    const notCounted = 'Not in the spreadsheet’s total.';
    const C176 = 1 * b;
    const M176 = P.weldedMesh.price * C176;
    const C177 = roundUp(4 * b);
    const C178 = roundUp(1 * b);
    const C180 = 2 * b;
    const J181 = roundUp(((8 * b) / 27) * 1.4);
    const M181 = P.stoneFill.price * J181;
    M182 = M176 + M181;
    const o = { group, inTotal: false };
    add('furnishings', '2"x2" .16-.19 dia welded wire mesh', C176, 'EA', P.weldedMesh, M176, { ...o, notes: notCounted, cells: { qty: 'J176', price: 'L176', total: 'M176' } });
    add('furnishings', 'Side panels 22"x24"', C177, 'EA', 0, 0, { ...o, notes: 'Cut from the mesh; no price.', cells: { qty: 'J177' } });
    add('furnishings', 'Bottom panel 22"x22"', C178, 'EA', 0, 0, { ...o, notes: 'Cut from the mesh; no price.', cells: { qty: 'J178' } });
    add('furnishings', '2x4', C180, 'EA', 0, 0, { ...o, notes: 'The sheet lists $109 here but does not multiply it out.', cells: { qty: 'J180' } });
    add('furnishings', '1-3" stone fill', J181, 'TONS', P.stoneFill, M181, { ...o, notes: notCounted, cells: { qty: 'J181', price: 'L181', total: 'M181' } });
    if (b > 0)
      warnings.push(
        `Wood-topped gabion tables (${fmtN(b)}): the spreadsheet works out ${money(M182)} for them, but its summary points at an empty cell, so they are not in the total.`,
      );
  }

  // Stage (rows 186–210): COUNTIF(length, 8|12|16) picks one of three cut lists.
  let M210 = 0;
  {
    const len = i.stageSquares * 4; // C186
    const group = `Stage (${fmtN(i.stageSquares)} square${i.stageSquares === 1 ? '' : 's'}, ${fmtN(len)}' long)`;
    const s8 = len === 8 ? 1 : 0;
    const s12 = len === 12 ? 1 : 0;
    const s16 = len === 16 ? 1 : 0;
    const zeroG = 'The sheet looks this price up in the delivery-time column, so it is always $0.';
    const rows: [string, number, Price | number, string, string?][] = [
      ['1x6x8', 17 * s8, lumber('1x6x8'), '188'],
      ['2x4x8', 3 * s8, lumber('2x4x8'), '189'],
      ['4x4x10', 1 * s8, lumber('4x4x10'), '190', 'No price for this size in the sheet (counted as $0).'],
      ['2.5" wood screws', 24 * s8, P.woodScrew, '191'],
      ['1x6x12', 16 * s12, lumber('1x6x12'), '194'],
      ['2x4x12', 3 * s12, lumber('2x4x12'), '195'],
      ['4x4x12', 1 * s12, lumber('4x4x12'), '196', 'No price for this size in the sheet (counted as $0).'],
      ['2x4x8', 1 * s12, lumber('2x4x8'), '197'],
      ['2.5" wood screws', 34 * s12, P.woodScrew, '198'],
      ['Corner braces', 16 * s12, P.cornerBrace, '199'],
      ['1x6x16', 1 * s16, { ...lumber('1x6x16'), price: 0 }, '203', `${zeroG} The cut list (MATERIAL CALCULATIONS) calls for 6 boards; the sheet reads 1 from the wrong cell.`],
      ['2x4x16', 3 * s16, { ...lumber('2x4x16'), price: 0 }, '204', zeroG],
      ['4x4x8', 1 * s16, { ...lumber('4x4x8'), price: 0 }, '205', zeroG],
      ['2x4x10', 0.5 * s16, { ...lumber('2x4x10'), price: 0 }, '206', zeroG],
      ['2.5" wood screws', 124 * s16, P.woodScrew, '207'],
    ];
    for (const [item, qty, price, row, notes] of rows) {
      const unitPrice = typeof price === 'number' ? price : price.price;
      const M = unitPrice * qty;
      M210 += M;
      add('furnishings', item, qty, 'ea.', price, M, { group, notes, cells: { qty: `C${row}`, price: `L${row}`, total: `M${row}` } });
    }
    if (i.stageSquares > 0 && !(s8 || s12 || s16))
      warnings.push(
        `Stage: the spreadsheet only prices stages of 2, 3 or 4 squares in a row (8', 12' or 16' long); ${fmtN(i.stageSquares)} square${i.stageSquares === 1 ? '' : 's'} come out at $0.`,
      );
    if (s16)
      warnings.push("16' stage: the spreadsheet has no lumber prices for it (only the screws are counted).");
  }

  // Trellis 12x8 (rows 221–228)
  let M226 = 0;
  {
    const b = i.trellises;
    const group = '12x8 trellis';
    const C222 = roundUp(18 * b);
    const M222 = lumberPrice('2x4x8') * C222;
    const C223 = roundUp(27 * b);
    const M223 = lumberPrice('2x4x12') * C223;
    const C224 = roundUp(200 * b);
    const M224 = P.woodScrew.price * C224;
    const M225 = (M222 + M223 + M224) * 0.2;
    M226 = M222 + M223 + M224 + M225;
    add('furnishings', '2x4x8', C222, 'ea.', lumber('2x4x8'), M222, { group, cells: { qty: 'C222', price: 'L222', total: 'M222' } });
    add('furnishings', '2x4x12', C223, 'ea.', lumber('2x4x12'), M223, { group, cells: { qty: 'C223', price: 'L223', total: 'M223' } });
    add('furnishings', '2.5" wood screws', C224, 'ea.', P.woodScrew, M224, { group, cells: { qty: 'C224', price: 'L224', total: 'M224' } });
    add('furnishings', 'Plus 20%', 0.2, '', M222 + M223 + M224, M225, { group, notes: 'The sheet adds 20% to the trellis (unlabelled).', cells: { total: 'M225' } });
  }

  // F80 = F68+F65+F59+F62+F56+F74+F78  (F53 #REF! and F71 left out)
  const F80 = M165 + M152 + M127 + M138 + M106 + M210 + M226;

  // ---- ADDITIONAL FURNISHINGS ----
  const M233 = P.longTable.price * i.longTables;
  const M240 = P.compostChickenWire.price * i.compostBins;
  const M256 = P.keyholeLarge.price * i.keyholeGardensLarge;
  const M257 = P.keyholeMedium.price * i.keyholeGardensMedium;
  const M258 = P.keyholeSmall.price * i.keyholeGardensSmall;
  const M260 = M256 + M257 + M258;
  const F97 = M260 + M240 + M233;
  add('additional', 'Long tables (materials)', i.longTables, 'EA', P.longTable, M233, { cells: { qty: 'J233', price: 'L233', total: 'M233' } });
  add('additional', 'Compost bins', i.compostBins, 'EA', P.compostChickenWire, M240, {
    notes: 'The sheet prices only the chicken wire; boards, posts, gravel, screws and staples are listed without prices.',
    cells: { qty: 'J240', price: 'L240', total: 'M240' },
  });
  add('additional', 'Keyhole gardens, large', i.keyholeGardensLarge, 'EA', P.keyholeLarge, M256, { cells: { qty: 'J256', price: 'L256', total: 'M256' } });
  add('additional', 'Keyhole gardens, medium', i.keyholeGardensMedium, 'EA', P.keyholeMedium, M257, { cells: { qty: 'J257', price: 'L257', total: 'M257' } });
  add('additional', 'Keyhole gardens, small', i.keyholeGardensSmall, 'EA', P.keyholeSmall, M258, { cells: { qty: 'J258', price: 'L258', total: 'M258' } });

  // ---- OFF THE SHELF ----
  const M264 = P.shed4x4.price * i.sheds4x4;
  const M265 = P.shed4x8.price * i.sheds4x8;
  const M266 = M264 + M265;
  const F109 = 0; // fixed 0 in the sheet
  const M268 = P.rainBarrel.price * i.rainBarrels; // fixed 0 in the sheet
  const F115 = 0; // fixed 0 in the sheet
  const C273 = i.coldFrameSquares / 2;
  const M273 = P.coldFrame.price * C273;
  const F121 = F115 + M268 + F109 + M266 + M273;
  add('offTheShelf', "4x4 shed (1 square)", i.sheds4x4, 'EA', P.shed4x4, M264, { cells: { qty: 'J264', price: 'L264', total: 'M264' } });
  add('offTheShelf', "4x8 shed (2 squares)", i.sheds4x8, 'EA', P.shed4x8, M265, { cells: { qty: 'J265', price: 'L265', total: 'M265' } });
  add('offTheShelf', 'Cisterns', i.cisterns4x4 + i.cisterns4x8, 'EA', 0, F109, { notes: 'No price in the sheet (its subtotal is a fixed $0).', cells: { total: 'IH!F109' } });
  add('offTheShelf', 'Rain barrels', i.rainBarrels, 'EA', P.rainBarrel, M268, { notes: 'FREE!', cells: { total: 'M268' } });
  add('offTheShelf', 'Cafe tables and chairs', i.cafeTableSets, 'EA', 0, F115, {
    notes: 'No price here (a fixed $0); “Cafe tables + chairs” under optional furnishings is priced.',
    cells: { total: 'IH!F115' },
  });
  add('offTheShelf', '2x8 cold frames', C273, 'EA', P.coldFrame, M273, {
    notes: 'One cold frame per 2 squares (not rounded).',
    cells: { qty: 'J273', price: 'L273', total: 'M273' },
  });
  if (i.cisterns4x4 + i.cisterns4x8 > 0) warnings.push('Cisterns: the spreadsheet has no price for them, so they add $0.');
  if (i.cafeTableSets > 0)
    warnings.push('Cafe tables and chairs (off-the-shelf): this question is a fixed $0 in the spreadsheet; enter them under optional “Cafe tables + chairs” to price them.');
  if (i.coldFrameSquares % 2 !== 0)
    warnings.push('Cold frames: the spreadsheet prices one 2x8 cold frame per 2 squares, so an odd number of squares buys half a cold frame.');

  // ---- OFF THE SHELF OPTIONAL ----
  const M276 = P.cafeSet.price * i.optCafeTableSets;
  const M279 = P.bubbler.price * i.fountains;
  const M280 = P.birdBath.price * i.fountains;
  const M281 = M279 + M280;
  const M283 = i.birdBaths * P.birdBath.price;
  const M285 = P.birdHouse.price * i.birdHouses;
  const M287 = P.eventTent.price * i.eventTents;
  const M289 = P.adirondackChair.price * i.adirondackChairs;
  const M291 = P.hammock.price * i.hammocks;
  const C292 = i.hammocks; // reads D132 (hammocks), not D133 (porch swings)
  const M293 = P.porchSwing.price * C292;
  const M295 = P.trashCan.price * i.trashCans;
  const J296 = roundUp(i.solarLights / 16);
  const M297 = P.solarLightsPack.price * J296;
  const F136 = M276 + M281 + M283 + M285 + M287 + M289 + M291 + M293 + M295 + M297;
  add('optional', 'Cafe tables + chairs', i.optCafeTableSets, 'EA', P.cafeSet, M276, { cells: { qty: 'J276', price: 'L276', total: 'M276' } });
  add('optional', 'Solar bubbler', i.fountains, 'EA', P.bubbler, M279, { group: 'Fountain with solar pump', cells: { qty: 'J279', price: 'L279', total: 'M279' } });
  add('optional', 'Bird bath', i.fountains, 'EA', P.birdBath, M280, { group: 'Fountain with solar pump', cells: { qty: 'J280', price: 'L280', total: 'M280' } });
  add('optional', 'Bird bath', i.birdBaths, 'EA', P.birdBath, M283, { cells: { qty: 'J282', price: 'L282', total: 'M283' } });
  add('optional', 'Bird house', i.birdHouses, 'EA', P.birdHouse, M285, { cells: { qty: 'J284', price: 'L284', total: 'M285' } });
  add('optional', 'Event tent', i.eventTents, 'EA', P.eventTent, M287, { cells: { qty: 'J286', price: 'L286', total: 'M287' } });
  add('optional', 'Adirondack chair', i.adirondackChairs, 'EA', P.adirondackChair, M289, { cells: { qty: 'J288', price: 'L288', total: 'M289' } });
  add('optional', 'Free-standing hammock', i.hammocks, 'EA', P.hammock, M291, { cells: { qty: 'J290', price: 'L290', total: 'M291' } });
  add('optional', 'Porch swing', C292, 'EA', P.porchSwing, M293, {
    notes: i.porchSwings !== i.hammocks ? `The sheet uses the hammock count here, not your ${fmtN(i.porchSwings)} porch swing${i.porchSwings === 1 ? '' : 's'}.` : 'The sheet uses the hammock count here.',
    cells: { qty: 'J292', price: 'L292', total: 'M293' },
  });
  add('optional', 'Trash can', i.trashCans, 'EA', P.trashCan, M295, { cells: { qty: 'C294', price: 'L294', total: 'M295' } });
  add('optional', 'Solar lights', J296, 'pack of 16', P.solarLightsPack, M297, {
    notes: `${fmtN(i.solarLights)} light${i.solarLights === 1 ? '' : 's'}, bought in packs of 16.`,
    cells: { qty: 'J296', price: 'L296', total: 'M297' },
  });
  if (i.porchSwings !== i.hammocks && (i.porchSwings > 0 || i.hammocks > 0))
    warnings.push(
      `Porch swings: the spreadsheet prices them with the hammock count (${fmtN(i.hammocks)}) instead of the porch-swing count (${fmtN(i.porchSwings)}).`,
    );

  // ---- totals ----
  const F142 = F136 + F121 + F80 + F48 + F97;
  const F143 = F142 * CONTINGENCY.toolRental;
  const F144 = F142 * CONTINGENCY.contingency + F143;
  const F145 = i.otherCosts;
  const F146 = F142 + F143 + F144 + F145;
  add('contingency', 'Tool rental contingency', CONTINGENCY.toolRental, '', F142, F143, { keepZero: true, cells: { total: 'IH!F143' } });
  add('contingency', '20% contingency', CONTINGENCY.contingency, '', F142, F142 * CONTINGENCY.contingency, { keepZero: true });
  add('contingency', 'Tool rental, again', 1, '', F143, F143, {
    keepZero: true,
    notes: 'The sheet’s 20% contingency line (F144) also adds the tool rental, so it is counted twice.',
  });
  if (F145 !== 0) add('contingency', 'Other costs', 1, '', F145, F145, { cells: { total: 'IH!F145' } });

  if (i.naturePlaySquares > 0) warnings.push('Nature play: the spreadsheet’s base-design total counts the play-area mulch twice.');
  if (M87 > 0)
    warnings.push('Outer edges: the spreadsheet’s base-design total counts the outer-edge lumber twice (its “outer edges” and “raised beds” subtotals are the same cell).');
  if (i.raisedBedWoodEdgeFt > 0) warnings.push('Raised beds: the spreadsheet asks for the feet of wood edges but does not use the number.');
  if (i.benchesWithBackAndArms > 0 || i.benchesWithBack > 0)
    warnings.push('Benches with backs: some of their lumber has no price in the spreadsheet and counts as $0 — check those lines.');

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
    raisedBeds: M87,
    baseDesign: F48,
    woodToppedGabions: null,
    benchesWithBackAndArms: M106,
    benchesWithBack: M127,
    benchesNoBack: M138,
    squareTables: M152,
    stools: M165,
    gabionTables: 0,
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
  const orderList = buildOrderList(qpi, i);

  return { lines, subtotals, summary, total: F146, orderList, warnings };
}

// ---- formatting helpers shared with the widget ----------------------------------

export function money(v: number): string {
  return v.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

/** Up to 2 decimals, no trailing zeros. */
export function fmtN(v: number): string {
  return Number.isInteger(v) ? v.toLocaleString('en-US') : v.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

export { inputsFromTally } from './fromTally';
export type { FromTally } from './fromTally';
export type { OrderListResult, OrderListRow } from './orderList';
