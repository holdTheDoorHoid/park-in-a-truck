// /i18n/<locale>.js — one language's text for the browser (islands, bind.ts), loaded in <head>
// by Base.astro on that language's pages only, before any island runs. See src/i18n/registry.ts.
import type { APIRoute } from 'astro';
import { clientBundle } from '../../i18n/server.ts';
import { OTHER_LOCALES, type Locale } from '../../i18n/locales.ts';

export function getStaticPaths() {
  return OTHER_LOCALES.map((locale) => ({ params: { locale } }));
}

export const GET: APIRoute = ({ params }) => {
  const locale = params.locale as Locale;
  const json = JSON.stringify(clientBundle(locale)).replace(/</g, '\\u003c');
  const body = `(window.__PIAT_I18N__=window.__PIAT_I18N__||{})[${JSON.stringify(locale)}]=${json};\n`;
  return new Response(body, { headers: { 'Content-Type': 'text/javascript; charset=utf-8' } });
};
