// The planner's words follow the page's language (i18n area "planner"); English stays as it was.
import { describe, expect, it } from 'vitest';
import planner from '../../../i18n/messages/en/planner.ts';
import { getT } from '../../../i18n/t.ts';
import { registerBundle } from '../../../i18n/registry.ts';
import { clock, isolate, listAnd, mmdd, monthInitial, monthName, oneDecimal, periodLabel } from '../words';
import { itemWhere } from '../where';
import { describeSlope } from '../terrain/slope';
import { midBlockWords } from '../neighbours';

const en = getT('en', planner);

describe('planner words', () => {
  it('writes English exactly as before', () => {
    // the language's own clock, the same as the shade calendar's (was "3:30 pm" before 2026-10-04)
    expect(clock(15 * 60 + 30)).toBe('3:30 PM');
    expect(clock(0)).toBe('12:00 AM');
    expect(clock(12 * 60 + 5)).toBe('12:05 PM');
    expect(clock(15 * 60)).toBe('3:00 PM');
    expect(monthName(9)).toBe('September');
    expect(mmdd('09-22')).toBe('Sep 22');
    expect(monthInitial(1)).toBe('J');
    expect(oneDecimal(0)).toBe('0.0');
    expect(oneDecimal(9.66)).toBe('9.7');
    expect(listAnd(['April', 'May', 'September'])).toBe('April, May and September');
    expect(listAnd(['June'])).toBe('June');
    expect(periodLabel({ kind: 'year' })).toBe('the whole year');
  });

  it('uses another language where it has text, English where it has none', () => {
    registerBundle('es', {
      msgs: { planner: { 'where.atEntrance': 'en la entrada', 'where.middle': 'en el medio', 'lot.midBlockBoth': 'A mitad de cuadra (edificios a ambos lados)' } },
      data: {},
    });
    const es = getT('es', planner);
    expect(itemWhere({ x: 1, y: 8, w: 2, h: 2, rotationDeg: 0 }, 16, true, es)).toBe('en la entrada, en el medio');
    expect(midBlockWords({ left: true, right: true }, es)).toBe('A mitad de cuadra (edificios a ambos lados)');
    // untranslated keys fall back to English; dates and numbers are written the local way
    expect(clock(15 * 60 + 30, es)).toBe('3:30 p.m.');
    expect(clock(15 * 60 + 30, getT('fr', planner))).toBe('15:30');
    expect(monthName(6, es)).toBe('junio');
    expect(oneDecimal(2.34, getT('fr', planner))).toBe('2,3');
  });

  it('keeps left-to-right names in one piece on right-to-left pages only', () => {
    expect(isolate('1322 N Dover St', en)).toBe('1322 N Dover St');
    expect(isolate('1322 N Dover St', getT('ar', planner))).toBe('\u20681322 N Dover St\u2069');
  });

  it('the slope summary can be written in English whatever the page language', () => {
    const flat = { flat: true, fallFt: 0.2 } as Parameters<typeof describeSlope>[0];
    expect(describeSlope(flat, {} as never, {}, en).headline).toBe('The lot is practically flat: its ground varies by less than 4 inches.');
  });
});
