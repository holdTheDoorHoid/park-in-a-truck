import { describe, expect, it } from 'vitest';
import { distance, floodPlain, normaliseZoning, titleCase, zoningPlain } from '../plain';
import { normaliseAddress } from '../search';

describe('plain words', () => {
  it('normalises zoning codes the way the Zoning Code writes them', () => {
    expect(normaliseZoning('RSA5')).toBe('RSA-5');
    expect(normaliseZoning('RSA-5')).toBe('RSA-5');
    expect(normaliseZoning('CMX2.5')).toBe('CMX-2.5');
    expect(normaliseZoning('SPPOA')).toBe('SP-PO-A');
    expect(normaliseZoning('ICMX')).toBe('ICMX');
    expect(normaliseZoning('I2')).toBe('I-2');
    expect(normaliseZoning('')).toBeNull();
  });
  it('explains zoning', () => {
    expect(zoningPlain('RSA5')).toMatch(/^RSA-5 · Residential — single-family attached/);
    expect(zoningPlain('CMX1')).toMatch(/Neighborhood commercial mixed-use/);
    expect(zoningPlain('SPPOA')).toMatch(/Parks and open space/);
  });
  it('explains flood zones', () => {
    expect(floodPlain(null)).toBe('Not in a FEMA flood zone');
    expect(floodPlain('X')).toMatch(/minimal/);
    expect(floodPlain('AE')).toMatch(/high flood risk/);
  });
  it('title-cases street names and keeps directions upper case', () => {
    expect(titleCase('1322 N DOVER ST')).toBe('1322 N Dover St');
    expect(titleCase('GREENWAY AVE & S 60TH ST')).toBe('Greenway Ave & S 60th St');
    expect(titleCase("ST JOSEPH'S PREP")).toBe("St Joseph's Prep");
  });
  it('normalises typed addresses toward OPA style', () => {
    expect(normaliseAddress('1322 North Dover Street, Philadelphia PA 19121')).toBe('1322 N DOVER ST');
    expect(normaliseAddress('1322 n dov')).toBe('1322 N DOV');
  });
  it('formats distances', () => {
    expect(distance(0)).toBe('next door');
    expect(distance(184)).toBe('180 ft');
    expect(distance(2640)).toBe('0.5 mi');
  });
});
