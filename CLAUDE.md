# Agent notes — Park in a Truck site

Read `DESIGN.md` first. It is authoritative (decisions, contracts, ownership).

- Astro 7 + MDX + Preact islands + Three.js. Node 24. `npm run dev`, `npm run build`, `npm test`.
- Astro 7 uses the Sätteri markdown processor by default; this project switches to `unified` in
  `astro.config.mjs` so the sub-step rehype plugin runs. Don't remove that.
- Start the dev server in the background (`npx astro dev --background --port <free port>`), stop it when done.
- Python tooling: `source/.venv/bin/python` (pymupdf, openpyxl). Raw PDFs/spreadsheets live in
  `~/Desktop/park-in-a-truck/source/` (git-ignored; use absolute paths from a worktree). `source/MANIFEST.md`
  lists them; `source/pdf_links.json` has every hyperlink inside the PDFs with doc+page.
- Shared contracts live in `src/lib/types.ts` — additive changes only.
- Saved data goes through `src/lib/project.ts`. Never read/write localStorage directly for project data.
- Content: PiaT's words, web-friendly. No new advice. Site-added helpers marked `{/* site-added: … */}`.
- Every image needs real alt text. Keep pages usable at 360px wide.
- Languages: every page exists in 12 languages. User-facing text goes through `src/i18n/` (`getT`), page links
  through `urlFor(locale)`, saved ids/values never get translated. Read `docs/i18n/HOW-TO-TRANSLATE.md` before
  adding text; run `npm run i18n:check`.
- Don't commit binaries over ~10 MB; compress PDFs with ghostscript (`-dPDFSETTINGS=/ebook`) and check legibility.
- The repo is PRIVATE and stays that way until the owner says otherwise. Never push to any other remote.
