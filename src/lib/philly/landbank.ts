// The Philadelphia Land Bank's own status for public land: the City's public
// ArcGIS layer LAMAAssets (the data behind phillylandbank.org's property map).
// It lists public land held by four agencies — PUB (City of Philadelphia),
// PLB (Philadelphia Land Bank), PRA (Redevelopment Authority) and PHDC — with
// the Land Bank's availability status and whether a next-door homeowner can buy
// it as a side yard. Keyed by OPA account (`opabrt`). Fields checked 2026-10-04:
// pin, mapreg_1, agency, opabrt, location, status_1, councildistrict,
// sideyardeligible ('Yes'/'No'), zoning.

import { queryAttrs } from './arcgis';
import { LAYERS, sqlString } from './endpoints';
import type { BBox, LandBankStatus, LandBankTone } from './types';
import type { Locale } from '../../i18n/locales.ts';
import { words, type PhillyKey } from './words';

interface LamaAttrs {
  opabrt: string | null;
  agency: string | null;
  status_1: string | null;
  sideyardeligible: string | null;
}

export const LAMA_FIELDS = ['opabrt', 'agency', 'status_1', 'sideyardeligible'];

/** Agency codes in LAMAAssets, in plain words. */
export const LAND_BANK_AGENCY: Record<string, string> = {
  PUB: 'City of Philadelphia',
  PLB: 'Philadelphia Land Bank',
  PRA: 'Redevelopment Authority',
  PHDC: 'PHDC',
};

// Every status_1 value in the layer on 2026-10-04, in plain words (the "philly" catalog).
// Acronyms we can't expand with certainty are kept as the Land Bank writes them.
const STATUS: [RegExp, PhillyKey, LandBankTone][] = [
  [/^Owned - Available$/i, 'landBank.available', 'available'],
  [/^Owned - Available \(no construction permitted\)$/i, 'landBank.availableNoBuild', 'available'],
  [/^Owned - Available \(not for SY\)$/i, 'landBank.availableNotSideYard', 'available'],
  [/^Owned - On Hold for AHD$/i, 'landBank.holdAffordable', 'hold'],
  [/^Owned - On Hold for (.+)$/i, 'landBank.holdFor', 'hold'],
  [/^Owned - On Hold$/i, 'landBank.hold', 'hold'],
  [/^Owned - Processing Applicant, Not Available$/i, 'landBank.otherApplicant', 'unavailable'],
  [/^Owned - Not Available \(GSI Project\)$/i, 'landBank.gsi', 'unavailable'],
  [/^Owned - Managed and Not Available$/i, 'landBank.managed', 'unavailable'],
  [/^Owned - Not Available/i, 'landBank.notAvailable', 'unavailable'],
  [/^Owned - Sale Pending$/i, 'landBank.salePending', 'hold'],
  [/^Owned - RFP Released$/i, 'landBank.rfp', 'hold'],
  [/^Owned - To Be Featured Soon$/i, 'landBank.soon', 'hold'],
  [/^Owned - Competitive Bid Posted$/i, 'landBank.bids', 'hold'],
  [/^Owned - Held for City Council Member$/i, 'landBank.councilHold', 'hold'],
  [/^Unknown.*$/i, 'landBank.unknown', 'unknown'],
];

/**
 * "Owned - On Hold for AHD" → { label: "On hold for affordable housing", tone: "hold" }.
 * `locale`: the language of the label (default: the page's; lookups save it in English).
 */
export function landBankPlain(raw: string | null | undefined, locale?: Locale | string): { label: string; tone: LandBankTone } {
  const t = words(locale);
  const s = (raw ?? '').trim();
  if (!s) return { label: t('landBank.none'), tone: 'unknown' };
  for (const [re, key, tone] of STATUS) {
    const m = re.exec(s);
    if (m) return { label: t(key, { what: m[1] ?? '' }), tone };
  }
  return { label: s.replace(/^Owned - /i, ''), tone: /not available/i.test(s) ? 'unavailable' : /available/i.test(s) ? 'available' : 'hold' };
}

export function landBankFromAttrs(a: LamaAttrs): LandBankStatus {
  // saved with the lot: English (shown translated by landBankLine)
  const { label, tone } = landBankPlain(a.status_1, 'en');
  const sy = (a.sideyardeligible ?? '').trim().toUpperCase();
  return {
    agency: a.agency?.trim() || null,
    status: a.status_1?.trim() || '',
    label,
    tone,
    sideYard: sy === 'YES' ? true : sy === 'NO' ? false : null,
  };
}

/**
 * The Land Bank's status for one property. Resolves null when the property is
 * not in the Land Bank's inventory.
 */
export async function landBankStatus(opa: string, opts: { signal?: AbortSignal } = {}): Promise<LandBankStatus | null> {
  if (!/^\d{9}$/.test(opa)) return null;
  const rows = await queryAttrs<LamaAttrs>(LAYERS.landBank, { where: `opabrt=${sqlString(opa)}`, outFields: LAMA_FIELDS }, opts);
  return rows[0] ? landBankFromAttrs(rows[0]) : null;
}

/** Land Bank statuses for every inventory property in a (small) box, by OPA account. */
export async function landBankStatusesIn(bbox: BBox, opts: { signal?: AbortSignal } = {}): Promise<Map<string, LandBankStatus>> {
  const rows = await queryAttrs<LamaAttrs>(LAYERS.landBank, { envelope: bbox, outFields: LAMA_FIELDS, resultRecordCount: 2000 }, opts);
  const out = new Map<string, LandBankStatus>();
  for (const r of rows) if (r.opabrt) out.set(r.opabrt.trim(), landBankFromAttrs(r));
  return out;
}

/** "Available · side-yard eligible", in the reader's language (worked out again from the Land Bank's own status). */
export function landBankLine(s: LandBankStatus, locale?: Locale | string): string {
  const t = words(locale);
  const label = t.locale === 'en' || !s.status ? s.label : landBankPlain(s.status, t.locale).label;
  return s.sideYard ? t('landBank.sideYardLine', { status: label }) : label;
}

/** What "side-yard eligible" means, from the Land Bank's Side or Rear Yards page. */
export const sideYardMeans = (locale?: Locale | string) => words(locale)('landBank.sideYardMeans');
