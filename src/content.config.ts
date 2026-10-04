import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// One MDX file per chapter: src/content/steps/<slug>.mdx, slugs from src/data/steps.ts.
// Every `##` heading becomes a trackable sub-step (src/lib/rehype-substeps.mjs).
const steps = defineCollection({
  loader: glob({ pattern: '*.mdx', base: './src/content/steps' }),
  schema: z.object({
    title: z.string(),
    /** Short intro shown under the chapter title */
    intro: z.string().optional(),
    /** Source pages this chapter draws on, for credits */
    sources: z.array(z.string()).optional(),
  }),
});

export const collections = { steps };
