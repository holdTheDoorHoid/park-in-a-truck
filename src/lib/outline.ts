// Build-time list of every chapter's sub-steps, so any page can show progress
// ("3 of 7 done") without loading the chapter itself.
import { getCollection, render } from 'astro:content';
import { STEPS } from '../data/steps';

export type Outline = Record<string, { id: string; title: string }[]>;
let cache: Promise<Outline> | null = null;

export function getOutline(): Promise<Outline> {
  cache ??= (async () => {
    const entries = await getCollection('steps');
    const out: Outline = {};
    for (const s of STEPS) {
      const e = entries.find((x) => x.id === s.slug);
      if (!e) {
        out[s.slug] = [];
        continue;
      }
      const { headings } = await render(e);
      out[s.slug] = headings
        .filter((h) => h.depth === 2)
        .map((h) => ({ id: h.slug.replace(/-title$/, ''), title: h.text }));
    }
    return out;
  })();
  return cache;
}
