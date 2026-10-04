// Vitest runs outside Astro, so it needs to be told how to compile Preact JSX
// (the Astro tsconfig sets "jsx": "preserve"). Added by the pieces workstream
// for the PlanView tests; it changes nothing else about the test run.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  oxc: { jsx: { runtime: 'automatic', importSource: 'preact' } },
});
