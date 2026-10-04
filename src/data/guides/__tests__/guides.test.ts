import { describe, expect, it } from 'vitest';
import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { getGuides, getGuide, CATEGORY_LABELS } from '../index';
import { ELEMENTS } from '../../elements';

// public/ is the Astro project's static root; images referenced by guide JSON
// (hero/thumb/step-NN.webp) must actually exist there, and downloads/guides/
// must hold a same-slug PDF for the Download button to work.
const PUBLIC_DIR = join(process.cwd(), 'public');

const guides = getGuides();

describe('guide data', () => {
  it('loads all thirteen guides', () => {
    expect(guides.length).toBe(13);
  });

  it('every guide JSON parses with the expected shape', () => {
    for (const g of guides) {
      expect(typeof g.slug).toBe('string');
      expect(g.slug.length).toBeGreaterThan(0);
      expect(typeof g.title).toBe('string');
      expect(typeof g.summary).toBe('string');
      expect(Object.keys(CATEGORY_LABELS)).toContain(g.category);
      expect(typeof g.dimensionsIn.length).toBe('number');
      expect(typeof g.dimensionsIn.width).toBe('number');
      expect(typeof g.dimensionsIn.height).toBe('number');
      expect(Array.isArray(g.materials)).toBe(true);
      expect(Array.isArray(g.hardware)).toBe(true);
      expect(Array.isArray(g.cutList)).toBe(true);
      expect(Array.isArray(g.tools)).toBe(true);
      expect(Array.isArray(g.steps)).toBe(true);
      expect(g.steps.length).toBeGreaterThan(0);
      expect(Array.isArray(g.links)).toBe(true);
      expect(typeof g.pdf).toBe('string');
      expect(typeof g.sourcePages).toBe('string');
    }
  });

  it('getGuide(slug) finds each guide by its own slug, and misses for a bogus slug', () => {
    for (const g of guides) {
      expect(getGuide(g.slug)?.slug).toBe(g.slug);
    }
    expect(getGuide('not-a-real-guide')).toBeUndefined();
  });

  it('every slug matches a guide id referenced in elements.ts', () => {
    const guideIdsInElements = new Set(
      Object.values(ELEMENTS)
        .map((e) => e.guide)
        .filter((g): g is string => Boolean(g)),
    );
    for (const g of guides) {
      expect(guideIdsInElements.has(g.slug), `elements.ts has no entry with guide: '${g.slug}'`).toBe(true);
    }
  });

  it("every guide's `element` id exists in elements.ts", () => {
    for (const g of guides) {
      expect(ELEMENTS[g.element], `elements.ts has no element '${g.element}' (guide ${g.slug})`).toBeDefined();
    }
  });

  it('all materials, hardware and cut list quantities are numbers (not strings)', () => {
    for (const g of guides) {
      for (const m of [...g.materials, ...g.hardware]) {
        expect(typeof m.qty, `${g.slug}: ${m.item} qty`).toBe('number');
        expect(Number.isFinite(m.qty)).toBe(true);
      }
      for (const c of g.cutList) {
        expect(typeof c.qty, `${g.slug}: cut list ${c.part} qty`).toBe('number');
        expect(typeof c.lengthIn, `${g.slug}: cut list ${c.part} lengthIn`).toBe('number');
        expect(Number.isFinite(c.qty)).toBe(true);
        expect(Number.isFinite(c.lengthIn)).toBe(true);
      }
    }
  });

  it('every step image path exists under public/, and images/imageAlts line up', () => {
    for (const g of guides) {
      for (const step of g.steps) {
        expect(step.images.length, `${g.slug} step ${step.n}: images/imageAlts length mismatch`).toBe(
          step.imageAlts.length,
        );
        for (const img of step.images) {
          const p = join(PUBLIC_DIR, img);
          expect(existsSync(p), `${g.slug} step ${step.n}: missing image ${img}`).toBe(true);
        }
        for (const alt of step.imageAlts) {
          expect(alt.length, `${g.slug} step ${step.n}: empty alt text`).toBeGreaterThan(0);
        }
      }
    }
  });

  it('every guide has a hero and thumb image under public/', () => {
    for (const g of guides) {
      for (const name of ['hero.webp', 'thumb.webp']) {
        const p = join(PUBLIC_DIR, 'img', 'guides', g.slug, name);
        expect(existsSync(p), `${g.slug}: missing ${name}`).toBe(true);
      }
    }
  });

  it('every guide has a compressed PDF under public/downloads/guides, under 8 MB', () => {
    for (const g of guides) {
      expect(g.pdf).toBe(`downloads/guides/${g.slug}.pdf`);
      const p = join(PUBLIC_DIR, g.pdf);
      expect(existsSync(p), `${g.slug}: missing ${g.pdf}`).toBe(true);
      const bytes = statSync(p).size;
      expect(bytes, `${g.slug}: PDF is ${bytes} bytes`).toBeLessThan(8 * 1024 * 1024);
    }
  });
});
