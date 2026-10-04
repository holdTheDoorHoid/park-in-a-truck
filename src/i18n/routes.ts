// Every page exists once per language. English pages stay where they are
// (src/pages/…); each has a tiny twin under src/pages/[lang]/ that renders the
// SAME page component for every other language:
//
//   // src/pages/[lang]/lot/index.astro
//   ---
//   import Page from '../../lot/index.astro';
//   import { localeStaticPaths } from '../../../i18n/routes.ts';
//   export const getStaticPaths = () => localeStaticPaths();
//   ---
//   <Page />
//
//   // a dynamic page passes its own English paths through:
//   import Page, { getStaticPaths as english } from '../../steps/[slug].astro';
//   export const getStaticPaths = () => localeStaticPaths(english());
//
// The page itself reads its language from the URL (getT(Astro, …)), so nothing
// else changes. src/i18n/__tests__/routes.test.ts fails if a page has no twin.

import { OTHER_LOCALES } from './locales.ts';

interface PathEntry {
  params: Record<string, string | number | undefined>;
  props?: Record<string, unknown>;
}

export async function localeStaticPaths<P extends PathEntry>(english?: P[] | Promise<P[]>): Promise<(P & { params: P['params'] & { lang: string } })[]> {
  const base = english ? await english : ([{ params: {} }] as P[]);
  return OTHER_LOCALES.flatMap((lang) => base.map((p) => ({ ...p, params: { ...p.params, lang } })));
}
