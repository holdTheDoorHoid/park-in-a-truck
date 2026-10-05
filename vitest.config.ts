// Vitest runs outside Astro, so it needs to be told how to compile Preact JSX
// (the Astro tsconfig sets "jsx": "preserve"). Added by the pieces workstream
// for the PlanView tests; it changes nothing else about the test run.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  oxc: { jsx: { runtime: 'automatic', importSource: 'preact' } },
  // PIAT_SKIP_TIMING=1 (GitHub Pages workflow): speed ceilings off (src/lib/__tests__/timing.ts) and a
  // longer time limit per test, so a slow shared runner can't block a deploy. Locally: vitest's 5 s.
  ...(process.env.PIAT_SKIP_TIMING ? { test: { testTimeout: 60_000 } } : {}),
});
