// The estimate in another language: every word comes from the cost catalog, and only the words
// change — never a number, a total, a saved id or the order of anything. A pretend translation
// (every cost text wrapped in ⟦…⟧) is registered for French for the length of this file.

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import cost from '../../../i18n/messages/en/cost';
import { isPlural } from '../../../i18n/format';
import { registerBundle } from '../../../i18n/registry';
import type { Message, Messages } from '../../../i18n/define';
import { ALL_FIXES } from '../corrections';
import { estimateCsv } from '../csv';
import { fieldGroups, FIELD_GROUPS } from '../fields';
import { inputsFromTally } from '../fromTally';
import { guideLines, GUIDES, type GuideSlug } from '../guides';
import { defaultInputs, estimate, INPUT_KEYS, type CostInputs } from '../model';
import { costT, EN, unitWord } from '../text';

const wrap = (m: Message): Message =>
  isPlural(m) ? (Object.fromEntries(Object.entries(m).map(([k, v]) => [k, `⟦${v}⟧`])) as unknown as Message) : `⟦${m}⟧`;
const pseudo: Messages = Object.fromEntries(Object.entries(cost.messages).map(([k, v]) => [k, wrap(v as Message)]));

beforeAll(() => registerBundle('fr', { msgs: { cost: pseudo }, data: {} }));
afterAll(() => {
  delete globalThis.__PIAT_I18N__?.fr?.msgs.cost;
});

const LUMBER = /^[\d"'x.]+$/;
const translated = (s: string | undefined) => s === undefined || s === '' || LUMBER.test(s) || s.startsWith('⟦') || /⟦/.test(s);

const everything: Partial<CostInputs> = Object.fromEntries(INPUT_KEYS.map((k, j) => [k, (j % 5) + 1]));
const sets: Record<string, Partial<CostInputs>> = {
  example: defaultInputs,
  everything,
  stage7: { ...defaultInputs, stageSquares: 7, porchSwings: 2, cafeTableSets: 1, raisedBedWoodEdgeFt: 8, outerEdgeFt: 40, outerEdgeOnHardscapeFt: 10, outerEdgeOnSoftscapeFt: 5 },
};

describe('the estimate in another language', () => {
  const fr = costT('fr');

  it('uses the registered translation', () => {
    expect(fr('line.stakes')).toBe('⟦Stakes⟧');
    expect(EN('line.stakes')).toBe('Stakes');
  });

  for (const [name, inputs] of Object.entries(sets))
    for (const mode of ['corrected', 'sheet'] as const) {
      it(`${name} (${mode}): same numbers, words translated`, () => {
        const en = estimate(inputs, { mode });
        const tr = estimate(inputs, { mode, t: fr });
        expect(tr.total).toBe(en.total);
        expect(tr.subtotals).toEqual(en.subtotals);
        expect(tr.summary).toEqual(en.summary);
        expect(tr.lines.map((l) => [l.category, l.qty, l.unit, l.unitPrice, l.total, l.inTotal, l.material, l.priceId])).toEqual(
          en.lines.map((l) => [l.category, l.qty, l.unit, l.unitPrice, l.total, l.inTotal, l.material, l.priceId]),
        );
        for (const l of tr.lines) {
          expect(translated(l.item), l.item).toBe(true);
          expect(translated(l.group), l.group).toBe(true);
          expect(translated(l.notes), l.notes).toBe(true);
        }
        expect(tr.warnings.length).toBe(en.warnings.length);
        for (const w of tr.warnings) expect(w.startsWith('⟦'), w).toBe(true);
        expect(tr.priceNeeded.map((p) => [p.id, p.qty])).toEqual(en.priceNeeded.map((p) => [p.id, p.qty]));

        // the order list: same rows in the same order, translated sections and words
        const ol = tr.orderList;
        expect(ol.total).toBe(en.orderList.total);
        // (a row's key holds the item's name when it has no material id, so it differs by language)
        const shape = (r: (typeof ol.rows)[number]) => [r.row, r.key.split('@')[1], r.qty, r.unit, r.unitPrice, r.total, r.phase, r.flags.length, r.usedFor?.length];
        expect(ol.rows.map(shape)).toEqual(en.orderList.rows.map(shape));
        expect(ol.sections.length).toBe(en.orderList.sections.length);
        for (const s of ol.sections) expect(s.startsWith('⟦'), s).toBe(true);
        for (const r of ol.rows) {
          expect(ol.sections).toContain(r.section);
          expect(translated(r.item), r.item).toBe(true);
          for (const f of r.flags) expect(f.startsWith('⟦'), f).toBe(true);
          if (r.leadTime) expect(r.leadTime.startsWith('⟦'), r.leadTime).toBe(true);
        }
        for (const k of Object.keys(ol.tips)) expect(ol.sections).toContain(k);
        expect(Object.keys(ol.tips).length).toBe(Object.keys(en.orderList.tips).length);
        for (const x of ol.tools) expect([x.section, x.item, x.note, x.linkFlag, x.siteNote?.text].every(translated)).toBe(true);

        if (mode === 'corrected') {
          expect(tr.corrections!.fixes.map((f) => [f.id, f.effect])).toEqual(en.corrections!.fixes.map((f) => [f.id, f.effect]));
          for (const f of tr.corrections!.fixes) expect(f.label.startsWith('⟦') && f.detail.startsWith('⟦')).toBe(true);
        }
      });
    }

  it('the CSV: translated words, the same numbers', () => {
    const date = new Date('2026-10-04T12:00:00Z');
    const en = estimateCsv(estimate(defaultInputs), 'Park', date).split('\r\n');
    const tr = estimateCsv(estimate(defaultInputs, { t: fr }), 'Park', date, fr).split('\r\n');
    expect(tr.length).toBe(en.length);
    expect(tr[4]).toContain('⟦Category⟧');
    const numbers = (rows: string[]) => rows.map((r) => r.match(/(?<=,|^)-?\d+(\.\d+)?(?=,|$)/g));
    expect(numbers(tr)).toEqual(numbers(en));
    // units: the spreadsheet's own in English, translated otherwise
    expect(en.some((r) => r.includes(',TONS,'))).toBe(true);
    expect(tr.some((r) => r.includes(',TONS,'))).toBe(false);
    expect(unitWord(fr, 'TONS', 2)).toBe('⟦tons⟧');
  });

  it('questions and notes from the design', () => {
    const groups = fieldGroups(fr);
    expect(groups.map((g) => g.fields.map((f) => f.key))).toEqual(FIELD_GROUPS.map((g) => g.fields.map((f) => f.key)));
    for (const g of groups) for (const s of [g.title, g.intro, ...g.fields.flatMap((f) => [f.label, f.hint, f.unpriced])]) expect(translated(s), s).toBe(true);
    const ft = inputsFromTally(
      {
        lengthFt: 40,
        widthFt: 20,
        plantingSquares: { sun: 2, shade: 0 },
        naturePlaySquares: 0,
        shrubs: { sun: 0, shade: 0 },
        smallTrees: 0,
        largeTrees: 0,
        gabionWallFt: 12,
        raisedBedEdgeFt: 8,
        items: { 'keyhole-garden': 2, 'shade-canopy': 1, 'cold-frame': 1, stage: 2, shed: 1, 'communal-table': 1 },
      } as never,
      null,
      fr,
    );
    expect(Object.values(ft.notes).length).toBeGreaterThan(5);
    for (const n of Object.values(ft.notes)) expect(n!.startsWith('⟦'), n).toBe(true);
  });

  it('build-guide lines', () => {
    for (const slug of Object.keys(GUIDES) as GuideSlug[]) {
      const en = guideLines(slug, 3);
      const tr = guideLines(slug, 3, fr);
      expect(tr.map((l) => [l.qty, l.material, l.priceId])).toEqual(en.map((l) => [l.qty, l.material, l.priceId]));
      for (const l of tr) expect(translated(l.item) && translated(l.notes), `${slug}: ${l.item} / ${l.notes}`).toBe(true);
    }
  });

  it('every fix has its words', () => {
    for (const id of ALL_FIXES) expect(cost.messages[`fix.${id}.label`] && cost.messages[`fix.${id}.detail`]).toBeTruthy();
  });
});
