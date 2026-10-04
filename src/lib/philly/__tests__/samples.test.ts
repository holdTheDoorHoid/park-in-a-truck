// Ready-made outputs of the client for other workstreams (planner, pieces, cost)
// to code against without the network: a LotRecord and a Surroundings for
// 1322 N Dover St (mid-block) and 2061 S 60th St (corner). Regenerate with
//   PHILLY_SAMPLES=1 npx vitest run src/lib/philly/__tests__/samples.test.ts
// This test fails if the client's output drifts from the saved samples.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { lookupLot } from '../lookup';
import { fetchSurroundings } from '../surroundings';
import { FIXTURE_DIR, useFixtures } from './fixtures';

const DIR = join(FIXTURE_DIR, 'samples');
const strip = (o: unknown) => JSON.parse(JSON.stringify(o, (k, v) => (k === 'fetchedAt' ? undefined : v)));

let fx: ReturnType<typeof useFixtures>;
beforeAll(() => {
  fx = useFixtures();
});
afterAll(() => fx.restore());

describe('samples for other workstreams', () => {
  for (const [name, q, around] of [
    ['1322-n-dover', '1322 N Dover St', true],
    ['2061-s-60th', '2061 S 60th St', false],
  ] as const) {
    it(`lot-${name}.json`, async () => {
      const lot = await lookupLot(q);
      const file = join(DIR, `lot-${name}.json`);
      if (process.env.PHILLY_SAMPLES || !existsSync(file)) writeFileSync(file, JSON.stringify(lot, null, 1));
      expect(strip(lot)).toEqual(strip(JSON.parse(readFileSync(file, 'utf8'))));
      if (!around) return;
      const s = await fetchSurroundings(lot, 250);
      const sf = join(DIR, `surroundings-${name}.json`);
      if (process.env.PHILLY_SAMPLES || !existsSync(sf)) writeFileSync(sf, JSON.stringify(s));
      expect(strip(s)).toEqual(strip(JSON.parse(readFileSync(sf, 'utf8'))));
    });
  }
});
