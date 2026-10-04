import { describe, expect, it } from 'vitest';
import { acquirePaths, classifyOwner, isPublic, landBankHandles, ownerNames } from '../owner';

// Real owner strings from opa_properties_public (VACANT LAND and all categories), 2026-10-04.
const CASES: [string[], string][] = [
  [['CITY OF PHILA'], 'city'],
  [['CITY OF PHILADELPHIA'], 'city'],
  [['CITY OF PHILA', 'DEPT PUB PROP'], 'city'],
  [['CITY OF PHILA', 'DEPT OF PUBLC PROP'], 'city'],
  [['CITY OF PHILA DEPT OF'], 'city'],
  [['FAIRMOUNT PARK COMM', 'WISSAHICKON VALLEY'], 'city'],
  [['FAIRMOUNT PARK COMMISSION'], 'city'],
  [['DEPARTMENT OF PARKS & RECREATION'], 'city'],
  [['PHILADELPHIA LAND BANK'], 'landbank'],
  [['PHIADELPHIA LAND BANK'], 'landbank'],
  [['REDEVELOPMENT AUTHORITY'], 'redevelopment'],
  [['REDEVELOPMENT AUTHORITY', 'OF PHILADELPHIA'], 'redevelopment'],
  [['REDEVELOPMENT AUTHORITY O'], 'redevelopment'],
  [['PHILA REDEVELOPMENT', 'AUTHORITY'], 'redevelopment'],
  [['PHILA REDEVELOPMENT AUTH'], 'redevelopment'],
  [['REDEVELOPMENT AUTH PHILA'], 'redevelopment'],
  [['PHILADELPHIA REDEVELOPMEN'], 'redevelopment'],
  [['PHILADELPHIA REDEVELOPMENT AUTHORITY'], 'redevelopment'],
  [['PHILA REDEVELOPMENT AUTHO'], 'redevelopment'],
  [['REDEV AUTH OF PHILA'], 'redevelopment'],
  [['REDEVEL AUTH OF PHILA'], 'redevelopment'],
  [['PHILADELPHIA HOUSING AUTH'], 'pha'],
  [['PHILA HOUSING AUTHORITY'], 'pha'],
  [['PHILADELPHIA HOUSING AUTHORITY'], 'pha'],
  [['PHILA HOUSING AUTH'], 'pha'],
  [['PHILADELPHA HOUSING AUTH'], 'pha'],
  [['PHILADELPHIA HOUSING', 'AUTHORITY'], 'pha'],
  [['PHILADELPHIA HOUSING', 'DEVELOPMENT CORPORATION'], 'other-public'],
  [['PHILA HOUSING DEV CORP'], 'other-public'],
  [['PHDC'], 'other-public'],
  [['SCHOOL DISTRICT OF PHILA'], 'other-public'],
  [['SCHOOL DISTRICT', 'OF PHILA'], 'other-public'],
  [['SCHOOL DIST OF PHILA'], 'other-public'],
  [['SEPTA'], 'other-public'],
  [['SOUTHEASTERN PENNSYLVANIA', 'TRANSPORT AUTHORITY'], 'other-public'],
  [['COMMONWEALTH OF PENNA'], 'other-public'],
  [['COMMONWEALTH OF PENNSYLVA'], 'other-public'],
  [['COMMONWEALTH OF PA'], 'other-public'],
  [['COMMONWEALTH OF PA DOT'], 'other-public'],
  [['PENNDOT'], 'other-public'],
  [['GENERAL STATE AUTH'], 'other-public'],
  [['UNITED STATES OF AMERICA'], 'other-public'],
  [['UNITED STATES OF', 'AMERICA'], 'other-public'],
  [['U S OF AMERICA'], 'other-public'],
  [['U S A'], 'other-public'],
  [['USA DEPT OF INTERIOR'], 'other-public'],
  [['UNITED STATES POSTAL'], 'other-public'],
  [['SECRETARY OF HOUSING AND'], 'other-public'],
  [['PHILA AUTH IND DEV'], 'other-public'],
  [['PHILA AUTHORITY FOR', 'INDUSTRIAL DEVELOPMENT'], 'other-public'],
  [['PHILADELPHIA AUTHORITY FO'], 'other-public'],
  [['PHILA AUTH FOR IND DEV'], 'other-public'],
  [['PHILA PARKING AUTHORITY'], 'other-public'],
  [['DELAWARE RIVER PORT'], 'other-public'],
  [['THE DELAWARE RIVER', 'PORT AUTHORITY'], 'other-public'],
  [['AMTRAK'], 'other-public'],
  [['NATIONAL RAILROAD', 'PASSENGER CORP'], 'other-public'],
  // private, including look-alikes
  [['GEENA LLC'], 'private'],
  [['BRIDGES MARGARET'], 'private'],
  [['ATAKUM LLC'], 'private'],
  [['CITY BLOCK ACQUISITION VI'], 'private'],
  [['CITY VIEW FAIRMOUNT'], 'private'],
  [['PHILADELPHIA LAND INVESTM'], 'private'],
  [['KENSINGTON REDEVELOPMENT'], 'private'],
  [['FISHTOWN REDEVELOPMENT', 'AUTHORITY LLC'], 'private'],
  [['COLORADO REDEVELOPMENT LLC'], 'private'],
  [['COMMONWEALTH IMPROVEMENT'], 'private'],
  [['U S BANK TRUST NATIONAL ASSOCIATION TR'], 'private'],
  [['FEDERAL NATIONAL MORTGAGE'], 'private'],
  [['NEIGHBORHOOD GARDENS TRUST'], 'private'],
  [['CONRAIL'], 'private'],
  [['PHILA ELECTRIC CO'], 'private'],
  [['PHILA GAS WORKS EMPLOYEES', 'F C U'], 'private'],
  [['USA OVER THE TOP RE LLC'], 'private'],
  [['1260 HOUSING DEVELOPMENT CORPORATION'], 'private'],
  [[], 'unknown'],
  [['', '  '], 'unknown'],
];

describe('classifyOwner', () => {
  it.each(CASES)('%j → %s', (owners, type) => {
    expect(classifyOwner(owners).type).toBe(type);
  });

  it('names the agency in plain words', () => {
    expect(classifyOwner(['PHILADELPHIA LAND BANK']).label).toBe('Philadelphia Land Bank');
    expect(classifyOwner(['REDEVELOPMENT AUTHORITY O']).label).toBe('Philadelphia Redevelopment Authority');
    expect(classifyOwner(['SCHOOL DISTRICT OF PHILA']).label).toBe('School District of Philadelphia');
    expect(classifyOwner(['ATAKUM LLC']).label).toBe('ATAKUM LLC');
  });
});

describe('acquirePaths (Acquire workbook p.4)', () => {
  it('City, Land Bank, Redevelopment Authority and PHDC land: potential purchase through PHDC / the Land Bank', () => {
    for (const t of ['city', 'landbank', 'redevelopment'] as const) {
      expect(isPublic(t)).toBe(true);
      expect(acquirePaths(t).map((p) => p.id)).toEqual(['purchase-public']);
    }
    const phdc = classifyOwner(['PHILADELPHIA HOUSING', 'DEVELOPMENT CORPORATION']);
    expect(landBankHandles(phdc.type, phdc.label)).toBe(true);
    expect(acquirePaths(phdc.type, phdc.label).map((p) => p.id)).toEqual(['purchase-public']);
  });
  // Usability test 2026-10-04 (veteran S1): PHA and School District land is not in the
  // Land Bank's inventory; those owners must not get the Land Bank path.
  it('other public agencies: their own path, naming the agency, no Land Bank link', () => {
    const pha = acquirePaths('pha', 'Philadelphia Housing Authority (PHA)');
    expect(pha.map((p) => p.id)).toEqual(['other-agency']);
    expect(pha[0]!.text).toMatch(/Philadelphia Housing Authority/);
    expect(pha[0]!.text).toMatch(/not sold or leased through PHDC or the Philadelphia Land Bank/);
    expect(pha[0]!.link?.url).toBe('https://www.pha.phila.gov/');
    const sd = classifyOwner(['SCHOOL DISTRICT OF PHILA']);
    const sdPath = acquirePaths(sd.type, sd.label);
    expect(sdPath[0]!.id).toBe('other-agency');
    expect(sdPath[0]!.text).toMatch(/the School District of Philadelphia/);
    expect(sdPath[0]!.link?.url).toBe('https://www.philasd.org/');
    const septa = classifyOwner(['SEPTA']);
    expect(acquirePaths(septa.type, septa.label)[0]!.text).toMatch(/belongs to SEPTA,/);
    const us = classifyOwner(['UNITED STATES OF AMERICA']);
    expect(acquirePaths(us.type, us.label)[0]!.id).toBe('other-agency');
    expect(acquirePaths(us.type, us.label)[0]!.link).toBeUndefined();
    for (const p of [...pha, ...sdPath]) expect(p.link?.url ?? '').not.toMatch(/landbank/i);
  });
  it('private owners: donation, sale (Sheriff Sale), purchase agreement, in-kind', () => {
    expect(acquirePaths('private').map((p) => p.id)).toEqual(['donation', 'sale', 'purchase', 'in-kind']);
    expect(acquirePaths('private')[1]!.text).toMatch(/Sheriff Sale/);
  });
});

describe('ownerNames (OPA owner_1 + owner_2 as one line)', () => {
  it('keeps two people as two people', () => {
    expect(ownerNames(['HERBERT MITCHELL', 'VICTORIA'])).toBe('HERBERT MITCHELL & VICTORIA');
    expect(ownerNames(['SMITH JOHN', 'SMITH MARY'])).toBe('SMITH JOHN & SMITH MARY');
  });
  it('puts an agency name split across the two columns back together', () => {
    expect(ownerNames(['REDEVELOPMENT AUTHORITY', 'OF PHILADELPHIA'])).toBe('REDEVELOPMENT AUTHORITY OF PHILADELPHIA');
    expect(ownerNames(['PHILADELPHIA HOUSING', 'DEVELOPMENT CORPORATION'])).toBe('PHILADELPHIA HOUSING DEVELOPMENT CORPORATION');
    expect(ownerNames(['CITY OF PHILA', 'DEPT OF PUBLIC PROP'])).toBe('CITY OF PHILA DEPT OF PUBLIC PROP');
    expect(ownerNames(['UNITED STATES OF', 'AMERICA'])).toBe('UNITED STATES OF AMERICA');
  });
  it('joins a private name that carries on in owner_2', () => {
    expect(ownerNames(['FISHTOWN REDEVELOPMENT', 'AUTHORITY LLC'])).toBe('FISHTOWN REDEVELOPMENT AUTHORITY LLC');
    expect(ownerNames(['ST PAUL BAPTIST', 'CHURCH'])).toBe('ST PAUL BAPTIST CHURCH');
    expect(ownerNames(['FRIENDS OF THE', 'PARK'])).toBe('FRIENDS OF THE PARK');
  });
  it('handles one or no owner', () => {
    expect(ownerNames(['KELSEY THERESA M'])).toBe('KELSEY THERESA M');
    expect(ownerNames(['KELSEY THERESA M', '  '])).toBe('KELSEY THERESA M');
    expect(ownerNames([])).toBe('');
  });
});
