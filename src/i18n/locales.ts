// The site's languages (DESIGN.md §2 "Languages"). English is the source and
// lives at the site root; every other language is a copy of every page under
// /<code>/ (src/pages/[lang]/…).
//
// `code`  — URL segment, folder name (src/i18n/messages/<code>/, src/content/i18n/<code>/,
//           src/i18n/data/<code>/) and the value of <html data-locale>.
// `lang`  — BCP 47 tag for <html lang> and hreflang.
// `intl`  — tag handed to Intl for numbers, dates, lists and plurals. Units stay US (ft, in, $).
// `name`  — the language's own name, shown in the language box.
// `match` — browser language prefixes (navigator.languages) that this language answers to.
//
// This file is plain TypeScript with no imports so the Node checker can load it directly.

export interface LocaleInfo {
  code: string;
  lang: string;
  intl: string;
  name: string;
  english: string;
  dir: 'ltr' | 'rtl';
  match: readonly string[];
  /** Month and weekday names for languages Intl does not know (Haitian Creole). */
  months?: readonly string[];
  weekdays?: readonly string[];
  /** "and" / "or" for lists, for languages Intl.ListFormat does not know (Haitian Creole). */
  listAnd?: string;
  listOr?: string;
  /** The comma between items of a plain list ("a, b, c"), when it isn't ", " ("、" in Chinese). */
  listSep?: string;
  /** Month names are lower case inside a sentence though Intl capitalises them alone (Vietnamese "tháng 6"). */
  monthLower?: boolean;
  /** Written without spaces between words and sentences (Chinese): no space after 。, none between two pieces. */
  noSpaces?: boolean;
}

export const LOCALES = [
  { code: 'en', lang: 'en', intl: 'en-US', name: 'English', english: 'English', dir: 'ltr', match: ['en'] },
  { code: 'es', lang: 'es', intl: 'es-US', name: 'Español', english: 'Spanish', dir: 'ltr', match: ['es'] },
  { code: 'zh', lang: 'zh-Hans', intl: 'zh-Hans', name: '中文', english: 'Chinese (Simplified)', dir: 'ltr', match: ['zh'], listSep: '、', noSpaces: true },
  { code: 'vi', lang: 'vi', intl: 'vi', name: 'Tiếng Việt', english: 'Vietnamese', dir: 'ltr', match: ['vi'], monthLower: true },
  { code: 'ru', lang: 'ru', intl: 'ru', name: 'Русский', english: 'Russian', dir: 'ltr', match: ['ru'] },
  { code: 'ar', lang: 'ar', intl: 'ar-u-nu-latn', name: 'العربية', english: 'Arabic', dir: 'rtl', match: ['ar'], listSep: '، ' },
  {
    code: 'ht',
    lang: 'ht',
    intl: 'ht',
    name: 'Kreyòl ayisyen',
    english: 'Haitian Creole',
    dir: 'ltr',
    match: ['ht'],
    months: ['janvye', 'fevriye', 'mas', 'avril', 'me', 'jen', 'jiyè', 'out', 'septanm', 'oktòb', 'novanm', 'desanm'],
    weekdays: ['dimanch', 'lendi', 'madi', 'mèkredi', 'jedi', 'vandredi', 'samdi'],
    listAnd: 'ak',
    listOr: 'oswa',
  },
  { code: 'fr', lang: 'fr', intl: 'fr', name: 'Français', english: 'French', dir: 'ltr', match: ['fr'] },
  { code: 'pt', lang: 'pt-BR', intl: 'pt-BR', name: 'Português', english: 'Portuguese (Brazil)', dir: 'ltr', match: ['pt'] },
  { code: 'sw', lang: 'sw', intl: 'sw', name: 'Kiswahili', english: 'Swahili', dir: 'ltr', match: ['sw'] },
  { code: 'ko', lang: 'ko', intl: 'ko', name: '한국어', english: 'Korean', dir: 'ltr', match: ['ko'] },
  { code: 'tl', lang: 'tl', intl: 'fil', name: 'Tagalog', english: 'Tagalog', dir: 'ltr', match: ['tl', 'fil'] },
] as const satisfies readonly LocaleInfo[];

export type Locale = (typeof LOCALES)[number]['code'];
export const DEFAULT_LOCALE = 'en' satisfies Locale;
export const LOCALE_CODES: Locale[] = LOCALES.map((l) => l.code);
/** Every language except English — the ones that get a /<code>/ copy of each page. */
export const OTHER_LOCALES: Locale[] = LOCALE_CODES.filter((c) => c !== DEFAULT_LOCALE);

export function isLocale(x: unknown): x is Locale {
  return typeof x === 'string' && (LOCALE_CODES as string[]).includes(x);
}

export function localeInfo(code: Locale | string | undefined): LocaleInfo {
  return (LOCALES as readonly LocaleInfo[]).find((l) => l.code === code) ?? LOCALES[0];
}

/** The language a browser asks for (navigator.languages order), or null. English first means "no offer". */
export function matchBrowserLanguages(prefs: readonly string[]): Locale | null {
  for (const raw of prefs) {
    const tag = raw.toLowerCase();
    for (const l of LOCALES) {
      if (l.match.some((m) => tag === m || tag.startsWith(`${m}-`))) return l.code;
    }
  }
  return null;
}

function siteBase(): string {
  const env = (import.meta as { env?: { BASE_URL?: string } }).env;
  return (env?.BASE_URL ?? '/').replace(/\/?$/, '/');
}

/**
 * Split a pathname into its language and the page path inside the site:
 * "/park-in-a-truck/es/steps/acquire/" -> { locale: "es", rest: "steps/acquire/" }.
 */
export function splitPath(pathname: string, base = siteBase()): { locale: Locale; rest: string } {
  let p = pathname;
  if (p.startsWith(base)) p = p.slice(base.length);
  else p = p.replace(/^\//, '');
  const first = p.split('/')[0] ?? '';
  if (isLocale(first) && first !== DEFAULT_LOCALE) return { locale: first, rest: p.slice(first.length + 1) };
  return { locale: DEFAULT_LOCALE, rest: p };
}

export function localeFromPath(pathname: string, base?: string): Locale {
  return splitPath(pathname, base).locale;
}
