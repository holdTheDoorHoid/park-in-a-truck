// getT — the one way to get UI text, in .astro files, Preact islands and plain scripts.
//
//   // .astro (the page's language comes from its URL)
//   import site from '../i18n/messages/en/site.ts';
//   import { getT } from '../i18n/astro.ts';
//   const t = getT(Astro, site);
//   t('nav.steps')                       -> "Pasos" on /es/…, "Steps" on English pages
//
//   // Preact island: the Astro wrapper passes locale={t.locale} (needed for server rendering);
//   // without it the island reads <html data-locale> in the browser.
//   import planner from '../../i18n/messages/en/planner.ts';
//   import { getT } from '../../i18n/t.ts';
//   const t = getT(props.locale, planner);
//
// Missing translations fall back to English. Never import ./astro.ts or ./server.ts from browser code.

import { isLocale, localeFromPath, localeInfo, DEFAULT_LOCALE, type Locale } from './locales.ts';
import type { Catalog, Message, MessageKey, Vars } from './define.ts';
import { bundleFor } from './registry.ts';
import { formatClock, formatDate, formatList, formatMoney, formatNumber, interpolate, isolate, joinList, joinSentences, monthInSentence, type DateStyle } from './format.ts';

export type Where = Locale | string | { url: URL } | null | undefined;

/** The language of the page this code runs on (browser), or English. */
export function currentLocale(): Locale {
  if (typeof document !== 'undefined') {
    const c = document.documentElement.dataset.locale;
    if (isLocale(c)) return c;
  }
  return DEFAULT_LOCALE;
}

export function resolveLocale(where: Where): Locale {
  if (where && typeof where === 'object' && 'url' in where) return localeFromPath(where.url.pathname);
  if (isLocale(where)) return where;
  return currentLocale();
}

export interface T<C extends Catalog> {
  /** Plain text (safe to put anywhere; Astro/Preact escape it). */
  (key: MessageKey<C>, vars?: Vars): string;
  /** For messages with inline HTML (<a>, <strong>, <em>, <br>): values are escaped, use with set:html. */
  html(key: MessageKey<C>, vars?: Vars): string;
  /** True when this language has its own text for `key` (always true in English). */
  has(key: MessageKey<C>): boolean;
  locale: Locale;
  /** BCP 47 tag, e.g. "zh-Hans" — for lang attributes. */
  lang: string;
  dir: 'ltr' | 'rtl';
  num(n: number, opts?: Intl.NumberFormatOptions): string;
  money(n: number, opts?: { cents?: boolean }): string;
  date(d: Date | string | number, style?: DateStyle): string;
  list(items: string[], type?: 'conjunction' | 'disjunction'): string;
  /** Items side by side with the language's list comma, no "and": "a, b, c" / "a、b、c". */
  join(items: string[]): string;
  /** A month's name inside a sentence ("in June"; Vietnamese "tháng 6", not "Tháng 6"). */
  monthInSentence(d: Date | string | number): string;
  /** A clock time from minutes after midnight, the language's way: "3:30 PM", "15:30". */
  clock(minutesOfDay: number, opts?: { minutes?: 'always' | 'auto' | 'never' }): string;
  /**
   * A left-to-right value (size, address, handle, code) kept in one piece on right-to-left pages
   * when it is NOT going through a {placeholder} (those are isolated already). Unchanged elsewhere.
   */
  isolate(value: string): string;
  /** Sentences one after another: "One. Two." — no space after 。 in Chinese. Empty pieces skipped. */
  sentences(parts: (string | null | undefined | false)[]): string;
  /** The space between two sentences or phrases in markup (`{t.space}` for `{' '}`): "" in Chinese. */
  space: string;
}

export function getT<C extends Catalog>(where: Where, catalog: C): T<C> {
  const locale = resolveLocale(where);
  const info = localeInfo(locale);
  const own = (key: string): Message | undefined => (locale === DEFAULT_LOCALE ? undefined : bundleFor(locale)?.msgs[catalog.area]?.[key]);
  const message = (key: string): Message => {
    const m = own(key) ?? catalog.messages[key];
    if (m === undefined) {
      if (import.meta.env?.DEV) console.warn(`[i18n] no English text for ${catalog.area}:${key}`);
      return key;
    }
    return m;
  };
  const t = ((key: string, vars?: Vars) => interpolate(locale, message(key), vars)) as T<C>;
  t.html = (key, vars) => interpolate(locale, message(key), vars, true);
  t.has = (key) => locale === DEFAULT_LOCALE || own(key) !== undefined;
  t.locale = locale;
  t.lang = info.lang;
  t.dir = info.dir;
  t.num = (n, opts) => formatNumber(locale, n, opts);
  t.money = (n, opts) => formatMoney(locale, n, opts);
  t.date = (d, style) => formatDate(locale, d, style);
  t.list = (items, type) => formatList(locale, items, type);
  t.join = (items) => joinList(locale, items);
  t.clock = (min, opts) => formatClock(locale, min, opts);
  t.monthInSentence = (d) => monthInSentence(locale, d);
  t.isolate = (value) => isolate(locale, value);
  t.sentences = (parts) => joinSentences(locale, parts);
  t.space = info.noSpaces ? '' : ' ';
  return t;
}
