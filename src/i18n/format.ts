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

// ---- right-to-left -------------------------------------------------------------------------
// On right-to-left pages, things that read left to right (sizes like 1'-6.5", addresses, handles,
// money) must keep their own order inside the Arabic sentence. Unicode "isolates" do that in plain
// text, attributes and HTML alike: FSI…PDI picks the run's direction from its first letter
// (left to right when it has none, like 1'-6.5"), LRI…PDI forces left to right. Invisible, and
// only ever added in right-to-left languages, so every other language's text is unchanged.

export const FSI = '\u2068';
export const LRI = '\u2066';
export const PDI = '\u2069';

const isRtl = (locale: Locale | string) => localeInfo(locale).dir === 'rtl';

/** `s` kept in one piece inside right-to-left text (FSI…PDI); unchanged in left-to-right languages. */
export function isolate(locale: Locale | string, s: string): string {
  return s && isRtl(locale) ? `${FSI}${s}${PDI}` : s;
}

/**
 * Removes the isolate marks again — for files people open in other programs (the CSV for
 * spreadsheets, .ics calendars), where support for them is uneven and a stray mark can show as a
 * box or stop a number from reading as a number.
 */
export function stripIsolates(s: string): string {
  return s.replace(/[\u2066-\u2069]/g, '');
}

/**
 * Philadelphia addresses written into a right-to-left message ("2233 N Uber St", "22nd & Diamond",
 * "4862 Parkside Ave, Philadelphia"): a house number followed by English words. Without help the
 * number lands on the wrong side ("N Uber St 2233"). Never inside a word, a URL or an id, nor
 * again where the text already isolates it.
 */
const ADDRESS_RUN = /(?<![\p{L}\p{N}_./=?&#:\u2066-\u2068-])\d+(?:st|nd|rd|th)?(?:(?: +& +| +|, +)(?:[A-Z][A-Za-z]*|\d+(?:st|nd|rd|th)))+(?![\p{L}\p{N}])/gu;
export function isolateAddresses(locale: Locale | string, text: string): string {
  return isRtl(locale) ? text.replace(ADDRESS_RUN, (m) => `${LRI}${m}${PDI}`) : text;
}

/**
 * US dollars, written the local way. Whole dollars unless `cents` is set. "$" everywhere (Arabic's
 * own pattern says "US$", which right-to-left text turns into "$US"); kept in one piece on
 * right-to-left pages.
 */
export function formatMoney(locale: Locale | string, n: number, opts: { cents?: boolean } = {}): string {
  const digits = opts.cents ? 2 : 0;
  const s = formatNumber(locale, n, { style: 'currency', currency: 'USD', currencyDisplay: 'narrowSymbol', minimumFractionDigits: digits, maximumFractionDigits: digits });
  return isolate(locale, s.replace('US$', '$'));
}

export type DateStyle = 'long' | 'full' | 'short' | 'month-year' | 'month-day' | 'month' | 'month-day-short' | 'month-narrow' | 'weekday-short';

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
  /** "Sat, March 14, 2027" */
  'weekday-short': { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' },
};

/**
 * A month's label on a chart axis for languages Intl has no data for: the shortest beginning that
 * tells all twelve apart (Creole "out" and "oktòb" would both be "O": "Ou", "Ok"). Languages Intl
 * knows keep their own narrow forms ("J F M A M J J A S O N D", "1 2 3…").
 */
function narrowMonth(months: readonly string[], i: number): string {
  let n = 1;
  while (n < 4 && new Set(months.map((m) => m.slice(0, n).toLowerCase())).size < months.length) n++;
  const s = months[i]!.slice(0, n);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

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
    if (style === 'month-narrow') return narrowMonth(info.months, date.getMonth());
    return style === 'full' || style === 'weekday-short' ? `${wd} ${day} ${m} ${y}` : `${day} ${m} ${y}`;
  }
  return memo(`d|${locale}|${style}`, () => new Intl.DateTimeFormat(intlOf(locale), DATE_OPTS[style])).format(date);
}

/**
 * "a, b and c" in the language's own way. Languages Intl has no list rules for (Haitian Creole)
 * use their words from locales.ts ("a, b ak c"), not English's "and".
 */
export function formatList(locale: Locale | string, items: string[], type: 'conjunction' | 'disjunction' = 'conjunction'): string {
  const parts = items.map((s) => isolate(locale, s));
  const info = localeInfo(locale);
  const word = type === 'conjunction' ? info.listAnd : info.listOr;
  if (word && !memo(`ls|${info.intl}`, () => Intl.ListFormat.supportedLocalesOf([info.intl]).length > 0)) {
    if (parts.length < 2) return parts[0] ?? '';
    return `${parts.slice(0, -1).join(', ')} ${word} ${parts.at(-1)}`;
  }
  return memo(`l|${locale}|${type}`, () => new Intl.ListFormat(intlOf(locale), { style: 'long', type })).format(parts);
}

/**
 * Items side by side with the language's list comma and no "and" — "a, b, c" in English (tables,
 * short lists), "a、b、c" in Chinese, "a، b، c" in Arabic.
 */
export function joinList(locale: Locale | string, items: string[]): string {
  return items.map((s) => isolate(locale, s)).join(localeInfo(locale).listSep ?? ', ');
}

// ---- joining sentences and phrases ---------------------------------------------------------

/** Full-width punctuation (。，、！？：；（）「」…) carries its own spacing: no space before or after it. */
const FULL_WIDTH = /[\u3000-\u303f\uff01-\uff0f\uff1a-\uff20\uff3b-\uff40\uff5b-\uff65]/;
const CJK = /[\u3040-\u30ff\u3400-\u9fff\uf900-\ufaff]/;

/** The space between two pieces of text: none next to full-width punctuation, nor between Chinese characters. */
export function gapBetween(locale: Locale | string, before: string, after: string): string {
  const a = before.at(-1) ?? '';
  const b = after.charAt(0);
  if (!a || !b || /\s/.test(a) || /\s/.test(b)) return '';
  if (FULL_WIDTH.test(a) || FULL_WIDTH.test(b)) return '';
  if (localeInfo(locale).noSpaces && CJK.test(a) && CJK.test(b)) return '';
  return ' ';
}

/**
 * Sentences (or a phrase and a note) one after another: "One. Two." in most languages,
 * "第一句。第二句。" in Chinese — no space after 。！？. Empty pieces are skipped.
 */
export function joinSentences(locale: Locale | string, parts: (string | null | undefined | false)[]): string {
  let out = '';
  for (const p of parts) {
    if (!p) continue;
    out += out ? gapBetween(locale, out, p) + p : p;
  }
  return out;
}

/**
 * A clock time from minutes after midnight, the language's own way: "3:30 PM", "15:30",
 * "오후 3:30", "3:30 م". One shape per language: whole hours are written the same way as any other
 * time ("8:00", "15:00"), except that 12-hour clocks that put the number first drop ":00"
 * ("9 AM", "3 م") when `minutes` is `'auto'` (or `'never'`, which also rounds down to the hour).
 * Intl's own hour-only forms are not used — they differ in shape ("08 giờ" next to "9:30").
 * Languages Intl doesn't know (Haitian Creole) get the 24-hour clock.
 */
export function formatClock(locale: Locale | string, minutesOfDay: number, opts: { minutes?: 'always' | 'auto' | 'never' } = {}): string {
  const mode = opts.minutes ?? 'always';
  const total = mode === 'never' ? Math.floor(minutesOfDay / 60) * 60 : Math.round(minutesOfDay);
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  const info = localeInfo(locale);
  if (info.months) return `${h}:${String(m).padStart(2, '0')}`;
  const f = memo(`c|${locale}`, () => new Intl.DateTimeFormat(intlOf(locale), { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' }));
  const s = f.format(Date.UTC(2026, 0, 1, h, m));
  if (mode === 'always' || m !== 0) return s;
  const h12 = memo(`c12|${locale}`, () => /^h1[12]$/.test(f.resolvedOptions().hourCycle ?? ''));
  return h12 ? s.replace(/^(\d{1,2}):00(?=\s)/, '$1') : s;
}

/**
 * A month's name as it is written inside a sentence ("in June and July"). Same as
 * `formatDate(…, 'month')` except in languages that capitalise the name only when it stands
 * alone (Vietnamese: "Tháng 6" on its own, "vào tháng 6" in a sentence; `monthLower` in locales.ts).
 */
export function monthInSentence(locale: Locale | string, d: Date | string | number): string {
  const name = formatDate(locale, d, 'month');
  return localeInfo(locale).monthLower ? name.toLocaleLowerCase(localeInfo(locale).intl) : name;
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
 *
 * Right-to-left languages: every inserted value is isolated (FSI…PDI) so a size, an address or a
 * handle keeps its own order inside the sentence — except inside a tag (`href="{href}"`), where it
 * must stay a plain URL — and addresses written into the message itself are kept in one piece.
 */
export function interpolate(locale: Locale | string, message: Message, vars: Vars = {}, html = false): string {
  let text: string;
  if (isPlural(message)) {
    const c = Number(vars.count ?? 0);
    text = choosePlural(locale, message, Number.isFinite(c) ? c : 0);
  } else text = message;
  const rtl = isRtl(locale);
  const fill = (s: string, inTag: boolean) =>
    s.replace(/\{(\w+)\}/g, (whole, name: string) => {
      if (!(name in vars)) return whole;
      const v = vars[name];
      const raw = v === null || v === undefined ? '' : typeof v === 'number' ? formatNumber(locale, v) : String(v);
      const out = html ? escapeHtml(raw) : raw;
      return rtl && !inTag && out ? `${FSI}${out}${PDI}` : out;
    });
  if (!rtl) return fill(text, false);
  // odd pieces are tags: values there are attributes (URLs), never isolated
  return text
    .split(/(<[a-z/][^>]*>)/i)
    .map((seg, i) => (i % 2 ? fill(seg, true) : fill(isolateAddresses(locale, seg), false)))
    .join('');
}
