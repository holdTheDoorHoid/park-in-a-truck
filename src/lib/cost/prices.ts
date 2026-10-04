// Unit prices and suggested suppliers, exactly as Park in a Truck's cost-estimator
// spreadsheet has them (Dream workbook p.18, "DOWNLOAD COST ESTIMATOR").
//
// THIS IS THE ONE PLACE TO UPDATE PRICES. The date of the prices is unknown;
// the product links were collected around mid-2022 (one Amazon link in the
// ORDER LIST tab carries a July 2022 timestamp). `cells` records where each
// number sits in the sheet ("QPI" = the QUANTITES PER ITEM tab, "OL" = ORDER LIST).
// Tracking parameters were stripped from the links; the products are the sheet's.
//
// The fixture tests in src/lib/cost/__tests__ check the model against a
// LibreOffice recalculation of the original sheet, so they will (correctly)
// fail if a price here changes. Regenerate them, or update the expected values,
// when PiaT publishes new prices.

export interface Price {
  /** US dollars per `unit` */
  price: number;
  unit: string;
  /** Where the number lives in the PiaT spreadsheet */
  cells: string[];
  /** Suggested place to buy, from the sheet */
  link?: string;
  /** Second suggestion the sheet gives */
  alt?: string;
  /** When the link points at something other than the item itself */
  linkNote?: string;
}

const HD = 'https://www.homedepot.com/p/';
const LOWES = 'https://www.lowes.com/pd/';
const MULCH_EXPRESS = 'https://mulchexpresslandscapesupply.com/';
const DS = 'https://www.ds-supply.com/';
const LOWES_MULCH = `${LOWES}0-5-Cubic-yard-s-species-Shredded-Bulk-Mulch/5001761155`;

export const PRICES = {
  // ---- layout + protection (QPI "STAGING") ----
  erosionControl: { price: 50, unit: 'roll', cells: ['QPI!L12'], link: 'https://www.amazon.com/100ft-Silt-Fence-3ft-H/dp/B00HL2EABU', linkNote: '100 ft silt fence' },
  stakes: { price: 25, unit: 'package', cells: ['QPI!L13'], link: 'https://www.amazon.com/Kitzmans-Dixon-Grade-Survey-Stakes/dp/B000CSIHWI' },
  markingPaint: { price: 8, unit: 'can', cells: ['QPI!L14'], link: 'https://www.amazon.com/Rust-Oleum-266574-Professional-Distance-Fluorescent/dp/B00IA8O21W' },

  // ---- soil ----
  soil: { price: 35, unit: 'CY', cells: ['QPI!L19'], link: MULCH_EXPRESS, alt: 'https://www.underdogsupply.com/' },
  mulch: { price: 28, unit: 'CY', cells: ['QPI!L20'], link: LOWES_MULCH, alt: 'https://delcomulch.com/', linkNote: 'Lowe’s bulk mulch, sold by the half yard' },
  soilDelivery: { price: 75, unit: 'load', cells: ['QPI!L21'], link: MULCH_EXPRESS },

  // ---- gravel ----
  redTipple: { price: 52.5, unit: 'TONS', cells: ['QPI!L26'], link: DS, alt: MULCH_EXPRESS },
  cleanStone: { price: 35, unit: 'TONS', cells: ['QPI!L27'], link: DS, alt: MULCH_EXPRESS },
  filterFabric: { price: 50, unit: 'ROLL', cells: ['QPI!L28'], link: 'https://www.amazon.com/dp/B079Y869N5' },
  staples: { price: 20, unit: 'BOX', cells: ['QPI!L29'], link: 'https://www.amazon.com/100-Pack-Galvanized-Staples-Securing-Landscape/dp/B073F1VMHS' },
  gravelDelivery: { price: 50, unit: 'TRIP', cells: ['QPI!L30'], link: DS, alt: MULCH_EXPRESS },

  // ---- nature play ----
  playMulch: { price: 28, unit: 'CY', cells: ['QPI!L35'], link: LOWES_MULCH },

  // ---- wood edges ----
  board1x4x12: { price: 5, unit: 'EA', cells: ['QPI!L65'] },
  /** A literal $5 in the edging rows (the furnishings look the 2x4x8 price up in LUMBER instead). */
  edgeSupport2x4x8: { price: 5, unit: 'EA', cells: ['QPI!L67'] },
  lBracket: { price: 3.5, unit: 'EA', cells: ['QPI!L68', 'QPI!L80'], link: `${HD}Everbilt-2-in-Zinc-Plated-Double-Wide-Corner-Brace-2-Pack-15051/202033994`, alt: `${HD}Everbilt-5-in-Black-Corner-Brace-12684/315016093` },
  selfDrivingScrew: { price: 0.75, unit: 'EA', cells: ['QPI!L69', 'QPI!L81'], link: `${HD}SPAX-10-x-2-1-2-in-T-Star-Plus-Drive-Washer-Wafer-Head-Partial-Thread-Yellow-Zinc-Coated-Cabinet-Screw-75-per-Box-4281020500604/315182974` },
  concreteScrew: { price: 0.75, unit: 'EA', cells: ['QPI!L70', 'QPI!L82'], link: `${HD}Tapcon-3-16-in-x-1-3-4-in-Star-Flat-Head-Concrete-Anchors-8-Pack-28155/314110826` },
  /** The outer-edge boards are priced at $4 here, but the ORDER LIST prices 1x6x12 at $10 (OL!N32). */
  board1x6x12Edge: { price: 4, unit: 'EA', cells: ['QPI!L77'], link: `${HD}WeatherShield-2-in-x-6-in-x-12-ft-2-Prime-Ground-Contact-Pressure-Treated-Lumber-253921/206967802`, linkNote: 'the link is for a 2x6x12' },

  // ---- plants (no supplier in the sheet) ----
  perennial: { price: 10, unit: 'EA', cells: ['QPI!L39'] },
  shrub: { price: 50, unit: 'EA', cells: ['QPI!L40'] },
  smallTree: { price: 100, unit: 'EA', cells: ['QPI!L41'] },
  largeTree: { price: 75, unit: 'EA', cells: ['QPI!L42'] },

  // ---- gabions ----
  gabionBasket: { price: 70, unit: 'EA', cells: ['QPI!L49', 'OL!N20'], link: 'https://gabion1.com/product/12-high-x-12-thick/', alt: 'https://catalog.darbywiremesh.com/category/plain-steel-mesh-by-mesh-count' },
  stoneFill: { price: 52.5, unit: 'TONS', cells: ['QPI!L50', 'QPI!L94', 'QPI!L181'], link: 'https://www.ds-supply.com/landscape-supply' },
  gabionBasket2x18x4: { price: 120, unit: 'EA', cells: ['QPI!L93', 'OL!N21'], link: 'https://gabion1.com/custom-price/' },
  gabion18x24x24: { price: 150, unit: 'EA', cells: ['OL!N22'], link: 'https://gabion1.com/custom-price/' },
  weldedMesh: { price: 120, unit: 'EA', cells: ['QPI!L176'], link: 'https://catalog.darbywiremesh.com/category/plain-steel-mesh-by-mesh-count' },

  // ---- hardware for furnishings ----
  woodScrew: { price: 0.17, unit: 'ea.', cells: ['OL!N48', 'QPI!L96', 'QPI!L102', 'QPI!L125', 'QPI!L137', 'QPI!L207'], link: `${HD}GRK-Fasteners-9-x-2-1-2-in-Star-Drive-Torx-Bugle-Head-R4-Multi-Purpose-Wood-Screw-300-Pack-100101/203533402` },
  backrestBracket: { price: 30, unit: 'ea.', cells: ['QPI!L103', 'QPI!L126', 'OL!N52'], link: 'https://www.hairpinlegs.com/products/bed-bracket-backrest?variant=333970359' },
  lagScrew: { price: 0.4, unit: 'ea.', cells: ['QPI!L104', 'OL!N46'] },
  carriageBolt: { price: 2, unit: 'ea.', cells: ['QPI!L105'], link: `${HD}Everbilt-1-4-in-20-x-2-1-2-in-Galvanized-Carriage-Bolt-50-Pack-803370/204273460` },
  cornerBrace: { price: 5, unit: 'ea.', cells: ['QPI!L199', 'QPI!L208', 'OL!N54'], link: `${LOWES}ReliaBilt-RB-2-5-IN-BLK-DW-CORNER-BRACE/5001634697` },

  // ---- additional furnishings (approximate, no PiaT instructions) ----
  longTable: { price: 100, unit: 'EA', cells: ['QPI!L233'] },
  compostChickenWire: { price: 45, unit: 'EA', cells: ['QPI!L240'] },
  keyholeLarge: { price: 120, unit: 'EA', cells: ['QPI!L256'] },
  keyholeMedium: { price: 100, unit: 'EA', cells: ['QPI!L257'] },
  keyholeSmall: { price: 80, unit: 'EA', cells: ['QPI!L258'] },

  // ---- off the shelf ----
  shed4x4: { price: 315, unit: 'EA', cells: ['QPI!L264'], link: 'https://www.wayfair.com/Arrow--Spacemaker-4-ft.-W-x-3-ft.-D-Metal-Vertical-Storage-Shed-CY43T21-L510-K~BDBL1085.html' },
  shed4x8: { price: 540, unit: 'EA', cells: ['QPI!L265'], link: `${LOWES}Hanover-Hanover-Outdoor-Galvanized-Steel-Patio-Multi-Use-Storage-Shed-for-Tools-Equipment-Garden-Supplies-with-2-Access-Doors-156-cu-ft-Capacity-Galvanized-Steel-HANMLTPATSHD-GRY/5000499347` },
  rainBarrel: { price: 0, unit: 'EA', cells: ['QPI!M268'], link: 'https://www.pwdraincheck.org/en/stormwater-tools/rain-barrels', linkNote: 'FREE!' },
  coldFrame: { price: 300, unit: 'EA', cells: ['QPI!L273'], link: 'https://www.gardeners.com/buy/cedar-cold-frame/8587093.html' },

  // ---- off the shelf, optional ----
  cafeSet: { price: 160, unit: 'EA', cells: ['QPI!L276'], link: 'https://www.overstock.com/Home-Garden/Bistro-Sets/22408/subcat.html' },
  bubbler: { price: 17, unit: 'EA', cells: ['QPI!L279'], link: 'https://www.amazon.com/dp/B08NJN5MTQ' },
  birdBath: { price: 110, unit: 'EA', cells: ['QPI!L280', 'QPI!L282'], link: 'https://www.wayfair.com/outdoor/pdp/breakwater-bay-bardem-birdbath-w005482539.html' },
  birdHouse: { price: 110, unit: 'EA', cells: ['QPI!L284'], link: `${LOWES}Wild-Wings-Cedar-Box-Wren-House/5005485653` },
  eventTent: { price: 90, unit: 'EA', cells: ['QPI!L286'], link: 'https://www.bannerbuzz.com/blue-canopy-tents/p' },
  adirondackChair: { price: 80, unit: 'EA', cells: ['QPI!L288'], link: 'https://www.walmart.com/ip/Mainstays-Wood-Outdoor-Modern-Adirondack-Chair-Black-Color/418931690' },
  hammock: { price: 180, unit: 'EA', cells: ['QPI!L290'], link: 'https://www.google.com/shopping/product/4189988666204314689', linkNote: 'a Google Shopping listing' },
  porchSwing: { price: 300, unit: 'EA', cells: ['QPI!L292'], link: 'https://www.wayfair.com/outdoor/pdp/millwood-pines-fina-hardwood-hanging-porch-swing-with-stand-w004890801.html' },
  trashCan: { price: 360, unit: 'EA', cells: ['QPI!L294'], link: `${HD}Toter-60-Gal-Park-Trash-Can-with-Lid-860GB-35865/310677298` },
  /** Priced per pack; the sheet buys one pack per 16 lights (QPI!J296). */
  solarLightsPack: { price: 40, unit: 'pack of 16', cells: ['QPI!L296'], link: 'https://www.google.com/shopping/product/7189108310985972344', linkNote: 'a Google Shopping listing' },

  // ---- prices that appear only in the ORDER LIST tab ----
  olSolarLights: { price: 8, unit: 'ea.', cells: ['OL!N59'] },
  olTimberScrew: { price: 0.75, unit: 'ea', cells: ['OL!N47'] },
  olWoodScrew2in: { price: 0.17, unit: 'ea.', cells: ['OL!N53'] },
  olWoodScrew12: { price: 0.15, unit: 'ea.', cells: ['OL!N55'], link: `${HD}Everbilt-12-x-1-1-2-in-Phillips-Flat-Head-Zinc-Plated-Wood-Screw-50-Pack-801962/204275525` },
} satisfies Record<string, Price>;

export type PriceId = keyof typeof PRICES;

/**
 * Lumber, priced in the ORDER LIST tab (OL!N29–N32). The quantity tab looks
 * prices up here by name (SUMIF), so a size that is not listed costs $0 in the
 * sheet — and in this model, until someone adds it.
 */
export const LUMBER: Record<string, Price> = {
  '2x4x8': { price: 5, unit: 'ea.', cells: ['OL!N29'], link: `${HD}2-in-x-4-in-x-8-ft-2-Ground-Contact-Pressure-Treated-Lumber-106147/206970948` },
  '2x4x12': { price: 10, unit: 'ea.', cells: ['OL!N30'], link: `${HD}WeatherShield-2-in-x-4-in-x-10-ft-2-Prime-Ground-Contact-Pressure-Treated-Lumber-253920/206967803`, linkNote: 'the link is for a 2x4x10' },
  '1x6x8': { price: 8, unit: 'ea.', cells: ['OL!N31'], link: `${HD}WeatherShield-1-in-x-6-in-x-8-ft-Ground-Contact-Pressure-Treated-Board-253935/206974075` },
  '1x6x12': { price: 10, unit: 'ea.', cells: ['OL!N32'], link: `${LOWES}Severe-Weather-Common-1-in-x-6-in-x-12-ft-Actual-0-75-in-x-5-5-in-x-12-ft-2/4564830` },
};

/** Links the quantity tab gives for lumber sizes it cannot price. */
export const UNPRICED_LUMBER_LINKS: Record<string, string> = {
  '2x10x8': `${LOWES}Severe-Weather-Common-2-in-x-10-in-x-8-ft-Actual-1-5-in-x-9-25-in-x-8-ft-2-Prime-Treated-Lumber/4564764`,
  '2x6x8': `${LOWES}Severe-Weather-Common-2-in-x-6-in-x-8-ft-Actual-1-5-in-x-5-5-in-x-8-ft-2-Prime-Treated-Lumber/4564606`,
  '2x8x8': `${LOWES}Severe-Weather-Common-2-in-x-8-in-x-8-ft-Actual-1-5-in-x-7-25-in-x-8-ft-2-Prime-Treated-Lumber/4564744`,
  '4x4x8': `${LOWES}Severe-Weather-Common-4-in-x-4-in-x-8-ft-Actual-3-5-in-x-3-5-in-x-8-ft-2-Treated-Lumber/50121083`,
};

/** Percentages applied to TOTAL COSTS on the INSERT HERE tab. */
export const CONTINGENCY = {
  /** "Tool Rental Contingency" = 15% of total costs (INSERT HERE!F143) */
  toolRental: 0.15,
  /** "20% CONTINGENCY" = 20% of total costs (+ the tool rental again; INSERT HERE!F144) */
  contingency: 0.2,
  /** Unlabelled $175 added to the ORDER LIST's first subtotal (OL!P18) */
  orderListExtra: 175,
};

/** Price of a lumber size, or 0 when the sheet has none (its SUMIF finds nothing). */
export function lumberPrice(size: string): number {
  return LUMBER[size]?.price ?? 0;
}

const VENDORS: [RegExp, string][] = [
  [/amazon\.com/, 'Amazon'],
  [/homedepot\.com/, 'Home Depot'],
  [/lowes\.com/, 'Lowe’s'],
  [/ds-supply\.com/, 'D&S Supply'],
  [/mulchexpresslandscapesupply\.com/, 'Mulch Express'],
  [/underdogsupply\.com/, 'Underdog Supply'],
  [/delcomulch\.com/, 'Delco Mulch'],
  [/gabion1\.com/, 'Gabion1'],
  [/darbywiremesh\.com/, 'Darby Wire Mesh'],
  [/hairpinlegs\.com/, 'Hairpin Legs'],
  [/wayfair\.com/, 'Wayfair'],
  [/overstock\.com/, 'Overstock'],
  [/walmart\.com/, 'Walmart'],
  [/bannerbuzz\.com/, 'BannerBuzz'],
  [/gardeners\.com/, 'Gardener’s Supply'],
  [/pwdraincheck\.org/, 'PWD Rain Check'],
  [/google\.com\/shopping/, 'Google Shopping'],
];

/** A shop name for a link ("Home Depot"), or undefined. */
export function vendorOf(url: string | undefined): string | undefined {
  if (!url) return undefined;
  return VENDORS.find(([re]) => re.test(url))?.[1];
}
