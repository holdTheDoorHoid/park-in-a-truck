// The shade calendar's words (i18n area "shade") in the page's language: month names and clock
// times the language's own way (Intl, through the language's `intl` tag in locales.ts), the
// summary lines, one square described. Kept out of shadecal.ts so the Web Worker carries no text.

import shade from '../../i18n/messages/en/shade.ts';
import { getT, type T } from '../../i18n/t.ts';
import { bundleFor } from '../../i18n/registry.ts';
import { localeInfo } from '../../i18n/locales.ts';
import { CAL_YEAR, cellState, compassIndex, monthRuns, sunShare, type CalCell, type CellState, type MonthGroup, type ShadeCal, type ShadeFrom } from './shadecal';

export type ShadeT = T<typeof shade>;
export type ShadeKey = keyof (typeof shade)['messages'] & string;

/**
 * The calendar's text in the page's language (or the language given) once the "shade" area has
 * any translation in it; until then all English — words, month names, clock times and numbers
 * alike, so an English sentence never carries Arabic month names (what <LangFallback> does for a
 * whole island).
 */
export function shadeT(locale?: string): ShadeT {
  const t = getT(locale, shade);
  return t.locale === 'en' || Object.keys(bundleFor(t.locale)?.msgs.shade ?? {}).length > 0 ? t : getT('en', shade);
}

/** lang/dir for the calendar's box: the language its words are in. */
export const shadeLang = (t: ShadeT): { lang: string; dir: 'ltr' | 'rtl' } => ({ lang: t.lang, dir: t.dir });

const fmtCache = new Map<string, Intl.DateTimeFormat>();
function fmt(intl: string, opts: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${intl}|${JSON.stringify(opts)}`;
  let f = fmtCache.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat(intl, { ...opts, timeZone: 'UTC' });
    fmtCache.set(key, f);
  }
  return f;
}

/** "June" / "Jun" (1–12). Languages Intl doesn't know (Haitian Creole) use locales.ts's names. */
export function monthName(t: ShadeT, month: number, style: 'long' | 'short' = 'long'): string {
  const info = localeInfo(t.locale);
  if (info.months) return info.months[month - 1]!;
  return fmt(info.intl, { month: style }).format(Date.UTC(CAL_YEAR, month - 1, 15));
}

/** A month's name inside a sentence (lower case where the language writes it so: Vietnamese "tháng 6"). */
export function monthInSentence(t: ShadeT, month: number): string {
  const info = localeInfo(t.locale);
  if (info.months) return info.months[month - 1]!;
  return t.monthInSentence(new Date(CAL_YEAR, month - 1, 15));
}

/**
 * A clock time from minutes after midnight, the language's own way: "9 AM", "3:30 PM", "15:30",
 * "오후 3:30". Whole hours drop ":00" (or always, with `hourOnly`). Languages Intl doesn't know
 * get the 24-hour clock.
 */
export function clockTime(t: ShadeT, minutes: number, hourOnly = false): string {
  // the same clock as the planner's (src/i18n/format.ts formatClock)
  return t.clock(minutes, { minutes: hourOnly ? 'never' : 'auto' });
}

export const pct = (t: ShadeT, f: number) => t.num(Math.round(f * 100) / 100, { style: 'percent', maximumFractionDigits: 0 });

/** "to the south" */
export const dirWords = (t: ShadeT, dir: number) => t(`dir.${((dir % 8) + 8) % 8}` as ShadeKey);

/** The label of a summary line: "All year", "June", "June and July", "June to August", "November to February". */
export function monthsLabel(t: ShadeT, months: number[]): string {
  if (months.length >= 12) return t('months.all');
  // the label starts the line: the first month as it stands alone, the rest as inside a sentence
  // ("Tháng 6 và tháng 7" in Vietnamese; the same as before in every other language)
  const names = months.map((m, i) => (i === 0 ? monthName(t, m) : monthInSentence(t, m)));
  if (names.length <= 2) return t.list(names);
  return t('months.range', { from: names[0], to: names[names.length - 1] });
}

const shadeKey = (part: 'none' | 'before' | 'between' | 'after', s: ShadeFrom) => `sum.${part}.${s.kind}` as ShadeKey;

/** One summary line's sentences: "Direct sun from about 9 AM to 3 PM. After that, shade from the buildings to the west." */
export function groupSentences(t: ShadeT, g: MonthGroup): string {
  const d = g.day;
  const at = (m: number) => clockTime(t, m);
  if (d.type === 'none') return d.allDay ? t(shadeKey('none', d.allDay), { dir: dirWords(t, d.allDay.dir) }) : '';
  const out: string[] = [];
  const [w0, w1] = d.windows;
  if (d.type === 'patchy') out.push(t('sum.sun.patchy', { from: at(w0![0]), to: at(d.windows[d.windows.length - 1]![1]) }));
  else if (w1) out.push(t('sum.sun.two', { from: at(w0![0]), to: at(w0![1]), from2: at(w1[0]), to2: at(w1[1]) }));
  else if (d.fromSunrise && d.toSunset) out.push(t('sum.sun.allDay'));
  else if (d.fromSunrise) out.push(t('sum.sun.fromSunrise', { to: at(w0![1]) }));
  else if (d.toSunset) out.push(t('sum.sun.toSunset', { from: at(w0![0]) }));
  else out.push(t('sum.sun.window', { from: at(w0![0]), to: at(w0![1]) }));
  if (d.before) out.push(t(shadeKey('before', d.before), { dir: dirWords(t, d.before.dir) }));
  if (d.between && d.type === 'sun') out.push(t(shadeKey('between', d.between), { dir: dirWords(t, d.between.dir) }));
  if (d.after) out.push(t(shadeKey('after', d.after), { dir: dirWords(t, d.after.dir) }));
  return t.sentences(out);
}

/** "June, 3 PM to 3:30 PM" */
export function cellWhen(t: ShadeT, cal: ShadeCal, month: number, col: number): string {
  const from = cal.startMin + col * cal.stepMin;
  return t('cell.when', { month: monthName(t, month), from: clockTime(t, from), to: clockTime(t, from + cal.stepMin) });
}

/** One square in words: "June, 3 PM to 3:30 PM: direct sun 70% of the time and shade from the buildings to the west 30% of the time." */
export function cellWords(t: ShadeT, cal: ShadeCal, month: number, col: number): string {
  const c: CalCell = cal.cells[month - 1]![col]!;
  const when = cellWhen(t, cal, month, col);
  if (c.night >= c.n) return t('cell.dark', { when });
  if (cal.kind === 'lot') return t('cell.lot', { when, pct: pct(t, sunShare(c, 'lot')) });
  const parts: string[] = [];
  const share = (k: number) => pct(t, k / c.n);
  const big = (k: number) => k / c.n >= 0.05;
  if (big(c.sun)) parts.push(t('cell.sun', { pct: share(c.sun) }));
  if (big(c.tree)) parts.push(t('cell.tree', { pct: share(c.tree), dir: dirWords(t, compassIndex(c.tE, c.tN)) }));
  if (big(c.building)) parts.push(t('cell.building', { pct: share(c.building), dir: dirWords(t, compassIndex(c.bE, c.bN)) }));
  if (big(c.night)) parts.push(t('cell.night', { pct: share(c.night) }));
  return t('cell.line', { when, parts: t.list(parts) });
}

/** Time spans "9 AM – 3 PM" of one state in a month's row, as a list; `none` when there are none. */
export function stateSpans(t: ShadeT, cal: ShadeCal, month: number, state: CellState): string {
  const spans = monthRuns(cal, month - 1)
    .filter((r) => r.state === state)
    .map((r) => t('time.range', { from: clockTime(t, r.from), to: clockTime(t, r.to) }));
  return spans.length ? t.list(spans) : t('table.none');
}

/** When the sun is up (half or more of a square) in a month: "7 AM – 5 PM". */
export function sunUpSpan(t: ShadeT, cal: ShadeCal, month: number): string {
  const runs = monthRuns(cal, month - 1).filter((r) => r.state !== 'night');
  if (!runs.length) return t('table.none');
  return t('time.range', { from: clockTime(t, runs[0]!.from), to: clockTime(t, runs[runs.length - 1]!.to) });
}

/** Whole lot: when half the lot or more is in direct sun, and the best half-hour. */
export function lotRow(t: ShadeT, cal: ShadeCal, month: number): { half: string; best: string } {
  const row = cal.cells[month - 1]!;
  const spans: string[] = [];
  let start = -1;
  let best = -1;
  let bestShare = -1;
  row.forEach((c, i) => {
    const day = cellState(c) !== 'night';
    const s = day ? sunShare(c, 'lot') : 0;
    if (day && s > bestShare + 1e-9) {
      bestShare = s;
      best = i;
    }
    const on = day && s >= 0.5;
    if (on && start < 0) start = i;
    if ((!on || i === row.length - 1) && start >= 0) {
      const end = on ? i + 1 : i;
      spans.push(t('time.range', { from: clockTime(t, cal.startMin + start * cal.stepMin), to: clockTime(t, cal.startMin + end * cal.stepMin) }));
      start = -1;
    }
  });
  return {
    half: spans.length ? t.list(spans) : t('table.none'),
    best: best >= 0 ? t('table.bestAt', { pct: pct(t, bestShare), time: clockTime(t, cal.startMin + best * cal.stepMin) }) : t('table.none'),
  };
}
