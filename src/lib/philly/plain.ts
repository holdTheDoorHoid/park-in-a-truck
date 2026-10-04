// Plain-language names for City codes (zoning districts, flood zones) and the
// current City Council roster. Names follow the Philadelphia Zoning Code
// (Title 14, §14-400 base districts).

const ZONING: [RegExp, string][] = [
  [/^RSD/, 'Residential — single-family detached houses'],
  [/^RSA/, 'Residential — single-family attached houses (rowhouses and twins)'],
  [/^RTA/, 'Residential — two-family attached houses'],
  [/^RMX/, 'Residential mixed-use'],
  [/^RM/, 'Residential — multi-family (apartments)'],
  [/^CMX-?(4|5)/, 'Center City commercial mixed-use'],
  [/^CMX-?3/, 'Community commercial mixed-use'],
  [/^CMX/, 'Neighborhood commercial mixed-use (shops with homes above)'],
  [/^CA/, 'Auto-oriented commercial'],
  [/^IRMX/, 'Industrial-residential mixed-use'],
  [/^ICMX/, 'Industrial-commercial mixed-use'],
  [/^I-?P/, 'Port industrial'],
  [/^I-?1/, 'Light industrial'],
  [/^I-?2/, 'Medium industrial'],
  [/^I-?3/, 'Heavy industrial'],
  [/^SP-?PO-?A/, 'Parks and open space (active)'],
  [/^SP-?PO-?P/, 'Parks and open space (passive)'],
  [/^SP-?ENT/, 'Entertainment (casinos)'],
  [/^SP-?INS/, 'Institutional (campuses, hospitals)'],
  [/^SP-?STA/, 'Stadium'],
  [/^SP-?AIR/, 'Airport'],
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
export function zoningPlain(code: string | null | undefined): string | null {
  const c = normaliseZoning(code);
  if (!c) return null;
  const hit = ZONING.find(([re]) => re.test(c));
  return hit ? `${c} · ${hit[1]}` : c;
}

/** FEMA flood zone code → plain words. */
export function floodPlain(zone: string | null | undefined, subtype?: string | null): string {
  if (!zone) return 'Not in a FEMA flood zone';
  const z = zone.toUpperCase();
  if (z === 'X' && /0\.2/.test(subtype ?? '')) return 'Zone X (shaded) — moderate flood risk (0.2% chance a year, the "500-year" floodplain)';
  if (z === 'X') return 'Zone X — minimal flood risk';
  if (z.startsWith('AE') || z === 'A' || z.startsWith('AO') || z.startsWith('AH'))
    return `Zone ${z} — high flood risk (1% chance a year, the "100-year" floodplain)`;
  if (z.startsWith('V')) return `Zone ${z} — high flood risk with waves`;
  return `Zone ${z}`;
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
export const COUNCIL_AS_OF = 'January 2024 – January 2028 term';

/** "N DOVER ST" → "N Dover St" */
export function titleCase(s: string | null | undefined): string {
  if (!s) return '';
  return s
    .toLowerCase()
    .replace(/(^|[^a-z'’])([a-z])/g, (_, a: string, c: string) => a + c.toUpperCase())
    .replace(/\b(Ii|Iii|Iv|Llc|Lp|Inc|Usa|Phdc|Pha|Pidc|Septa|Rco|Cdc|Ppr)\b/g, (m) => m.toUpperCase())
    .replace(/\b(\d+)(St|Nd|Rd|Th)\b/g, (_, n: string, s: string) => n + s.toLowerCase())
    .replace(/(^|\s)(n|s|e|w)(?=\s)/gi, (_, a: string, d: string) => a + d.toUpperCase());
}

/** 1234.5 → "1,235 sq ft" */
export const sqft = (n: number | null | undefined) => (n == null ? '—' : `${Math.round(n).toLocaleString('en-US')} sq ft`);
/** 13.96 → "14.0 ft" */
export const feet = (n: number | null | undefined, d = 1) => (n == null ? '—' : `${(Math.round(n * 10 ** d) / 10 ** d).toFixed(d)} ft`);
/** distance for lists: 180 → "180 ft", 2400 → "0.5 mi" */
export function distance(ft: number | null | undefined): string {
  if (ft == null) return '';
  if (ft < 30) return 'next door';
  if (ft < 1000) return `${Math.round(ft / 10) * 10} ft`;
  return `${(ft / 5280).toFixed(ft < 5280 ? 2 : 1).replace(/0$/, '')} mi`;
}
