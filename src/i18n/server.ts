// Build-time side of the translations: loads every catalog and data overlay for
// every language and registers them (src/i18n/registry.ts) so getT() and the
// data helpers work while pages render. Imported by src/i18n/astro.ts.
// NEVER import this from browser code — it would ship every language to every visitor.

import { registerBundle, type LocaleBundle } from './registry.ts';
import { DATASETS } from './datasets.ts';
import { DEFAULT_LOCALE, OTHER_LOCALES, type Locale } from './locales.ts';
import type { Catalog, Messages } from './define.ts';

const english = import.meta.glob<Catalog>('./messages/en/*.ts', { eager: true, import: 'default' });
const translated = import.meta.glob<Messages>(['./messages/*/*.ts', '!./messages/en/*.ts'], { eager: true, import: 'default' });
const overlays = import.meta.glob<unknown>('./data/*/**/*.json', { eager: true, import: 'default' });

/** English catalogs by area. */
export const ENGLISH: Record<string, Catalog> = Object.fromEntries(Object.values(english).map((c) => [c.area, c]));

const bundles: Record<string, LocaleBundle> = {};
for (const [file, msgs] of Object.entries(translated)) {
  const m = /\.\/messages\/([^/]+)\/([^/]+)\.ts$/.exec(file);
  if (!m) continue;
  const [, locale, area] = m;
  (bundles[locale!] ??= { msgs: {}, data: {} }).msgs[area!] = msgs;
}
for (const [file, data] of Object.entries(overlays)) {
  const m = /\.\/data\/([^/]+)\/(.+)\.json$/.exec(file);
  if (!m) continue;
  const [, locale, name] = m;
  (bundles[locale!] ??= { msgs: {}, data: {} }).data[name!] = data;
}
for (const [locale, b] of Object.entries(bundles)) registerBundle(locale, b);

function datasetIsClient(name: string): boolean {
  const spec = DATASETS.find((d) => d.name === name || (d.name.endsWith('/*') && name.startsWith(d.name.slice(0, -1))));
  return spec?.client ?? false;
}

/** What /i18n/<locale>.js carries: client-area catalogs and client datasets for one language. */
export function clientBundle(locale: Locale): LocaleBundle {
  const b = bundles[locale] ?? { msgs: {}, data: {} };
  const msgs: Record<string, Messages> = {};
  for (const [area, m] of Object.entries(b.msgs)) if (ENGLISH[area]?.client !== false) msgs[area] = m;
  const data: Record<string, unknown> = {};
  for (const [name, d] of Object.entries(b.data)) if (datasetIsClient(name)) data[name] = d;
  return { msgs, data };
}

/** Short content hash, used as ?v= on /i18n/<locale>.js so browsers never keep a stale copy. */
export function bundleVersion(locale: Locale): string {
  const s = JSON.stringify(clientBundle(locale));
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
  return (h >>> 0).toString(36);
}

/** Share of an area's English keys that `locale` translates (1 for English). */
export function coverage(locale: Locale, area: string): number {
  if (locale === DEFAULT_LOCALE) return 1;
  const keys = Object.keys(ENGLISH[area]?.messages ?? {});
  if (!keys.length) return 1;
  const own = bundles[locale]?.msgs[area] ?? {};
  return keys.filter((k) => own[k] !== undefined).length / keys.length;
}

/**
 * Languages the first-visit offer may suggest: the site's frame (header, footer, notices, the offer
 * itself) is fully translated, so saying "yes" really gives a page in that language.
 */
export const OFFERABLE: Locale[] = OTHER_LOCALES.filter((l) => coverage(l, 'site') === 1);
