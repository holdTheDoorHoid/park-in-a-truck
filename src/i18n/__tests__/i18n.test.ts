import { describe, expect, it, beforeAll } from 'vitest';
import { interpolate, formatNumber, formatMoney, formatDate, choosePlural, placeholdersOf, tagsOf } from '../format';
import { splitPath, matchBrowserLanguages, LOCALES } from '../locales';
import { localizeRest, isAssetPath } from '../url';
import { overlay, localizeKeyed, localizedSteps, localizeGuide } from '../data';
import { getT } from '../t';
import { registerBundle } from '../registry';
import { defineMessages } from '../define';
import { getGuide } from '../../data/guides';
import { formatAuto } from '../../lib/autofill';
import { takeIdMarker, rehypeSubsteps } from '../../lib/rehype-substeps.mjs';
import { rehypeBase } from '../../lib/rehype-base.mjs';

const demo = defineMessages('demo-test', {
  hello: 'Hello, {name}!',
  rows: { one: '{count} row', other: '{count} rows' },
  link: 'Use <a href="{href}">My park</a>',
  only: 'English only',
});

beforeAll(() => {
  registerBundle('es', { msgs: { 'demo-test': { hello: '¡Hola, {name}!', rows: { one: '{count} fila', other: '{count} filas' }, link: 'Use <a href="{href}">Mi parque</a>' } }, data: {} });
});

describe('messages', () => {
  it('fills placeholders and falls back to English for missing keys', () => {
    const t = getT('es', demo);
    expect(t('hello', { name: 'Ana' })).toBe('¡Hola, Ana!');
    expect(t('only')).toBe('English only');
    expect(t.has('only')).toBe(false);
    expect(t.has('hello')).toBe(true);
    expect(getT('en', demo)('hello', { name: 'Ana' })).toBe('Hello, Ana!');
  });
  it('picks plural forms by language', () => {
    expect(getT('es', demo)('rows', { count: 1 })).toBe('1 fila');
    expect(getT('es', demo)('rows', { count: 3 })).toBe('3 filas');
    expect(getT('en', demo)('rows', { count: 1200 })).toBe('1,200 rows');
    // Arabic has six categories; a message only giving `other` still works
    expect(choosePlural('ar', { other: 'x', two: 'two', few: 'few' }, 2)).toBe('two');
    expect(choosePlural('ar', { other: 'x', two: 'two', few: 'few' }, 5)).toBe('few');
    expect(choosePlural('ru', { one: 'один', few: 'few', many: 'many', other: 'o' }, 21)).toBe('один');
    expect(choosePlural('en', { '=0': 'none', one: 'one', other: 'many' }, 0)).toBe('none');
  });
  it('escapes values but keeps the message HTML in html mode', () => {
    const t = getT('es', demo);
    expect(t.html('link', { href: '/es/my-park/"x' })).toBe('Use <a href="/es/my-park/&quot;x">Mi parque</a>');
    expect(interpolate('en', 'A {x}', { x: '<b>' }, true)).toBe('A &lt;b&gt;');
  });
  it('lists placeholders and tags for the checker', () => {
    expect(placeholdersOf({ one: '{count} a {b}', other: '{count}' })).toEqual(['b', 'count']);
    expect(tagsOf('Use <a href="x">this</a> and <strong>that</strong>')).toEqual(['a', 'strong']);
  });
});

describe('numbers and dates by language, US units', () => {
  it('writes numbers the local way', () => {
    expect(formatNumber('en', 1234.5)).toBe('1,234.5');
    expect(formatNumber('fr', 1234.5).replace(/\s/g, ' ')).toBe('1 234,5');
    expect(formatNumber('ar', 1234)).toBe('1,234'); // Western digits (ar-u-nu-latn), as used in Philadelphia
    expect(formatMoney('es', 1234)).toBe('$1,234');
  });
  it('formats dates, including Haitian Creole which Intl lacks', () => {
    expect(formatDate('en', '2026-10-04', 'long')).toBe('October 4, 2026');
    expect(formatDate('es', '2026-10-04', 'long')).toBe('4 de octubre de 2026');
    expect(formatDate('ht', '2026-10-04', 'full')).toBe('dimanch 4 oktòb 2026');
  });
  it('autofill words follow the language; English stays the same', () => {
    expect(formatAuto('B', 'size')).toBe('Size B');
    expect(formatAuto(1234.4, 'sqft')).toBe('1,234 sq ft');
    expect(formatAuto('mostly-sun', 'sunClass', 'en')).toBe('Mostly sun');
    expect(formatAuto(['A', 'B'], 'join', 'es')).toBe('A & B');
  });
});

describe('locales and links', () => {
  it('splits a path into language and page, with or without a base', () => {
    expect(splitPath('/es/steps/acquire/', '/')).toEqual({ locale: 'es', rest: 'steps/acquire/' });
    expect(splitPath('/park-in-a-truck/zh/lot/', '/park-in-a-truck/')).toEqual({ locale: 'zh', rest: 'lot/' });
    expect(splitPath('/steps/', '/')).toEqual({ locale: 'en', rest: 'steps/' });
    expect(splitPath('/en/steps/', '/')).toEqual({ locale: 'en', rest: 'en/steps/' });
  });
  it('keeps pages in the language and files shared', () => {
    expect(localizeRest('steps/acquire/', 'es')).toBe('es/steps/acquire/');
    expect(localizeRest('resources/#legal', 'vi')).toBe('vi/resources/#legal');
    expect(localizeRest('', 'ar')).toBe('ar/');
    expect(localizeRest('downloads/workbooks/01-acquire.pdf', 'es')).toBe('downloads/workbooks/01-acquire.pdf');
    expect(localizeRest('img/a.webp', 'es')).toBe('img/a.webp');
    expect(localizeRest('steps/', 'en')).toBe('steps/');
    expect(isAssetPath('dev/model-check/?slug=a.b')).toBe(false);
  });
  it('matches browser languages to ours; English first means no offer', () => {
    expect(matchBrowserLanguages(['es-MX', 'en-US'])).toBe('es');
    expect(matchBrowserLanguages(['en-US', 'es'])).toBe('en');
    expect(matchBrowserLanguages(['zh-CN'])).toBe('zh');
    expect(matchBrowserLanguages(['fil-PH'])).toBe('tl');
    expect(matchBrowserLanguages(['de-DE'])).toBe(null);
  });
  it('has the eleven languages the owner chose, Arabic right-to-left', () => {
    expect(LOCALES.map((l) => l.code)).toEqual(['en', 'es', 'zh', 'vi', 'ru', 'ar', 'ht', 'fr', 'pt', 'sw', 'ko', 'tl']);
    expect(LOCALES.filter((l) => l.dir === 'rtl').map((l) => l.code)).toEqual(['ar']);
  });
});

describe('data overlays', () => {
  it('replaces only strings that exist in English; numbers and extra keys are ignored', () => {
    const en = { title: 'Bench', qty: 4, steps: [{ n: 1, text: 'Cut' }, { n: 2, text: 'Join' }], tools: ['saw', 'drill'] };
    const o = overlay(en, { title: 'Banca', qty: 9, extra: 'x', steps: [null, { text: 'Unir', n: 7 }], tools: ['sierra'] });
    expect(o).toEqual({ title: 'Banca', qty: 4, steps: [{ n: 1, text: 'Cut' }, { n: 2, text: 'Unir' }], tools: ['sierra', 'drill'] });
    expect(overlay('x', '  ')).toBe('x');
  });
  it('keys lists by id so reordering English never mismatches', () => {
    registerBundle('es', { msgs: {}, data: { 'plants-test': { b: { common: 'Bé' } } } });
    expect(localizeKeyed([{ id: 'a', common: 'A' }, { id: 'b', common: 'B' }], 'plants-test', 'id', 'es')).toEqual([
      { id: 'a', common: 'A' },
      { id: 'b', common: 'Bé' },
    ]);
  });
  it('localizes step titles and guides without touching numbers', () => {
    registerBundle('es', { msgs: {}, data: { steps: { acquire: { title: 'Adquirir' } }, 'guides/bench-back': { title: 'Banca con respaldo' } } });
    expect(localizedSteps('es').find((s) => s.slug === 'acquire')!.title).toBe('Adquirir');
    expect(localizedSteps('en').find((s) => s.slug === 'acquire')!.title).toBe('Acquire');
    const g = localizeGuide(getGuide('bench-back')!, 'es');
    expect(g.title).toBe('Banca con respaldo');
    expect(g.translated).toBe(true);
    expect(g.cutList).toEqual(getGuide('bench-back')!.cutList);
    expect(localizeGuide(getGuide('stool')!, 'es').translated).toBe(false);
  });
});

describe('sub-step ids stay English in every language', () => {
  const heading = (kids: unknown[]) => ({ type: 'element', tagName: 'h2', properties: {}, children: kids });
  it('reads and removes the {/* #id */} marker', () => {
    const h = heading([{ type: 'text', value: 'Busque un lote ' }, { type: 'mdxTextExpression', value: '/* #find-a-lot */' }]);
    expect(takeIdMarker(h)).toBe('find-a-lot');
    expect(h.children).toEqual([{ type: 'text', value: 'Busque un lote' }]);
    expect(takeIdMarker(heading([{ type: 'mdxTextExpression', value: '/* site-added: x */' }]))).toBe(null);
  });
  it('uses the marker in translated chapters, the heading text in English ones', () => {
    const run = (path: string, kids: unknown[]) => {
      const tree = { type: 'root', children: [heading(kids), { type: 'element', tagName: 'p', properties: {}, children: [] }] };
      rehypeSubsteps()(tree, { path });
      return (tree.children[0] as unknown as { properties: { dataSubstep: string } }).properties.dataSubstep;
    };
    expect(run('/x/src/content/i18n/es/steps/acquire.mdx', [{ type: 'text', value: 'Busque un lote ' }, { type: 'mdxTextExpression', value: '/* #find-a-lot */' }])).toBe('acquire/find-a-lot');
    expect(run('/x/src/content/steps/acquire.mdx', [{ type: 'text', value: 'Find a lot' }])).toBe('acquire/find-a-lot');
  });
  it('keeps root-relative page links of translated content in its language', () => {
    const tree = {
      type: 'root',
      children: [
        { type: 'element', tagName: 'a', properties: { href: '/steps/dream/' }, children: [] },
        { type: 'element', tagName: 'img', properties: { src: '/img/x.webp' }, children: [] },
      ],
    };
    rehypeBase({ base: '/' })(tree, { path: '/x/src/content/i18n/es/steps/start.mdx' });
    expect((tree.children[0]!.properties as { href: string }).href).toBe('/es/steps/dream/');
    expect((tree.children[1]!.properties as { src: string }).src).toBe('/img/x.webp');
  });
});
