// Every 3D assembly model must agree with its build guide (see validate.ts).
import { describe, expect, it } from 'vitest';
import { validateModel } from '../validate';
import type { GuideModel } from '../schema';
import { isNamedPart } from '../../../components/guides/partNames';

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
    it(`${model.slug}: every part is named by its cut-list label or a translatable name`, () => {
      const guide = Object.values(guides).find((g) => g.slug === model.slug);
      const cut = (guide?.cutList ?? []).map((c: { part: string }) => c.part);
      // a new materials-list name needs a g3d.part.* key (src/components/guides/partNames.ts), or it shows English in every language
      expect(model.parts.filter((p) => p.ref && !isNamedPart(p.ref, cut)).map((p) => p.ref)).toEqual([]);
    });
  }
});
