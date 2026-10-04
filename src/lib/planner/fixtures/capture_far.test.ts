// Records the demo lots' FAR buildings (taller buildings farther out whose shadow can reach
// the lot) from the REAL City API, with exactly the code the live planner uses
// (philly fetchTallBuildings + selectFarShade). Skipped unless PIAT_CAPTURE=1:
//
//   PIAT_CAPTURE=1 npx vitest run src/lib/planner/fixtures/capture_far.test.ts
//
// Adds `surroundings.farBuildings` (and `farCapturedAt`) to <slug>.json and leaves everything
// else in the fixture as capture.py recorded it. Run it again after capture.py. One request
// per lot; run by hand, rarely.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { setFetch } from '../../philly/http';
import { FAR_SHADE_MAX_FT, farQueryMinHeight, fetchTallBuildings, selectFarShade } from '../../philly/surroundings';
import type { SurroundingBuilding } from '../../philly/types';
import { SURROUNDINGS_RADIUS_FT } from '../site';

const HERE = dirname(fileURLToPath(import.meta.url));

describe.skipIf(!process.env.PIAT_CAPTURE)('capture far buildings for the demo lots (network)', () => {
  for (const slug of ['dover', 'greenway']) {
    it(slug, { timeout: 60_000 }, async () => {
      setFetch(null);
      const path = join(HERE, `${slug}.json`);
      let text = readFileSync(path, 'utf8');
      const f = JSON.parse(text);
      const near = f.surroundings.buildings as SurroundingBuilding[];
      const minHeightFt = farQueryMinHeight(f.lot, SURROUNDINGS_RADIUS_FT);
      const { buildings, truncated } = await fetchTallBuildings(f.lot, { minHeightFt, maxFt: FAR_SHADE_MAX_FT });
      expect(truncated).toBe(false);
      const far = selectFarShade(f.lot, near, buildings).map((b) => ({ polygon: b.polygon, heightFt: b.heightFt, baseElevationFt: b.baseElevationFt ?? null }));
      console.log(slug, `asked for >= ${minHeightFt} ft within ${FAR_SHADE_MAX_FT} ft: ${buildings.length}; can shade the lot: ${far.length}`, far.map((b) => b.heightFt));
      // splice into the text, so the rest of the file stays byte for byte as capture.py wrote it
      // (farBuildings is the last key of `surroundings`, which is the last key of the file)
      const at = new Date().toISOString().replace(/\.\d+Z$/, '+00:00');
      text = text.replace(/,"farCapturedAt":"[^"]*"/, '').replace(/,"farBuildings":\[[\s\S]*\]\}\}\s*$/, '}}');
      text = text.replace(/("capturedAt":"[^"]*")/, `$1,"farCapturedAt":"${at}"`).replace(/\}\}\s*$/, `,"farBuildings":${JSON.stringify(far)}}}`);
      expect(JSON.parse(text).surroundings.farBuildings).toHaveLength(far.length);
      writeFileSync(path, text);
    });
  }
});
