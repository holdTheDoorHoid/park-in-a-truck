// Types for message catalogs (see docs/i18n/HOW-TO-TRANSLATE.md).
//
// English catalogs are the source of truth:
//
//   // src/i18n/messages/en/site.ts
//   export default defineMessages('site', {
//     'nav.steps': 'Steps',
//     'progress.total': '{done} of {total} steps done',
//     'rows': { one: '{count} row', other: '{count} rows' },
//   });
//
// Every other language carries only translations, checked against the English keys:
//
//   // src/i18n/messages/es/site.ts
//   import type en from '../en/site.ts';
//   import type { Translation } from '../../define.ts';
//   export default { 'nav.steps': 'Pasos' } satisfies Translation<typeof en>;
//
// No imports besides types: the Node checker (scripts/i18n-check.ts) loads these files directly.

/** Plural forms, chosen with Intl.PluralRules by the `count` placeholder. `other` is required. */
export interface PluralForms {
  other: string;
  zero?: string;
  one?: string;
  two?: string;
  few?: string;
  many?: string;
  /** Exact matches win over the plural category. */
  '=0'?: string;
  '=1'?: string;
}

export type Message = string | PluralForms;
export type Messages = Record<string, Message>;

export interface Catalog<A extends string = string, M extends Messages = Messages> {
  area: A;
  /** False for big prose areas only ever rendered at build time (kept out of the per-language browser file). */
  client: boolean;
  messages: M;
}

export function defineMessages<A extends string, const M extends Messages>(area: A, messages: M, opts: { client?: boolean } = {}): Catalog<A, M> {
  return { area, client: opts.client ?? true, messages };
}

export type MessageKey<C extends Catalog> = keyof C['messages'] & string;

/** What a translation file may contain for catalog C: any subset of its keys, plural keys as plural forms. */
export type Translation<C extends Catalog> = {
  [K in keyof C['messages']]?: C['messages'][K] extends string ? string : PluralForms;
};

export type Vars = Record<string, string | number | null | undefined>;
