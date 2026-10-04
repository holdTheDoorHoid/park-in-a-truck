// Date-only helpers (yyyy-mm-dd strings), deliberately avoiding the local timezone by
// doing all arithmetic in UTC — a build schedule is a sequence of calendar days, not
// date-times, and we never want "Saturday" to become "Friday night" for someone west of
// the prime meridian.

import { formatDate } from '../../i18n/format.ts';
import { currentLocale } from '../../i18n/t.ts';
import { localeInfo, type Locale } from '../../i18n/locales.ts';

export function parseISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y!, (m ?? 1) - 1, d ?? 1));
}

export function toISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 86_400_000);
}

export function addDaysISO(iso: string, n: number): string {
  return toISO(addDays(parseISO(iso), n));
}

/** The Saturday on or after this date (unchanged if it's already a Saturday). */
export function nextSaturdayISO(iso: string): string {
  const d = parseISO(iso);
  const delta = (6 - d.getUTCDay() + 7) % 7;
  return toISO(addDays(d, delta));
}

/** "Sat, March 14, 2027" — in the reader's language (default: the page's). */
export function formatLong(iso: string, locale?: Locale | string): string {
  // formatDate reads a yyyy-mm-dd string as that calendar day, so the weekday never shifts
  return formatDate(locale ?? currentLocale(), toISO(parseISO(iso)), 'weekday-short');
}

/** The name of month `m` (0 = January), capitalised for a heading, in the reader's language. */
export function monthName(m: number, locale?: Locale | string): string {
  const loc = locale ?? currentLocale();
  const name = formatDate(loc, new Date(2001, m, 1), 'month');
  return name.charAt(0).toLocaleUpperCase(localeInfo(loc).intl) + name.slice(1);
}
