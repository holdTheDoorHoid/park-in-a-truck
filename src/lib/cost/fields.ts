// The estimator's questions, grouped and worded as on the spreadsheet's
// INSERT HERE tab (PiaT's words, typos fixed, sentence case for the web).

import type { CostInputKey } from './model';

export interface FieldGroup {
  id: string;
  title: string;
  /** PiaT's own introduction to the section, when it has one */
  intro?: string;
  fields: CostField[];
}

export interface CostField {
  key: CostInputKey;
  label: string;
  unit?: string;
  hint?: string;
  /** Shown when the spreadsheet asks the question but does not price the answer */
  unpriced?: string;
  /** Allow decimals (feet, dollars) */
  decimal?: boolean;
}

const UNUSED = 'Not used: the spreadsheet works out the gravel-edge supports for the whole edge.';

export const FIELD_GROUPS: FieldGroup[] = [
  {
    id: 'base',
    title: 'Base design',
    fields: [
      { key: 'longSideFt', label: 'How many feet is the long side of your park?', unit: 'ft', decimal: true },
      { key: 'shortSideFt', label: 'How many feet is the short side of your park?', unit: 'ft', decimal: true },
      { key: 'plantingSquares', label: 'How many squares of planting (green squares) do you have?', unit: 'squares' },
      { key: 'naturePlaySquares', label: 'If you have a Nature Play area, how many squares do you have?', unit: 'squares' },
    ],
  },
  {
    id: 'edging',
    title: 'Edging',
    fields: [
      { key: 'gravelEdgeFt', label: 'Tally your edges around gravel, in feet', unit: 'ft', hint: "Each square is 4'.", decimal: true },
      { key: 'gravelEdgeOnHardscapeFt', label: 'Of the total, how many are on top of hardscape (concrete, asphalt, etc.)?', unit: 'ft', decimal: true, unpriced: UNUSED },
      { key: 'gravelEdgeOnSoftscapeFt', label: 'Of the total, how many are on top of softscape (earth, soil)?', unit: 'ft', decimal: true, unpriced: UNUSED },
      {
        key: 'outerEdgeFt',
        label: 'Tally the outside edges of your park, of gravel or planting, where you don’t have a building or a gabion edge',
        unit: 'ft',
        decimal: true,
      },
      { key: 'outerEdgeOnHardscapeFt', label: 'Of the total, how many are on top of hardscape (concrete, asphalt, etc.)?', unit: 'ft', decimal: true, hint: 'Hardscape supports (2x4s, L-brackets, screws) use these feet.' },
      { key: 'outerEdgeOnSoftscapeFt', label: 'Of the total, how many are on top of softscape (earth, soil)?', unit: 'ft', decimal: true, hint: 'Softscape supports (2x4s) use these feet. Leave both at 0 to count both kinds for every foot, as the spreadsheet does.' },
      { key: 'outerEdgeGabionConnections', label: 'How many times do these edges connect to a gabion?' },
    ],
  },
  {
    id: 'plants',
    title: 'How many plants do you have?',
    intro: 'Perennials are worked out for you: 5 in every planting square, as in Park in a Truck’s plant lists (the cost spreadsheet says 4).',
    fields: [
      { key: 'shrubs', label: 'Shrubs' },
      { key: 'smallTrees', label: 'Trees, small' },
      { key: 'largeTrees', label: 'Trees, large' },
    ],
  },
  {
    id: 'gabions',
    title: 'Gabion baskets and raised beds',
    fields: [
      {
        key: 'gabionBaskets',
        label: "How many 1' gabion baskets do you have?",
        hint: 'For the gabion wall: the grey 1-ft band the park pieces draw along the street edges.',
      },
      { key: 'raisedBedWoodEdgeFt', label: 'Do you have raised beds? How many feet are your wood edges?', unit: 'ft', decimal: true, unpriced: 'Not priced: the spreadsheet has no calculation for raised-bed wood edges.' },
      { key: 'raisedBedGabionConnections', label: 'How many connections to gabions do you have?' },
    ],
  },
  {
    id: 'furnishings',
    title: 'Furnishings',
    intro: 'Pieces with a Park in a Truck build guide are priced from the guide’s own materials list.',
    fields: [
      { key: 'woodToppedGabions', label: 'How many 4\' 18" wood-topped gabions do you have?', hint: "4' Gabion Bench guide." },
      { key: 'gabionBenches8', label: "How many 8' wood-topped gabion benches do you have?", hint: "8' Gabion Bench guide. (Not a question in the spreadsheet.)" },
      { key: 'benchesWithBackAndArms', label: 'How many wood benches with backs and armrests do you have?', hint: 'Bench + Back guide (it has armrests).' },
      { key: 'benchesWithBack', label: 'How many wood benches with backs do you have?', hint: 'Bench + Back guide.' },
      { key: 'benchesNoBack', label: 'How many wood benches without backs do you have?', hint: "4' Bench guide." },
      { key: 'squareTables', label: 'How many square wood tables do you have?', hint: "2' Table guide." },
      { key: 'tables4', label: "How many 4' tables do you have?", hint: "4' Table guide. (Not a question in the spreadsheet.)" },
      { key: 'tables6', label: "How many 6' tables do you have?", hint: "6' Table guide. (Not a question in the spreadsheet.)" },
      { key: 'stools', label: 'How many stools do you have?', hint: 'Stool guide.' },
      { key: 'planters18', label: 'How many 18" planter boxes do you have?', hint: '18" Planter Box guide, the 18"x18" box. (Not a question in the spreadsheet.)' },
      { key: 'planters24', label: 'How many 24" planter boxes do you have?', hint: '24" Planter Box guide, the 24"x24" box. (Not a question in the spreadsheet.)' },
      { key: 'workbenches', label: 'How many workbenches / standing tables do you have?', hint: 'Workbench guide. (Not a question in the spreadsheet.)' },
      { key: 'gabionTables', label: 'How many wood-topped gabion tables do you have?' },
      {
        key: 'stageSquares',
        label: 'How many squares of stage do you have?',
        unit: 'squares',
        hint: "Stage guide: its 12'x8' stage is 6 squares. Other sizes have no materials list, so you are asked for a price.",
      },
      { key: 'shadeStructures', label: "How many 8'x8' shade structures do you have?", hint: 'Shade guide. Shade canopies in your design are counted here. (Not a question in the spreadsheet.)' },
      { key: 'trellises', label: 'How many 12x8 trellises do you have?', hint: 'The spreadsheet’s own 12x8 trellis (it has no build guide).' },
    ],
  },
  {
    id: 'additional',
    title: 'Additional furnishings',
    intro:
      'The following furnishings are optional and their cost is approximate; you will not be building these from instructions we provide. A cost estimate is given, but it is an approximation based on a design not provided by us.',
    fields: [
      { key: 'longTables', label: 'How many long tables do you have?' },
      { key: 'compostBins', label: 'How many compost bins do you have?' },
      { key: 'keyholeGardensLarge', label: 'Keyhole gardens: large' },
      { key: 'keyholeGardensMedium', label: 'Keyhole gardens: medium' },
      { key: 'keyholeGardensSmall', label: 'Keyhole gardens: small' },
    ],
  },
  {
    id: 'offTheShelf',
    title: 'Off-the-shelf furnishings',
    intro:
      'The following items are off-the-shelf items. We give you an estimated price and a place to get them. However, they are an estimate, and you can purchase a different item if you wish.',
    fields: [
      { key: 'sheds4x4', label: "Sheds, 1 square (4'x4')" },
      { key: 'sheds4x8', label: "Sheds, 2 squares (4'x8')" },
      { key: 'cisterns4x4', label: "Cisterns, 1 square (4'x4')", hint: 'No price in the spreadsheet: you are asked for one.' },
      { key: 'cisterns4x8', label: "Cisterns, 2 squares (4'x8')", hint: 'No price in the spreadsheet: you are asked for one.' },
      { key: 'rainBarrels', label: 'How many rain barrels do you have?', hint: 'Free!' },
      { key: 'cafeTableSets', label: 'How many cafe tables and chairs do you have?', hint: 'Priced like “Cafe tables + chairs” below ($160) — don’t count the same tables in both.' },
      { key: 'coldFrameSquares', label: 'How many squares of cold frames do you have?', unit: 'squares' },
    ],
  },
  {
    id: 'optional',
    title: 'Off-the-shelf optional furnishings',
    intro: 'If you want to add these items to your plan, add in how many you would like.',
    fields: [
      { key: 'optCafeTableSets', label: 'Cafe tables + chairs' },
      { key: 'fountains', label: 'Fountain with solar pump' },
      { key: 'birdBaths', label: 'Bird bath' },
      { key: 'birdHouses', label: 'Bird house' },
      { key: 'eventTents', label: 'Event tent' },
      { key: 'adirondackChairs', label: 'Adirondack chair' },
      { key: 'hammocks', label: 'Free-standing hammock' },
      { key: 'porchSwings', label: 'Porch swing' },
      { key: 'trashCans', label: 'Trash can' },
      { key: 'solarLights', label: 'Solar lights', hint: 'Bought in packs of 16.' },
    ],
  },
  {
    id: 'other',
    title: 'Anything else',
    fields: [{ key: 'otherCosts', label: 'Add any other additional costs you might need', unit: '$', decimal: true }],
  },
];

export const ALL_FIELDS: CostField[] = FIELD_GROUPS.flatMap((g) => g.fields);
