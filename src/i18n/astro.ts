// Everything .astro files need for languages. Importing this registers every
// language's text for the build (./server.ts). Browser code imports ./t.ts,
// ./url.ts and ./data.ts instead.
//
//   ---
//   import site from '../i18n/messages/en/site.ts';
//   import { getT, urlFor } from '../i18n/astro.ts';
//   const t = getT(Astro, site);
//   const u = urlFor(t.locale);
//   ---
//   <a href={u('steps/')}>{t('nav.steps')}</a>

import './server.ts';

export { getT, resolveLocale, type T } from './t.ts';
export { urlFor, samePageIn, alternates } from './url.ts';
export { localizedSteps, localizedStep, localizeGuide, localizeKeyed, localizeRecord, overlay } from './data.ts';
export { localeInfo, LOCALES, OTHER_LOCALES, DEFAULT_LOCALE, type Locale } from './locales.ts';
export { OFFERABLE, coverage, bundleVersion } from './server.ts';
export { localeStaticPaths } from './routes.ts';

/** The page's language, from its URL. */
export { localeFromPath } from './locales.ts';
