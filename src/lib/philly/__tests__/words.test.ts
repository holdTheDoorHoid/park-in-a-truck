// The philly area's words: English stays exactly as it was; text saved with a lot in English is
// shown in the reader's language; saved values never depend on the language.
import { describe, expect, it, beforeAll } from 'vitest';
import { registerBundle } from '../../../i18n/registry';
import { floodPlain, floodText, feet, distance, sqft, zoningPlain } from '../plain';
import { landBankFromAttrs, landBankLine } from '../landbank';
import { acquirePaths, agencyName, agencyOf, classifyOwner, ownerTypeLabel } from '../owner';
import { lotTypeReasonText, sourceLabel, warningText } from '../saved';
import { blockLabel } from '../streets';
import { EN, matchEnglish } from '../words';
import { formatLong, monthName } from '../../../components/schedule/dates';
import { scheduleToIcsEvents, computeSchedule } from '../../../components/schedule/buildSchedule';
import { stewardshipToIcsEvents } from '../../../components/schedule/stewardship';

beforeAll(() => {
  registerBundle('es', {
    msgs: {
      philly: {
        'unit.ft': '{n} pies',
        'flood.high': 'Zona {zone}: riesgo alto',
        'warn.flood': 'No se pudieron cargar las zonas de inundación.',
        'source.atlas': 'Esta propiedad en atlas.phila.gov (en inglés)',
        'lotType.why.oneStreet': 'Da a una calle ({streets}).',
        'lotType.why.irregular': 'Forma irregular.',
        'landBank.holdAffordable': 'En espera para vivienda asequible',
        'landBank.sideYardLine': '{status} · patio lateral',
        'agency.usa': 'Gobierno de los Estados Unidos',
        'zoning.rsa': 'Residencial — casas adosadas',
        'paths.otherAgency.text': 'Este lote es de {agency}.',
        'agencyIn.septa': 'SEPTA',
      },
      schedule: { 'phase.organize.title': 'Fase 1: Organizar', 'ics.buildEvent': 'Construcción: {phase}', 'category.survive': 'Sobrevivir' },
    },
    data: {},
  });
});

describe('English is unchanged', () => {
  it('formats sizes, distances, zoning and flood zones as before', () => {
    expect(feet(13.96)).toBe('14.0 ft');
    expect(feet(1234.56, 1)).toBe('1234.6 ft');
    expect(sqft(1234.5)).toBe('1,235 sq ft');
    expect(distance(184)).toBe('180 ft');
    expect(distance(2640)).toBe('0.5 mi');
    expect(zoningPlain('RSA5')).toBe('RSA-5 · Residential — single-family attached houses (rowhouses and twins)');
    expect(floodPlain('X', '0.2 PCT ANNUAL CHANCE FLOOD HAZARD')).toMatch(/^Zone X \(shaded\) — moderate/);
    expect(blockLabel(2200)).toBe('2200 block');
    expect(blockLabel(0)).toBe('First block (under 100)');
  });
  it('words the ways forward for another public agency as before', () => {
    const pha = classifyOwner(['PHILADELPHIA HOUSING AUTH']);
    const [path] = acquirePaths(pha.type, pha.label);
    expect(path!.text).toMatch(/^This lot belongs to the Philadelphia Housing Authority \(PHA\), a public agency separate from the City\./);
    expect(path!.link?.label).toBe('Philadelphia Housing Authority website');
    expect(acquirePaths('other-public', null)[0]!.text).toMatch(/belongs to this public agency,/);
    expect(acquirePaths('other-public', 'Port / bridge authority')[0]!.text).toMatch(/belongs to a port or bridge authority,/);
  });
  it('dates in the schedule read as before', () => {
    expect(formatLong('2027-03-13', 'en')).toBe('Sat, March 13, 2027');
    expect(monthName(2, 'en')).toBe('March');
    const slots = computeSchedule({ v: 1, startDate: '2027-03-10', skipDates: [], overrides: {} });
    expect(scheduleToIcsEvents(slots, undefined, 'en')[0]).toMatchObject({ summary: 'Park build: Phase 1: Organize', description: 'Assemble your team and set the schedule' });
    expect(stewardshipToIcsEvents(2026, 'en')[0]!.summary).toMatch(/^Survive: /);
  });
});

describe('saved values stay English, whatever the page language', () => {
  it('saves Land Bank labels, owner labels and flood zones in English', () => {
    expect(landBankFromAttrs({ opabrt: '1', agency: 'PUB', status_1: 'Owned - On Hold for AHD', sideyardeligible: 'Yes' }).label).toBe('On hold for affordable housing');
    expect(classifyOwner(['UNITED STATES OF AMERICA']).label).toBe('United States government');
    expect(floodPlain('AE', null, 'en')).toBe(EN('flood.high', { zone: 'AE' }));
  });
});

describe('shown in the reader’s language', () => {
  it('translates saved English text, keeping the values', () => {
    const saved = floodPlain('AE', null, 'en');
    expect(floodText(saved, 'es')).toBe('Zona AE: riesgo alto');
    expect(floodText(saved, 'en')).toBe(saved);
    expect(floodText('Something the City wrote', 'es')).toBe('Something the City wrote');
    expect(warningText(EN('warn.flood'), 'es')).toBe('No se pudieron cargar las zonas de inundación.');
    expect(sourceLabel(EN('source.atlas'), 'es')).toBe('Esta propiedad en atlas.phila.gov (en inglés)');
    expect(zoningPlain('RSA5', 'es')).toBe('RSA-5 · Residencial — casas adosadas');
    expect(feet(13.96, 1, 'es')).toBe('14.0 pies');
    expect(feet(13.96, 1, 'fr')).toBe('14,0 ft');
  });
  it('works the lot-type reason out again with local street lists', () => {
    const g = {
      lotTypeReason: `${EN('lotType.why.oneStreet', { streets: 'N Dover St' })} ${EN('lotType.why.irregular')}`,
      streets: [{ side: 'x0' as const, name: 'N DOVER ST', distanceFt: 20 }],
      widthFt: 14,
      lengthFt: 50,
    };
    expect(lotTypeReasonText(g, 'en')).toBe(g.lotTypeReason);
    expect(lotTypeReasonText(g, 'es')).toBe('Da a una calle (N Dover St). Forma irregular.');
  });
  it('words Land Bank statuses and agencies from what was saved', () => {
    const lb = landBankFromAttrs({ opabrt: '1', agency: 'PUB', status_1: 'Owned - On Hold for AHD', sideyardeligible: 'Yes' });
    expect(landBankLine(lb, 'en')).toBe('On hold for affordable housing · side-yard eligible');
    expect(landBankLine(lb, 'es')).toBe('En espera para vivienda asequible · patio lateral');
    expect(agencyOf('United States government')).toBe('usa');
    expect(agencyName('United States government', 'es')).toBe('Gobierno de los Estados Unidos');
    expect(agencyName('ATAKUM LLC', 'es')).toBe('ATAKUM LLC');
    expect(ownerTypeLabel('city', 'en')).toBe('City of Philadelphia (public)');
    const septa = classifyOwner(['SEPTA']);
    expect(acquirePaths(septa.type, septa.label, 'es')[0]!.text).toBe('Este lote es de SEPTA.');
  });
  it('words the schedule and its calendar file in the reader’s language', () => {
    const slots = computeSchedule({ v: 1, startDate: '2027-03-10', skipDates: [], overrides: {} });
    expect(scheduleToIcsEvents(slots, undefined, 'es')[0]!.summary).toBe('Construcción: Fase 1: Organizar');
    expect(stewardshipToIcsEvents(2026, 'es')[0]!.summary).toMatch(/^Sobrevivir: /);
    expect(monthName(2, 'es')).toBe('Marzo');
  });
  it('matches English templates exactly, not partly', () => {
    expect(matchEnglish('Zone AE — high flood risk with waves', ['flood.waves'])).toEqual({ key: 'flood.waves', vars: { zone: 'AE' } });
    expect(matchEnglish('Zone AE — high flood risk with waves!', ['flood.waves'])).toBeNull();
  });
});
