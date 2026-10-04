# Brief for translation agents (one agent per language)

Read first, completely: `CLAUDE.md`, `DESIGN.md` §2 (Languages row) and §3 (Languages),
`docs/i18n/HOW-TO-TRANSLATE.md` (especially "Translation round" and "Checking"), `docs/i18n/glossary.md`.

## The job

Translate the whole site into your language, faithfully and naturally:

1. **Glossary first.** Fill in your language's section of `docs/i18n/glossary.md` for every term, and keep to it
   everywhere. Edit only your own section (other translators edit theirs in parallel).
2. **Chapters** (`src/content/i18n/<code>/steps/*.mdx`, start each with `npm run i18n:scaffold -- <code> <slug>`):
   all seven. Park in a Truck's own words, translated — never add advice, never drop a sentence. The site's own
   notes ("Note from this site, not Park in a Truck") keep their exact meaning. Keep every component, prop,
   Field id, option value and heading id marker exactly as the rules say.
3. **Data overlays** (`src/i18n/data/<code>/…`): every dataset and field allowed in `src/i18n/datasets.ts`.
4. **UI catalogs** (`src/i18n/messages/<code>/<area>.ts`): every area that exists in `src/i18n/messages/en/`.
   Extraction agents are adding more English keys in parallel; you will get a second pass for those later.

## Quality

- Plain, warm, short sentences for neighbours with no special knowledge — a community flyer, not a legal text.
- Same word for the same thing everywhere (the glossary). Names, addresses, codes, part labels, lumber sizes,
  scientific names, website names stay as the glossary says.
- Placeholders `{like_this}`, inline HTML and plural forms must survive exactly; the checker verifies them.
- Watch length: buttons and menu items must stay short; check them on a phone width.
- When unsure of a term a native speaker would use, choose the plainest common word and list it in your report.

## Rules

- Touch only: your language's folders (`src/i18n/messages/<code>/`, `src/i18n/data/<code>/`,
  `src/content/i18n/<code>/`) and your section of the glossary. No code, no English files. If you find a code or
  English-source bug (a string that can't be translated well, a missing key, a layout that breaks), don't fix
  it — list it in your report with the file and what you saw.
- Checks while working: `npm run i18n:check` (must say **No errors**). Run `npm test` and `npm run build`
  once at the end (the machine is shared — never two builds at once from your worktree). Look at 4–5 pages in
  your language in the headless browser (desktop and phone width): home, a chapter, a build guide, the lot
  page, the planner. Helpers: `/tmp/claude-1000/-home-hoid-Desktop/77b80b24-1852-484f-8c9a-3c0a10b8adef/scratchpad/ux/`
  (`./start.sh dev-t<code> desktop|mobile`, `node run.mjs dev-t<code> <<'JS' … JS`, `./stop.sh dev-t<code>`),
  against your own dev server (`npx astro dev --background --port <your port>`); stop both when done.
- Commit on your branch, messages ending `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
  Don't push, don't merge to main, don't launch subagents. Before your final report: `git merge main`,
  re-run `npm run i18n:check`.

## Final report (≤ 25 lines, plain language)

Words translated and what's left (from the checker), the key terminology choices, passages a native speaker
should review (be specific: file + heading), code/English-source problems you found, checks.
