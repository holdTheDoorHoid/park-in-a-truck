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

// Translated chapters: src/content/i18n/<lang>/steps/<slug>.mdx, same structure as the English
// chapter, every `##` carrying the English sub-step id (`## Título {/* #english-id */}`).
// Ids look like "es/steps/acquire". A chapter with no translation falls back to English.
// See docs/i18n/HOW-TO-TRANSLATE.md.
const stepsI18n = defineCollection({
  loader: glob({
    pattern: '*/steps/*.mdx',
    base: './src/content/i18n',
    generateId: ({ entry }) => entry.replace(/\.mdx$/, ''),
  }),
  schema: z.object({
    title: z.string(),
    intro: z.string().optional(),
    sources: z.array(z.string()).optional(),
  }),
});

export const collections = { steps, stepsI18n };
