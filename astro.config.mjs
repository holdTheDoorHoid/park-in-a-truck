// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import preact from '@astrojs/preact';
import { unified } from '@astrojs/markdown-remark';
import { rehypeSubsteps } from './src/lib/rehype-substeps.mjs';
import { rehypeBase } from './src/lib/rehype-base.mjs';

// SITE_BASE lets the same build run at / locally and at /park-in-a-truck/ on
// GitHub Pages later (the repo is private for now; see DESIGN.md §Hosting).
const base = process.env.SITE_BASE ?? '/';

export default defineConfig({
  base,
  trailingSlash: 'always',
  // Astro 7 defaults to the Sätteri processor, which does not run rehype
  // plugins. Step chapters need the sub-step plugin, so use unified; MDX
  // inherits it.
  markdown: {
    processor: unified({ rehypePlugins: [rehypeSubsteps, [rehypeBase, { base }]] }),
  },
  integrations: [mdx(), preact()],
  vite: {
    // three.js and maplibre are large; keep them out of the shared chunk.
    build: { chunkSizeWarningLimit: 1500 },
  },
});
