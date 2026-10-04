// How the site's estimate differs from Park in a Truck's spreadsheet.
//
// The owner's decision (2026-10-04): fix the math — same PiaT prices and
// assumptions, but double counts removed and broken lines repaired.
// estimate(inputs, { mode: 'sheet' }) still reproduces the spreadsheet exactly
// (the LibreOffice fixture tests prove it); the default, mode 'corrected',
// applies every fix below. Each fix can be switched off on its own, which is
// how the widget shows the dollar effect of each one and how the tests prove
// each one changes what it should. docs/piat-spreadsheet-issues.md describes
// the problems for the PiaT team.

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
export const FIXES: FixMeta[] = [
  {
    id: 'toolRentalOnce',
    label: 'Tool rental counted once',
    detail:
      'The spreadsheet’s 20% contingency line also adds the 15% tool rental again, so the tool rental was counted twice. The final cost is now total costs + 15% tool rental + 20% contingency.',
  },
  {
    id: 'playAreaOnce',
    label: 'Nature play area counted once',
    detail: 'The base-design total added the play-area mulch twice.',
  },
  {
    id: 'edgesOnce',
    label: 'Outer edges counted once',
    detail:
      'The “raised beds” subtotal was a copy of the outer-edge subtotal, so the base-design total counted the outer-edge lumber twice. (The spreadsheet has no separate calculation for raised beds.)',
  },
  {
    id: 'edgeSupportsSplit',
    label: 'Outer-edge supports follow your hardscape/softscape split',
    detail:
      'The spreadsheet asks how many feet of outer edge sit on hardscape and on softscape, then works out both kinds of supports for every foot. Hardscape supports (2x4s, L-brackets, screws) now use the hardscape feet and softscape supports the softscape feet. If you leave the split at zero, both are still counted, as in the spreadsheet.',
  },
  {
    id: 'edgeGabionConnections',
    label: 'Edge-to-gabion connections from both questions',
    detail:
      'The outer-edge question “How many times do these edges connect to a gabion?” was never used; only the raised-bed question was. Both are now counted.',
  },
  {
    id: 'woodToppedGabions',
    label: '4\' wood-topped gabions priced',
    detail:
      'Their subtotal was a broken reference (#REF!), so they cost $0. They are now priced from the spreadsheet’s own lines for them: a 2\'x18"x4\' basket, stone fill, 5.5 2x4x8s and 36 screws each.',
  },
  {
    id: 'gabionTables',
    label: 'Wood-topped gabion tables included',
    detail: 'The spreadsheet worked out the mesh and stone for them, but its summary pointed at an empty cell, so they were left out of the total.',
  },
  {
    id: 'porchSwings',
    label: 'Porch swings use the porch-swing count',
    detail: 'The porch-swing line read the hammock count instead.',
  },
  {
    id: 'stageCutLists',
    label: 'Stages read their own cut lists',
    detail:
      'The 16\' stage read its board counts from the bench rows, its prices from the delivery-time column and its screws from the 12\' stage, and its corner braces tested an empty cell; the 8\' stage’s screw count used a blank cell. Each now uses its own cut list: 16\' — 6 1x6x16, 3 2x4x16, 2 4x4x8, 1 2x4x10, 164 screws, 24 corner braces; 8\' — 92 screws.',
  },
  {
    id: 'samePrice',
    label: 'Same item, same price',
    detail:
      'A few lines had no price although the spreadsheet prices the same item elsewhere: the 2x4x8s for benches with armrests ($5), the gabion tables’ 2x4s (2x4x8s in its cut list, $5) and off-the-shelf cafe tables and chairs ($160, as in the optional list).',
  },
  {
    id: 'wholeUnits',
    label: 'Whole units',
    detail:
      'Stakes are bought in whole packages, soil and mulch in whole deliveries, and L-brackets, screws, cold frames and boards as whole items. The spreadsheet rounds most purchases up but left these as fractions.',
  },
  {
    id: 'priceNeeded',
    label: 'Missing prices are asked for, not counted as $0',
    detail:
      'Lumber sizes the spreadsheet has no price for, cisterns and stages of other sizes are listed as “price needed”. Fill in a price and it is added to the total.',
  },
  {
    id: 'perennialsPerSquare',
    label: 'Perennials: 5 per planting square, as in the plant lists',
    detail:
      'The cost spreadsheet counts 4 perennials in every planting square (INSERT HERE C30). Park in a Truck’s four plant-list spreadsheets — the ones you choose your plants with — count 5 (their INSERT HERE: green squares × 5), and so does the plant picker. The estimate now uses 5, so the budget matches the plants you will buy.',
  },
  {
    id: 'guideMaterials',
    label: 'Furniture from the build guides',
    detail:
      'Benches, stools, tables, planters, gabion benches, the workbench, the shade structure and the stage are priced from each Park in a Truck build guide’s own materials and hardware lists, at the spreadsheet’s prices; anything the spreadsheet has no price for is “price needed”. The spreadsheet’s own furniture lines disagree with the guides (its bench with back lists 4x4, 2x10, 2x6 and 2x8 lumber the guide never uses). Where a guide’s cut list needs more boards than its materials list says, the estimate orders what the cut list needs and the line says why (counted with ⅛″ per saw cut; the stage needs 25 2x4x8s, not 16). A 12\'x8\' stage is the Stage guide’s stage (6 squares); shade canopies are counted in the Shade guide’s 8\'x8\' structures; 4\' and 6\' tables, planters, workbenches and 8\' gabion benches, which the spreadsheet has no question for, are priced too.',
  },
  {
    id: 'orderList',
    label: 'Order list matches the estimate',
    orderListOnly: true,
    detail:
      'The spreadsheet’s order list read the wrong rows for staples and gabion-table panels, never found the lag screws (different spelling), priced solar lights differently, left out erosion control, the edging hardware, plants, corner braces and the off-the-shelf items, and added an unlabelled $175. It is now built from the same lines as the estimate, so its total equals the estimate’s total costs. The same item from different pieces is one row; different products the spreadsheet gives the same name (its two L-brackets) stay separate, and links the spreadsheet points at a different lumber size are flagged.',
  },
];

export const ALL_FIXES: FixId[] = FIXES.map((f) => f.id);

/**
 * Perennials in one 4' x 4' planting square: 5 in Park in a Truck's four plant-list
 * spreadsheets (INSERT HERE, "# of squares" × 5) and the plant picker
 * (src/data/plants.ts PLANTS_PER_SQUARE; a test keeps the two equal), 4 in the
 * cost spreadsheet (INSERT HERE C30).
 */
export const PERENNIALS_PER_SQUARE = 5;

/** Assumptions kept as the spreadsheet has them (not clearly errors). */
export const KEPT_ASSUMPTIONS: string[] = [
  'Gravel (base and surface) is worked out for the whole park area, planting squares included.',
  'The unlabelled $175 in the spreadsheet’s order list is left out, as the spreadsheet’s own estimate leaves it out.',
  'Prices are the spreadsheet’s, including a large tree ($75) costing less than a small one ($100), and 1x6x12 boards at $4 for edges but $10 for the stage.',
  'Stakes: one per 20 sq ft (the spreadsheet’s “squares” here are the area ÷ 4).',
  'Gravel edges: the 1x4x12 count includes the 2x4 count, and the supports are worked out for the whole edge (the spreadsheet lists no softscape supports for gravel edges).',
  'The 12x8 trellis gets 20% extra lumber and screws.',
  'Compost bins are priced by their chicken wire only; wood-topped gabion tables, long (communal) tables, keyhole gardens and the 12x8 trellis, which have no build guide, use the spreadsheet’s own lines.',
  'Mulch is the spreadsheet’s 2″ over the planting squares, although the Create workbook says to install 4″; the mulch line shows what 4″ would need.',
  'Raised-bed wood edges have no calculation in the spreadsheet, so they are not priced.',
];
