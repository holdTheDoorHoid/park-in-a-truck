// The estimator's questions, grouped and worded as on the spreadsheet's
// INSERT HERE tab (PiaT's words, typos fixed, sentence case for the web). The words live in the
// cost catalog (src/i18n/messages/en/cost.ts, keys q.* and group.*).

import type { CostInputKey } from './model';
import { PRICES } from './prices';
import { EN, price, type CostT } from './text';

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
  /** "ft", "squares" or "$" (shown in the reader's language by the widget) */
  unit?: 'ft' | 'squares' | '$';
  hint?: string;
  /** Shown when the spreadsheet asks the question but does not price the answer */
  unpriced?: string;
  /** Allow decimals (feet, dollars) */
  decimal?: boolean;
}

/** The questions in the reader's language (English by default). */
export function fieldGroups(t: CostT = EN): FieldGroup[] {
  const q = (key: CostInputKey, extra: Omit<CostField, 'key' | 'label'> = {}): CostField => ({ key, label: t(`q.${key}`), ...extra });
  const unused = t('q.gravelEdgeSplit.unused');
  return [
    {
      id: 'base',
      title: t('group.base'),
      fields: [
        q('longSideFt', { unit: 'ft', decimal: true }),
        q('shortSideFt', { unit: 'ft', decimal: true }),
        q('plantingSquares', { unit: 'squares' }),
        q('naturePlaySquares', { unit: 'squares' }),
      ],
    },
    {
      id: 'edging',
      title: t('group.edging'),
      fields: [
        q('gravelEdgeFt', { unit: 'ft', hint: t('q.gravelEdgeFt.hint'), decimal: true }),
        q('gravelEdgeOnHardscapeFt', { unit: 'ft', decimal: true, unpriced: unused }),
        q('gravelEdgeOnSoftscapeFt', { unit: 'ft', decimal: true, unpriced: unused }),
        q('outerEdgeFt', { unit: 'ft', decimal: true }),
        q('outerEdgeOnHardscapeFt', { unit: 'ft', decimal: true, hint: t('q.outerEdgeOnHardscapeFt.hint') }),
        q('outerEdgeOnSoftscapeFt', { unit: 'ft', decimal: true, hint: t('q.outerEdgeOnSoftscapeFt.hint') }),
        q('outerEdgeGabionConnections'),
      ],
    },
    {
      id: 'plants',
      title: t('group.plants'),
      intro: t('group.plants.intro'),
      fields: [q('shrubs'), q('smallTrees'), q('largeTrees')],
    },
    {
      id: 'gabions',
      title: t('group.gabions'),
      fields: [
        q('gabionBaskets', { hint: t('q.gabionBaskets.hint') }),
        q('raisedBedWoodEdgeFt', { unit: 'ft', decimal: true, unpriced: t('q.raisedBedWoodEdgeFt.unpriced') }),
        q('raisedBedGabionConnections'),
      ],
    },
    {
      id: 'furnishings',
      title: t('group.furnishings'),
      intro: t('group.furnishings.intro'),
      fields: [
        q('woodToppedGabions', { hint: t('q.woodToppedGabions.hint') }),
        q('gabionBenches8', { hint: t('q.gabionBenches8.hint') }),
        q('benchesWithBackAndArms', { hint: t('q.benchesWithBackAndArms.hint') }),
        q('benchesWithBack', { hint: t('q.benchesWithBack.hint') }),
        q('benchesNoBack', { hint: t('q.benchesNoBack.hint') }),
        q('squareTables', { hint: t('q.squareTables.hint') }),
        q('tables4', { hint: t('q.tables4.hint') }),
        q('tables6', { hint: t('q.tables6.hint') }),
        q('stools', { hint: t('q.stools.hint') }),
        q('planters18', { hint: t('q.planters18.hint') }),
        q('planters24', { hint: t('q.planters24.hint') }),
        q('workbenches', { hint: t('q.workbenches.hint') }),
        q('gabionTables'),
        q('stageSquares', { unit: 'squares', hint: t('q.stageSquares.hint') }),
        q('shadeStructures', { hint: t('q.shadeStructures.hint') }),
        q('trellises', { hint: t('q.trellises.hint') }),
      ],
    },
    {
      id: 'additional',
      title: t('group.additional'),
      intro: t('group.additional.intro'),
      fields: [q('longTables'), q('compostBins'), q('keyholeGardensLarge'), q('keyholeGardensMedium'), q('keyholeGardensSmall')],
    },
    {
      id: 'offTheShelf',
      title: t('group.offTheShelf'),
      intro: t('group.offTheShelf.intro'),
      fields: [
        q('sheds4x4'),
        q('sheds4x8'),
        q('cisterns4x4', { hint: t('q.cisterns.hint') }),
        q('cisterns4x8', { hint: t('q.cisterns.hint') }),
        q('rainBarrels', { hint: t('q.rainBarrels.hint') }),
        q('cafeTableSets', { hint: t('q.cafeTableSets.hint', { price: price(t, PRICES.cafeSet.price) }) }),
        q('coldFrameSquares', { unit: 'squares' }),
      ],
    },
    {
      id: 'optional',
      title: t('group.optional'),
      intro: t('group.optional.intro'),
      fields: [
        q('optCafeTableSets'),
        q('fountains'),
        q('birdBaths'),
        q('birdHouses'),
        q('eventTents'),
        q('adirondackChairs'),
        q('hammocks'),
        q('porchSwings'),
        q('trashCans'),
        q('solarLights', { hint: t('q.solarLights.hint') }),
      ],
    },
    {
      id: 'other',
      title: t('group.other'),
      fields: [q('otherCosts', { unit: '$', decimal: true })],
    },
  ];
}

export const FIELD_GROUPS: FieldGroup[] = fieldGroups();

export const ALL_FIELDS: CostField[] = FIELD_GROUPS.flatMap((g) => g.fields);
