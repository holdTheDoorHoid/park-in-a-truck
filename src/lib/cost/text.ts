// The words the cost estimate writes, in the reader's language (src/i18n/messages/en/cost.ts is the
// English source; docs/i18n/HOW-TO-TRANSLATE.md). Every function in src/lib/cost that produces text
// takes an optional `t` and defaults to English, so the tests and the spreadsheet's faithful mode
// read exactly as before. Numbers and money only change how they are written, never their value.

import cost from '../../i18n/messages/en/cost.ts';
import { getT, type T } from '../../i18n/t.ts';

export type CostT = T<typeof cost>;
export type CostKey = keyof typeof cost.messages & string;

/** English (the default everywhere). */
export const EN: CostT = getT('en', cost);

/** The cost texts in `locale` (undefined: the page's language, from <html data-locale>). */
export function costT(locale?: string): CostT {
  return getT(locale, cost);
}

/** Money with cents, the way the estimate shows it: "$1,234.50". */
export function money(t: CostT, v: number): string {
  return t.money(v, { cents: true });
}

/** Whole dollars when the amount has no cents ("$5", "$52.50"), as the spreadsheet's prices are quoted. */
export function price(t: CostT, v: number): string {
  return t.money(v, { cents: !Number.isInteger(v) });
}

/** A number without thousands separators (where the English text never had them), up to 2 decimals. */
export function bare(t: CostT, n: number): string {
  return t.num(n, { useGrouping: false });
}

/** Items of a plain list ("Bench with back, Stool"), with the language's separator. */
export function join(t: CostT, items: string[]): string {
  return items.join(t('ui.sep'));
}

const UNITS: Record<string, CostKey> = {
  roll: 'unit.roll',
  package: 'unit.package',
  can: 'unit.can',
  box: 'unit.box',
  trip: 'unit.trip',
  ton: 'unit.ton',
  tons: 'unit.ton',
  pack: 'unit.pack',
  piece: 'unit.piece',
  stage: 'unit.stage',
  ea: 'unit.ea',
  'ea.': 'unit.ea',
  cy: 'unit.cy',
  'pack of 16': 'unit.pack16',
  'load (18 cy)': 'unit.load18',
};

/** The sheet's unit, readable: "TONS" -> "tons", "ROLL" -> "rolls" (for 2), "EA" -> "ea.". */
export function unitWord(t: CostT, unit: string, qty: number): string {
  const key = UNITS[unit.toLowerCase()];
  if (key) return t(key, { count: qty });
  return unit.includes('(') ? unit : unit.toLowerCase();
}

/** "3 rolls", "12 ea." */
export function qtyUnit(t: CostT, qty: number, unit: string): string {
  return t('ui.qtyUnit', { count: qty, unit: unitWord(t, unit, qty) });
}

/** A share written as a percentage: 0.15 -> "15%". */
export function percent(t: CostT, share: number): string {
  return t.num(share, { style: 'percent' });
}
