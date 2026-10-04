// The planner's words (i18n area "planner", src/i18n/messages/en/planner.ts) in the page's
// language, and the small helpers several panels share: clock times, dates, periods, leaves,
// compass points, lists. In tests and Node there is no page, so everything is English.
//
// Kept out of the modules the sun-hours Web Worker imports (sun.ts, sunperiod.ts,
// sunhours.ts, treemodel.ts) so the worker doesn't carry the text.

import planner from '../../i18n/messages/en/planner.ts';
import { getT, type T } from '../../i18n/t.ts';
import { bundleFor } from '../../i18n/registry.ts';
import { DEFAULT_SEASON } from './sun';
import { SEASONS, type SeasonName, type SunPeriod } from './sunperiod';
import { autumnTint, dayOfYear, leafFraction } from './treemodel';

export type PlannerT = T<typeof planner>;
export type PlannerKey = keyof (typeof planner)['messages'] & string;

let current: PlannerT | undefined;
let english: PlannerT | undefined;

/** The planner's text in the page's language (the page's language never changes while it is open). */
export function pt(): PlannerT {
  return (current ??= getT(undefined, planner));
}

/** English, for words saved with the project (saved data stays the same in every language). */
export function ptEnglish(): PlannerT {
  return (english ??= getT('en', planner));
}

/**
 * lang/dir for things the planner puts outside its own box (the printed plan, the drag label):
 * English and left-to-right until the planner has any translation in this language, the way
 * <LangFallback> marks the planner itself.
 */
export function plannerLang(t: PlannerT = pt()): { lang: string; dir: 'ltr' | 'rtl' } {
  const own = t.locale === 'en' || Object.keys(bundleFor(t.locale)?.msgs.planner ?? {}).length > 0;
  return own ? { lang: t.lang, dir: t.dir } : { lang: 'en', dir: 'ltr' };
}

/**
 * Names that always read left to right (addresses, street names, species as the City lists
 * them) kept in one piece inside right-to-left text ("1322 N Dover St", not "N Dover St 1322").
 * Unchanged in left-to-right languages.
 */
export function isolate(s: string, t: PlannerT = pt()): string {
  return t.dir === 'rtl' && s ? `\u2068${s}\u2069` : s;
}

/**
 * The picked thing in a phrase of its own (`spot.thing.stool` "where the stool is", `view.picked.stool`
 * "Stool (picked)") when the language has one — so the words can agree with the noun — otherwise the
 * shared phrase with the name slotted in. `thing` is the element or existing-item id, or null (a tree
 * named by its species).
 */
export function thingText(base: 'spot.thing' | 'view.picked', thing: string | null, name: string, t: PlannerT = pt()): string {
  if (thing) {
    const own = `${base}.${thing.replace(/-(\w)/g, (_, c: string) => c.toUpperCase())}` as PlannerKey;
    if (own in planner.messages && t.has(own)) return t(own);
  }
  return t(base, { name });
}

const YEAR = 2026;
const dateOf = (month: number, day = 1) => new Date(YEAR, month - 1, day);

/**
 * "3:30 PM" (minutes after midnight, Philadelphia time) — the language's own clock, the same one
 * the shade calendar uses (src/i18n/format.ts formatClock). Always with minutes, so the time
 * doesn't jump in width while the sun slider moves.
 */
export function clock(min: number, t: PlannerT = pt()): string {
  return t.clock(Math.floor(min), { minutes: 'always' });
}

/** "June" */
export const monthName = (month: number, t: PlannerT = pt()) => t.date(dateOf(month), 'month');
/** "June" inside a sentence ("in June"): lower case where the language writes it so (Vietnamese "tháng 6") */
export const monthInSentence = (month: number, t: PlannerT = pt()) => t.monthInSentence(dateOf(month));
/** "June 21" */
export const monthDay = (month: number, day: number, t: PlannerT = pt()) => t.date(dateOf(month, day), 'month-day');
/** "Jun 21" */
export const monthDayShort = (month: number, day: number, t: PlannerT = pt()) => t.date(dateOf(month, day), 'month-day-short');
/** "J" — a month's initial on the chart's axis */
export const monthInitial = (month: number, t: PlannerT = pt()) => t.date(dateOf(month), 'month-narrow');
/** 'MM-DD' → "Jun 21" */
export function mmdd(s: string, t: PlannerT = pt()): string {
  const [m, d] = s.split('-').map(Number) as [number, number];
  return monthDayShort(m, d, t);
}

const COMPASS: PlannerKey[] = [
  'compass.north',
  'compass.northeast',
  'compass.east',
  'compass.southeast',
  'compass.south',
  'compass.southwest',
  'compass.west',
  'compass.northwest',
];
/** "southwest" for a bearing in degrees clockwise from north */
export function compassWord(bearingDeg: number, t: PlannerT = pt()): string {
  return t(COMPASS[Math.round((((bearingDeg % 360) + 360) % 360) / 45) % 8]!);
}

/** Plain words for the trees on a date ("Trees are in leaf"); `short` drops the note about evergreens. */
export function leafWords(month: number, day: number, t: PlannerT = pt(), short = false): string {
  const f = leafFraction(month, day);
  if (f >= 1) return t(autumnTint(month, day) > 0.3 ? 'leaf.turning' : 'leaf.inLeaf');
  if (f <= 0) return t(short ? 'leaf.bareShort' : 'leaf.bare');
  return t(dayOfYear(month, day) < 183 ? 'leaf.comingOut' : 'leaf.falling');
}

const SEASON_IN_SENTENCE: Record<SeasonName, PlannerKey> = { spring: 'period.spring', summer: 'period.summer', fall: 'period.fall', winter: 'period.winter' };
/** Seasons at the start of a line (the list of periods) */
export const SEASON_LABEL: Record<SeasonName, PlannerKey> = { spring: 'season.spring', summer: 'season.summer', fall: 'season.fall', winter: 'season.winter' };

/** "the growing season (Apr 15 – Oct 15)", "June", "winter (Dec 21 – Mar 19)", "Jun 21", "the whole year" */
export function periodLabel(p: SunPeriod, t: PlannerT = pt()): string {
  switch (p.kind) {
    case 'growing':
      return t('period.growing', { from: mmdd(DEFAULT_SEASON.from, t), to: mmdd(DEFAULT_SEASON.to, t) });
    case 'year':
      return t('period.year');
    case 'season':
      return t('period.range', { season: t(SEASON_IN_SENTENCE[p.season]), from: mmdd(SEASONS[p.season].from, t), to: mmdd(SEASONS[p.season].to, t) });
    case 'month':
      return monthInSentence(p.month, t);
    case 'day':
      return monthDayShort(p.month, p.day, t);
  }
}

/** "April, May and September" */
export function listAnd(items: string[], t: PlannerT = pt()): string {
  if (items.length < 2) return items[0] ?? '';
  return t('list.and', { first: items.slice(0, -1).join(t('list.sep')), last: items.at(-1)! });
}

/** One decimal, the local way: "9.7", "0.0" */
export const oneDecimal = (v: number, t: PlannerT = pt()) => t.num(Math.round(v * 10) / 10, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
