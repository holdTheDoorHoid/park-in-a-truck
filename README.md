# Park in a Truck — interactive toolkit

A guided, interactive version of the [Park in a Truck](https://linktr.ee/parkinatruck) toolkit and workbooks from
Thomas Jefferson University's Landscape Architecture Program and Lab for Social and Urban Innovation — with
automatic City of Philadelphia lookups and a 3D park planner.

**Live (unlisted):** https://holdthedoorhoid.github.io/park-in-a-truck/

Work on it locally:

```bash
npm install
npm run dev
```

Then open http://localhost:4321. See `DESIGN.md` for how it fits together.

## Hosting

The site is static and lives on GitHub Pages, built from this repository.

- **Deploys happen by themselves.** Every push to `main` runs `.github/workflows/pages.yml`: install,
  `npm run i18n:check`, `npm test`, then `npm run build` with `SITE_BASE=/park-in-a-truck/`, and publishes
  `dist/`. If a check fails nothing is published and the previous version stays live. To redeploy without a
  change: Actions → "Deploy to GitHub Pages" → Run workflow. (In CI the tests skip their speed limits —
  `PIAT_SKIP_TIMING=1` — so a slow shared runner can't block a deploy; `npm test` locally still checks them.)
- **Unlisted.** Anyone with the link can use the site, but every page (all 12 languages and the 404 page)
  asks search engines not to list it or follow its links (`<meta name="robots" content="noindex, nofollow">`),
  and there is no sitemap. **To let search engines list it**, change one line in `src/config.ts`
  (`const SEARCH_INDEXING_DEFAULT = false;` → `true`) and push to `main`. Without a commit: set the repository
  variable `SEARCH_INDEXING` to `true` (Settings → Secrets and variables → Actions → Variables) and run the
  workflow; that variable, when set, wins over the line in `src/config.ts`. Either way search engines take days
  to weeks to notice.
- **Check the published build locally** (same base path as GitHub Pages):
  `SITE_BASE=/park-in-a-truck/ npm run build && SITE_BASE=/park-in-a-truck/ npx astro preview`, then open
  http://localhost:4321/park-in-a-truck/ (`npx astro preview stop` when done).
- The developer pages under `/dev/` (cost preview, model check, pieces gallery) exist only in `npm run dev`;
  builds leave them out (`PIAT_DEV_PAGES=1` keeps them).
- Unknown addresses show `src/pages/404.astro` (GitHub Pages serves `404.html` for them), in the visitor's
  language when the address had one (`/park-in-a-truck/es/…`).

Toolkit and workbook content © Thomas Jefferson University / Park in a Truck, used with permission.
