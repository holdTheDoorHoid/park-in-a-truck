// The spreadsheet's ORDER LIST tab: the same materials merged by name ("all the
// 2x4x8s in the park"), with where to buy them and how long delivery takes.
// Each quantity is a SUMIF over the QUANTITES PER ITEM tab. Several of those
// SUMIFs have ranges that are shifted by a row or two, or look for a name
// spelled differently, so a few quantities are wrong in the sheet. They are
// reproduced as the sheet has them, and each row's `flags` says what the
// quantity tab actually worked out. See docs/cost-model.md ("ORDER LIST").

import type { CostInputs, CostLine } from './model';
import { CONTINGENCY, LUMBER, PRICES, vendorOf } from './prices';

/** The QUANTITES PER ITEM values the order list sums (column J, plus a few others). */
export interface QpiQuantities {
  J12: number;
  J13: number;
  J14: number;
  J19: number;
  J20: number;
  J26: number;
  J27: number;
  J28: number;
  J29: number;
  J30: number;
  J35: number;
  J49: number;
  J50: number;
  J67: number;
  J77: number;
  J79: number;
  J84: number;
  J86: number;
  J101: number;
  J102: number;
  J103: number;
  J104: number;
  J105: number;
  J122: number;
  J125: number;
  J126: number;
  J136: number;
  J137: number;
  J150: number;
  J151: number;
  J163: number;
  J164: number;
  J176: number;
  J177: number;
  J178: number;
  J181: number;
  /** C186: stage squares x 4 */
  stageLength: number;
  J222: number;
  J223: number;
  J224: number;
  J276: number;
  J279: number;
  J280: number;
  J282: number;
  J284: number;
  J286: number;
  J288: number;
  J290: number;
  J292: number;
  J294: number;
  J296: number;
  M276: number;
  M279: number;
  M284: number;
  M286: number;
  M288: number;
  M290: number;
  M292: number;
  /** INSERT HERE!F34, which the order list adds as a lump sum */
  plantingSubtotal: number;
}

export interface OrderListRow {
  /** Unique within the list */
  key: string;
  /** Row on the spreadsheet's ORDER LIST tab (0 for rows the corrected list adds) */
  row: number;
  section: string;
  item: string;
  /** Column D, as the sheet has it */
  qty: number;
  unit: string;
  /** Column N (for the off-the-shelf rows 60–68: column M, which holds the unit price there) */
  unitPrice: number | null;
  /** Column O (rows 60–68: column N), or null where the sheet has none */
  total: number | null;
  /** Counted in the order list's own total (O71) */
  inTotal: boolean;
  link?: string;
  vendor?: string;
  /** "DELIVERY TIME" column */
  leadTime?: string;
  /** "PHASE" column (the Create workbook's build phases) */
  phase?: number;
  /** PiaT's note or alternative (column I) */
  note?: string;
  /** Where this row disagrees with the quantity tab or is left out of a total */
  flags: string[];
  /** Corrected list: no price yet (see the estimate's price-needed items) */
  needsPrice?: boolean;
  /** Corrected list: what it is for ("4' bench with back", "Outer edges + raised beds", …) */
  usedFor?: string[];
}

export interface OrderListTool {
  section: string;
  item: string;
  link?: string;
  /** PiaT's note */
  note?: string;
  /** A short note clearly marked as from this site (legal or health trouble; DESIGN.md §2), with its official source */
  siteNote?: { text: string; link: string };
  /** Where the spreadsheet's link no longer goes to the product */
  linkFlag?: string;
}

export interface OrderListResult {
  rows: OrderListRow[];
  /** Section name -> PiaT's tip for it */
  tips: Record<string, string>;
  /** Amounts the sheet adds to its total that are not rows */
  extras: { label: string; amount: number }[];
  /** Sheet list only — P18 = O6:O18 + an unlabelled $175 */
  subtotalLayoutSoilGravel?: number;
  /** Sheet list only — P23 = P18 + O20:O23 + the plants subtotal (INSERT HERE!F34) */
  subtotalWithGabionsAndPlants?: number;
  /** Sheet list: O71 = P23 + O29:O53, which leaves things out. Corrected list: the estimate's total costs. */
  total: number;
  /** Section names in display order */
  sections: string[];
  /** Notes about the whole list */
  notes: string[];
  /** Tool and equipment suggestions at the bottom of the tab (no quantities) */
  tools: OrderListTool[];
}

const S = {
  layout: 'Layout + protection',
  soil: 'Soil',
  gravel: 'Gravel',
  gabions: 'Gabion baskets',
  wood: 'Wood for furnishings',
  wire: 'Wire',
  hardware: 'Hardware',
  shelf: 'Off-the-shelf',
} as const;

const PIAT_NOTES = [
  'You do not have to use these products, but they are the suggested things to order. The links give more detail about each product if you want to buy it elsewhere.',
  'Delivery times are for ordering online or in store. Most items can be bought elsewhere, from Home Depot or Lowe’s, etc.',
];
const TIP_QTY = 'This is a suggested quantity; you can always talk to the supplier to confirm the material and quantity fit your site.';
const DARBY = 'https://catalog.darbywiremesh.com/category/plain-steel-mesh-by-mesh-count';
const HD = 'https://www.homedepot.com/p/';

// site-added safety note (owner's decision 2026-10-04, DESIGN.md §2): legal trouble without a permit
const HYDRANT_NOTE = {
  text: 'Note from this site: opening a fire hydrant in Philadelphia needs a Philadelphia Water Department permit and a backflow preventer —',
  link: 'https://water.phila.gov/development/connections/hydrant-permits/',
};
// checked 2026-10-04: both Diamond Tool product links redirect to whitecap.com/our-companies/diamond-tool
const DIAMOND_GONE = 'This link from the spreadsheet now opens a general White Cap (Diamond Tool) page, not the product.';

const TOOLS: OrderListResult['tools'] = [
  { section: 'Tools', item: 'Impact driver' },
  { section: 'Tools', item: 'Impact driver adaptor', link: 'https://www.amazon.com/DEWALT-DW2055B-6-Inch-Magnetic-Drive/dp/B000HNFKHS' },
  { section: 'Highly recommended tools', item: 'Auger bit', link: 'https://www.amazon.com/dp/B087D38RH7' },
  { section: 'Highly recommended tools', item: 'Impact driver adaptor sizes', link: 'https://www.amazon.com/DEWALT-DWAIND-5-COMPACT-NUT-DRIVER/dp/B07SNGL2GX' },
  { section: 'Additional elements', item: 'Fire hydrant opener — hose adapter', link: 'https://www.diamondtool.net/philadelphia-fire-hydrant-hose-adapter-34/product/0/hydrant%20r-34', siteNote: HYDRANT_NOTE, linkFlag: DIAMOND_GONE },
  { section: 'Additional elements', item: 'Fire hydrant opener — gear puller to open', link: 'https://www.diamondtool.net/proto-j4035-2-jaw-gear-puller-7-5-ton-rating/product/0/proto%20j4035', siteNote: HYDRANT_NOTE, linkFlag: DIAMOND_GONE },
  { section: 'Additional elements', item: 'Skid steer', note: 'Machine for a week.' },
];

export function buildOrderList(q: QpiQuantities, i: CostInputs): OrderListResult {
  const s8 = q.stageLength === 8 ? 1 : 0;
  const s12 = q.stageLength === 12 ? 1 : 0;
  const s16 = q.stageLength === 16 ? 1 : 0;
  const J188 = 17 * s8;
  const J189 = 3 * s8;
  const J191 = 24 * s8;
  const J194 = 16 * s12;
  const J195 = 3 * s12;
  const J197 = 1 * s12;
  const J198 = 34 * s12;
  const J199 = 16 * s12;
  const J207 = 124 * s16;

  const rows: OrderListRow[] = [];
  const P = PRICES;
  function row(
    r: number,
    section: string,
    item: string,
    qty: number,
    unit: string,
    unitPrice: number | null,
    o: { total?: number | null; inTotal?: boolean; link?: string; lead?: string; phase?: number; note?: string; flags?: (string | false)[] } = {},
  ) {
    const total = o.total !== undefined ? o.total : unitPrice === null ? null : qty * unitPrice;
    rows.push({
      key: `r${r}`,
      row: r,
      section,
      item,
      qty,
      unit,
      unitPrice,
      total,
      inTotal: o.inTotal ?? total !== null,
      link: o.link,
      vendor: vendorOf(o.link),
      leadTime: o.lead,
      phase: o.phase,
      note: o.note,
      flags: (o.flags ?? []).filter((f): f is string => Boolean(f)),
    });
  }

  // ---- LAYOUT + PROTECTION ----
  row(5, S.layout, 'Erosion control', q.J12, 'roll', null, {
    phase: 1,
    lead: '4-7 Days',
    link: P.erosionControl.link,
    flags: [q.J12 > 0 && 'No price in the order list (the estimate prices it).'],
  });
  row(6, S.layout, 'Stakes', q.J13, 'package', P.stakes.price, { phase: 1, lead: '2-3 Days', link: P.stakes.link });
  row(7, S.layout, 'Marking paint', q.J14, 'can', P.markingPaint.price, { phase: 1, lead: '2-3 Days', link: P.markingPaint.link });

  // ---- SOIL ----
  row(10, S.soil, 'Soil', q.J19, 'CY', P.soil.price, {
    phase: 4,
    lead: 'Varies',
    link: P.soil.alt,
    note: 'This will likely need to be delivered on a truck; be sure to coordinate and ask when ordering what access the truck will need.',
  });
  row(11, S.soil, 'Mulch', q.J20 + q.J35, 'CY', P.mulch.price, {
    phase: 5,
    lead: 'Varies',
    link: P.mulch.alt,
    flags: [q.J35 > 0 && 'Includes the 4" mulch for the nature play area.'],
  });

  // ---- GRAVEL ----
  row(15, S.gravel, '3/8" red tipple', q.J26, 'TONS', P.redTipple.price, { phase: 3, lead: '4-5 Days', link: P.redTipple.link });
  row(16, S.gravel, '3/4" clean stone aggregate base', q.J27, 'TONS', P.cleanStone.price, { phase: 2, lead: '4-5 Days', link: P.cleanStone.link, note: 'Or clean gravel.' });
  row(17, S.gravel, 'Filter fabric', q.J28, 'ROLL', P.filterFabric.price, { phase: 2, lead: '4-5 Days', link: P.filterFabric.link });
  // SUMIF(QPI!B6:B393, …, QPI!J7:J393): the sum range starts one row lower, so it picks up J30 (delivery trips).
  row(18, S.gravel, '3.5" staples', q.J30, 'BOX', P.staples.price, {
    phase: 2,
    lead: '4-5 Days',
    link: P.staples.link,
    flags: [q.J30 !== q.J29 && `The sheet’s order list reads the gravel-delivery row here (its ranges are shifted by one row); the quantity worked out for staples is ${q.J29} boxes.`],
  });

  // ---- GABION BASKETS ----
  row(20, S.gabions, "1'x1'x4' 5 gauge baskets", q.J49, 'EA', P.gabionBasket.price, {
    phase: 1,
    lead: '2-3 weeks',
    link: P.gabionBasket.link,
    note: 'Alternative: gabion wire (to be cut by distributor) — 2"x2", 4\'-10\' sheets, .16"-.19" dia, welded.',
  });
  row(21, S.gabions, '2\'x18"x4\' 5 gauge gabion basket', 0, 'EA', P.gabionBasket2x18x4.price, { phase: 1, lead: '2-3 weeks', link: P.gabionBasket2x18x4.link });
  row(22, S.gabions, 'Gabion 18x24x24', 0, 'EA', P.gabion18x24x24.price, { phase: 1, lead: '2-3 weeks', link: P.gabion18x24x24.link });
  row(23, S.gabions, '1-3" stone fill', q.J50 + q.J181, 'TONS', P.stoneFill.price, {
    phase: 2,
    lead: '4-5 days',
    link: 'https://www.ds-supply.com/',
    note: 'Gather as many concrete pieces as possible on site or nearby.',
    flags: [q.J181 > 0 && 'Includes stone for the wood-topped gabion tables, which the estimate leaves out of its total.'],
  });

  // ---- WOOD FOR FURNISHINGS (SUMIF over every QPI row with that name; case-insensitive) ----
  const lumberLink = (size: string) => LUMBER[size]?.link;
  const twoByFour8 = q.J67 + q.J79 + q.J84 + q.J86 + q.J101 + q.J122 + q.J136 + q.J150 + q.J163 + J189 + J197 + q.J222;
  row(29, S.wood, '2x4x8', twoByFour8, 'ea.', LUMBER['2x4x8']!.price, {
    lead: '1-3 weeks',
    link: lumberLink('2x4x8'),
    flags: [q.J101 > 0 && `Includes ${q.J101} for benches with armrests, which the estimate does not price.`],
  });
  row(30, S.wood, '2x4x12', J195 + q.J223, 'ea.', LUMBER['2x4x12']!.price, { lead: '1-3 weeks', link: lumberLink('2x4x12') });
  row(31, S.wood, '1x6x8', J188, 'ea.', LUMBER['1x6x8']!.price, { lead: '1-3 weeks', link: lumberLink('1x6x8') });
  row(32, S.wood, '1x6x12', q.J77 + J194, 'ea.', LUMBER['1x6x12']!.price, {
    lead: '1-3 weeks',
    link: lumberLink('1x6x12'),
    flags: [q.J77 > 0 && 'The estimate prices the outer-edge 1x6x12 boards at $4, this list at $10.'],
  });

  // ---- WIRE (no prices) ----
  for (const [r, size] of [
    [34, '48"x22"'],
    [35, '48"x10"'],
    [36, '22"x10"'],
    [37, '48"x34"'],
    [38, '22"x34"'],
  ] as const)
    row(r, S.wire, size, 0, 'ea.', null, { link: DARBY });
  row(39, S.wire, '22"x22"', q.J178, 'ea.', null, { link: DARBY });
  // SUMIF(QPI!B11:B414, …, QPI!$J$10:$J$410): shifted up one row, so it reads the mesh count (J176).
  row(40, S.wire, '22"x24"', q.J176, 'ea.', null, {
    link: DARBY,
    flags: [q.J176 !== q.J177 && `The sheet’s order list reads the mesh row here (shifted range); the gabion tables need ${q.J177} side panels.`],
  });
  row(41, S.wire, '48"x18"', 0, 'ea.', null, { link: DARBY });
  row(42, S.wire, '18"x18"', 0, 'ea.', null, { link: DARBY, total: 0 });

  // ---- HARDWARE ----
  // Looks for "…Galvanized Lag Screws"; the quantity tab calls them "1/4" x 1 1/2" Lag Screws", so it never matches.
  row(46, S.hardware, '1/4" x 1 1/2" galvanized lag screws', 0, 'ea', P.lagScrew.price, {
    lead: '2-3 days',
    flags: [q.J104 > 0 && `Always 0 in the sheet: it looks for “Galvanized Lag Screws” but the bench list says “Lag Screws”. Benches with armrests need ${q.J104}.`],
  });
  row(47, S.hardware, 'Timber screws 5"', 0, 'ea', P.olTimberScrew.price, { lead: '2-3 days' });
  const screws = q.J102 + q.J125 + q.J137 + q.J151 + q.J164 + J191 + J198 + J207 + q.J224; // J96 is always 0 (no input)
  row(48, S.hardware, '2.5" wood screws', screws, 'ea.', P.woodScrew.price, { lead: '2-3 days', link: P.woodScrew.link });
  row(49, S.hardware, '1/4" x 2 1/2" exterior carriage bolts + nuts + washers', q.J105, 'ea', null, { lead: '2-3 days', link: P.carriageBolt.link });
  row(50, S.hardware, '1/4" hex nuts', q.J105, 'ea', null, { lead: '2-3 days', link: `${HD}Everbilt-1-4-in-20-tpi-Zinc-Hex-Nut-100-Pack-801730/204274089` });
  row(51, S.hardware, '1/4" washers', q.J105, 'ea', null, { lead: '2-3 days', link: `${HD}Everbilt-1-4-in-Zinc-Flat-Washer-100-Pack-800452/204276405` });
  row(52, S.hardware, 'Backrest brackets', q.J103 + q.J126, 'ea.', P.backrestBracket.price, { lead: '1-3 weeks', link: P.backrestBracket.link, note: 'Must be ordered online.' });
  row(53, S.hardware, '2" wood screws', 0, 'ea.', P.olWoodScrew2in.price, { lead: '2-3 days' });
  const braces = J199; // + J208, always 0
  row(54, S.hardware, 'Corner braces', braces, 'ea.', P.cornerBrace.price, {
    inTotal: false,
    lead: '1-3 weeks',
    link: P.cornerBrace.link,
    flags: [braces > 0 && 'Not included in the order list’s total (its sum stops one row above).'],
  });
  row(55, S.hardware, '#12 1 1/2" wood screws', 0, 'ea.', P.olWoodScrew12.price, { inTotal: false, lead: '2-3 days', link: P.olWoodScrew12.link });

  // ---- OFF-THE-SHELF (rows 60–68 copy the quantity tab one column over: M = unit price, N = row total) ----
  const shelf = { inTotal: false, lead: '2-3 Days', phase: 6 };
  row(59, S.shelf, 'Solar lights', q.J296, 'pack', P.olSolarLights.price, {
    ...shelf,
    link: P.solarLightsPack.link,
    flags: [q.J296 > 0 && `$${P.olSolarLights.price} a pack here; the estimate uses $${P.solarLightsPack.price} per pack of 16.`],
  });
  row(60, S.shelf, 'Cafe tables + chairs', q.J276, 'EA', P.cafeSet.price, { ...shelf, total: q.M276, link: P.cafeSet.link });
  row(61, S.shelf, 'Solar bubbler', q.J279, 'EA', P.bubbler.price, { ...shelf, total: q.M279, link: P.bubbler.link });
  row(62, S.shelf, 'Bird bath', q.J280 + q.J282, 'EA', P.birdBath.price, {
    ...shelf,
    total: null,
    link: P.birdBath.link,
    flags: [q.J280 + q.J282 > 0 && 'The sheet shows no total here.', q.J280 > 0 && 'Includes the bird baths of the fountains.'],
  });
  row(63, S.shelf, 'Bird house', q.J284, 'EA', P.birdHouse.price, { ...shelf, total: q.M284, link: P.birdHouse.link });
  row(64, S.shelf, 'Event tent', q.J286, 'EA', P.eventTent.price, { ...shelf, total: q.M286, link: P.eventTent.link });
  row(65, S.shelf, 'Adirondack chair', q.J288, 'EA', P.adirondackChair.price, { ...shelf, total: q.M288, link: P.adirondackChair.link });
  row(66, S.shelf, 'Hammock', q.J290, 'EA', P.hammock.price, { ...shelf, total: q.M290, link: P.hammock.link });
  row(67, S.shelf, 'Free-standing swing', q.J292, 'EA', P.porchSwing.price, {
    ...shelf,
    total: q.M292,
    link: P.porchSwing.link,
    flags: [i.porchSwings !== i.hammocks && (i.porchSwings > 0 || i.hammocks > 0) && 'Uses the hammock count, not the porch-swing count.'],
  });
  row(68, S.shelf, 'Trash can', q.J294, 'EA', P.trashCan.price, {
    ...shelf,
    total: null,
    link: P.trashCan.link,
    flags: [q.J294 > 0 && 'The sheet shows no total here.'],
  });

  const sumRows = (from: number, to: number) => rows.filter((x) => x.row >= from && x.row <= to && x.inTotal).reduce((a, x) => a + (x.total ?? 0), 0);
  const subtotalLayoutSoilGravel = sumRows(6, 18) + CONTINGENCY.orderListExtra;
  const subtotalWithGabionsAndPlants = subtotalLayoutSoilGravel + sumRows(20, 23) + q.plantingSubtotal;
  const total = subtotalWithGabionsAndPlants + sumRows(29, 53);

  const notes = [...PIAT_NOTES];
  if (i.gravelEdgeFt > 0 || i.outerEdgeFt > 0)
    notes.push('The order list has no wood-edging rows: the 1x4x12 boards, L-brackets and screws for the edges are only in the estimate (the 2x4x8 and 1x6x12 boards are counted under wood).');
  if (q.plantingSubtotal > 0) notes.push('Plants are not listed; the order list adds the plants subtotal from the estimate as one amount.');

  return {
    rows,
    sections: [...new Set(rows.map((x) => x.section))],
    tips: {
      [S.soil]: TIP_QTY,
      [S.gravel]: TIP_QTY,
      [S.wood]: 'Order all your wood from Home Depot or Lowe’s, etc. and have it delivered.',
    },
    extras: [
      { label: 'Plants (the estimate’s plants subtotal)', amount: q.plantingSubtotal },
      { label: 'Unlabelled amount the sheet adds to its first subtotal', amount: CONTINGENCY.orderListExtra },
    ],
    subtotalLayoutSoilGravel,
    subtotalWithGabionsAndPlants,
    total,
    notes,
    tools: TOOLS,
  };
}

// ---- corrected order list: the estimate's own lines, merged by material ----

const SECTIONS = ['Layout + protection', 'Soil', 'Gravel', 'Gabion baskets', 'Lumber', 'Wire', 'Hardware', 'Other materials', 'Plants', 'Additional furnishings', 'Off-the-shelf'];

interface Meta {
  label?: string;
  section?: string;
  lead?: string;
  phase?: number;
  note?: string;
  link?: string;
}

const P = PRICES;
/** Delivery times, phases, notes and links from the spreadsheet's ORDER LIST tab, by material. */
const META: Record<string, Meta> = {
  'erosion-control': { lead: '4-7 Days', phase: 1 },
  stakes: { lead: '2-3 Days', phase: 1 },
  'marking-paint': { lead: '2-3 Days', phase: 1 },
  soil: {
    label: 'Soil',
    lead: 'Varies',
    phase: 4,
    link: P.soil.alt,
    note: 'This will likely need to be delivered on a truck; be sure to coordinate and ask when ordering what access the truck will need.',
  },
  mulch: { label: 'Mulch', lead: 'Varies', phase: 5, link: P.mulch.alt },
  'soil-delivery': { label: 'Soil and mulch delivery' },
  'red-tipple': { label: '3/8" red tipple', lead: '4-5 Days', phase: 3 },
  'clean-stone': { label: '3/4" clean stone aggregate base', lead: '4-5 Days', phase: 2, note: 'Or clean gravel.' },
  'filter-fabric': { lead: '4-5 Days', phase: 2 },
  staples: { lead: '4-5 Days', phase: 2 },
  'gravel-delivery': { label: 'Gravel delivery' },
  'gabion-basket': { lead: '2-3 weeks', phase: 1, note: 'Alternative: gabion wire (to be cut by distributor) — 2"x2", 4\'-10\' sheets, .16"-.19" dia, welded.' },
  'gabion-basket-2x18x4': { section: 'Gabion baskets', label: '2\'x18"x4\' 5 gauge gabion baskets', lead: '2-3 weeks', phase: 1 },
  'stone-fill': { section: 'Gabion baskets', label: '1-3" stone fill', lead: '4-5 days', phase: 2, note: 'Gather as many concrete pieces as possible on site or nearby.' },
  'welded-mesh': { section: 'Wire', note: 'Gabion wire, to be cut by the distributor into the panels below.' },
  'panel:22x24': { section: 'Wire', label: 'Side panels 22"x24"', note: 'Cut from the mesh (included in its price).' },
  'panel:22x22': { section: 'Wire', label: 'Bottom panels 22"x22"', note: 'Cut from the mesh (included in its price).' },
  'wood-screw': { section: 'Hardware', label: '2.5" wood screws', lead: '2-3 days', note: 'For furniture (the build guides’ self-driving exterior wood screws).' },
  'carriage-bolt': { section: 'Hardware', label: '1/4" x 2 1/2" exterior carriage bolts + nuts + washers', lead: '2-3 days' },
  'backrest-bracket': { section: 'Hardware', label: 'Backrest brackets', lead: '1-3 weeks', note: 'Must be ordered online.' },
  'corner-brace': { section: 'Hardware', label: 'Corner braces', lead: '1-3 weeks' },
  'lag-screw': { section: 'Hardware', label: '1/4" x 1 1/2" lag screws', lead: '2-3 days' },
  // the spreadsheet calls both "L-BRACKET" but links two different products at the same price
  'l-bracket-2in': { section: 'Hardware', label: 'L-brackets (2" double-wide corner brace)', note: 'For the wood edge around gravel.' },
  'l-bracket-5in': { section: 'Hardware', label: 'L-brackets (5" corner brace)', note: 'For the outer edges.' },
  'self-driving-screw': {
    section: 'Hardware',
    label: '2 1/2" self-driving screws (washer head)',
    note: 'For the wood edges. A different screw from the 2.5″ wood screws for furniture: the spreadsheet links a washer-head screw here, at $0.75 each.',
  },
  'lumber:1x4x12': { section: 'Lumber', lead: '1-3 weeks', note: 'The spreadsheet gives no supplier or link for this board.' },
  'gabion-basket-18x18x48': { section: 'Gabion baskets', label: 'Gabion baskets 18"x18"x48" (welded-wire mesh)', lead: '2-3 weeks', phase: 1 },
  'guide:gabion-basket-18x18x96': { section: 'Gabion baskets', label: 'Gabion baskets 18"x18"x96" (welded-wire mesh)', lead: '2-3 weeks', phase: 1 },
  'guide:deck-blocks': { section: 'Other materials', note: 'Only if needed (Shade guide, step 8).' },
  'concrete-screw': { section: 'Hardware', label: '2" concrete screws' },
  'bird-bath': { label: 'Bird bath' },
  'cafe-set': { label: 'Cafe tables + chairs' },
};

const CATEGORY_SECTION: Record<string, string> = {
  layout: 'Layout + protection',
  soil: 'Soil',
  playArea: 'Soil',
  gravel: 'Gravel',
  gabions: 'Gabion baskets',
  planting: 'Plants',
  additional: 'Additional furnishings',
  offTheShelf: 'Off-the-shelf',
  optional: 'Off-the-shelf',
  furnishings: 'Hardware',
};

const CATEGORY_LABEL: Record<string, string> = {
  gabions: "1' gabion baskets",
  gravelEdge: 'Wood edge around gravel',
  outerEdge: 'Outer edges',
  furnishings: 'Furnishings',
};

/**
 * The order list built from the corrected estimate's own lines: one row per
 * material (all the 2x4x8s together), with the ORDER LIST tab's delivery times
 * and notes. Its total is the estimate's total costs (before tool rental and
 * contingency); lines that still need a price are listed without a cost.
 */
export function buildMergedOrderList(lines: CostLine[], _i: CostInputs): OrderListResult {
  const rows = new Map<string, OrderListRow>();
  const extras: OrderListResult['extras'] = [];
  for (const l of lines) {
    if (l.category === 'contingency' || l.category === 'doubleCounted') continue;
    if (l.unit === '') {
      // "Plus 20%" on the trellis: a cost, not something to order
      if (l.inTotal && l.total) extras.push({ label: `${l.group ? `${l.group}: ` : ''}${l.item.toLowerCase()} (${l.notes ?? ''})`.replace(' ()', ''), amount: l.total });
      continue;
    }
    if (!l.inTotal && !l.needsPrice) continue;
    const material = l.material ?? `${l.category}:${l.item}`;
    const lumber = material.startsWith('lumber:');
    const meta: Meta =
      META[material] ??
      (lumber ? { lead: '1-3 weeks' } : material.startsWith('panel:') ? { section: 'Wire' } : material.startsWith('guide:fabric') ? { section: 'Other materials' } : {});
    const key = `${material}@${l.needsPrice ? 'np' : l.unitPrice}`;
    const usedFor = l.group ?? CATEGORY_LABEL[l.category];
    let row = rows.get(key);
    if (!row) {
      const link = meta.link ?? (lumber ? (LUMBER[material.slice(7)]?.link ?? l.link) : l.link);
      row = {
        key,
        row: 0,
        section: lumber ? 'Lumber' : (meta.section ?? CATEGORY_SECTION[l.category] ?? 'Hardware'),
        item: meta.label ?? (lumber ? material.slice(7) : l.item.replace(/ \(.*\)$/, '')),
        qty: 0,
        unit: l.unit,
        unitPrice: l.needsPrice ? null : l.unitPrice,
        total: l.needsPrice ? null : 0,
        inTotal: !l.needsPrice,
        link,
        vendor: vendorOf(link),
        leadTime: meta.lead ?? (CATEGORY_SECTION[l.category] === 'Off-the-shelf' ? '2-3 Days' : undefined),
        phase: meta.phase ?? (CATEGORY_SECTION[l.category] === 'Off-the-shelf' ? 6 : undefined),
        note: meta.note,
        flags: [
          ...(l.needsPrice ? ['Price needed — the spreadsheet has none. Enter it with the estimate.'] : []),
          ...(lumber && LUMBER[material.slice(7)]?.wrongSize && link === LUMBER[material.slice(7)]!.link
            ? [`The spreadsheet’s link for this is a ${LUMBER[material.slice(7)]!.wrongSize} — check the size when you order.`]
            : []),
        ],
        needsPrice: l.needsPrice,
        usedFor: [],
      };
      rows.set(key, row);
    }
    row.qty += l.qty;
    if (row.total !== null) row.total += l.total;
    if (usedFor && !row.usedFor!.includes(usedFor)) row.usedFor!.push(usedFor);
  }

  // The same board at two prices (1x6x12: $4 for edges, $10 for the stage): say so.
  const byItem = new Map<string, OrderListRow[]>();
  for (const r of rows.values()) byItem.set(r.item, [...(byItem.get(r.item) ?? []), r]);
  for (const same of byItem.values())
    if (same.length > 1 && same.some((r) => r.unitPrice !== null))
      for (const r of same) r.flags.push('The spreadsheet prices this item differently in different places; both prices are kept.');

  const ordered = [...rows.values()].sort((a, b) => SECTIONS.indexOf(a.section) - SECTIONS.indexOf(b.section));
  const total = ordered.reduce((a, r) => a + (r.total ?? 0), 0) + extras.reduce((a, x) => a + x.amount, 0);
  const notes = [
    ...PIAT_NOTES,
    'Quantities and prices are the estimate’s, merged by material; the total is the estimate’s total costs, before tool rental and contingency.',
  ];
  if (ordered.some((r) => r.needsPrice)) notes.push('Items marked “price needed” are not in the total until you enter a price.');
  return {
    rows: ordered,
    sections: SECTIONS.filter((s) => ordered.some((r) => r.section === s)),
    tips: { Soil: TIP_QTY, Gravel: TIP_QTY, Lumber: 'Order all your wood from Home Depot or Lowe’s, etc. and have it delivered.' },
    extras,
    total,
    notes,
    tools: TOOLS,
  };
}
