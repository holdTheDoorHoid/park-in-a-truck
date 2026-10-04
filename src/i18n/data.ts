// Translated data: English data merged with a per-language overlay that only
// carries translated text (shapes and allowed fields: src/i18n/datasets.ts).
// Works at build time and in the browser (overlays marked `client` ship in /i18n/<locale>.js).
//
//   localizedSteps('es')                 -> STEPS with Spanish titles/taglines
//   localizeGuide(getGuide(slug)!, 'es') -> the guide with Spanish text, same numbers
//   localizeKeyed(PLANTS, 'plants', 'id', locale), localizeRecord(THEMES, 'themes', locale)
//
// Values that people's saved answers depend on (checklist values, ids) must keep coming
// from the ENGLISH data — only show the translated text.

import { DEFAULT_LOCALE, type Locale } from './locales.ts';
import { bundleFor } from './registry.ts';
import { STEPS, type StepMeta } from '../data/steps';
import type { Guide } from '../data/guides';

type Plain = string | number | boolean | null | undefined | Plain[] | { [k: string]: Plain };

/**
 * Deep-merge translated strings onto `base`. Only strings are replaced; keys and array items the
 * English data lacks are ignored; null/missing keeps English. Arrays line up by position.
 */
export function overlay<T>(base: T, patch: unknown): T {
  if (patch === undefined || patch === null) return base;
  if (typeof base === 'string') return (typeof patch === 'string' && patch.trim() ? patch : base) as T;
  if (Array.isArray(base)) {
    if (!Array.isArray(patch)) return base;
    return base.map((item, i) => overlay(item, patch[i])) as T;
  }
  if (base && typeof base === 'object') {
    if (typeof patch !== 'object' || Array.isArray(patch)) return base;
    const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
    for (const k of Object.keys(out)) if (k in (patch as object)) out[k] = overlay(out[k], (patch as Record<string, Plain>)[k]);
    return out as T;
  }
  return base;
}

export function getOverlay(locale: Locale | string, name: string): unknown {
  if (locale === DEFAULT_LOCALE) return undefined;
  return bundleFor(locale)?.data[name];
}

/** A list keyed by a field (plants by id, steps by slug): overlay = { [key]: partial item }. */
export function localizeKeyed<T extends object>(list: T[], name: string, key: keyof T & string, locale: Locale | string): T[] {
  const o = getOverlay(locale, name) as Record<string, unknown> | undefined;
  if (!o) return list;
  return list.map((item) => overlay(item, o[String(item[key])]));
}

/** A record keyed by id (THEMES, ELEMENTS): overlay = { [id]: partial value }. */
export function localizeRecord<T extends object>(record: T, name: string, locale: Locale | string): T {
  const o = getOverlay(locale, name);
  return o ? overlay(record, o) : record;
}

export function localizedSteps(locale: Locale | string): StepMeta[] {
  return localizeKeyed(STEPS, 'steps', 'slug', locale);
}

export function localizedStep(slug: string, locale: Locale | string): StepMeta | undefined {
  return localizedSteps(locale).find((s) => s.slug === slug);
}

/** The guide in `locale`, plus whether that language has its own text for it. */
export function localizeGuide(guide: Guide, locale: Locale | string): Guide & { translated: boolean } {
  const o = getOverlay(locale, `guides/${guide.slug}`);
  return { ...(o ? overlay(guide, o) : guide), translated: locale === DEFAULT_LOCALE || Boolean(o) };
}

/**
 * A guide's 3D model note ("why it builds bigger than stated") in `locale`, and whether it is
 * translated (overlay `models/<slug>`: { "asBuilt": { "reason": "…" } }).
 */
export function localizedModelReason(slug: string, reason: string, locale: Locale | string): { text: string; translated: boolean } {
  const o = getOverlay(locale, `models/${slug}`) as { asBuilt?: { reason?: unknown } } | undefined;
  const r = o?.asBuilt?.reason;
  return typeof r === 'string' && r.trim() ? { text: r, translated: true } : { text: reason, translated: locale === DEFAULT_LOCALE };
}
