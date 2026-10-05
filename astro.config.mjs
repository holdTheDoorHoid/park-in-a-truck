// @ts-check
import { rm } from 'node:fs/promises';
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import preact from '@astrojs/preact';
import { unified } from '@astrojs/markdown-remark';
import { rehypeSubsteps } from './src/lib/rehype-substeps.mjs';
import { rehypeBase } from './src/lib/rehype-base.mjs';

// SITE_BASE lets the same build run at / locally and at /park-in-a-truck/ on GitHub Pages
// (https://holdthedoorhoid.github.io/park-in-a-truck/; .github/workflows/pages.yml builds with it).
const base = process.env.SITE_BASE ?? '/';

/**
 * The developer pages in src/pages/dev/ (cost preview, model check, pieces gallery) work in
 * `astro dev` but are left out of every build, so they never go live. PIAT_DEV_PAGES=1 keeps them
 * (e.g. to check them in `astro preview`).
 */
function devPagesOnlyInDev() {
  return /** @type {import('astro').AstroIntegration} */ ({
    name: 'piat:dev-pages-only-in-dev',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        if (process.env.PIAT_DEV_PAGES) return;
        await rm(new URL('dev/', dir), { recursive: true, force: true });
        logger.info('left the /dev/ pages out of the build (PIAT_DEV_PAGES=1 keeps them)');
      },
    },
  });
}

export default defineConfig({
  site: 'https://holdthedoorhoid.github.io',
  base,
  trailingSlash: 'always',
  // Astro 7 defaults to the Sätteri processor, which does not run rehype
  // plugins. Step chapters need the sub-step plugin, so use unified; MDX
  // inherits it.
  markdown: {
    processor: unified({ rehypePlugins: [rehypeSubsteps, [rehypeBase, { base }]] }),
  },
  integrations: [mdx(), preact(), devPagesOnlyInDev()],
  vite: {
    // three.js and maplibre are large; keep them out of the shared chunk.
    build: { chunkSizeWarningLimit: 1500 },
  },
});
