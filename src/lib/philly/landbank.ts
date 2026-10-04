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

// Every status_1 value in the layer on 2026-10-04, in plain words. Acronyms we
// can't expand with certainty are kept as the Land Bank writes them.
const STATUS: [RegExp, string, LandBankTone][] = [
  [/^Owned - Available$/i, 'Available', 'available'],
  [/^Owned - Available \(no construction permitted\)$/i, 'Available — no construction permitted', 'available'],
  [/^Owned - Available \(not for SY\)$/i, 'Available — but not as a side yard', 'available'],
  [/^Owned - On Hold for AHD$/i, 'On hold for affordable housing', 'hold'],
  [/^Owned - On Hold for (.+)$/i, 'On hold for $1', 'hold'],
  [/^Owned - On Hold$/i, 'On hold', 'hold'],
  [/^Owned - Processing Applicant, Not Available$/i, 'Another applicant is in process — not available', 'unavailable'],
  [/^Owned - Not Available \(GSI Project\)$/i, 'Not available — green stormwater project', 'unavailable'],
  [/^Owned - Managed and Not Available$/i, 'Managed by the agency — not available', 'unavailable'],
  [/^Owned - Not Available/i, 'Not available', 'unavailable'],
  [/^Owned - Sale Pending$/i, 'Sale pending', 'hold'],
  [/^Owned - RFP Released$/i, 'Offered through a request for proposals (RFP)', 'hold'],
  [/^Owned - To Be Featured Soon$/i, 'To be listed soon', 'hold'],
  [/^Owned - Competitive Bid Posted$/i, 'Open for competitive bids', 'hold'],
  [/^Owned - Held for City Council Member$/i, 'Held for the district Councilmember', 'hold'],
  [/^Unknown.*$/i, 'Status not known yet (Land Bank research pending)', 'unknown'],
];

/** "Owned - On Hold for AHD" → { label: "On hold for affordable housing", tone: "hold" } */
export function landBankPlain(raw: string | null | undefined): { label: string; tone: LandBankTone } {
  const s = (raw ?? '').trim();
  if (!s) return { label: 'No status listed', tone: 'unknown' };
  for (const [re, label, tone] of STATUS) if (re.test(s)) return { label: s.replace(re, label), tone };
  return { label: s.replace(/^Owned - /i, ''), tone: /not available/i.test(s) ? 'unavailable' : /available/i.test(s) ? 'available' : 'hold' };
}

export function landBankFromAttrs(a: LamaAttrs): LandBankStatus {
  const { label, tone } = landBankPlain(a.status_1);
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

/** "Available · side-yard eligible" */
export function landBankLine(s: LandBankStatus): string {
  return s.sideYard ? `${s.label} · side-yard eligible` : s.label;
}

/** What "side-yard eligible" means, from the Land Bank's Side or Rear Yards page. */
export const SIDE_YARD_MEANS =
  'Side-yard eligible: a homeowner who lives next door can apply to buy it from the Land Bank as a side or rear yard.';
