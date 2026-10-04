// Replays recorded City API answers so tests never touch the network.
// Fixtures are captured from the real services by capture.test.ts
// (PHILLY_CAPTURE=1 npx vitest run src/lib/philly/__tests__/capture.test.ts).

import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setFetch } from '../http';

export interface Recorded {
  status: number;
  body: unknown;
}
export interface FixtureFile {
  name: string;
  query: string;
  capturedAt: string;
  responses: Record<string, Recorded>;
}

export const FIXTURE_DIR = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');

export function loadFixture(name: string): FixtureFile {
  return JSON.parse(readFileSync(join(FIXTURE_DIR, `${name}.json`), 'utf8'));
}

export function allFixtures(): FixtureFile[] {
  return readdirSync(FIXTURE_DIR)
    .filter((f: string) => f.endsWith('.json'))
    .map((f: string) => loadFixture(f.replace(/\.json$/, '')));
}

/** Serve every recorded response; anything else fails the test loudly. */
export function useFixtures(files: FixtureFile[] = allFixtures()) {
  const map = new Map<string, Recorded>();
  for (const f of files) for (const [u, r] of Object.entries(f.responses)) map.set(u, r);
  const calls: string[] = [];
  setFetch(async (url: string) => {
    calls.push(url);
    const r = map.get(url);
    if (!r) throw new Error(`Test tried to reach the network (no fixture): ${url}`);
    const text = JSON.stringify(r.body);
    return { ok: r.status >= 200 && r.status < 300, status: r.status, json: async () => JSON.parse(text), text: async () => text };
  });
  return { calls, restore: () => setFetch(null) };
}
