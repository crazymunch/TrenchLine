# Handover — Carcass Front

Written for whoever picks this up next. It covers what has landed, what is
left, and the things about this book and this pipeline that took a while to
learn and would cost the same time again.

CF-1 to CF-3 are on branch **`claude/trench-crusade-app-review-7bansz`**, open
as draft PR **[#12](https://github.com/crazymunch/TrenchLine/pull/12)** against
`main`. CF-4 and CF-5 are on **`claude/project-handover-e0sj82`**, open as draft
PR **[#13](https://github.com/crazymunch/TrenchLine/pull/13)** stacked on it. Read [`docs/README.md`](README.md) and the four rules in
[`CLAUDE.md`](../CLAUDE.md) before anything else — the whole approach below is
downstream of them.

---

## Where things stand

| # | Task | State |
|---|---|---|
| CF-1 | Sources + the two faction lists | **done** (`0e49f93`) |
| CF-2 | Five scenarios + two terrain pieces | **done** (`7421753`) |
| CF-3 | Random Scenario Generator | **done** (`127a12f`, docs `d858b24`) |
| CF-4 | New Patrons + Carcass Front exploration tables | **done** (`af8accb`, `9cee89a`) |
| CF-5 | The Carcass Front campaign, Path to Leviathan, Vision Cards | **done** (`620ef49`, this commit) |

Plus the Hell on Earth Weather Events, which landed first and is the earlier
half of PR #12.

**Green as of the CF-5 commit:** 557 unit tests, `npm run rules:build` with 0
conflicts and 0 fields lacking provenance, `tsc --noEmit` clean, `eslint` 0
errors, `next build` clean, `e2e/codex.spec.ts` green on the 375px phone
project.

---

## What is in the repo now

### Sources

```
data-sources/carcass-front/
├── SOURCES.json          release asset ids + sha256 for all 7 assets
├── *.pdf                 5 committed; the book (33MB) and vision cards (9.5MB)
│                         are `committed: false` and gitignored
└── extracted/*.txt       pdf → text, all 7
```

Fetched by `npm run rules:pdfs`, which now scans every
`data-sources/*/SOURCES.json`. Every asset is pinned by digest, so a re-fetch
is verified against the same bytes even for the two that are not committed.

### Parsers

| File | Reads |
|---|---|
| `scripts/lib/parse-carcass-front.mjs` | the two faction lists |
| `scripts/lib/parse-cf-scenarios.mjs` | the five scenarios + two terrain pieces |
| `scripts/lib/parse-cf-generator.mjs` | the Random Scenario Generator |
| `scripts/lib/parse-cf-exploration.mjs` | the four Resource Exploration Tables |
| `scripts/lib/parse-cf-campaign.mjs` | both campaigns |
| `scripts/lib/parse-patrons.mjs` | the Patrons — **and the rulebook's eight** |
| `scripts/lib/parse-vision-cards.mjs` | the sixteen Vision cards (a separate PDF) |
| `scripts/lib/cf-prose.mjs` | shared: pages → lines, lines → Markdown |
| `scripts/lib/dehyphenate.mjs` | shared: a hyphen at a line break |
| `scripts/lib/carcass-front-layer.mjs` | parsed lists → layer `add` ops |

### What reaches the app

- `dataset.units` / `weapons` / `factions` / `variants` / `armouries` — via the
  generated `carcass-front` layer, registered in `scripts/lib/rulesets.mjs`.
- `dataset.scenarios` — the rulebook's twelve plus CF's five, each CF entry
  carrying `source: 'carcass-front'`.
- `dataset.terrain` — Levant Hedgehog, Naval Mine.
- `dataset.scenarioGenerator` — the whole procedure.
- `dataset.patrons` — eleven: the rulebook's eight and Carcass Front's three.
- `dataset.campaign.carcassFrontExploration` — four Resource tables, 51 Locations.
- `dataset.campaigns` — the map campaign and the Path to Leviathan.
- `dataset.visionCards` — sixteen.

---

## The five things that will cost you a day if you learn them again

### 1. The layer is GENERATED, not transcribed

This is the decision to understand before touching anything. The Dispatch layer
is a hand-written `.layer.json` because a Dispatch **is** a list of errata
sentences. Carcass Front is content — 15 entries, 88 armoury rows — and typing
those is exactly the act rule 1 forbids at exactly the scale that produced the
app's 97%-wrong statlines.

So `rules-build.mjs` calls `buildCarcassFrontLayer()` where it would otherwise
read a file. **A source that states *changes* is transcribed; a source that
states *content* is parsed.** Written up in
[`RULESET-MODEL.md`](RULESET-MODEL.md) § "Adding a brand-new faction".

### 2. Page furniture extracts at the FOOT of the page it heads

Section banners, chapter openers and some entry headers appear *below* the body
they introduce. This one fact caused four separate bugs in the faction parser
(the Lazarist Prophet dropped, variants swallowing the next chapter, the whole
Mercenary section empty, roles from the wrong banner) and shows up again in
every chapter. **Every one produced a plausible warband rather than an
obviously broken one** — which is why each is pinned by a test naming the
failure it guards.

### 3. Two collections are merged, not layered

`rules-build.mjs` assigns `dataset.variants` and `dataset.armouries`
**wholesale after the layers run**. An `add` op against either is applied and
then thrown away. The generated layer hands those back separately
(`{ layer, armouries, variants }`) and the build merges them at the point those
collections exist. Same will apply to anything else built after layering.

### 4. Merged table cells are flattened, and a cell is not always prose

Two separate traps in the same chart:

- The generator's Deployment & Game Length column is **vertically merged** —
  rows 1-4 share one value, rows 5-6 share another — so only rows 1 and 5 carry
  a third cell. `spreadMergedCell` repeats a printed value down the rows it
  covers. It never invents one, and the proof that the merge is real is that
  every row of a chart a player rolls on must have a game length and only two
  are printed.
- A cell is only continued onto the next line **if it was long enough to have
  wrapped**. `Take and Hold` ends on no full stop, so without that rule the
  Victory Conditions chart swallowed the six pages of rules printed under it.

### 5. Maps are dropped per page, never across a page break

`withoutMaps` finds a deployment map by shape (a run of label-or-dimension
lines containing at least one measurement). Run chapter-wide it swallowed the
`VICTORY CONDITIONS CHART` heading: the page before it ends on a map, and a
short all-caps heading at the top of the next page looks like one more label.
The generator lost a quarter of itself, silently.

---

## Smaller things worth knowing

- **A hyphen at a line break is a decision.** `dehyphenate.mjs`. Always dropping
  gives `rolloff` and `coopted`; always keeping gives `SHOT-GUN`, and SHOTGUN is
  a Keyword, so that breaks search. The test lists all 44 hyphenated breaks in
  the book on both sides of the rule.
- **A leader can be named by KEYWORD.** Catalogues use a `Leader` role; both CF
  lists use the `LEADER` keyword and carry no role. `recruitable.ts` reads
  either.
- **A printed statline is not always a recruit.** Martyr Penitent and Heretic
  Raider Legionnaire are marked `secondaryProfile` and kept out of the recruit
  list. They stay in the dataset for the Codex.
- **A Mercenary pool can be stated by delegation** — "can use any Faithful
  Mercenaries that can be taken by Trench Pilgrim Warbands". Resolved in
  `applyMercenaryDelegation` from the faction's own special rule.
- **`add` refuses a duplicate and cross-checks the reprint.** The book reprints
  the Combat Biologist; the reprint disagreed on the currency glyph and the
  build failed until `resolutions.json` ruled on it. That machinery is general
   — any layer reprinting an existing entry gets the same treatment.
- **`RulesProse` renders tables now.** Pipe tables, scrolling inside their own
  container. Never `overflow-x` on the body — see [`MOBILE.md`](MOBILE.md).
- **The Codex `generator` tab had no button.** It has been rendered by
  `activeTab === 'generator'` since the Codex was built and nothing ever set
  that state. Fixed; worth checking whether any other tab is orphaned the same
  way.

---

## What is left

**Nothing from the original CF-1..CF-5 list.** What remains is the loose ends
below, plus two things this pass deliberately did not do.

### Deliberately not done

- **`A Vision of Leviathan`** (the chapter, 6 pages) is two in-fiction
  proclamations in verse — Blessed Bartolomeo's and War Priest Charon's. It is
  flavour with no rules in it, and `paragraphs()` would run the verse together
  into prose, so it is not parsed. Adding it means teaching `cf-prose.mjs` to
  keep a line break, which nothing else in the book needs.
- **The Campaign Tracker sheet's own layout.** `campaign-tracker.pdf` extracts
  to 335 bytes — it is a form, and its boxes and arrows are graphics. The
  tracker's *rules* are all in the book chapter and are parsed; the sheet
  itself is not reproducible from the PDF.

### Loose ends anyone could pick up

- ~~**The five CF scenarios have no deployment maps.**~~ **Done.** They are not
  raster art like the rulebook's twelve: each is a single grey-filled rectangle
  in the page's **vector drawings**, and that rectangle is the crop box, read
  out of the PDF rather than detected in pixels. `pdftoppm` is still not
  installed and was never needed — PyMuPDF renders the page.

  The rulebook's twelve were also wrong, separately: every one of them was the
  map's **background art**, the terrain drawing with no deployment zones,
  objective markers, midpoint or dimensions. That is what the PDF stores as an
  embedded image, because the map is that art with the zones drawn over it in
  vector. `arsenal.test.ts` now asserts no scenario map is a `.png`, so the art
  layer cannot come back under a passing "the file exists" check.
- **Armoury rows naming Battlekit the catalogues lack** — the build's own
  counter now reports **21** across 8 factions, not the 3 this listed, because
  more armouries are parsed than when it was written. The named three still
  stand as examples: `Holy Icon Shield`, `Medi-kit` (catalogue spells it
  `Medikit`), `Anti-Materiel Rifle` (catalogue spells it `Anti-Material
  Rifle`). Most are spelling drift and could be reconciled by matching on a
  normalised name; some are genuinely absent upstream. Reported every build,
  never guessed at.
- ~~**Duplicate React keys in the Codex core-rules list**~~ **Fixed**, and it
  was a real rendering bug rather than console noise: React resolves a
  duplicate key by reusing one element for two different items, so the second
  copy could render the first one's text.

  Seven rules are printed in two chapters — `Actions` is Core Rules p14 and
  Comprehensive Rules p34 — and `Terrain` is printed twice inside one chapter,
  at p23 and p38. All of them are real sections and all are shown;
  deduplicating would drop something the book prints. The key is now
  `category/page/slug`, which is what tells them apart in the book and what the
  badge beside each heading already displayed.
- ~~**`officialRulesData.ts` still holds hand-written skills and trauma
  tables.**~~ **Not true, and the file should stay.** It has no exports left.
  What it holds is the record of what each deleted export was wrong about, and
  `npm run rules:audit:campaign` fails the build if any of those names
  reappears in it — a file that once held fabricated data is where fabricated
  data comes back. Deleting it would remove the guard.
- **The campaign map's three TABLES are done; its BOARD is not.**
  `Carcass.Front.Map.pdf` was in the release the whole time — `SOURCES.json`
  recorded it as print material with no rules content, so it was never fetched.
  Its first page gives the 32 zones with their Resources and scenario, the ten
  Special Zone Outpost Bonuses, and the generator's Deployment × Victory
  Conditions charts. All three are parsed and in the Codex.

  What is still only on the printed sheet is the **zone board** — which zone
  borders which — because it is a graphic. That is what a rule about supply
  lines or adjacency needs, and `requiresMap` now says which half is missing
  rather than claiming the whole map is.
- ~~The rulebook's Exploration Step banner in the Codex is hand-written
  prose.~~ **Fixed.** It said *"the winner of the match rolls on the …
  Exploration Table"* — every player who played explores unless they Called for
  Reinforcements, so it told the loser of every campaign game to skip their
  income — beside three invented bullets naming a "Trench Merchant", a "Warband
  Treasury" and an "Armory Stash". Replaced by the five numbered steps the book
  prints as its Exploration Sequence, and `lootPerPoint` is now read out of
  step 5 rather than carried as a literal `10`.

---

## Environment notes for a fresh session

Most of this is in [`CLAUDE.md`](../CLAUDE.md); these are the ones that bit.

- **`api.github.com` IS reachable** — 200 unauthenticated from this sandbox,
  and `$GITHUB_TOKEN` is not needed for public reads. `CLAUDE.md` has been
  corrected.
- **`pdftoppm` is not installed.** Use `scripts/extract-pdf.mjs` for PDFs.
  Never use the Read tool on a PDF in `data-sources/` — it is a 33MB binary.
- **Build with** `NODE_ENV=production DATABASE_URL=… NEXTAUTH_SECRET=… npx next build`.
  A bare `next build` always fails on the `<Html>` prerender error in this
  sandbox and `rm -rf .next` does not fix it.
- **Never run `playwright install`.** The browser is at
  `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`; import from
  `@playwright/test`, not `playwright`.
- **The dev server needs ~30s** before the first request and will serve `0`
  counts if you hit it too early — that is the dataset fetch, not a bug.

## The one-line version

The pipeline is the product. Every number in the app can say which page it came
from, the build fails when one cannot, and the fastest way to break that is to
type a value in by hand because the parser was awkward. If a source is hard to
read, fix the parser and write a test that names the failure.
