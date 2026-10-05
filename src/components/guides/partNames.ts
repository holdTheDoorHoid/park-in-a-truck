// Part names in the page's language, for the cut list and the 3D viewer. Cut-list labels (BB-1)
// stay as they are; the planter guides' "P-1 (18"x18" box)" gets the language's word for box; a
// part the 3D model names after a materials or hardware item (src/data/guides/models/*.json `ref`)
// is translated in the guides catalog (`g3d.part.*`).

import type guidesMsgs from '../../i18n/messages/en/guides.ts';
import type { T } from '../../i18n/t.ts';

type GuidesT = T<typeof guidesMsgs>;
type GuidesKey = keyof (typeof guidesMsgs)['messages'];

/** Model parts named after a materials/hardware item → their names in the guides catalog. */
export const PART_KEYS: Record<string, GuidesKey> = {
  'Gabion fill material': 'g3d.part.gabionFill',
  'Bracing material (spare 2x2 mesh)': 'g3d.part.bracingMesh',
  'Geotextile fabric': 'g3d.part.geotextile',
  'L brackets': 'g3d.part.lBrackets',
  'J hooks': 'g3d.part.jHooks',
  'Backrest brackets': 'g3d.part.backrestBrackets',
};

/** "P-1 (18"x18" box)": a label of one box size of a planter guide */
const IN_BOX = /^(.+?) \((\d+"x\d+") box\)$/;

/** A part's name in the page's language. */
export function partName(t: GuidesT, ref: string): string {
  const key = PART_KEYS[ref];
  if (key) return t(key);
  const box = IN_BOX.exec(ref);
  return box ? t('cut.partInBox', { part: box[1]!, size: box[2]! }) : ref;
}

/** True for a label partName() knows how to say: a cut-list label, a box label or a catalog name. */
export function isNamedPart(ref: string, cutListParts: string[]): boolean {
  return cutListParts.includes(ref) || ref in PART_KEYS;
}
