// The translation checker as a test: the repo's translations must have no errors, and the
// checker must catch the mistakes it exists for.
import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { checkTranslations, compareChapters, checkOverlay, formatReport, type Issue } from '../check';
import { chapterShape } from '../mdx';
import { DATASETS } from '../datasets';

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..');

describe('npm run i18n:check', () => {
  it('finds no errors in the translations', async () => {
    const res = await checkTranslations(root);
    const errors = res.issues.filter((i) => i.level === 'error');
    expect(errors, formatReport({ issues: errors, locales: [] })).toEqual([]);
    expect(res.locales).toHaveLength(11);
  }, 60_000);
});

const EN = `---
title: Acquire
---
import Field from '../../components/workbook/Field.astro';

Intro text that is long enough to count as a paragraph.

## Find a lot

<Field id="acquire.address" label="Street address" auto="lot.address" />

## Secure your lot

<Field id="acquire.agreement" label="Type" type="select" options={['Purchase', 'Lease']} />
`;

function compare(tr: string): Issue[] {
  const issues: Issue[] = [];
  compareChapters(chapterShape(EN), chapterShape(tr), 'es', 'test.mdx', issues);
  return issues.filter((i) => i.level === 'error');
}

const GOOD = `---
title: Adquirir
---
import Field from '../../../../components/workbook/Field.astro';

Un texto de introducción lo bastante largo para contar como párrafo.

## Busque un lote {/* #find-a-lot */}

<Field id="acquire.address" label="Dirección" auto="lot.address" />

## Asegure su lote {/* #secure-your-lot */}

<Field id="acquire.agreement" label="Tipo" type="select" options={[{ value: 'Purchase', label: 'Compra' }, { value: 'Lease', label: 'Alquiler' }]} />
`;

describe('chapter comparison', () => {
  it('accepts a faithful translation (labels translated, saved values English)', () => {
    expect(compare(GOOD)).toEqual([]);
  });
  it('catches a heading without its English id', () => {
    const errs = compare(GOOD.replace(' {/* #find-a-lot */}', ''));
    expect(errs.map((e) => e.message).join('\n')).toMatch(/needs its English id marker/);
  });
  it('catches a changed field id', () => {
    expect(compare(GOOD.replace('acquire.address', 'acquire.direccion'))).toHaveLength(1);
  });
  it('catches a translated option VALUE (saved answers would stop matching)', () => {
    expect(compare(GOOD.replace("value: 'Lease'", "value: 'Alquiler'"))).toHaveLength(1);
  });
  it('catches a dropped component', () => {
    expect(compare(GOOD.replace(/<Field id="acquire.address"[^\n]*\n/, ''))).toHaveLength(1);
  });
});

describe('overlay checks', () => {
  const guides = DATASETS.find((d) => d.name === 'guides/*')!;
  const en = { title: 'Bench', cutList: [{ part: 'BB-1', notes: 'Top' }], tools: ['Saw'] };
  const run = (o: unknown) => {
    const issues: Issue[] = [];
    const r = checkOverlay(en, o, guides, 'es', 'x.json', issues);
    return { errors: issues.filter((i) => i.level === 'error').map((i) => i.message), r };
  };
  it('counts what is translated', () => {
    const { errors, r } = run({ title: 'Banca', cutList: [{ notes: 'Arriba' }] });
    expect(errors).toEqual([]);
    expect(r).toEqual({ strings: 3, translated: 2, wordsLeft: 1 });
  });
  it('rejects fields that must stay as they are, unknown keys and extra items', () => {
    expect(run({ cutList: [{ part: 'BB-9' }] }).errors[0]).toMatch(/not translated/);
    expect(run({ subtitle: 'x' }).errors[0]).toMatch(/not in the English data/);
    expect(run({ tools: ['a', 'b'] }).errors[0]).toMatch(/2 items, English has 1/);
  });
});
