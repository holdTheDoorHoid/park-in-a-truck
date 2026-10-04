// Plain-language names for City codes (zoning districts, flood zones) and the
// current City Council roster. Names follow the Philadelphia Zoning Code
// (Title 14, §14-400 base districts). The words come from the "philly" catalog
// (src/i18n/messages/<lang>/philly.ts); every function takes an optional language
// (default: the page's language in the browser, English in Node).

import type { Locale } from '../../i18n/locales.ts';
import { EN, retranslate, words, type PhillyKey } from './words';

const ZONING: [RegExp, PhillyKey][] = [
  [/^RSD/, 'zoning.rsd'],
  [/^RSA/, 'zoning.rsa'],
  [/^RTA/, 'zoning.rta'],
  [/^RMX/, 'zoning.rmx'],
  [/^RM/, 'zoning.rm'],
  [/^CMX-?(4|5)/, 'zoning.cmxCenter'],
  [/^CMX-?3/, 'zoning.cmx3'],
  [/^CMX/, 'zoning.cmx'],
  [/^CA/, 'zoning.ca'],
  [/^IRMX/, 'zoning.irmx'],
  [/^ICMX/, 'zoning.icmx'],
  [/^I-?P/, 'zoning.ip'],
  [/^I-?1/, 'zoning.i1'],
  [/^I-?2/, 'zoning.i2'],
  [/^I-?3/, 'zoning.i3'],
  [/^SP-?PO-?A/, 'zoning.spPoA'],
  [/^SP-?PO-?P/, 'zoning.spPoP'],
  [/^SP-?ENT/, 'zoning.spEnt'],
  [/^SP-?INS/, 'zoning.spIns'],
  [/^SP-?STA/, 'zoning.spSta'],
  [/^SP-?AIR/, 'zoning.spAir'],
];

/** "RSA5" / "RSA-5" → "RSA-5" (the way the Zoning Code writes it). */
export function normaliseZoning(code: string | null | undefined): string | null {
  if (!code) return null;
  let c = code.toUpperCase().replace(/\s+/g, '').trim();
  if (!c) return null;
  if (c === 'SPPOA') return 'SP-PO-A';
  if (c === 'SPPOP') return 'SP-PO-P';
  // insert the hyphen before the number: RSA5 -> RSA-5, CMX2.5 -> CMX-2.5, I2 -> I-2
  c = c.replace(/^([A-Z]+)-?(\d+(\.\d+)?)$/, '$1-$2');
  c = c.replace(/^SP-?(ENT|INS|STA|AIR)$/, 'SP-$1');
  return c;
}

/** "RSA-5" → "RSA-5 · Residential — single-family attached houses (rowhouses and twins)" */
export function zoningPlain(code: string | null | undefined, locale?: Locale | string): string | null {
  const c = normaliseZoning(code);
  if (!c) return null;
  const hit = ZONING.find(([re]) => re.test(c));
  if (!hit) return c;
  const t = words(locale);
  return t('zoning.line', { code: c, meaning: t(hit[1]) });
}

const FLOOD_KEYS: PhillyKey[] = ['flood.none', 'flood.xShaded', 'flood.x', 'flood.high', 'flood.waves', 'flood.other'];

/** FEMA flood zone code → plain words. (lookupLot saves it in English: floodPlain(z, s, 'en').) */
export function floodPlain(zone: string | null | undefined, subtype?: string | null, locale?: Locale | string): string {
  const t = words(locale);
  if (!zone) return t('flood.none');
  const z = zone.toUpperCase();
  if (z === 'X' && /0\.2/.test(subtype ?? '')) return t('flood.xShaded');
  if (z === 'X') return t('flood.x');
  if (z.startsWith('AE') || z === 'A' || z.startsWith('AO') || z.startsWith('AH')) return t('flood.high', { zone: z });
  if (z.startsWith('V')) return t('flood.waves', { zone: z });
  return t('flood.other', { zone: z });
}

/** A saved flood-zone label (LotExtra.floodZoneLabel, English) in the reader's language. */
export function floodText(saved: string, locale?: Locale | string): string {
  return retranslate(saved, FLOOD_KEYS, words(locale));
}

/**
 * Philadelphia City Council district members, term January 2024 – January 2028
 * (elected November 2023). Not in the City's open data, so kept here; check
 * phlcouncil.com if a seat changes.
 */
export const COUNCIL_MEMBERS: Record<string, string> = {
  '1': 'Mark Squilla',
  '2': 'Kenyatta Johnson',
  '3': 'Jamie Gauthier',
  '4': 'Curtis Jones Jr.',
  '5': 'Jeffery Young Jr.',
  '6': 'Michael Driscoll',
  '7': 'Quetcy Lozada',
  '8': 'Cindy Bass',
  '9': 'Anthony Phillips',
  '10': "Brian O'Neill",
};
/** The term the roster above is for (first month of each end). */
export const COUNCIL_TERM = { from: '2024-01-01', to: '2028-01-01' };
/** "January 2024 – January 2028 term" (English; assets.ts words it in the page's language) */
export const COUNCIL_AS_OF = `${EN.date(COUNCIL_TERM.from, 'month-year')} – ${EN.date(COUNCIL_TERM.to, 'month-year')} term`;

/** Each district member's own page on phlcouncil.com (checked 2026-10-04). */
export const COUNCIL_PAGES: Record<string, string> = {
  '1': 'https://phlcouncil.com/marksquilla/',
  '2': 'https://phlcouncil.com/kenyattajohnson/',
  '3': 'https://phlcouncil.com/jamiegauthier/',
  '4': 'https://phlcouncil.com/curtisjonesjr/',
  '5': 'https://phlcouncil.com/jefferyyoungjr/',
  '6': 'https://phlcouncil.com/michaeldriscoll/',
  '7': 'https://phlcouncil.com/quetcylozada/',
  '8': 'https://phlcouncil.com/cindybass/',
  '9': 'https://phlcouncil.com/anthonyphillips/',
  '10': 'https://phlcouncil.com/brianoneill/',
};

/** "N DOVER ST" → "N Dover St" */
export function titleCase(s: string | null | undefined): string {
  if (!s) return '';
  return s
    .toLowerCase()
    .replace(/(^|[^a-z'’])([a-z])/g, (_, a: string, c: string) => a + c.toUpperCase())
    .replace(/\b(Ii|Iii|Iv|Llc|Llp|Lp|Inc|Usa|Phdc|Pha|Pidc|Septa|Rco|Cdc|Ppr)\b/g, (m) => m.toUpperCase())
    // OPA cuts long names off at a fixed width: "…DEVELOPERS LL" is a cut-off "LLC"
    // (probably), but we can't be sure, so keep the letters as the City has them.
    .replace(/\bLl$/, 'LL')
    .replace(/\b(\d+)(St|Nd|Rd|Th)\b/g, (_, n: string, s: string) => n + s.toLowerCase())
    .replace(/(^|\s)(n|s|e|w)(?=\s)/gi, (_, a: string, d: string) => a + d.toUpperCase())
    .replace(/\b(Pa|Nj|De|Ny|Md)(?= \d{5})/g, (m) => m.toUpperCase());
}

/** "2152350353" → "(215) 235-0353"; anything else is returned as given. */
export function phone(p: string | null | undefined): string {
  if (!p) return '';
  const d = p.replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');
  return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : p.trim();
}

/** 1234.5 → "1,235 sq ft" (written the local way: "1 235 sq ft") */
export const sqft = (n: number | null | undefined, locale?: Locale | string) => (n == null ? '—' : words(locale)('unit.sqft', { n: Math.round(n), count: Math.round(n) }));
/** 13.96 → "14.0 ft" (always `d` decimals; "14,0 ft" where a comma is the decimal mark) */
export const feet = (n: number | null | undefined, d = 1, locale?: Locale | string) => {
  if (n == null) return '—';
  const t = words(locale);
  const v = Math.round(n * 10 ** d) / 10 ** d;
  return t('unit.ft', { n: t.num(v, { minimumFractionDigits: d, maximumFractionDigits: d, useGrouping: false }), count: v });
};
/** distance for lists: 180 → "180 ft", 2400 → "0.5 mi" */
export function distance(ft: number | null | undefined, locale?: Locale | string): string {
  if (ft == null) return '';
  const t = words(locale);
  if (ft < 30) return t('distance.nextDoor');
  if (ft < 1000) return t('unit.ft', { n: Math.round(ft / 10) * 10, count: Math.round(ft / 10) * 10 });
  // 0.25 mi, 0.5 mi, 1 mi, 1.3 mi — never "1." or "1.0"
  const mi = Math.round((ft / 5280) * (ft < 5280 ? 100 : 10)) / (ft < 5280 ? 100 : 10);
  return t('unit.mi', { n: mi, count: mi });
}
