# Handover — Carcass Front

Written for whoever picks this up next. It covers what has landed, what is
left, and the things about this book and this pipeline that took a while to
learn and would cost the same time again.

Everything is on branch **`claude/trench-crusade-app-review-7bansz`**, open as
draft PR **[#12](https://github.com/crazymunch/TrenchLine/pull/12)** against
`main`. Read [`docs/README.md`](README.md) and the four rules in
[`CLAUDE.md`](../CLAUDE.md) before anything else — the whole approach below is
downstream of them.

---

## Where things stand

| # | Task | State |
|---|---|---|
| CF-1 | Sources + the two faction lists | **done** (`0e49f93`) |
| CF-2 | Five scenarios + two terrain pieces | **done** (`7421753`) |
| CF-3 | Random Scenario Generator | **done** (`127a12f`, docs `d858b24`) |
| CF-4 | New Patrons + Carcass Front exploration tables | **not started** |
| CF-5 | The Carcass Front campaign, Path to Leviathan, Vision Cards | **not started** |

Plus the Hell on Earth Weather Events, which landed first and is the earlier
half of PR #12.

**Green as of `d858b24`:** 482 unit tests, `npm run rules:build` with 0
conflicts and 0 fields lacking provenance, `tsc --noEmit` clean, `eslint` 0
errors, `next build` clean. Verified by hand on a 375px viewport.

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

### CF-4 — New Patrons and the Carcass Front exploration tables

Book pages 78-79 (Patrons) and 91-95 (Exploration).

- **New Patrons.** House of Wisdom, and it is **Iron Sultanate only** — six
  skills. The book is explicit that the new Patrons can be used in **any**
  campaign, not just a Carcass Front one, so they belong alongside the existing
  Patron data rather than behind the supplement's own campaign.
- **Carcass Front Exploration Tables.** Note two differences from the core
  exploration tables the pipeline already reads: the rows are **ranges, not
  single numbers**, and the starting pool is **3D6**. `ExplorationLocation.roll`
  is currently a single `number` with a comment saying the tables are sparse —
  that type will need to widen, and the existing parser's assumption re-checked.

Start from `chapterLines('Carcass Front Exploration Tables')` — the running
head is already distinct, so `cf-prose.mjs` will hand you the chapter.

### CF-5 — The Carcass Front campaign, Path to Leviathan, Vision Cards

Book pages 78-90, plus `vision-cards.pdf` and `campaign-tracker.pdf` (both
extracted, both in `data-sources/carcass-front/extracted/`).

- **The Carcass Front Campaign** (pp. 80-87) — its own campaign structure, with
  a Campaign Scenario table that can send players to the Random Scenario
  Generator (a "6"), which is already built.
- **The Path to Leviathan** (pp. 88-90) — the narrative campaign the five
  scenarios are the spine of. Each scenario already carries its
  `PATH TO LEVIATHAN CONSEQUENCES` section in `dataset.scenarios`, so the
  campaign parser can join on those rather than re-reading them.
- **Vision Cards** — a separate PDF, extracted but unparsed.
- **Rudolf's Folly** (Aerial Bombardment / Strafing Run) and the **Outpost
  Step** are in the campaign chapter.

### Loose ends anyone could pick up

- **The five CF scenarios have no deployment maps.** `mapImage` is `null` for
  them, deliberately — the maps have not been extracted from the PDF. The
  rulebook's twelve are checked against `public/maps/` and the build fails if
  one is missing. Extracting the CF maps would need a PDF page rasteriser;
  `pdftoppm` is **not installed** in this sandbox.
- **Three CF armoury rows name Battlekit the catalogues lack** — `Holy Icon
  Shield`, `Medi-kit` (catalogue spells it `Medikit`), `Anti-Materiel Rifle`
  (catalogue spells it `Anti-Material Rifle`). Reported every build by the
  "row(s) name Battlekit the catalogues lack" counter. Two are spelling drift
  and could be reconciled; one is genuinely absent upstream.
- **Duplicate React keys in the Codex core-rules list** (`blood-markers`,
  `actions`, `terrain`, …). Pre-existing, unrelated to this work, visible in
  any dev-server console.
- **`officialRulesData.ts` still holds hand-written skills and trauma tables.**
  The derived versions are in `dataset.campaign`; the old file has not been
  deleted.

---

## Environment notes for a fresh session

Most of this is in [`CLAUDE.md`](../CLAUDE.md); these are the ones that bit.

- **`api.github.com` IS reachable** with `$GITHUB_TOKEN` present.
  `CLAUDE.md` says otherwise and that line is stale.
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
