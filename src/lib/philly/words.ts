// The "philly" area's words (src/i18n/messages/<lang>/philly.ts) for the City-data client and
// its widgets.
//
//   words()        text in the page's language (<html data-locale> in the browser; English in
//                  Node and tests). words(locale) for a given language.
//   EN             English. Use it for text that is SAVED with the project (lot.extra.*,
//                  lot.sources, asset names): saved data stays English, so a project file reads
//                  the same in every language. It is translated when it is SHOWN, with:
//   retranslate()  saved English text made from one of a few messages -> that message in the
//                  reader's language, with the same values. Anything else comes back unchanged.

import philly from '../../i18n/messages/en/philly.ts';
import { getT, type T } from '../../i18n/t.ts';
import type { Vars } from '../../i18n/define.ts';
import type { Locale } from '../../i18n/locales.ts';

export type PhillyT = T<typeof philly>;
export type PhillyKey = keyof typeof philly.messages & string;

export const words = (locale?: Locale | string): PhillyT => getT(locale, philly);
export const EN: PhillyT = getT('en', philly);

const patterns = new Map<string, { re: RegExp; names: string[] }>();

/** A regular expression that matches the English text of `key`, capturing its {placeholders}. */
function pattern(key: PhillyKey) {
  let p = patterns.get(key);
  if (!p) {
    const m = philly.messages[key] as string | { other: string };
    const text = typeof m === 'string' ? m : m.other;
    const names: string[] = [];
    const parts = text.split(/\{(\w+)\}/);
    const src = parts
      .map((part, i) => {
        if (i % 2) {
          names.push(part);
          return '(.+?)';
        }
        return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      })
      .join('');
    p = { re: new RegExp(`^${src}$`), names };
    patterns.set(key, p);
  }
  return p;
}

/** Which of `keys` made this English text, and with which values. */
export function matchEnglish(text: string, keys: readonly PhillyKey[]): { key: PhillyKey; vars: Record<string, string> } | null {
  for (const key of keys) {
    const { re, names } = pattern(key);
    const m = re.exec(text);
    if (!m) continue;
    const vars: Record<string, string> = {};
    names.forEach((n, i) => {
      if (!(n in vars)) vars[n] = m[i + 1]!;
    });
    return { key, vars };
  }
  return null;
}

/**
 * Saved English `text` (made by EN(key, …) for one of `keys`) in t's language. `fix` may replace
 * the captured values (e.g. re-format numbers the local way). Unknown text is returned as it is.
 */
export function retranslate(
  text: string,
  keys: readonly PhillyKey[],
  t: PhillyT,
  fix?: (key: PhillyKey, vars: Record<string, string>) => Vars,
): string {
  if (t.locale === 'en') return text;
  const hit = matchEnglish(text, keys);
  if (!hit) return text;
  return t(hit.key, fix ? fix(hit.key, hit.vars) : hit.vars);
}

/** Every key of the philly catalog that starts with `prefix` ("warn." → all the warnings). */
export function keysWith(prefix: string): PhillyKey[] {
  return (Object.keys(philly.messages) as PhillyKey[]).filter((k) => k.startsWith(prefix));
}
