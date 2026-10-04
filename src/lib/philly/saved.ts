// Text that lookupLot() saves with the lot in English (so a project reads the same in every
// language), shown in the reader's language: why the lot type was guessed, the "Couldn't load …"
// warnings, and the "Check it yourself" link labels. Text the site doesn't recognise (older
// saves, City data) is shown as it is.

import type { Locale } from '../../i18n/locales.ts';
import type { LotGeometry } from './types';
import { titleCase } from './plain';
import { keysWith, matchEnglish, retranslate, words, EN, type PhillyKey } from './words';

const REASONS: PhillyKey[] = [
  'lotType.why.narrow',
  'lotType.why.corner',
  'lotType.why.passage',
  'lotType.why.recorded',
  'lotType.why.through',
  'lotType.why.oneStreet',
  'lotType.why.noStreet',
];

/** LotGeometry.lotTypeReason in the reader's language, with the street names and sizes written the local way. */
export function lotTypeReasonText(g: Pick<LotGeometry, 'lotTypeReason' | 'streets' | 'widthFt' | 'lengthFt'>, locale?: Locale | string): string {
  const t = words(locale);
  const saved = g.lotTypeReason ?? '';
  if (t.locale === 'en' || !saved) return saved;
  const tail = ` ${EN('lotType.why.irregular')}`;
  const irregular = saved.endsWith(tail);
  const main = irregular ? saved.slice(0, -tail.length) : saved;
  const hit = matchEnglish(main, REASONS);
  if (!hit) return saved;
  const names = [...new Set((g.streets ?? []).map((s) => titleCase(s.name)))];
  const ft = (n: number) => t('unit.ft', { n: Math.round(n) });
  const text = t(hit.key, {
    ...hit.vars,
    ...(names.length ? { streets: t.list(names) } : {}),
    width: ft(g.widthFt),
    length: ft(g.lengthFt),
  });
  return irregular ? `${text} ${t('lotType.why.irregular')}` : text;
}

const WARNINGS = keysWith('warn.');
/** One of LotExtra.warnings in the reader's language. */
export const warningText = (w: string, locale?: Locale | string) => retranslate(w, WARNINGS, words(locale));

const SOURCES = keysWith('source.');
/** A "Check it yourself" link label (LotRecord.sources[].label) in the reader's language. */
export const sourceLabel = (label: string, locale?: Locale | string) => retranslate(label, SOURCES, words(locale));
