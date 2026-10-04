// Locale-aware links. `urlFor(locale)` is a drop-in replacement for `u()` from
// src/lib/url.ts: pages get the language prefix ("steps/acquire/" ->
// "/es/steps/acquire/"), files never do ("downloads/x.pdf", "img/a.webp" stay
// shared — PiaT's PDFs are English in every language).
//
//   const u = urlFor(t.locale);    // in a component, after getT(Astro, …)
//   <a href={u('steps/')}>…</a>
//
// Translated MDX chapters start with `export const u = urlFor('es');` (the
// scaffold script writes that line) so `{u('park-patch/')}` stays in Spanish.

import { u as baseUrl } from '../lib/url';
import { DEFAULT_LOCALE, LOCALES, splitPath, type Locale } from './locales.ts';

/** A path to a file (has an extension), not a page route. */
export function isAssetPath(path: string): boolean {
  const p = path.split(/[?#]/)[0]!;
  return /\.[a-z0-9]{1,5}$/i.test(p);
}

function isExternal(path: string): boolean {
  return /^(https?:|mailto:|tel:|#|\/\/|data:|blob:)/.test(path);
}

/** "steps/acquire/" in `locale` -> "es/steps/acquire/" (site-relative, no base). */
export function localizeRest(rest: string, locale: Locale | string): string {
  const clean = rest.replace(/^\//, '');
  if (locale === DEFAULT_LOCALE || isExternal(rest) || isAssetPath(clean)) return clean;
  return `${locale}/${clean}`;
}

export function urlFor(locale: Locale | string): (path?: string) => string {
  return (path = '') => (isExternal(path) ? path : baseUrl(localizeRest(path, locale)));
}

/** The same page in another language: "/es/steps/acquire/" -> "/vi/steps/acquire/". */
export function samePageIn(pathname: string, target: Locale | string): string {
  return baseUrl(localizeRest(splitPath(pathname).rest, target));
}

/** Every language's URL for this page, for <link rel="alternate" hreflang> and the language box. */
export function alternates(pathname: string): { code: Locale; lang: string; name: string; href: string }[] {
  return LOCALES.map((l) => ({ code: l.code, lang: l.lang, name: l.name, href: samePageIn(pathname, l.code) }));
}
