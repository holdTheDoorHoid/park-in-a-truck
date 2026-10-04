// Resolves `data-auto="lot.owners|join"` style references against the active
// project, so a workbook blank can show what the site already looked up
// ("Filled from City records") until the person types their own answer.
//
// Path: dotted path from the project root (lot.*, design.*, extra.*, fields.*).
// Format (optional, after |): join, owners, sqft, ft, money, date, yesno, ownerType, lotType,
// zoning ("RSA5" → "RSA-5 · Residential — …"), size ("B" → "Size B"), lotKind.
//
// Words come from the "workbook" catalog (src/i18n/messages/<lang>/workbook.ts) in the
// requested language. Select fields always ask for English: their options are saved by
// their English value and only SHOW a translated label.

import type { Project } from './types';
import { zoningPlain } from './philly/plain';
import { ownerNames } from './philly/owner';
import workbook from '../i18n/messages/en/workbook.ts';
import { getT } from '../i18n/t.ts';
import type { Locale } from '../i18n/locales.ts';

type WB = keyof typeof workbook.messages;
const has = (k: string): k is WB => k in workbook.messages;

function get(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((o, k) => (o == null ? undefined : (o as Record<string, unknown>)[k]), obj);
}

export function formatAuto(v: unknown, fmt?: string, locale: Locale | string = 'en'): string | null {
  if (v === undefined || v === null || v === '') return null;
  const t = getT(locale, workbook);
  const word = (key: string) => (has(key) ? t(key) : String(v));
  switch (fmt) {
    case 'join':
      // "&" reads the same in every language and keeps owner names exactly as the City lists them
      return Array.isArray(v) ? v.filter(Boolean).join(' & ') : String(v);
    // OPA's owner_1 + owner_2: "&" between two people, but one agency name split across
    // the two columns stays one name (philly-data)
    case 'owners':
      return Array.isArray(v) ? ownerNames(v as string[]) || null : String(v);
    case 'sqft':
      return t('auto.sqft', { n: Math.round(Number(v)) });
    case 'ft':
      return t('auto.ft', { n: Math.round(Number(v) * 10) / 10 });
    case 'money':
      return t.money(Number(v));
    case 'date':
      return t.date(String(v), 'long');
    case 'yesno':
      return v ? t('auto.yes') : t('auto.no');
    case 'ownerType':
      return word(`auto.owner.${String(v)}`);
    case 'lotType':
      return word(`auto.lot.${String(v)}`);
    // Assess summary: trees kept on the lot (planner) -> the workbook's choices.
    // "Mostly trees" can't be told from a count, so the person picks that one.
    case 'treeCount': {
      const n = Number(v);
      if (!Number.isFinite(n)) return null;
      return t(n <= 0 ? 'auto.trees.none' : n <= 2 ? 'auto.trees.few' : 'auto.trees.several');
    }
    // Assess summary ("Are you ready?"): SiteFacts.sunClass -> the workbook's own wording.
    case 'sunClass':
      return word(`auto.sun.${String(v)}`);
    // added by philly-data
    case 'zoning':
      return zoningPlain(String(v), t.locale) ?? String(v);
    case 'size':
      return t('auto.size', { size: String(v) });
    // Assess summary: SiteFacts.lotKind -> the workbook's own wording.
    case 'lotKind':
      return word(`auto.kind.${String(v)}`);
    default:
      return Array.isArray(v) ? v.join(', ') : String(v);
  }
}

export function resolveAuto(p: Project, spec: string, locale: Locale | string = 'en'): string | null {
  const [path, fmt] = spec.split('|');
  return formatAuto(get(p, path!.trim()), fmt?.trim(), locale);
}
