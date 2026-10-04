// Every 3D assembly model must agree with its build guide (see validate.ts).
import { describe, expect, it } from 'vitest';
import { validateModel } from '../validate';
import type { GuideModel } from '../schema';

const models = import.meta.glob<GuideModel>('../../../data/guides/models/*.json', { eager: true, import: 'default' });
const guides = import.meta.glob<any>('../../../data/guides/*.json', { eager: true, import: 'default' });

describe('guide 3D models', () => {
  const entries = Object.entries(models);
  it.skipIf(entries.length > 0)('none yet', () => {});
  for (const [path, model] of entries) {
    it(`${model.slug} matches its guide`, () => {
      const guide = Object.values(guides).find((g) => g.slug === model.slug);
      expect(guide, `no guide for ${path}`).toBeTruthy();
      expect(validateModel(model, guide)).toEqual([]);
    });
  }
});
