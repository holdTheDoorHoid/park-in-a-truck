// Pure formatting: placeholders, plurals, numbers, money, dates and lists by
// language. Units stay US (ft, in, sq ft, $) in every language — only the way
// the number is written changes (1,234.5 vs 1 234,5).

import { localeInfo, type Locale } from './locales.ts';
import type { Message, PluralForms, Vars } from './define.ts';

const cache = new Map<string, unknown>();
function memo<T>(key: string, make: () => T): T {
  let v = cache.get(key) as T | undefined;
  if (v === undefined) {
    v = make();
    cache.set(key, v);
  }
  return v;
}

const intlOf = (locale: Locale | string) => localeInfo(locale).intl;

export function formatNumber(locale: Locale | string, n: number, opts: Intl.NumberFormatOptions = {}): string {
  if (!Number.isFinite(n)) return String(n);
  const key = `n|${locale}|${JSON.stringify(opts)}`;
  return memo(key, () => new Intl.NumberFormat(intlOf(locale), { maximumFractionDigits: 2, ...opts })).format(n);
}

/** US dollars, written the local way. Whole dollars unless `cents` is set. */
export function formatMoney(locale: Locale | string, n: number, opts: { cents?: boolean } = {}): string {
  const digits = opts.cents ? 2 : 0;
  return formatNumber(locale, n, { style: 'currency', currency: 'USD', currencyDisplay: 'narrowSymbol', minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export type DateStyle = 'long' | 'full' | 'short' | 'month-year' | 'month-day' | 'month' | 'month-day-short' | 'month-narrow';

const DATE_OPTS: Record<DateStyle, Intl.DateTimeFormatOptions> = {
  long: { year: 'numeric', month: 'long', day: 'numeric' },
  full: { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' },
  short: { year: 'numeric', month: 'numeric', day: 'numeric' },
  'month-year': { year: 'numeric', month: 'long' },
  'month-day': { month: 'long', day: 'numeric' },
  /** "June" */
  month: { month: 'long' },
  /** "Jun 21" */
  'month-day-short': { month: 'short', day: 'numeric' },
  /** "J" (chart axes) */
  'month-narrow': { month: 'narrow' },
};

function toDate(d: Date | string | number): Date {
  if (d instanceof Date) return d;
  // "2026-10-04" means that calendar day, not midnight UTC.
  if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) return new Date(`${d}T00:00:00`);
  return new Date(d);
}

export function formatDate(locale: Locale | string, d: Date | string | number, style: DateStyle = 'long'): string {
  const date = toDate(d);
  if (Number.isNaN(date.getTime())) return String(d);
  const info = localeInfo(locale);
  if (info.months && info.weekdays && style !== 'short') {
    // Intl has no data for this language: day month year, the way French-style dates read.
    const m = info.months[date.getMonth()]!;
    const day = date.getDate();
    const y = date.getFullYear();
    const wd = info.weekdays[date.getDay()]!;
    if (style === 'month-year') return `${m} ${y}`;
    if (style === 'month-day' || style === 'month-day-short') return `${day} ${m}`;
    if (style === 'month') return m;
    if (style === 'month-narrow') return m.charAt(0).toUpperCase();
    return style === 'full' ? `${wd} ${day} ${m} ${y}` : `${day} ${m} ${y}`;
  }
  return memo(`d|${locale}|${style}`, () => new Intl.DateTimeFormat(intlOf(locale), DATE_OPTS[style])).format(date);
}

/** "a, b and c" in the language's own way. */
export function formatList(locale: Locale | string, items: string[], type: 'conjunction' | 'disjunction' = 'conjunction'): string {
  return memo(`l|${locale}|${type}`, () => new Intl.ListFormat(intlOf(locale), { style: 'long', type })).format(items);
}

/** A language's name in another language ("inglés" for en, in es); its own name when Intl doesn't know. */
export function languageName(code: Locale | string, inLocale: Locale | string): string {
  const target = localeInfo(code);
  try {
    const dn = memo(`dn|${inLocale}`, () => new Intl.DisplayNames([intlOf(inLocale)], { type: 'language', fallback: 'none' }));
    if (Intl.DisplayNames.supportedLocalesOf([intlOf(inLocale)]).length) return dn.of(target.lang) ?? target.name;
  } catch {
    /* old browser */
  }
  return target.name;
}

export function pluralCategory(locale: Locale | string, n: number): Intl.LDMLPluralRule {
  return memo(`p|${locale}`, () => new Intl.PluralRules(intlOf(locale))).select(n);
}

export function isPlural(m: Message | undefined): m is PluralForms {
  return typeof m === 'object' && m !== null && typeof (m as PluralForms).other === 'string';
}

/** Choose the plural form for `count`: exact "=n" first, then the language's category, then `other`. */
export function choosePlural(locale: Locale | string, forms: PluralForms, count: number): string {
  const exact = forms[`=${count}` as '=0' | '=1'];
  if (exact !== undefined) return exact;
  return forms[pluralCategory(locale, count)] ?? forms.other;
}

const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ESC[c]!);
}

/** The {placeholders} a message uses, sorted (the checker compares these between languages). */
export function placeholdersOf(m: Message): string[] {
  const texts = typeof m === 'string' ? [m] : Object.values(m).filter((v): v is string => typeof v === 'string');
  const out = new Set<string>();
  for (const s of texts) for (const x of s.matchAll(/\{(\w+)\}/g)) out.add(x[1]!);
  return [...out].sort();
}

/** The inline HTML tags a message uses, e.g. ["a", "strong"] (also compared by the checker). */
export function tagsOf(m: Message): string[] {
  const texts = typeof m === 'string' ? [m] : Object.values(m).filter((v): v is string => typeof v === 'string');
  const out: string[] = [];
  for (const s of texts) for (const x of s.matchAll(/<([a-z][a-z0-9]*)\b/gi)) out.push(x[1]!.toLowerCase());
  return [...new Set(out)].sort();
}

/**
 * Fill in {placeholders}. Numbers are written the local way (1,234 / 1 234);
 * pass a string for anything that must stay as-is (years, ids, addresses).
 * `html` escapes the values so the message's own tags stay the only markup.
 */
export function interpolate(locale: Locale | string, message: Message, vars: Vars = {}, html = false): string {
  let text: string;
  if (isPlural(message)) {
    const c = Number(vars.count ?? 0);
    text = choosePlural(locale, message, Number.isFinite(c) ? c : 0);
  } else text = message;
  return text.replace(/\{(\w+)\}/g, (whole, name: string) => {
    if (!(name in vars)) return whole;
    const v = vars[name];
    const s = v === null || v === undefined ? '' : typeof v === 'number' ? formatNumber(locale, v) : String(v);
    return html ? escapeHtml(s) : s;
  });
}
