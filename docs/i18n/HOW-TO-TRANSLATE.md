# How to translate this site

English + 11 languages (DESIGN.md §2 "Languages", §3 "Languages"). Text is translated **into the site**
ahead of time; nothing is sent to a translation service while people use it. English is always the
source of truth; anything not translated yet falls back to English, so the site works at every stage.

There are two kinds of work, and both split cleanly between parallel agents:

1. **Extraction** (code, by *area*): move English text out of components into an English catalog.
2. **Translation** (text, by *language*): fill in one language's files. No code.

Run `npm run i18n:check` after every change. It must say **No errors**. It also prints how many English
words are still untranslated per language — that's the progress number.

---

## Where everything lives

| What | English (source) | Each language `<code>` |
|---|---|---|
| UI text, one file per **area** | `src/i18n/messages/en/<area>.ts` | `src/i18n/messages/<code>/<area>.ts` |
| Step chapters | `src/content/steps/<slug>.mdx` | `src/content/i18n/<code>/steps/<slug>.mdx` |
| Data with prose (guides, plants, step titles…) | `src/data/…` | `src/i18n/data/<code>/<name>.json`, guides in `…/guides/<slug>.json` |
| Glossary | `docs/i18n/glossary.md` (terms) | your language's section of the same file |

Language codes (URL, folders): `es` Spanish · `zh` Chinese (Simplified) · `vi` Vietnamese · `ru` Russian ·
`ar` Arabic (right-to-left) · `ht` Haitian Creole · `fr` French · `pt` Portuguese (Brazil) · `sw` Swahili ·
`ko` Korean · `tl` Tagalog. Defined once in `src/i18n/locales.ts`.

Pages: English at `/…`, every other language at `/<code>/…` (e.g. `/es/steps/acquire/`). Each page in
`src/pages/` has a 5-line twin in `src/pages/[lang]/` that renders the same page; the page reads its
language from the URL. Saved progress is shared: same browser storage, same field ids, same sub-step ids.

### Catalog areas (one agent per area during extraction)

| Area | Covers |
|---|---|
| `site` | Header, language box, notices, first-visit offer, footer, step path, home "welcome back" |
| `pages` | Prose of the stand-alone pages in `src/pages/` (home, steps index, lot, my-park, planner, parks, plants, resources, build index…). Key prefix = page: `home.`, `lot.`, `myPark.`… Build-time only (`client: false`). |
| `workbook` | `src/components/workbook/*`, the chapter page, `src/scripts/bind.ts`, autofill words (`src/lib/autofill.ts`) |
| `philly` | `src/components/philly/*`, words from `src/lib/philly/plain.ts` (zoning explanations, owner kinds) |
| `planner` | `src/components/planner/*` and user-facing text in `src/lib/planner/*` |
| `cost` | `src/components/cost/*`, line names in `src/lib/cost/*` |
| `plants` | `src/components/plants/*`, `/plants/` page chrome |
| `parks` | `src/components/parks/*`, `/parks/` |
| `schedule` | `src/components/schedule/*` (build schedule, stewardship calendar, .ics text) |
| `guides` | `/build/` pages, `src/components/guides/*`, `src/components/guides3d/*` |
| `flyer` | The meeting flyer. Bundled for every language (prints in any language). |
| `mypark` | The My park page's script (project list, answers summary) |

Need another area (e.g. `patch` for the long Park Patch page)? Add `src/i18n/messages/en/<area>.ts` with
`defineMessages('<area>', {…})` — the file name must equal the area name. Long prose that is only rendered
at build time gets `{ client: false }` so it isn't shipped to browsers.

---

## Extraction round (code)

### Getting text

```astro
---
// .astro — the language comes from the page URL
import site from '../i18n/messages/en/site.ts';
import { getT, urlFor } from '../i18n/astro.ts';
const t = getT(Astro, site);
const u = urlFor(t.locale);          // replaces u() from lib/url for PAGE links
---
<a href={u('steps/')}>{t('nav.steps')}</a>
<p set:html={t.html('footer.saved', { href: u('my-park/') })} />
```

```tsx
// Preact island or plain browser script
import planner from '../../i18n/messages/en/planner.ts';
import { getT } from '../../i18n/t.ts';
const t = getT(props.locale, planner);   // client:only islands can pass undefined: reads <html data-locale>
```

Islands that are server-rendered (`client:visible`, `client:idle`, `client:load`) must get
`locale={t.locale}` from their Astro wrapper, or the server renders English and the browser re-renders.
**Never import `i18n/astro.ts` or `i18n/server.ts` from `.ts`/`.tsx` files** — they carry every language;
the checker fails if you do.

### Writing English catalog entries

```ts
// src/i18n/messages/en/<area>.ts
export default defineMessages('philly', {
  /** Comments above a key are context for translators: where it shows, how long it may be */
  'lookup.button': 'Look up',
  'lookup.found': 'Found {address}.',                          // {placeholders}, never string concatenation
  'lots.count': { one: '{count} lot', other: '{count} lots' }, // plurals: pass { count }
  'lookup.help': 'Check it on <a href="{href}">atlas.phila.gov</a> (in English).',
});
```

- **One whole sentence per key.** Never build sentences from pieces (`'Size ' + x`) — word order differs.
  Use `{placeholders}` instead. Same word in two places with different meaning = two keys.
- Keys: `<component or section>.<thing>`, lower camelCase after the dot. Stable: renaming a key loses
  every translation of it.
- Plurals: an object with `one`/`other` (plus `zero`/`two`/`few`/`many` where a language needs them;
  `"=0"` for an exact zero). The `count` placeholder chooses the form.
- Numbers, money, dates, lists: `t.num(n)`, `t.money(n)`, `t.date(d, 'long'|'full'|'short'|'month-year')`,
  `t.list(items)` — never `toLocaleString('en-US')`. Units stay US (ft, in, sq ft, $). Numbers passed as
  placeholders are formatted automatically; pass years, ids and addresses as **strings**.
- Inline HTML only for links and emphasis: `<a href="{href}">`, `<strong>`, `<em>`, `<br>`; render with
  `t.html()` + `set:html` (Astro) or `dangerouslySetInnerHTML` (Preact). Values are escaped.
- Arrows that mean "next/back" (→ ←) go **inside** the message so right-to-left languages can flip them.
- Alt text, `aria-label`, `title`, `placeholder`, error messages and `.ics`/CSV/print text are text too.

### Things that must NEVER be translated (saved data)

Saved answers are stored under ids and values, so a project works in every language:

- Field ids (`<Field id>`, `data-field`), checklist item `value`s, choice `value`s, ListField column `key`s,
  sub-step ids, `project.extra.*` keys, element/plant/theme ids.
- Select options: write `options={[{ value: 'Purchase', label: '…' }]}` — the **value stays English**.
  (`<Field>` accepts plain strings too; a plain string is both value and label.)
- When a list's text comes from data (guide materials, tools), take the saved value from the **English**
  data and only the label from the translation (see `src/pages/build/[slug].astro`).
- Fields filled in from City records: a `<select>` gets the English value (bind.ts already does this).

### Data with prose

`src/i18n/datasets.ts` lists every dataset that can be translated and exactly which fields. Read through:

```ts
import { localizedSteps, localizeGuide, localizeKeyed, localizeRecord } from '../i18n/astro.ts'; // or ../i18n/data.ts in browser code
const steps = localizedSteps(t.locale);
const plants = localizeKeyed(PLANTS, 'plants', 'id', t.locale);
const themes = localizeRecord(THEMES, 'themes', t.locale);
```

Overlays marked `client: true` in datasets.ts are shipped to browsers in `/i18n/<code>.js`.

### Links, files, pages

- Page links: `urlFor(locale)` (`u('steps/')` → `/es/steps/`). Files (`downloads/…pdf`, `img/…`) never
  get a language prefix — use `u()` from `src/lib/url.ts` or the same `urlFor` (it leaves files alone).
  Safety net: on translated pages `Base.astro` also rewrites any server-rendered `<a href>` that still points
  at an English page (`localizeLinks`), so un-extracted pages and English fallback chapters stay in the
  language. It cannot see links an island draws in the browser — those must use `urlFor`. Mark a link that
  should deliberately go to another language with `hreflang`.
- PiaT's PDFs stay English. `<PdfPage>` and `<Download>` add "· in English" and `hreflang="en"`
  automatically on other languages. Links to English-only websites: add "(in English)" in the text.
- A new page in `src/pages/` needs its twin in `src/pages/[lang]/` (copy any twin, fix the import path).
  A dynamic page passes its paths through: `export const getStaticPaths = () => localeStaticPaths(english());`.
  If the twin's `<Page />` errors with *Type '{}' is not assignable to type 'never'*, give the English page
  `type Props = Record<string, never>;`. The checker fails on a page without a twin.

### Right-to-left (Arabic)

- Use logical CSS: `margin-inline-start`, `padding-inline`, `inset-inline-end`, `border-inline-start`,
  `text-align: start`. No `left`/`right` in new CSS (use `[dir='rtl']` overrides for the rare exception,
  e.g. `object-position`). Flex and grid flip by themselves.
- Things that must stay left-to-right (the wordmark, code, a phone number in a row of digits) get `dir="ltr"`.
- An island whose area isn't translated yet is wrapped in `<LangFallback area={…}>` (all widgets already
  are): it is marked `lang="en" dir="ltr"` until the area has any translation, then turns itself off.
  When you extract an area, keep the wrapper — it costs nothing — and check the island in `/ar/` once
  the Arabic text arrives.

---

## Translation round (text, one agent per language)

You touch only your language's files:
`src/i18n/messages/<code>/*.ts`, `src/i18n/data/<code>/**`, `src/content/i18n/<code>/**`, and your
section of `docs/i18n/glossary.md`. Follow the glossary and its tone notes.

### UI catalogs

```ts
// src/i18n/messages/<code>/<area>.ts — only translations; missing keys fall back to English
import type en from '../en/<area>.ts';
import type { Translation } from '../../define.ts';
export default {
  'nav.steps': 'Pasos',
  'lots.count': { one: '{count} lote', other: '{count} lotes' },
} satisfies Translation<typeof en>;
```

Keep every `{placeholder}` and every HTML tag; translate the words between tags. Give the plural forms
your language uses (Arabic: zero/one/two/few/many/other; Russian: one/few/many/other; Chinese, Korean,
Vietnamese: just other). `npm run i18n:check -- --locale <code> --verbose` lists the keys still missing.

The `site` area is special: once it is **100%** translated, the language is offered on first visits to
people whose browser asks for it, and its pages get `<html lang="<code>">` (until then they say "coming
soon" and stay marked English).

### Chapters

```
npm run i18n:scaffold -- <code> <slug>        # e.g. npm run i18n:scaffold -- vi acquire
```

copies the English chapter to `src/content/i18n/<code>/steps/<slug>.mdx` with every `##` heading pinned to
its English sub-step id, import paths fixed, and `export const u = urlFor('<code>');` so links stay in your
language. Then translate in place:

- Translate: frontmatter `title`, `intro`, `sources`; headings; paragraphs; list items; and these props:
  `label`, `hint`, `placeholder`, `alt`, `caption`, `title`, `desc`, `rowName`, `note`, `unit`, `autoNote`.
- Keep exactly: the `{/* #english-id */}` marker at the end of each `##` heading; every component, in the
  same order, with the same `id`, `value`, `key`, `type`, `src`, `doc`, `page`, `mode`…; imports;
  `{/* site-added: … */}` comments (they are notes for developers, leave them English); link targets.
- Select options: turn `options={['Purchase', 'Lease']}` into
  `options={[{ value: 'Purchase', label: '<yours>' }, { value: 'Lease', label: '<yours>' }]}`.
- Units: `unit="ft"` may become your word for feet (still feet).
- A chapter that doesn't exist in your language shows the English one with a notice; that's fine.

### Data overlays

Same shape as the English data, **only** the fields `src/i18n/datasets.ts` allows, only strings:

```jsonc
// src/i18n/data/<code>/steps.json — keyed by slug
{ "acquire": { "title": "Adquirir", "tagline": "…" } }
// src/i18n/data/<code>/guides/bench-back.json — arrays line up by position; use null to skip an item
{ "title": "Banca con respaldo", "tools": ["Sierra ingletadora…", null, "Taladro…"], "steps": [{ "title": "…", "text": "…" }] }
// src/i18n/data/<code>/plants.json — keyed by plant id; scientific names never change
{ "edible-small-tree-both-serviceberry": { "common": "…", "notes": "…" } }
```

Never copy numbers, ids, URLs, prices, sizes or part labels into an overlay — the checker rejects them.

---

## Checking

| Command | What it does |
|---|---|
| `npm run i18n:check` | All languages: errors, warnings, and words left per area/chapter/dataset. Exit 1 on errors. |
| `npm run i18n:check -- --locale es,ar` | Only those languages. `--verbose` lists missing keys; `--json` for tools. |
| `npm test` | Includes the checker (`src/i18n/__tests__/check.test.ts`) and the i18n unit tests. |
| `npm run build` | Builds every page in every language (≈375 pages). |

Errors mean something would break: a key or overlay field English doesn't have (typo or renamed key), an
invented `{placeholder}` (it would show literally), changed HTML tags, a plain string where English has
plural forms, a chapter whose sub-step ids / field ids / option values / components differ from English,
a heading without its id marker, a page without a `/<lang>/` twin, browser code importing build-only
modules. Warnings (a placeholder you left out, a link missing compared to English) are worth a look.

Look at your pages: `npm run dev`, then `/<code>/`, `/<code>/steps/<slug>/`, `/<code>/build/<slug>/`.
Check at 360 px wide, and for Arabic that everything reads right-to-left.
