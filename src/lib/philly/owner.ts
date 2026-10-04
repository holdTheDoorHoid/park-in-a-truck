// Who owns a lot, from the owner names on the City's property records (OPA).
//
// OPA keeps owners in two 25-ish character columns (owner_1, owner_2), so agency
// names arrive truncated and split: "REDEVELOPMENT AUTHORITY O", "PHILA
// REDEVELOPMENT" + "AUTHORITY", "PHILADELPHIA HOUSING" + "DEVELOPMENT
// CORPORATION". The patterns below were written against the real strings —
// SELECT owner_1, owner_2, count(*) FROM opa_properties_public WHERE
// category_code_description='VACANT LAND' GROUP BY 1,2 ORDER BY 3 DESC — on
// 2026-10-04; the test file lists them.

import type { OwnerType } from './types';

export interface OwnerClass {
  type: OwnerType;
  /** The agency, in plain words, when the owner is public; otherwise the owner name */
  label: string;
}

const PUBLIC_RULES: { re: RegExp; type: OwnerType; label: string }[] = [
  // Land Bank first: "PHILADELPHIA LAND BANK" (but not "PHILADELPHIA LAND INVESTM…")
  { re: /^PHI[A-Z]* LAND BANK\b/, type: 'landbank', label: 'Philadelphia Land Bank' },
  // Redevelopment Authority, every spelling seen
  {
    re: /^(REDEVELOPMENT AUTH|REDEV(EL)? AUTH|PHI[A-Z]* REDEVELOPMENT? AUTH|PHI[A-Z]* REDEVELOPMENT?$)/,
    type: 'redevelopment',
    label: 'Philadelphia Redevelopment Authority',
  },
  // Housing Authority (not the Housing Development Corporation)
  { re: /^PHI[A-Z]* HOUSING AUTH/, type: 'pha', label: 'Philadelphia Housing Authority (PHA)' },
  // PHDC
  {
    re: /^(PHI[A-Z]* HOUSING DEV|PHDC\b)/,
    type: 'other-public',
    label: 'Philadelphia Housing Development Corporation (PHDC)',
  },
  // The City itself, its departments, and Fairmount Park (City parkland)
  {
    re: /^(CITY OF PHILA(DELPHIA)?\b|PHILA(DELPHIA)? CITY OF\b|FAIRMOUNT PARK( COMM(ISSION)?)?\b|DEPARTMENT OF PARKS & RECREATION|DEPT OF PUBLIC PROPERTY)/,
    type: 'city',
    label: 'City of Philadelphia',
  },
  { re: /^SCHOOL DIST(RICT)?\b/, type: 'other-public', label: 'School District of Philadelphia' },
  { re: /^(SEPTA\b|SOUTHEASTERN PENNSYLVANIA( TRANSPORT)?)/, type: 'other-public', label: 'SEPTA (regional transit)' },
  {
    re: /^(COMMONWEALTH (OF )?(PENNA|PENNSYLVA|PENN|PA)\b|COMMONWEALTH OF PENNSYLVANIA|PENNDOT\b|GENERAL STATE AUTH)/,
    type: 'other-public',
    label: 'Commonwealth of Pennsylvania',
  },
  {
    re: /^(UNITED STATES( OF)?( AMER(ICA)?)?\b|U ?S (OF )?A(MERICA)?\b|U ?S GOV|US GOVT|USA DEPT|U ?S POSTAL|UNITED STATES POSTAL|SECRETARY OF HOUSING)/,
    type: 'other-public',
    label: 'United States government',
  },
  {
    re: /^((PHILA|PHILADELPHIA) AUTH(ORITY)?( FOR| F\/| &)? ?(IND|INDUSTRIAL)|PHILADELPHIA AUTHORITY FO|PHILA AUTH FOR\b|PHILADELPHIA AUTHORITY FOR IND|PIDC\b)/,
    type: 'other-public',
    label: 'Philadelphia Authority for Industrial Development (PIDC)',
  },
  { re: /^(PHILA|PHILADELPHIA) PARKING AUTH/, type: 'other-public', label: 'Philadelphia Parking Authority' },
  {
    re: /^((THE )?DELAWARE RIVER (PORT|JOINT)|DEL RIVER PORT AUTH|PHILADELPHIA REGIONAL PORT)/,
    type: 'other-public',
    label: 'Port / bridge authority',
  },
  { re: /^(PHILA|PHILADELPHIA) GAS WORKS\b/, type: 'other-public', label: 'Philadelphia Gas Works (City-owned utility)' },
  { re: /^(AMTRAK\b|DEPT AMTRAK\b|NATIONAL RAILROAD( PASSENG)?)/, type: 'other-public', label: 'Amtrak (federal railroad)' },
];

/** Things that look public at a glance but aren't. Checked before the rules above. */
const PRIVATE_LOOKALIKES =
  /^(U ?S BANK|FEDERAL (NATIONAL|HOME LOAN)|CITY BLOCK|CITY VIEW|CITYWIDE|CITY WIDE|PHI[A-Z]* LAND INVEST|COMMONWEALTH IMPROVEMENT|PHI[A-Z]* GAS WORKS EMPLOYEES)/;

function norm(s: string): string {
  return s.toUpperCase().replace(/[.,]/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Classify the owner(s) of a property. Pass OPA's owner_1, owner_2 (either may be
 * empty). owner_1 and owner_2 are tried on their own and joined, because agency
 * names are often split across the two.
 */
export function classifyOwner(owners: (string | null | undefined)[]): OwnerClass {
  const list = owners.filter((o): o is string => Boolean(o && o.trim())).map(norm);
  if (!list.length) return { type: 'unknown', label: 'Unknown' };
  const joined = list.join(' ');
  for (const candidate of [joined, list[0]!]) {
    if (PRIVATE_LOOKALIKES.test(candidate)) continue;
    for (const r of PUBLIC_RULES) if (r.re.test(candidate)) return { type: r.type, label: r.label };
  }
  return { type: 'private', label: list.join(' & ') };
}

export function isPublic(t: OwnerType): boolean {
  return t !== 'private' && t !== 'unknown';
}

/** Short plain-language name for an owner type (matches autofill.ts `ownerType`). */
export const OWNER_TYPE_LABEL: Record<OwnerType, string> = {
  city: 'City of Philadelphia (public)',
  landbank: 'Philadelphia Land Bank (public)',
  pha: 'Philadelphia Housing Authority (public)',
  redevelopment: 'Philadelphia Redevelopment Authority (public)',
  'other-public': 'Another public agency',
  private: 'Private owner (person, organization or business)',
  unknown: 'Unknown',
};

export interface AcquirePath {
  id: 'purchase-public' | 'donation' | 'sale' | 'purchase' | 'in-kind';
  title: string;
  text: string;
  link?: { label: string; url: string };
}

/**
 * The ways forward from the Acquire workbook ("Who owns that lot?", p.4), in
 * PiaT's words. Public → potential purchase through PHDC / the Land Bank;
 * private → donation, sale (incl. Sheriff Sale), purchase agreement, in-kind.
 */
export function acquirePaths(t: OwnerType): AcquirePath[] {
  if (isPublic(t)) {
    return [
      {
        id: 'purchase-public',
        title: 'Potential purchase',
        text:
          'Publicly owned land in Philadelphia is sold or leased through the Philadelphia Housing Development Corporation (PHDC) and the Philadelphia Land Bank. Do a property search to find out if public land is available for purchase.',
        link: { label: 'Philadelphia Land Bank', url: 'https://www.phila.gov/departments/philadelphia-land-bank/' },
      },
    ];
  }
  return [
    {
      id: 'donation',
      title: 'Potential donation',
      text: 'Contact the landowner about permanently donating the property to the neighborhood for use as a park.',
    },
    {
      id: 'sale',
      title: 'Potential sale',
      text: 'Watch for a public sale listing or auction of the property. In Philadelphia this may also include a Sheriff Sale.',
      link: { label: 'Sheriff Sale listings (Bid4Assets)', url: 'https://www.bid4assets.com/philadelphia' },
    },
    {
      id: 'purchase',
      title: 'Negotiate a purchase agreement',
      text: 'Contact the landowner and negotiate a sale of the underutilized property for neighborhood use.',
    },
    {
      id: 'in-kind',
      title: 'In-kind agreement',
      text:
        'Contact the landowner and discuss the mutual benefits of granting the neighborhood "in-kind" use of the lot as a park, while the owner keeps ownership.',
    },
  ];
}
