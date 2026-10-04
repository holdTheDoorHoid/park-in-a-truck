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

/**
 * Safety net for server-rendered HTML on a translated page: page links that still point at English
 * (an English chapter shown as fallback, a page not extracted yet, links inside data) get the language
 * prefix. Only <a href> to site pages; files, other sites, and links marked hreflang (language
 * switches, "read it in English") are left alone. Base.astro runs this over every translated page body.
 */
export function localizeLinks(html: string, locale: Locale | string, base = baseUrl('')): string {
  if (locale === DEFAULT_LOCALE) return html;
  const locales = LOCALES.map((l) => l.code).filter((c) => c !== DEFAULT_LOCALE);
  return html.replace(/<a\b[^>]*>/gi, (tag) => {
    if (/\shreflang=/i.test(tag)) return tag;
    return tag.replace(/(\shref=)(["'])([^"']*)\2/i, (whole, attr: string, q: string, href: string) => {
      if (!href.startsWith(base) || href.startsWith('//')) return whole;
      const rest = href.slice(base.length);
      const first = rest.split(/[/?#]/)[0] ?? '';
      if (isAssetPath(rest) || (locales as string[]).includes(first) || rest.startsWith('i18n/') || rest.startsWith('dev/')) return whole;
      return `${attr}${q}${base}${locale}/${rest}${q}`;
    });
  });
}

/** Every language's URL for this page, for <link rel="alternate" hreflang> and the language box. */
export function alternates(pathname: string): { code: Locale; lang: string; name: string; href: string }[] {
  return LOCALES.map((l) => ({ code: l.code, lang: l.lang, name: l.name, href: samePageIn(pathname, l.code) }));
}
