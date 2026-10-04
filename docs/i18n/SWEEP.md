# Translation sweep after the polish pass (October 2026)

Everything the polish pass (phases A and B) left for translators: new keys, reshaped keys that could not be moved over
mechanically, new data fields, and a few places where the English changed. Work in your language's files only
(`src/i18n/messages/<code>/`, `src/i18n/data/<code>/`, `src/content/i18n/<code>/`), follow
`docs/i18n/HOW-TO-TRANSLATE.md` (its section "Sentences built for you" explains the new key shapes) and the
glossary, and finish with `npm run i18n:check -- --locale <code> --verbose` → **No errors**, words left as below.

Suggested split for three sweep agents:

| Group | Languages | Why together |
|---|---|---|
| 1 | es, fr, pt, ht | articles, gender, contracted prepositions (de + le = du, a + o = ao…) |
| 2 | ru, ar, sw, tl | case / dual / noun classes; ar is right-to-left |
| 3 | zh, vi, ko | no plurals or articles: mostly the new keys and data |

## Words left per language (the checker, after phase B)

| | es | zh | vi | ru | ar | ht | fr | pt | sw | ko | tl |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Words left (checker) | 586 | 682 | 757 | 516 | 582 | 521 | 521 | 586 | 521 | 521 | 536 |

About 520 of each language's words are the same new items for everyone (§1, §5); the rest is §2 for es/pt/ar and
leftovers zh/vi chose to keep in English (§5, last line). The changed-English items (§3) and the reviews (§4) don't
show in the count — do them from this list.

## 1. New keys — every language

`guides` (the 3D viewer's tooltip, when a part has no label of its own: "Board · 2x4 × 25″"):

| Key | English |
|---|---|
| `g3d.kind.lumber` | Board |
| `g3d.kind.sheet` | Sheet |
| `g3d.kind.mesh` | Wire mesh |
| `g3d.kind.stoneFill` | Stone fill |
| `g3d.kind.bracket` | Bracket |
| `g3d.kind.fastener` | Fastener |
| `g3d.kind.fabric` | Fabric |
| `g3d.kind.other` | Part |

`parks` (the /parks/ cards' "Source:" line and photo credits; names of papers and people stay as they are):

| Key | English |
|---|---|
| `source.toolkitPage` | Park in a Truck toolkit p.{page} |
| `source.toolkitPages` | Park in a Truck toolkit pp.{pages} |
| `source.toolkitAck` | Park in a Truck toolkit p.{page} acknowledgments |
| `source.linktree` | Park in a Truck Linktree |
| `source.linktreeOnly` | Park in a Truck Linktree only |
| `source.unconfirmedElsewhere` | unconfirmed elsewhere |
| `source.unconfirmedBeyond` | unconfirmed beyond that |
| `source.jeffersonNews` | Jefferson news |
| `photo.via` | {name}, via the Park in a Truck toolkit |
| `photo.toolkit` | Park in a Truck toolkit |

`plants` (pot sizes in the plant picker; nursery numbers like "#2" stay as they are):

| Key | English |
|---|---|
| `pot.quart` | Quart |
| `pot.oneQuart` | 1 quart |

## 2. Lengths that became plurals — es, pt, ar

These are now `{ one, other }` (the number of feet / miles picks the form). Languages whose unit word doesn't change
with the number were moved over as `{ other: … }`; Spanish ("pies"), Portuguese ("pés") and Arabic (قدم / ميل) need
real forms, so their old strings were taken out — write them again as plurals (ar: zero, one, two, few, many, other).

| Area | Key | English (both forms) |
|---|---|---|
| planner | `common.ft` | {ft} ft |
| planner | `where.fromEntrance` | {ft} ft from the entrance |
| planner | `where.fromLeft` | {ft} ft from the left side |
| planner | `where.fromRight` | {ft} ft from the right side |
| planner | `existing.spread` | Branches spread {ft} ft across |
| planner | `existing.across` | About {ft} ft across |
| planner | `existing.long` | {ft} ft long |
| planner | `existing.wide` | {ft} ft wide |
| planner | `slope.feet` | {ft} ft |
| planner | `slope.lowFeet` | ▼ Low · {ft} ft lower |
| planner | `slope.legendFeet` | Brown lines join ground of equal height, every {ft} ft of height; arrows point downhill, the way rain runs off. ▲ and ▼ mark the highest and lowest ground on the lot. |
| philly | `unit.ft` | {n} ft |
| philly | `unit.sqft` | {n} sq ft |
| philly | `unit.mi` (ar only; es/pt use "mi") | {n} mi |
| workbook | `auto.ft` | {n} ft |
| workbook | `auto.sqft` | {n} sq ft |

Optional for the others: the moved-over `{ other }` forms read right for every number (fr pi, ru фт, ht pye, sw futi,
tl/vi ft, zh 英尺, ko 피트). Add `one` / `few` / `many` only if you prefer full words.

## 3. English that changed — update the translation (not in the word count)

| Where | Languages | What changed in English |
|---|---|---|
| workbook `progress.total` | es, ar, pt, ht, fr, zh, vi | "{done} of {total} **sub-steps** done" — it counts the 53 sub-steps, not the six steps (ko, tl, sw, ru already say sub-steps / items) |
| `start.mdx`, "Fight climate change" bullet | all 11 | "increase property," removed (a copying slip; it belongs to the economy bullet) and "provide local opportunities to connect with nature" added, as in the toolkit p.11 |
| `assess.mdx`, the two site-added callouts | fr, vi, ru, ht, sw, ko | The widget is no longer the subject of the sentence: `<Planner mode="site" /> Here you can drop each object onto your lot's actual shape…`, `<SunStudy /> It works out sun and shade hour by hour…`. es, pt, tl, ar and zh already read this way. |
| planner `lot.overhangItems`, `existing.cityTrees` (`one` forms) | — | English grammar fixed ("1 thing sticks out", "The 1 street tree nearby comes…"); translations were already right |

## 4. Phrases moved over word for word — review where your language agrees words (not in the word count)

These keys were created from your existing text, so pages read exactly as before. They exist so the words can agree
now; change them where your language needs to.

- **Answer lists** (`workbook` `list.<list>.add` / `.removed` / `.fillFirst`, 27 keys: candidateNotes, ownerContacts,
  committeeMembers, citizensAssociations, physicalAssets, localInstitutions, objects, orgChart, events). They were
  built as "your `list.add`" + "your row name": fix agreement ("+ Agregar una institución", "Membre supprimé"),
  noun classes (sw) or gender (ar). Groups 1 and 2.
- **Slope places** (`planner` `slope.from.*`, `slope.to.*`, `slope.near.*`, 9 places each, replacing `slope.place*`).
  If your language contracts the preposition with the article, move it into the place and out of `slope.falls` /
  `slope.steepest` / `slope.dip` (fr "du coin avant gauche" / "au bord avant", pt "do canto" / "ao lado", es "del
  borde"). Group 1 mainly.
- **The picked thing** (`planner` `spot.thing.<thing>` and `view.picked.<thing>`, 38 kinds each). They read like
  your old `spot.thing` / `view.picked` with the name filled in; you can now write "là où se trouve le tabouret",
  "Mesa (elegida)", "Tabouret (choisi)" / "Table (choisie)". Groups 1 and 2.

## 5. New data fields (every language; in the word count)

Translate only the words; keep sizes, gauges, addresses and phone numbers exactly as they are.

- Guides (`src/i18n/data/<code>/guides/<slug>.json`, arrays by position — use `null` for the items you don't touch):
  - `gabion-bench`, `gabion-bench-8`: `materials[0].size` "8 gauge (3/16" dia.), galvanized, 2" openings";
    `cutList[2..4].stock` "2x2 welded-wire mesh".
  - Plain sizes (`2x4x8'`, `1/4" x 2-1/2"`) and lumber (`2x4`) stay English: leave them out.
- 3D models — new overlay `src/i18n/data/<code>/models/<slug>.json` = `{ "asBuilt": { "reason": "…" } }` for
  bench-back, gabion-bench, gabion-bench-8, planter-18, planter-24, shade (English in
  `src/data/guides/models/<slug>.json`). Until then the page shows the English note marked as English.
- Resources (`src/i18n/data/<code>/resources.json`): `press[3].note`, `press[6].note` (why a press link couldn't be
  checked), and `toolkitLibrary.sections[1].entries[5]` + `sections[5].entries[*].description` (17 lines that are
  mostly addresses and phone numbers — translate words like "reclaimed-materials warehouse", "recycled materials for
  sale", "delivery minimum", "local pollinator-plant specialist"; keep the addresses).
- zh and vi also kept supplier and toolkit-library *titles* in English (business names): nothing to do unless a title
  has ordinary words worth translating.
- The elements dataset no longer has `countAs` (a developer note nothing displayed); it was taken out of every
  overlay.

## Nothing to do

- `start.mdx` "— DeWayne Drummond, Mantua Civic Association" and vi/tl `assess.mdx` size table show as "still English"
  in the checker: they are a name and numbers.
- Planner `time.am` / `time.pm`: no longer shown (clock times follow the language's own clock).
