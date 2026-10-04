// Right-to-left isolation, money, lists and clocks by language (docs/i18n/open-issues.md, polish pass).
import { describe, expect, it, beforeAll } from 'vitest';
import { formatClock, formatList, formatMoney, interpolate, isolate, isolateAddresses, joinList, stripIsolates } from '../format';
import { LOCALES } from '../locales';
import { getT } from '../t';
import { registerBundle } from '../registry';
import { defineMessages } from '../define';

const F = '\u2068';
const L = '\u2066';
const P = '\u2069';

const demo = defineMessages('rtl-test', {
  size: 'Size: {size}',
  link: 'Found <strong>{address}</strong> — <a href="{href}">details</a>',
  rows: { one: '{count} row', other: '{count} rows' },
});

beforeAll(() => {
  registerBundle('ar', { msgs: { 'rtl-test': { size: 'المقاس: {size}', link: 'وجدنا <strong>{address}</strong> — <a href="{href}">التفاصيل</a>' } }, data: {} });
});

describe('right-to-left: inserted values keep their own order', () => {
  it('isolates every inserted value on Arabic pages, never in left-to-right languages', () => {
    expect(getT('ar', demo)('size', { size: `1'-6.5"` })).toBe(`المقاس: ${F}1'-6.5"${P}`);
    expect(getT('en', demo)('size', { size: `1'-6.5"` })).toBe(`Size: 1'-6.5"`);
    expect(getT('es', demo)('size', { size: `1'-6.5"` })).toBe(`Size: 1'-6.5"`);
    // numbers too (written the local way first)
    expect(getT('ar', demo)('rows', { count: 1200 })).toBe(`${F}1,200${P} rows`);
  });
  it('never isolates a value inside a tag (a URL must stay a URL)', () => {
    expect(getT('ar', demo).html('link', { address: '2233 N Uber St', href: '/ar/lot/' })).toBe(
      `وجدنا <strong>${F}2233 N Uber St${P}</strong> — <a href="/ar/lot/">التفاصيل</a>`,
    );
    expect(getT('en', demo).html('link', { address: 'A & B', href: '/lot/' })).toBe('Found <strong>A &amp; B</strong> — <a href="/lot/">details</a>');
  });
  it('keeps addresses written into a right-to-left message in one piece', () => {
    expect(interpolate('ar', 'مثلًا 2233 N Uber St أو N Uber St أو 22nd & Diamond')).toBe(`مثلًا ${L}2233 N Uber St${P} أو N Uber St أو ${L}22nd & Diamond${P}`);
    expect(isolateAddresses('ar', '، 4862 Parkside Ave, Philadelphia')).toBe(`، ${L}4862 Parkside Ave, Philadelphia${P}`);
    // not sizes, ranges, lumber or URLs
    for (const s of ['2.5 بوصة', '1–4 أشهر', 'خشب 2x4', '[فيديو](https://www.youtube.com/watch?v=-5gk2yVAQtM)', 'atlas.phila.gov/2233 N']) expect(isolateAddresses('ar', s)).toBe(s);
    expect(isolateAddresses('en', 'e.g. 2233 N Uber St')).toBe('e.g. 2233 N Uber St');
  });
  it('t.isolate for values that are not placeholders; stripIsolates for files', () => {
    expect(getT('ar', demo).isolate('@parkinatruck')).toBe(`${F}@parkinatruck${P}`);
    expect(getT('en', demo).isolate('@parkinatruck')).toBe('@parkinatruck');
    expect(isolate('ar', '')).toBe('');
    expect(stripIsolates(`${F}a${P} ${L}b${P}`)).toBe('a b');
  });
});

describe('money', () => {
  it('writes "$" in every language (Arabic\'s own pattern says "US$", which reads "$US" right to left)', () => {
    for (const l of LOCALES) {
      const s = stripIsolates(formatMoney(l.code, 6884.46, { cents: true }));
      expect(s, l.code).toContain('$');
      expect(s, l.code).not.toContain('US');
    }
    expect(formatMoney('en', 6884.46, { cents: true })).toBe('$6,884.46');
    expect(formatMoney('ar', 6884.46, { cents: true })).toBe(`${F}\u200f6,884.46\u00a0$${P}`);
  });
});

describe('lists', () => {
  it('every language joins "and"-lists in its own words, Haitian Creole included', () => {
    const and: Record<string, string> = {
      en: 'a, b, and c',
      es: 'a, b y c',
      zh: 'a、b和c',
      vi: 'a, b và c',
      ru: 'a, b и c',
      ht: 'a, b ak c',
      fr: 'a, b et c',
      pt: 'a, b e c',
      sw: 'a, b na c',
      ko: 'a, b 및 c',
      tl: 'a, b, at c',
    };
    for (const [code, want] of Object.entries(and)) expect(formatList(code, ['a', 'b', 'c']), code).toBe(want);
    expect(stripIsolates(formatList('ar', ['a', 'b', 'c']))).toBe('a وb وc');
    expect(formatList('ht', ['a', 'b'], 'disjunction')).toBe('a oswa b');
    expect(formatList('ht', ['a'])).toBe('a');
    expect(formatList('ht', [])).toBe('');
  });
  it('plain lists keep English exactly as before and use each language\'s comma', () => {
    expect(joinList('en', ['Content', 'Critical thinking', 'Confidence'])).toBe('Content, Critical thinking, Confidence');
    expect(joinList('zh', ['甲', '乙', '丙'])).toBe('甲、乙、丙');
    expect(stripIsolates(joinList('ar', ['أ', 'ب']))).toBe('أ، ب');
    expect(joinList('es', ['a', 'b'])).toBe('a, b');
  });
});

describe('clock times', () => {
  it('follow the language\'s own clock; Haitian Creole gets 24 hours', () => {
    expect(formatClock('en', 15 * 60 + 30)).toBe('3:30 PM');
    expect(formatClock('en', 15 * 60, { minutes: 'auto' })).toBe('3 PM');
    expect(formatClock('en', 15 * 60 + 30, { minutes: 'never' })).toBe('3 PM');
    expect(formatClock('fr', 15 * 60 + 30)).toBe('15:30');
    expect(formatClock('ht', 15 * 60 + 5)).toBe('15:05');
    expect(formatClock('ko', 15 * 60 + 30)).toBe('오후 3:30');
    expect(formatClock('ar', 15 * 60, { minutes: 'auto' })).toBe('3 م');
  });
  it('write whole hours the same way as other times (no "08 giờ" next to "9:30")', () => {
    for (const l of LOCALES) {
      const whole = formatClock(l.code, 8 * 60, { minutes: 'auto' });
      const half = formatClock(l.code, 9 * 60 + 30, { minutes: 'auto' });
      // the same shape: either both have minutes, or the whole hour is the half hour without ":30"
      expect(whole.includes(':') ? whole.replace(/8:00/, '9:30') : whole.replace(/8/, '9:30'), l.code).toBe(half);
      expect(formatClock(l.code, 8 * 60 + 40, { minutes: 'never' }), l.code).toBe(whole);
    }
    expect(formatClock('vi', 8 * 60, { minutes: 'auto' })).toBe('8:00');
    expect(formatClock('vi', 18 * 60 + 30)).toBe('18:30');
  });
});

describe('month names inside sentences', () => {
  it('are lower case in Vietnamese, unchanged elsewhere', () => {
    const june = new Date(2026, 5, 15);
    expect(getT('vi', demo).monthInSentence(june)).toBe('tháng 6');
    expect(getT('vi', demo).date(june, 'month')).toBe('Tháng 6');
    expect(getT('en', demo).monthInSentence(june)).toBe('June');
    expect(getT('es', demo).monthInSentence(june)).toBe('junio');
    expect(getT('ht', demo).monthInSentence(june)).toBe('jen');
  });
});

describe('month initials on charts', () => {
  it('stay distinct in Haitian Creole (out / oktòb); Intl languages keep their own', () => {
    const labels = (code: string) => Array.from({ length: 12 }, (_, m) => getT(code, demo).date(new Date(2026, m, 5), 'month-narrow'));
    expect(labels('ht')).toEqual(['Ja', 'Fe', 'Ma', 'Av', 'Me', 'Je', 'Ji', 'Ou', 'Se', 'Ok', 'No', 'De']);
    expect(labels('en').join(' ')).toBe('J F M A M J J A S O N D');
  });
});

describe('sentences one after another', () => {
  it('get a space in most languages, none after 。 in Chinese', () => {
    expect(getT('en', demo).sentences(['One.', '', null, 'Two.'])).toBe('One. Two.');
    expect(getT('zh', demo).sentences(['可以考虑购买。', '费城土地银行。'])).toBe('可以考虑购买。费城土地银行。');
    expect(getT('ko', demo).sentences(['첫째입니다.', '둘째입니다.'])).toBe('첫째입니다. 둘째입니다.');
    expect(getT('ar', demo).sentences(['أولًا.', 'ثانيًا.'])).toBe('أولًا. ثانيًا.');
    // full-width brackets carry their own space, in any language
    expect(getT('zh', demo).sentences(['简介', '（PDF 第4页）'])).toBe('简介（PDF 第4页）');
    expect(getT('zh', demo).sentences(['Intro', '(PDF page 4)'])).toBe('Intro (PDF page 4)');
    expect(getT('zh', demo).space).toBe('');
    expect(getT('en', demo).space).toBe(' ');
  });
});
