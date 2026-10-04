// The spreadsheet's ORDER LIST tab: the same materials merged by name ("all the
// 2x4x8s in the park"), with where to buy them and how long delivery takes.
// Each quantity is a SUMIF over the QUANTITES PER ITEM tab. Several of those
// SUMIFs have ranges that are shifted by a row or two, or look for a name
// spelled differently, so a few quantities are wrong in the sheet. They are
// reproduced as the sheet has them, and each row's `flags` says what the
// quantity tab actually worked out. See docs/cost-model.md ("ORDER LIST").

import type { CostInputs, CostLine } from './model';
import { CONTINGENCY, LUMBER, PRICES, vendorOf } from './prices';
import { EN, bare, price, type CostKey, type CostT } from './text';

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

/** Section ids; their names are in the cost catalog (order.section.<id>). */
type SectionId = 'layout' | 'soil' | 'gravel' | 'gabions' | 'wood' | 'lumber' | 'wire' | 'hardware' | 'other' | 'plants' | 'additional' | 'shelf';
const section = (t: CostT, id: SectionId) => t(`order.section.${id}`);

/** Delivery times as the ORDER LIST tab writes them (cost catalog: order.lead.*). */
type Lead = 'days4to7' | 'days2to3' | 'days2to3b' | 'days4to5' | 'days4to5b' | 'weeks2to3' | 'weeks1to3' | 'varies';
const lead = (t: CostT, id: Lead | undefined) => (id ? t(`order.lead.${id}`) : undefined);

const piatNotes = (t: CostT) => [t('order.piat1'), t('order.piat2')];
const DARBY = 'https://catalog.darbywiremesh.com/category/plain-steel-mesh-by-mesh-count';
const HD = 'https://www.homedepot.com/p/';

/** The tools and equipment at the bottom of the ORDER LIST tab. */
function tools(t: CostT): OrderListResult['tools'] {
  // site-added safety note (owner's decision 2026-10-04, DESIGN.md §2): legal trouble without a permit
  const hydrant = { text: t('order.tool.hydrantNote'), link: 'https://water.phila.gov/development/connections/hydrant-permits/' };
  // checked 2026-10-04: both Diamond Tool product links redirect to whitecap.com/our-companies/diamond-tool
  const gone = t('order.tool.diamondGone');
  const tools = t('order.section.tools');
  const recommended = t('order.section.recommended');
  const elements = t('order.section.elements');
  return [
    { section: tools, item: t('order.tool.impactDriver') },
    { section: tools, item: t('order.tool.adaptor'), link: 'https://www.amazon.com/DEWALT-DW2055B-6-Inch-Magnetic-Drive/dp/B000HNFKHS' },
    { section: recommended, item: t('order.tool.augerBit'), link: 'https://www.amazon.com/dp/B087D38RH7' },
    { section: recommended, item: t('order.tool.adaptorSizes'), link: 'https://www.amazon.com/DEWALT-DWAIND-5-COMPACT-NUT-DRIVER/dp/B07SNGL2GX' },
    {
      section: elements,
      item: t('order.tool.hoseAdapter'),
      link: 'https://www.diamondtool.net/philadelphia-fire-hydrant-hose-adapter-34/product/0/hydrant%20r-34',
      siteNote: hydrant,
      linkFlag: gone,
    },
    {
      section: elements,
      item: t('order.tool.gearPuller'),
      link: 'https://www.diamondtool.net/proto-j4035-2-jaw-gear-puller-7-5-ton-rating/product/0/proto%20j4035',
      siteNote: hydrant,
      linkFlag: gone,
    },
    { section: elements, item: t('order.tool.skidSteer'), note: t('order.tool.skidSteerNote') },
  ];
}

export function buildOrderList(q: QpiQuantities, i: CostInputs, t: CostT = EN): OrderListResult {
  const S = {
    layout: section(t, 'layout'),
    soil: section(t, 'soil'),
    gravel: section(t, 'gravel'),
    gabions: section(t, 'gabions'),
    wood: section(t, 'wood'),
    wire: section(t, 'wire'),
    hardware: section(t, 'hardware'),
    shelf: section(t, 'shelf'),
  };
  const tipQty = t('order.tipQty');
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
    o: { total?: number | null; inTotal?: boolean; link?: string; lead?: Lead; phase?: number; note?: string; flags?: (string | false)[] } = {},
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
      leadTime: lead(t, o.lead),
      phase: o.phase,
      note: o.note,
      flags: (o.flags ?? []).filter((f): f is string => Boolean(f)),
    });
  }

  // ---- LAYOUT + PROTECTION ----
  row(5, S.layout, t('line.erosionControl'), q.J12, 'roll', null, {
    phase: 1,
    lead: 'days4to7',
    link: P.erosionControl.link,
    flags: [q.J12 > 0 && t('order.flag.erosion')],
  });
  row(6, S.layout, t('line.stakes'), q.J13, 'package', P.stakes.price, { phase: 1, lead: 'days2to3', link: P.stakes.link });
  row(7, S.layout, t('line.markingPaint'), q.J14, 'can', P.markingPaint.price, { phase: 1, lead: 'days2to3', link: P.markingPaint.link });

  // ---- SOIL ----
  row(10, S.soil, t('order.item.soil'), q.J19, 'CY', P.soil.price, {
    phase: 4,
    lead: 'varies',
    link: P.soil.alt,
    note: t('order.note.soilTruck'),
  });
  row(11, S.soil, t('order.item.mulch'), q.J20 + q.J35, 'CY', P.mulch.price, {
    phase: 5,
    lead: 'varies',
    link: P.mulch.alt,
    flags: [q.J35 > 0 && t('order.flag.playMulch')],
  });

  // ---- GRAVEL ----
  row(15, S.gravel, t('order.item.redTipple'), q.J26, 'TONS', P.redTipple.price, { phase: 3, lead: 'days4to5', link: P.redTipple.link });
  row(16, S.gravel, t('order.item.cleanStone'), q.J27, 'TONS', P.cleanStone.price, { phase: 2, lead: 'days4to5', link: P.cleanStone.link, note: t('order.note.cleanGravel') });
  row(17, S.gravel, t('line.filterFabric'), q.J28, 'ROLL', P.filterFabric.price, { phase: 2, lead: 'days4to5', link: P.filterFabric.link });
  // SUMIF(QPI!B6:B393, …, QPI!J7:J393): the sum range starts one row lower, so it picks up J30 (delivery trips).
  row(18, S.gravel, t('line.staples'), q.J30, 'BOX', P.staples.price, {
    phase: 2,
    lead: 'days4to5',
    link: P.staples.link,
    flags: [q.J30 !== q.J29 && t('order.flag.staples', { count: q.J29, boxes: bare(t, q.J29) })],
  });

  // ---- GABION BASKETS ----
  row(20, S.gabions, t('line.gabionBaskets1ft'), q.J49, 'EA', P.gabionBasket.price, {
    phase: 1,
    lead: 'weeks2to3',
    link: P.gabionBasket.link,
    note: t('order.note.gabionWire'),
  });
  row(21, S.gabions, t('line.gabionBasket2x18x4'), 0, 'EA', P.gabionBasket2x18x4.price, { phase: 1, lead: 'weeks2to3', link: P.gabionBasket2x18x4.link });
  row(22, S.gabions, t('order.item.gabion18x24x24'), 0, 'EA', P.gabion18x24x24.price, { phase: 1, lead: 'weeks2to3', link: P.gabion18x24x24.link });
  row(23, S.gabions, t('line.stoneFill'), q.J50 + q.J181, 'TONS', P.stoneFill.price, {
    phase: 2,
    lead: 'days4to5b',
    link: 'https://www.ds-supply.com/',
    note: t('order.note.concrete'),
    flags: [q.J181 > 0 && t('order.flag.gabionTableStone')],
  });

  // ---- WOOD FOR FURNISHINGS (SUMIF over every QPI row with that name; case-insensitive) ----
  const lumberLink = (size: string) => LUMBER[size]?.link;
  const twoByFour8 = q.J67 + q.J79 + q.J84 + q.J86 + q.J101 + q.J122 + q.J136 + q.J150 + q.J163 + J189 + J197 + q.J222;
  row(29, S.wood, '2x4x8', twoByFour8, 'ea.', LUMBER['2x4x8']!.price, {
    lead: 'weeks1to3',
    link: lumberLink('2x4x8'),
    flags: [q.J101 > 0 && t('order.flag.armrests', { count: bare(t, q.J101) })],
  });
  row(30, S.wood, '2x4x12', J195 + q.J223, 'ea.', LUMBER['2x4x12']!.price, { lead: 'weeks1to3', link: lumberLink('2x4x12') });
  row(31, S.wood, '1x6x8', J188, 'ea.', LUMBER['1x6x8']!.price, { lead: 'weeks1to3', link: lumberLink('1x6x8') });
  row(32, S.wood, '1x6x12', q.J77 + J194, 'ea.', LUMBER['1x6x12']!.price, {
    lead: 'weeks1to3',
    link: lumberLink('1x6x12'),
    flags: [q.J77 > 0 && t('order.flag.board1x6x12', { edge: price(t, P.board1x6x12Edge.price), list: price(t, LUMBER['1x6x12']!.price) })],
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
    flags: [q.J176 !== q.J177 && t('order.flag.panels', { count: q.J177, panels: bare(t, q.J177) })],
  });
  row(41, S.wire, '48"x18"', 0, 'ea.', null, { link: DARBY });
  row(42, S.wire, '18"x18"', 0, 'ea.', null, { link: DARBY, total: 0 });

  // ---- HARDWARE ----
  // Looks for "…Galvanized Lag Screws"; the quantity tab calls them "1/4" x 1 1/2" Lag Screws", so it never matches.
  row(46, S.hardware, t('order.item.galvLagScrews'), 0, 'ea', P.lagScrew.price, {
    lead: 'days2to3b',
    flags: [q.J104 > 0 && t('order.flag.lagScrews', { count: bare(t, q.J104) })],
  });
  row(47, S.hardware, t('order.item.timberScrews'), 0, 'ea', P.olTimberScrew.price, { lead: 'days2to3b' });
  const screws = q.J102 + q.J125 + q.J137 + q.J151 + q.J164 + J191 + J198 + J207 + q.J224; // J96 is always 0 (no input)
  row(48, S.hardware, t('line.woodScrews'), screws, 'ea.', P.woodScrew.price, { lead: 'days2to3b', link: P.woodScrew.link });
  row(49, S.hardware, t('line.carriageBolts'), q.J105, 'ea', null, { lead: 'days2to3b', link: P.carriageBolt.link });
  row(50, S.hardware, t('order.item.hexNuts'), q.J105, 'ea', null, { lead: 'days2to3b', link: `${HD}Everbilt-1-4-in-20-tpi-Zinc-Hex-Nut-100-Pack-801730/204274089` });
  row(51, S.hardware, t('order.item.washers'), q.J105, 'ea', null, { lead: 'days2to3b', link: `${HD}Everbilt-1-4-in-Zinc-Flat-Washer-100-Pack-800452/204276405` });
  row(52, S.hardware, t('line.backrestBrackets'), q.J103 + q.J126, 'ea.', P.backrestBracket.price, { lead: 'weeks1to3', link: P.backrestBracket.link, note: t('order.note.online') });
  row(53, S.hardware, t('order.item.woodScrews2in'), 0, 'ea.', P.olWoodScrew2in.price, { lead: 'days2to3b' });
  const braces = J199; // + J208, always 0
  row(54, S.hardware, t('line.cornerBraces'), braces, 'ea.', P.cornerBrace.price, {
    inTotal: false,
    lead: 'weeks1to3',
    link: P.cornerBrace.link,
    flags: [braces > 0 && t('order.flag.braces')],
  });
  row(55, S.hardware, t('order.item.woodScrews12'), 0, 'ea.', P.olWoodScrew12.price, { inTotal: false, lead: 'days2to3b', link: P.olWoodScrew12.link });

  // ---- OFF-THE-SHELF (rows 60–68 copy the quantity tab one column over: M = unit price, N = row total) ----
  const shelf = { inTotal: false, lead: 'days2to3' as const, phase: 6 };
  row(59, S.shelf, t('line.solarLights'), q.J296, 'pack', P.olSolarLights.price, {
    ...shelf,
    link: P.solarLightsPack.link,
    flags: [q.J296 > 0 && t('order.flag.solarLights', { pack: price(t, P.olSolarLights.price), estimate: price(t, P.solarLightsPack.price) })],
  });
  row(60, S.shelf, t('line.optCafe'), q.J276, 'EA', P.cafeSet.price, { ...shelf, total: q.M276, link: P.cafeSet.link });
  row(61, S.shelf, t('line.bubbler'), q.J279, 'EA', P.bubbler.price, { ...shelf, total: q.M279, link: P.bubbler.link });
  row(62, S.shelf, t('line.birdBath'), q.J280 + q.J282, 'EA', P.birdBath.price, {
    ...shelf,
    total: null,
    link: P.birdBath.link,
    flags: [q.J280 + q.J282 > 0 && t('order.flag.noTotal'), q.J280 > 0 && t('order.flag.fountainBaths')],
  });
  row(63, S.shelf, t('line.birdHouse'), q.J284, 'EA', P.birdHouse.price, { ...shelf, total: q.M284, link: P.birdHouse.link });
  row(64, S.shelf, t('line.eventTent'), q.J286, 'EA', P.eventTent.price, { ...shelf, total: q.M286, link: P.eventTent.link });
  row(65, S.shelf, t('line.adirondack'), q.J288, 'EA', P.adirondackChair.price, { ...shelf, total: q.M288, link: P.adirondackChair.link });
  row(66, S.shelf, t('order.item.hammock'), q.J290, 'EA', P.hammock.price, { ...shelf, total: q.M290, link: P.hammock.link });
  row(67, S.shelf, t('order.item.swing'), q.J292, 'EA', P.porchSwing.price, {
    ...shelf,
    total: q.M292,
    link: P.porchSwing.link,
    flags: [i.porchSwings !== i.hammocks && (i.porchSwings > 0 || i.hammocks > 0) && t('order.flag.swing')],
  });
  row(68, S.shelf, t('line.trashCan'), q.J294, 'EA', P.trashCan.price, {
    ...shelf,
    total: null,
    link: P.trashCan.link,
    flags: [q.J294 > 0 && t('order.flag.noTotal')],
  });

  const sumRows = (from: number, to: number) => rows.filter((x) => x.row >= from && x.row <= to && x.inTotal).reduce((a, x) => a + (x.total ?? 0), 0);
  const subtotalLayoutSoilGravel = sumRows(6, 18) + CONTINGENCY.orderListExtra;
  const subtotalWithGabionsAndPlants = subtotalLayoutSoilGravel + sumRows(20, 23) + q.plantingSubtotal;
  const total = subtotalWithGabionsAndPlants + sumRows(29, 53);

  const notes = piatNotes(t);
  if (i.gravelEdgeFt > 0 || i.outerEdgeFt > 0) notes.push(t('order.notes.edging'));
  if (q.plantingSubtotal > 0) notes.push(t('order.notes.plants'));

  return {
    rows,
    sections: [...new Set(rows.map((x) => x.section))],
    tips: {
      [S.soil]: tipQty,
      [S.gravel]: tipQty,
      [S.wood]: t('order.tipWood'),
    },
    extras: [
      { label: t('order.extra.plants'), amount: q.plantingSubtotal },
      { label: t('order.extra.175'), amount: CONTINGENCY.orderListExtra },
    ],
    subtotalLayoutSoilGravel,
    subtotalWithGabionsAndPlants,
    total,
    notes,
    tools: tools(t),
  };
}

// ---- corrected order list: the estimate's own lines, merged by material ----

const SECTIONS: SectionId[] = ['layout', 'soil', 'gravel', 'gabions', 'lumber', 'wire', 'hardware', 'other', 'plants', 'additional', 'shelf'];

interface Meta {
  label?: CostKey;
  section?: SectionId;
  lead?: Lead;
  phase?: number;
  note?: CostKey;
  link?: string;
}

const P = PRICES;
/** Delivery times, phases, notes and links from the spreadsheet's ORDER LIST tab, by material (words: cost catalog). */
const META: Record<string, Meta> = {
  'erosion-control': { lead: 'days4to7', phase: 1 },
  stakes: { lead: 'days2to3', phase: 1 },
  'marking-paint': { lead: 'days2to3', phase: 1 },
  soil: { label: 'order.item.soil', lead: 'varies', phase: 4, link: P.soil.alt, note: 'order.note.soilTruck' },
  mulch: { label: 'order.item.mulch', lead: 'varies', phase: 5, link: P.mulch.alt },
  'soil-delivery': { label: 'order.item.soilDelivery' },
  'red-tipple': { label: 'order.item.redTipple', lead: 'days4to5', phase: 3 },
  'clean-stone': { label: 'order.item.cleanStone', lead: 'days4to5', phase: 2, note: 'order.note.cleanGravel' },
  'filter-fabric': { lead: 'days4to5', phase: 2 },
  staples: { lead: 'days4to5', phase: 2 },
  'gravel-delivery': { label: 'order.item.gravelDelivery' },
  'gabion-basket': { lead: 'weeks2to3', phase: 1, note: 'order.note.gabionWire' },
  'gabion-basket-2x18x4': { section: 'gabions', label: 'order.item.gabionBaskets2x18x4', lead: 'weeks2to3', phase: 1 },
  'stone-fill': { section: 'gabions', label: 'line.stoneFill', lead: 'days4to5b', phase: 2, note: 'order.note.concrete' },
  'welded-mesh': { section: 'wire', note: 'order.note.mesh' },
  'panel:22x24': { section: 'wire', label: 'line.sidePanels', note: 'note.cutFromMesh' },
  'panel:22x22': { section: 'wire', label: 'order.item.bottomPanels', note: 'note.cutFromMesh' },
  'wood-screw': { section: 'hardware', label: 'line.woodScrews', lead: 'days2to3b', note: 'order.note.furnitureScrews' },
  'carriage-bolt': { section: 'hardware', label: 'line.carriageBolts', lead: 'days2to3b' },
  'backrest-bracket': { section: 'hardware', label: 'line.backrestBrackets', lead: 'weeks1to3', note: 'order.note.online' },
  'corner-brace': { section: 'hardware', label: 'line.cornerBraces', lead: 'weeks1to3' },
  'lag-screw': { section: 'hardware', label: 'line.lagScrews', lead: 'days2to3b' },
  // the spreadsheet calls both "L-BRACKET" but links two different products at the same price
  'l-bracket-2in': { section: 'hardware', label: 'order.item.lBracket2in', note: 'order.note.lBracket2in' },
  'l-bracket-5in': { section: 'hardware', label: 'order.item.lBracket5in', note: 'order.note.lBracket5in' },
  'self-driving-screw': { section: 'hardware', label: 'order.item.selfDriving', note: 'order.note.selfDriving' },
  'lumber:1x4x12': { section: 'lumber', lead: 'weeks1to3', note: 'order.note.board1x4x12' },
  'gabion-basket-18x18x48': { section: 'gabions', label: 'order.item.basket48', lead: 'weeks2to3', phase: 1 },
  'guide:gabion-basket-18x18x96': { section: 'gabions', label: 'order.item.basket96', lead: 'weeks2to3', phase: 1 },
  'guide:deck-blocks': { section: 'other', note: 'order.note.deckBlocks' },
  'l-bracket-shade': { section: 'hardware', label: 'order.item.lBracketShade' },
  'lag-screw-1-4in-x-1-1-4in': { section: 'hardware', lead: 'days2to3b' },
  'concrete-screw': { section: 'hardware', label: 'line.concreteScrews' },
  'bird-bath': { label: 'line.birdBath' },
  'cafe-set': { label: 'line.optCafe' },
};

const CATEGORY_SECTION: Partial<Record<string, SectionId>> = {
  layout: 'layout',
  soil: 'soil',
  playArea: 'soil',
  gravel: 'gravel',
  gabions: 'gabions',
  planting: 'plants',
  additional: 'additional',
  offTheShelf: 'shelf',
  optional: 'shelf',
  furnishings: 'hardware',
};

/** What a material is for, when its line has no piece of furniture (cost catalog: order.for.*). */
const CATEGORY_FOR: Partial<Record<string, CostKey>> = {
  gabions: 'order.for.gabions',
  gravelEdge: 'order.for.gravelEdge',
  outerEdge: 'order.for.outerEdge',
  furnishings: 'order.for.furnishings',
};

/** An item's name for the order list: without a trailing part in brackets ("4x4 shed (1 square)" -> "4x4 shed"). */
const withoutBrackets = (item: string) => item.replace(/ \(.*\)$|\s*（.*）$/u, '');

/**
 * The order list built from the corrected estimate's own lines: one row per
 * material (all the 2x4x8s together), with the ORDER LIST tab's delivery times
 * and notes. Its total is the estimate's total costs (before tool rental and
 * contingency); lines that still need a price are listed without a cost.
 */
export function buildMergedOrderList(lines: CostLine[], _i: CostInputs, t: CostT = EN): OrderListResult {
  const rows = new Map<string, OrderListRow & { sectionId: SectionId }>();
  const extras: OrderListResult['extras'] = [];
  for (const l of lines) {
    if (l.category === 'contingency' || l.category === 'doubleCounted') continue;
    if (l.unit === '') {
      // "Plus 20%" on the trellis: a cost, not something to order
      if (l.inTotal && l.total) {
        const item = l.item.toLocaleLowerCase(t.lang);
        const label =
          l.group && l.notes
            ? t('order.extra.groupNote', { group: l.group, item, note: l.notes })
            : l.group
              ? t('order.extra.group', { group: l.group, item })
              : l.notes
                ? t('order.extra.note', { item, note: l.notes })
                : item;
        extras.push({ label, amount: l.total });
      }
      continue;
    }
    if (!l.inTotal && !l.needsPrice) continue;
    const material = l.material ?? `${l.category}:${l.item}`;
    const lumber = material.startsWith('lumber:');
    const meta: Meta =
      META[material] ??
      (lumber ? { lead: 'weeks1to3' } : material.startsWith('panel:') ? { section: 'wire' } : material.startsWith('guide:fabric') ? { section: 'other' } : {});
    const key = `${material}@${l.needsPrice ? 'np' : l.unitPrice}`;
    const forKey = CATEGORY_FOR[l.category];
    const usedFor = l.group ?? (forKey ? t(forKey) : undefined);
    let row = rows.get(key);
    if (!row) {
      const link = meta.link ?? (lumber ? (LUMBER[material.slice(7)]?.link ?? l.link) : l.link);
      const sectionId: SectionId = lumber ? 'lumber' : (meta.section ?? CATEGORY_SECTION[l.category] ?? 'hardware');
      const shelf = CATEGORY_SECTION[l.category] === 'shelf';
      row = {
        key,
        row: 0,
        section: section(t, sectionId),
        sectionId,
        item: meta.label ? t(meta.label) : lumber ? material.slice(7) : withoutBrackets(l.item),
        qty: 0,
        unit: l.unit,
        unitPrice: l.needsPrice ? null : l.unitPrice,
        total: l.needsPrice ? null : 0,
        inTotal: !l.needsPrice,
        link,
        vendor: vendorOf(link),
        leadTime: lead(t, meta.lead ?? (shelf ? 'days2to3' : undefined)),
        phase: meta.phase ?? (shelf ? 6 : undefined),
        note: meta.note ? t(meta.note, { price: price(t, P.selfDrivingScrew.price) }) : undefined,
        flags: [
          ...(l.needsPrice ? [t('order.flag.priceNeeded')] : []),
          ...(lumber && LUMBER[material.slice(7)]?.wrongSize && link === LUMBER[material.slice(7)]!.link
            ? [t('note.wrongSize', { size: LUMBER[material.slice(7)]!.wrongSize })]
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
  for (const same of byItem.values()) if (same.length > 1 && same.some((r) => r.unitPrice !== null)) for (const r of same) r.flags.push(t('order.flag.twoPrices'));

  const ordered = [...rows.values()].sort((a, b) => SECTIONS.indexOf(a.sectionId) - SECTIONS.indexOf(b.sectionId)).map(({ sectionId: _, ...r }) => r as OrderListRow);
  const total = ordered.reduce((a, r) => a + (r.total ?? 0), 0) + extras.reduce((a, x) => a + x.amount, 0);
  const notes = [...piatNotes(t), t('order.notes.merged')];
  if (ordered.some((r) => r.needsPrice)) notes.push(t('order.notes.priceNeeded'));
  const tipQty = t('order.tipQty');
  return {
    rows: ordered,
    sections: SECTIONS.filter((id) => [...rows.values()].some((r) => r.sectionId === id)).map((id) => section(t, id)),
    tips: { [section(t, 'soil')]: tipQty, [section(t, 'gravel')]: tipQty, [section(t, 'lumber')]: t('order.tipWood') },
    extras,
    total,
    notes,
    tools: tools(t),
  };
}
