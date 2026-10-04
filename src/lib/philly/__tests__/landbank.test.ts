// The Land Bank's own status for public land (LAMAAssets) — usability test 2026-10-04, veteran D1.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { landBankFromAttrs, landBankLine, landBankPlain } from '../landbank';
import { lookupLot } from '../lookup';
import { fetchVacantLots, mapClassOf } from '../vacant';
import type { LandBankStatus, LotExtra } from '../types';
import { useFixtures } from './fixtures';

describe('landBankPlain — every status in the layer on 2026-10-04', () => {
  const cases: [string, string, string][] = [
    ['Owned - Available', 'Available', 'available'],
    ['Owned - Available (no construction permitted)', 'Available — no construction permitted', 'available'],
    ['Owned - Available (not for SY)', 'Available — but not as a side yard', 'available'],
    ['Owned - On Hold for AHD', 'On hold for affordable housing', 'hold'],
    ['Owned - On Hold for HOME SD', 'On hold for HOME SD', 'hold'],
    ['Owned - On Hold', 'On hold', 'hold'],
    ['Owned - Processing Applicant, Not Available', 'Another applicant is in process — not available', 'unavailable'],
    ['Owned - Not Available', 'Not available', 'unavailable'],
    ['Owned - Not Available (GSI Project)', 'Not available — green stormwater project', 'unavailable'],
    ['Owned - Managed and Not Available', 'Managed by the agency — not available', 'unavailable'],
    ['Owned - Sale Pending', 'Sale pending', 'hold'],
    ['Owned - RFP Released', 'Offered through a request for proposals (RFP)', 'hold'],
    ['Owned - To Be Featured Soon', 'To be listed soon', 'hold'],
    ['Owned - Competitive Bid Posted', 'Open for competitive bids', 'hold'],
    ['Owned - Held for City Council Member', 'Held for the district Councilmember', 'hold'],
    ['Unknown - Research Pending', 'Status not known yet (Land Bank research pending)', 'unknown'],
  ];
  it.each(cases)('%s → %s', (raw, label, tone) => {
    expect(landBankPlain(raw)).toEqual({ label, tone });
  });
  it('a status it has never seen still reads sensibly', () => {
    expect(landBankPlain('Owned - Something New')).toEqual({ label: 'Something New', tone: 'hold' });
    expect(landBankPlain(null).tone).toBe('unknown');
  });
  it('side-yard eligibility', () => {
    const s = landBankFromAttrs({ opabrt: '161064101', agency: 'PRA', status_1: 'Owned - Available', sideyardeligible: 'Yes' });
    expect(s).toEqual({ agency: 'PRA', status: 'Owned - Available', label: 'Available', tone: 'available', sideYard: true });
    expect(landBankLine(s)).toBe('Available · side-yard eligible');
  });
});

describe('Land Bank status in lookups and on the map (fixtures)', () => {
  let fx: ReturnType<typeof useFixtures>;
  beforeAll(() => {
    fx = useFixtures();
  });
  afterAll(() => fx.restore());

  it('a City lot on hold for affordable housing', async () => {
    const lot = await lookupLot('1322 N Dover St');
    const x = lot.extra as LotExtra;
    expect(x.landBank).toMatchObject({ agency: 'PUB', label: 'On hold for affordable housing', tone: 'hold', sideYard: true });
    expect(x.warnings).toBeUndefined();
    expect(lot.sources.map((s) => s.url)).toContain('https://phillylandbank.org/view-properties-map/');
  });
  it('a PHA lot is not in the Land Bank inventory, and gets no Land Bank link', async () => {
    const lot = await lookupLot('1300 N Dover St');
    expect(lot.ownerType).toBe('pha');
    expect((lot.extra as LotExtra).landBank).toBeNull();
    expect(lot.sources.map((s) => s.url).join(' ')).not.toMatch(/landbank/i);
  });
  it('a private lot: null (not in the inventory)', async () => {
    const lot = await lookupLot('2031-35 S 60th St');
    expect((lot.extra as LotExtra).landBank).toBeNull();
  });
  it('colours map lots by the Land Bank status', async () => {
    const v = await fetchVacantLots([-75.184, 39.9755, -75.181, 39.978]);
    expect(v.landBankLoaded).toBe(true);
    const classes = new Set(v.features.map((f) => f.properties.mapClass));
    expect(classes.has('private')).toBe(true);
    expect(classes.has('agency')).toBe(true);
    expect(classes.has('lb-other')).toBe(true);
    for (const f of v.features) {
      if (f.properties.landBank) expect(f.properties.mapClass).toBe(f.properties.landBank.tone === 'available' ? 'lb-available' : 'lb-other');
      if (f.properties.ownerType === 'pha' && !f.properties.landBank) expect(f.properties.mapClass).toBe('agency');
    }
  });
  it('mapClassOf without Land Bank data falls back to plain public / private', () => {
    expect(mapClassOf({ opa: '1', ownerType: 'city', isPublic: true }, 'City of Philadelphia')).toBe('public');
    expect(mapClassOf({ opa: '1', ownerType: 'private', isPublic: false }, 'X')).toBe('private');
    const lb = new Map<string, LandBankStatus>([['1', { agency: 'PUB', status: 'Owned - Available', label: 'Available', tone: 'available', sideYard: false }]]);
    expect(mapClassOf({ opa: '1', ownerType: 'city', isPublic: true }, 'City of Philadelphia', lb)).toBe('lb-available');
    expect(mapClassOf({ opa: '2', ownerType: 'pha', isPublic: true }, 'Philadelphia Housing Authority (PHA)', lb)).toBe('agency');
  });
});
