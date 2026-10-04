// Where translations live at run time, the same way in the build and in the browser:
//
//   globalThis.__PIAT_I18N__[locale] = { msgs: { <area>: { key: text } }, data: { <dataset>: overlay } }
//
// - At build time src/i18n/server.ts fills it for every language (all catalogs and data overlays).
// - In the browser, a translated page loads /i18n/<locale>.js (src/pages/i18n/[locale].js.ts) in
//   <head>, which fills it for that one language before any island or script runs.
// English is never in here: it is imported straight from src/i18n/messages/en/<area>.ts.

import type { Messages } from './define.ts';

export interface LocaleBundle {
  msgs: Record<string, Messages>;
  data: Record<string, unknown>;
}

type Registry = Record<string, LocaleBundle>;

declare global {
  // eslint-disable-next-line no-var
  var __PIAT_I18N__: Registry | undefined;
}

export function bundleFor(locale: string): LocaleBundle | undefined {
  return globalThis.__PIAT_I18N__?.[locale];
}

export function registerBundle(locale: string, bundle: LocaleBundle): void {
  const reg = (globalThis.__PIAT_I18N__ ??= {});
  const cur = (reg[locale] ??= { msgs: {}, data: {} });
  Object.assign(cur.msgs, bundle.msgs);
  Object.assign(cur.data, bundle.data);
}
